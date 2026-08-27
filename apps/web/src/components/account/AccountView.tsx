'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@rgi/types';
import { t } from '@/locales/fr';
import {
  hasSession,
  logout,
  refreshCustomer,
  useCustomer,
} from '@/lib/account/session';
import { AuthPanes } from './AuthPanes';
import { OrdersPane } from './OrdersPane';
import { AddressesPane } from './AddressesPane';
import { ProfilePane } from './ProfilePane';

type Tab = 'orders' | 'addresses' | 'profile';

const TABS: { key: Tab; label: string }[] = [
  { key: 'orders', label: t.account.tabOrders },
  { key: 'addresses', label: t.account.tabAddresses },
  { key: 'profile', label: t.account.tabProfile },
];

/**
 * `/compte`, both halves of it.
 *
 * The page is rendered entirely in the browser: a static export has no server, so there is
 * no session to read while generating the HTML and no server-side guard to run. The first
 * paint is therefore always the signed-out state, corrected on hydration — which is why
 * the shell below waits for `checked` before deciding what to show, instead of flashing
 * the sign-in form at a signed-in customer.
 *
 * The stored user is treated as a cache and never as proof: on every load the session is
 * re-verified against `/auth/me`, so a revoked or expired one lands on the sign-in pane
 * rather than on a screen full of failing requests.
 */
export function AccountView() {
  const customer = useCustomer();
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<Tab>('orders');

  const signedOut = useCallback(() => {
    void logout();
    setChecked(true);
  }, []);

  useEffect(() => {
    if (!hasSession()) {
      setChecked(true);
      return;
    }
    refreshCustomer()
      .catch(() => {
        // Any failure here means the session cannot be trusted; the panes never render.
        void logout();
      })
      .finally(() => setChecked(true));
  }, []);

  if (!checked) {
    return <div className="surface-card h-[280px] animate-pulse opacity-40" />;
  }

  if (!customer) {
    return <AuthPanes onDone={() => setChecked(true)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">{t.account.hello(customer.name)}</p>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-[12.5px] text-faint hover:text-text"
        >
          {t.account.logout}
        </button>
      </div>

      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-[40px] rounded-full border px-4 text-[13px] font-semibold transition ${
              tab === key
                ? 'border-accent2 bg-text/[.05] text-text'
                : 'border-line text-muted hover:border-line2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'orders' ? <OrdersPane onExpired={signedOut} /> : null}
      {tab === 'addresses' ? (
        <AddressesPane customer={customer} onExpired={signedOut} />
      ) : null}
      {tab === 'profile' ? (
        <ProfilePane customer={customer} onExpired={signedOut} />
      ) : null}
    </div>
  );
}
