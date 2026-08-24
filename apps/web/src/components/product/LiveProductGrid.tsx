'use client';

import { useEffect, useState } from 'react';
import type { ProductListResponse, ProductSummary } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';

/**
 * A product grid that starts from the build-time snapshot and then refreshes itself.
 *
 * The home page is prerendered, so its "nouveautés" row is frozen at whatever the
 * catalogue held when the site was last exported — which on shared hosting can be weeks.
 * That is the row most likely to be wrong, since it is by definition about what is new.
 *
 * `initial` is what the server rendered and what ships in the HTML, so crawlers and
 * visitors without JavaScript still get a full grid. Once JavaScript runs, the same query
 * is re-asked of the API and the grid is replaced in place. A failed request changes
 * nothing: the snapshot stays.
 */
export function LiveProductGrid({
  query,
  initial,
  limit,
}: {
  /** Query string for `/products?…`, without the leading `?`. */
  query: string;
  initial: ProductSummary[];
  limit?: number;
}) {
  const [products, setProducts] = useState(initial);

  useEffect(() => {
    let cancelled = false;

    apiFetchOrNull<ProductListResponse>(`/products?${query}`, { revalidate: 0 }).then((next) => {
      if (cancelled || !next) return;
      setProducts(next.data);
    });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const shown = limit ? products.slice(0, limit) : products;

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-[18px] md:grid-cols-3 lg:grid-cols-4">
      {shown.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
