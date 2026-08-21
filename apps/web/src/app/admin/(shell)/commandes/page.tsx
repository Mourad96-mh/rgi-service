import Link from 'next/link';
import type { Order, OrderStatus, Paginated, PaymentStatus } from '@rgi/types';
import { ORDER_STATUS_LABEL_FR, PAYMENT_STATUS_LABEL_FR } from '@rgi/types';
import { t } from '@/locales/fr';
import { price } from '@/lib/format';
import { adminFetch } from '@/lib/admin/session';
import { PaymentPill, StatusPill } from '@/components/admin/StatusPill';
import { OrderFilters } from '@/components/admin/OrderFilters';

export const metadata = { title: t.admin.ordersTitle };

type Search = { status?: OrderStatus; payment?: PaymentStatus; q?: string; page?: string };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Search }) {
  const query = new URLSearchParams({ limit: '20' });
  if (searchParams.status) query.set('status', searchParams.status);
  if (searchParams.payment) query.set('paymentStatus', searchParams.payment);
  if (searchParams.q) query.set('q', searchParams.q);
  if (searchParams.page) query.set('page', searchParams.page);

  const orders = await adminFetch<Paginated<Order>>(`/admin/orders?${query.toString()}`);
  const pages = Math.max(1, Math.ceil(orders.total / orders.limit));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[26px] font-bold">{t.admin.ordersTitle}</h1>
        <p className="text-[13px] text-faint">{orders.total} au total</p>
      </div>

      <OrderFilters current={searchParams} />

      {orders.data.length ? (
        <>
          <div className="surface-card overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead className="border-b border-line text-[11.5px] uppercase tracking-[.05em] text-faint">
                <tr>
                  <Th>{t.admin.orderNumber}</Th>
                  <Th>{t.admin.customer}</Th>
                  <Th>{t.admin.date}</Th>
                  <Th>{t.admin.orderStatus}</Th>
                  <Th>{t.admin.paymentStatus}</Th>
                  <Th align="right">{t.admin.amount}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,.06)]">
                {orders.data.map((order) => (
                  <tr key={order.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/commandes/${order.id}`}
                        className="font-mono text-[12.5px] text-accent2 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-semibold">{order.contact.name}</span>
                      <span className="text-[11.5px] text-faint">{order.contact.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-muted">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString('fr-MA', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentPill status={order.payment.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-display font-bold">
                      {price(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 ? (
            <nav className="flex flex-wrap gap-2" aria-label="Pagination">
              {Array.from({ length: pages }, (_, index) => index + 1).map((page) => {
                const params = new URLSearchParams(
                  Object.entries(searchParams).filter(([, value]) => value) as [string, string][],
                );
                params.set('page', String(page));
                const active = page === orders.page;
                return (
                  <Link
                    key={page}
                    href={`/admin/commandes?${params.toString()}`}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-md border px-3 py-1.5 text-[12.5px] ${
                      active ? 'border-accent2 text-text' : 'border-line text-muted hover:text-text'
                    }`}
                  >
                    {page}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </>
      ) : (
        <p className="surface-card p-8 text-center text-[13.5px] text-muted">
          {t.admin.ordersEmpty}
        </p>
      )}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th className={`px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : ''}`}>
      {children}
    </th>
  );
}
