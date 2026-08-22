import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import type {
  InventoryMovement,
  Order as OrderDto,
  OrderStatus,
  Paginated,
  PaymentStatus,
  Product as ProductDto,
  ProductUsage,
} from '@rgi/types';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABEL_FR } from '@rgi/types';
import { Order, type OrderDocument } from '../../schemas/order.schema';
import { Product, type ProductDocument } from '../../schemas/product.schema';
import { InventoryLog, type InventoryLogDocument } from '../../schemas/inventory-log.schema';
import { Build, type BuildDocument } from '../../schemas/build.schema';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import type { OrderListQueryDto, ProductListQueryDto } from './dto/admin.dto';

/** Escape a staff search term so a stray "(" or "*" cannot break the query. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, (match) => `\\${match}`);
}

export interface AdminStats {
  ordersToday: number;
  ordersWeek: number;
  revenueWeek: number;
  pendingOrders: number;
  lowStock: { id: string; name: string; sku: string; stock: number; threshold: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  activeDeals: number;
}

/** Staff-facing reads and writes that do not belong to the storefront modules. */
@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Order.name) private readonly orders: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    @InjectModel(InventoryLog.name) private readonly logs: Model<InventoryLogDocument>,
    @InjectModel(Build.name) private readonly builds: Model<BuildDocument>,
  ) {}

  async listOrders(query: OrderListQueryDto): Promise<Paginated<OrderDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filter: FilterQuery<OrderDocument> = {};
    if (query.status) filter.status = query.status;
    if (query.paymentStatus) filter['payment.status'] = query.paymentStatus;
    if (query.q) {
      const term = new RegExp(escapeRegex(query.q), 'i');
      filter.$or = [
        { orderNumber: term },
        { 'contact.name': term },
        { 'contact.email': term },
        { 'contact.phone': term },
      ];
    }

    const [docs, total] = await Promise.all([
      this.orders
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.orders.countDocuments(filter).exec(),
    ]);

    return {
      data: docs.map((doc) => OrdersService.toDto(doc)),
      total,
      page,
      limit,
    };
  }

  async findOrder(id: string): Promise<OrderDto> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const doc = await this.orders.findById(id).exec();
    if (!doc) throw new NotFoundException('Commande introuvable.');
    return OrdersService.toDto(doc);
  }

  /**
   * Move an order along its lifecycle. The allowed transitions are the shared
   * `ORDER_STATUS_FLOW`, so the admin UI and the API agree on what is possible; cancelling
   * puts every unit back on the shelf (DATA_MODEL.md §7).
   */
  async updateOrderStatus(id: string, status: OrderStatus, by?: string): Promise<OrderDto> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const doc = await this.orders.findById(id).exec();
    if (!doc) throw new NotFoundException('Commande introuvable.');

    if (doc.status === status) return OrdersService.toDto(doc);
    if (!ORDER_STATUS_FLOW[doc.status].includes(status)) {
      throw new BadRequestException(
        `Une commande « ${ORDER_STATUS_LABEL_FR[doc.status]} » ne peut pas passer à « ${ORDER_STATUS_LABEL_FR[status]} ».`,
      );
    }

    if (status === 'cancelled') await this.restockOrder(doc, by);

    doc.status = status;
    doc.statusHistory.push({
      status,
      at: new Date(),
      by: by && Types.ObjectId.isValid(by) ? new Types.ObjectId(by) : undefined,
    });
    await doc.save();
    return OrdersService.toDto(doc);
  }

  /** Reverse every movement the order made, once, with an audit row per product. */
  private async restockOrder(doc: OrderDocument, by?: string): Promise<void> {
    const byProduct = new Map<string, number>();
    for (const item of doc.items) {
      if (item.kind === 'product' && item.product) {
        const key = item.product.toString();
        byProduct.set(key, (byProduct.get(key) ?? 0) + item.quantity);
      }
      for (const part of item.build?.items ?? []) {
        const key = part.product.toString();
        byProduct.set(key, (byProduct.get(key) ?? 0) + part.quantity * item.quantity);
      }
    }

    for (const [id, quantity] of byProduct) {
      await this.products.updateOne(
        { _id: new Types.ObjectId(id) },
        { $inc: { stock: quantity } },
      );
      await this.logs.create({
        product: new Types.ObjectId(id),
        delta: quantity,
        reason: 'cancel',
        ref: doc.orderNumber,
        by: by && Types.ObjectId.isValid(by) ? new Types.ObjectId(by) : undefined,
      });
    }
  }

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    cmiRef?: string,
  ): Promise<OrderDto> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const doc = await this.orders.findById(id).exec();
    if (!doc) throw new NotFoundException('Commande introuvable.');
    doc.payment.status = status;
    if (cmiRef) doc.payment.cmiRef = cmiRef;
    await doc.save();
    return OrdersService.toDto(doc);
  }

  /**
   * Staff product listing. The storefront's listing only ever shows `active` products;
   * the dashboard has to see drafts and archives too, which is why this lives here rather
   * than as another flag on the public endpoint.
   */
  async listProducts(query: ProductListQueryDto): Promise<Paginated<ProductDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filter: FilterQuery<ProductDocument> = {};
    if (query.status) filter.status = query.status;
    if (query.category) filter.categoryType = query.category;
    if (query.q) {
      const term = new RegExp(escapeRegex(query.q), 'i');
      filter.$or = [{ 'name.fr': term }, { brand: term }, { sku: term }];
    }
    // Each product carries its own alert threshold, so "low stock" is a comparison between
    // two fields of the same document rather than a fixed number — hence `$expr`.
    if (query.lowStock) {
      filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
    }

    const sort: Record<string, 1 | -1> =
      query.sort === 'stock'
        ? { stock: 1 }
        : query.sort === 'name'
          ? { 'name.fr': 1 }
          : { updatedAt: -1 };

    const [docs, total] = await Promise.all([
      this.products
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.products.countDocuments(filter).exec(),
    ]);

    return { data: docs.map((doc) => ProductsService.toDto(doc)), total, page, limit };
  }

  /**
   * How much history a product carries, so the Produits section can offer a real delete
   * for a mistake while refusing one for anything a customer has actually bought.
   *
   * A product hides in three places and all three are checked: an ordinary order line, a
   * part *inside* a configured PC on an order line, and a saved shareable build. Counting
   * only the first would let staff destroy a graphics card that has only ever sold inside
   * custom builds, leaving those orders and `/configurateur-pc/[shareId]` pages pointing
   * at nothing.
   */
  async productUsage(id: string): Promise<ProductUsage> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const productId = new Types.ObjectId(id);

    const [orderCount, buildCount] = await Promise.all([
      this.orders
        .countDocuments({
          $or: [
            { 'items.product': productId },
            { 'items.build.items.product': productId },
          ],
        })
        .exec(),
      this.builds.countDocuments({ 'items.product': productId }).exec(),
    ]);

    return { orderCount, buildCount, canDelete: orderCount === 0 && buildCount === 0 };
  }

  /**
   * Destroy a product for good. Archiving is the normal way to retire something
   * (`DELETE /products/:id`); this exists only for a genuine mistake — a duplicate or a
   * typo entered minutes ago — and refuses the moment the product has any history.
   *
   * The usage check is re-run here rather than trusted from the client: the dashboard
   * asks first so it can disable the button, but a product can be ordered between that
   * question and this call.
   */
  async deleteProductPermanently(id: string): Promise<void> {
    const usage = await this.productUsage(id);
    if (!usage.canDelete) {
      throw new BadRequestException(
        'Ce produit apparaît dans des commandes ou des configurations enregistrées : ' +
          'il peut être archivé, mais pas supprimé.',
      );
    }

    const doc = await this.products.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Produit introuvable.');

    // The audit trail of a product that no longer exists is unreadable noise; nothing
    // references these rows once the product is gone.
    await this.logs.deleteMany({ product: doc._id }).exec();
  }

  /** Stock movements for one product, newest first — the Stock section's history panel. */
  async inventoryMovements(id: string, limit = 20): Promise<InventoryMovement[]> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const docs = await this.logs
      .find({ product: new Types.ObjectId(id) })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .exec();

    return docs.map((doc) => ({
      id: String(doc._id),
      delta: doc.delta,
      reason: doc.reason,
      ref: doc.ref,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt.toISOString(),
    }));
  }

  /** By id and whatever its status — the dashboard edits drafts and archives too. */
  async findProduct(id: string): Promise<ProductDto> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const doc = await this.products.findById(id).exec();
    if (!doc) throw new NotFoundException('Produit introuvable.');
    return ProductsService.toDto(doc);
  }

  /** Dashboard KPIs (ADMIN_DASHBOARD.md §7). */
  async stats(): Promise<AdminStats> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [ordersToday, ordersWeek, pendingOrders, revenue, lowStockDocs, top, activeDeals] =
      await Promise.all([
        this.orders.countDocuments({ createdAt: { $gte: startOfDay } }).exec(),
        this.orders.countDocuments({ createdAt: { $gte: weekAgo } }).exec(),
        this.orders.countDocuments({ status: 'pending' }).exec(),
        this.orders
          .aggregate<{ total: number }>([
            { $match: { createdAt: { $gte: weekAgo }, status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$total' } } },
          ])
          .exec(),
        this.products
          .find({ status: 'active', $expr: { $lte: ['$stock', '$lowStockThreshold'] } })
          .sort({ stock: 1 })
          .limit(12)
          .exec(),
        this.orders
          .aggregate<{ _id: string; quantity: number; revenue: number }>([
            { $match: { status: { $ne: 'cancelled' } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.name',
                quantity: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.lineTotal' },
              },
            },
            { $sort: { quantity: -1 } },
            { $limit: 5 },
          ])
          .exec(),
        this.products
          .countDocuments({
            'flashDeal.startsAt': { $lte: now },
            'flashDeal.endsAt': { $gte: now },
          })
          .exec(),
      ]);

    return {
      ordersToday,
      ordersWeek,
      revenueWeek: revenue[0]?.total ?? 0,
      pendingOrders,
      lowStock: lowStockDocs.map((doc) => ({
        id: doc._id.toString(),
        name: doc.name.fr,
        sku: doc.sku,
        stock: doc.stock,
        threshold: doc.lowStockThreshold,
      })),
      topProducts: top.map((row) => ({
        name: row._id,
        quantity: row.quantity,
        revenue: row.revenue,
      })),
      activeDeals,
    };
  }
}
