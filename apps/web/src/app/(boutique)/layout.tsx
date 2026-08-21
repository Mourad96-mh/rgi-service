import type { CategoryNode } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { AnnounceBar, Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ContactFab } from '@/components/layout/ContactFab';

/**
 * Storefront chrome. It lives in a route group so `/admin` — which has its own shell —
 * does not inherit the shop's header and footer. The group changes no URLs.
 */
export default async function BoutiqueLayout({ children }: { children: React.ReactNode }) {
  // The nav is data-driven: adding a category in the admin adds it to the header.
  const categories =
    (await apiFetchOrNull<CategoryNode[]>('/categories', { revalidate: 300 })) ?? [];

  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm2 focus:bg-surface focus:px-4 focus:py-2"
      >
        Aller au contenu
      </a>
      <AnnounceBar />
      <Header categories={categories} />
      <main id="contenu">{children}</main>
      <Footer categories={categories} />
      {/* Extra bottom padding on phones so this last line is not sitting permanently
          underneath the floating WhatsApp / phone buttons. */}
      <p className="border-t border-line bg-surface px-4 pb-[104px] pt-3.5 text-center text-xs text-faint sm:py-3.5">
        {t.common.brand} · {t.common.tagline}
      </p>
      <ContactFab />
    </>
  );
}
