'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/locales/fr';

/**
 * Posts to a route handler rather than to the API directly: the handler is what puts the
 * tokens into httpOnly cookies, so the JWT never touches client JavaScript.
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? t.common.error);
        setPending(false);
        return;
      }
      router.replace(next && next.startsWith('/admin') ? next : '/admin');
      router.refresh();
    } catch {
      setError(t.common.error);
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
