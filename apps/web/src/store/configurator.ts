import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuildItem, ProductSummary, SlotId } from '@rgi/types';
import { SLOTS } from '@rgi/types';

/**
 * The build in progress (CLAUDE.md §2: Zustand owns cart/configurator state).
 *
 * The store keeps whole `ProductSummary` objects so the UI can render a chosen part
 * without another round trip — but only their **ids** are ever sent to the API. Prices,
 * compatibility and the total are always recomputed server-side from the database
 * (CONFIGURATOR_ENGINE.md §5: never trust the client with money).
 *
 * It persists to localStorage so a reload, or a detour to a product page, does not throw
 * away a half-finished build.
 */
export type SlotSelection = Partial<Record<SlotId, ProductSummary[]>>;

interface ConfiguratorState {
  selection: SlotSelection;
  /** Which step is expanded in the builder; null when every card is collapsed. */
  openSlot: SlotId | null;
  inStockOnly: boolean;

  pick: (slot: SlotId, part: ProductSummary) => void;
  remove: (slot: SlotId, partId: string) => void;
  clear: () => void;
  setOpenSlot: (slot: SlotId | null) => void;
  setInStockOnly: (value: boolean) => void;
  /** Refill the builder from a saved build (`GET /configurator/builds/:shareId`). */
  hydrateFromBuild: (items: BuildItem[], parts: ProductSummary[]) => void;
}

const definition = (slot: SlotId) => SLOTS.find((s) => s.id === slot);

/** The first required step with nothing in it — where the customer should go next. */
export function nextEmptySlot(selection: SlotSelection): SlotId | null {
  const slot = SLOTS.find((s) => s.required && !selection[s.id]?.length);
  return slot?.id ?? null;
}

/**
 * What constrains the parts offered for one step: everything chosen **before** it, plus —
 * for a multi step — what is already in that step, so sum rules (total RAM capacity, board
 * slots) still apply to the next stick.
 *
 * Later steps are deliberately left out. Editing the case must not be restricted by the
 * power supply picked afterwards: CONFIGURATOR_ENGINE.md §4 wants an earlier change to be
 * possible and the now-invalid later part to be **flagged**, not silently dropped or
 * hidden behind a picker that has quietly run out of options.
 */
export function selectionIdsBefore(
  selection: SlotSelection,
  slot: SlotId,
): Record<string, string | string[]> {
  const target = definition(slot);
  const ids: Record<string, string | string[]> = {};
  for (const candidate of SLOTS) {
    const parts = selection[candidate.id];
    if (!parts?.length) continue;
    const earlier = candidate.order < (target?.order ?? 0);
    const sameMulti = candidate.id === slot && candidate.multi;
    if (!earlier && !sameMulti) continue;
    ids[candidate.id] = candidate.multi ? parts.map((part) => part.id) : parts[0].id;
  }
  return ids;
}

/** slot → id | id[], the only shape the API ever receives. */
export function selectionIds(selection: SlotSelection): Record<string, string | string[]> {
  const ids: Record<string, string | string[]> = {};
  for (const slot of SLOTS) {
    const parts = selection[slot.id];
    if (!parts?.length) continue;
    ids[slot.id] = slot.multi ? parts.map((p) => p.id) : parts[0].id;
  }
  return ids;
}

export const useConfigurator = create<ConfiguratorState>()(
  persist(
    (set, get) => ({
      selection: {},
      openSlot: null,
      inStockOnly: false,

      pick: (slot, part) => {
        const meta = definition(slot);
        const current = get().selection[slot] ?? [];
        // Single slots replace; multi slots append up to their maximum.
        let next: ProductSummary[];
        if (!meta?.multi) {
          next = [part];
        } else if (current.length >= (meta.maxItems ?? 8)) {
          next = current;
        } else {
          next = [...current, part];
        }
        const selection = { ...get().selection, [slot]: next };
        set({
          selection,
          // Single slots move the customer on; multi slots stay open to add another.
          openSlot: meta?.multi ? slot : nextEmptySlot(selection),
        });
      },

      remove: (slot, partId) => {
        const current = get().selection[slot] ?? [];
        const next = current.filter((part) => part.id !== partId);
        const selection = { ...get().selection };
        if (next.length) selection[slot] = next;
        else delete selection[slot];
        set({ selection });
      },

      clear: () => set({ selection: {}, openSlot: null }),
      setOpenSlot: (slot) => set({ openSlot: slot }),
      setInStockOnly: (value) => set({ inStockOnly: value }),

      hydrateFromBuild: (items, parts) => {
        const byId = new Map(parts.map((part) => [part.id, part]));
        const selection: SlotSelection = {};
        for (const item of items) {
          const part = byId.get(item.product);
          if (!part) continue;
          selection[item.slot] = [...(selection[item.slot] ?? []), part];
        }
        set({ selection, openSlot: nextEmptySlot(selection) });
      },
    }),
    { name: 'rgi-configurator', partialize: (state) => ({ selection: state.selection }) },
  ),
);
