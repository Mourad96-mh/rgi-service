import Link from 'next/link';
import type { Facet, ProductListResponse } from '@rgi/types';
import { t } from '@/locales/fr';
import { formatAttributeValue, price } from '@/lib/format';

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

/**
 * Server-rendered facets: every filter is a plain link, so the listing works without
 * JavaScript and each filtered view is crawlable (its canonical still points at the base
 * category — SEO_STRATEGY.md §1).
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

  return (
    <aside className="flex flex-col gap-6" aria-label={t.category.filters}>
      <div className="flex items-center justify-between">
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

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-4">
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[.05em] text-faint">
        {title}
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
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
    <Link
      href={href}
      aria-pressed={active}
      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition ${
        active ? 'bg-grad-soft font-semibold text-text' : 'text-muted hover:bg-white/[.04] hover:text-text'
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={`grid h-4 w-4 place-items-center rounded border text-[10px] ${
            active ? 'border-accent bg-accent text-bg' : 'border-line2'
          }`}
        >
          {active ? '✓' : ''}
        </span>
        {label}
      </span>
      {count !== undefined ? <span className="text-xs text-faint">{count}</span> : null}
    </Link>
  );
}
