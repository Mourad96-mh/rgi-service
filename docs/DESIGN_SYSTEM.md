# DESIGN_SYSTEM.md — Rgi Service Visual System

Goal: a **modern, beautiful, premium gaming** aesthetic — **light, white-background**,
high-contrast, with a vibrant gradient accent used sparingly on clean white surfaces.

> **Changed 2026-08-22 at the client's request: the site is light, not dark.** The palette
> below replaces the original near-black one. `mockups/homepage.html` still shows the old
> dark treatment and is now a *layout* reference only — do not take colour from it.

The tokens live in **`apps/web/src/styles/globals.css`** as `--c-*` RGB channels, which is
the single source of truth; `tailwind.config.ts` composes them and never repeats a value.

> The accent is a **token**. If the client has official brand colors, swap `--accent` /
> `--accent-2` and everything updates. The violet→cyan default below is the recommended look.

---

## 1. Design principles
- **Light, clean, retail-grade.** White page, content on white cards separated by a
  hairline border and a whisper of shadow; alternate bands in a cool near-white.
- **One vivid gradient accent** (violet → cyan) used with restraint: CTAs, highlights,
  key numbers, the logo mark. Never flood the page with it.
- **Depth, not glow.** On white, a glow reads as a smudge: use tight ambient shadows and
  1px dark-tinted borders. Coloured lift is reserved for the primary CTA.
- **Spec-forward but breathable.** Lots of negative space; specs shown as small pills.
- **Motion is subtle.** Hover lifts (translateY -4px), gentle scale on buttons, smooth
  transitions (~180–220ms). No gimmicks.
- **Mobile-first.** Everything degrades cleanly to 1–2 columns; nav → drawer, filters → sheet.

## 2. Color tokens

```css
/* Backgrounds */
--bg:        #ffffff;   /* page */
--bg-2:      #f5f7fa;   /* alt sections / footer */
--surface:   #ffffff;   /* cards, inputs */
--surface-2: #f7f9fc;   /* raised / media wells / photo tiles */

/* Borders (dark tints — a white tint is invisible on white) */
--border:    rgba(16,24,48,.10);
--border-2:  rgba(16,24,48,.18);

/* Text — every value clears WCAG AA (4.5:1) on both #ffffff and #f5f7fa */
--text:      #0e1220;   /* primary   18.65:1 */
--muted:     #55607a;   /* secondary  6.29:1 */
--faint:     #636d85;   /* captions   5.18:1 */

/* Accent + status — deepened for a light ground. The original dark-theme values
   scored 1.8-2.6:1 on white and were unreadable. */
--accent:    #5b3df5;   /* violet    6.12:1 */
--accent-2:  #0e7490;   /* teal      5.36:1  (was cyan #22d3ee, 1.81:1) */
--accent-3:  #d81b60;   /* pink      4.95:1 */
--success:   #0f7a4f;   /* 5.36:1    (was #34d399, 1.92:1) */
--warn:      #a35a06;   /* 5.22:1 */

/* Two gradients, on purpose */
--grad:      linear-gradient(120deg,#6d4bff 0%,#0e8ba8 100%);  /* fills; white sits on top */
--grad-text: linear-gradient(120deg,#5b3df5 0%,#0e7490 100%);  /* text; both stops AA alone */
--grad-soft: linear-gradient(120deg,rgba(109,75,255,.10),rgba(14,165,196,.08));
```

Usage rules:
- **Primary CTA** = `--grad` fill with **white** text + the coloured lift shadow.
- **Never paint text with `--grad`** — use `--grad-text`. The fill gradient's cyan half
  drops to ~2:1 on white, which would make the right-hand end of every price unreadable.
- **Sale/discount tags & cart badge** = `--accent-3`.
- **In-stock / compatible** = `--success`; **warnings** = `--warn`.
- **Prices (the "now" price)** and hero key numbers use the gradient text treatment.
- Body text `--text`; secondary `--muted`; captions `--faint`.

## 3. Typography
- **Display / headings:** `Space Grotesk` (600–700), tight tracking (`-0.02em`).
- **Body / UI:** `Inter` (400–700).
- Load via Google Fonts (or self-host for perf). Fallback: system-ui sans.

Scale (desktop → clamp down on mobile):
| Token | Size | Use |
|---|---|---|
| Hero H1 | 56px / 1.02 | homepage hero |
| H2 | 30–34px | section titles |
| H3 | 16–18px | card/category titles |
| Body | 15–17px | paragraphs |
| Small | 12.5–14px | meta, specs |
| Caption | 11–12px | tags, captions |

## 4. Spacing, radius, shadows
```css
--radius:18px;  --radius-sm:12px;  --radius-lg:26px;
--shadow:0 20px 50px -20px rgba(0,0,0,.7);
--glow:0 0 40px -8px rgba(124,92,255,.55);
```
- Section vertical padding ~56px. Container max-width **1220px**, side padding 24px.
- Card padding 16–22px. Grid gaps 16–18px.
- Border-radius: inputs/buttons `--radius-sm`, cards `--radius`, hero/CTA panels `--radius-lg`.

## 5. Core components (match the mockup)

**Buttons**
- `.btn-primary`: gradient fill, dark text, glow, hover lift + brightness.
- `.btn-ghost`: translucent surface, 1px border, hover border→accent.

**Header**: sticky, blurred translucent bg (`backdrop-filter:blur(18px)`), logo with gradient
"mark" tile, large search field, account/favorites/cart icons (cart shows pink count badge),
second-row category nav with the **Configurateur PC** item highlighted + `-5%` badge.

**Hero**: two-column; left = pill + big gradient headline + subcopy + dual CTA + stat row;
right = product visual well with radial glow and floating glass spec chips. Big radial glows
bleed behind it.

**Category tile** (`.cat`): surface card, emoji/icon, title, subtitle; hover lifts + accent
border + soft radial glow blooms in the corner.

**Product card** (`.card`): media well (radial-glow bg), sale/new **tag** top-left, favorite
button top-right, brand eyebrow, name, **spec pills**, in-stock dot, footer with
old/now price (now = gradient) + gradient "add to cart" square button. Reuse this ONE card
everywhere (listings, deals, related).

**Configurator CTA block**: large `--radius-lg` panel with dual radial glows, headline +
copy + primary CTA on one side, a live "steps" stack on the other showing parts with
green ✓ Compatible / amber ⚡ warning states — this previews the real configurator UX.

**Trust band**: 4 cards (montage pro, garantie 12 mois, paiement CMI/COD, livraison 48h).

**Footer**: dark, 4-column (brand+about+payment badges, boutique, service client, contact),
bottom legal row.

## 6. Imagery
- Product photos on neutral/dark backgrounds, consistent aspect ratios (4:3 cards, 1:1 hero).
- Use `next/image` + Cloudinary transforms (WebP/AVIF, responsive srcset). Reserve space to
  avoid CLS. Subtle radial glow behind product images for the premium feel.

## 7. Motion
- Hover: cards/tiles `translateY(-4px)` + shadow; buttons scale/brightness; ~200ms ease.
- Respect `prefers-reduced-motion` (disable transforms/parallax).
- Optional: gentle fade/slide-in on scroll for sections (keep it fast and subtle).

## 8. Accessibility
- Maintain contrast: `--text` on `--bg` passes AA; don't put `--faint` on large critical text.
- Focus-visible rings on interactive elements. Buttons/links keyboard-reachable.
- Don't rely on color alone for stock/compatibility — pair with icon + label.

## 9. Tailwind wiring (do this)
Put the palette in `tailwind.config` `theme.extend.colors`, add the gradient as a utility
(`bg-gradient-to-r from-[#7c5cff] to-[#22d3ee]` or a custom `bg-brand-grad`), set the two
font families, and register the radius/shadow tokens. Build the components above with
**shadcn/ui** as the base, restyled to these tokens, so the whole site is one consistent
system. The mockup's CSS variable names map 1:1 to Tailwind theme keys — mirror them.

## 10. Apply consistently across pages
Home, category/listing, product detail, configurator, cart, checkout, and the **admin
dashboard** all use the same tokens, card, buttons, and type scale. Consistency is what makes
it read as "beautiful," not one-off flourishes.
