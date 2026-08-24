import { Suspense } from 'react';
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
import { EmptyState } from '@/components/ui/Section';
import { buildCrumbs, findChildren, ItemListJsonLd } from './parts';
import { CatalogListing, ListingView } from './listing';
import { PAGE_SIZE } from './constants';

/**
 * Category listing at the nested, keyword-rich path SEO_STRATEGY.md §1 asks for:
 * `/composants/cartes-graphiques/`. Server-rendered with its facets, then revalidated.
 */
export const revalidate = 120;

type PageProps = { params: { slug: string[] } };

/**
 * Every category path the static export has to emit, flattened out of the category tree —
 * `/composants`, `/composants/cartes-graphiques`, and so on.
 *
 * Only the *unfiltered first page* of each listing exists as a file. That is deliberate:
 * it is the URL Google indexes and the one in `sitemap.xml`, so search visibility is
 * unaffected. Filters, sorting and pagination cannot be pre-rendered — the combinations
 * are unbounded — so on the static build they are applied in the browser instead.
 */
export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  // See the note in produit/[slug]: `revalidate: 0` would make this route dynamic.
  const tree = await apiFetchOrNull<CategoryNode[]>('/categories', { revalidate: 3600 });
  const paths: { slug: string[] }[] = [];
  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      paths.push({ slug: node.slug.split('/') });
      walk(node.children);
    }
  };
  walk(tree ?? []);
  return paths;
}

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

export default async function CategoryPage({ params }: PageProps) {
  const slug = params.slug.join('/');
  const found = await loadCategory(slug);
  if (!found) notFound();

  const { category } = found;
  const base = routes.category(slug);

  // The unfiltered first page — the view this URL is canonical for, the one in the
  // sitemap, and the one Google indexes. Filters, sort and pagination are applied in the
  // browser afterwards (see ./listing), because a static host cannot read a query string.
  const [data, tree] = await Promise.all([
    apiFetchOrNull<ProductListResponse>(
      `/products?category=${encodeURIComponent(slug)}&limit=${PAGE_SIZE}&page=1`,
      { revalidate: 120 },
    ),
    apiFetchOrNull<CategoryNode[]>('/categories', { revalidate: 300 }),
  ]);

  if (!data) {
    // On the server build this is a transient API outage and a graceful message is right —
    // the next revalidation fixes it. In a static export there is no next time: whatever
    // renders here is written to a file and uploaded, so a category page that quietly says
    // « catalogue indisponible » would sit on the shop until someone noticed. Fail the
    // build instead.
    if (process.env.BUILD_TARGET === 'static') {
      throw new Error(
        `Catégorie « ${slug} » : l'API n'a pas répondu. Refus d'exporter une page vide. ` +
          'Vérifiez que l’API tourne, puis relancez le build.',
      );
    }
    return (
      <div className="wrap py-16">
        <EmptyState title={t.common.apiDown} />
      </div>
    );
  }

  const crumbs = buildCrumbs(tree ?? [], slug, category.name.fr);
  const children = findChildren(tree ?? [], category.id);

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

      {/*
        The fallback is not a placeholder — it is the real listing, and it is what gets
        written into the static HTML. `CatalogListing` reads the query string, which forces
        it to render in the browser; everything up to this boundary is prerendered instead.
        So a crawler and a visitor with no JavaScript get the full first page of products,
        and only someone who actually clicks a filter needs JavaScript at all.
      */}
      <Suspense fallback={<ListingView base={base} params={{}} page={1} data={data} />}>
        <CatalogListing slug={slug} base={base} initial={data} />
      </Suspense>

      <ItemListJsonLd data={data} slug={slug} name={category.name.fr} />
    </div>
  );
}
