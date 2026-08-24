'use client';

import Link from 'next/link';
import type { Order, Paginated } from '@rgi/types';
import { t } from '@/locales/fr';
import { price } from '@/lib/format';
import { adminFetch } from '@/lib/admin/session';
import { useAdminData } from '@/lib/admin/useAdminData';
import { AdminError, AdminLoading } from '@/components/admin/AdminState';
import { StatusPill } from '@/components/admin/StatusPill';

interface AdminStats {
  ordersToday: number;
  ordersWeek: number;
  revenueWeek: number;
  pendingOrders: number;
  lowStock: { id: string; name: string; sku: string; stock: number; threshold: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  activeDeals: number;
}

interface Home {
  stats: AdminStats;
  latest: Paginated<Order>;
}

export default function AdminHomePage() {
  const { data, error, loading, reload } = useAdminData<Home>(async () => {
    const [stats, latest] = await Promise.all([
      adminFetch<AdminStats>('/admin/stats'),
      adminFetch<Paginated<Order>>('/admin/orders?limit=5'),
    ]);
    return { stats, latest };
  });

  if (loading) return <AdminLoading />;
  if (error || !data) return <AdminError message={error} onRetry={reload} />;

  const { stats, latest } = data;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="t-h1 font-display font-bold">{t.admin.navHome}</h1>
        <p className="mt-1 text-[13.5px] text-muted">{t.common.tagline}</p>
      </div>

      {/* Two KPI tiles fit from 400 px up — a single column of four on a phone would
          push the pending-orders figure below the fold. */}
      <div className="grid gap-3 xs:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <Kpi label={t.admin.kpiOrdersToday} value={String(stats.ordersToday)} />
        <Kpi label={t.admin.kpiOrdersWeek} value={String(stats.ordersWeek)} />
        <Kpi label={t.admin.kpiRevenueWeek} value={price(stats.revenueWeek)} />
        <Kpi
          label={t.admin.kpiPending}
          value={String(stats.pendingOrders)}
          href="/admin/commandes?status=pending"
          highlight={stats.pendingOrders > 0}
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold">{t.admin.ordersTitle}</h2>
          <Link href="/admin/commandes" className="text-[12.5px] text-accent2 hover:underline">
            {t.common.seeAll}
          </Link>
        </div>

        {latest.data.length ? (
          <ul className="flex flex-col gap-2">
            {latest.data.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/commandes/detail?id=${order.id}`}
                  className="surface-card flex flex-wrap items-center gap-4 p-4 transition hover:border-line2"
                >
                  <span className="font-mono text-[12.5px] text-faint">{order.orderNumber}</span>
                  <span className="min-w-[120px] flex-1 text-[13.5px] font-semibold">
                    {order.contact.name}
                  </span>
                  <StatusPill status={order.status} />
                  <span className="font-display text-[15px] font-bold">{price(order.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="surface-card p-6 text-[13.5px] text-muted">{t.admin.ordersEmpty}</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          {/*
           * A signpost, not a workbench. The dashboard's job is to say what needs
           * attention; fixing a quantity is the Stock section's job, so every route out of
           * this panel leads there rather than into a product form.
           */}
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-bold">{t.admin.lowStockTitle}</h2>
            <Link href="/admin/stock?low=1" className="text-[12.5px] text-accent2 hover:underline">
              {t.common.seeAll}
            </Link>
          </div>
          {stats.lowStock.length ? (
            <ul className="surface-card divide-y divide-[rgba(16,24,48,.09)]">
              {stats.lowStock.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <Link
                    href="/admin/stock?low=1"
                    className="min-w-0 flex-1 truncate text-[13.5px] transition hover:text-accent2"
                  >
                    {row.name}
                  </Link>
                  <span
                    className={`text-[12.5px] font-semibold ${
                      row.stock === 0 ? 'text-accent3' : 'text-warn'
                    }`}
                  >
                    {row.stock} / {row.threshold}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="surface-card p-6 text-[13.5px] text-muted">{t.admin.lowStockEmpty}</p>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">{t.admin.topProductsTitle}</h2>
          {stats.topProducts.length ? (
            <ul className="surface-card divide-y divide-[rgba(16,24,48,.09)]">
              {stats.topProducts.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{row.name}</span>
                  <span className="text-[12.5px] text-faint">×{row.quantity}</span>
                  <span className="text-[12.5px] font-semibold">{price(row.revenue)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="surface-card p-6 text-[13.5px] text-muted">{t.admin.topProductsEmpty}</p>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">{t.admin.quickActions}</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/produits/nouveau" className="btn btn-primary">
            {t.admin.newProduct}
          </Link>
          <Link href="/admin/commandes?status=pending" className="btn btn-ghost">
            {t.admin.seePending}
          </Link>
          <Link href="/admin/stock?low=1" className="btn btn-ghost">
            {t.admin.lowStockTitle}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: string;
  href?: string;
  highlight?: boolean;
}) {
  const content = (
    <div
      className={`surface-card p-5 transition ${href ? 'hover:border-line2' : ''} ${
        highlight ? 'border-accent2' : ''
      }`}
    >
      <p className="text-[12px] uppercase tracking-[.05em] text-faint">{label}</p>
      <p className="t-h3 mt-2 break-words font-display font-bold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
