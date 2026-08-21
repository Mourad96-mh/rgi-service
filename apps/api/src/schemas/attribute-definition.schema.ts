import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { AttributeDataType } from '@rgi/types';
import { LocalizedText, LocalizedTextSchema } from './localized.schema';

export type AttributeDefinitionDocument = HydratedDocument<AttributeDefinition>;

/**
 * DATA_MODEL.md §2. One row drives three things at once: the admin form field, the
 * listing facet, and the configurator's compatibility input. One source of truth.
 */
@Schema({ timestamps: true, collection: 'attributedefinitions' })
export class AttributeDefinition {
  /** Matches Category.componentType, or Category.type for non-component categories. */
  @Prop({ required: true, index: true })
  categoryType!: string;

  @Prop({ required: true, trim: true })
  key!: string;

  @Prop({ type: LocalizedTextSchema, required: true })
  label!: LocalizedText;

  @Prop({ required: true, enum: ['string', 'number', 'boolean', 'enum'] })
  dataType!: AttributeDataType;

  @Prop()
  unit?: string;

  @Prop({ type: [String], default: undefined })
  enumValues?: string[];

  /** enum attributes holding several values at once, e.g. case.form_factors_supported */
  @Prop({ default: false })
  multiple!: boolean;

  @Prop({ default: false })
  required!: boolean;

  @Prop({ default: false })
  filterable!: boolean;

  @Prop({ default: false })
  usedInCompatibility!: boolean;

  @Prop({ default: 0 })
  order!: number;
}

export const AttributeDefinitionSchema =
  SchemaFactory.createForClass(AttributeDefinition);
AttributeDefinitionSchema.index({ categoryType: 1, key: 1 }, { unique: true });
