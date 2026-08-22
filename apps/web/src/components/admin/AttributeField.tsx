'use client';

import type { AttributeDefinition } from '@rgi/types';
import { t } from '@/locales/fr';

/**
 * One typed input, generated from an `AttributeDefinition` (ADMIN_DASHBOARD.md §2):
 * enum → select, enum + multiple → checkboxes, number → numeric with its unit, boolean →
 * yes/no, everything else → text. The same row also drives the storefront facet and the
 * configurator rule, so what staff type here has to stay in the definition's vocabulary.
 */
export function AttributeField({
  definition,
  value,
  onChange,
}: {
  definition: AttributeDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = (
    <span className="mb-1.5 block text-[12.5px] text-muted">
      {definition.label.fr}
      {definition.unit ? <span className="text-faint"> ({definition.unit})</span> : null}
      {definition.required ? <span className="text-accent3"> *</span> : null}
    </span>
  );

  if (definition.dataType === 'enum' && definition.multiple) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset className="block">
        <legend className="mb-1.5 text-[12.5px] text-muted">
          {definition.label.fr}
          {definition.required ? <span className="text-accent3"> *</span> : null}
        </legend>
        <div className="flex flex-wrap gap-2">
          {(definition.enumValues ?? []).map((option) => {
            const checked = selected.includes(option);
            return (
              <label
                key={option}
                // The checkbox itself is visually hidden, so the label *is* the tap
                // target — it keeps the 44 px minimum on touch and shrinks for a mouse.
                className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-md border px-3 text-[13px] transition sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-[12.5px] ${
                  checked ? 'border-accent2 bg-text/[.06] text-text' : 'border-line text-muted'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() =>
                    onChange(
                      checked
                        ? selected.filter((item) => item !== option)
                        : [...selected, option],
                    )
                  }
                />
                {option}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (definition.dataType === 'enum') {
    return (
      <label className="block">
        {label}
        <select
          value={(value as string) ?? ''}
          required={definition.required}
          onChange={(event) => onChange(event.target.value || undefined)}
          className="field"
        >
          <option value="">—</option>
          {(definition.enumValues ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (definition.dataType === 'boolean') {
    return (
      <label className="block">
        {label}
        <select
          value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? undefined : event.target.value === 'true')
          }
          className="field"
        >
          <option value="">—</option>
          <option value="true">{t.admin.yes}</option>
          <option value="false">{t.admin.no}</option>
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      {label}
      <input
        type={definition.dataType === 'number' ? 'number' : 'text'}
        step={definition.dataType === 'number' ? 'any' : undefined}
        value={value === undefined || value === null ? '' : String(value)}
        required={definition.required}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === '') return onChange(undefined);
          onChange(definition.dataType === 'number' ? Number(raw) : raw);
        }}
        className="field"
      />
    </label>
  );
}
