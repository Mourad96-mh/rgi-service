import type { CategoryNode, ProductListResponse } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { SITE_NAME, SITE_URL } from '@/lib/env';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { Hero } from '@/components/home/Hero';
import { CategoryTiles } from '@/components/home/CategoryTiles';
import { ConfiguratorCta } from '@/components/home/ConfiguratorCta';
import { TrustBand } from '@/components/home/TrustBand';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState, Section } from '@/components/ui/Section';
import { CONTACT } from '@/lib/contact';

/** Home is statically rendered and revalidated — SSR/ISR for SEO (SEO_STRATEGY.md §1). */
export const revalidate = 300;

export default async function HomePage() {
  const [categories, prebuilts, latest] = await Promise.all([
    apiFetchOrNull<CategoryNode[]>('/categories', { revalidate: 300 }),
    apiFetchOrNull<ProductListResponse>('/products?categoryType=prebuilt&limit=4&sort=price_asc', {
      revalidate: 120,
    }),
    apiFetchOrNull<ProductListResponse>('/products?limit=8&sort=newest', { revalidate: 120 }),
  ]);

  const apiDown = categories === null && latest === null;

  return (
    <>
      <JsonLd categories={categories ?? []} />
      <Hero />

      {apiDown ? (
        <div className="wrap py-8 sm:py-10">
          <EmptyState title={t.common.apiDown} />
        </div>
      ) : null}

      {categories?.length ? (
        <Section title={t.home.categoriesTitle} text={t.home.categoriesText}>
          <CategoryTiles categories={categories} />
        </Section>
      ) : null}

      <ConfiguratorCta />

      {prebuilts?.data.length ? (
        <Section
          title={t.home.dealsTitle}
          text={t.home.dealsText}
          href={routes.category('pc-gamer')}
          linkLabel={t.common.seeAll}
        >
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-[18px] md:grid-cols-3 lg:grid-cols-4">
            {prebuilts.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      ) : null}

      {latest?.data.length ? (
        <Section title={t.home.newTitle} text={t.home.newText}>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-[18px] md:grid-cols-3 lg:grid-cols-4">
            {latest.data.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Section>
      ) : null}

      <TrustBand />
    </>
  );
}

/** Organization + WebSite/SearchAction, site-wide entities (SEO_STRATEGY.md §1). */
function JsonLd({ categories }: { categories: CategoryNode[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        // Google's logo guidelines want a raster it can crop, not an SVG.
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo-rgi.png`,
          width: 1200,
          height: 630,
        },
        areaServed: 'MA',
        // `telephone` takes the main line; every line is then published as its own
        // ContactPoint so the shop's NAP is complete and consistent wherever Google
        // surfaces it.
        telephone: CONTACT.phoneE164,
        contactPoint: CONTACT.phones.map((line) => ({
          '@type': 'ContactPoint',
          telephone: line.e164,
          contactType: 'customer service',
          areaServed: 'MA',
          availableLanguage: ['fr', 'ar'],
        })),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: 'fr-MA',
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/recherche?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'ItemList',
        name: 'Catégories',
        itemListElement: categories.map((category, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: category.name.fr,
          url: `${SITE_URL}${routes.category(category.slug)}`,
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
