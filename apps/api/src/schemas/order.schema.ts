import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingMethod,
} from '@rgi/types';

export type OrderDocument = HydratedDocument<Order>;

/** One part of a configured PC, snapshotted inside the order line. */
@Schema({ _id: false })
export class OrderBuildPart {
  @Prop({ required: true })
  slot!: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop()
  name?: string;

  @Prop()
  brand?: string;

  @Prop()
  image?: string;

  @Prop({ required: true })
  priceAtBuild!: number;

  @Prop({ default: 1 })
  quantity!: number;
}
export const OrderBuildPartSchema = SchemaFactory.createForClass(OrderBuildPart);

@Schema({ _id: false })
export class OrderBuild {
  @Prop({ type: [OrderBuildPartSchema], default: [] })
  items!: OrderBuildPart[];

  @Prop({ default: true })
  servicesIncluded!: boolean;

  @Prop({ default: 5 })
  discountPct!: number;

  @Prop({ required: true })
  subtotal!: number;

  @Prop({ required: true })
  total!: number;

  @Prop({ default: 0 })
  estimatedWattage!: number;
}
export const OrderBuildSchema = SchemaFactory.createForClass(OrderBuild);

/**
 * A line is either a catalog product or a whole configured PC. Everything is a snapshot:
 * an order must still read correctly after the catalog is renamed or re-priced
 * (DATA_MODEL.md §7).
 */
@Schema({ _id: false })
export class OrderLine {
  @Prop({ required: true, enum: ['product', 'build'] })
  kind!: 'product' | 'build';

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  product?: Types.ObjectId;

  @Prop({ type: OrderBuildSchema })
  build?: OrderBuild;

  @Prop({ required: true })
  name!: string;

  @Prop()
  image?: string;

  @Prop({ required: true })
  unitPrice!: number;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true })
  lineTotal!: number;
}
export const OrderLineSchema = SchemaFactory.createForClass(OrderLine);

@Schema({ _id: false })
export class OrderAddress {
  @Prop() label?: string;
  @Prop({ required: true }) line1!: string;
  @Prop() line2?: string;
  @Prop({ required: true }) city!: string;
  @Prop() region?: string;
  @Prop() postalCode?: string;
  @Prop({ required: true }) phone!: string;
  @Prop({ default: false }) isDefault!: boolean;
}
export const OrderAddressSchema = SchemaFactory.createForClass(OrderAddress);

@Schema({ _id: false })
export class OrderShipping {
  @Prop({ required: true, enum: ['delivery', 'pickup'] })
  method!: ShippingMethod;

  @Prop()
  zone?: string;

  @Prop({ required: true, default: 0 })
  cost!: number;

  @Prop({ type: OrderAddressSchema })
  address?: OrderAddress;
}
export const OrderShippingSchema = SchemaFactory.createForClass(OrderShipping);

@Schema({ _id: false })
export class OrderContact {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) email!: string;
  @Prop({ required: true }) phone!: string;
}
export const OrderContactSchema = SchemaFactory.createForClass(OrderContact);

@Schema({ _id: false })
export class OrderPayment {
  @Prop({ required: true, enum: ['cmi', 'cod'] })
  method!: PaymentMethod;

  @Prop({ required: true, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' })
  status!: PaymentStatus;

  @Prop()
  cmiRef?: string;
}
export const OrderPaymentSchema = SchemaFactory.createForClass(OrderPayment);

@Schema({ _id: false })
export class OrderStatusEntry {
  @Prop({ required: true })
  status!: OrderStatus;

  @Prop({ required: true, default: () => new Date() })
  at!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  by?: Types.ObjectId;
}
export const OrderStatusEntrySchema = SchemaFactory.createForClass(OrderStatusEntry);

/** DATA_MODEL.md §7 — safety-critical. Money is centimes, never floats. */
@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  user?: Types.ObjectId | null;

  @Prop({ type: OrderContactSchema, required: true })
  contact!: OrderContact;

  @Prop({ type: [OrderLineSchema], default: [] })
  items!: OrderLine[];

  @Prop({ required: true })
  subtotal!: number;

  @Prop({ type: OrderShippingSchema, required: true })
  shipping!: OrderShipping;

  @Prop({ required: true, default: 0 })
  discountTotal!: number;

  @Prop({ required: true })
  total!: number;

  @Prop({ type: OrderPaymentSchema, required: true })
  payment!: OrderPayment;

  @Prop({
    required: true,
    enum: ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    index: true,
  })
  status!: OrderStatus;

  @Prop({ type: [OrderStatusEntrySchema], default: [] })
  statusHistory!: OrderStatusEntry[];

  @Prop()
  notes?: string;

  /**
   * `Idempotency-Key` from the client (API_SPEC.md §Cross-cutting): a retried submit —
   * double click, flaky network — returns the first order instead of placing a second.
   */
  @Prop({ index: true, sparse: true })
  idempotencyKey?: string;

  /** Lets a guest read their own order without an account; sequential numbers are guessable. */
  @Prop({ required: true })
  publicToken!: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
