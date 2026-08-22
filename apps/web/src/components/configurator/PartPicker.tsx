'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import type { ProductSummary, SlotDefinition } from '@rgi/types';
import { api } from '@/lib/api';
import { t } from '@/locales/fr';
import { cardSpecs, price, primaryImage } from '@/lib/format';
import { useConfigurator, selectionIdsBefore } from '@/store/configurator';
import { CheckIcon } from '@/components/ui/Icons';

/**
 * The compatible parts for one step.
 *
 * The list comes from `GET /configurator/parts`, which runs the same engine the API uses
 * to validate — so an incompatible part never reaches the customer
 * (CONFIGURATOR_ENGINE.md §4). The count of what was filtered out is shown rather than
 * hidden: it is the proof that the builder is doing its job.
 */
export function PartPicker({ slot }: { slot: SlotDefinition }) {
  const selection = useConfigurator((state) => state.selection);
  const inStockOnly = useConfigurator((state) => state.inStockOnly);
  const setInStockOnly = useConfigurator((state) => state.setInStockOnly);
  const pick = useConfigurator((state) => state.pick);
  const [term, setTerm] = useState('');

  const ids = useMemo(() => selectionIdsBefore(selection, slot.id), [selection, slot.id]);
  const chosenIds = new Set((selection[slot.id] ?? []).map((part) => part.id));

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['configurator-parts', slot.id, ids, inStockOnly],
    queryFn: () => api.configuratorParts(slot.id, ids, inStockOnly),
  });

  const parts = useMemo(() => {
    const list = data?.parts ?? [];
    const needle = term.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((part) =>
      `${part.name.fr} ${part.brand}`.toLowerCase().includes(needle),
    );
  }, [data, term]);

  const full =
    slot.multi && (selection[slot.id]?.length ?? 0) >= (slot.maxItems ?? 8);

  return (
    <div className="border-t border-line p-4 sm:px-5 sm:py-5">
      {/* The search field takes the whole line on a phone and only shrinks to its 320 px
          desktop width from `sm` up; the counts drop below it rather than squeezing it. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t.configurator.searchPlaceholder}
          className="field basis-full sm:max-w-[320px] sm:basis-auto"
          aria-label={t.configurator.searchPlaceholder}
        />
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => setInStockOnly(event.target.checked)}
            className="h-[18px] w-[18px] shrink-0 accent-[var(--accent)]"
          />
          {t.configurator.inStockOnly}
        </label>

        {data ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-faint sm:ml-auto">
            <span>{t.configurator.availableCount(data.parts.length)}</span>
            {data.incompatibleCount > 0 ? (
              <span className="pill !py-1 !text-[11.5px]">
                {t.configurator.hiddenIncompatible(data.incompatibleCount)}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {isPending ? (
        <p className="mt-5 text-sm text-muted">{t.configurator.loading}</p>
      ) : isError ? (
        <p className="mt-5 text-sm text-accent3">
          {error instanceof Error ? error.message : t.common.error}
        </p>
      ) : full ? (
        <p className="mt-5 text-sm text-warn">{t.configurator.maxReached}</p>
      ) : parts.length === 0 ? (
        <p className="mt-5 max-w-[60ch] text-sm text-muted">{t.configurator.noParts}</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2">
          {parts.map((part) => (
            <PartOption
              key={part.id}
              part={part}
              chosen={chosenIds.has(part.id)}
              onPick={() => pick(slot.id, part)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PartOption({
  part,
  chosen,
  onPick,
}: {
  part: ProductSummary;
  chosen: boolean;
  onPick: () => void;
}) {
  const image = primaryImage(part);
  const specs = cardSpecs(part);

  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        aria-pressed={chosen}
        className={`flex w-full gap-3 rounded-card border p-3 text-left transition hover:-translate-y-0.5 hover:border-line2 ${
          chosen ? 'border-accent2 bg-white/[.05]' : 'border-line bg-surface'
        }`}
      >
        {/* 76 px of thumbnail leaves barely 130 px for a part name on a 320 px screen, so
            the smallest phones get a smaller tile. */}
        <span className="photo-tile relative grid h-[64px] w-[64px] shrink-0 place-items-center xs:h-[76px] xs:w-[76px]">
          {image ? (
            <Image
              src={image.url}
              alt=""
              fill
              sizes="(max-width: 400px) 64px, 76px"
              className="object-contain p-1.5"
            />
          ) : (
            <span aria-hidden className="text-[22px] opacity-30 grayscale xs:text-[26px]">
              🖥️
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-faint">
            {part.brand}
          </span>
          <span className="text-[13.5px] font-semibold leading-snug">{part.name.fr}</span>
          {specs.length ? (
            <span className="flex flex-wrap gap-1">
              {specs.map((spec) => (
                <span key={spec} className="spec-pill">
                  {spec}
                </span>
              ))}
            </span>
          ) : null}
          <span className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
            <span className="grad-text font-display text-[15px] font-bold">
              {price(part.effectivePrice)}
            </span>
            {part.stock <= 0 ? (
              <span className="text-[11.5px] text-faint">{t.common.outOfStock}</span>
            ) : chosen ? (
              <span className="flex items-center gap-1 text-[11.5px] font-semibold text-accent2">
                <CheckIcon className="h-3.5 w-3.5" />
                {t.configurator.selected}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}
