import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SearchResults } from './results';

export const metadata: Metadata = {
  title: 'Recherche',
  // Search result pages are useful to users, not to Google (SEO_STRATEGY.md §1).
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <div className="wrap py-8 sm:py-10">
      <Suspense fallback={<h1 className="t-h1 font-display font-bold">Recherche</h1>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
