import type { Metadata } from 'next';
import { t } from '@/locales/fr';
import { LoginForm } from '@/components/admin/LoginForm';
import { Logo } from '@/components/brand/Logo';

export const metadata: Metadata = {
  title: t.admin.loginTitle,
  robots: { index: false, follow: false },
};

/**
 * `?suivant=` used to arrive as `searchParams`, which a static export cannot provide —
 * there is no request to read it from. `LoginForm` reads it from `window.location` when the
 * form is submitted, which keeps this page free of a Suspense boundary and lets the form
 * itself prerender into the uploaded HTML.
 */
export default function AdminLoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <Logo />
          <p className="text-[12px] text-faint">{t.admin.title}</p>
        </div>

        <h1 className="t-h2 font-display font-bold">{t.admin.loginTitle}</h1>
        <p className="mt-2 text-[14px] text-muted">{t.admin.loginText}</p>

        <LoginForm />
      </div>
    </div>
  );
}
