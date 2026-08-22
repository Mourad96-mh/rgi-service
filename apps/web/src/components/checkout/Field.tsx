'use client';

import { useId } from 'react';
import { CheckIcon } from '@/components/ui/Icons';

/** Labelled input with its error wired through `aria-describedby`. */
export function Field({
  label,
  value,
  onChange,
  error,
  help,
  type = 'text',
  autoComplete,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  help?: string;
  type?: string;
  autoComplete?: string;
  optional?: boolean;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;

  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-1.5 block text-[12.5px] text-muted">
        {label}
        {optional ? <span className="text-faint"> · optionnel</span> : null}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`field ${error ? 'border-accent3' : ''}`}
      />
      {error ? (
        <span id={`${id}-error`} className="mt-1 block text-[11.5px] text-accent3">
          {error}
        </span>
      ) : help ? (
        <span id={`${id}-help`} className="mt-1 block text-[11.5px] text-faint">
          {help}
        </span>
      ) : null}
    </label>
  );
}

/** A radio-style card for shipping method / payment method. */
export function Choice({
  checked,
  onSelect,
  title,
  text,
  disabled,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  text: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={`flex min-h-[56px] w-full items-start gap-3 rounded-sm2 border p-3.5 text-left transition disabled:opacity-45 sm:p-4 ${
        checked ? 'border-accent2 bg-text/[.05]' : 'border-line bg-bg2 hover:border-line2'
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border ${
          checked ? 'border-accent2 bg-accent2 text-bg' : 'border-line2'
        }`}
      >
        {checked ? <CheckIcon className="h-3 w-3" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[12px] text-muted">{text}</span>
      </span>
    </button>
  );
}
