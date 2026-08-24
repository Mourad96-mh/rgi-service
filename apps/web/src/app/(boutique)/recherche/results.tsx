'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ProductSummary } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/Section';

/**
 * Search runs in the browser.
 *
 * It has to: the term arrives as `?q=…` and a static host serves the same file whatever
 * the query string says. Nothing is lost by moving it — search results are `noindex`
 * anyway (SEO_STRATEGY.md §1), so there is no crawler to serve here, and going straight
 * to the API skips a round trip the server version had to make.
 */
export function SearchResults() {
  const term = (useSearchParams().get('q') ?? '').trim();
  const [results, setResults] = useState<ProductSummary[] | null>(null);

  useEffect(() => {
    if (!term) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setResults(null);
    apiFetchOrNull<ProductSummary[]>(
      `/products/search?q=${encodeURIComponent(term)}&limit=20`,
      { revalidate: 0 },
    ).then((found) => {
      if (!cancelled) setResults(found ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [term]);

  const loading = results === null;

  return (
    <>
      <h1 className="t-h1 font-display font-bold">
        {term ? `Résultats pour « ${term} »` : 'Recherche'}
      </h1>
      <p className="mt-2 text-muted">
        {loading ? t.common.loading : t.category.results(results.length)}
      </p>

      <div className="mt-8">
        {loading ? (
          // Same geometry as a result row, so the page does not jump when they arrive.
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-[18px] lg:grid-cols-4 3xl:grid-cols-5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="surface-card h-72 animate-pulse" />
            ))}
          </div>
        ) : results.length ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-[18px] lg:grid-cols-4 3xl:grid-cols-5">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState title={term ? t.category.empty : t.common.search} />
        )}
      </div>
    </>
  );
}
