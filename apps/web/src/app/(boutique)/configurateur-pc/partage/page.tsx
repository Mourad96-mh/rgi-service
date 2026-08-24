import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SharedBuild } from './build';

/** A shared build is a private link, not a page for Google (SEO_STRATEGY.md §robots). */
export const metadata: Metadata = {
  title: 'Configuration partagée',
  robots: { index: false, follow: false },
};

export default function SharedBuildPage() {
  return (
    <Suspense
      fallback={
        <div className="wrap py-12 sm:py-16">
          <div className="surface-card h-40 animate-pulse" />
        </div>
      }
    >
      <SharedBuild />
    </Suspense>
  );
}
