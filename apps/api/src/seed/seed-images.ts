import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Product photography for the seed catalog.
 *
 * `scripts/fetch-product-images.mjs` sources one to three real photos per SKU, normalises
 * them onto a white square and writes them to `apps/web/public/products` plus the manifest
 * this module reads. The stored URL is therefore site-relative (`/products/<sku>-1.webp`)
 * — when the client's Cloudinary account exists, the same field takes the absolute
 * Cloudinary URL and nothing else in the app changes.
 *
 * ⚠ These are manufacturer press shots standing in for the client's own photography.
 * Replace them with the shop's / supplier's images before launch.
 */
interface ManifestEntry {
  file: string;
  source: string;
}

type Manifest = Record<string, ManifestEntry[]>;

const MANIFEST_PATH = resolve(__dirname, '../../../../scripts/product-images.json');

let manifest: Manifest = {};
try {
  manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
} catch {
  console.warn(
    `⚠ aucun manifeste d'images (${MANIFEST_PATH}) — les produits seront créés sans photo.`,
  );
}

export function imagesForSku(sku: string, nameFr: string) {
  const entries = manifest[sku] ?? [];
  return entries.map((entry, index) => ({
    url: entry.file,
    alt: index === 0 ? nameFr : `${nameFr} — vue ${index + 1}`,
    isPrimary: index === 0,
    order: index,
    // Cloudinary's publicId once it exists; until then the local file identifies the asset.
    publicId: entry.file.replace('/products/', 'local/').replace('.webp', ''),
  }));
}
