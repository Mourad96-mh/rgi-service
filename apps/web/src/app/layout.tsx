import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron, Space_Grotesk } from 'next/font/google';
import { SITE_NAME, SITE_URL } from '@/lib/env';
import '@/styles/globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

/**
 * Logo wordmark only — the "Service" under the RGI mark. Orbitron is the closest match on
 * Google Fonts to the squared, wide Eurostile lettering in the client's artwork. One
 * weight, and `display: 'block'` so the lockup never flashes in a fallback face.
 */
const wordmark = Orbitron({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-wordmark',
  display: 'block',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — PC Gamer, composants et configurateur PC au Maroc`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'PC gamers assemblés au Maroc, composants, périphériques et configurateur PC compatible. Paiement à la livraison, garantie 12 mois, livraison 48h.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fr_MA',
    siteName: SITE_NAME,
    url: SITE_URL,
    // The share card a WhatsApp / Facebook link preview shows. Generated from the
    // client's own logo by `scripts/build-logo.mjs`. Pages with their own imagery
    // (products) override this in their own `generateMetadata`.
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

/**
 * Without this every mobile browser assumes a ~980 px desktop viewport and renders the
 * whole site zoomed out — media queries never fire and the "responsive" CSS below is
 * inert. `maximumScale` / `userScalable` are deliberately left alone: pinch-zoom is an
 * accessibility right, not a layout bug (DESIGN_SYSTEM.md §8).
 *
 * `themeColor` paints the Android address bar the page background, so the browser chrome
 * does not sit as a white band above a near-black site.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

/**
 * Root layout: fonts, tokens, nothing else. The storefront chrome lives in
 * `(boutique)/layout.tsx` and the dashboard's in `admin/layout.tsx`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${display.variable} ${wordmark.variable}`}>
      <body>{children}</body>
    </html>
  );
}
