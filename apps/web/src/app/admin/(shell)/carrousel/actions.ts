'use server';

import { revalidatePath } from 'next/cache';
import type { HeroSlideId, HeroSlideImage } from '@rgi/types';
import { adminFetch, AdminApiError } from '@/lib/admin/session';

export interface HeroResult {
  ok: boolean;
  message?: string;
}

/**
 * Point one carousel slide at a new photo.
 *
 * Both the admin list and the homepage are revalidated: without the second call the shop
 * would keep serving the cached hero for up to a minute and staff would reasonably assume
 * the save had failed.
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
    revalidatePath('/admin/carrousel');
    revalidatePath('/');
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
    revalidatePath('/admin/carrousel');
    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof AdminApiError ? error.message : 'Réinitialisation impossible.',
    };
  }
}
