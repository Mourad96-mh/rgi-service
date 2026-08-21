import Link from 'next/link';
import { t } from '@/locales/fr';
import { routes } from '@/lib/routes';
import { BoltIcon, CheckIcon } from '@/components/ui/Icons';

/** A live preview of the builder's compatibility feedback (DESIGN_SYSTEM.md §5). */
const STEPS = [
  { n: 1, label: 'Boîtier · Lancool 216', state: 'ok' as const, note: 'Compatible' },
  { n: 2, label: 'Carte mère · B650 ATX', state: 'ok' as const, note: 'Compatible' },
  { n: 3, label: 'Processeur · Ryzen 7 7800X3D', state: 'ok' as const, note: 'Socket AM5' },
  { n: 4, label: 'Carte graphique · RTX 5080', state: 'ok' as const, note: '348 mm — OK' },
  { n: 5, label: 'Alimentation · 650 W', state: 'warn' as const, note: '850 W conseillés' },
];

export function ConfiguratorCta() {
  return (
    <section className="py-14">
      <div className="wrap">
        <div className="relative grid items-center gap-9 overflow-hidden rounded-lg2 border border-line2 bg-[linear-gradient(120deg,#12132022,#1a1e30)] p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(124,92,255,.28),transparent_45%),radial-gradient(circle_at_90%_90%,rgba(34,211,238,.22),transparent_45%)]"
          />

          <div className="relative z-10">
            <span className="pill">
              <BoltIcon className="h-3.5 w-3.5 text-accent2" />
              {t.nav.configurator} · {t.nav.configuratorBadge}
            </span>
            <h2 className="my-3.5 text-[clamp(26px,4vw,34px)] font-bold">{t.home.configuratorTitle}</h2>
            <p className="mb-6 max-w-[420px] text-muted">{t.home.configuratorText}</p>
            <Link href={routes.configurator} className="btn btn-primary">
              <BoltIcon className="h-[18px] w-[18px]" />
              {t.home.configuratorCta}
            </Link>
          </div>

          <div className="relative z-10 flex flex-col gap-2.5">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="flex items-center gap-3.5 rounded-sm2 border border-line bg-bg/50 px-4 py-3.5"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-grad text-[13px] font-bold text-bg">
                  {step.n}
                </span>
                <span className="text-sm font-semibold">{step.label}</span>
                <span
                  className={`ml-auto flex items-center gap-1 text-xs font-semibold ${
                    step.state === 'ok' ? 'text-success' : 'text-warn'
                  }`}
                >
                  {step.state === 'ok' ? <CheckIcon className="h-3.5 w-3.5" /> : <BoltIcon className="h-3.5 w-3.5" />}
                  {step.note}
                </span>
              </div>
            ))}
            <p className="mt-1 text-center text-xs text-faint">{t.home.configuratorSteps}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
