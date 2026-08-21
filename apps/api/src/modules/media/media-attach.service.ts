import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Product as ProductDto } from '@rgi/types';
import { Product, type ProductDocument } from '../../schemas/product.schema';
import { ProductsService } from '../products/products.service';
import type { AttachMediaDto } from './dto/media.dto';

/**
 * The database half of the media module: which product an uploaded asset belongs to.
 *
 * Kept apart from `MediaService` so the Cloudinary code stays free of Mongoose — the
 * signing logic is worth being able to reason about on its own.
 */
@Injectable()
export class MediaAttachService {
  constructor(
    @InjectModel(Product.name) private readonly model: Model<ProductDocument>,
  ) {}

  /** Append an uploaded asset to a product's gallery. */
  async attach(dto: AttachMediaDto): Promise<ProductDto> {
    const doc = await this.model.findById(dto.productId).exec();
    if (!doc) throw new NotFoundException('Produit introuvable.');

    // Re-uploading the same asset should not double it up.
    const existing = doc.images.findIndex((img) => img.publicId === dto.publicId);
    if (existing >= 0) doc.images.splice(existing, 1);

    const wantsPrimary = dto.isPrimary ?? doc.images.length === 0;
    if (wantsPrimary) doc.images.forEach((img) => (img.isPrimary = false));

    doc.images.push({
      url: dto.url,
      publicId: dto.publicId,
      alt: dto.alt,
      isPrimary: wantsPrimary,
      order: dto.order ?? doc.images.length,
    });

    // A gallery with no primary renders no card thumbnail anywhere on the storefront.
    if (!doc.images.some((img) => img.isPrimary)) doc.images[0]!.isPrimary = true;
    doc.images.sort((a, b) => a.order - b.order);

    await doc.save();
    return ProductsService.toDto(doc);
  }

  /**
   * Remove every reference to a public id before the asset itself is destroyed, so no
   * product is left pointing at a URL that 404s.
   */
  async detachEverywhere(publicId: string): Promise<void> {
    const docs = await this.model.find({ 'images.publicId': publicId }).exec();
    for (const doc of docs) {
      const wasPrimary = doc.images.some((i) => i.publicId === publicId && i.isPrimary);
      doc.images = doc.images.filter((i) => i.publicId !== publicId);
      if (wasPrimary && doc.images.length) doc.images[0]!.isPrimary = true;
      await doc.save();
    }
  }
}
