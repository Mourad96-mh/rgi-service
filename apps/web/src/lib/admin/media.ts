import { adminFetch } from './session';

/**
 * What the API signs, and what Cloudinary then demands back verbatim.
 *
 * Declared once: `ImageUploader` and `HeroSlideImageField` each carried their own copy of
 * this shape, which is how they came to disagree about whether `cloudName` was part of it.
 */
export interface UploadSignature {
  cloudName: string;
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/**
 * Cloudinary talks to two parties and neither of them is a Next server any more.
 *
 * The uploader used to go through `/api/admin/media/sign` and `/api/admin/media/delete`,
 * two route handlers that existed for exactly one reason: the staff JWT sat in an httpOnly
 * cookie that client JavaScript could not read, so the browser could not call the API
 * itself. Now it can, and the NestJS `media` controller already exposed both endpoints
 * behind `@Roles('staff')` — the handlers were forwarding to these very routes.
 *
 * The Cloudinary API secret never moved: it is on the API and only ever was.
 */
export function signUpload(): Promise<UploadSignature> {
  // One signature per file: each carries its own timestamp, and Cloudinary rejects a
  // signature reused after its window closes.
  return adminFetch<UploadSignature>('/media/sign', { method: 'POST' });
}

/**
 * Destroy an asset.
 *
 * The public id contains slashes (`rgi-service/products/xyz`) and the API's route is a
 * wildcard, so it is interpolated raw rather than URL-encoded — encoding the separators
 * would stop the wildcard matching. The API still enforces that the id sits inside this
 * project's folder, so a hand-edited request cannot reach another project's media.
 */
export function deleteAsset(publicId: string): Promise<void> {
  return adminFetch<void>(`/media/${publicId}`, { method: 'DELETE' });
}
