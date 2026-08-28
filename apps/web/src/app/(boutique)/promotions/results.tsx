'use client';

import { useEffect, useState } from 'react';
import type { ProductListResponse, ProductSummary } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { PROMO_PAGE_QUERY } from '@/lib/promo';
import { EmptyState } from '@/components/ui/Section';
import { ProductCard } from '@/components/product/ProductCard';

/**
 * The grid under the promotions heading.
 *
 * Same contract as `PromoSection` on the home page: start from what the server baked in,
 * then re-ask the API once in the browser. A failed request keeps the snapshot; an empty
 * response is a real answer and replaces it, because a sale that has ended must stop being
 * advertised even though the HTML on Hostinger has not changed.
 *
 * Unlike the home page section this one never hides itself — the visitor asked for this
 * page by name, so "no promotion right now" is the answer they came for, and an empty
 * screen would read as a broken page.
 */
export function PromoResults({ initial }: { initial: ProductSummary[] }) {
  const [products, setProducts] = useState(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetchOrNull<ProductListResponse>(`/products?${PROMO_PAGE_QUERY}`, { revalidate: 0 }).then(
      (next) => {
        if (cancelled) return;
        if (next) setProducts(next.data);
        setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (products.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState title={loaded ? t.promo.emptyTitle : t.common.loading} />
      </div>
    );
  }

  return (
    <>
      <p className="mt-6 text-[13px] text-faint">
        {products.length} {products.length > 1 ? t.promo.countPlural : t.promo.countSingular}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-[18px] md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
