import type { HeroSlideImage } from '@rgi/types';
import { t } from '@/locales/fr';
import { adminFetch } from '@/lib/admin/session';
import { HERO_SLIDES } from '@/data/hero-slides';
import { HeroSlideImageField } from '@/components/admin/HeroSlideImageField';

export const metadata = { title: t.admin.heroTitle };

/**
 * Homepage carousel photos — one section of the dashboard, on its own route, because it
 * has nothing to do with the catalogue: the products page manages products.
 *
 * The slides come from the storefront's own list, so this page cannot drift out of step
 * with what the homepage renders; only the photo is stored in the database.
 */
export default async function AdminHeroPage() {
  const overrides = await adminFetch<HeroSlideImage[]>('/hero-slides');
  const bySlide = new Map(overrides.map((override) => [override.slideId, override]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[26px] font-bold">{t.admin.heroTitle}</h1>
        <p className="mt-1 max-w-[70ch] text-[13px] text-faint">{t.admin.heroText}</p>
      </div>

      <div className="flex flex-col gap-3">
        {HERO_SLIDES.map((slide, index) => {
          const override = bySlide.get(slide.id);
          return (
            <HeroSlideImageField
              key={slide.id}
              slideId={slide.id}
              label={`${t.admin.heroSlide} ${index + 1} · ${slide.title1} ${slide.title2}`}
              url={override?.url ?? slide.image}
              alt={override?.alt ?? slide.imageAlt}
              custom={Boolean(override)}
              defaultUrl={slide.image}
            />
          );
        })}
      </div>
    </div>
  );
}
