import type { Config } from 'tailwindcss';

/**
 * The tokens from `docs/DESIGN_SYSTEM.md` §2–§4. Values are NOT repeated here: each one
 * points at the `--c-*` channels declared in `styles/globals.css`, which is the single
 * source of truth. Swapping `--c-accent` / `--c-accent-2` there re-skins the whole site —
 * storefront and admin alike — and a second theme becomes a second `:root` block rather
 * than an edit in two files that can drift.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /*
       * Tailwind's defaults plus two ends the shop actually meets: `xs` for the 320–400 px
       * phones that are still a real share of Moroccan traffic, and `3xl` for the desktops
       * wide enough to earn a fifth product column.
       */
      screens: {
        xs: '400px',
        '3xl': '1760px',
      },
      /*
       * Every colour resolves to the `--c-*` channels in globals.css, so the palette has
       * exactly one definition. `rgb(... / <alpha-value>)` keeps Tailwind's opacity
       * modifiers working — `bg-bg/72` on the sticky header still composes correctly.
       */
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        bg2: 'rgb(var(--c-bg-2) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface-2) / <alpha-value>)',
        text: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        accent2: 'rgb(var(--c-accent-2) / <alpha-value>)',
        accent3: 'rgb(var(--c-accent-3) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        line: 'var(--border)',
        line2: 'var(--border-2)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Space Grotesk', 'Inter', 'sans-serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        // Logo lockup only — the "Service" under the RGI mark. Not for body or UI copy.
        wordmark: ['var(--font-wordmark)', 'Orbitron', 'Space Grotesk', 'sans-serif'],
      },
      borderRadius: {
        sm2: '12px',
        card: '18px',
        lg2: '26px',
      },
      boxShadow: {
        soft: 'var(--shadow)',
        glow: 'var(--glow)',
      },
      backgroundImage: {
        grad: 'var(--grad)',
        'grad-soft': 'var(--grad-soft)',
      },
      maxWidth: {
        wrap: '1220px',
        // The reading column stays 1220 px, but full-bleed grids may breathe wider on
        // very large monitors rather than leaving half the screen empty.
        'wrap-wide': '1560px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};

export default config;
