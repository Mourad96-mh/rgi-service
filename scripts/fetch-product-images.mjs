/**
 * Sources one or more real product photos per SKU and normalises them for the storefront.
 *
 *   node scripts/fetch-product-images.mjs [--force] [--only=SKU,SKU] [--max=3]
 *
 * Queries are in `scripts/product-image-queries.json` (sku -> english search query) so a
 * bad match is fixed by editing one line and re-running with --only=<sku> --force. When
 * image search is too polluted to find the right model (several vendors sell the same
 * chip), the value can be an array of explicit image URLs instead of a query string.
 * Output: apps/web/public/products/<sku>-<n>.webp + scripts/product-images.json (the
 * manifest the seed reads). Every image is flattened onto white at a fixed square canvas,
 * so the storefront can show them all on the same light photo tile.
 *
 * These are manufacturer press shots used as placeholders while the client's own /
 * supplier photography is not available. Swap them before launch.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'apps/web/public/products');
const MANIFEST = resolve(ROOT, 'scripts/product-images.json');
const TMP = resolve(ROOT, 'scripts/.image-tmp');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const CANVAS = 1100;
/** How many search hits to download and score before picking. */
const POOL = 14;
/** Border-whiteness above which an image counts as a clean pack shot. */
const CLEAN = 0.9;
const INNER = 1000;

/** Manufacturer and known-clean retail CDNs first; junk sources last. */
const DOMAIN_SCORE = [
  [/(^|\.)(msi|asus|asrock|gigabyte|lian-li|lianli|nzxt|coolermaster|corsair|bequiet|arctic|thermalright|kingston|crucial|samsung|logitech|logitechg|razer|hyperx|lg|lenovo|amd|intel|nvidia|sapphiretech|playstation|xbox|gskill)\.com/i, 100],
  [/storage-asset\.msi\.com|dlcdnwebimgs\.asus\.com|asset\.msi\.com|cdn\.mos\.cms/i, 95],
  [/(^|\.)(pcpartpicker|newegg|bhphotovideo|scan\.co\.uk|ldlc|materiel)\./i, 60],
  [/media-amazon\.com/i, 55],
  [/(pinterest|ebay|aliexpress|alicdn|olx|facebook|twimg|reddit)\./i, -100],
];

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const maxPer = Number((args.find((a) => a.startsWith('--max=')) || '--max=3').slice(6));

const queries = JSON.parse(readFileSync(resolve(ROOT, 'scripts/product-image-queries.json'), 'utf8'));
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(TMP, { recursive: true });

function curl(url, out, referer) {
  execFileSync('curl', [
    // -f so a 403 hotlink block fails loudly instead of saving an HTML error page
    '-sSLf', '--max-time', '30', '--max-filesize', '25000000',
    '-A', UA, ...(referer ? ['-H', `Referer: ${referer}`] : []),
    '-o', out, url,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
}

function searchImages(query) {
  const html = resolve(TMP, 'ddg.html');
  const json = resolve(TMP, 'ddg.json');
  curl(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, html);
  const vqd = (readFileSync(html, 'utf8').match(/vqd=(4-[0-9]+)/) || [])[1];
  if (!vqd) throw new Error('no vqd token');
  curl(
    `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`,
    json,
    'https://duckduckgo.com/',
  );
  return JSON.parse(readFileSync(json, 'utf8')).results ?? [];
}

function score(url) {
  for (const [re, points] of DOMAIN_SCORE) if (re.test(url)) return points;
  return 0;
}

function candidates(results) {
  return results
    .filter((r) => /\.(png|jpe?g|webp)(\?|$)/i.test(r.image))
    .filter((r) => r.width >= 700 && r.height >= 500)
    .filter((r) => {
      const ratio = r.width / r.height;
      return ratio > 0.55 && ratio < 2.1;
    })
    .map((r) => ({ ...r, s: score(r.image) + Math.min(r.width, 2000) / 1000 }))
    .filter((r) => r.s > -50)
    .sort((a, b) => b.s - a.s)
    .filter((r, i, all) => all.findIndex((o) => o.image === r.image) === i);
}

/**
 * How much of the image's border ring is near-white. A catalogue pack shot scores ~1;
 * a dark marketing banner or a lifestyle photo scores near 0. This is the single best
 * predictor of "will this look right on the storefront's light photo tile", and it beats
 * the domain heuristic — manufacturer sites host as many banners as clean shots.
 */
async function borderWhiteness(file) {
  const N = 60;
  const px = await sharp(file, { failOn: 'none' })
    .resize(N, N, { fit: 'fill' })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer();
  let white = 0;
  let total = 0;
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const edge = x < 3 || y < 3 || x >= N - 3 || y >= N - 3;
      if (!edge) continue;
      const i = (y * N + x) * 3;
      total += 1;
      if (px[i] > 232 && px[i + 1] > 232 && px[i + 2] > 232) white += 1;
    }
  }
  return total ? white / total : 0;
}

/** Trim the border only when the source really is a white-background pack shot. */
async function normalise(input, output) {
  let img = sharp(input, { failOn: 'none' }).rotate();
  const px = await img.clone().resize(40, 40, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const corner = [px[0], px[1], px[2]];
  if (corner.every((c) => c > 238)) img = sharp(input, { failOn: 'none' }).rotate().trim({ threshold: 14 });
  await img
    .resize(INNER, INNER, { fit: 'inside', withoutEnlargement: false })
    .flatten({ background: '#ffffff' })
    .extend({ background: '#ffffff', top: 0, bottom: 0, left: 0, right: 0 })
    .resize(CANVAS, CANVAS, { fit: 'contain', background: '#ffffff' })
    .webp({ quality: 82, effort: 5 })
    .toFile(output);
}

const skus = only.length ? only : Object.keys(queries);
let done = 0;

for (const sku of skus) {
  const query = queries[sku];
  if (!query) { console.log(`SKIP ${sku} — no query`); continue; }
  if (!force && manifest[sku]?.length) { console.log(`have ${sku}`); continue; }

  let picks;
  if (Array.isArray(query)) {
    picks = query.map((image) => ({ image, url: undefined, width: 0, height: 0, s: 100 }));
  } else {
    try {
      picks = candidates(searchImages(query));
    } catch (error) {
      console.log(`FAIL ${sku} — search: ${error.message}`);
      continue;
    }
  }

  const scored = [];
  for (const [i, pick] of picks.slice(0, POOL).entries()) {
    const tmp = resolve(TMP, `${sku}-raw-${i}`);
    try {
      rmSync(tmp, { force: true });
      curl(pick.image, tmp, pick.url);
      const whiteness = await borderWhiteness(tmp);
      scored.push({ tmp, pick, whiteness });
    } catch {
      // dead link, hotlink protection, or an image sharp cannot decode — try the next one
    }
    if (scored.filter((c) => c.whiteness >= CLEAN).length >= maxPer) break;
  }

  scored.sort((a, b) => {
    const clean = (b.whiteness >= CLEAN ? 1 : 0) - (a.whiteness >= CLEAN ? 1 : 0);
    if (clean) return clean;
    if (Math.abs(b.whiteness - a.whiteness) > 0.05) return b.whiteness - a.whiteness;
    return b.pick.s - a.pick.s;
  });

  const kept = [];
  for (const candidate of scored) {
    if (kept.length >= maxPer) break;
    try {
      const file = `${sku}-${kept.length + 1}.webp`;
      await normalise(candidate.tmp, resolve(OUT_DIR, file));
      kept.push({
        file: `/products/${file}`,
        source: candidate.pick.image,
        white: Number(candidate.whiteness.toFixed(2)),
      });
    } catch {
      // unreadable once sharp gets to the full-size decode
    }
  }

  if (!kept.length) { console.log(`FAIL ${sku} — nothing downloadable`); continue; }
  manifest[sku] = kept;
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  done += 1;
  console.log(`ok   ${sku} — ${kept.length} image(s) — white ${kept[0].white} — ${kept[0].source.slice(0, 60)}`);
}

rmSync(TMP, { recursive: true, force: true });
console.log(`\n${done} product(s) updated · manifest: ${MANIFEST}`);
