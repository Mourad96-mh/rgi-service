import type { Metadata } from 'next';
import type { SlotDefinition } from '@rgi/types';
import { apiFetchOrNull } from '@/lib/api';
import { SITE_NAME } from '@/lib/env';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { ConfiguratorBuilder } from '@/components/configurator/ConfiguratorBuilder';
import { EmptyState } from '@/components/ui/Section';
import { BoltIcon } from '@/components/ui/Icons';

export const metadata: Metadata = {
  title: 'Configurateur PC — monte ton PC gamer sur mesure',
  description:
    'Configure ton PC gamer pièce par pièce : compatibilité vérifiée en direct (socket, mémoire, alimentation, encombrement), montage et tests inclus, -5% sur la configuration.',
  alternates: { canonical: routes.configurator },
};

/** The slot list is static data; the build itself lives in the browser. */
export const revalidate = 3600;

export default async function ConfiguratorPage() {
  const data = await apiFetchOrNull<{ slots: SlotDefinition[]; discountPct: number }>(
    '/configurator/slots',
    { revalidate: 3600 },
  );
  const slots = data?.slots ?? [];

  return (
    <div className="wrap py-8 sm:py-12">
      <span className="pill">
        <BoltIcon className="h-3.5 w-3.5 text-accent2" />
        {t.nav.configurator} · -{data?.discountPct ?? 5}%
      </span>
      <h1 className="t-h1 mt-4 font-display font-bold sm:mt-5">
        {t.configurator.title1} <span className="grad-text">{t.configurator.title2}</span>
      </h1>
      <p className="mt-4 max-w-[720px] text-[15px] text-muted sm:text-[16.5px]">
        {t.configurator.intro}
      </p>

      {slots.length ? (
        <ConfiguratorBuilder slots={slots} />
      ) : (
        <div className="mt-10">
          <EmptyState title={t.common.apiDown} />
        </div>
      )}

      <section className="mt-12 border-t border-line pt-8 sm:mt-16 sm:pt-10">
        <h2 className="t-h2 font-display font-bold">{t.configurator.howTitle}</h2>
        {/* Two columns already fit on a tablet; three would leave 180 px cards. */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <HowCard step={1} title={t.configurator.how1Title} text={t.configurator.how1Text} />
          <HowCard step={2} title={t.configurator.how2Title} text={t.configurator.how2Text} />
          <HowCard step={3} title={t.configurator.how3Title} text={t.configurator.how3Text} />
        </div>
        <p className="mt-6 max-w-[70ch] text-[13.5px] text-muted">
          {SITE_NAME} assemble, teste et garantit chaque configuration au Maroc.
        </p>
      </section>
    </div>
  );
}

function HowCard({ step, title, text }: { step: number; title: string; text: string }) {
  return (
    <div className="surface-card p-5 sm:p-6">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-grad text-sm font-bold text-bg">
        {step}
      </span>
      <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}
