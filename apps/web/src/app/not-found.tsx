import type { Metadata } from 'next';
import Link from 'next/link';
import type { CategoryNode } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { AnnounceBar, Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: true },
};

/**
 * The 404 for URLs that match no route at all.
 *
 * `(boutique)/not-found.tsx` only catches a `notFound()` raised *inside* that route group —
 * a missing product or category. Anything that matches nothing falls through to here, and
 * without this file Next serves its own built-in error page: unstyled, no navigation, and
 * in English on a French Moroccan shop. `.htaccess` points `ErrorDocument 404` at exactly
 * this page, so on Hostinger it is what every mistyped URL renders.
 *
 * It repeats the storefront chrome rather than inheriting it, because a root `not-found`
 * renders under the root layout, outside the boutique group. That is the point: someone who
 * lands here needs the header and the categories to carry on shopping, not a dead end.
 */
export default async function NotFound() {
  const categories =
    (await apiFetchOrNull<CategoryNode[]>('/categories', { revalidate: 300 })) ?? [];

  return (
    <>
      <AnnounceBar />
      <Header categories={categories} />
      <main id="contenu">
        <div className="wrap grid min-h-[50vh] place-items-center py-16 text-center sm:py-20">
          <div className="max-w-md">
            <p className="t-display grad-text font-display font-bold">404</p>
            <h1 className="t-h1 mt-2 font-display font-bold">Cette page n’existe pas.</h1>
            <p className="mt-3 text-muted">
              L’adresse est peut-être incorrecte, ou la page a été déplacée.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href={routes.home} className="btn btn-primary">
                Retour à l’accueil
              </Link>
              <Link href={routes.configurator} className="btn btn-ghost">
                Configurer un PC
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer categories={categories} />
      <p className="border-t border-line bg-surface px-4 py-3.5 text-center text-xs leading-relaxed text-faint">
        {t.common.brand} · {t.common.tagline}
      </p>
    </>
  );
}
