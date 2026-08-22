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
        <h1 className="t-h1 font-display font-bold">{t.admin.ordersTitle}</h1>
        <p className="text-[13px] text-faint">{orders.total} au total</p>
      </div>

      <OrderFilters current={searchParams} />

      {orders.data.length ? (
        <>
          {/*
           * Below `lg` each order is a card rather than a row: the six columns do not fit
           * a phone, and an order is most often opened, not compared. The whole card is
           * the link the order number is in the table.
           */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {orders.data.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/commandes/${order.id}`}
                  className="surface-card flex flex-col gap-3 p-4 transition hover:border-line2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[12.5px] text-accent2">
                      {order.orderNumber}
                    </span>
                    <span className="text-[12px] text-muted">{orderDate(order.createdAt)}</span>
                  </div>

                  <div className="min-w-0">
                    <span className="block truncate font-semibold">{order.contact.name}</span>
                    <span className="text-[11.5px] text-faint">{order.contact.phone}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={order.status} />
                    <PaymentPill status={order.payment.status} />
                    <span className="ml-auto font-display text-[15px] font-bold">
                      {price(order.total)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="surface-card hidden overflow-x-auto lg:block">
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
                      {orderDate(order.createdAt)}
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
                    className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border px-3 text-[13px] sm:min-h-[34px] sm:min-w-0 sm:py-1.5 sm:text-[12.5px] ${
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
        <p className="surface-card p-6 text-center text-[13.5px] text-muted sm:p-8">
          {t.admin.ordersEmpty}
        </p>
      )}
    </div>
  );
}

/** One date format for the phone card and the desktop row alike. */
function orderDate(value: string | undefined): string {
  return value
    ? new Date(value).toLocaleDateString('fr-MA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th className={`px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : ''}`}>
      {children}
    </th>
  );
}
