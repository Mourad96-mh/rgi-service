// These were server actions. The dashboard now ships inside the static export, where no
// server exists to run one, so they are ordinary async functions that the client
// components already importing them call directly against the API. See lib/admin/session.
import type { HeroSlideId, HeroSlideImage } from '@rgi/types';
import { adminFetch, AdminApiError } from '@/lib/admin/session';

export interface HeroResult {
  ok: boolean;
  message?: string;
}

/**
 * Point one carousel slide at a new photo.
 *
 * The new photo is stored immediately and the admin shows it at once, but the homepage on
 * rgiservice.ma keeps its old hero until the site is rebuilt and re-uploaded — the export
 * bakes the carousel into `index.html`. `HeroSlideImageField` says so on screen, so staff
 * do not read the unchanged shop as a failed save.
 */
export async function setHeroImage(
  slideId: HeroSlideId,
  image: { url: string; publicId?: string; alt: string },
): Promise<HeroResult> {
  try {
    await adminFetch<HeroSlideImage>(`/hero-slides/${slideId}`, {
      method: 'PUT',
      body: JSON.stringify(image),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Mise à jour impossible.',
    };
  }
}

/** Drop the override so the slide shows the photo that ships with the site again. */
export async function resetHeroImage(slideId: HeroSlideId): Promise<HeroResult> {
  try {
    await adminFetch<void>(`/hero-slides/${slideId}`, { method: 'DELETE' });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Réinitialisation impossible.',
    };
  }
}
