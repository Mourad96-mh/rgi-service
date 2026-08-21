import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Order } from '@rgi/types';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABEL_FR } from '@rgi/types';
import { t } from '@/locales/fr';
import { price } from '@/lib/format';
import { adminFetch, AdminApiError } from '@/lib/admin/session';
import { PaymentPill, StatusPill } from '@/components/admin/StatusPill';
import { OrderActions } from '@/components/admin/OrderActions';

export const metadata = { title: t.admin.orderDetail };

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  let order: Order;
  try {
    order = await adminFetch<Order>(`/admin/orders/${params.id}`);
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/commandes" className="text-[12.5px] text-faint hover:text-text">
          ← {t.admin.ordersTitle}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-[22px] font-bold">{order.orderNumber}</h1>
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
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="photo-tile relative h-[58px] w-[58px] shrink-0">
                      {item.image ? (
                        <Image src={item.image} alt="" fill sizes="58px" className="object-contain p-1.5" />
                      ) : null}
                    </span>
                    <span className="min-w-[160px] flex-1">
                      <span className="block text-[14px] font-semibold">{item.name}</span>
                      <span className="text-[12px] text-faint">
                        {item.quantity} × {price(item.unitPrice)}
                      </span>
                    </span>
                    <span className="font-display text-[15px] font-bold">
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
            <ol className="surface-card divide-y divide-[rgba(255,255,255,.06)]">
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
                <dd className="grad-text font-display text-[20px] font-bold">
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
          />
        </aside>
      </div>
    </div>
  );
}
