import type { HeroSlideImage } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { t } from '@/locales/fr';
import { applyHeroImages } from '@/data/hero-slides';
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
 *
 * The photos staff picked in `/admin/carrousel` are fetched here rather than passed down
 * from the page, so the hero owns its own data. `apiFetchOrNull` means an API outage
 * costs the overrides, not the carousel: the slides fall back to the images in the code.
 * A short revalidate keeps a swapped photo from taking the homepage's five minutes to
 * appear — and saving one also revalidates `/` outright.
 */
export async function Hero() {
  const overrides = await apiFetchOrNull<HeroSlideImage[]>('/hero-slides', { revalidate: 60 });
  const slides = applyHeroImages(overrides);

  return (
    <>
      {/*
       * One h1 for the page. The slides carry h2s because all five are in the DOM at once
       * and a heading that changes with a timer is no use to a crawler or a screen reader.
       */}
      <h1 className="sr-only">
        {t.common.brand} — {t.common.tagline}
      </h1>

      <HeroCarousel slides={slides} />

      <div className="wrap">
        {/* Four stats never fit on one line on a phone, and wrapping them freely leaves a
            ragged 3 + 1. A 2-column grid below `sm` makes the break deliberate; from `sm`
            up they go back to a single flowing row. */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line py-6 sm:flex sm:flex-wrap sm:gap-x-10">
          {STATS.map((stat) => (
            <div key={stat.l} className="min-w-0">
              <dt className="t-h3 font-display font-bold">{stat.n}</dt>
              <dd className="text-[12.5px] text-faint">{stat.l}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
