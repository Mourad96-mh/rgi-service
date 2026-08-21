import type { Metadata } from 'next';
import type { ProductSummary } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/Section';

export const metadata: Metadata = {
  title: 'Recherche',
  // Search result pages are useful to users, not to Google (SEO_STRATEGY.md §1).
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const term = (searchParams.q ?? '').trim();
  const results = term
    ? ((await apiFetchOrNull<ProductSummary[]>(
        `/products/search?q=${encodeURIComponent(term)}&limit=20`,
        { revalidate: 0 },
      )) ?? [])
    : [];

  return (
    <div className="wrap py-10">
      <h1 className="font-display text-[clamp(24px,4vw,32px)] font-bold">
        {term ? `Résultats pour « ${term} »` : 'Recherche'}
      </h1>
      <p className="mt-2 text-muted">{t.category.results(results.length)}</p>

      <div className="mt-8">
        {results.length ? (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState title={term ? t.category.empty : t.common.search} />
        )}
      </div>
    </div>
  );
}
