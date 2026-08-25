'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  AttributeDefinition,
  CategoryNode,
  Product,
  ProductListResponse,
  ProductSummary,
} from '@rgi/types';
import { ApiError, apiFetch, apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { EmptyState } from '@/components/ui/Section';
import { ProductView } from './ProductView';

/**
 * The prerendered product page, catching itself up with the API.
 *
 * Every other product surface already refreshes itself in the browser — the category
 * listing (`[...slug]/listing.tsx`), the home rows (`LiveProductGrid`), and the
 * stand-in for products with no file yet (`fiche-produit/view.tsx`). The product page
 * was the one that did not, and it is the page where being wrong costs the most: it
 * carries the price a customer decides on and the stock they trust. On shared hosting
 * nothing corrects it until someone rebuilds and re-uploads, so a price edited in the
 * admin showed up on the listing card and not on the product it belonged to — the shop
 * contradicting itself, on the page that matters.
 *
 * `initial` is what the server rendered and what ships in the HTML, so crawlers and
 * visitors without JavaScript still get the full page, its metadata and its JSON-LD.
 * Once JavaScript runs the product is re-read and swapped in place.
 *
 * Three outcomes, deliberately distinguished:
 *   - fresh data: price, stock, images, description and specs are replaced;
 *   - the API unreachable: nothing changes, the visitor keeps a slightly stale page
 *     rather than an empty one (`apiFetchOrNull` says why in the console);
 *   - a 404: the product has been archived or deleted since the build. That is the one
 *     case where keeping the prerendered copy is actively wrong, because the page would
 *     go on offering something the shop will not sell — and the cart would only find out
 *     at checkout. Say so instead.
 */
export function LiveProduct({
  initial,
  definitions,
  related: initialRelated,
  categories,
  jsonLd,
}: {
  initial: Product;
  definitions: AttributeDefinition[];
  related: ProductSummary[];
  categories: CategoryNode[];
  jsonLd?: React.ReactNode;
}) {
  const [product, setProduct] = useState(initial);
  const [related, setRelated] = useState(initialRelated);
  const [withdrawn, setWithdrawn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // revalidate: 0 -> cache: 'no-store'. A cached answer would defeat the point:
        // this exists precisely because the build-time copy may be out of date.
        const fresh = await apiFetch<Product>(`/products/${initial.slug}`, { revalidate: 0 });
        if (cancelled) return;
        setProduct(fresh);

        // Refreshed second and separately: a stale « produits similaires » row is a
        // cosmetic problem, so it must never delay or block the price and stock above it.
        const others = await apiFetchOrNull<ProductListResponse>(
          `/products?categoryType=${fresh.categoryType}&limit=5`,
          { revalidate: 0 },
        );
        if (!cancelled && others) setRelated(others.data);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) setWithdrawn(true);
        // Any other failure keeps the prerendered page exactly as it is.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initial.slug]);

  if (withdrawn) {
    return (
      <div className="wrap py-16">
        <EmptyState
          title={t.product.notFoundTitle}
          action={
            <Link href={routes.home} className="btn btn-ghost">
              {t.product.notFoundAction}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <ProductView
      product={product}
      definitions={definitions}
      related={related}
      categories={categories}
      jsonLd={jsonLd}
    />
  );
}
