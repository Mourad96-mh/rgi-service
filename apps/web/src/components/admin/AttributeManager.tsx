'use client';

import { useState, useTransition } from 'react';
import type { AttributeDefinition } from '@rgi/types';
import { t } from '@/locales/fr';
import { deleteAttribute, saveAttribute } from '@/app/admin/(shell)/attributs/actions';

const DATA_TYPES = [
  { value: 'string', label: t.admin.attrTypeString },
  { value: 'number', label: t.admin.attrTypeNumber },
  { value: 'boolean', label: t.admin.attrTypeBoolean },
  { value: 'enum', label: t.admin.attrTypeEnum },
] as const;

interface Draft {
  id?: string;
  categoryType: string;
  key: string;
  label: string;
  dataType: string;
  unit: string;
  enumValues: string;
  multiple: boolean;
  required: boolean;
  filterable: boolean;
  usedInCompatibility: boolean;
  order: string;
}

const empty = (categoryType: string): Draft => ({
  categoryType,
  key: '',
  label: '',
  dataType: 'string',
  unit: '',
  enumValues: '',
  multiple: false,
  required: false,
  filterable: false,
  usedInCompatibility: false,
  order: '0',
});

/**
 * The typed fields behind every product form, storefront facet and compatibility rule.
 *
 * Grouped by `categoryType` because that is how they are used: nobody edits "all
 * attributes", they edit "what we ask for about a motherboard".
 */
export function AttributeManager({
  definitions,
  categoryTypes,
}: {
  definitions: AttributeDefinition[];
  categoryTypes: string[];
}) {
  const [filter, setFilter] = useState(categoryTypes[0] ?? '');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const visible = definitions
    .filter((definition) => definition.categoryType === filter)
    .sort((a, b) => a.order - b.order);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  function submit() {
    if (!draft) return;
    setError(null);

    const enumValues = draft.enumValues
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await saveAttribute(
        {
          // The API refuses a key or data-type change on update, so they are only sent on
          // create — see the comment in the server action.
          ...(draft.id
            ? {}
            : { categoryType: draft.categoryType, key: draft.key.trim(), dataType: draft.dataType }),
          label: { fr: draft.label.trim() },
          unit: draft.unit.trim() || undefined,
          enumValues: draft.dataType === 'enum' ? enumValues : undefined,
          multiple: draft.multiple,
          required: draft.required,
          filterable: draft.filterable,
          usedInCompatibility: draft.usedInCompatibility,
          order: Number(draft.order) || 0,
        },
        draft.id,
      );
      if (result.ok) setDraft(null);
      else setError(result.message ?? t.common.error);
    });
  }

  function remove(definition: AttributeDefinition) {
    if (!window.confirm(t.admin.attrDeleteConfirm.replace('{name}', definition.label.fr))) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAttribute(definition.id);
      if (!result.ok) setError(result.message ?? t.common.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* The type picker scrolls rather than wraps: there are a dozen of them and a
          wrapping row would push the list off a phone screen entirely. */}
      <div className="scroll-x">
        <div className="flex gap-1.5 pb-1">
          {categoryTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              aria-current={filter === type ? 'true' : undefined}
              className={`inline-flex min-h-[38px] shrink-0 items-center rounded-full border px-3.5 text-[12.5px] font-medium transition ${
                filter === type
                  ? 'border-accent2 text-text'
                  : 'border-line text-muted hover:border-line2 hover:text-text'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-faint">{visible.length}</p>
        <button
          type="button"
          className="btn btn-primary w-full xs:w-auto"
          onClick={() => setDraft(empty(filter))}
        >
          {t.admin.newAttribute}
        </button>
      </div>

      {error ? (
        <p className="surface-card border-accent3 p-4 text-[13px] text-accent3">{error}</p>
      ) : null}

      {draft ? (
        <form
          className="surface-card flex flex-col gap-4 p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <h2 className="t-h4 font-display font-bold">
            {draft.id ? t.admin.editAttribute : t.admin.newAttribute}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-muted">{t.admin.attrLabel}</span>
              <input
                required
                value={draft.label}
                onChange={(event) => set('label', event.target.value)}
                className="field"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-muted">{t.admin.attrKey}</span>
              <input
                required
                disabled={Boolean(draft.id)}
                value={draft.key}
                onChange={(event) => set('key', event.target.value)}
                className="field font-mono disabled:opacity-50"
                placeholder="tdp_watts"
              />
              <span className="text-[11.5px] text-faint">{t.admin.attrKeyHelp}</span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-muted">{t.admin.attrDataType}</span>
              <select
                disabled={Boolean(draft.id)}
                value={draft.dataType}
                onChange={(event) => set('dataType', event.target.value)}
                className="field disabled:opacity-50"
              >
                {DATA_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-muted">{t.admin.attrUnit}</span>
              <input
                value={draft.unit}
                onChange={(event) => set('unit', event.target.value)}
                className="field"
                placeholder="W"
              />
              <span className="text-[11.5px] text-faint">{t.admin.attrUnitHelp}</span>
            </label>

            {draft.dataType === 'enum' ? (
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-[12.5px] font-semibold text-muted">
                  {t.admin.attrEnumValues}
                </span>
                <textarea
                  rows={5}
                  value={draft.enumValues}
                  onChange={(event) => set('enumValues', event.target.value)}
                  className="field font-mono"
                />
                <span className="text-[11.5px] text-faint">{t.admin.attrEnumHelp}</span>
              </label>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-muted">{t.admin.attrOrder}</span>
              <input
                type="number"
                value={draft.order}
                onChange={(event) => set('order', event.target.value)}
                className="field"
              />
            </label>
          </div>

          <div className="flex flex-col gap-2.5">
            <Toggle
              checked={draft.required}
              onChange={(value) => set('required', value)}
              label={t.admin.attrRequired}
            />
            <Toggle
              checked={draft.filterable}
              onChange={(value) => set('filterable', value)}
              label={t.admin.attrFilterable}
            />
            <Toggle
              checked={draft.multiple}
              onChange={(value) => set('multiple', value)}
              label={t.admin.attrMultiple}
            />
            <Toggle
              checked={draft.usedInCompatibility}
              onChange={(value) => set('usedInCompatibility', value)}
              label={t.admin.attrCompatibility}
            />
            {/* Compatibility is the one flag with consequences outside this screen, so the
                warning appears the moment it is switched on rather than in a manual. */}
            {draft.usedInCompatibility ? (
              <p className="rounded-sm2 border border-warn/40 bg-warn/10 p-3 text-[12px] leading-snug text-warn">
                {t.admin.attrCompatWarning}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 xs:flex-row">
            <button type="submit" disabled={pending} className="btn btn-primary w-full xs:w-auto">
              {pending ? t.admin.saving : t.admin.save}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="btn btn-ghost w-full xs:w-auto"
            >
              {t.common.close}
            </button>
          </div>
        </form>
      ) : null}

      {visible.length ? (
        <ul className="surface-card divide-y divide-[rgba(16,24,48,.09)]">
          {visible.map((definition) => (
            <li
              key={definition.id}
              className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold">
                  {definition.label.fr}
                  {definition.unit ? (
                    <span className="ml-1 text-[11.5px] font-medium text-faint">
                      ({definition.unit})
                    </span>
                  ) : null}
                </p>
                <p className="truncate font-mono text-[11px] text-faint">{definition.key}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Flag label={definition.dataType} />
                  {definition.required ? <Flag label={t.admin.required} /> : null}
                  {definition.filterable ? <Flag label={t.admin.attrFilterable} /> : null}
                  {definition.usedInCompatibility ? (
                    <Flag label={t.admin.attrCompatibility} tone="accent" />
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: definition.id,
                      categoryType: definition.categoryType,
                      key: definition.key,
                      label: definition.label.fr,
                      dataType: definition.dataType,
                      unit: definition.unit ?? '',
                      enumValues: (definition.enumValues ?? []).join('\n'),
                      multiple: definition.multiple ?? false,
                      required: definition.required,
                      filterable: definition.filterable,
                      usedInCompatibility: definition.usedInCompatibility,
                      order: String(definition.order),
                    })
                  }
                  className="inline-flex min-h-[44px] items-center rounded-md border border-line px-3.5 text-[13px] font-semibold text-muted transition hover:border-accent2 hover:text-accent2 sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-[11.5px]"
                >
                  {t.admin.edit}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(definition)}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-line px-3.5 text-[13px] font-semibold text-muted transition hover:border-accent3 hover:text-accent3 disabled:opacity-50 sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-[11.5px]"
                >
                  {t.admin.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="surface-card p-6 text-center text-[13.5px] text-muted sm:p-8">
          {t.admin.attributesEmpty}
        </p>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[var(--accent)]"
      />
      <span className="text-[13px]">{label}</span>
    </label>
  );
}

function Flag({ label, tone }: { label: string; tone?: 'accent' }) {
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium ${
        tone === 'accent' ? 'border-accent2/50 text-accent2' : 'border-line text-faint'
      }`}
    >
      {label}
    </span>
  );
}
