'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { t } from '@/locales/fr';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch('/api/admin/logout', { method: 'POST' });
        router.replace('/admin/login');
        router.refresh();
      }}
      className="text-left text-[12.5px] text-faint transition hover:text-accent3 disabled:opacity-50"
    >
      {t.admin.logout}
    </button>
  );
}
