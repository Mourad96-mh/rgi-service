import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type {
  Build as BuildDto,
  BuildEvaluation,
  Part,
  ProductSummary,
  Selection,
  SlotId,
} from '@rgi/types';
import { CONFIGURATOR_DISCOUNT_PCT, SLOTS } from '@rgi/types';
import { compatiblePartsForSlot, evaluateBuild } from '@rgi/config-engine';
import { Build, type BuildDocument } from '../../schemas/build.schema';
import type { ProductDocument } from '../../schemas/product.schema';
import { ProductsService } from '../products/products.service';
import { shortId } from '../../common/utils/slug';
import { CompatibilityRulesService } from './compatibility-rules.service';
import type { SaveBuildDto } from './dto/build.dto';

type SelectionInput = Partial<Record<SlotId, string | string[]>>;

@Injectable()
export class ConfiguratorService {
  constructor(
    @InjectModel(Build.name) private readonly builds: Model<BuildDocument>,
    private readonly products: ProductsService,
    private readonly rules: CompatibilityRulesService,
  ) {}

  /**
   * Turn `{ cpu: '<id>', ram: ['<id>','<id>'] }` into the engine's `Selection`, reading
   * every part from the database. The client sends ids; prices and specs come from here.
   */
  async resolveSelection(input: SelectionInput): Promise<Selection> {
    const ids = Object.values(input ?? {})
      .flatMap((v) => (Array.isArray(v) ? v : v ? [v] : []))
      .filter(Boolean);
    const docs = await this.products.partsByIds(ids);
    const byId = new Map<string, ProductDocument>(docs.map((d) => [d._id.toString(), d]));

    const selection: Selection = {};
    for (const slot of SLOTS) {
      const raw = input?.[slot.id];
      if (!raw) continue;
      const list = (Array.isArray(raw) ? raw : [raw])
        .map((id) => byId.get(id))
        .filter((d): d is ProductDocument => Boolean(d));
      if (!list.length) continue;

      const missing = (Array.isArray(raw) ? raw : [raw]).filter((id) => !byId.has(id));
      if (missing.length) {
        throw new BadRequestException(
          `Produit introuvable pour l'étape "${slot.labelFr}".`,
        );
      }
      for (const doc of list) {
        if (doc.categoryType !== slot.componentType) {
          throw new BadRequestException(
            `"${doc.name.fr}" n'est pas un composant valide pour l'étape "${slot.labelFr}".`,
          );
        }
      }
      const parts = list.map((d) => ProductsService.toPart(d));
      selection[slot.id] = slot.multi ? parts : parts[0]!;
    }
    return selection;
  }

  /** `POST /configurator/validate` — the authoritative evaluation (never the client's). */
  async validate(input: SelectionInput): Promise<BuildEvaluation> {
    const [selection, rules] = await Promise.all([
      this.resolveSelection(input),
      this.rules.activeRules(),
    ]);
    return evaluateBuild(selection, rules);
  }

  /**
   * `GET /configurator/parts` — the parts still choosable for a slot. This is what makes
   * the builder feel intelligent: an incompatible part never reaches the customer.
   */
  async partsForSlot(
    slot: SlotId,
    input: SelectionInput,
    onlyInStock = false,
  ): Promise<{ parts: ProductSummary[]; incompatibleCount: number }> {
    const definition = SLOTS.find((s) => s.id === slot);
    if (!definition) throw new BadRequestException('Étape de configuration inconnue.');

    const [docs, selection, rules] = await Promise.all([
      this.products.partsForComponentType(definition.componentType),
      this.resolveSelection(input),
      this.rules.activeRules(),
    ]);

    const byId = new Map<string, ProductDocument>(docs.map((d) => [d._id.toString(), d]));
    const candidates: Part[] = docs.map((d) => ProductsService.toPart(d));
    const kept = compatiblePartsForSlot(slot, candidates, selection, rules, {
      requireStock: onlyInStock,
    });

    return {
      parts: kept.map((p) => ProductsService.toSummary(byId.get(p.id)!)),
      incompatibleCount: candidates.length - kept.length,
    };
  }

  /** `POST /configurator/builds` — persist a build and hand back its shareable id. */
  async save(dto: SaveBuildDto, userId?: string): Promise<BuildDto> {
    const [selection, rules] = await Promise.all([
      this.resolveSelection(dto.selection),
      this.rules.activeRules(),
    ]);
    const evaluation = evaluateBuild(selection, rules);

    const items = SLOTS.flatMap((slot) => {
      const raw = selection[slot.id];
      const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return parts.map((part) => ({
        slot: slot.id,
        product: new Types.ObjectId(part.id),
        priceAtBuild: part.price,
        name: part.name,
        brand: part.brand,
        image: part.image,
        quantity: 1,
      }));
    });

    const doc = await this.builds.create({
      user: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null,
      shareId: shortId(),
      name: dto.name,
      items,
      servicesIncluded: true,
      discountPct: CONFIGURATOR_DISCOUNT_PCT,
      subtotal: evaluation.subtotal,
      total: evaluation.total,
      estimatedWattage: evaluation.estimatedWattage,
      isValid: evaluation.isValid,
      warnings: evaluation.violations
        .filter((v) => v.severity === 'warning')
        .map((v) => v.messageFr),
    });

    return ConfiguratorService.toDto(doc);
  }

  async findByShareId(shareId: string): Promise<BuildDto> {
    const doc = await this.builds.findOne({ shareId }).exec();
    if (!doc) throw new NotFoundException('Configuration introuvable.');
    return ConfiguratorService.toDto(doc);
  }

  static toDto(doc: BuildDocument): BuildDto {
    return {
      id: doc._id.toString(),
      user: doc.user ? doc.user.toString() : undefined,
      shareId: doc.shareId,
      name: doc.name,
      items: doc.items.map((i) => ({
        slot: i.slot,
        product: i.product.toString(),
        priceAtBuild: i.priceAtBuild,
        name: i.name,
        brand: i.brand,
        image: i.image,
        quantity: i.quantity,
      })),
      servicesIncluded: doc.servicesIncluded,
      discountPct: doc.discountPct,
      subtotal: doc.subtotal,
      total: doc.total,
      estimatedWattage: doc.estimatedWattage,
      isValid: doc.isValid,
      warnings: doc.warnings,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt?.toISOString(),
    };
  }
}
