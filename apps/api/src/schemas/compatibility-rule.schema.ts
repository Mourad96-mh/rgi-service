import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { RuleType, Severity, SlotId } from '@rgi/types';

export type CompatibilityRuleDocument = HydratedDocument<CompatibilityRule>;

/**
 * DATA_MODEL.md §5 — compatibility is DATA, not code (CLAUDE.md §6). The engine in
 * `@rgi/config-engine` only knows how to evaluate the six operators; every actual rule
 * lives here and is editable by an admin.
 */
@Schema({ timestamps: true, collection: 'compatibilityrules' })
export class CompatibilityRule {
  /** Stable business id, e.g. 'cpu_mobo_socket'. */
  @Prop({ required: true, unique: true })
  ruleId!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, enum: ['match', 'gte', 'lte', 'fits', 'sum_lte', 'includes'] })
  type!: RuleType;

  @Prop({ type: Object, required: true })
  left!: { slot: SlotId; attr: string };

  @Prop({ type: Object, required: true })
  right!: { slot: SlotId; attr: string } | { const: number | string };

  @Prop({ type: [String], default: undefined })
  sumSlots?: SlotId[];

  @Prop()
  sumAttr?: string;

  /** e.g. 0.8 → require psu.wattage * 0.8 >= summed draw (20% headroom). */
  @Prop()
  factor?: number;

  /** Flat allowance added to a sum (e.g. +100 W for board, drives and fans). */
  @Prop()
  baseAllowance?: number;

  @Prop({ required: true, enum: ['error', 'warning'], default: 'error' })
  severity!: Severity;

  @Prop({ required: true })
  messageFr!: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CompatibilityRuleSchema = SchemaFactory.createForClass(CompatibilityRule);
