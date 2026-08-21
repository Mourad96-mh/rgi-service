import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import type { Product as ProductDto } from '@rgi/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaService, type UploadSignature } from './media.service';
import { AttachMediaDto } from './dto/media.dto';
import { MediaAttachService } from './media-attach.service';

/**
 * Media endpoints (API_SPEC.md §Media). Staff-only — the global JwtAuthGuard plus the
 * RolesGuard enforce it, so an anonymous visitor can never obtain an upload signature.
 */
@Controller('media')
@Roles('staff')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly attachments: MediaAttachService,
  ) {}

  /**
   * Whether uploading is available at all, so the dashboard can explain itself instead of
   * showing a file picker that will always fail.
   */
  @Get('status')
  status(): { configured: boolean } {
    return { configured: this.media.isConfigured() };
  }

  /** A short-lived signature the browser uses to POST the file straight to Cloudinary. */
  @Post('sign')
  sign(): UploadSignature {
    return this.media.sign();
  }

  /** Record an uploaded asset against a product. */
  @Post('attach')
  attach(@Body() dto: AttachMediaDto): Promise<ProductDto> {
    return this.attachments.attach(dto);
  }

  /**
   * Delete an asset from Cloudinary and drop it from any product that referenced it.
   *
   * A Cloudinary public id contains slashes (`rgi-service/products/abc`), which a single
   * `:publicId` segment cannot match — hence the wildcard, the same fix the nested
   * category slugs needed.
   */
  @Delete('*')
  async remove(@Param('0') publicId: string): Promise<{ deleted: boolean }> {
    await this.attachments.detachEverywhere(publicId);
    return this.media.destroy(publicId);
  }
}
