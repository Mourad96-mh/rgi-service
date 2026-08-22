import Link from 'next/link';
import { t } from '@/locales/fr';

/**
 * The Stock section's only two controls: what to show, and in what order.
 *
 * Deliberately links rather than a form — it stays a server component (no client bundle
 * for four links), the state is shareable and bookmarkable, and "sous le seuil d'alerte"
 * is exactly the URL a staff member wants pinned on their phone.
 */
export function StockFilters({ low, sort }: { low: boolean; sort: string }) {
  const href = (next: { low?: boolean; sort?: string }) => {
    const params = new URLSearchParams();
    if (next.low ?? low) params.set('low', '1');
    params.set('sort', next.sort ?? sort);
    return `/admin/stock?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <div
        className="flex w-full gap-1 rounded-sm2 border border-line bg-surface p-1 sm:w-auto"
        role="group"
        aria-label={t.admin.status}
      >
        <Tab href={href({ low: false })} active={!low} label={t.admin.stockAll} />
        <Tab href={href({ low: true })} active={low} label={t.admin.stockLowOnly} />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-[12px] uppercase tracking-[.05em] text-faint">
          {t.admin.stockSort}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <Chip href={href({ sort: 'stock' })} active={sort === 'stock'} label={t.admin.stockSortStock} />
          <Chip href={href({ sort: 'name' })} active={sort === 'name'} label={t.admin.stockSortName} />
          <Chip
            href={href({ sort: 'recent' })}
            active={sort === 'recent'}
            label={t.admin.stockSortRecent}
          />
        </div>
      </div>
    </div>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`inline-flex min-h-[40px] flex-1 items-center justify-center whitespace-nowrap rounded-[9px] px-3 text-[13px] font-semibold transition sm:flex-none ${
        active ? 'bg-text/[.09] text-text' : 'text-muted hover:text-text'
      }`}
    >
      {label}
    </Link>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`inline-flex min-h-[36px] items-center rounded-full border px-3 text-[12.5px] font-medium transition ${
        active
          ? 'border-accent2 text-text'
          : 'border-line text-muted hover:border-line2 hover:text-text'
      }`}
    >
      {label}
    </Link>
  );
}
