'use client';

import { useEffect, useState } from 'react';
import { CONTACT, whatsappUrl } from '@/lib/contact';
import { t } from '@/locales/fr';

/** Ignore scrolls smaller than this, so a trackpad twitch does not flip the buttons. */
const MOVE_THRESHOLD_PX = 10;
/** The page must be scrolled at least this far before hiding is allowed — at the top of
 *  the page the buttons have nothing to get out of the way of yet. */
const MIN_SCROLL_TO_HIDE_PX = 96;

/**
 * Show the buttons at rest and on the way up; slide them away on the way down.
 *
 * A floating button inherently covers whatever is under it, and on a 390 px screen that
 * is a real chunk of a product card. Reading is scrolling *down*, so that is the gesture
 * that should clear the corner; reaching for the corner is preceded by scrolling *up* or
 * stopping, and both bring the buttons back.
 *
 * `last` is a plain variable rather than state: this runs on every scroll frame and must
 * not re-render. When a move is under the threshold `last` is deliberately left alone, so
 * slow drags accumulate instead of being swallowed one sub-threshold frame at a time.
 */
function useHiddenWhileScrollingDown() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const current = window.scrollY;
        const delta = current - last;
        if (Math.abs(delta) < MOVE_THRESHOLD_PX) return;
        last = current;
        setHidden(delta > 0 && current > MIN_SCROLL_TO_HIDE_PX);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return hidden;
}

/**
 * Floating WhatsApp + phone buttons, bottom-right on every storefront page.
 *
 * WhatsApp keeps its own brand green rather than the site's violet→cyan: shoppers
 * recognise the mark by its colour, and a re-tinted WhatsApp icon reads as decoration.
 *
 * The links are plain `<a>` elements rendered on the server, so they work before
 * hydration and are crawlable; the client hook only adds the hide-on-scroll behaviour on
 * top of a visible default. `aria-label` carries the full French wording; the visible
 * label is desktop-only, so the mobile buttons stay out of the way of the content.
 *
 * Hidden means `visibility: hidden`, not just moved off-screen: that drops the links out
 * of the tab order, so a keyboard user cannot land on a button they cannot see. It is
 * animated with the transform, and CSS keeps the element visible for the length of the
 * transition, so the slide-out still plays.
 */
export function ContactFab() {
  const hidden = useHiddenWhileScrollingDown();

  return (
    // The insets are `1rem + safe-area`, so on an iPhone the buttons clear the home
    // indicator instead of sitting under it, and in landscape they clear the notch.
    <div
      className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 flex flex-col items-end gap-2.5 transition-all duration-300 ease-out motion-reduce:transition-none print:hidden ${
        hidden ? 'invisible translate-y-[calc(100%+1.5rem)] opacity-0' : 'visible translate-y-0 opacity-100'
      }`}
    >
      <a
        href={whatsappUrl(t.contact.whatsappPrefill)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.contact.whatsappAria}
        className="group flex min-h-[44px] min-w-[44px] items-center justify-center gap-2.5 rounded-full bg-[#25D366] py-2.5 pl-3 pr-3 text-bg shadow-[0_8px_24px_rgba(0,0,0,.45)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] sm:pr-4"
      >
        <WhatsAppIcon />
        <span className="hidden text-[13.5px] font-semibold sm:inline">
          {t.contact.whatsapp}
        </span>
      </a>

      <a
        href={CONTACT.phoneHref}
        aria-label={`${t.contact.callAria} ${CONTACT.phoneDisplay}`}
        className="group flex min-h-[44px] min-w-[44px] items-center justify-center gap-2.5 rounded-full border border-line2 bg-bg2/95 py-2.5 pl-3 pr-3 text-text shadow-[0_8px_24px_rgba(0,0,0,.45)] backdrop-blur transition hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:pr-4"
      >
        <PhoneIcon />
        <span className="hidden text-[13.5px] font-semibold sm:inline">
          {t.contact.call}
        </span>
      </a>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px] fill-current">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
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
