/**
 * The shop's contact details — one source of truth for the header, the footer, the
 * floating contact buttons and the `LocalBusiness` / `Organization` structured data.
 *
 * Keep each number in E.164 here and derive every link from it: `wa.me` refuses spaces and
 * punctuation, `tel:` tolerates them, and the display form is the only one a human reads.
 */

export type PhoneKind = 'landline' | 'mobile';

export interface ShopPhone {
  /** As written on the shop's material — the only form a human reads. */
  display: string;
  /** `tel:` wants no spaces so dialers don't choke on them. */
  href: string;
  /** Schema.org wants strict E.164. */
  e164: string;
  /** Digits only, no `+` — the form `wa.me` expects. */
  digits: string;
  kind: PhoneKind;
  /**
   * Whether this line can receive WhatsApp. **A landline cannot** — `wa.me` will happily
   * build a link to one and then tell the customer the number is not on WhatsApp, so the
   * flag is what keeps the button pointed at a mobile.
   */
  whatsapp: boolean;
}

function phone(display: string, digits: string, kind: PhoneKind, whatsapp: boolean): ShopPhone {
  return { display, href: `tel:+${digits}`, e164: `+${digits}`, digits, kind, whatsapp };
}

/**
 * Every line the shop answers, in the order they should be offered.
 *
 * The landline leads deliberately: in Morocco a fixed Casablanca line (05 22) signals a
 * real storefront rather than a reseller working from a phone, which is worth something on
 * a site asking for payment on delivery.
 */
export const PHONES: readonly ShopPhone[] = [
  phone('+212 522-507451', '212522507451', 'landline', false),
  phone('+212 660-196020', '212660196020', 'mobile', true),
  phone('+212 661-827969', '212661827969', 'mobile', true),
] as const;

/** The line the call buttons dial, and the number in the structured data. */
const PRIMARY = PHONES[0]!;

/**
 * The number behind every WhatsApp link, chosen explicitly rather than by picking the
 * first mobile in the list.
 *
 * It stays on the original line: that account already carries the shop's conversation
 * history, so switching it would strand every customer mid-thread and silently send new
 * enquiries to a handset nobody is watching. Reordering `PHONES` must never move the
 * WhatsApp inbox, which is why this selects by number and asserts it can receive.
 *
 * TODO(client): confirm which handset actually runs WhatsApp. If it is the 660 line,
 * change the digits here — it is the only edit needed.
 */
const WHATSAPP_DIGITS = '212661827969';
const WHATSAPP = PHONES.find((p) => p.digits === WHATSAPP_DIGITS && p.whatsapp)!;

export const CONTACT = {
  phones: PHONES,
  primary: PRIMARY,
  /** Kept as flat fields so existing callers and the JSON-LD read cleanly. */
  phoneDisplay: PRIMARY.display,
  phoneHref: PRIMARY.href,
  phoneE164: PRIMARY.e164,
  whatsappNumber: WHATSAPP.digits,
  whatsappDisplay: WHATSAPP.display,
} as const;

/**
 * A `wa.me` link, optionally pre-filling the first message.
 *
 * The text is URL-encoded, never interpolated raw: an unencoded newline or `&` silently
 * truncates the message on WhatsApp's side.
 */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${CONTACT.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
