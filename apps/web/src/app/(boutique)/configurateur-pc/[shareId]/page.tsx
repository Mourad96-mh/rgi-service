import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Build } from '@rgi/types';
import { SLOTS } from '@rgi/types';
import { ApiError, apiFetch } from '@/lib/api';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { price } from '@/lib/format';
import { ResumeBuildButton } from '@/components/configurator/ResumeBuildButton';

/** A shared build is a private link, not a page for Google (SEO_STRATEGY.md §robots). */
export const metadata: Metadata = {
  title: 'Configuration partagée',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SharedBuildPage({ params }: { params: { shareId: string } }) {
  let build: Build;
  try {
    build = await apiFetch<Build>(`/configurator/builds/${params.shareId}`, {
      revalidate: 0,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="wrap py-12">
      <span className="pill">{t.configurator.sharedTitle}</span>
      <h1 className="mt-5 font-display text-[clamp(26px,4.5vw,38px)] font-bold">
        {build.name ?? t.configurator.summaryTitle}
      </h1>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="flex flex-col gap-2.5">
          {build.items.map((item, index) => (
            <li
              key={`${item.slot}-${item.product}-${index}`}
              className="surface-card flex items-center gap-4 p-3.5"
            >
              <span className="photo-tile relative h-[62px] w-[62px] shrink-0">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="62px"
                    className="object-contain p-1.5"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] uppercase tracking-[.05em] text-faint">
                  {SLOTS.find((slot) => slot.id === item.slot)?.labelFr ?? item.slot}
                </span>
                <span className="block truncate text-[14px] font-semibold">{item.name}</span>
                <span className="text-[11.5px] text-faint">{item.brand}</span>
              </span>
              <span className="font-display text-[15px] font-bold">
                {price(item.priceAtBuild)}
              </span>
            </li>
          ))}
        </ul>

        <aside className="surface-card p-6 lg:sticky lg:top-24">
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
              <dd className="grad-text font-display text-[24px] font-bold">
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
