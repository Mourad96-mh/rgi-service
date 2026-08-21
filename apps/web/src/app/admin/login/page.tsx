import type { Metadata } from 'next';
import { t } from '@/locales/fr';
import { LoginForm } from '@/components/admin/LoginForm';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = {
  title: t.admin.loginTitle,
  robots: { index: false, follow: false },
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { suivant?: string };
}) {
  return (
    <div className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center gap-3">
          <Logo />
          <p className="text-[12px] text-faint">{t.admin.title}</p>
        </div>

        <h1 className="font-display text-[26px] font-bold">{t.admin.loginTitle}</h1>
        <p className="mt-2 text-[14px] text-muted">{t.admin.loginText}</p>

        <LoginForm next={searchParams.suivant} />
      </div>
    </div>
  );
}
