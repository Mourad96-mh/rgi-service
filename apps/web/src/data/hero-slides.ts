import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';

/**
 * The homepage carousel. Content lives here (copy in `locales/fr.ts`) rather than in the
 * component, so a slide is added or reordered by editing one array — and so this list can
 * later be served from the admin without touching the UI.
 *
 * `image` points at a real catalog photo already in `public/products`; keep them in sync
 * with `scripts/product-images.json`.
 */
export type HeroSlide = {
  id: string;
  pill: string;
  title1: string;
  title2: string;
  text: string;
  cta: string;
  href: string;
  image: string;
  imageAlt: string;
  /** Which accent colours the glow behind this slide. */
  tint: 'violet' | 'cyan' | 'pink';
};

const s = t.home.slides;

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'configurator',
    ...s.configurator,
    href: routes.configurator,
    image: '/products/PC-APEX-5080-1.webp',
    imageAlt: 'PC gamer assemblé par Rgi Service',
    tint: 'violet',
  },
  {
    id: 'gpu',
    ...s.gpu,
    href: routes.category('composants/cartes-graphiques'),
    image: '/products/GPU-RTX5080-TUF-1.webp',
    imageAlt: 'Carte graphique GeForce RTX 5080',
    tint: 'cyan',
  },
  {
    id: 'prebuilt',
    ...s.prebuilt,
    href: routes.category('pc-gamer'),
    image: '/products/PC-NOVA-5070-1.webp',
    imageAlt: 'PC gamer prêt à jouer',
    tint: 'violet',
  },
  {
    id: 'laptop',
    ...s.laptop,
    href: routes.category('pc-portables'),
    image: '/products/NB-ROG-G16-5070-1.webp',
    imageAlt: 'PC portable gaming',
    tint: 'pink',
  },
  {
    id: 'monitor',
    ...s.monitor,
    href: routes.category('ecrans'),
    image: '/products/MON-LG-27GS95QE-1.webp',
    imageAlt: 'Écran gaming 240 Hz',
    tint: 'cyan',
  },
];
