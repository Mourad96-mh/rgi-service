import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaAttachService } from './media-attach.service';

/**
 * Signed direct-to-Cloudinary uploads. `ProductsModule` is imported for its exported
 * Mongoose models and `ProductsService.toDto`, so a product's shape is mapped in exactly
 * one place.
 */
@Module({
  imports: [ProductsModule],
  controllers: [MediaController],
  providers: [MediaService, MediaAttachService],
  exports: [MediaService],
})
export class MediaModule {}
