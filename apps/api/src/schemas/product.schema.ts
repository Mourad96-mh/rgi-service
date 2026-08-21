import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { AttributeValue, ProductStatus } from '@rgi/types';
import { LocalizedText, LocalizedTextSchema } from './localized.schema';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ _id: false })
export class ProductImage {
  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  publicId!: string;

  @Prop()
  alt?: string;

  @Prop({ default: false })
  isPrimary!: boolean;

  @Prop({ default: 0 })
  order!: number;
}
export const ProductImageSchema = SchemaFactory.createForClass(ProductImage);

/** A scheduled price window. Money is centimes — never a float (CLAUDE.md §6). */
@Schema({ _id: false })
export class FlashDeal {
  @Prop({ required: true })
  price!: number;

  @Prop({ required: true })
  startsAt!: Date;

  @Prop({ required: true })
  endsAt!: Date;
}
export const FlashDealSchema = SchemaFactory.createForClass(FlashDeal);

/** DATA_MODEL.md §3 — everything sold, and every configurator part. */
@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ type: LocalizedTextSchema, required: true })
  name!: LocalizedText;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ required: true, unique: true, trim: true })
  sku!: string;

  @Prop({ required: true, trim: true, index: true })
  brand!: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  category!: Types.ObjectId;

  /** Denormalized from the category so filters and the configurator query it directly. */
  @Prop({ required: true, index: true })
  categoryType!: string;

  @Prop({ type: LocalizedTextSchema, required: true })
  description!: LocalizedText;

  @Prop({ type: LocalizedTextSchema })
  shortDescription?: LocalizedText;

  /** centimes */
  @Prop({ required: true, min: 0 })
  price!: number;

  /** centimes — the struck-through "was" price */
  @Prop({ min: 0 })
  compareAtPrice?: number;

  @Prop({ type: FlashDealSchema })
  flashDeal?: FlashDeal;

  @Prop({ type: [ProductImageSchema], default: [] })
  images!: ProductImage[];

  /** Validated against the AttributeDefinition rows for this categoryType. */
  @Prop({ type: Object, default: {} })
  attributes!: Record<string, AttributeValue>;

  @Prop({ required: true, min: 0, default: 0 })
  stock!: number;

  @Prop({ default: 3 })
  lowStockThreshold!: number;

  @Prop({ default: false, index: true })
  isConfiguratorPart!: boolean;

  @Prop({ required: true, enum: ['active', 'draft', 'archived'], default: 'draft' })
  status!: ProductStatus;

  @Prop({ type: LocalizedTextSchema })
  metaTitle?: LocalizedText;

  @Prop({ type: LocalizedTextSchema })
  metaDescription?: LocalizedText;

  @Prop({ min: 0, max: 5 })
  ratingAvg?: number;

  @Prop({ default: 0 })
  ratingCount!: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ categoryType: 1, status: 1 });
ProductSchema.index({ categoryType: 1, isConfiguratorPart: 1, status: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index(
  { 'name.fr': 'text', brand: 'text', 'description.fr': 'text' },
  { weights: { 'name.fr': 10, brand: 5, 'description.fr': 1 }, name: 'product_text' },
);
