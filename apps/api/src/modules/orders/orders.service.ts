import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types, type ClientSession } from 'mongoose';
import type { Order as OrderDto } from '@rgi/types';
import { Order, type OrderDocument } from '../../schemas/order.schema';
import { InventoryLog, type InventoryLogDocument } from '../../schemas/inventory-log.schema';
import { Product, type ProductDocument } from '../../schemas/product.schema';
import { shortId } from '../../common/utils/slug';
import { CartService, type PricedLine } from '../cart/cart.service';
import { WhatsappService } from '../notifications/whatsapp.service';
import type { CreateOrderDto } from '../cart/dto/cart.dto';

/** One product and how many units an order takes off the shelf. */
interface StockNeed {
  product: Types.ObjectId;
  quantity: number;
  name: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  /** null until the first order tells us whether this deployment can do transactions. */
  private supportsTransactions: boolean | null = null;
  private collectionsReady = false;

  constructor(
    @InjectModel(Order.name) private readonly orders: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    @InjectModel(InventoryLog.name) private readonly logs: Model<InventoryLogDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly cart: CartService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /**
   * `RGI-2026-000042`. The counter is bumped with a single atomic `findOneAndUpdate`, so
   * two simultaneous orders can never take the same number — no transaction needed.
   */
  private async nextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const counters = this.connection.collection<{ _id: string; seq: number }>('counters');
    const result = await counters.findOneAndUpdate(
      { _id: `orders-${year}` },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
    const seq = result?.seq ?? 1;
    return `RGI-${year}-${String(seq).padStart(6, '0')}`;
  }

  /**
   * MongoDB refuses to *create* a collection inside a transaction on a sharded or shared
   * cluster — which is exactly what the very first order on a fresh deployment would do.
   * Creating them up front (idempotent, once per process) keeps that first order from
   * failing after its order number has already been taken.
   */
  private async ensureCollections(): Promise<void> {
    if (this.collectionsReady) return;
    const existing = new Set(
      (await this.connection.db!.listCollections({}, { nameOnly: true }).toArray()).map(
        (collection) => collection.name,
      ),
    );
    for (const name of ['orders', 'inventorylogs', 'counters']) {
      if (!existing.has(name)) {
        await this.connection.db!.createCollection(name).catch(() => undefined);
      }
    }
    this.collectionsReady = true;
  }

  /** Same product in several lines (a loose GPU plus one inside a build) must be summed. */
  private static aggregateNeeds(lines: PricedLine[]): StockNeed[] {
    const byProduct = new Map<string, StockNeed>();
    for (const line of lines) {
      for (const need of line.stockNeeds) {
        const key = need.product.toString();
        const current = byProduct.get(key);
        if (current) current.quantity += need.quantity;
        else byProduct.set(key, { ...need });
      }
    }
    return [...byProduct.values()];
  }

  /**
   * The guard is the whole point: `stock: { $gte: quantity }` makes the read and the write
   * one atomic operation, so two buyers cannot both take the last unit
   * (DATA_MODEL.md §7). Returns false when the shelf moved under us.
   */
  private async deduct(need: StockNeed, session?: ClientSession): Promise<boolean> {
    const result = await this.products.updateOne(
      { _id: need.product, stock: { $gte: need.quantity } },
      { $inc: { stock: -need.quantity } },
      session ? { session } : {},
    );
    return result.modifiedCount === 1;
  }

  private async restock(need: StockNeed, session?: ClientSession): Promise<void> {
    await this.products.updateOne(
      { _id: need.product },
      { $inc: { stock: need.quantity } },
      session ? { session } : {},
    );
  }

  private async logMovements(
    needs: StockNeed[],
    orderNumber: string,
    reason: 'order' | 'cancel',
    session?: ClientSession,
  ): Promise<void> {
    const sign = reason === 'order' ? -1 : 1;
    const docs = needs.map((need) => ({
      product: need.product,
      delta: sign * need.quantity,
      reason,
      ref: orderNumber,
    }));
    if (!docs.length) return;
    // Mongoose refuses `create()` with a session and several documents unless the insert
    // is ordered — parallel inserts cannot share one transaction. A one-product cart has a
    // single movement and slipped through; a configured PC (one movement per part) or any
    // cart with two products did not, and the order failed after its number was taken.
    await this.logs.create(docs, session ? { session, ordered: true } : { ordered: true });
  }

  async create(
    dto: CreateOrderDto,
    userId?: string,
    idempotencyKey?: string,
  ): Promise<OrderDto> {
    // A retried submit (double click, flaky network) returns the first order, never a
    // second one (API_SPEC.md §Cross-cutting).
    if (idempotencyKey) {
      const existing = await this.orders.findOne({ idempotencyKey }).exec();
      if (existing) return OrdersService.toDto(existing);
    }

    if (dto.shipping.method === 'delivery' && !dto.shipping.address) {
      throw new BadRequestException('Une adresse de livraison est requise.');
    }

    // CMI needs merchant credentials and a signed redirect flow (API_SPEC.md §Payments).
    // Until they exist, accepting a card order would tell the customer they had paid when
    // nothing was charged, so the method is refused rather than faked. COD is unaffected.
    if (dto.payment.method === 'cmi' && !process.env.CMI_MERCHANT_ID) {
      throw new BadRequestException(
        'Le paiement par carte n’est pas encore actif. Choisissez le paiement à la livraison.',
      );
    }

    const priced = await this.cart.priceLines(dto.items);
    const blocked = priced.find((line) => line.problem);
    if (blocked) throw new ConflictException(`${blocked.name} : ${blocked.problem}`);

    const subtotal = CartService.subtotalOf(priced);
    const quote = this.cart.quote(subtotal, {
      method: dto.shipping.method,
      zone: dto.shipping.zone,
      city: dto.shipping.address?.city ?? dto.shipping.city,
    });

    const needs = OrdersService.aggregateNeeds(priced);
    await this.ensureCollections();
    const orderNumber = await this.nextOrderNumber();

    const payload = {
      orderNumber,
      user: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null,
      contact: dto.contact,
      items: priced.map((line) => ({
        kind: line.kind,
        product: line.productId,
        build: line.build,
        name: line.name,
        image: line.image,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
      subtotal,
      shipping: {
        method: dto.shipping.method,
        zone: dto.shipping.zone,
        cost: quote.shippingCost,
        address: dto.shipping.address,
      },
      discountTotal: quote.discountTotal,
      total: quote.total,
      payment: { method: dto.payment.method, status: 'pending' as const },
      status: 'pending' as const,
      statusHistory: [{ status: 'pending' as const, at: new Date() }],
      notes: dto.notes,
      idempotencyKey,
      publicToken: shortId(),
    };

    const doc = await this.placeAtomically(payload, needs);
    const order = OrdersService.toDto(doc);

    // Deliberately not awaited. The order is committed; telling the shop about it is a
    // courtesy that runs on a third-party relay, and a relay that is slow or down must
    // never hold the customer on a spinner or fail a sale it cannot affect. The service
    // swallows its own errors — the `.catch()` is belt and braces against an unexpected
    // synchronous throw.
    void this.whatsapp.notifyNewOrder(order).catch(() => undefined);

    return order;
  }

  /**
   * Deduct every line's stock and write the order as one unit of work.
   *
   * On a replica set (Atlas, or a local single-node set) this runs in a real transaction,
   * exactly as DATA_MODEL.md §7 requires. A standalone `mongod` cannot start one, so the
   * fallback keeps the same guarded updates — each one is still atomic on its own document,
   * so the last unit can never be sold twice — and compensates by restocking what it had
   * already taken if a later line fails. The difference is that the fallback is
   * eventually-consistent for a few milliseconds instead of all-or-nothing; it is a
   * development convenience, and the API logs a warning saying so.
   */
  private async placeAtomically(
    payload: Record<string, unknown>,
    needs: StockNeed[],
  ): Promise<OrderDocument> {
    if (this.supportsTransactions !== false) {
      const session = await this.connection.startSession();
      try {
        let created: OrderDocument | undefined;
        await session.withTransaction(async () => {
          for (const need of needs) {
            if (!(await this.deduct(need, session))) {
              throw new ConflictException(`Rupture de stock : ${need.name}.`);
            }
          }
          const [doc] = await this.orders.create([payload], { session });
          await this.logMovements(needs, doc.orderNumber, 'order', session);
          created = doc;
        });
        this.supportsTransactions = true;
        return created!;
      } catch (error) {
        if (error instanceof ConflictException) throw error;
        if (!OrdersService.isUnsupportedTransaction(error)) throw error;
        this.supportsTransactions = false;
        this.logger.warn(
          'MongoDB ne supporte pas les transactions (instance standalone) : ' +
            'déduction de stock ligne par ligne avec compensation. ' +
            'Passer en replica set avant la mise en production — voir apps/api/README.md.',
        );
      } finally {
        await session.endSession();
      }
    }

    const taken: StockNeed[] = [];
    try {
      for (const need of needs) {
        if (!(await this.deduct(need))) {
          throw new ConflictException(`Rupture de stock : ${need.name}.`);
        }
        taken.push(need);
      }
      const doc = await this.orders.create(payload);
      await this.logMovements(needs, doc.orderNumber, 'order');
      return doc;
    } catch (error) {
      for (const need of taken) await this.restock(need);
      throw error;
    }
  }

  /** Every way a server without a replica set says "no transactions here". */
  private static isUnsupportedTransaction(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('Transaction numbers are only allowed') ||
      message.includes('replica set') ||
      message.includes('IllegalOperation') ||
      message.includes('does not support transactions')
    );
  }

  /**
   * A guest has no account, so the order number alone must not be enough to read someone
   * else's order — numbers are sequential and therefore guessable. The creation response
   * carries a `publicToken`; the confirmation link uses it. Logged-in owners and staff do
   * not need it.
   */
  async findByNumber(
    orderNumber: string,
    options: { token?: string; userId?: string; isStaff?: boolean } = {},
  ): Promise<OrderDto> {
    const doc = await this.orders.findOne({ orderNumber }).exec();
    if (!doc) throw new NotFoundException('Commande introuvable.');

    const isOwner =
      options.userId && doc.user && doc.user.toString() === options.userId;
    const tokenMatches = options.token && options.token === doc.publicToken;
    if (!options.isStaff && !isOwner && !tokenMatches) {
      throw new ForbiddenException('Accès à cette commande non autorisé.');
    }
    return OrdersService.toDto(doc);
  }

  async listForUser(userId: string): Promise<OrderDto[]> {
    const docs = await this.orders
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
    return docs.map((doc) => OrdersService.toDto(doc));
  }

  static toDto(doc: OrderDocument): OrderDto & { publicToken?: string } {
    return {
      id: doc._id.toString(),
      orderNumber: doc.orderNumber,
      user: doc.user ? doc.user.toString() : undefined,
      contact: doc.contact,
      items: doc.items.map((item) => ({
        kind: item.kind,
        product: item.product?.toString(),
        build: item.build
          ? {
              items: item.build.items.map((part) => ({
                slot: part.slot as never,
                product: part.product.toString(),
                priceAtBuild: part.priceAtBuild,
                name: part.name,
                brand: part.brand,
                image: part.image,
                quantity: part.quantity,
              })),
              servicesIncluded: item.build.servicesIncluded,
              discountPct: item.build.discountPct,
              subtotal: item.build.subtotal,
              total: item.build.total,
              estimatedWattage: item.build.estimatedWattage,
            }
          : undefined,
        name: item.name,
        image: item.image,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      subtotal: doc.subtotal,
      shipping: {
        method: doc.shipping.method,
        zone: doc.shipping.zone,
        cost: doc.shipping.cost,
        address: doc.shipping.address,
      },
      discountTotal: doc.discountTotal,
      total: doc.total,
      payment: {
        method: doc.payment.method,
        status: doc.payment.status,
        cmiRef: doc.payment.cmiRef,
      },
      status: doc.status,
      statusHistory: doc.statusHistory.map((entry) => ({
        status: entry.status,
        at: entry.at.toISOString(),
        by: entry.by?.toString(),
      })),
      notes: doc.notes,
      publicToken: doc.publicToken,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt?.toISOString(),
      updatedAt: (doc as unknown as { updatedAt?: Date }).updatedAt?.toISOString(),
    };
  }
}
