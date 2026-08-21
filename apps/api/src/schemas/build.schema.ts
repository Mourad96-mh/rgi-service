import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { SlotId } from '@rgi/types';

export type BuildDocument = HydratedDocument<Build>;

@Schema({ _id: false })
export class BuildLine {
  @Prop({ required: true })
  slot!: SlotId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  /** centimes at the time the build was saved — a shared build keeps its quote honest. */
  @Prop({ required: true })
  priceAtBuild!: number;

  @Prop()
  name?: string;

  @Prop()
  brand?: string;

  @Prop()
  image?: string;

  @Prop({ default: 1 })
  quantity!: number;
}
export const BuildLineSchema = SchemaFactory.createForClass(BuildLine);

/** DATA_MODEL.md §4 — a saved custom PC configuration, shareable by `shareId`. */
@Schema({ timestamps: true, collection: 'builds' })
export class Build {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  user?: Types.ObjectId | null;

  @Prop({ required: true, unique: true })
  shareId!: string;

  @Prop()
  name?: string;

  @Prop({ type: [BuildLineSchema], default: [] })
  items!: BuildLine[];

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

  @Prop({ default: false })
  isValid!: boolean;

  @Prop({ type: [String], default: [] })
  warnings!: string[];
}

export const BuildSchema = SchemaFactory.createForClass(Build);
