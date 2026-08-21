import { randomBytes } from 'node:crypto';

/** URL-safe slug from a French product/category name ("Boîtier ATX" → "boitier-atx"). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/**
 * Slug for a nested category path: `Composants/Cartes graphiques` stays
 * `composants/cartes-graphiques` (SEO_STRATEGY.md §1 — URLs mirror the category tree).
 */
export function slugifyPath(input: string): string {
  return input
    .split('/')
    .map((segment) => slugify(segment))
    .filter(Boolean)
    .join('/');
}

/** Short, url-friendly, unguessable id — used for shareable build links. */
export function shortId(length = 10): string {
  const alphabet = '23456789abcdefghijkmnpqrstuvwxyz';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}
