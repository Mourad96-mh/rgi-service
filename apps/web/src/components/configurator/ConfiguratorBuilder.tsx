'use client';

import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { BuildEvaluation, SlotDefinition, SlotId, Violation } from '@rgi/types';
import { api } from '@/lib/api';
import { t } from '@/locales/fr';
import { price } from '@/lib/format';
import { useConfigurator, nextEmptySlot, selectionIds } from '@/store/configurator';
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

  // The persisted build only exists in the browser; render the skeleton until it is read
  // back, otherwise the server HTML and the first client render disagree.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    const restored = useConfigurator.getState().selection;
    const empty = Object.keys(restored).length === 0;
    setOpenSlot(empty ? slots[0]?.id ?? null : nextEmptySlot(restored));
  }, [setOpenSlot, slots]);

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
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="flex flex-col gap-3">
          {slots.map((slot) => (
            <li key={slot.id} className="surface-card h-[104px] animate-pulse opacity-40" />
          ))}
        </ul>
        <div className="surface-card h-[420px] animate-pulse opacity-40" />
      </div>
    );
  }

  return (
    <>
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
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

        <BuildSummary evaluation={evaluation} pending={isFetching} />
      </div>

      {/* Mobile: the total and the state of the build follow the customer down the page.
          pr-[76px] keeps the bar's right end clear of the floating WhatsApp / phone
          buttons, which sit in the same corner. */}
      {hasSelection ? (
        <div className="sticky bottom-0 z-30 -mx-6 mt-6 flex items-center justify-between gap-4 border-t border-line2 bg-bg/95 py-3 pl-6 pr-[76px] backdrop-blur sm:pr-6 lg:hidden">
          <div>
            <span className="block text-[11px] text-faint">{t.configurator.total}</span>
            <span className="grad-text font-display text-[19px] font-bold">
              {price(evaluation?.total ?? 0)}
            </span>
          </div>
          <span
            className={`chip ${
              evaluation?.isValid ? 'bg-success/15 text-success' : 'bg-white/[.06] text-faint'
            }`}
          >
            {evaluation?.isValid ? t.configurator.ready : t.configurator.notReady}
          </span>
        </div>
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
