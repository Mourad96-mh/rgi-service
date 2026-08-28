import type { Metadata } from 'next';
import type { ProductListResponse } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { SITE_URL } from '@/lib/env';
import { openGraph, seoTitle } from '@/lib/seo';
import { t } from '@/locales/fr';
import { PROMO_PAGE_QUERY } from '@/lib/promo';
import { PromoResults } from './results';

/** Prices change under this page more than under any other, so keep the window short. */
export const revalidate = 120;

const title = seoTitle('Promotions', 'PC gamer et composants en promo au Maroc');

export const metadata: Metadata = {
  title: title.meta,
  description:
    'Toutes les promotions Rgi Service en cours : PC gamer, composants, écrans et périphériques à prix réduit, livrés partout au Maroc.',
  alternates: { canonical: `${SITE_URL}/promotions` },
  openGraph: openGraph({
    title: title.text,
    url: `${SITE_URL}/promotions`,
    description:
      'Toutes les promotions Rgi Service en cours, mises à jour en direct depuis la boutique.',
  }),
};

/**
 * The promotions listing.
 *
 * Indexable, unlike `/recherche`: "PC gamer promo Maroc" is a real query, the URL is
 * stable, and the page has genuine content whenever a sale is running. It is deliberately
 * *not* marked `noindex` when empty either — an empty sale is a temporary state of a
 * permanent page, and flipping a URL in and out of the index is worse than a thin page
 * that says plainly that nothing is on sale today.
 *
 * The server render is the build-time snapshot so crawlers get real products; `results.tsx`
 * re-asks the API in the browser, which is what keeps a static export honest about a
 * discount that started or ended since the last upload.
 */
export default async function PromotionsPage() {
  const promos = await apiFetchOrNull<ProductListResponse>(
    `/products?${PROMO_PAGE_QUERY}`,
    { revalidate: 120 },
  );

  return (
    <div className="wrap py-8 sm:py-10">
      <h1 className="t-h1 font-display font-bold">{t.home.promoTitle}</h1>
      <p className="mt-2 max-w-[60ch] text-muted">{t.home.promoText}</p>
      <PromoResults initial={promos?.data ?? []} />
    </div>
  );
}
