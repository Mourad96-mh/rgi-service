import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { HeroSlideId } from '@rgi/types';
import { HERO_SLIDE_IDS } from '@rgi/types';

export type HeroSlideImageDocument = HydratedDocument<HeroSlideImage>;

/**
 * One row per slide whose photo staff have replaced — never one per slide.
 *
 * An absent row means "use the photo that ships with the slide", so reverting is a
 * delete rather than a flag, and a slide the staff never touched costs nothing. `slideId`
 * is unique so the upsert cannot race two rows into existence for the same slide.
 */
@Schema({ timestamps: true, collection: 'heroslideimages' })
export class HeroSlideImage {
  @Prop({ required: true, unique: true, enum: HERO_SLIDE_IDS })
  slideId!: HeroSlideId;

  @Prop({ required: true, trim: true })
  url!: string;

  /** Cloudinary public id, kept so the asset can be destroyed when it is replaced. */
  @Prop({ trim: true })
  publicId?: string;

  @Prop({ required: true, trim: true })
  alt!: string;
}

export const HeroSlideImageSchema = SchemaFactory.createForClass(HeroSlideImage);
