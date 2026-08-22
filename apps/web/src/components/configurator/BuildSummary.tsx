'use client';

import { useState } from 'react';
import type { BuildEvaluation, SlotId } from '@rgi/types';
import { SLOTS } from '@rgi/types';
import { api } from '@/lib/api';
import { t } from '@/locales/fr';
import { price } from '@/lib/format';
import { SITE_URL } from '@/lib/env';
import { routes } from '@/lib/routes';
import { useConfigurator, selectionIds } from '@/store/configurator';
import { useCart } from '@/store/cart';
import Link from 'next/link';
import { BoltIcon, CartIcon, CheckIcon } from '@/components/ui/Icons';

/**
 * The persistent panel CONFIGURATOR_ENGINE.md §4 asks for: running subtotal, −5%, total,
 * estimated wattage, recommended PSU and the current errors/warnings — all of it straight
 * from the API's authoritative evaluation, never recomputed in the browser.
 */
export function BuildSummary({
  evaluation,
  pending,
}: {
  evaluation?: BuildEvaluation;
  pending: boolean;
}) {
  const selection = useConfigurator((state) => state.selection);
  const setOpenSlot = useConfigurator((state) => state.setOpenSlot);
  const clear = useConfigurator((state) => state.clear);

  const addBuild = useCart((state) => state.addBuild);
  const [added, setAdded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const chosen = Object.values(selection).flat().length;
  const errors = evaluation?.violations.filter((v) => v.severity === 'error') ?? [];
  const warnings = evaluation?.violations.filter((v) => v.severity === 'warning') ?? [];
  const ready = Boolean(evaluation?.isValid);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const build = await api.saveBuild(selectionIds(selection));
      setShareUrl(`${SITE_URL}${routes.build(build.shareId)}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    /*
     * The card treatment (rounded corners, full border) belongs to the desktop sidebar.
     * Below `lg` this same element is the body of the bottom sheet, where a rounded box
     * floating inside another box would read as a mistake — only the rule separating it
     * from the sheet's bar survives.
     */
    <aside className="border-t border-line bg-surface p-4 sm:p-5 lg:sticky lg:top-24 lg:rounded-card lg:border lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="font-display text-lg font-bold">{t.configurator.summaryTitle}</h2>
        <span
          className={`chip ${ready ? 'bg-success/15 text-success' : 'bg-white/[.06] text-faint'}`}
        >
          {ready ? t.configurator.ready : t.configurator.notReady}
        </span>
      </div>

      <dl className="mt-5 flex flex-col gap-2.5 text-sm">
        <Line label={t.configurator.subtotal} value={price(evaluation?.subtotal ?? 0)} />
        <Line
          label={t.configurator.discount(evaluation?.discountPct ?? 5)}
          value={`-${price((evaluation?.subtotal ?? 0) - (evaluation?.total ?? 0))}`}
          accent
        />
        <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3 border-t border-line pt-3">
          <dt className="text-sm text-muted">{t.configurator.total}</dt>
          <dd className="grad-text t-h3 font-display font-bold">
            {price(evaluation?.total ?? 0)}
          </dd>
        </div>
      </dl>

      <dl className="mt-5 flex flex-col gap-2.5 border-t border-line pt-4 text-[13px]">
        <Line
          label={t.configurator.wattage}
          value={`${evaluation?.estimatedWattage ?? 0} W`}
        />
        <Line
          label={t.configurator.recommendedPsu}
          value={`${evaluation?.recommendedPsuWattage ?? 0} W`}
        />
      </dl>

      {errors.length ? (
        <Block title={t.configurator.errorsTitle} tone="error">
          {errors.map((violation) => (
            <li key={violation.ruleId}>{violation.messageFr}</li>
          ))}
        </Block>
      ) : null}

      {warnings.length ? (
        <Block title={t.configurator.warningsTitle} tone="warn">
          {warnings.map((violation) => (
            <li key={violation.ruleId}>{violation.messageFr}</li>
          ))}
        </Block>
      ) : null}

      {evaluation?.missingSlots.length ? (
        <Block title={t.configurator.missingTitle} tone="muted">
          {evaluation.missingSlots.map((slot) => (
            <li key={slot}>
              <button
                type="button"
                onClick={() => setOpenSlot(slot as SlotId)}
                className="text-left hover:text-text hover:underline"
              >
                {SLOTS.find((definition) => definition.id === slot)?.labelFr ?? slot}
              </button>
            </li>
          ))}
        </Block>
      ) : null}

      <div className="mt-5 flex items-start gap-2.5 rounded-sm2 border border-line bg-white/[.03] p-3.5 text-[12.5px] text-muted">
        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <span>
          <span className="block font-semibold text-text">{t.configurator.services}</span>
          {t.configurator.servicesText}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          disabled={!ready || pending}
          onClick={() => {
            // The parts are sent as ids; the API re-prices and re-validates the whole
            // build before it ever becomes an order line.
            addBuild(selectionIds(selection), {
              name: t.cart.buildLine,
              image: selection.case?.[0]?.images?.[0]?.url,
              unitPrice: evaluation?.total ?? 0,
            });
            setAdded(true);
          }}
          className="btn btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CartIcon />
          {t.configurator.addToCart}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || chosen === 0}
          className="btn btn-ghost w-full justify-center disabled:opacity-40"
        >
          <BoltIcon className="h-4 w-4" />
          {saving ? t.configurator.saving : t.configurator.save}
        </button>
        {chosen ? (
          <button
            type="button"
            onClick={clear}
            className="min-h-[44px] text-[12.5px] text-faint transition hover:text-accent3"
          >
            {t.configurator.reset}
          </button>
        ) : null}
      </div>

      {added ? (
        <p role="status" className="mt-4 flex flex-wrap items-center gap-2 rounded-sm2 border border-line2 bg-white/[.04] px-4 py-3 text-[12.5px] text-success">
          <CheckIcon className="h-4 w-4" />
          {t.cart.addedBuild}
          <Link href={routes.cart} className="font-semibold text-accent2 hover:underline">
            {t.cart.viewCart}
          </Link>
        </p>
      ) : null}

      {saveError ? (
        <p role="alert" className="mt-4 text-[12.5px] text-accent3">
          {saveError}
        </p>
      ) : null}

      {shareUrl ? (
        <div className="mt-4 rounded-sm2 border border-line2 bg-white/[.04] p-3.5">
          <p className="text-[12.5px] font-semibold">{t.configurator.savedTitle}</p>
          <p className="mt-1 text-[12px] text-muted">{t.configurator.savedText}</p>
          <p className="mt-2 truncate rounded-md bg-bg2 px-2.5 py-2 text-[11.5px] text-faint">
            {shareUrl}
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(shareUrl).then(() => setCopied(true));
            }}
            className="mt-1 min-h-[44px] text-[12.5px] font-semibold text-accent2 hover:underline"
          >
            {copied ? t.configurator.copied : t.configurator.copy}
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={accent ? 'font-semibold text-accent2' : 'font-semibold'}>{value}</dd>
    </div>
  );
}

function Block({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'error' | 'warn' | 'muted';
  children: React.ReactNode;
}) {
  const colour =
    tone === 'error' ? 'text-accent3' : tone === 'warn' ? 'text-warn' : 'text-muted';
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className={`text-[12px] font-bold uppercase tracking-[.06em] ${colour}`}>
        {title}
      </h3>
      <ul className={`mt-2 flex flex-col gap-1.5 text-[12.5px] ${colour}`}>{children}</ul>
    </div>
  );
}
