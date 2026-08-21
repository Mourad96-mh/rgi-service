import Link from 'next/link';
import type { CategoryNode, ProductListResponse } from '@rgi/types';
import { SITE_URL } from '@/lib/env';
import { routes } from '@/lib/routes';
import type { QueryParams } from '@/components/catalog/Filters';
import type { Crumb } from '@/components/catalog/Breadcrumbs';

/** Page links that carry the active filters along. */
export function Pagination({
  base,
  params,
  page,
  totalPages,
}: {
  base: string;
  params: QueryParams;
  page: number;
  totalPages: number;
}) {
  const hrefFor = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || key === 'page') continue;
      for (const item of Array.isArray(value) ? value : [value]) search.append(key, item);
    }
    if (target > 1) search.set('page', String(target));
    const qs = search.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((target) => (
        <Link
          key={target}
          href={hrefFor(target)}
          aria-current={target === page ? 'page' : undefined}
          className={`grid h-10 min-w-10 place-items-center rounded-sm2 border px-3 text-sm font-semibold transition ${
            target === page
              ? 'border-accent bg-grad-soft text-text'
              : 'border-line bg-surface text-muted hover:text-text'
          }`}
        >
          {target}
        </Link>
      ))}
    </nav>
  );
}

/** Accueil → Composants → Cartes graphiques, walking the slug path segment by segment. */
export function buildCrumbs(tree: CategoryNode[], slug: string, name: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Accueil', href: routes.home }];
  let path = '';
  for (const segment of slug.split('/')) {
    path = path ? `${path}/${segment}` : segment;
    const node = findBySlug(tree, path);
    crumbs.push({ label: node?.name.fr ?? name, href: routes.category(path) });
  }
  return crumbs;
}

function findBySlug(nodes: CategoryNode[], slug: string): CategoryNode | undefined {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const child = findBySlug(node.children, slug);
    if (child) return child;
  }
  return undefined;
}

export function findChildren(nodes: CategoryNode[], id: string): CategoryNode[] {
  for (const node of nodes) {
    if (node.id === id) return node.children;
    const child = findChildren(node.children, id);
    if (child.length) return child;
  }
  return [];
}

/** ItemList of the products on this page (SEO_STRATEGY.md §1). */
export function ItemListJsonLd({
  data,
  slug,
  name,
}: {
  data: ProductListResponse;
  slug: string;
  name: string;
}) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url: `${SITE_URL}${routes.category(slug)}`,
    numberOfItems: data.total,
    itemListElement: data.data.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name.fr,
      url: `${SITE_URL}${routes.product(product.slug)}`,
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }} />
  );
}
