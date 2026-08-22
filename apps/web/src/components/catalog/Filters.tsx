import { Children } from 'react';
import Link from 'next/link';
import type { Facet, ProductListResponse } from '@rgi/types';
import { t } from '@/locales/fr';
import { formatAttributeValue, price } from '@/lib/format';
import { MenuIcon } from '@/components/ui/Icons';

export type QueryParams = Record<string, string | string[] | undefined>;

/** Build the href for toggling one filter value on or off, keeping everything else. */
export function toggleParam(
  base: string,
  params: QueryParams,
  key: string,
  value: string,
): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || k === 'page') continue;
    for (const item of Array.isArray(v) ? v : [v]) search.append(k, item);
  }
  const current = search.getAll(key);
  search.delete(key);
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  for (const item of next) search.append(key, item);
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

function isActive(params: QueryParams, key: string, value: string): boolean {
  const current = params[key];
  if (current === undefined) return false;
  return Array.isArray(current) ? current.includes(value) : current === value;
}

/** How many facet values are currently applied — shown on the mobile toggle. */
function countActive(params: QueryParams): number {
  let total = 0;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || key === 'sort' || key === 'page') continue;
    total += Array.isArray(value) ? value.length : 1;
  }
  return total;
}

/**
 * Server-rendered facets: every filter is a plain link, so the listing works without
 * JavaScript and each filtered view is crawlable (its canonical still points at the base
 * category — SEO_STRATEGY.md §1).
 *
 * Below `lg` the same markup is a disclosure panel instead of a sidebar: a dozen facet
 * groups stacked above the grid would push every product off a phone screen. The toggle
 * is a checkbox + `<label>`, not React state, for two reasons — this component stays a
 * server component (no client bundle for ~40 links), and the panel still opens for a
 * visitor whose JavaScript has not arrived yet.
 */
export function Filters({
  base,
  params,
  data,
}: {
  base: string;
  params: QueryParams;
  data: ProductListResponse;
}) {
  const hasFilters = Object.keys(params).some((k) => k !== 'sort' && k !== 'page');
  const activeCount = countActive(params);

  return (
    <aside aria-label={t.category.filters} className="lg:sticky lg:top-24">
      <input type="checkbox" id="catalog-filters" className="peer sr-only lg:hidden" />
      <label
        htmlFor="catalog-filters"
        className="btn btn-ghost mb-4 w-full cursor-pointer justify-between peer-focus-visible:outline
          peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2
          peer-focus-visible:outline-accent2 lg:hidden"
      >
        <span className="flex items-center gap-2">
          <MenuIcon className="h-[18px] w-[18px]" />
          {t.category.filters}
        </span>
        {activeCount ? (
          <span className="grid h-6 min-w-[1.5rem] place-items-center rounded-full bg-grad px-1.5 text-xs font-bold text-bg">
            {activeCount}
          </span>
        ) : null}
      </label>

      {/* `hidden` is the phone default; the peer variant opens it, `lg:flex` pins it open
          on desktop where it is a permanent sidebar. */}
      <div
        className="hidden flex-col gap-4 peer-checked:flex lg:flex lg:max-h-[calc(100vh-8rem)]
          lg:gap-6 lg:overflow-y-auto lg:pr-1"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">{t.category.filters}</h2>
          {hasFilters ? (
            <Link href={base} className="text-xs font-semibold text-accent2">
              {t.category.clearFilters}
            </Link>
          ) : null}
        </div>

        {data.brands.length > 1 ? (
          <FilterGroup title={t.category.brand}>
            {data.brands.map((brand) => (
              <FilterLink
                key={brand.value}
                href={toggleParam(base, params, 'brand', brand.value)}
                active={isActive(params, 'brand', brand.value)}
                label={brand.value}
                count={brand.count}
              />
            ))}
          </FilterGroup>
        ) : null}

        {data.availableFacets.map((facet) => (
          <FacetGroup key={facet.key} facet={facet} base={base} params={params} />
        ))}

        <FilterGroup title={t.category.price}>
          <p className="text-xs text-faint">
            {price(data.priceRange.min)} — {price(data.priceRange.max)}
          </p>
          <FilterLink
            href={toggleParam(base, params, 'inStock', 'true')}
            active={isActive(params, 'inStock', 'true')}
            label={t.category.inStockOnly}
          />
        </FilterGroup>
      </div>
    </aside>
  );
}

function FacetGroup({
  facet,
  base,
  params,
}: {
  facet: Facet;
  base: string;
  params: QueryParams;
}) {
  const key = `attr.${facet.key}`;
  return (
    <FilterGroup title={facet.label.fr}>
      {facet.values.map((value) => {
        const raw = String(value.value);
        return (
          <FilterLink
            key={raw}
            href={toggleParam(base, params, key, raw)}
            active={isActive(params, key, raw)}
            label={formatAttributeValue(facet.key, value.value) ?? raw}
            count={value.count}
          />
        );
      })}
    </FilterGroup>
  );
}

/**
 * A facet with a long tail (every brand in the catalogue) gets its own scroll box rather
 * than making the panel itself endless — on a phone that is the difference between the
 * "Prix" group being reachable and being three screens down.
 */
const LONG_LIST = 12;

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const long = Children.count(children) > LONG_LIST;
  return (
    <div className="surface-card p-3 sm:p-4">
      <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[.05em] text-faint sm:mb-3">
        {title}
      </h3>
      <div
        className={`flex flex-col gap-1 sm:gap-1.5 ${
          long ? 'max-h-[17rem] overflow-y-auto overscroll-y-contain pr-1' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    /* 44 px rows while the panel is a touch surface; the desktop sidebar is driven by a
       mouse and can go back to the compact mockup rhythm. */
    <Link
      href={href}
      aria-pressed={active}
      className={`flex min-h-[44px] items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm
        transition lg:min-h-0 lg:px-2.5 lg:py-1.5 ${
        active ? 'bg-grad-soft font-semibold text-text' : 'text-muted hover:bg-text/[.04] hover:text-text'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
            active ? 'border-accent bg-accent text-bg' : 'border-line2'
          }`}
        >
          {active ? '✓' : ''}
        </span>
        {label}
      </span>
      {count !== undefined ? <span className="shrink-0 text-xs text-faint">{count}</span> : null}
    </Link>
  );
}
