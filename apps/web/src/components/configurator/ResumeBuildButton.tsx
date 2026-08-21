'use client';

import { useRouter } from 'next/navigation';
import type { Build, ProductSummary } from '@rgi/types';
import { SLOTS } from '@rgi/types';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { useConfigurator } from '@/store/configurator';

/**
 * Load a shared build back into the builder.
 *
 * A saved build stores a *snapshot* of each part (name, brand, image, price at the time),
 * which is exactly what the builder needs to draw the step — and the ids are what the API
 * re-prices and re-validates. So the snapshot is rebuilt into the shape the store holds
 * rather than refetching every product.
 */
export function ResumeBuildButton({ build }: { build: Build }) {
  const router = useRouter();
  const hydrate = useConfigurator((state) => state.hydrateFromBuild);

  function resume() {
    const parts: ProductSummary[] = build.items.map((item) => ({
      id: item.product,
      name: { fr: item.name ?? '' },
      slug: '',
      brand: item.brand ?? '',
      categoryType:
        SLOTS.find((slot) => slot.id === item.slot)?.componentType ?? item.slot,
      price: item.priceAtBuild,
      effectivePrice: item.priceAtBuild,
      images: item.image ? [{ url: item.image, publicId: '', isPrimary: true, order: 0 }] : [],
      attributes: {},
      stock: 1,
    }));

    hydrate(build.items, parts);
    router.push(routes.configurator);
  }

  return (
    <button type="button" onClick={resume} className="btn btn-primary justify-center">
      {t.configurator.resume}
    </button>
  );
}
