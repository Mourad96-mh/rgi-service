import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type {
  AttributeDefinition,
  CategoryNode,
  Product,
  ProductListResponse,
} from '@rgi/types';
import { ApiError, apiFetch, apiFetchOrNull } from '@/lib/api';
import { SITE_URL } from '@/lib/env';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { absoluteUrl } from '@/lib/url';
import { openGraph, productDescription, productTitle } from '@/lib/seo';
import { price, primaryImage } from '@/lib/format';
import { ProductView } from '@/components/product/ProductView';
import { ProductJsonLd } from './json-ld';

/** Server-rendered product page — the money page for SEO (SEO_STRATEGY.md §1-§2). */
export const revalidate = 120;

type PageProps = { params: { slug: string } };

/**
 * Every product URL to pre-render.
 *
 * Next calls this on BOTH builds, which is why the failure below is conditional. On the
 * static export a product missing from this list is a permanent 404 — no file exists and
 * no server will ever make one — so an unreachable API must stop the build. On the server
 * build the same gap is harmless: `dynamicParams` is on, so ISR renders the product the
 * first time someone asks for it. Failing hard there would mean a dead catalogue API could
 * block a deploy that has nothing to do with it.
 *
 * The API caps `limit` at 100 (`limit ne peut pas dépasser 100.`), so this pages through
 * the catalogue rather than asking for it all at once — otherwise the moment the catalogue
 * passes 100 items the export would start silently dropping products from the shop.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const PER_PAGE = 100;
  const slugs: { slug: string }[] = [];

  for (let page = 1; ; page++) {
    const batch = await apiFetchOrNull<ProductListResponse>(
      `/products?limit=${PER_PAGE}&page=${page}&sort=newest`,
      // Not `revalidate: 0`: that sets `cache: 'no-store'`, which marks the route dynamic
      // and makes Next reject it for `output: export`.
      { revalidate: 3600 },
    );
    if (!batch) {
      if (process.env.BUILD_TARGET === 'static') {
        throw new Error(
          `generateStaticParams: the catalogue API did not answer for page ${page}. ` +
            'Refusing to export a shop with missing product pages — start the API and retry.',
        );
      }
      console.warn(
        `generateStaticParams: the catalogue API did not answer for page ${page}; ` +
          `pre-rendering ${slugs.length} product page(s). The rest render on demand.`,
      );
      break;
    }

    slugs.push(...batch.data.map((product) => ({ slug: product.slug })));
    if (slugs.length >= batch.total || batch.data.length === 0) break;
  }

  return slugs;
}

async function loadProduct(slug: string): Promise<Product | null> {
  try {
    return await apiFetch<Product>(`/products/${slug}`, { revalidate: 120 });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await loadProduct(params.slug);
  if (!product) return { title: 'Produit introuvable' };

  // Pattern from SEO_STRATEGY.md §2, budgeted to 60 characters: the brand is dropped when
  // the product name already carries it, and "Prix Maroc" goes before the name is truncated.
  const custom = product.metaTitle?.fr;
  const title = custom ? { meta: custom, text: custom } : productTitle(product.name.fr, product.brand);
  const description =
    product.metaDescription?.fr ??
    productDescription(product.name.fr, price(product.effectivePrice), product.stock > 0);
  const image = primaryImage(product);

  return {
    title: title.meta,
    description,
    alternates: { canonical: routes.product(product.slug) },
    openGraph: openGraph({
      title: title.text,
      description,
      url: `${SITE_URL}${routes.product(product.slug)}`,
      // The product photo when there is one; the helper's default card otherwise.
      ...(image
        ? { images: [{ url: absoluteUrl(image.url), alt: image.alt ?? product.name.fr }] }
        : {}),
    }),
  };
}

export default async function ProductPage({ params }: PageProps) {
  const product = await loadProduct(params.slug);
  if (!product) notFound();

  const [definitions, related, categories] = await Promise.all([
    apiFetchOrNull<AttributeDefinition[]>(
      `/attribute-definitions?categoryType=${product.categoryType}`,
      { revalidate: 600 },
    ),
    apiFetchOrNull<ProductListResponse>(`/products?categoryType=${product.categoryType}&limit=5`, {
      revalidate: 300,
    }),
    apiFetchOrNull<CategoryNode[]>('/categories', { revalidate: 300 }),
  ]);

  return (
    <ProductView
      product={product}
      definitions={definitions ?? []}
      related={related?.data ?? []}
      categories={categories ?? []}
      jsonLd={<ProductJsonLd product={product} />}
    />
  );
}
