import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { CategoryType, ComponentType } from '@rgi/types';
import { LocalizedText, LocalizedTextSchema } from './localized.schema';

export type CategoryDocument = HydratedDocument<Category>;

/** DATA_MODEL.md §1 — the catalog tree. */
@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ type: LocalizedTextSchema, required: true })
  name!: LocalizedText;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null, index: true })
  parent!: Types.ObjectId | null;

  @Prop({
    required: true,
    enum: [
      'component',
      'prebuilt',
      'laptop',
      'peripheral',
      'console',
      'monitor',
      'workstation',
    ],
  })
  type!: CategoryType;

  /** Set when this category is a configurator part type — drives the builder. */
  @Prop({
    enum: ['cpu', 'motherboard', 'ram', 'gpu', 'psu', 'case', 'cooler', 'storage', 'fan'],
    index: true,
  })
  componentType?: ComponentType;

  @Prop()
  configuratorSlot?: string;

  @Prop()
  image?: string;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ parent: 1, order: 1 });
