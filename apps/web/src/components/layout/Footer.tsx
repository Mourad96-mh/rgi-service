import Link from 'next/link';
import type { CategoryNode } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { Logo } from '@/components/brand/Logo';
import { CONTACT, whatsappUrl } from '@/lib/contact';

const SERVICE_LINKS = [
  { href: '/livraison', label: 'Livraison & retours' },
  { href: '/garantie', label: 'Garantie & SAV' },
  { href: '/paiement', label: 'Moyens de paiement' },
  { href: '/faq', label: 'Questions fréquentes' },
];

/** Dark 4-column footer with payment badges and the legal row (DESIGN_SYSTEM.md §5). */
export function Footer({ categories }: { categories: CategoryNode[] }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-5 border-t border-line bg-bg2 pb-[30px] pt-[52px]">
      <div className="wrap">
        <div className="mb-9 grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href={routes.home}>
              <Logo />
            </Link>
            <p className="my-3.5 max-w-[280px] text-[13.5px] text-muted">{t.footer.about}</p>
            <div className="mt-3.5 flex gap-2">
              {['CMI', 'Visa', 'Mastercard', 'Cash'].map((label) => (
                <span
                  key={label}
                  className="rounded-lg border border-line px-[11px] py-1.5 text-[11px] font-semibold text-muted"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h5 className="mb-4 text-[13px] font-semibold uppercase tracking-[.06em] text-faint">
              {t.footer.shop}
            </h5>
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={routes.category(category.slug)}
                className="mb-2.5 block text-[13.5px] text-muted transition hover:text-text"
              >
                {category.name.fr}
              </Link>
            ))}
          </div>

          <div>
            <h5 className="mb-4 text-[13px] font-semibold uppercase tracking-[.06em] text-faint">
              {t.footer.service}
            </h5>
            {SERVICE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="mb-2.5 block text-[13.5px] text-muted transition hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div>
            <h5 className="mb-4 text-[13px] font-semibold uppercase tracking-[.06em] text-faint">
              {t.footer.contact}
            </h5>
            {/* TODO(spec): l'adresse, l'e-mail et les horaires restent à confirmer par le
                client (NAP LocalBusiness). Le téléphone, lui, est le vrai numéro. */}
            <p className="mb-2.5 text-[13.5px] text-muted">Casablanca, Maroc</p>
            <p className="mb-2.5 text-[13.5px]">
              <a
                href={CONTACT.phoneHref}
                className="text-muted transition hover:text-accent"
              >
                {CONTACT.phoneDisplay}
              </a>
            </p>
            <p className="mb-2.5 text-[13.5px]">
              <a
                href={whatsappUrl(t.contact.whatsappPrefill)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted transition hover:text-accent"
              >
                {t.contact.whatsapp}
              </a>
            </p>
            <p className="mb-2.5 text-[13.5px] text-muted">contact@rgiservice.ma</p>
            <p className="mb-2.5 text-[13.5px] text-muted">Lun — Sam · 9h30 à 19h</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2.5 border-t border-line pt-[22px] text-[12.5px] text-faint">
          <span>
            © {year} {t.common.brand}. {t.footer.rights}
          </span>
          <span className="flex gap-4">
            <Link href="/mentions-legales" className="transition hover:text-muted">
              {t.footer.legal}
            </Link>
            <Link href="/cgv" className="transition hover:text-muted">
              {t.footer.cgv}
            </Link>
            <Link href="/confidentialite" className="transition hover:text-muted">
              {t.footer.privacy}
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
