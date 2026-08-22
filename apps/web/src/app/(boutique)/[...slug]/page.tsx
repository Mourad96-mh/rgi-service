import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { AttributeDefinition, Category, CategoryNode, ProductListResponse } from '@rgi/types';
import { apiFetch, apiFetchOrNull, ApiError } from '@/lib/api';
import { SITE_NAME, SITE_URL } from '@/lib/env';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { openGraph, seoTitle } from '@/lib/seo';
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs';
import { Filters, type QueryParams } from '@/components/catalog/Filters';
import { SortSelect } from '@/components/catalog/SortSelect';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/Section';
import { buildCrumbs, findChildren, ItemListJsonLd, Pagination } from './parts';

/**
 * Category listing at the nested, keyword-rich path SEO_STRATEGY.md §1 asks for:
 * `/composants/cartes-graphiques/`. Server-rendered with its facets, then revalidated.
 */
export const revalidate = 120;

type PageProps = {
  params: { slug: string[] };
  searchParams: QueryParams;
};

const PAGE_SIZE = 24;

async function loadCategory(slug: string) {
  try {
    return await apiFetch<{ category: Category; attributeDefinitions: AttributeDefinition[] }>(
      `/categories/${slug}`,
      { revalidate: 300 },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.slug.join('/');
  const found = await loadCategory(slug);
  if (!found) return { title: 'Catégorie introuvable' };

  const name = found.category.name.fr;
  const title = seoTitle(`${name} au Maroc`, 'prix et stock');
  return {
    title: title.meta,
    description: `${name} : sélection ${SITE_NAME}, prix en dirhams, stock à jour, livraison 48h partout au Maroc et paiement à la livraison.`,
    // Filtered and sorted variants canonicalize to the base category (SEO_STRATEGY.md §1).
    alternates: { canonical: routes.category(slug) },
    openGraph: openGraph({
      title: title.text,
      url: `${SITE_URL}${routes.category(slug)}`,
    }),
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const slug = params.slug.join('/');
  const found = await loadCategory(slug);
  if (!found) notFound();

  const { category } = found;
  const base = routes.category(slug);
  const page = Number(searchParams.page ?? 1) || 1;

  const query = new URLSearchParams();
  query.set('category', slug);
  query.set('limit', String(PAGE_SIZE));
  query.set('page', String(page));
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || key === 'page') continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }

  const [data, tree] = await Promise.all([
    apiFetchOrNull<ProductListResponse>(`/products?${query.toString()}`, { revalidate: 120 }),
    apiFetchOrNull<CategoryNode[]>('/categories', { revalidate: 300 }),
  ]);

  if (!data) {
    return (
      <div className="wrap py-16">
        <EmptyState title={t.common.apiDown} />
      </div>
    );
  }

  const crumbs = buildCrumbs(tree ?? [], slug, category.name.fr);
  const children = findChildren(tree ?? [], category.id);
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="wrap py-8 sm:py-10">
      <Breadcrumbs items={crumbs} />

      <header className="mb-6 sm:mb-8">
        <h1 className="t-h1 font-display font-bold">{category.name.fr}</h1>
        <p className="mt-2 text-muted">{t.category.results(data.total)}</p>
      </header>

      {children.length ? (
        <div className="scroll-x mb-6 sm:mb-8">
          <div className="flex gap-2 pb-1">
          {children.map((child) => (
            <Link key={child.id} href={routes.category(child.slug)} className="pill hover:text-text">
              {child.name.fr}
            </Link>
          ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
        <Filters base={base} params={searchParams} data={data} />

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-faint">{t.category.results(data.total)}</span>
            <SortSelect />
          </div>

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

          {totalPages > 1 ? (
            <Pagination base={base} params={searchParams} page={page} totalPages={totalPages} />
          ) : null}
        </div>
      </div>

      <ItemListJsonLd data={data} slug={slug} name={category.name.fr} />
    </div>
  );
}
