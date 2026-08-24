'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ProductListResponse } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { Filters, type QueryParams } from '@/components/catalog/Filters';
import { SortSelect } from '@/components/catalog/SortSelect';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/Section';
import { Pagination } from './parts';
import { PAGE_SIZE } from './constants';

/**
 * The listing, with no hooks in it.
 *
 * Kept hook-free on purpose: this is what the page renders as the Suspense *fallback*, and
 * a fallback is the markup that gets baked into the static HTML. So the file uploaded to
 * Hostinger contains the real, unfiltered, first-page listing — products, facets, prices —
 * which is what Google indexes and what a visitor without JavaScript sees. The interactive
 * version below then takes over in the browser.
 */
export function ListingView({
  base,
  params,
  page,
  data,
  busy = false,
}: {
  base: string;
  params: QueryParams;
  page: number;
  data: ProductListResponse;
  busy?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
      <Filters base={base} params={params} data={data} />

      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-faint">{t.category.results(data.total)}</span>
          {/*
            `SortSelect` reads the query string too, so it needs its own boundary: when
            `ListingView` is used as the page's Suspense *fallback* it renders outside that
            boundary, and an unwrapped `useSearchParams()` there fails the export.
          */}
          <Suspense fallback={<SortPlaceholder />}>
            <SortSelect />
          </Suspense>
        </div>

        {/* Dim rather than blank while a filter is loading: replacing the grid with a
            spinner makes the page jump by its own height on every click. */}
        <div className={busy ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          {data.data.length ? (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-[18px] xl:grid-cols-3 3xl:grid-cols-4">
              {data.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t.category.empty}
              action={
                <Link href={base} className="btn btn-ghost">
                  {t.category.emptyAction}
                </Link>
              }
            />
          )}
        </div>

        {totalPages > 1 ? (
          <Pagination base={base} params={params} page={page} totalPages={totalPages} />
        ) : null}
      </div>
    </div>
  );
}

/** Inert twin of the sort control, sized identically so hydration causes no shift. */
function SortPlaceholder() {
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
      <span className="hidden shrink-0 sm:inline">{t.category.sort}</span>
      <span
        aria-hidden
        className="min-h-[44px] w-full min-w-0 max-w-[180px] rounded-sm2 border border-line bg-surface
          px-3 py-2 text-base text-muted sm:min-h-0 sm:max-w-none sm:text-sm"
      >
        {t.category.sortNewest}
      </span>
    </span>
  );
}

/** Turn the live query string into the shape `Filters` and `Pagination` expect. */
function toQueryParams(search: URLSearchParams): QueryParams {
  const params: QueryParams = {};
  for (const key of new Set(search.keys())) {
    const all = search.getAll(key);
    params[key] = all.length > 1 ? all : all[0];
  }
  return params;
}

/**
 * Faceted browsing — and catalogue freshness — done in the browser.
 *
 * On a static host there is no server to read `?brand=ASUS&page=2`, and the same file is
 * returned whatever the query string says. So the filtering that used to happen during
 * server rendering happens here instead: the query string is read on the client and the
 * catalogue API is asked directly.
 *
 * This also runs when there is **no** query string, which is the part that keeps the shop
 * honest. The prerendered grid is a photograph of the catalogue at build time; a product
 * added in the admin since then is missing from it, and on shared hosting nothing ever
 * corrects that until someone rebuilds and re-uploads. Re-asking the API on mount makes
 * the visitor's copy current within one request, while the HTML that Google and a
 * JavaScript-less visitor read stays exactly as it was.
 *
 * Two behaviours worth keeping straight:
 *   - the refresh is **silent** (no `busy` dimming). A filter click should show it is
 *     working; an ordinary page load should not flicker on every visit.
 *   - a failed request keeps the last good data, so an API blip degrades to a slightly
 *     stale shop rather than an empty one.
 */
export function CatalogListing({
  slug,
  base,
  initial,
}: {
  slug: string;
  base: string;
  initial: ProductListResponse;
}) {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const filtered = Boolean(qs);

    if (filtered) {
      setBusy(true);
    } else {
      // Clearing the filters should restore the server's view instantly rather than
      // leaving the previous filtered result on screen while the refresh is in flight.
      setData(initial);
    }

    const query = new URLSearchParams(qs);
    query.set('category', slug);
    query.set('limit', String(PAGE_SIZE));
    if (!query.get('page')) query.set('page', '1');

    // `revalidate: 0` means `cache: 'no-store'` — in the browser that is what shows current
    // prices, stock and newly added products, none of which the static HTML can know.
    apiFetchOrNull<ProductListResponse>(`/products?${query.toString()}`, { revalidate: 0 })
      .then((next) => {
        if (cancelled) return;
        // Keep the last good data on a failed request rather than emptying the shop.
        if (next) setData(next);
        setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [qs, slug, initial]);

  return (
    <ListingView
      base={base}
      params={toQueryParams(searchParams)}
      page={Number(searchParams.get('page') ?? 1) || 1}
      data={data}
      busy={busy}
    />
  );
}
