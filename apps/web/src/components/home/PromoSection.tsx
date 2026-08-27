'use client';

import { useEffect, useState } from 'react';
import type { ProductListResponse, ProductSummary } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { Section } from '@/components/ui/Section';
import { ProductCard } from '@/components/product/ProductCard';

/** Same query on the server and in the browser, so the two can never drift. */
export const PROMO_QUERY = 'promo=true&limit=4&sort=price_asc';

/**
 * The "Promotions du moment" row — a section that decides for itself whether it exists.
 *
 * `LiveProductGrid` was not enough here. It refreshes the *grid* but not the heading, and a
 * promotion is the one row that legitimately empties out: the deal ends and the products
 * are simply no longer discounted. That would have left « Promotions du moment » sitting
 * above an empty space on a shop with nothing on sale.
 *
 * It also has to work the other way round. The storefront is a static export, so the HTML
 * on Hostinger is frozen until someone rebuilds — but staff create promotions in the admin
 * whenever they like. Rendering this component unconditionally (it returns `null` when
 * there is nothing) means a promotion started this morning appears on the home page as
 * soon as a visitor loads it, with no rebuild and no upload. That is the whole point of
 * the feature for the client.
 *
 * `initial` is the build-time snapshot: it ships inside the HTML, so a crawler and a
 * visitor without JavaScript still see real promotions rather than an empty page.
 */
export function PromoSection({ initial }: { initial: ProductSummary[] }) {
  const [products, setProducts] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    apiFetchOrNull<ProductListResponse>(`/products?${PROMO_QUERY}`, { revalidate: 0 }).then(
      (next) => {
        // A failed request leaves the snapshot alone; an empty one is a real answer and
        // must be honoured, otherwise an ended sale would advertise itself for ever.
        if (!cancelled && next) setProducts(next.data);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (products.length === 0) return null;

  return (
    <Section
      title={t.home.promoTitle}
      text={t.home.promoText}
      href={routes.promotions}
      linkLabel={t.home.promoCta}
    >
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-[18px] md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </Section>
  );
}
