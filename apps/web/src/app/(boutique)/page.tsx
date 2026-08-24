import type { CategoryNode, ProductListResponse } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { SITE_NAME, SITE_URL } from '@/lib/env';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { Hero } from '@/components/home/Hero';
import { CategoryTiles } from '@/components/home/CategoryTiles';
import { ConfiguratorCta } from '@/components/home/ConfiguratorCta';
import { TrustBand } from '@/components/home/TrustBand';
import { LiveProductGrid } from '@/components/product/LiveProductGrid';
import { EmptyState, Section } from '@/components/ui/Section';
import { CONTACT } from '@/lib/contact';

/** Home is statically rendered and revalidated — SSR/ISR for SEO (SEO_STRATEGY.md §1). */
export const revalidate = 300;

/**
 * Declared once and shared by the server render and the browser refresh: `LiveProductGrid`
 * re-asks the API with the very same query, so the two can never drift apart.
 */
const PREBUILT_QUERY = 'categoryType=prebuilt&limit=4&sort=price_asc';
const LATEST_QUERY = 'limit=8&sort=newest';

export default async function HomePage() {
  const [categories, prebuilts, latest] = await Promise.all([
    apiFetchOrNull<CategoryNode[]>('/categories', { revalidate: 300 }),
    apiFetchOrNull<ProductListResponse>(`/products?${PREBUILT_QUERY}`, { revalidate: 120 }),
    apiFetchOrNull<ProductListResponse>(`/products?${LATEST_QUERY}`, { revalidate: 120 }),
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
          <LiveProductGrid query={PREBUILT_QUERY} initial={prebuilts.data} />
        </Section>
      ) : null}

      {latest?.data.length ? (
        <Section title={t.home.newTitle} text={t.home.newText}>
          <LiveProductGrid query={LATEST_QUERY} initial={latest.data} limit={8} />
        </Section>
      ) : null}

      <TrustBand />
    </>
  );
}

/** Organization + ComputerStore + WebSite/SearchAction, site-wide entities (SEO_STRATEGY.md §1). */
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
        /*
         * The local-business entity, and the reason it is `ComputerStore` rather than a
         * plain `LocalBusiness`: schema.org has a specific type for a computer shop, and
         * the more specific type Google can resolve, the better it matches a search like
         * "magasin pc gamer casablanca".
         *
         * `address` is what proves the shop is physically in Casablanca — `Organization`
         * alone never did, which is why the site could not compete on local queries.
         * `areaServed` stays the whole country: the shop sits in Casablanca but delivers
         * everywhere, and conflating the two would shrink its reach.
         *
         * TODO(client): streetAddress, postalCode, `geo` (lat/lng),
         * `openingHoursSpecification` and `hasMap` (the Google Business Profile URL) are
         * still missing — they are the remaining half of local SEO. Do NOT invent them:
         * a NAP that disagrees with the Google Business Profile actively hurts ranking.
         *
         * Checked 2026-08-24: the Aïn Chock address on the HeberJahiz billing account is the
         * registrant's, NOT the storefront's — confirmed by the client. Do not reuse it here.
         */
        '@type': 'ComputerStore',
        '@id': `${SITE_URL}/#localbusiness`,
        name: SITE_NAME,
        url: SITE_URL,
        image: `${SITE_URL}/og-default.png`,
        logo: `${SITE_URL}/logo-rgi.png`,
        telephone: CONTACT.phoneE164,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Casablanca',
          addressRegion: 'Casablanca-Settat',
          addressCountry: 'MA',
        },
        // The shop is in Casablanca; the customers are national.
        areaServed: { '@type': 'Country', name: 'Maroc' },
        currenciesAccepted: 'MAD',
        paymentAccepted: 'Paiement à la livraison, Carte bancaire',
        priceRange: 'MAD',
        parentOrganization: { '@id': `${SITE_URL}/#organization` },
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
