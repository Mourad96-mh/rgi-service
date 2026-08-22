'use client';

import { useState, useTransition } from 'react';
import type { OrderStatus, PaymentStatus } from '@rgi/types';
import { ORDER_STATUS_LABEL_FR, PAYMENT_STATUS_LABEL_FR } from '@rgi/types';
import { t } from '@/locales/fr';
import { setOrderStatus, setPaymentStatus } from '@/app/admin/(shell)/commandes/actions';

const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

/**
 * Status buttons. Only the transitions the shared `ORDER_STATUS_FLOW` allows are offered,
 * so staff cannot reach an impossible state — and cancelling asks first, because it puts
 * the whole order back into stock.
 */
export function OrderActions({
  id,
  status,
  paymentStatus,
  nextStatuses,
}: {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  nextStatuses: OrderStatus[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);

  function move(next: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setOrderStatus(id, next);
      if (!result.ok) setError(result.message ?? t.common.error);
      setConfirming(null);
    });
  }

  return (
    <div className="surface-card flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-[.05em] text-faint">
          {t.admin.changeStatus}
        </h3>

        {nextStatuses.length ? (
          <div className="mt-3 flex flex-col gap-2">
            {nextStatuses.map((next) =>
              confirming === next ? (
                <div key={next} className="rounded-sm2 border border-accent3 p-3">
                  <p className="text-[12.5px] text-accent3">{t.admin.cancelWarning}</p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => move(next)}
                      className="btn btn-primary !px-3 !py-1.5 !text-[12.5px]"
                    >
                      {ORDER_STATUS_LABEL_FR[next]}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="btn btn-ghost !px-3 !py-1.5 !text-[12.5px]"
                    >
                      {t.common.close}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={next}
                  type="button"
                  disabled={pending}
                  onClick={() => (next === 'cancelled' ? setConfirming(next) : move(next))}
                  className={`btn justify-center !py-2.5 !text-[13px] ${
                    next === 'cancelled' ? 'btn-ghost !text-accent3' : 'btn-primary'
                  } disabled:opacity-50`}
                >
                  {ORDER_STATUS_LABEL_FR[next]}
                </button>
              ),
            )}
          </div>
        ) : (
          <p className="mt-2 text-[12.5px] text-faint">{t.admin.noTransition}</p>
        )}
      </div>

      <div className="border-t border-line pt-4">
        <h3 className="text-[13px] font-bold uppercase tracking-[.05em] text-faint">
          {t.admin.changePayment}
        </h3>
        <select
          value={paymentStatus}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as PaymentStatus;
            setError(null);
            startTransition(async () => {
              const result = await setPaymentStatus(id, next);
              if (!result.ok) setError(result.message ?? t.common.error);
            });
          }}
          className="field mt-3"
        >
          {PAYMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PAYMENT_STATUS_LABEL_FR[value]}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p role="alert" className="text-[12.5px] text-accent3">
          {error}
        </p>
      ) : null}
      <p className="text-[11.5px] text-faint">
        {t.admin.orderStatus} : {ORDER_STATUS_LABEL_FR[status]}
      </p>
    </div>
  );
}
