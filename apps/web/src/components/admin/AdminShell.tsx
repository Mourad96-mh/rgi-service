'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@rgi/types';
import { t } from '@/locales/fr';
import { hasSession, requireStaff, toLogin } from '@/lib/admin/session';
import { AdminNav } from '@/components/admin/AdminNav';
import { LogoutButton } from '@/components/admin/LogoutButton';
import { LogoMark } from '@/components/brand/LogoMark';

const StaffContext = createContext<User | null>(null);

/**
 * The signed-in staff member, for pages that gate on role.
 *
 * The shell has already resolved `/auth/me` before it renders any page, so a page reads it
 * from here instead of asking again — `/admin/categories` used to `await currentStaff()`
 * of its own, which in a browser would mean a second round trip on every navigation.
 *
 * Safe to assert: nothing below the shell renders until `staff` is set.
 */
export function useStaff(): User {
  const staff = useContext(StaffContext);
  if (!staff) throw new Error('useStaff must be used inside AdminShell');
  return staff;
}

/**
 * The dashboard shell, and the session gate.
 *
 * `middleware.ts` used to refuse anyone without a session before a byte of admin HTML was
 * produced. A static host cannot do that, so the gate moved here — and it is worth being
 * precise about what changed and what did not:
 *
 *   - **What changed:** the admin HTML is now public. Anyone may download
 *     `/admin/produits/index.html`. It is an empty table and a script tag.
 *   - **What did not:** the *data* is as protected as it ever was. Every request carries a
 *     bearer token the API validates against `@Roles('staff')`. This component decides
 *     what to paint, never what the API will answer.
 *
 * `children` are not rendered until `requireStaff()` has come back, so a signed-out visitor
 * never triggers the page's own data fetching.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<User | null>(null);

  useEffect(() => {
    // No refresh token at all: skip the round trip and go straight to the login.
    if (!hasSession()) {
      toLogin();
      return;
    }

    let cancelled = false;
    requireStaff()
      .then((user) => {
        if (!cancelled) setStaff(user);
      })
      .catch(() => {
        // `adminFetch` has already redirected on an expired session. Anything else — the
        // API being unreachable — must not strand staff on a blank screen either.
        if (!cancelled) toLogin();
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!staff) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <p className="text-[13.5px] text-faint">{t.admin.checkingSession}</p>
      </div>
    );
  }

  return (
    <StaffContext.Provider value={staff}>
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
    </StaffContext.Provider>
  );
}
