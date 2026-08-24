import { Suspense } from 'react';
import type { Metadata } from 'next';
import { t } from '@/locales/fr';
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
          <h1 className="t-h1 font-display font-bold">{t.configurator.sharedTitle}</h1>
          <div className="surface-card mt-6 h-40 animate-pulse" />
        </div>
      }
    >
      <SharedBuild />
    </Suspense>
  );
}
