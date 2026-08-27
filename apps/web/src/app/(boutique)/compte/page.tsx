import type { Metadata } from 'next';
import { t } from '@/locales/fr';
import { AccountView } from '@/components/account/AccountView';

/**
 * `noindex`, and already disallowed in `robots.ts`: there is nothing here for a crawler,
 * and every version of this page a crawler could reach is the signed-out one.
 */
export const metadata: Metadata = {
  title: t.account.metaTitle,
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="wrap py-8 sm:py-12">
      <h1 className="t-h1 mb-6 font-display font-bold sm:mb-8">{t.account.title}</h1>
      <AccountView />
    </div>
  );
}
