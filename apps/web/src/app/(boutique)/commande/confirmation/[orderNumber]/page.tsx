import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { Order } from '@rgi/types';
import { ORDER_STATUS_LABEL_FR, PAYMENT_STATUS_LABEL_FR } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { price } from '@/lib/format';
import { EmptyState } from '@/components/ui/Section';
import { CheckIcon } from '@/components/ui/Icons';

export const metadata: Metadata = {
  title: 'Commande confirmée',
  robots: { index: false, follow: false },
};

/** Always fresh: an order's status changes after it is placed. */
export const dynamic = 'force-dynamic';

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: { orderNumber: string };
  searchParams: { token?: string };
}) {
  // Guests read their own order with the token issued at checkout — order numbers are
  // sequential, so the number alone must not be enough.
  const query = searchParams.token ? `?token=${encodeURIComponent(searchParams.token)}` : '';
  const order = await apiFetchOrNull<Order>(`/orders/${params.orderNumber}${query}`, {
    revalidate: 0,
  });

  if (!order) {
    return (
      <div className="wrap py-16">
        <EmptyState
          title={t.order.notFound}
          action={
            <Link href={routes.home} className="btn btn-primary">
              {t.order.backHome}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="wrap py-12">
      <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-success">
        <CheckIcon className="h-4 w-4" />
        {ORDER_STATUS_LABEL_FR[order.status]}
      </span>

      <h1 className="mt-5 font-display text-[clamp(26px,4.5vw,36px)] font-bold">
        {t.order.confirmedTitle}
      </h1>
      <p className="mt-3 max-w-[60ch] text-[15px] text-muted">{t.order.confirmedText}</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">{t.order.items}</h2>
          <ul className="flex flex-col gap-2.5">
            {order.items.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="surface-card flex items-center gap-4 p-3.5"
              >
                <span className="photo-tile relative h-[60px] w-[60px] shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt="" fill sizes="60px" className="object-contain p-1.5" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">{item.name}</span>
                  <span className="text-[12px] text-faint">
                    {item.quantity} × {price(item.unitPrice)}
                    {item.build ? ` · ${item.build.items.length} composants` : ''}
                  </span>
                </span>
                <span className="font-display text-[15px] font-bold">{price(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="surface-card p-6 lg:sticky lg:top-24">
          <dl className="flex flex-col gap-3 text-sm">
            <Row label={t.order.number} value={order.orderNumber} mono />
            <Row label={t.order.status} value={ORDER_STATUS_LABEL_FR[order.status]} />
            <Row
              label={t.order.payment}
              value={`${order.payment.method === 'cod' ? t.checkout.cod : t.checkout.cmi} · ${
                PAYMENT_STATUS_LABEL_FR[order.payment.status]
              }`}
            />
            <Row
              label={order.shipping.method === 'pickup' ? t.order.pickup : t.order.deliveryTo}
              value={
                order.shipping.method === 'pickup'
                  ? t.checkout.pickupNote
                  : `${order.shipping.address?.line1 ?? ''}, ${order.shipping.address?.city ?? ''}`
              }
            />
          </dl>

          <dl className="mt-5 flex flex-col gap-2.5 border-t border-line pt-4 text-sm">
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
            <div className="mt-1 flex items-end justify-between border-t border-line pt-3">
              <dt className="text-muted">{t.cart.total}</dt>
              <dd className="grad-text font-display text-[24px] font-bold">
                {price(order.total)}
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-[12px] text-faint">{t.order.keepLink}</p>
          <Link href={routes.home} className="btn btn-ghost mt-4 w-full justify-center">
            {t.order.backHome}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right font-semibold ${mono ? 'font-mono text-[13px]' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
