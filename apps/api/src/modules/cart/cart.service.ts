import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type {
  CartValidationLine,
  CartValidationResult,
  Centimes,
  CheckoutQuote,
  ShippingMethod,
} from '@rgi/types';
import {
  CONFIGURATOR_DISCOUNT_PCT,
  FREE_DELIVERY_THRESHOLD,
  formatMad,
  shippingCost,
  zoneById,
  zoneForCity,
} from '@rgi/types';
import { evaluateBuild } from '@rgi/config-engine';
import { ProductsService } from '../products/products.service';
import { ConfiguratorService } from '../configurator/configurator.service';
import { CompatibilityRulesService } from '../configurator/compatibility-rules.service';
import type { CartLineDto, ShippingInputDto } from './dto/cart.dto';

/** What one priced line needs to become an order line and a stock movement. */
export interface PricedLine {
  line: CartLineDto;
  kind: 'product' | 'build';
  name: string;
  image?: string;
  unitPrice: Centimes;
  quantity: number;
  lineTotal: Centimes;
  /** units of the limiting product still on the shelf */
  available: number;
  problem?: string;
  productId?: Types.ObjectId;
  build?: {
    items: {
      slot: string;
      product: Types.ObjectId;
      name?: string;
      brand?: string;
      image?: string;
      priceAtBuild: Centimes;
      quantity: number;
    }[];
    servicesIncluded: boolean;
    discountPct: number;
    subtotal: Centimes;
    total: Centimes;
    estimatedWattage: number;
  };
  /** every product id this line consumes, and how many units */
  stockNeeds: { product: Types.ObjectId; quantity: number; name: string }[];
}

/**
 * Re-prices the cart from the database — the client sends ids and quantities, nothing
 * else (CONFIGURATOR_ENGINE.md §5, DATA_MODEL.md §7). Orders reuse `priceLines`, so the
 * quote a customer sees and the order that gets written come from the same code.
 */
@Injectable()
export class CartService {
  constructor(
    private readonly products: ProductsService,
    private readonly configurator: ConfiguratorService,
    private readonly rules: CompatibilityRulesService,
  ) {}

  async priceLines(lines: CartLineDto[]): Promise<PricedLine[]> {
    const priced: PricedLine[] = [];
    for (const line of lines) {
      priced.push(
        line.kind === 'build' ? await this.priceBuild(line) : await this.priceProduct(line),
      );
    }
    return priced;
  }

  private async priceProduct(line: CartLineDto): Promise<PricedLine> {
    if (!line.productId) throw new BadRequestException('Produit manquant dans le panier.');
    const [doc] = await this.products.partsByIds([line.productId]);
    if (!doc) throw new BadRequestException('Un produit du panier n’existe plus.');

    const summary = ProductsService.toSummary(doc);
    const image = (doc.images ?? []).find((i) => i.isPrimary)?.url ?? doc.images?.[0]?.url;
    const unitPrice = summary.effectivePrice;
    const problem =
      doc.status !== 'active'
        ? 'Ce produit n’est plus disponible.'
        : doc.stock <= 0
          ? 'Rupture de stock.'
          : doc.stock < line.quantity
            ? `Stock insuffisant : ${doc.stock} unité(s) disponible(s).`
            : undefined;

    return {
      line,
      kind: 'product',
      name: doc.name.fr,
      image,
      unitPrice,
      quantity: line.quantity,
      lineTotal: unitPrice * line.quantity,
      available: doc.stock,
      problem,
      productId: doc._id,
      stockNeeds: [{ product: doc._id, quantity: line.quantity, name: doc.name.fr }],
    };
  }

  private async priceBuild(line: CartLineDto): Promise<PricedLine> {
    if (!line.buildSelection) {
      throw new BadRequestException('Configuration manquante dans le panier.');
    }
    const [selection, rules] = await Promise.all([
      this.configurator.resolveSelection(line.buildSelection),
      this.rules.activeRules(),
    ]);
    const evaluation = evaluateBuild(selection, rules);

    const parts = Object.entries(selection).flatMap(([slot, value]) => {
      const list = Array.isArray(value) ? value : value ? [value] : [];
      return list.map((part) => ({ slot, part }));
    });

    const items = parts.map(({ slot, part }) => ({
      slot,
      product: new Types.ObjectId(part.id),
      name: part.name,
      brand: part.brand,
      image: part.image,
      priceAtBuild: part.price,
      quantity: 1,
    }));

    // Every part of the build is consumed once per unit ordered.
    const stockNeeds = parts.map(({ part }) => ({
      product: new Types.ObjectId(part.id),
      quantity: line.quantity,
      name: part.name ?? 'Composant',
    }));

    // A build's availability is that of its scarcest part.
    const scarcest = parts.reduce<{ stock: number; name: string } | null>(
      (worst, { part }) => {
        const stock = part.stock ?? 0;
        return !worst || stock < worst.stock
          ? { stock, name: part.name ?? 'Composant' }
          : worst;
      },
      null,
    );
    const available = scarcest?.stock ?? 0;
    const blocking = evaluation.violations.find((v) => v.severity === 'error');

    return {
      line,
      kind: 'build',
      name: `PC sur mesure — ${parts.length} composants`,
      image: parts.find(({ slot }) => slot === 'case')?.part.image ?? parts[0]?.part.image,
      unitPrice: evaluation.total,
      quantity: line.quantity,
      lineTotal: evaluation.total * line.quantity,
      available,
      problem: !evaluation.isValid
        ? (blocking?.messageFr ?? 'Configuration incomplète ou incompatible.')
        : available < line.quantity
          ? `Stock insuffisant : ${scarcest?.name} (${available} disponible(s)).`
          : undefined,
      build: {
        items,
        servicesIncluded: true,
        discountPct: evaluation.discountPct || CONFIGURATOR_DISCOUNT_PCT,
        subtotal: evaluation.subtotal,
        total: evaluation.total,
        estimatedWattage: evaluation.estimatedWattage,
      },
      stockNeeds,
    };
  }

  static subtotalOf(lines: PricedLine[]): Centimes {
    return lines.reduce((sum, line) => sum + line.lineTotal, 0);
  }

  async validate(lines: CartLineDto[]): Promise<CartValidationResult> {
    const priced = await this.priceLines(lines);
    const result: CartValidationLine[] = priced.map((priced) => ({
      line: priced.line,
      name: priced.name,
      image: priced.image,
      unitPrice: priced.unitPrice,
      lineTotal: priced.lineTotal,
      available: priced.available,
      problem: priced.problem,
    }));

    return {
      lines: result,
      subtotal: CartService.subtotalOf(priced),
      isValid: result.every((line) => !line.problem),
    };
  }

  /** Shipping + totals for a basket (API_SPEC.md `POST /checkout/quote`). */
  quote(subtotal: Centimes, shipping: ShippingInputDto): CheckoutQuote {
    const method: ShippingMethod = shipping.method;
    const zone =
      method === 'pickup' ? undefined : (zoneById(shipping.zone) ?? zoneForCity(shipping.city));
    const cost = zone ? shippingCost(subtotal, method, zone) : 0;

    const notes: string[] = [];
    if (method === 'pickup') {
      notes.push('Retrait en boutique — aucun frais de livraison.');
    } else {
      if (zone) notes.push(zone.etaFr);
      if (cost === 0) notes.push(`Livraison offerte dès ${formatMad(FREE_DELIVERY_THRESHOLD)} d’achat.`);
      else notes.push(`Livraison offerte à partir de ${formatMad(FREE_DELIVERY_THRESHOLD)} d’achat.`);
    }

    return { subtotal, shippingCost: cost, discountTotal: 0, total: subtotal + cost, notes };
  }
}
