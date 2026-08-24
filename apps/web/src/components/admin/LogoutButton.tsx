'use client';

import { useState } from 'react';
import { t } from '@/locales/fr';
import { logout } from '@/lib/admin/session';

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        // Clears localStorage here and revokes the refresh hash on the API. A hard
        // navigation, so nothing keeps a stale session in memory.
        await logout();
        window.location.assign('/admin/login/');
      }}
      className="inline-flex min-h-[44px] items-center text-left text-[12.5px] text-faint transition hover:text-accent3 disabled:opacity-50 lg:min-h-0"
    >
      {t.admin.logout}
    </button>
  );
}
