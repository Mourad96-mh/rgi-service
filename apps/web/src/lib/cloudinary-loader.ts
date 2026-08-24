/**
 * Image loader for the static (Hostinger) build.
 *
 * `next/image`'s optimiser is a server feature, so a static export cannot use it. That
 * would normally mean shipping full-size originals — fatal on mobile data, which is how
 * most Moroccan shoppers arrive. Every catalogue image already lives on Cloudinary, so we
 * hand the resizing to Cloudinary's own CDN instead: it is the same job, done one hop
 * earlier, and it still serves WebP/AVIF by content negotiation (`f_auto`).
 *
 * Anything not on Cloudinary (the logo, the OG card, local placeholders) is returned
 * untouched — those are already small and hand-optimised.
 */
const CLOUDINARY_UPLOAD = '/image/upload/';

export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src.includes('res.cloudinary.com') || !src.includes(CLOUDINARY_UPLOAD)) return src;

  // Insert the transformation between `/upload/` and the version/public id, which is where
  // Cloudinary expects it: …/upload/f_auto,q_auto,w_640/v1712/rgi-service/products/x.jpg
  const [base, rest] = src.split(CLOUDINARY_UPLOAD);
  // `q_auto:good` is Cloudinary's adaptive quality; a numeric quality from next/image
  // maps to `q_<n>`. `q_auto:75` is not valid syntax and Cloudinary rejects the URL.
  const q = typeof quality === 'number' ? `q_${quality}` : 'q_auto:good';
  const transform = `f_auto,${q},c_limit,w_${width}`;
  return `${base}${CLOUDINARY_UPLOAD}${transform}/${rest}`;
}
