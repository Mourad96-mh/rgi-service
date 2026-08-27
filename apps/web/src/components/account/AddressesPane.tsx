'use client';

import { useState } from 'react';
import type { Address, User } from '@rgi/types';
import { t } from '@/locales/fr';
import { saveAddresses, SessionExpiredError } from '@/lib/account/session';
import { Field } from '@/components/checkout/Field';

/** Mirrors the API's `MAX_ADDRESSES`; the server refuses more whatever this says. */
const MAX_ADDRESSES = 5;

const EMPTY: Address = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  phone: '',
  isDefault: false,
};

/**
 * The address book.
 *
 * Every edit sends the whole list (see the API's `UpdateAddressesDto`), so this component
 * builds the next list locally and hands it over in one call — add, edit, delete and
 * "make default" are all the same write. The list that comes back is the one the server
 * normalised, so what is on screen is always what is stored.
 */
export function AddressesPane({
  customer,
  onExpired,
}: {
  customer: User;
  onExpired: () => void;
}) {
  const addresses = customer.addresses ?? [];
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Address>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit(next: Address[]) {
    setPending(true);
    setError(null);
    try {
      // No callback back to the parent: the session store is updated by `saveAddresses`
      // and every subscriber — this pane included — re-renders with the saved list.
      await saveAddresses(next);
      setEditing(null);
      setDraft(EMPTY);
    } catch (cause) {
      if (cause instanceof SessionExpiredError) onExpired();
      else setError(cause instanceof Error ? cause.message : t.common.error);
    } finally {
      setPending(false);
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof Address, string>> = {};
    if (draft.line1.trim().length < 5) next.line1 = t.checkout.required;
    if (draft.city.trim().length < 2) next.city = t.checkout.required;
    if (draft.phone.replace(/\D/g, '').length < 9) next.phone = t.checkout.invalidPhone;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    const clean: Address = {
      ...draft,
      label: draft.label?.trim() || undefined,
      line1: draft.line1.trim(),
      line2: draft.line2?.trim() || undefined,
      city: draft.city.trim(),
      postalCode: draft.postalCode?.trim() || undefined,
      phone: draft.phone.trim(),
      // The first address saved is the default; after that the customer chooses.
      isDefault: draft.isDefault || addresses.length === 0,
    };

    const next =
      editing === 'new'
        ? [...addresses, clean]
        : addresses.map((address, index) => (index === editing ? clean : address));

    void commit(next);
  }

  function set<K extends keyof Address>(field: K, value: Address[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return (
    <div className="flex flex-col gap-4">
      {addresses.length ? (
        <ul className="flex flex-col gap-3">
          {addresses.map((address, index) => (
            <li key={`${address.line1}-${index}`} className="surface-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {address.label ? (
                    <p className="text-[13.5px] font-semibold">{address.label}</p>
                  ) : null}
                  <p className="text-[13.5px]">{address.line1}</p>
                  {address.line2 ? (
                    <p className="text-[12.5px] text-muted">{address.line2}</p>
                  ) : null}
                  <p className="text-[12.5px] text-muted">
                    {[address.city, address.postalCode].filter(Boolean).join(' ')}
                  </p>
                  <p className="mt-1 text-[12.5px] text-faint">{address.phone}</p>
                </div>

                {address.isDefault ? (
                  <span className="rounded-full border border-accent2 px-2.5 py-1 text-[11px] text-accent2">
                    {t.account.addressDefault}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 text-[12.5px]">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setEditing(index);
                    setDraft(address);
                    setErrors({});
                  }}
                  className="text-accent2 hover:underline disabled:opacity-50"
                >
                  {t.account.addressEdit}
                </button>

                {!address.isDefault ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      void commit(
                        addresses.map((entry, i) => ({ ...entry, isDefault: i === index })),
                      )
                    }
                    className="text-muted hover:text-text disabled:opacity-50"
                  >
                    {t.account.addressSetDefault}
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void commit(addresses.filter((_, i) => i !== index))}
                  className="text-accent3 hover:underline disabled:opacity-50"
                >
                  {t.account.addressDelete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="surface-card p-5 text-center text-[13.5px] text-muted">
          {t.account.addressesEmpty}
        </p>
      )}

      {error ? (
        <p role="alert" className="text-[12.5px] text-accent3">
          {error}
        </p>
      ) : null}

      {editing !== null ? (
        <form onSubmit={submit} className="surface-card flex flex-col gap-4 p-4 sm:p-6">
          <Field
            label={t.account.addressLabel}
            value={draft.label ?? ''}
            onChange={(v) => set('label', v)}
            help={t.account.addressLabelHelp}
            optional
          />
          <Field
            label={t.checkout.address1}
            value={draft.line1}
            error={errors.line1}
            onChange={(v) => set('line1', v)}
            autoComplete="address-line1"
          />
          <Field
            label={t.checkout.address2}
            value={draft.line2 ?? ''}
            onChange={(v) => set('line2', v)}
            autoComplete="address-line2"
            optional
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t.checkout.city}
              value={draft.city}
              error={errors.city}
              onChange={(v) => set('city', v)}
              autoComplete="address-level2"
            />
            <Field
              label={t.checkout.postalCode}
              value={draft.postalCode ?? ''}
              onChange={(v) => set('postalCode', v)}
              autoComplete="postal-code"
              optional
            />
          </div>
          <Field
            label={t.account.phone}
            value={draft.phone}
            error={errors.phone}
            onChange={(v) => set('phone', v)}
            type="tel"
            autoComplete="tel"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary justify-center disabled:opacity-50"
            >
              {pending ? t.account.working : t.account.addressSave}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY);
                setErrors({});
              }}
              className="text-[12.5px] text-faint hover:text-text"
            >
              {t.account.addressCancel}
            </button>
          </div>
        </form>
      ) : addresses.length >= MAX_ADDRESSES ? (
        <p className="text-[12.5px] text-faint">{t.account.addressesFull(MAX_ADDRESSES)}</p>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing('new');
            setDraft(EMPTY);
            setErrors({});
          }}
          className="btn btn-ghost justify-center"
        >
          {t.account.addressAdd}
        </button>
      )}
    </div>
  );
}
