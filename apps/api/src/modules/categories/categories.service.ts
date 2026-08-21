import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Category as CategoryDto, CategoryNode } from '@rgi/types';
import { Category, type CategoryDocument } from '../../schemas/category.schema';
import { Product, type ProductDocument } from '../../schemas/product.schema';
import { slugifyPath } from '../../common/utils/slug';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly model: Model<CategoryDocument>,
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
  ) {}

  static toDto(doc: CategoryDocument): CategoryDto {
    return {
      id: doc._id.toString(),
      name: { fr: doc.name.fr, ar: doc.name.ar },
      slug: doc.slug,
      parent: doc.parent ? doc.parent.toString() : null,
      type: doc.type,
      componentType: doc.componentType,
      configuratorSlot: doc.configuratorSlot,
      image: doc.image,
      order: doc.order,
      isActive: doc.isActive,
    };
  }

  async findAll(includeInactive = false): Promise<CategoryDto[]> {
    const filter = includeInactive ? {} : { isActive: true };
    const docs = await this.model.find(filter).sort({ order: 1, 'name.fr': 1 }).exec();
    return docs.map((d) => CategoriesService.toDto(d));
  }

  /** `GET /categories` — the full tree, roots first, children nested by `parent`. */
  async tree(includeInactive = false): Promise<CategoryNode[]> {
    const flat = await this.findAll(includeInactive);
    const byId = new Map<string, CategoryNode>(
      flat.map((c) => [c.id, { ...c, children: [] }]),
    );
    const roots: CategoryNode[] = [];
    for (const node of byId.values()) {
      const parent = node.parent ? byId.get(node.parent) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  async findBySlugOrFail(slug: string): Promise<CategoryDocument> {
    const doc = await this.model.findOne({ slug: slug.toLowerCase() }).exec();
    if (!doc) throw new NotFoundException('Catégorie introuvable.');
    return doc;
  }

  async findByIdOrFail(id: string): Promise<CategoryDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Catégorie introuvable.');
    return doc;
  }

  /**
   * A category and every category below it. Listing a parent category must show the
   * products of its children too ("Composants" shows GPUs, CPUs, ...).
   */
  async descendantIds(rootId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const all = await this.model.find({}, { _id: 1, parent: 1 }).lean().exec();
    const childrenOf = new Map<string, Types.ObjectId[]>();
    for (const c of all) {
      const key = c.parent ? c.parent.toString() : 'root';
      const list = childrenOf.get(key) ?? [];
      list.push(c._id);
      childrenOf.set(key, list);
    }
    const out: Types.ObjectId[] = [rootId];
    const queue = [rootId];
    while (queue.length) {
      const current = queue.shift()!;
      for (const child of childrenOf.get(current.toString()) ?? []) {
        out.push(child);
        queue.push(child);
      }
    }
    return out;
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDto> {
    const slug = slugifyPath(dto.slug ?? dto.name.fr);
    if (await this.model.exists({ slug })) {
      throw new BadRequestException(`Le slug "${slug}" est déjà utilisé.`);
    }
    const doc = await this.model.create({
      ...dto,
      slug,
      parent: dto.parent ? new Types.ObjectId(dto.parent) : null,
      order: dto.order ?? 0,
      isActive: dto.isActive ?? true,
    });
    return CategoriesService.toDto(doc);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    const doc = await this.findByIdOrFail(id);
    if (dto.slug) {
      const slug = slugifyPath(dto.slug);
      if (await this.model.exists({ slug, _id: { $ne: doc._id } })) {
        throw new BadRequestException(`Le slug "${slug}" est déjà utilisé.`);
      }
      doc.slug = slug;
    }
    if (dto.parent !== undefined) {
      if (dto.parent && dto.parent === id) {
        throw new BadRequestException('Une catégorie ne peut pas être son propre parent.');
      }
      doc.parent = dto.parent ? new Types.ObjectId(dto.parent) : null;
    }
    if (dto.name) doc.name = dto.name;
    if (dto.type) doc.type = dto.type;
    if (dto.componentType !== undefined) doc.componentType = dto.componentType;
    if (dto.configuratorSlot !== undefined) doc.configuratorSlot = dto.configuratorSlot;
    if (dto.image !== undefined) doc.image = dto.image;
    if (dto.order !== undefined) doc.order = dto.order;
    if (dto.isActive !== undefined) doc.isActive = dto.isActive;
    await doc.save();
    return CategoriesService.toDto(doc);
  }

  async remove(id: string): Promise<void> {
    const doc = await this.findByIdOrFail(id);
    const hasChildren = await this.model.exists({ parent: doc._id });
    if (hasChildren) {
      throw new BadRequestException(
        'Cette catégorie contient des sous-catégories. Supprimez-les d\u2019abord.',
      );
    }
    const hasProducts = await this.products.exists({ category: doc._id });
    if (hasProducts) {
      throw new BadRequestException(
        'Cette catégorie contient des produits. Déplacez-les ou archivez-les d’abord.',
      );
    }
    await doc.deleteOne();
  }
}
