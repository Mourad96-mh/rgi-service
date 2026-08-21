'use client';

import Image from 'next/image';
import type { ProductSummary, SlotDefinition, Violation } from '@rgi/types';
import { t } from '@/locales/fr';
import { price, primaryImage } from '@/lib/format';
import { useConfigurator } from '@/store/configurator';
import { CheckIcon } from '@/components/ui/Icons';
import { PartPicker } from './PartPicker';

/**
 * One build step: what is chosen, what is wrong with it, and the picker when open.
 *
 * A step that a rule complains about is flagged here rather than silently emptied — the
 * spec is explicit that editing an earlier slot must ask the customer to re-pick instead
 * of dropping their later choice (CONFIGURATOR_ENGINE.md §4).
 */
export function SlotCard({
  slot,
  index,
  violations,
}: {
  slot: SlotDefinition;
  index: number;
  violations: Violation[];
}) {
  const parts = useConfigurator((state) => state.selection[slot.id]) ?? [];
  const openSlot = useConfigurator((state) => state.openSlot);
  const setOpenSlot = useConfigurator((state) => state.setOpenSlot);
  const remove = useConfigurator((state) => state.remove);

  const open = openSlot === slot.id;
  const filled = parts.length > 0;
  const errors = violations.filter((violation) => violation.severity === 'error');
  const warnings = violations.filter((violation) => violation.severity === 'warning');

  return (
    <li
      className={`surface-card overflow-hidden transition ${
        errors.length ? 'border-accent3' : open ? 'border-line2' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-4 p-5">
        <span
          aria-hidden
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${
            filled ? 'bg-grad text-bg' : 'border border-line2 text-muted'
          }`}
        >
          {filled ? <CheckIcon className="h-4 w-4" /> : index + 1}
        </span>

        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[16px] font-bold">{slot.labelFr}</h3>
            <span className="text-[11px] uppercase tracking-[.05em] text-faint">
              {slot.required ? t.configurator.required : t.configurator.optional}
            </span>
          </div>
          <p className="mt-1 max-w-[62ch] text-[12.5px] text-muted">{slot.helpFr}</p>
        </div>

        <button
          type="button"
          onClick={() => setOpenSlot(open ? null : slot.id)}
          className={`btn ${filled ? 'btn-ghost' : 'btn-primary'} !px-4 !py-2.5 !text-[13.5px]`}
          aria-expanded={open}
        >
          {open ? t.configurator.close : filled ? t.configurator.change : t.configurator.choose}
        </button>
      </div>

      {filled ? (
        <ul className="flex flex-col gap-2 px-5 pb-5">
          {parts.map((part) => (
            <ChosenPart
              key={part.id}
              part={part}
              onRemove={() => remove(slot.id, part.id)}
            />
          ))}
          {slot.multi && !open ? (
            <li>
              <button
                type="button"
                onClick={() => setOpenSlot(slot.id)}
                className="text-[12.5px] font-semibold text-accent2 hover:underline"
              >
                + {t.configurator.addAnother}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {errors.length || warnings.length ? (
        <ul className="flex flex-col gap-1.5 px-5 pb-5">
          {errors.map((violation) => (
            <li key={violation.ruleId} className="text-[12.5px] font-semibold text-accent3">
              {violation.messageFr}
            </li>
          ))}
          {warnings.map((violation) => (
            <li key={violation.ruleId} className="text-[12.5px] text-warn">
              {violation.messageFr}
            </li>
          ))}
        </ul>
      ) : null}

      {open ? <PartPicker slot={slot} /> : null}
    </li>
  );
}

function ChosenPart({ part, onRemove }: { part: ProductSummary; onRemove: () => void }) {
  const image = primaryImage(part);

  return (
    <li className="flex items-center gap-3 rounded-sm2 border border-line bg-bg2 p-2.5">
      <span className="photo-tile relative h-[54px] w-[54px] shrink-0">
        {image ? (
          <Image src={image.url} alt="" fill sizes="54px" className="object-contain p-1" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{part.name.fr}</span>
        <span className="text-[11.5px] text-faint">{part.brand}</span>
      </span>
      <span className="font-display text-[14px] font-bold">{price(part.effectivePrice)}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-md px-2 py-1 text-[12px] text-faint transition hover:text-accent3"
      >
        {t.configurator.remove}
      </button>
    </li>
  );
}
