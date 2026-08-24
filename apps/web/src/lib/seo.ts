import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/env';

/**
 * Google truncates a result title at roughly 60 characters. Past that the tail — which is
 * where the brand suffix lives — is replaced by an ellipsis, so the page spends characters
 * on text nobody reads.
 */
export const TITLE_MAX = 60;

/** What `title.template` in the root layout appends to every page title. */
const BRAND_SUFFIX = ` | ${SITE_NAME}`;

/**
 * Compose a title that survives the SERP.
 *
 * Three steps down, in order of what we would rather keep:
 *   1. base + qualifier + brand, if it all fits;
 *   2. base + brand, dropping the qualifier ("Prix Maroc", "prix et stock");
 *   3. `absolute: base` — the bare name with no brand suffix at all.
 *
 * Step 3 matters for a catalogue: names like "Kit mémoire Corsair Vengeance RGB 32 Go
 * (2×16) DDR5 6000 MHz" are 60 characters on their own. The product name *is* the search
 * term, so it is never truncated — the boilerplate around it goes instead.
 */
export interface SeoTitle {
  /** For `metadata.title` — may be `{ absolute }` to bypass the brand template. */
  meta: NonNullable<Metadata['title']>;
  /** The same title as plain text, for `og:title`, which has no template to apply. */
  text: string;
}

export function seoTitle(base: string, qualifier?: string): SeoTitle {
  const withQualifier = qualifier ? `${base} | ${qualifier}` : base;
  if (withQualifier.length + BRAND_SUFFIX.length <= TITLE_MAX) {
    return { meta: withQualifier, text: withQualifier + BRAND_SUFFIX };
  }
  if (base.length + BRAND_SUFFIX.length <= TITLE_MAX) {
    return { meta: base, text: base + BRAND_SUFFIX };
  }
  return { meta: { absolute: base }, text: base };
}

/**
 * A product's title, with the brand dropped when the name already contains it.
 *
 * "Processeur AMD Ryzen 7 7800X3D – AMD" repeats itself and costs characters the name
 * needs; most manufacturer names lead with the brand, so this is the common case.
 */
export function productTitle(name: string, brand: string): SeoTitle {
  const base = name.toLowerCase().includes(brand.toLowerCase()) ? name : `${name} – ${brand}`;
  return seoTitle(base, 'Prix Maroc');
}

/**
 * Google truncates a result snippet at roughly 160 characters, and the tail of ours is the
 * cash-on-delivery promise — the single strongest trust signal in Moroccan e-commerce.
 */
export const DESC_MAX = 160;

/**
 * A product's meta description, budgeted the way {@link seoTitle} budgets a title.
 *
 * The name and the price are the part a shopper scans for, so they are never cut. What
 * gives way is the boilerplate after them, in three steps: the full sales pitch, then a
 * terser one that still names both delivery and COD, then nothing at all. Long catalogue
 * names — "Kit mémoire Corsair Vengeance RGB 32 Go (2×16) DDR5 6000 MHz" — are what push
 * the first form past the limit.
 */
export function productDescription(name: string, priceLabel: string, inStock: boolean): string {
  const head = `${name} au prix de ${priceLabel} chez ${SITE_NAME}. ${
    inStock ? 'En stock' : 'Sur commande'
  }`;
  const tails = [
    ', livraison 48h au Maroc, paiement à la livraison possible.',
    ', livraison 48h, paiement à la livraison.',
    '.',
  ];
  return head + (tails.find((t) => head.length + t.length <= DESC_MAX) ?? '.');
}

/** The share card used wherever a page has no image of its own. */
export const OG_IMAGE = {
  url: `${SITE_URL}/og-default.png`,
  width: 1200,
  height: 630,
  alt: SITE_NAME,
};

/**
 * Build an `openGraph` block.
 *
 * Next.js **replaces** the parent's `openGraph` rather than deep-merging it, so a page that
 * sets only `title` and `url` silently drops the root layout's `images`, `locale` and
 * `siteName`. That is how 16 category pages ended up sharing blank on WhatsApp — the main
 * sharing channel in Morocco — and how `og:locale` survived on only 2 pages of 61. Going
 * through this helper makes the defaults impossible to lose.
 */
export function openGraph(partial: NonNullable<Metadata['openGraph']>): Metadata['openGraph'] {
  return {
    type: 'website',
    locale: 'fr_MA',
    siteName: SITE_NAME,
    images: [OG_IMAGE],
    ...partial,
  };
}
