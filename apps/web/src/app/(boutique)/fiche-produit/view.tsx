'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  AttributeDefinition,
  CategoryNode,
  Product,
  ProductListResponse,
} from '@rgi/types';
import { apiFetch, apiFetchOrNull, ApiError } from '@/lib/api';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { ProductView } from '@/components/product/ProductView';
import { EmptyState } from '@/components/ui/Section';

/**
 * The product page for a product the last build never saw.
 *
 * Apache serves this file for any `/produit/<slug>/` that has no prerendered directory
 * (see `public/.htaccess`). That is exactly the gap staff fall into: they add a product in
 * the admin, it shows up in the listings — which now refresh from the API — and then the
 * link 404s because a static host has no file for it.
 *
 * The prerendered pages always win the rewrite, so this never shadows a real product page;
 * it only fills the hole until the next build, at which point the product gets its own
 * file, its own metadata and its place in the sitemap.
 */

type State =
  | { kind: 'loading' }
  | { kind: 'found'; product: Product; definitions: AttributeDefinition[]; related: ProductListResponse | null; categories: CategoryNode[] }
  | { kind: 'missing' }
  | { kind: 'error' };

/** `/produit/rtx-5070/` → `rtx-5070`. Null for any other shape. */
function slugFromPath(pathname: string): string | null {
  const match = /^\/produit\/([^/]+)\/?$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export function LiveProductView() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    // Read the URL here rather than during render: the prerendered HTML knows no slug, so
    // touching `location` in the render body would make the first client render disagree
    // with it.
    const slug = slugFromPath(window.location.pathname);
    if (!slug) {
      setState({ kind: 'missing' });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // `revalidate: 0` — this page exists precisely because the build-time copy is
        // missing, so a cached answer would defeat the point.
        const product = await apiFetch<Product>(`/products/${slug}`, { revalidate: 0 });
        if (cancelled) return;

        const [definitions, related, categories] = await Promise.all([
          apiFetchOrNull<AttributeDefinition[]>(
            `/attribute-definitions?categoryType=${product.categoryType}`,
            { revalidate: 0 },
          ),
          apiFetchOrNull<ProductListResponse>(
            `/products?categoryType=${product.categoryType}&limit=5`,
            { revalidate: 0 },
          ),
          apiFetchOrNull<CategoryNode[]>('/categories', { revalidate: 0 }),
        ]);
        if (cancelled) return;

        // The tab still says "Produit" from the prerendered shell; name it properly.
        document.title = `${product.name.fr} · ${t.common.brand}`;

        setState({
          kind: 'found',
          product,
          definitions: definitions ?? [],
          related,
          categories: categories ?? [],
        });
      } catch (error) {
        if (cancelled) return;
        // A genuine 404 from the API means the slug is wrong or the product was removed —
        // that is a real "introuvable", not an outage, and deserves different wording.
        setState({ kind: error instanceof ApiError && error.status === 404 ? 'missing' : 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'loading') {
    return (
      <div className="wrap py-8 sm:py-10">
        <div className="grid items-start gap-7 lg:grid-cols-[1.02fr_.98fr] lg:gap-10">
          <div className="aspect-square animate-pulse rounded-lg bg-surface2" />
          <div className="flex flex-col gap-4">
            <div className="h-4 w-24 animate-pulse rounded-sm2 bg-surface2" />
            <div className="h-9 w-3/4 animate-pulse rounded-sm2 bg-surface2" />
            <div className="h-8 w-40 animate-pulse rounded-sm2 bg-surface2" />
            <div className="h-11 w-full animate-pulse rounded-sm2 bg-surface2" />
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === 'missing') {
    return (
      <div className="wrap py-16">
        <EmptyState
          title={t.product.notFoundTitle}
          action={
            <Link href={routes.home} className="btn btn-primary">
              {t.product.notFoundAction}
            </Link>
          }
        />
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="wrap py-16">
        <EmptyState title={t.common.apiDown} />
      </div>
    );
  }

  return (
    <ProductView
      product={state.product}
      definitions={state.definitions}
      related={state.related?.data ?? []}
      categories={state.categories}
    />
  );
}
