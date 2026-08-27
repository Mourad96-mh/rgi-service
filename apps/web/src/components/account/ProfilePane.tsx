'use client';

import { useState } from 'react';
import type { User } from '@rgi/types';
import { t } from '@/locales/fr';
import { saveProfile, SessionExpiredError } from '@/lib/account/session';
import { Field } from '@/components/checkout/Field';

export function ProfilePane({
  customer,
  onExpired,
}: {
  customer: User;
  onExpired: () => void;
}) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setDone(false);
    try {
      await saveProfile({ name: name.trim(), phone: phone.trim() });
      setDone(true);
    } catch (cause) {
      if (cause instanceof SessionExpiredError) onExpired();
      else setError(cause instanceof Error ? cause.message : t.common.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface-card flex max-w-[460px] flex-col gap-4 p-4 sm:p-6">
      <Field label={t.account.name} value={name} onChange={setName} autoComplete="name" />
      <Field
        label={t.account.phone}
        value={phone}
        onChange={setPhone}
        type="tel"
        autoComplete="tel"
        optional
      />

      {/*
        The e-mail is the login identifier and there is no mail service to verify a change
        with, so it is shown and not edited — the API refuses it too. Saying why here beats
        a disabled input with no explanation.
      */}
      <label className="block min-w-0">
        <span className="mb-1.5 block text-[12.5px] text-muted">{t.account.email}</span>
        <input value={customer.email} readOnly disabled className="field opacity-60" />
        <span className="mt-1 block text-[11.5px] text-faint">{t.account.profileEmailFixed}</span>
      </label>

      {error ? (
        <p role="alert" className="text-[12.5px] text-accent3">
          {error}
        </p>
      ) : null}
      {done ? <p className="text-[12.5px] text-success">{t.account.saved}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary justify-center disabled:opacity-50"
      >
        {pending ? t.account.working : t.account.profileSave}
      </button>
    </form>
  );
}
