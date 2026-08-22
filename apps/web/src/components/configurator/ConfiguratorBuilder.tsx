'use client';

import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { BuildEvaluation, SlotDefinition, SlotId, Violation } from '@rgi/types';
import { api } from '@/lib/api';
import { t } from '@/locales/fr';
import { price } from '@/lib/format';
import { useConfigurator, nextEmptySlot, selectionIds } from '@/store/configurator';
import { ArrowIcon } from '@/components/ui/Icons';
import { SlotCard } from './SlotCard';
import { BuildSummary } from './BuildSummary';

/**
 * The builder. One React Query client scoped to this page — the rest of the storefront is
 * server-rendered and needs none.
 *
 * Every evaluation comes from `POST /configurator/validate`: the same engine the 42 unit
 * tests cover, run against fresh prices and stock from the database. The browser never
 * decides whether a build is valid, and never adds up money.
 */
export function ConfiguratorBuilder({ slots }: { slots: SlotDefinition[] }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <Builder slots={slots} />
    </QueryClientProvider>
  );
}

function Builder({ slots }: { slots: SlotDefinition[] }) {
  const selection = useConfigurator((state) => state.selection);
  const openSlot = useConfigurator((state) => state.openSlot);
  const setOpenSlot = useConfigurator((state) => state.setOpenSlot);

  // Below `lg` the summary is a bottom sheet rather than a column; this is whether it is
  // expanded. It has no meaning from `lg` up, where the summary is always visible.
  const [sheetOpen, setSheetOpen] = useState(false);

  // The persisted build only exists in the browser; render the skeleton until it is read
  // back, otherwise the server HTML and the first client render disagree.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    const restored = useConfigurator.getState().selection;
    const empty = Object.keys(restored).length === 0;
    setOpenSlot(empty ? slots[0]?.id ?? null : nextEmptySlot(restored));
  }, [setOpenSlot, slots]);

  // Jumping to a step from the summary ("Étapes à compléter") has to reveal that step, so
  // the sheet gets out of the way as soon as the open step changes.
  useEffect(() => {
    setSheetOpen(false);
  }, [openSlot]);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const ids = useMemo(() => selectionIds(selection), [selection]);
  const hasSelection = Object.keys(ids).length > 0;

  const { data: evaluation, isFetching } = useQuery<BuildEvaluation>({
    queryKey: ['configurator-validate', ids],
    queryFn: () => api.validateBuild(ids),
    enabled: ready,
    placeholderData: (previous) => previous,
  });

  const bySlot = useMemo(() => groupViolations(evaluation?.violations ?? []), [evaluation]);

  if (!ready) {
    return (
      <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="flex flex-col gap-3">
          {slots.map((slot) => (
            <li key={slot.id} className="surface-card h-[104px] animate-pulse opacity-40" />
          ))}
        </ul>
        <div className="surface-card hidden h-[420px] animate-pulse opacity-40 lg:block" />
      </div>
    );
  }

  const firstError = evaluation?.violations.find((violation) => violation.severity === 'error');

  return (
    <>
      {/*
       * `pb-28` reserves the height of the mobile summary bar so the last step is never
       * hidden underneath it. From `lg` up the summary is a real column again and the
       * clearance is not needed.
       */}
      <div
        className={`mt-8 grid items-start gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-[1fr_360px] lg:pb-0 ${
          hasSelection ? 'pb-28' : ''
        }`}
      >
        <ol className="flex flex-col gap-3">
          {slots.map((slot, index) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              index={index}
              violations={bySlot.get(slot.id) ?? []}
            />
          ))}
        </ol>

        {/*
         * One BuildSummary, two shapes. From `lg` it is the sticky sidebar the spec asks
         * for; below that the very same element becomes a bottom sheet pinned to the
         * viewport, so the running total and any blocking error stay in front of the
         * customer while they are still picking parts. Rendering it once — rather than a
         * desktop copy plus a mobile copy — keeps the "added to cart" / share-link state
         * in a single place.
         */}
        <div
          className={`fixed inset-x-0 bottom-0 border-t border-line2 bg-bg/95 backdrop-blur
            lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:backdrop-blur-none
            ${sheetOpen ? 'z-50' : 'z-30'}
            ${hasSelection ? '' : 'hidden lg:block'}`}
        >
          {/*
           * The compact bar. The whole strip is the toggle so it is impossible to miss
           * with a thumb, and `pr-[76px]` (wider from `sm`, where the buttons carry their
           * labels) keeps its right end clear of the floating WhatsApp / phone buttons,
           * which are pinned to the same corner.
           */}
          <button
            type="button"
            onClick={() => setSheetOpen((current) => !current)}
            aria-expanded={sheetOpen}
            aria-label={t.configurator.summaryTitle}
            className="flex w-full items-center gap-3 py-2.5 pl-4 pr-[76px] text-left sm:pl-6 sm:pr-[168px] lg:hidden"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-faint">{t.configurator.total}</span>
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="grad-text font-display text-[19px] font-bold">
                  {price(evaluation?.total ?? 0)}
                </span>
                <span className="text-[11.5px] text-faint">
                  {evaluation?.estimatedWattage ?? 0} W
                </span>
              </span>
              {firstError ? (
                <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-accent3">
                  {firstError.messageFr}
                </span>
              ) : null}
            </span>

            {/* The status chip is the first thing to go when the screen is only 320 px
                wide — the error line above already carries the same information. */}
            <span
              className={`chip hidden shrink-0 xs:inline-block ${
                evaluation?.isValid ? 'bg-success/15 text-success' : 'bg-text/[.06] text-faint'
              }`}
            >
              {evaluation?.isValid ? t.configurator.ready : t.configurator.notReady}
            </span>

            <span
              aria-hidden
              className="grid h-11 w-8 shrink-0 place-items-center text-muted"
            >
              <ArrowIcon
                className={`h-4 w-4 transition-transform ${
                  sheetOpen ? 'rotate-90' : '-rotate-90'
                }`}
              />
            </span>
          </button>

          <div
            className={`max-h-[68vh] overflow-y-auto overscroll-contain lg:block lg:max-h-none
              lg:overflow-visible ${sheetOpen ? 'block' : 'hidden'}`}
          >
            <BuildSummary evaluation={evaluation} pending={isFetching} />
          </div>
        </div>
      </div>

      {/* Tapping beside an open sheet closes it, the way a drawer is expected to behave. */}
      {sheetOpen ? (
        <div
          aria-hidden
          onClick={() => setSheetOpen(false)}
          className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}
    </>
  );
}

/** A violation names the slots it involves, so each step can show its own problems. */
function groupViolations(violations: Violation[]): Map<SlotId, Violation[]> {
  const map = new Map<SlotId, Violation[]>();
  for (const violation of violations) {
    for (const slot of violation.slots) {
      map.set(slot, [...(map.get(slot) ?? []), violation]);
    }
  }
  return map;
}
