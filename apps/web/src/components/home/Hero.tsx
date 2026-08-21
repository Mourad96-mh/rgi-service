import { t } from '@/locales/fr';
import { HERO_SLIDES } from '@/data/hero-slides';
import { HeroCarousel } from './HeroCarousel';

const STATS = [
  { n: '1 200+', l: t.home.statBuilds },
  { n: '2 500+', l: t.home.statParts },
  { n: '12', l: t.home.statWarranty },
  { n: '48h', l: t.home.statDelivery },
];

/**
 * Top of the homepage: the slide deck plus the figures that stay true on every slide.
 * The carousel is the only client component here — the stats render on the server.
 */
export function Hero() {
  return (
    <>
      {/*
       * One h1 for the page. The slides carry h2s because all five are in the DOM at once
       * and a heading that changes with a timer is no use to a crawler or a screen reader.
       */}
      <h1 className="sr-only">
        {t.common.brand} — {t.common.tagline}
      </h1>

      <HeroCarousel slides={HERO_SLIDES} />

      <div className="wrap">
        <dl className="flex flex-wrap gap-x-10 gap-y-5 border-t border-line py-6">
          {STATS.map((stat) => (
            <div key={stat.l}>
              <dt className="font-display text-[24px] font-bold">{stat.n}</dt>
              <dd className="text-[12.5px] text-faint">{stat.l}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
