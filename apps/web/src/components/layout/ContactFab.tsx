import { CONTACT, whatsappUrl } from '@/lib/contact';
import { t } from '@/locales/fr';
import { WhatsAppIcon } from '@/components/ui/Icons';

/**
 * Floating WhatsApp + phone buttons, bottom-right on every storefront page.
 *
 * WhatsApp keeps its own brand green rather than the site's violet→cyan: shoppers
 * recognise the mark by its colour, and a re-tinted WhatsApp icon reads as decoration.
 *
 * The links are plain `<a>` elements, so they work before hydration and are crawlable.
 * `aria-label` carries the full French wording; the visible label is desktop-only, so the
 * mobile buttons stay out of the way of the content.
 *
 * These used to hide while the page scrolled down, to keep a 390 px screen clear. Two
 * problems: the client read it as the buttons breaking, and it never worked as documented
 * — `setHidden` only ran inside a scroll event, so once scrolling *stopped* nothing fired
 * and the buttons stayed hidden until you scrolled back up. "Show the buttons at rest"
 * was never true. A shop's phone number is the last thing that should play hide and seek,
 * so they are simply always visible now; that also makes this a server component with no
 * scroll listener and no client JavaScript at all.
 */
export function ContactFab() {
  return (
    // The insets are `1rem + safe-area`, so on an iPhone the buttons clear the home
    // indicator instead of sitting under it, and in landscape they clear the notch.
    <div
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 flex flex-col items-end gap-2.5 print:hidden"
    >
      <a
        href={whatsappUrl(t.contact.whatsappPrefill)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.contact.whatsappAria}
        className="group flex min-h-[44px] min-w-[44px] items-center justify-center gap-2.5 rounded-full bg-[#25D366] py-2.5 pl-3 pr-3 text-[#0e1220] shadow-[0_10px_24px_-8px_rgba(16,24,48,.35)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] sm:pr-4"
      >
        <WhatsAppIcon className="h-[22px] w-[22px]" />
        <span className="hidden text-[13.5px] font-semibold sm:inline">
          {t.contact.whatsapp}
        </span>
      </a>

      <a
        href={CONTACT.phoneHref}
        aria-label={`${t.contact.callAria} ${CONTACT.phoneDisplay}`}
        className="group flex min-h-[44px] min-w-[44px] items-center justify-center gap-2.5 rounded-full border border-line2 bg-surface/95 py-2.5 pl-3 pr-3 text-text shadow-[0_10px_24px_-8px_rgba(16,24,48,.35)] backdrop-blur transition hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:pr-4"
      >
        <PhoneIcon />
        <span className="hidden text-[13.5px] font-semibold sm:inline">
          {t.contact.call}
        </span>
      </a>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[20px] w-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
