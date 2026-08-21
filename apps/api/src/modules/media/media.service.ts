import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  /** Where the browser POSTs the file. */
  uploadUrl: string;
}

/**
 * Signed direct-to-Cloudinary uploads (API_SPEC.md §Media).
 *
 * The browser never sees the API secret: it asks for a signature, then POSTs the file
 * straight to Cloudinary. That keeps large uploads off our own server entirely.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly config: ConfigService) {}

  private get creds() {
    return {
      cloudName: this.config.get<string>('cloudinary.cloudName') ?? '',
      apiKey: this.config.get<string>('cloudinary.apiKey') ?? '',
      apiSecret: this.config.get<string>('cloudinary.apiSecret') ?? '',
      folder: this.config.get<string>('cloudinary.folder') ?? 'rgi-service/products',
    };
  }

  /**
   * Configured means all three secrets are present. Like CMI, a missing configuration is
   * refused in French rather than half-working: a broken signature would fail inside
   * Cloudinary's response with nothing useful for staff to act on.
   */
  isConfigured(): boolean {
    const { cloudName, apiKey, apiSecret } = this.creds;
    return Boolean(cloudName && apiKey && apiSecret);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "L'envoi d'images n'est pas configuré : les identifiants Cloudinary sont absents.",
      );
    }
  }

  /**
   * Sign an upload. Cloudinary hashes the parameters the browser will send (minus the
   * file, the api_key and the resource type), so **whatever is signed here the client must
   * send back byte for byte** — any extra or missing field makes the upload 401.
   */
  sign(): UploadSignature {
    this.assertConfigured();
    const { cloudName, apiKey, apiSecret, folder } = this.creds;
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      apiSecret,
    );

    return {
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    };
  }

  /**
   * Guard against touching anything outside this project's folder.
   *
   * This Cloudinary account is shared with another project, so an id like
   * `boutique/products/xyz` must never reach `destroy()` — one bad request would delete a
   * different client's image. Staff can only ever remove what Rgi Service uploaded.
   */
  private assertOwned(publicId: string): void {
    const { folder } = this.creds;
    if (!publicId || !publicId.startsWith(`${folder}/`)) {
      throw new ForbiddenException(
        "Cette image n'appartient pas à Rgi Service et ne peut pas être supprimée.",
      );
    }
  }

  /** Permanently delete an asset. Idempotent: an already-gone id is not an error. */
  async destroy(publicId: string): Promise<{ deleted: boolean }> {
    this.assertConfigured();
    this.assertOwned(publicId);

    const { cloudName, apiKey, apiSecret } = this.creds;
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    try {
      const result = (await cloudinary.uploader.destroy(publicId, {
        invalidate: true,
      })) as { result?: string };

      // 'not found' means the asset is already gone — the caller's goal is met.
      if (result.result === 'ok' || result.result === 'not found') {
        return { deleted: true };
      }
      throw new BadRequestException(`Suppression refusée par Cloudinary : ${result.result}`);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Cloudinary destroy failed for ${publicId}`, error as Error);
      throw new ServiceUnavailableException(
        "Impossible de supprimer l'image pour le moment.",
      );
    }
  }
}
