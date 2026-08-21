/**
 * Second pass over `apps/web/public/products`: strip the uniform white border every pack
 * shot carries, so the product fills its tile instead of floating in a square of padding.
 *
 *   node scripts/trim-product-images.mjs
 *
 * Images keep their natural aspect ratio — the storefront tiles are `object-contain`, so a
 * wide graphics card can span the tile while a tall tower stays tall. Idempotent: a second
 * run finds nothing left to trim.
 */
import { readdirSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const DIR = resolve('apps/web/public/products');
const MAX = 1200;

/**
 * While `next dev` is running it keeps handles on files under `public/`, and Windows then
 * refuses `rename()` onto them (EPERM). The new bytes are left next to the original as
 * `<name>.webp.tmp` and the run reports how many are waiting; finish them with
 *   for f in apps/web/public/products/*.tmp; do mv -f "$f" "${f%.tmp}"; done
 * (POSIX unlink semantics go through the lock), or just re-run once the dev server is off.
 */
function swap(tmp, file) {
  try {
    renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

let changed = 0;
let skipped = 0;

for (const name of readdirSync(DIR).filter((f) => f.endsWith('.webp'))) {
  const file = resolve(DIR, name);
  const before = await sharp(file).metadata();
  try {
    const buffer = await sharp(file)
      .trim({ threshold: 12 })
      .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    const after = await sharp(buffer).metadata();
    // A trim that eats almost everything means the shot had no uniform border to remove.
    if (after.width < 80 || after.height < 80) continue;
    if (after.width === before.width && after.height === before.height) continue;

    const tmp = `${file}.tmp`;
    writeFileSync(tmp, buffer);
    if (swap(tmp, file)) changed += 1;
    else skipped += 1;
  } catch {
    skipped += 1;
  }
}

console.log(`${changed} image(s) trimmed, ${skipped} left untouched`);
if (skipped) {
  console.log(
    'Locked files were written as *.tmp next to the original — see the note on swap().',
  );
}
