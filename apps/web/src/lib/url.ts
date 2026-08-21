import { SITE_URL } from './env';

/**
 * Structured data and Open Graph need absolute URLs. Product images are site-relative
 * while they are served from `public/products`, and absolute once they come from
 * Cloudinary — this handles both without the callers caring which.
 */
export function absoluteUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${SITE_URL}${path}`;
}
