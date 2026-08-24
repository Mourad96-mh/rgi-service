'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import type { Order } from '@rgi/types';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABEL_FR } from '@rgi/types';
import { t } from '@/locales/fr';
import { price } from '@/lib/format';
import { adminFetch, AdminApiError } from '@/lib/admin/session';
import { useAdminData } from '@/lib/admin/useAdminData';
import { AdminError, AdminLoading } from '@/components/admin/AdminState';
import { PaymentPill, StatusPill } from '@/components/admin/StatusPill';
import { OrderActions } from '@/components/admin/OrderActions';

export function OrderDetailView() {
  const id = useSearchParams().get('id');

  const { data, error, loading, reload } = useAdminData<Order | null>(async () => {
    if (!id) return null;
    try {
      return await adminFetch<Order>(`/admin/orders/${id}`);
    } catch (cause) {
      // `notFound()` needed a server. A missing order is now an ordinary empty state.
      if (cause instanceof AdminApiError && cause.status === 404) return null;
      throw cause;
    }
  }, [id]);

  if (loading) return <AdminLoading rows={3} />;
  if (error) return <AdminError message={error} onRetry={reload} />;

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/admin/commandes" className="text-[12.5px] text-faint hover:text-text">
          ← {t.admin.ordersTitle}
        </Link>
        <AdminError message={t.admin.orderNotFound} />
      </div>
    );
  }

  const order = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/commandes" className="text-[12.5px] text-faint hover:text-text">
          ← {t.admin.ordersTitle}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="t-h3 min-w-0 break-all font-mono font-bold">{order.orderNumber}</h1>
          <StatusPill status={order.status} />
          <PaymentPill status={order.payment.status} />
        </div>
        <p className="mt-1 text-[12.5px] text-faint">
          {order.createdAt ? new Date(order.createdAt).toLocaleString('fr-MA') : ''}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">{t.admin.orderItems}</h2>
            <ul className="flex flex-col gap-2.5">
              {order.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="surface-card p-4">
                  <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 xs:flex xs:flex-wrap xs:gap-4">
                    <span className="photo-tile relative h-[52px] w-[52px] shrink-0 xs:h-[58px] xs:w-[58px]">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          sizes="(min-width:400px) 58px, 52px"
                          className="object-contain p-1.5"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 xs:min-w-[160px] xs:flex-1">
                      <span className="block text-[14px] font-semibold leading-snug">{item.name}</span>
                      <span className="text-[12px] text-faint">
                        {item.quantity} × {price(item.unitPrice)}
                      </span>
                    </span>
                    <span className="col-span-2 text-right font-display text-[15px] font-bold xs:col-auto xs:text-left">
                      {price(item.lineTotal)}
                    </span>
                  </div>

                  {item.build ? (
                    <details className="mt-3 border-t border-line pt-3">
                      <summary className="cursor-pointer text-[12.5px] text-accent2">
                        {t.admin.buildParts} ({item.build.items.length})
                      </summary>
                      <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] text-muted">
                        {item.build.items.map((part) => (
                          <li key={`${part.slot}-${part.product}`} className="flex justify-between gap-4">
                            <span>
                              <span className="text-faint">{part.slot}</span> · {part.name}
                            </span>
                            <span>{price(part.priceAtBuild)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="surface-card p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-[.05em] text-faint">
                {t.admin.orderContact}
              </h3>
              <p className="mt-2 text-[14px] font-semibold">{order.contact.name}</p>
              <p className="text-[13px] text-muted">{order.contact.email}</p>
              <p className="text-[13px] text-muted">{order.contact.phone}</p>
            </div>

            <div className="surface-card p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-[.05em] text-faint">
                {t.admin.orderShipping}
              </h3>
              {order.shipping.method === 'pickup' ? (
                <p className="mt-2 text-[13.5px]">{t.checkout.methodPickup}</p>
              ) : (
                <>
                  <p className="mt-2 text-[13.5px]">{order.shipping.address?.line1}</p>
                  {order.shipping.address?.line2 ? (
                    <p className="text-[13px] text-muted">{order.shipping.address.line2}</p>
                  ) : null}
                  <p className="text-[13px] text-muted">
                    {order.shipping.address?.postalCode} {order.shipping.address?.city}
                  </p>
                </>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold">{t.admin.orderHistory}</h2>
            <ol className="surface-card divide-y divide-[rgba(16,24,48,.09)]">
              {order.statusHistory.map((entry) => (
                <li key={`${entry.status}-${entry.at}`} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-[13px]">{ORDER_STATUS_LABEL_FR[entry.status]}</span>
                  <span className="text-[12px] text-faint">
                    {new Date(entry.at).toLocaleString('fr-MA')}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div className="surface-card p-5">
            <h3 className="text-[13px] font-bold uppercase tracking-[.05em] text-faint">
              {t.admin.orderTotals}
            </h3>
            <dl className="mt-3 flex flex-col gap-2 text-[13.5px]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t.cart.subtotal}</dt>
                <dd className="font-semibold">{price(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t.cart.shipping}</dt>
                <dd className="font-semibold">
                  {order.shipping.cost === 0 ? 'Offerte' : price(order.shipping.cost)}
                </dd>
              </div>
              <div className="mt-1 flex items-end justify-between border-t border-line pt-2.5">
                <dt className="text-muted">{t.cart.total}</dt>
                <dd className="grad-text t-h4 font-display font-bold">
                  {price(order.total)}
                </dd>
              </div>
            </dl>
          </div>

          <OrderActions
            id={order.id}
            status={order.status}
            paymentStatus={order.payment.status}
            nextStatuses={ORDER_STATUS_FLOW[order.status]}
            onDone={reload}
          />
        </aside>
      </div>
    </div>
  );
}
