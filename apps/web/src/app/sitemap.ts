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
    apiFetchOrNull<ProductListResponse>('/products?limit=100&sort=newest', {
      revalidate: 3600,
    }),
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
    ...flat.map((category) => ({
      url: `${SITE_URL}${routes.category(category.slug)}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...(products?.data ?? []).map((product) => ({
      url: `${SITE_URL}${routes.product(product.slug)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
