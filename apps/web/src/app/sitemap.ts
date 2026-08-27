import type { MetadataRoute } from 'next';
import type { CategoryNode, ProductListResponse } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { SITE_URL } from '@/lib/env';
import { routes } from '@/lib/routes';

export const revalidate = 3600;

/** Categories + products + static pages, generated from the live catalog. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, products] = await Promise.all([
    apiFetchOrNull<CategoryNode[]>('/categories', { revalidate: 3600 }),
    allProducts(),
  ]);

  const flat: CategoryNode[] = [];
  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      flat.push(node);
      walk(node.children);
    }
  };
  walk(tree ?? []);

  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}${routes.configurator}`, changeFrequency: 'weekly', priority: 0.9 },
    // Listed even when no sale is running: the URL is permanent, and dropping a page in and
    // out of the sitemap as deals come and go teaches Google to distrust it.
    { url: `${SITE_URL}${routes.promotions}`, changeFrequency: 'daily', priority: 0.8 },
    ...flat.map((category) => ({
      url: `${SITE_URL}${routes.category(category.slug)}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}${routes.product(product.slug)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}

/**
 * Every active product, not the first hundred.
 *
 * The API caps `limit` at 100, so a single request silently truncated the sitemap the
 * moment the catalogue outgrew that: the pages were exported and reachable, but Google
 * was never told about any product past the hundredth newest one. `generateStaticParams`
 * on the product page already pages for exactly this reason — the sitemap has to agree
 * with it, or the two disagree about what the shop sells.
 *
 * A failed page stops the walk and returns what was gathered. A short sitemap is worth
 * having; no sitemap is not.
 */
async function allProducts(): Promise<ProductListResponse['data']> {
  const PER_PAGE = 100;
  const out: ProductListResponse['data'] = [];

  for (let page = 1; ; page++) {
    const batch = await apiFetchOrNull<ProductListResponse>(
      `/products?limit=${PER_PAGE}&page=${page}&sort=newest`,
      { revalidate: 3600 },
    );
    if (!batch || batch.data.length === 0) break;
    out.push(...batch.data);
    if (out.length >= batch.total) break;
  }

  return out;
}
