'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Build } from '@rgi/types';
import { SLOTS } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { EmptyState } from '@/components/ui/Section';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { price } from '@/lib/format';
import { ResumeBuildButton } from '@/components/configurator/ResumeBuildButton';

/**
 * A shared build, fetched in the browser from `?id=…`.
 *
 * The share id cannot be a path segment on a static host — the build is created long after
 * the site is built, so no such file exists. The page is `noindex` (a private link, not a
 * page for Google — SEO_STRATEGY.md §robots), so this costs nothing in search.
 */
export function SharedBuild() {
  const shareId = useSearchParams().get('id') ?? '';
  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    apiFetchOrNull<Build>(`/configurator/builds/${encodeURIComponent(shareId)}`, {
      revalidate: 0,
    }).then((found) => {
      if (cancelled) return;
      setBuild(found);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  if (loading) {
    return (
      <div className="wrap py-12 sm:py-16">
        <div className="surface-card h-40 animate-pulse" />
      </div>
    );
  }

  if (!build) {
    return (
      <div className="wrap py-12 sm:py-16">
        <EmptyState
          title={t.configurator.sharedNotFound}
          action={
            <Link href={routes.configurator} className="btn btn-primary">
              {t.nav.configurator}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="wrap py-8 sm:py-12">
      <span className="pill">{t.configurator.sharedTitle}</span>
      <h1 className="t-h1 mt-4 font-display font-bold sm:mt-5">
        {build.name ?? t.configurator.summaryTitle}
      </h1>

      <div className="mt-6 grid items-start gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="flex flex-col gap-2.5">
          {build.items.map((item, index) => (
            /* The price wraps under the part rather than stealing width from its name:
               below ~360 px the two cannot share a line. */
            <li
              key={`${item.slot}-${item.product}-${index}`}
              className="surface-card flex flex-wrap items-center gap-x-4 gap-y-2 p-3 sm:p-3.5"
            >
              <span className="photo-tile relative h-[54px] w-[54px] shrink-0 xs:h-[62px] xs:w-[62px]">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 400px) 54px, 62px"
                    className="object-contain p-1.5"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1 basis-[130px]">
                <span className="block text-[11px] uppercase tracking-[.05em] text-faint">
                  {SLOTS.find((slot) => slot.id === item.slot)?.labelFr ?? item.slot}
                </span>
                <span className="block truncate text-[14px] font-semibold">{item.name}</span>
                <span className="text-[11.5px] text-faint">{item.brand}</span>
              </span>
              <span className="ml-auto font-display text-[15px] font-bold">
                {price(item.priceAtBuild)}
              </span>
            </li>
          ))}
        </ul>

        <aside className="surface-card p-5 sm:p-6 lg:sticky lg:top-24">
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t.configurator.subtotal}</dt>
              <dd className="font-semibold">{price(build.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t.configurator.discount(build.discountPct)}</dt>
              <dd className="font-semibold text-accent2">
                -{price(build.subtotal - build.total)}
              </dd>
            </div>
            <div className="mt-1 flex items-end justify-between border-t border-line pt-3">
              <dt className="text-muted">{t.configurator.total}</dt>
              <dd className="grad-text t-h3 font-display font-bold">
                {price(build.total)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3 text-[13px]">
              <dt className="text-muted">{t.configurator.wattage}</dt>
              <dd className="font-semibold">{build.estimatedWattage} W</dd>
            </div>
          </dl>

          {build.warnings.length ? (
            <ul className="mt-5 flex flex-col gap-1.5 border-t border-line pt-4 text-[12.5px] text-warn">
              {build.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <div className="mt-5 flex flex-col gap-2.5">
            <ResumeBuildButton build={build} />
            <Link href={routes.configurator} className="btn btn-ghost justify-center">
              {t.nav.configurator}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
