import type { Product } from '@rgi/types';
import { toMad } from '@rgi/types';
import { SITE_NAME, SITE_URL } from '@/lib/env';
import { routes } from '@/lib/routes';
import { primaryImage } from '@/lib/format';
import { absoluteUrl } from '@/lib/url';

/**
 * `Product` + `Offer` rich result (SEO_STRATEGY.md §1). Schema.org wants a decimal price
 * in the currency's own units, so this is the one place centimes are converted to MAD —
 * for output only, never for arithmetic (CLAUDE.md §6).
 */
export function ProductJsonLd({ product }: { product: Product }) {
  const url = `${SITE_URL}${routes.product(product.slug)}`;
  const image = primaryImage(product);

  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name.fr,
    description: product.description.fr,
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brand },
    image: image ? [absoluteUrl(image.url)] : undefined,
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'MAD',
      price: toMad(product.effectivePrice).toFixed(2),
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
    aggregateRating:
      product.ratingAvg && product.ratingCount
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAvg,
            reviewCount: product.ratingCount,
          }
        : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
