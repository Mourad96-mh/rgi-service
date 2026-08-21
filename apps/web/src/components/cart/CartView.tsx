'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { CartValidationResult } from '@rgi/types';
import { api } from '@/lib/api';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { price } from '@/lib/format';
import { cartPayload, useCart, type CartLine } from '@/store/cart';
import { EmptyState } from '@/components/ui/Section';

/**
 * The basket, re-priced by the API on every change.
 *
 * The prices shown are the ones `/cart/validate` just returned, not the snapshot taken
 * when the line was added — a flash deal that ended, or a part that sold out while the tab
 * was open, has to be visible here rather than at the payment step.
 */
export function CartView() {
  const lines = useCart((state) => state.lines);
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);

  const [mounted, setMounted] = useState(false);
  const [validation, setValidation] = useState<CartValidationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const payload = useMemo(() => cartPayload(lines), [lines]);
  const key = JSON.stringify(payload);

  useEffect(() => {
    if (!mounted || !payload.length) {
      setValidation(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    setError(null);
    api
      .validateCart(payload)
      .then((result) => {
        if (!cancelled) setValidation(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : t.common.error);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
    // `key` is the payload's identity: ids and quantities, nothing else.
     
  }, [key, mounted]);

  if (!mounted) return <div className="surface-card h-[220px] animate-pulse opacity-40" />;

  if (!lines.length) {
    return (
      <EmptyState
        title={t.cart.empty}
        action={
          <Link href={routes.home} className="btn btn-primary">
            {t.cart.emptyCta}
          </Link>
        }
      />
    );
  }

  const priced = validation?.lines ?? [];
  const subtotal = validation?.subtotal ?? 0;
  const blocked = !validation?.isValid;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
      <ul className="flex flex-col gap-3">
        {lines.map((line, index) => (
          <CartRow
            key={line.id}
            line={line}
            server={priced[index]}
            onQuantity={(quantity) => setQuantity(line.id, quantity)}
            onRemove={() => remove(line.id)}
          />
        ))}
      </ul>

      <aside className="surface-card p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-bold">{t.cart.title}</h2>
        <p className="mt-1 text-[12.5px] text-faint">
          {t.cart.line(lines.reduce((sum, line) => sum + line.quantity, 0))}
        </p>

        <dl className="mt-5 flex flex-col gap-2.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.cart.subtotal}</dt>
            <dd className="font-semibold">{price(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.cart.shipping}</dt>
            <dd className="text-[12.5px] text-faint">{t.cart.shippingLater}</dd>
          </div>
        </dl>

        {checking ? (
          <p className="mt-4 text-[12.5px] text-faint">{t.cart.revalidating}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 text-[12.5px] text-accent3">
            {error}
          </p>
        ) : null}

        <Link
          href={routes.checkout}
          aria-disabled={blocked}
          className={`btn btn-primary mt-5 w-full justify-center ${
            blocked ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          {t.cart.checkout}
        </Link>
        <Link href={routes.home} className="mt-3 block text-center text-[12.5px] text-faint hover:text-text">
          {t.cart.continue}
        </Link>
      </aside>
    </div>
  );
}

function CartRow({
  line,
  server,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  server?: CartValidationResult['lines'][number];
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const unit = server?.unitPrice ?? line.unitPrice;
  const image = server?.image ?? line.image;
  const name = line.kind === 'build' ? t.cart.buildLine : (server?.name ?? line.name);

  return (
    <li className={`surface-card p-4 ${server?.problem ? 'border-accent3' : ''}`}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="photo-tile relative h-[72px] w-[72px] shrink-0">
          {image ? (
            <Image src={image} alt="" fill sizes="72px" className="object-contain p-1.5" />
          ) : null}
        </span>

        <div className="min-w-[160px] flex-1">
          {line.kind === 'build' ? (
            <>
              <span className="block text-[14px] font-semibold">{name}</span>
              <span className="text-[12px] text-faint">
                {t.cart.buildParts(Object.values(line.buildSelection ?? {}).flat().length)}
              </span>
            </>
          ) : (
            <Link
              href={line.slug ? routes.product(line.slug) : routes.cart}
              className="text-[14px] font-semibold transition hover:text-accent2"
            >
              {name}
            </Link>
          )}
          <span className="mt-1 block text-[12px] text-faint">
            {t.cart.unitPrice} : {price(unit)}
          </span>
        </div>

        {/* 44px on touch screens: 32px steppers are hard to hit with a thumb. */}
        <div className="flex items-center gap-1 rounded-sm2 border border-line bg-bg2 p-1">
          <button
            type="button"
            aria-label={t.product.decrease}
            onClick={() => onQuantity(line.quantity - 1)}
            className="grid h-11 w-11 place-items-center rounded-md text-[17px] text-muted hover:bg-white/[.06] hover:text-text sm:h-8 sm:w-8 sm:text-base"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center text-sm font-semibold">{line.quantity}</span>
          <button
            type="button"
            aria-label={t.product.increase}
            onClick={() => onQuantity(line.quantity + 1)}
            className="grid h-11 w-11 place-items-center rounded-md text-[17px] text-muted hover:bg-white/[.06] hover:text-text sm:h-8 sm:w-8 sm:text-base"
          >
            +
          </button>
        </div>

        <span className="font-display text-[16px] font-bold">
          {price(server?.lineTotal ?? unit * line.quantity)}
        </span>

        <button
          type="button"
          onClick={onRemove}
          className="text-[12px] text-faint transition hover:text-accent3"
        >
          {t.cart.remove}
        </button>
      </div>

      {server?.problem ? (
        <p className="mt-3 text-[12.5px] font-semibold text-accent3">{server.problem}</p>
      ) : null}
    </li>
  );
}
