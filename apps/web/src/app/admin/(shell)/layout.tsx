import type { Metadata } from 'next';
import { t } from '@/locales/fr';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: { default: t.admin.title, template: `%s · ${t.admin.title}` },
  robots: { index: false, follow: false },
};

/**
 * Stays a server component so it can still export `metadata` — that is all it does now.
 * The session gate and the chrome live in `AdminShell`, which has to run in the browser:
 * the dashboard ships as static files and there is no server left to check a cookie.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
