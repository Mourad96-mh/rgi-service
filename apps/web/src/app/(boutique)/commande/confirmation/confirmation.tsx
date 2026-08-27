'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Order } from '@rgi/types';
import { ORDER_STATUS_LABEL_FR, PAYMENT_STATUS_LABEL_FR } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { price } from '@/lib/format';
import { EmptyState } from '@/components/ui/Section';
import { CheckIcon, WhatsAppIcon } from '@/components/ui/Icons';
import { orderWhatsappUrl } from '@/lib/order-whatsapp';

/**
 * The order is fetched in the browser, from `?commande=…&token=…`.
 *
 * It cannot be a path segment on a static host: `/commande/confirmation/RGI-2026-0042`
 * would have to exist as a file, and the order did not exist when the site was built. The
 * page is `noindex` anyway, so nothing is owed to a crawler here.
 */
export function OrderConfirmation() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('commande') ?? '';
  const token = searchParams.get('token') ?? '';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    // Guests read their own order with the token issued at checkout — order numbers are
    // sequential, so the number alone must not be enough.
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    apiFetchOrNull<Order>(`/orders/${encodeURIComponent(orderNumber)}${query}`, {
      revalidate: 0,
    }).then((found) => {
      if (cancelled) return;
      setOrder(found);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [orderNumber, token]);

  if (loading) {
    return (
      <div className="wrap py-12 sm:py-16">
        <div className="surface-card h-40 animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="wrap py-12 sm:py-16">
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
    <div className="wrap py-8 sm:py-12">
      <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-success">
        <CheckIcon className="h-4 w-4" />
        {ORDER_STATUS_LABEL_FR[order.status]}
      </span>

      <h1 className="t-h1 mt-5 font-display font-bold">
        {t.order.confirmedTitle}
      </h1>
      <p className="mt-3 max-w-[60ch] text-[15px] text-muted">{t.order.confirmedText}</p>

      {/*
        The order is already saved by the time this renders — this only hands the shop a
        copy on WhatsApp, from the customer's own account, and only if they press Send.
        It sits above the fold and before the recap because that is the one moment the
        customer is still looking at the screen; buried under the totals it goes unused.
      */}
      <div className="surface-card mt-6 flex flex-col gap-3 border-[#25D366]/35 bg-[#25D366]/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
        <p className="max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
          {t.order.whatsappHint}
        </p>
        <a
          href={orderWhatsappUrl(order)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.order.whatsappAria}
          className="flex min-h-[46px] shrink-0 items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-5 text-[14px] font-semibold text-[#0e1220] shadow-[0_10px_24px_-10px_rgba(16,24,48,.45)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
        >
          <WhatsAppIcon className="h-[20px] w-[20px]" />
          {t.order.whatsappCta}
        </a>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">{t.order.items}</h2>
          <ul className="flex flex-col gap-2.5">
            {order.items.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="surface-card grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 p-3.5 xs:flex xs:gap-4"
              >
                <span className="photo-tile relative h-[54px] w-[54px] shrink-0 xs:h-[60px] xs:w-[60px]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(min-width:400px) 60px, 54px"
                      className="object-contain p-1.5"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 xs:flex-1">
                  <span className="block text-[14px] font-semibold leading-snug">{item.name}</span>
                  <span className="text-[12px] text-faint">
                    {item.quantity} × {price(item.unitPrice)}
                    {item.build ? ` · ${item.build.items.length} composants` : ''}
                  </span>
                </span>
                <span className="col-span-2 text-right font-display text-[15px] font-bold xs:col-auto xs:text-left">
                  {price(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="surface-card p-4 sm:p-6 lg:sticky lg:top-24">
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
                {order.shipping.cost === 0 ? t.cart.shippingFree : price(order.shipping.cost)}
              </dd>
            </div>
            <div className="mt-1 flex items-end justify-between border-t border-line pt-3">
              <dt className="text-muted">{t.cart.total}</dt>
              <dd className="grad-text t-h3 font-display font-bold">
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
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`min-w-0 text-right font-semibold ${mono ? 'font-mono text-[13px]' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
