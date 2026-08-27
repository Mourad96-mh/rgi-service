'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Address, CheckoutQuote, ShippingMethod } from '@rgi/types';
import { FREE_DELIVERY_THRESHOLD, formatMad } from '@rgi/types';
import { api } from '@/lib/api';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { price } from '@/lib/format';
import { cartPayload, useCart } from '@/store/cart';
import { customerAccessToken, useCustomer } from '@/lib/account/session';
import { EmptyState } from '@/components/ui/Section';
import { Field, Choice } from './Field';

interface FormState {
  name: string;
  email: string;
  phone: string;
  method: ShippingMethod;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  notes: string;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  method: 'delivery',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  notes: '',
};

/**
 * Checkout. Nothing here computes money: the shipping cost and the total come from
 * `POST /checkout/quote`, and `POST /orders` re-prices the whole basket again before it
 * writes anything (DATA_MODEL.md §7).
 */
export function CheckoutForm() {
  const router = useRouter();
  const lines = useCart((state) => state.lines);
  const clear = useCart((state) => state.clear);
  const customer = useCustomer();

  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  /** Set once the account has filled the blanks, so it never does it twice. */
  const prefilled = useRef(false);

  // One key for the life of this form, so a double submit returns the first order.
  const idempotencyKey = useRef<string>('');
  if (!idempotencyKey.current) {
    idempotencyKey.current =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  useEffect(() => setMounted(true), []);

  /**
   * Fill the form from the account, once.
   *
   * Guarded by a ref rather than by the dependency list: the customer object changes
   * whenever the session cache is rewritten, and re-running this would overwrite whatever
   * the customer had typed since. Each field is only filled if still empty, so a returning
   * visitor who started typing before hydration keeps their own input.
   */
  useEffect(() => {
    if (!customer || prefilled.current) return;
    prefilled.current = true;
    const preferred =
      customer.addresses?.find((address) => address.isDefault) ?? customer.addresses?.[0];

    setForm((current) => ({
      ...current,
      name: current.name || customer.name,
      email: current.email || customer.email,
      phone: current.phone || customer.phone || preferred?.phone || '',
      ...(preferred && !current.line1
        ? {
            line1: preferred.line1,
            line2: preferred.line2 ?? '',
            city: preferred.city,
            postalCode: preferred.postalCode ?? '',
          }
        : {}),
    }));
  }, [customer]);

  /** Copy a saved address into the form when the customer picks one. */
  function applyAddress(address: Address) {
    setForm((current) => ({
      ...current,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      postalCode: address.postalCode ?? '',
      phone: current.phone || address.phone,
    }));
    setErrors({});
  }

  const payload = useMemo(() => cartPayload(lines), [lines]);
  const key = JSON.stringify(payload);

  useEffect(() => {
    if (!mounted || !payload.length) return undefined;
    let cancelled = false;
    api
      .checkoutQuote(payload, { method: form.method, city: form.city })
      .then((result) => {
        if (!cancelled) setQuote(result);
      })
      .catch(() => {
        /* the summary falls back to the line totals */
      });
    return () => {
      cancelled = true;
    };
  }, [key, mounted, payload, form.method, form.city]);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 3) next.name = t.checkout.required;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = t.checkout.invalidEmail;
    if (form.phone.replace(/\D/g, '').length < 9) next.phone = t.checkout.invalidPhone;
    if (form.method === 'delivery') {
      if (form.line1.trim().length < 5) next.line1 = t.checkout.required;
      if (form.city.trim().length < 2) next.city = t.checkout.required;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setApiError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const order = await api.createOrder(
        {
          contact: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
          },
          items: payload,
          shipping:
            form.method === 'pickup'
              ? { method: 'pickup' }
              : {
                  method: 'delivery',
                  address: {
                    line1: form.line1.trim(),
                    line2: form.line2.trim() || undefined,
                    city: form.city.trim(),
                    postalCode: form.postalCode.trim() || undefined,
                    phone: form.phone.trim(),
                    isDefault: false,
                  },
                },
          payment: { method: 'cod' },
          notes: form.notes.trim() || undefined,
        },
        idempotencyKey.current,
        // Attaches the order to the account, which is what puts it in « Mes commandes ».
        // Absent for a guest — and for a staff session, which is not a shopping account:
        // `customerAccessToken` returns null for anything but a customer.
        customerAccessToken() ?? undefined,
      );

      clear();
      router.push(routes.orderConfirmation(order.orderNumber, order.publicToken));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : t.common.error);
      setSubmitting(false);
    }
  }

  if (!mounted) return <div className="surface-card h-[320px] animate-pulse opacity-40" />;

  if (!lines.length) {
    return (
      <EmptyState
        title={t.checkout.emptyCart}
        action={
          <Link href={routes.home} className="btn btn-primary">
            {t.cart.emptyCta}
          </Link>
        }
      />
    );
  }

  const subtotal = quote?.subtotal ?? 0;
  const total = quote?.total ?? subtotal;

  return (
    <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <fieldset className="surface-card p-4 sm:p-6">
          <legend className="px-1 font-display text-[16px] font-bold sm:text-[17px]">
            {t.checkout.contactTitle}
          </legend>
          {customer ? (
            <p className="mt-2 text-[12.5px] text-faint">
              {t.account.checkoutSignedIn(customer.name)}
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t.checkout.name} value={form.name} error={errors.name} onChange={(v) => set('name', v)} autoComplete="name" />
            <Field label={t.checkout.email} value={form.email} error={errors.email} onChange={(v) => set('email', v)} type="email" autoComplete="email" />
            <Field label={t.checkout.phone} value={form.phone} error={errors.phone} onChange={(v) => set('phone', v)} type="tel" autoComplete="tel" help={t.checkout.phoneHelp} />
          </div>
        </fieldset>

        <fieldset className="surface-card p-4 sm:p-6">
          <legend className="px-1 font-display text-[16px] font-bold sm:text-[17px]">
            {t.checkout.shippingTitle}
          </legend>

          <div className="mt-4 grid gap-3 xs:grid-cols-2">
            <Choice
              checked={form.method === 'delivery'}
              onSelect={() => set('method', 'delivery')}
              title={t.checkout.methodDelivery}
              text={t.checkout.freeFrom(formatMad(FREE_DELIVERY_THRESHOLD))}
            />
            <Choice
              checked={form.method === 'pickup'}
              onSelect={() => set('method', 'pickup')}
              title={t.checkout.methodPickup}
              text={t.checkout.pickupNote}
            />
          </div>

          {form.method === 'delivery' ? (
            <>
              {/*
                Saved addresses fill the fields rather than replacing them: the customer can
                still correct a line before ordering, and the order stores its own snapshot
                either way, so a later edit to the address book never rewrites past orders.
              */}
              {customer?.addresses?.length ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="w-full text-[12px] text-muted">
                    {t.account.checkoutUseAddress}
                  </span>
                  {customer.addresses.map((address, index) => (
                    <button
                      key={`${address.line1}-${index}`}
                      type="button"
                      onClick={() => applyAddress(address)}
                      className="min-h-[36px] max-w-full truncate rounded-full border border-line px-3 text-[12.5px] text-muted transition hover:border-line2 hover:text-text"
                    >
                      {address.label || address.line1}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label={t.checkout.address1} value={form.line1} error={errors.line1} onChange={(v) => set('line1', v)} autoComplete="address-line1" />
                </div>
                <div className="sm:col-span-2">
                  <Field label={t.checkout.address2} value={form.line2} onChange={(v) => set('line2', v)} autoComplete="address-line2" optional />
                </div>
                <Field label={t.checkout.city} value={form.city} error={errors.city} onChange={(v) => set('city', v)} autoComplete="address-level2" />
                <Field label={t.checkout.postalCode} value={form.postalCode} onChange={(v) => set('postalCode', v)} autoComplete="postal-code" optional />
              </div>
            </>
          ) : null}
        </fieldset>

        <fieldset className="surface-card p-4 sm:p-6">
          <legend className="px-1 font-display text-[16px] font-bold sm:text-[17px]">
            {t.checkout.paymentTitle}
          </legend>
          <div className="mt-4 grid gap-3 xs:grid-cols-2">
            <Choice checked onSelect={() => undefined} title={t.checkout.cod} text={t.checkout.codNote} />
            {/* CMI needs the client's merchant credentials; the API refuses card orders
                until they exist, so the option is shown but not selectable. */}
            <Choice checked={false} disabled onSelect={() => undefined} title={t.checkout.cmi} text={t.checkout.cmiSoon} />
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12.5px] text-muted">{t.checkout.notes}</span>
            <textarea
              value={form.notes}
              onChange={(event) => set('notes', event.target.value)}
              rows={3}
              maxLength={500}
              className="field resize-y"
            />
          </label>
        </fieldset>
      </div>

      <aside className="surface-card p-4 sm:p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-bold">{t.checkout.summaryTitle}</h2>

        <details className="group mt-4 border-b border-line pb-4" open={lines.length <= 3}>
          <summary className="flex min-h-[36px] cursor-pointer list-none items-center justify-between gap-3 text-[13px] text-muted marker:content-none">
            <span>{t.cart.line(lines.reduce((sum, line) => sum + line.quantity, 0))}</span>
            <span aria-hidden className="text-faint transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <ul className="mt-3 flex flex-col gap-2 text-[13px]">
            {lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-muted">
                  {line.quantity} × {line.kind === 'build' ? t.cart.buildLine : line.name}
                </span>
                <span className="shrink-0 font-semibold">
                  {price(line.unitPrice * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </details>

        <dl className="mt-4 flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.cart.subtotal}</dt>
            <dd className="font-semibold">{price(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.cart.shipping}</dt>
            <dd className="font-semibold">
              {quote ? (quote.shippingCost === 0 ? 'Offerte' : price(quote.shippingCost)) : '—'}
            </dd>
          </div>
          <div className="mt-1 flex items-end justify-between border-t border-line pt-3">
            <dt className="text-muted">{t.cart.total}</dt>
            <dd className="grad-text t-h3 font-display font-bold">{price(total)}</dd>
          </div>
        </dl>

        {quote?.notes.length ? (
          <ul className="mt-4 flex flex-col gap-1.5 text-[12px] text-faint">
            {quote.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}

        {apiError ? (
          <p role="alert" className="mt-4 rounded-sm2 border border-accent3 px-3 py-2.5 text-[12.5px] text-accent3">
            {apiError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary mt-5 w-full justify-center disabled:opacity-50"
        >
          {submitting ? t.checkout.submitting : t.checkout.submit}
        </button>

        <Link href={routes.cart} className="mt-3 block text-center text-[12.5px] text-faint hover:text-text">
          {t.cart.title}
        </Link>
      </aside>
    </form>
  );
}
