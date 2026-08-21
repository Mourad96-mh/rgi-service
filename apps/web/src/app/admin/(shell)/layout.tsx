import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/locales/fr';
import { currentStaff } from '@/lib/admin/session';
import { AdminNav } from '@/components/admin/AdminNav';
import { LogoutButton } from '@/components/admin/LogoutButton';
import { LogoMark } from '@/components/brand/LogoMark';

export const metadata: Metadata = {
  title: { default: t.admin.title, template: `%s · ${t.admin.title}` },
  robots: { index: false, follow: false },
};

/**
 * The dashboard shell. The middleware has already refused anyone without a session, and
 * `currentStaff()` re-checks with the API before a single figure is rendered
 * (ADMIN_DASHBOARD.md §1) — the role gate is never client-side.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-line bg-bg2 lg:w-[248px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <LogoMark className="h-[22px] w-auto shrink-0 text-text" />
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-bold">{t.admin.title}</p>
            <p className="truncate text-[11.5px] text-faint">
              {staff.name} · {staff.role}
            </p>
          </div>
        </div>

        <AdminNav />

        <div className="flex flex-col gap-2 px-5 py-5">
          <Link href="/" className="text-[12.5px] text-faint transition hover:text-text">
            ← {t.admin.backToShop}
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">{children}</main>
    </div>
  );
}
