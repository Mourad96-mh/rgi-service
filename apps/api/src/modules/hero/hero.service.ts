import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { HeroSlideId, HeroSlideImage as HeroSlideImageDto } from '@rgi/types';
import {
  HeroSlideImage,
  type HeroSlideImageDocument,
} from '../../schemas/hero-slide-image.schema';
import { SetHeroSlideImageDto } from './dto/hero.dto';

@Injectable()
export class HeroService {
  constructor(
    @InjectModel(HeroSlideImage.name)
    private readonly images: Model<HeroSlideImageDocument>,
  ) {}

  static toDto(doc: HeroSlideImageDocument): HeroSlideImageDto {
    return {
      slideId: doc.slideId,
      url: doc.url,
      publicId: doc.publicId,
      alt: doc.alt,
      updatedAt: (doc as { updatedAt?: Date }).updatedAt?.toISOString(),
    };
  }

  /** Every override there is — a handful of rows at most, so no pagination. */
  async findAll(): Promise<HeroSlideImageDto[]> {
    const docs = await this.images.find().lean<HeroSlideImageDocument[]>().exec();
    return docs.map((doc) => HeroService.toDto(doc));
  }

  /**
   * Upsert, so staff can replace a photo repeatedly without the row multiplying, and so
   * the first save behaves exactly like the tenth.
   */
  async set(slideId: HeroSlideId, dto: SetHeroSlideImageDto): Promise<HeroSlideImageDto> {
    const doc = await this.images
      .findOneAndUpdate(
        { slideId },
        { $set: { slideId, url: dto.url, publicId: dto.publicId, alt: dto.alt } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return HeroService.toDto(doc);
  }

  /**
   * Drop the override so the slide falls back to the photo that ships with it.
   *
   * The Cloudinary asset is deliberately left alone: `DELETE /media/*` is the one place
   * that destroys files, it asks for confirmation first, and an asset removed here could
   * still be in use on a product.
   */
  async reset(slideId: HeroSlideId): Promise<void> {
    await this.images.deleteOne({ slideId }).exec();
  }
}
