import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/env';

/** Crawl the shop, keep the private areas out (SEO_STRATEGY.md §1). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/panier', '/commande', '/compte', '/api'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
