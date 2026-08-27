'use client';

import { useState } from 'react';
import { t } from '@/locales/fr';
import { CONTACT } from '@/lib/contact';
import { AuthApiError, login, register } from '@/lib/account/session';
import { Field } from '@/components/checkout/Field';

type Pane = 'signIn' | 'signUp';

/**
 * The signed-out half of `/compte`: sign in, or create an account, in one place.
 *
 * Two panes on one route rather than two routes. A static export has no server to redirect
 * with, so a `/connexion` → `/compte` hop would be a client-side redirect — a visible flash
 * of the wrong page on every visit, and a second HTML file to keep in step for nothing.
 */
export function AuthPanes({ onDone }: { onDone: () => void }) {
  const [pane, setPane] = useState<Pane>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (pane === 'signIn') {
        await login({ email: email.trim(), password });
      } else {
        await register({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim() || undefined,
        });
      }
      onDone();
    } catch (cause) {
      setError(cause instanceof AuthApiError ? cause.message : t.common.error);
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <div role="tablist" className="grid grid-cols-2 gap-2">
        {(['signIn', 'signUp'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={pane === key}
            onClick={() => {
              setPane(key);
              setError(null);
            }}
            className={`min-h-[44px] rounded-full border px-4 text-[13.5px] font-semibold transition ${
              pane === key
                ? 'border-accent2 bg-text/[.05] text-text'
                : 'border-line text-muted hover:border-line2'
            }`}
          >
            {key === 'signIn' ? t.account.signIn : t.account.signUp}
          </button>
        ))}
      </div>

      <p className="mt-4 text-[14px] text-muted">
        {pane === 'signIn' ? t.account.signInText : t.account.signUpText}
      </p>

      <form onSubmit={submit} className="surface-card mt-4 flex flex-col gap-4 p-4 sm:p-6">
        {pane === 'signUp' ? (
          <Field label={t.account.name} value={name} onChange={setName} autoComplete="name" />
        ) : null}

        <Field
          label={t.account.email}
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
        />

        <label className="block min-w-0">
          <span className="mb-1.5 block text-[12.5px] text-muted">{t.account.password}</span>
          <input
            type="password"
            required
            minLength={pane === 'signUp' ? 8 : undefined}
            autoComplete={pane === 'signIn' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
          />
          {pane === 'signUp' ? (
            <span className="mt-1 block text-[11.5px] text-faint">{t.account.passwordHelp}</span>
          ) : null}
        </label>

        {pane === 'signUp' ? (
          <Field
            label={t.account.phone}
            value={phone}
            onChange={setPhone}
            type="tel"
            autoComplete="tel"
            optional
          />
        ) : null}

        {error ? (
          <p role="alert" className="text-[12.5px] text-accent3">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary w-full justify-center disabled:opacity-50"
        >
          {pending
            ? t.account.working
            : pane === 'signIn'
              ? t.account.submitSignIn
              : t.account.submitSignUp}
        </button>

        {pane === 'signIn' ? (
          <p className="text-center text-[11.5px] text-faint">
            {t.account.forgot(CONTACT.phoneDisplay)}
          </p>
        ) : null}
      </form>

      <p className="mt-4 text-center text-[12.5px] text-faint">{t.account.guestHint}</p>
    </div>
  );
}
