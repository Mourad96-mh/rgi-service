import Link from 'next/link';
import type {
  AttributeDefinition,
  CategoryNode,
  Product,
  ProductSummary,
} from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { cardSpecs, discountPct, formatAttributeValue, price } from '@/lib/format';
import { Breadcrumbs, type Crumb } from '@/components/catalog/Breadcrumbs';
import { ProductCard, StockLine } from '@/components/product/ProductCard';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductTabs } from '@/components/product/ProductTabs';
import { BuyBox } from '@/components/product/BuyBox';
import { BoltIcon, CheckIcon } from '@/components/ui/Icons';

/**
 * The product page, as markup only.
 *
 * Lifted out of `produit/[slug]/page.tsx` so the same view can be rendered two ways:
 *
 *   - **prerendered**, by the server component, for every product that existed at build
 *     time — this is the copy Google indexes and the one a visitor without JavaScript
 *     reads;
 *   - **in the browser**, by `fiche-produit/view.tsx`, for a product added in the admin
 *     *since* that build, which has no file of its own on the static host.
 *
 * Deliberately free of server-only imports (`notFound`, `apiFetch`, `Metadata`) so it can
 * be imported from a `'use client'` module. Every component it renders is either a client
 * component already or plain presentational markup.
 */
export function ProductView({
  product,
  definitions,
  related,
  categories,
  jsonLd = null,
}: {
  product: Product;
  definitions: AttributeDefinition[];
  related: ProductSummary[];
  categories: CategoryNode[];
  /** JSON-LD for the prerendered page. Omitted on the client fallback, which is noindex. */
  jsonLd?: React.ReactNode;
}) {
  const off = discountPct(product.effectivePrice, product.compareAtPrice);
  const specs = orderedSpecs(product, definitions);
  const highlights = cardSpecs(product);
  const others = related.filter((p) => p.id !== product.id).slice(0, 4);
  const assembled = ['prebuilt', 'workstation'].includes(product.categoryType);

  return (
    <div className="wrap py-8 sm:py-10">
      <Breadcrumbs items={buildCrumbs(product, categories)} />

      <div className="grid items-start gap-7 lg:grid-cols-[1.02fr_.98fr] lg:gap-10">
        <ProductGallery
          images={product.images}
          name={product.name.fr}
          badge={
            off !== null ? (
              <span className="chip absolute left-4 top-4 z-10 bg-accent3 text-white">-{off}%</span>
            ) : null
          }
        />

        <div className="lg:sticky lg:top-24">
          <span className="text-xs font-semibold uppercase tracking-[.05em] text-faint">
            {product.brand}
          </span>
          <h1 className="t-h1 mt-2 font-display font-bold">
            {product.name.fr}
          </h1>

          {highlights.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {highlights.map((spec) => (
                <span key={spec} className="spec-pill">
                  {spec}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex items-end gap-3">
            <span className="grad-text t-h2 font-display font-bold">
              {price(product.effectivePrice)}
            </span>
            {product.compareAtPrice ? (
              <span className="pb-1.5 text-sm text-faint line-through">
                {price(product.compareAtPrice)}
              </span>
            ) : null}
          </div>
          {off !== null && product.compareAtPrice ? (
            <p className="mt-1 text-sm font-semibold text-accent3">
              {t.product.save} {price(product.compareAtPrice - product.effectivePrice)}
            </p>
          ) : null}

          <div className="mt-4">
            <StockLine stock={product.stock} />
          </div>

          <BuyBox product={product} />

          <ul className="mt-6 grid gap-2.5 border-t border-line pt-5 text-[13px] text-muted">
            <Reassurance text={t.product.deliveryNote} />
            <Reassurance text={t.product.warrantyNote} />
            <Reassurance text={t.trust.paymentText} />
            {assembled ? <Reassurance text={t.product.assembledBody} /> : null}
          </ul>

          <dl className="mt-6 grid gap-2 text-sm">
            <Row label={t.product.reference} value={product.sku} />
            <Row label={t.product.brand} value={product.brand} />
            <Row
              label={t.product.availability}
              value={product.stock > 0 ? t.common.inStock : t.common.outOfStock}
            />
          </dl>
        </div>
      </div>

      <ProductTabs
        panels={[
          {
            id: 'description',
            label: t.product.tabDescription,
            content: (
              <p className="max-w-[70ch] whitespace-pre-line text-[15px] leading-relaxed text-muted">
                {product.description.fr}
              </p>
            ),
          },
          ...(specs.length
            ? [
                {
                  id: 'specs',
                  label: t.product.tabSpecs,
                  content: (
                    <dl className="surface-card max-w-[720px] divide-y divide-[rgba(16,24,48,.09)] overflow-hidden">
                      {specs.map((spec) => (
                        <div key={spec.key} className="flex justify-between gap-4 px-4 py-3 text-sm sm:gap-6">
                          <dt className="shrink-0 text-muted">{spec.label}</dt>
                          <dd className="min-w-0 text-right font-medium">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ),
                },
              ]
            : []),
          {
            id: 'delivery',
            label: t.product.tabDelivery,
            content: (
              <div className="grid max-w-[900px] gap-4 sm:grid-cols-2">
                <InfoCard title={t.product.deliveryTitle} body={t.product.deliveryBody} />
                <InfoCard title={t.product.paymentTitle} body={t.product.paymentBody} />
                <InfoCard title={t.product.warrantyTitle} body={t.product.warrantyBody} />
                {assembled ? (
                  <InfoCard title={t.product.assembledTitle} body={t.product.assembledBody} />
                ) : null}
              </div>
            ),
          },
        ]}
      />

      {product.isConfiguratorPart ? (
        <section
          className="surface-card mt-10 flex flex-wrap items-center justify-between gap-5 p-5 sm:mt-14 sm:gap-6 sm:p-8"
          style={{ background: 'var(--grad-soft)' }}
        >
          <div className="min-w-0">
            <h2 className="t-h3 font-display font-bold">{t.product.configuratorCrossTitle}</h2>
            <p className="mt-2 max-w-[560px] text-sm text-muted">
              {t.product.configuratorCrossText}
            </p>
          </div>
          <Link href={routes.configurator} className="btn btn-primary w-full xs:w-auto">
            <BoltIcon className="h-[18px] w-[18px]" />
            {t.product.configuratorCrossCta}
          </Link>
        </section>
      ) : null}

      {others.length ? (
        <section className="mt-12 sm:mt-16">
          <h2 className="t-h2 mb-5 font-display font-bold sm:mb-6">{t.product.related}</h2>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-[18px] lg:grid-cols-4">
            {others.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      {jsonLd}
    </div>
  );
}

function Reassurance({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      <span>{text}</span>
    </li>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface-card p-5">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2 sm:gap-6">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}

/** Specs in the order staff defined them in the admin, with their French labels + units. */
function orderedSpecs(product: Product, definitions: AttributeDefinition[]) {
  return definitions
    .map((definition) => {
      const value = formatAttributeValue(definition.key, product.attributes[definition.key]);
      if (!value) return null;
      return { key: definition.key, label: definition.label.fr, value };
    })
    .filter((row): row is { key: string; label: string; value: string } => row !== null);
}

/** Flatten the category tree once so a product's category can be found by id. */
function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
}

/**
 * Accueil → Composants → Cartes graphiques → produit. Category slugs are full paths, so
 * the ancestors are the leading segments of the product's own category slug.
 */
function buildCrumbs(product: Product, categories: CategoryNode[]): Crumb[] {
  const all = flatten(categories);
  const own = all.find((node) => node.id === product.category);
  const crumbs: Crumb[] = [{ label: 'Accueil', href: routes.home }];

  if (own) {
    const segments = own.slug.split('/');
    for (let i = 0; i < segments.length; i += 1) {
      const path = segments.slice(0, i + 1).join('/');
      const node = all.find((candidate) => candidate.slug === path);
      if (node) crumbs.push({ label: node.name.fr, href: routes.category(node.slug) });
    }
  }

  crumbs.push({ label: product.name.fr, href: routes.product(product.slug) });
  return crumbs;
}
