import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import type {
  AttributeValue,
  Facet,
  Part,
  Product as ProductDto,
  ProductListResponse,
  ProductSummary,
} from '@rgi/types';
import { effectivePriceAt } from '@rgi/types';
import { Product, type ProductDocument } from '../../schemas/product.schema';
import { InventoryLog, type InventoryLogDocument } from '../../schemas/inventory-log.schema';
import { CategoriesService } from '../categories/categories.service';
import { AttributeDefinitionsService } from '../attribute-definitions/attribute-definitions.service';
import { slugify } from '../../common/utils/slug';
import type { ProductListQueryDto } from './dto/product-list-query.dto';
import type { CreateProductDto, UpdateProductDto, UpdateStockDto } from './dto/product.dto';

/** Attribute filters as they come off the query string: `attr.socket=AM5`. */
export type AttrFilters = Record<string, string[]>;

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly model: Model<ProductDocument>,
    @InjectModel(InventoryLog.name)
    private readonly logs: Model<InventoryLogDocument>,
    private readonly categories: CategoriesService,
    private readonly attributes: AttributeDefinitionsService,
  ) {}

  // ───────────────────────── mapping ─────────────────────────

  static toDto(doc: ProductDocument, now = new Date()): ProductDto {
    const flashDeal = doc.flashDeal
      ? {
          price: doc.flashDeal.price,
          startsAt: doc.flashDeal.startsAt.toISOString(),
          endsAt: doc.flashDeal.endsAt.toISOString(),
        }
      : undefined;
    return {
      id: doc._id.toString(),
      name: { fr: doc.name.fr, ar: doc.name.ar },
      slug: doc.slug,
      sku: doc.sku,
      brand: doc.brand,
      category: doc.category.toString(),
      categoryType: doc.categoryType,
      description: { fr: doc.description.fr, ar: doc.description.ar },
      shortDescription: doc.shortDescription
        ? { fr: doc.shortDescription.fr, ar: doc.shortDescription.ar }
        : undefined,
      price: doc.price,
      compareAtPrice: doc.compareAtPrice,
      flashDeal,
      effectivePrice: effectivePriceAt({ price: doc.price, flashDeal }, now),
      images: doc.images ?? [],
      attributes: doc.attributes ?? {},
      stock: doc.stock,
      lowStockThreshold: doc.lowStockThreshold,
      isConfiguratorPart: doc.isConfiguratorPart,
      status: doc.status,
      metaTitle: doc.metaTitle,
      metaDescription: doc.metaDescription,
      ratingAvg: doc.ratingAvg,
      ratingCount: doc.ratingCount,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt?.toISOString(),
      updatedAt: (doc as unknown as { updatedAt?: Date }).updatedAt?.toISOString(),
    };
  }

  static toSummary(doc: ProductDocument, now = new Date()): ProductSummary {
    const full = ProductsService.toDto(doc, now);
    return {
      id: full.id,
      name: full.name,
      slug: full.slug,
      brand: full.brand,
      categoryType: full.categoryType,
      price: full.price,
      compareAtPrice: full.compareAtPrice,
      effectivePrice: full.effectivePrice,
      images: full.images,
      attributes: full.attributes,
      stock: full.stock,
      ratingAvg: full.ratingAvg,
      ratingCount: full.ratingCount,
    };
  }

  /** The projection the configurator engine consumes (`Part` in `@rgi/types`). */
  static toPart(doc: ProductDocument, now = new Date()): Part {
    const primary = (doc.images ?? []).find((i) => i.isPrimary) ?? doc.images?.[0];
    return {
      id: doc._id.toString(),
      categoryType: doc.categoryType,
      price: effectivePriceAt(
        {
          price: doc.price,
          flashDeal: doc.flashDeal
            ? {
                price: doc.flashDeal.price,
                startsAt: doc.flashDeal.startsAt.toISOString(),
                endsAt: doc.flashDeal.endsAt.toISOString(),
              }
            : undefined,
        },
        now,
      ),
      stock: doc.stock,
      attributes: doc.attributes ?? {},
      name: doc.name.fr,
      brand: doc.brand,
      slug: doc.slug,
      image: primary?.url,
    };
  }

  // ───────────────────────── reads ─────────────────────────

  async findBySlugOrFail(slug: string, includeInactive = false): Promise<ProductDocument> {
    const filter: FilterQuery<ProductDocument> = { slug: slug.toLowerCase() };
    if (!includeInactive) filter.status = 'active';
    const doc = await this.model.findOne(filter).exec();
    if (!doc) throw new NotFoundException('Produit introuvable.');
    return doc;
  }

  async findByIdOrFail(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Produit introuvable.');
    return doc;
  }

  /** Configurator parts of one component type, in stock first. */
  async partsForComponentType(componentType: string): Promise<ProductDocument[]> {
    return this.model
      .find({ categoryType: componentType, isConfiguratorPart: true, status: 'active' })
      .sort({ price: 1 })
      .exec();
  }

  async partsByIds(ids: string[]): Promise<ProductDocument[]> {
    const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (!objectIds.length) return [];
    return this.model.find({ _id: { $in: objectIds } }).exec();
  }

  // ───────────────────── listing + faceted filtering ─────────────────────

  /**
   * `GET /products` (API_SPEC.md). Returns the page of products **and** the facets the
   * sidebar renders. Each facet's counts are computed with every *other* filter applied
   * but not its own — otherwise selecting a value would collapse its own facet to one row.
   */
  async list(
    query: ProductListQueryDto,
    attrs: AttrFilters = {},
    isStaff = false,
  ): Promise<ProductListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const now = new Date();

    const base: FilterQuery<ProductDocument> = {};
    /*
     * `status` is the admin table's lens on the catalogue, and it is the only parameter on
     * this public endpoint that can reveal something the shop has not published. A draft is
     * usually an unreleased model with a price that is not announced yet; an archived one is
     * something deliberately withdrawn. Honouring the parameter for anyone — which is what
     * happened while `@Public()` skipped authentication entirely — made both publicly
     * enumerable with a single query string.
     *
     * Anonymous callers therefore get `active` and nothing else, whatever they ask for.
     */
    const status = isStaff ? (query.status ?? 'active') : 'active';
    if (status !== 'all') base.status = status;

    let categoryType = query.categoryType;
    if (query.category) {
      const category = await this.categories.findBySlugOrFail(query.category);
      const ids = await this.categories.descendantIds(category._id);
      base.category = { $in: ids };
      categoryType = categoryType ?? category.componentType ?? category.type;
    }
    if (query.categoryType) base.categoryType = query.categoryType;
    if (query.brand?.length) base.brand = { $in: query.brand };
    if (query.inStock === 'true') base.stock = { $gt: 0 };
    /*
     * "On promotion" is two different things in this catalogue and the section has to show
     * both: a **flash deal** whose window is open right now, and a permanent **compareAtPrice**
     * markdown (the struck-through price the product card already renders).
     *
     * It goes in `$and` rather than a bare `$or` so it composes with a category or brand
     * filter instead of replacing it — `/promotions?category=composants` has to keep meaning
     * "discounted *and* a component". `$expr` is what lets the second branch compare two
     * fields of the same document.
     */
    if (query.promo === 'true') {
      base.$and = [
        ...((base.$and as FilterQuery<ProductDocument>[] | undefined) ?? []),
        {
          $or: [
            {
              'flashDeal.startsAt': { $lte: now },
              'flashDeal.endsAt': { $gte: now },
              $expr: { $lt: ['$flashDeal.price', '$price'] },
            },
            { $expr: { $gt: ['$compareAtPrice', '$price'] } },
          ],
        },
      ];
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      base.price = {
        ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
      };
    }
    if (query.q?.trim()) base.$text = { $search: query.q.trim() };

    const attrConditions = ProductsService.attributeConditions(attrs);
    const filter: FilterQuery<ProductDocument> = { ...base };
    for (const [key, condition] of Object.entries(attrConditions)) {
      (filter as Record<string, unknown>)[key] = condition;
    }

    const sort = ProductsService.sortSpec(query.sort, Boolean(query.q?.trim()));

    const [docs, total, facets, brands, priceRange] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
      this.buildFacets(base, attrConditions, categoryType),
      this.brandCounts(base, attrConditions),
      this.priceRange(base, attrConditions),
    ]);

    return {
      data: docs.map((d) => ProductsService.toSummary(d, now)),
      page,
      limit,
      total,
      availableFacets: facets,
      priceRange,
      brands,
    };
  }

  async search(q: string, limit = 8): Promise<ProductSummary[]> {
    const term = q.trim();
    if (!term) return [];
    const take = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 20) : 8;
    const docs = await this.model
      .find({ status: 'active', $text: { $search: term } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(take)
      .exec();
    if (docs.length) return docs.map((d) => ProductsService.toSummary(d));

    // Fallback for prefixes the text index cannot match ("rtx 50" -> "RTX 5090").
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const loose = await this.model
      .find({ status: 'active', $or: [{ 'name.fr': rx }, { brand: rx }, { sku: rx }] })
      .limit(take)
      .exec();
    return loose.map((d) => ProductsService.toSummary(d));
  }

  /** `attr.socket=AM5&attr.ram_type=DDR5,DDR4` -> mongo conditions on `attributes.*`. */
  private static attributeConditions(attrs: AttrFilters): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, rawValues] of Object.entries(attrs)) {
      const values = rawValues
        .flatMap((v) => v.split(','))
        .map((v) => v.trim())
        .filter(Boolean);
      if (!values.length) continue;
      // Numbers are stored as numbers and booleans as booleans, so a facet value that
      // arrives as a string must be matched in both forms.
      const candidates: AttributeValue[] = [];
      for (const v of values) {
        candidates.push(v);
        if (Number.isFinite(Number(v))) candidates.push(Number(v));
        if (v === 'true') candidates.push(true);
        if (v === 'false') candidates.push(false);
      }
      out[`attributes.${key}`] = { $in: candidates };
    }
    return out;
  }

  private static sortSpec(
    sort: ProductListQueryDto['sort'],
    hasText: boolean,
  ): Record<string, 1 | -1 | { $meta: 'textScore' }> {
    switch (sort) {
      case 'price_asc':
        return { price: 1 };
      case 'price_desc':
        return { price: -1 };
      case 'newest':
        return { createdAt: -1 };
      case 'popular':
        return { ratingCount: -1, ratingAvg: -1 };
      default:
        return hasText ? { score: { $meta: 'textScore' } } : { createdAt: -1 };
    }
  }

  /** Counts per value for every filterable attribute of this category type. */
  private async buildFacets(
    base: FilterQuery<ProductDocument>,
    attrConditions: Record<string, unknown>,
    categoryType?: string,
  ): Promise<Facet[]> {
    if (!categoryType) return [];
    const defs = await this.attributes.findByCategoryType(categoryType);
    const filterable = defs.filter((d) => d.filterable);
    if (!filterable.length) return [];

    const facets = await Promise.all(
      filterable.map(async (def) => {
        const path = `attributes.${def.key}`;
        const others = { ...attrConditions };
        delete others[path];
        const rows = await this.model
          .aggregate<{ _id: AttributeValue; count: number }>([
            { $match: { ...base, ...others, [path]: { $exists: true, $ne: null } } },
            {
              $project: {
                value: { $cond: [{ $isArray: `$${path}` }, `$${path}`, [`$${path}`]] },
              },
            },
            { $unwind: '$value' },
            { $group: { _id: '$value', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ])
          .exec();

        const facet: Facet = {
          key: def.key,
          label: def.label,
          dataType: def.dataType,
          unit: def.unit,
          values: rows
            .filter((r) => r._id !== null && r._id !== undefined)
            .map((r) => ({ value: r._id as string | number | boolean, count: r.count })),
        };
        return facet;
      }),
    );

    return facets.filter((f) => f.values.length > 0);
  }

  private async brandCounts(
    base: FilterQuery<ProductDocument>,
    attrConditions: Record<string, unknown>,
  ): Promise<{ value: string; count: number }[]> {
    const match = { ...base, ...attrConditions } as FilterQuery<ProductDocument>;
    delete (match as Record<string, unknown>).brand;
    const rows = await this.model
      .aggregate<{ _id: string; count: number }>([
        { $match: match },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return rows.map((r) => ({ value: r._id, count: r.count }));
  }

  private async priceRange(
    base: FilterQuery<ProductDocument>,
    attrConditions: Record<string, unknown>,
  ): Promise<{ min: number; max: number }> {
    const match = { ...base, ...attrConditions } as FilterQuery<ProductDocument>;
    delete (match as Record<string, unknown>).price;
    const rows = await this.model
      .aggregate<{ min: number; max: number }>([
        { $match: match },
        { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
      ])
      .exec();
    return { min: rows[0]?.min ?? 0, max: rows[0]?.max ?? 0 };
  }

  // ───────────────────────── writes (staff) ─────────────────────────

  async create(dto: CreateProductDto): Promise<ProductDto> {
    const category = await this.categories.findByIdOrFail(dto.category);
    const categoryType = category.componentType ?? category.type;
    const attributes = await this.attributes.validateAttributes(categoryType, dto.attributes);

    const slug = slugify(dto.slug ?? dto.name.fr);
    if (await this.model.exists({ slug })) {
      throw new BadRequestException(`Le slug "${slug}" est déjà utilisé par un autre produit.`);
    }
    if (await this.model.exists({ sku: dto.sku })) {
      throw new BadRequestException(`La référence "${dto.sku}" est déjà utilisée.`);
    }
    ProductsService.assertPricing(dto.price, dto.compareAtPrice, dto.flashDeal);

    const doc = await this.model.create({
      ...dto,
      slug,
      category: category._id,
      categoryType,
      attributes,
      images: ProductsService.normalizeImages(dto.images ?? []),
      stock: dto.stock ?? 0,
      isConfiguratorPart: dto.isConfiguratorPart ?? Boolean(category.componentType),
      status: dto.status ?? 'draft',
    });
    return ProductsService.toDto(doc);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDto> {
    const doc = await this.findByIdOrFail(id);

    if (dto.category) {
      const category = await this.categories.findByIdOrFail(dto.category);
      doc.category = category._id;
      doc.categoryType = category.componentType ?? category.type;
    }
    if (dto.attributes !== undefined) {
      // Attributes are replaced wholesale, so they are validated in full, not partially.
      doc.attributes = await this.attributes.validateAttributes(doc.categoryType, dto.attributes);
    }
    if (dto.slug) {
      const slug = slugify(dto.slug);
      if (await this.model.exists({ slug, _id: { $ne: doc._id } })) {
        throw new BadRequestException(`Le slug "${slug}" est déjà utilisé par un autre produit.`);
      }
      doc.slug = slug;
    }
    if (dto.sku && dto.sku !== doc.sku) {
      if (await this.model.exists({ sku: dto.sku, _id: { $ne: doc._id } })) {
        throw new BadRequestException(`La référence "${dto.sku}" est déjà utilisée.`);
      }
      doc.sku = dto.sku;
    }
    if (dto.name) doc.name = dto.name;
    if (dto.brand) doc.brand = dto.brand;
    if (dto.description) doc.description = dto.description;
    if (dto.shortDescription !== undefined) doc.shortDescription = dto.shortDescription;
    if (dto.price !== undefined) doc.price = dto.price;
    if (dto.compareAtPrice !== undefined) doc.compareAtPrice = dto.compareAtPrice;
    if (dto.flashDeal !== undefined) {
      doc.flashDeal = dto.flashDeal
        ? {
            price: dto.flashDeal.price,
            startsAt: new Date(dto.flashDeal.startsAt),
            endsAt: new Date(dto.flashDeal.endsAt),
          }
        : undefined;
    }
    if (dto.images) doc.images = ProductsService.normalizeImages(dto.images);
    if (dto.stock !== undefined) doc.stock = dto.stock;
    if (dto.lowStockThreshold !== undefined) doc.lowStockThreshold = dto.lowStockThreshold;
    if (dto.isConfiguratorPart !== undefined) doc.isConfiguratorPart = dto.isConfiguratorPart;
    if (dto.status) doc.status = dto.status;
    if (dto.metaTitle !== undefined) doc.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) doc.metaDescription = dto.metaDescription;

    ProductsService.assertPricing(
      doc.price,
      doc.compareAtPrice,
      doc.flashDeal
        ? {
            price: doc.flashDeal.price,
            startsAt: doc.flashDeal.startsAt.toISOString(),
            endsAt: doc.flashDeal.endsAt.toISOString(),
          }
        : undefined,
    );

    await doc.save();
    return ProductsService.toDto(doc);
  }

  /** Soft delete by default — an archived product keeps past orders readable. */
  async archive(id: string): Promise<void> {
    const doc = await this.findByIdOrFail(id);
    doc.status = 'archived';
    await doc.save();
  }

  async adjustStock(id: string, dto: UpdateStockDto, by?: string): Promise<ProductDto> {
    const doc = await this.findByIdOrFail(id);
    const next = dto.mode === 'delta' ? doc.stock + dto.quantity : dto.quantity;
    if (next < 0) throw new BadRequestException('Le stock ne peut pas être négatif.');
    const delta = next - doc.stock;
    doc.stock = next;
    await doc.save();
    if (delta !== 0) {
      await this.logs.create({
        product: doc._id,
        delta,
        reason: 'manual',
        ref: dto.note,
        by: by && Types.ObjectId.isValid(by) ? new Types.ObjectId(by) : undefined,
      });
    }
    return ProductsService.toDto(doc);
  }

  private static normalizeImages(images: NonNullable<CreateProductDto['images']>) {
    const list = images.map((img, index) => ({
      url: img.url,
      publicId: img.publicId,
      alt: img.alt,
      isPrimary: img.isPrimary ?? false,
      order: img.order ?? index,
    }));
    if (list.length && !list.some((i) => i.isPrimary)) list[0]!.isPrimary = true;
    return list.sort((a, b) => a.order - b.order);
  }

  private static assertPricing(
    price: number,
    compareAtPrice?: number,
    flashDeal?: { price: number; startsAt: string; endsAt: string },
  ): void {
    if (compareAtPrice !== undefined && compareAtPrice <= price) {
      throw new BadRequestException('Le prix barré doit être supérieur au prix de vente.');
    }
    if (flashDeal) {
      if (flashDeal.price >= price) {
        throw new BadRequestException(
          'Le prix de la promo flash doit être inférieur au prix normal.',
        );
      }
      if (new Date(flashDeal.endsAt) <= new Date(flashDeal.startsAt)) {
        throw new BadRequestException('La promo flash doit se terminer après son début.');
      }
    }
  }
}
