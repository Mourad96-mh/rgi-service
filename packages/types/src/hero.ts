/**
 * The homepage carousel.
 *
 * The slides themselves — French copy, destination links, colour tint — live in the
 * storefront's code, because they are editorial and change with a deployment. The
 * **photo** on each slide is the part staff swap for a promotion, so only that is stored
 * in the database, keyed by the slide it belongs to.
 *
 * The ids live here rather than in the web app so the API can refuse an unknown slide:
 * the same list validates the request and builds the admin page.
 */
export const HERO_SLIDE_IDS = ['configurator', 'gpu', 'prebuilt', 'laptop', 'monitor'] as const;

export type HeroSlideId = (typeof HERO_SLIDE_IDS)[number];

/** A staff-chosen photo replacing the slide's built-in one. */
export interface HeroSlideImage {
  slideId: HeroSlideId;
  /** Cloudinary URL, or a site-relative `/products/…` path for a catalogue photo. */
  url: string;
  /** Set when the file was uploaded through the admin; absent for catalogue photos. */
  publicId?: string;
  alt: string;
  updatedAt?: string;
}
