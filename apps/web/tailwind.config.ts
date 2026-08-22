import type { Config } from 'tailwindcss';

/**
 * The tokens from `docs/DESIGN_SYSTEM.md` §2–§4, mirrored 1:1 from the mockup's CSS
 * variables. Swapping `accent` / `accent2` here re-skins the whole site — storefront and
 * admin alike — which is exactly what the doc asks for when the client's brand colours
 * arrive.
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
      colors: {
        bg: '#0a0b12',
        bg2: '#0f1119',
        surface: '#141726',
        surface2: '#1a1e30',
        text: '#eef0f6',
        muted: '#9aa1b8',
        faint: '#6b7191',
        accent: '#7c5cff',
        accent2: '#22d3ee',
        accent3: '#ff4d8d',
        success: '#34d399',
        warn: '#fbbf24',
        line: 'rgba(255,255,255,.08)',
        line2: 'rgba(255,255,255,.14)',
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
        soft: '0 20px 50px -20px rgba(0,0,0,.7)',
        glow: '0 0 40px -8px rgba(124,92,255,.55)',
      },
      backgroundImage: {
        grad: 'linear-gradient(120deg,#7c5cff 0%,#22d3ee 100%)',
        'grad-soft':
          'linear-gradient(120deg,rgba(124,92,255,.18),rgba(34,211,238,.14))',
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
