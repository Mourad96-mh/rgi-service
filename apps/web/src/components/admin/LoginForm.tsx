'use client';

import { useState } from 'react';
import { t } from '@/locales/fr';
import { AdminApiError, login } from '@/lib/admin/session';

/**
 * Signs in against the API directly.
 *
 * It used to post to `/api/admin/login`, a route handler whose whole purpose was to put
 * the tokens into httpOnly cookies the browser could not read. There is no server to run
 * that handler on Hostinger, so the exchange happens here and the tokens land in
 * `localStorage` — the trade-off is written out in full in `lib/admin/session.ts`.
 *
 * A hard `location.assign` rather than `router.replace`: the shell reads the session once,
 * on mount, so it has to mount again after a successful login.
 *
 * `?suivant=` is read from `window.location` inside the submit handler rather than with
 * `useSearchParams()`. That hook would force this form into a Suspense boundary, and the
 * boundary fallback is what gets prerendered — so the uploaded HTML would hold a grey
 * rectangle instead of the login form, and staff would watch it pop in on every visit.
 */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
      // Only ever back into the dashboard: `?suivant=` comes from the URL bar, so an
      // attacker could otherwise use the login as an open redirect.
      const next = new URLSearchParams(window.location.search).get('suivant');
      window.location.assign(next && next.startsWith('/admin') ? next : '/admin/');
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : t.common.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface-card mt-6 flex flex-col gap-4 p-4 sm:mt-8 sm:p-6">
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] text-muted">{t.admin.email}</span>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12.5px] text-muted">{t.admin.password}</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field"
        />
      </label>

      {error ? (
        <p role="alert" className="text-[12.5px] text-accent3">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn btn-primary w-full justify-center disabled:opacity-50">
        {pending ? t.admin.loggingIn : t.admin.login}
      </button>
    </form>
  );
}
