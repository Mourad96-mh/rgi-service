import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InventoryLogDocument = HydratedDocument<InventoryLog>;

/** DATA_MODEL.md §8 — audit trail of every stock movement. */
@Schema({ timestamps: true, collection: 'inventorylogs' })
export class InventoryLog {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product!: Types.ObjectId;

  /** negative on sale, positive on restock */
  @Prop({ required: true })
  delta!: number;

  @Prop({ required: true, enum: ['order', 'cancel', 'manual', 'import'] })
  reason!: 'order' | 'cancel' | 'manual' | 'import';

  /** e.g. the order number the movement belongs to */
  @Prop()
  ref?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  by?: Types.ObjectId;
}

export const InventoryLogSchema = SchemaFactory.createForClass(InventoryLog);
