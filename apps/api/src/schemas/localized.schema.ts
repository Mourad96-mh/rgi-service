import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** `{ fr, ar? }` — French is required everywhere, Arabic ships later (CLAUDE.md §2). */
@Schema({ _id: false })
export class LocalizedText {
  @Prop({ required: true, trim: true })
  fr!: string;

  @Prop({ trim: true })
  ar?: string;
}

export const LocalizedTextSchema = SchemaFactory.createForClass(LocalizedText);
