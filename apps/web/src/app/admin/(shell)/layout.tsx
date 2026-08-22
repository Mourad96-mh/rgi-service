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
      {/*
       * Below `lg` the sidebar is not a column but two slim rows — identity plus the way
       * out on the first, the nav scroller on the second. Stacking the desktop column as
       * it stands would put a wall of chrome above every page on a phone.
       */}
      <aside className="border-b border-line bg-bg2 lg:w-[248px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-5">
          <LogoMark className="h-[20px] w-auto shrink-0 text-text lg:h-[22px]" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[14px] font-bold lg:text-[15px]">
              {t.admin.title}
            </p>
            <p className="truncate text-[11.5px] text-faint">
              {staff.name} · {staff.role}
            </p>
          </div>
          {/* On a phone logging out rides in the top bar; the desktop column keeps its
              own copy at the bottom, where the eye expects it. */}
          <div className="shrink-0 lg:hidden">
            <LogoutButton />
          </div>
        </div>

        <AdminNav role={staff.role} />

        <div className="hidden flex-col gap-2 px-5 py-5 lg:flex">
          <Link href="/" className="text-[12.5px] text-faint transition hover:text-text">
            ← {t.admin.backToShop}
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-5 sm:py-8 lg:px-8 xl:px-10">
        {/* Past ~1700 px the content stops widening: a form field or a table row that
            spans a 2560 px monitor is harder to read, not easier. */}
        <div className="mx-auto w-full max-w-[1680px]">{children}</div>
      </main>
    </div>
  );
}
