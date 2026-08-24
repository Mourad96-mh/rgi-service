/** Static export QA: link integrity, assets, metadata, JSON-LD. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const OUT = process.argv[2] ?? 'apps/web/out';
let pass = 0, fail = 0, warn = 0;
const problems = [];

function t(name, fn) {
  try { const n = fn(); pass++; console.log('  PASS  ' + name + (n ? '  -- ' + n : '')); }
  catch (e) { fail++; problems.push(name + ': ' + e.message); console.log('  FAIL  ' + name + '\n        ' + String(e.message).slice(0, 500)); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else files.push(p);
  }
})(OUT);

const rel = (p) => p.slice(OUT.length).replace(/\\/g, '/').replace(/^\//, '');
const html = files.filter((f) => f.endsWith('.html'));
const set = new Set(files.map(rel));

console.log('== Static export: ' + files.length + ' files, ' + html.length + ' HTML pages\n');

// ---- link integrity -------------------------------------------------------
t('every internal link resolves to a real file', () => {
  const broken = [];
  for (const f of html) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/href="(\/[^"#?]*)/g)) {
      let href = m[1];
      if (href.startsWith('/_next/')) continue;
      const clean = href.replace(/\/$/, '');
      const candidates = [clean.slice(1), clean.slice(1) + '/index.html', clean.slice(1) + '.html', 'index.html'];
      if (!candidates.some((c) => set.has(c))) broken.push(rel(f) + ' -> ' + href);
    }
  }
  assert(broken.length === 0, broken.length + ' broken link(s):\n        ' + [...new Set(broken)].slice(0, 12).join('\n        '));
  return 'no dead links';
});

t('every referenced image exists', () => {
  const missing = [];
  for (const f of html) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:src|content)="(\/(?!_next)[^"]*\.(?:webp|png|jpg|jpeg|svg|ico))"/g)) {
      if (!set.has(m[1].slice(1))) missing.push(rel(f) + ' -> ' + m[1]);
    }
  }
  assert(missing.length === 0, missing.length + ' missing image(s):\n        ' + [...new Set(missing)].slice(0, 10).join('\n        '));
  return 'all present';
});

// ---- metadata -------------------------------------------------------------
t('every page has exactly one h1', () => {
  const bad = [];
  for (const f of html) {
    if (rel(f) === '404.html') continue;
    const n = (fs.readFileSync(f, 'utf8').match(/<h1[\s>]/g) ?? []).length;
    if (n !== 1) bad.push(rel(f) + ' has ' + n);
  }
  assert(bad.length === 0, bad.slice(0, 10).join(', '));
});

t('every page has a title and a description', () => {
  const bad = [];
  for (const f of html) {
    const s = fs.readFileSync(f, 'utf8');
    if (!/<title>[^<]+<\/title>/.test(s)) bad.push(rel(f) + ' no title');
    else if (!/name="description" content="[^"]+"/.test(s)) bad.push(rel(f) + ' no description');
  }
  assert(bad.length === 0, bad.slice(0, 10).join(', '));
});

t('titles fit the SERP (<=60 chars)', () => {
  const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const over = [];
  for (const f of html) {
    const m = fs.readFileSync(f, 'utf8').match(/<title>([^<]*)<\/title>/);
    if (m && decode(m[1]).length > 60) over.push(rel(f) + ' (' + decode(m[1]).length + ')');
  }
  assert(over.length === 0, over.slice(0, 8).join(', '));
});

t('descriptions fit the SERP (<=160 chars)', () => {
  const over = [];
  for (const f of html) {
    const m = fs.readFileSync(f, 'utf8').match(/name="description" content="([^"]*)"/);
    if (m && m[1].length > 160) over.push(rel(f) + ' (' + m[1].length + ')');
  }
  assert(over.length === 0, over.length + ' over: ' + over.slice(0, 8).join(', '));
});

t('canonicals all point at rgiservice.ma', () => {
  const bad = [];
  for (const f of html) {
    const m = fs.readFileSync(f, 'utf8').match(/rel="canonical" href="([^"]*)"/);
    if (!m) { if (rel(f) !== '404.html') bad.push(rel(f) + ' none'); }
    else if (!m[1].startsWith('https://rgiservice.ma')) bad.push(rel(f) + ' -> ' + m[1]);
  }
  assert(bad.length === 0, bad.slice(0, 8).join(', '));
});

t('no duplicate titles across pages', () => {
  const seen = new Map();
  for (const f of html) {
    const m = fs.readFileSync(f, 'utf8').match(/<title>([^<]*)<\/title>/);
    if (!m) continue;
    seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
  }
  // Next emits the 404 as both 404.html and 404/index.html. Same page, never indexed.
  const dupes = [...seen].filter(([tt, n]) => n > 1 && !/introuvable|not be found/i.test(tt));
  assert(dupes.length === 0, dupes.map(([tt, n]) => tt.slice(0, 40) + ' x' + n).join(', '));
  return seen.size + ' distinct titles';
});

// ---- JSON-LD --------------------------------------------------------------
t('all JSON-LD parses', () => {
  const bad = [];
  let blocks = 0;
  for (const f of html) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
      blocks++;
      try { JSON.parse(m[1]); } catch (e) { bad.push(rel(f)); }
    }
  }
  assert(bad.length === 0, 'unparseable in ' + bad.slice(0, 5).join(', '));
  return blocks + ' blocks';
});

t('product pages carry a rich-result-eligible Product schema', () => {
  const products = html.filter((f) => rel(f).startsWith('produit/'));
  assert(products.length > 0, 'no product pages');
  const bad = [];
  for (const f of products) {
    const s = fs.readFileSync(f, 'utf8');
    const nodes = [...s.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)]
      .flatMap((m) => { try { const j = JSON.parse(m[1]); return j['@graph'] ?? [j]; } catch { return []; } });
    const p = nodes.find((n) => n['@type'] === 'Product');
    if (!p) { bad.push(rel(f) + ' no Product'); continue; }
    const offer = p.offers;
    if (!offer) bad.push(rel(f) + ' no offers');
    else if (offer.priceCurrency !== 'MAD') bad.push(rel(f) + ' currency=' + offer.priceCurrency);
    else if (offer.price === undefined) bad.push(rel(f) + ' no price');
    else if (!offer.availability) bad.push(rel(f) + ' no availability');
  }
  assert(bad.length === 0, bad.slice(0, 6).join(', '));
  return products.length + ' product pages OK';
});

// ---- sitemap / robots -----------------------------------------------------
t('sitemap lists only rgiservice.ma URLs and no noindex pages', () => {
  const xml = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert(locs.length > 0, 'empty sitemap');
  const foreign = locs.filter((u) => !u.startsWith('https://rgiservice.ma'));
  assert(foreign.length === 0, 'foreign URLs: ' + foreign.slice(0, 3).join(', '));
  const shouldNotBeThere = locs.filter((u) => /\/(panier|commande|compte|recherche|admin)/.test(u));
  assert(shouldNotBeThere.length === 0, 'private pages in sitemap: ' + shouldNotBeThere.join(', '));
  return locs.length + ' URLs';
});

t('every sitemap URL exists as a file', () => {
  const xml = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const missing = locs.filter((u) => {
    const p = u.replace('https://rgiservice.ma', '').replace(/\/$/, '');
    return !(set.has((p.slice(1) || 'index') + '/index.html') || set.has(p.slice(1) + '.html') || (p === '' && set.has('index.html')));
  });
  assert(missing.length === 0, missing.length + ' sitemap URLs with no file: ' + missing.slice(0, 5).join(', '));
});

t('robots.txt blocks private areas and names the sitemap', () => {
  const r = fs.readFileSync(path.join(OUT, 'robots.txt'), 'utf8');
  for (const p of ['/admin', '/panier', '/commande', '/compte']) assert(r.includes('Disallow: ' + p), 'missing Disallow ' + p);
  assert(r.includes('Sitemap: https://rgiservice.ma/sitemap.xml'), 'sitemap line wrong');
});

t('noindex pages are actually marked noindex', () => {
  const bad = [];
  for (const p of ['recherche/index.html', 'commande/confirmation/index.html', 'configurateur-pc/partage/index.html']) {
    if (!set.has(p)) { bad.push(p + ' MISSING'); continue; }
    const s = fs.readFileSync(path.join(OUT, p), 'utf8');
    if (!/name="robots"[^>]*content="[^"]*noindex/.test(s)) bad.push(p + ' not noindex');
  }
  assert(bad.length === 0, bad.join(', '));
});

// ---- config ---------------------------------------------------------------
t('the API URL is baked in and no dev URL leaked', () => {
  let apiHits = 0, devHits = 0;
  for (const f of files.filter((x) => x.endsWith('.js') || x.endsWith('.html'))) {
    const s = fs.readFileSync(f, 'utf8');
    if (s.includes('rgi-service-api.onrender.com')) apiHits++;
    if (s.includes('localhost:4000') || s.includes('127.0.0.1:4000')) devHits++;
  }
  assert(apiHits > 0, 'the API URL is not in the bundle - the shop cannot call it');
  assert(devHits === 0, devHits + ' file(s) still reference localhost');
  return apiHits + ' chunks carry the API URL, 0 dev leaks';
});

t('.htaccess is present with the rules that matter', () => {
  const p = path.join(OUT, '.htaccess');
  assert(fs.existsSync(p), '.htaccess MISSING - it is a dotfile and easily lost in an upload');
  const s = fs.readFileSync(p, 'utf8');
  for (const [needle, why] of [['RewriteEngine On', 'rewrites'], ['HTTPS', 'https redirect'], ['ErrorDocument 404', 'custom 404'], ['DEFLATE', 'compression']]) {
    assert(s.includes(needle), 'missing ' + why);
  }
});

t('page weight is reasonable on the money pages', () => {
  // Measure what is actually sent: .htaccess turns on DEFLATE, so raw bytes on disk are
  // not what a shopper downloads. Judging the raw size flags healthy pages as bloated.
  const zlib = require('node:zlib');
  const gz = (p) => Math.round(zlib.gzipSync(fs.readFileSync(path.join(OUT, p))).length / 1024);
  const big = [];
  for (const p of ['index.html', 'composants/cartes-graphiques/index.html']) {
    if (gz(p) > 60) big.push(p + ' ' + gz(p) + 'kB gzipped');
  }
  assert(big.length === 0, big.join(', '));
  return 'home ' + gz('index.html') + 'kB gzipped, category ' + gz('composants/cartes-graphiques/index.html') + 'kB';
});

console.log('\npassed: ' + pass + '   failed: ' + fail);
if (problems.length) console.log('\n' + problems.join('\n'));
