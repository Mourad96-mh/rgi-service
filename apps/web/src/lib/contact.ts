/**
 * The shop's contact details — one source of truth for the header, the footer, the
 * floating contact buttons and the `LocalBusiness` / `Organization` structured data.
 *
 * Keep the number in E.164 here and derive every link from it: `wa.me` refuses spaces and
 * punctuation, `tel:` tolerates them, and the display form is the only one a human reads.
 */

/** E.164, digits only, no `+` — the form `wa.me` expects. */
const E164_DIGITS = '212661827969';

export const CONTACT = {
  /** As written on the shop's material. */
  phoneDisplay: '+212 661-827969',
  /** `tel:` wants no spaces so dialers don't choke on them. */
  phoneHref: `tel:+${E164_DIGITS}`,
  /** Schema.org wants strict E.164. */
  phoneE164: `+${E164_DIGITS}`,
  whatsappNumber: E164_DIGITS,
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
