'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Order } from '@rgi/types';
import { ORDER_STATUS_LABEL_FR } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { price } from '@/lib/format';
import { myOrders, SessionExpiredError } from '@/lib/account/session';

/** `listForUser` returns the token too, which is what makes the tracking link work. */
type OwnOrder = Order & { publicToken?: string };

export function OrdersPane({ onExpired }: { onExpired: () => void }) {
  const [orders, setOrders] = useState<OwnOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    myOrders()
      .then((result) => {
        if (!cancelled) setOrders(result as OwnOrder[]);
      })
      .catch((cause) => {
        if (cancelled) return;
        if (cause instanceof SessionExpiredError) onExpired();
        else setError(cause instanceof Error ? cause.message : t.common.error);
      });
    return () => {
      cancelled = true;
    };
  }, [onExpired]);

  if (error) {
    return (
      <p role="alert" className="text-[13px] text-accent3">
        {error}
      </p>
    );
  }

  if (!orders) {
    return <div className="surface-card h-[140px] animate-pulse opacity-40" />;
  }

  if (!orders.length) {
    return (
      <div className="surface-card p-5 text-center">
        <p className="text-[14px] font-semibold">{t.account.ordersEmpty}</p>
        <p className="mx-auto mt-2 max-w-[46ch] text-[12.5px] text-faint">
          {t.account.ordersGuestNote}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => (
        <li key={order.id} className="surface-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="font-mono text-[13.5px] font-bold">{order.orderNumber}</span>
            <span className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-muted">
              {ORDER_STATUS_LABEL_FR[order.status]}
            </span>
          </div>

          <p className="mt-1.5 text-[12px] text-faint">
            {t.account.orderPlaced}{' '}
            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-MA') : '—'} ·{' '}
            {t.account.orderItems(order.items.length)}
          </p>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
            <span className="font-display text-[16px] font-bold">{price(order.total)}</span>
            <Link
              href={routes.orderConfirmation(order.orderNumber, order.publicToken)}
              className="text-[12.5px] text-accent2 hover:underline"
            >
              {t.account.orderView}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
