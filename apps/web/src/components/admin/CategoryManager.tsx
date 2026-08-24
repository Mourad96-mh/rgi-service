'use client';

import { useState, useTransition } from 'react';
import type { CategoryNode } from '@rgi/types';
import { t } from '@/locales/fr';
import { deleteCategory, saveCategory } from '@/app/admin/(shell)/categories/actions';

const CATEGORY_TYPES = [
  'component',
  'prebuilt',
  'laptop',
  'peripheral',
  'console',
  'monitor',
  'workstation',
] as const;

const COMPONENT_TYPES = [
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'psu',
  'case',
  'cooler',
  'storage',
  'fan',
] as const;

interface Draft {
  id?: string;
  name: string;
  slug: string;
  parent: string;
  type: string;
  componentType: string;
  order: string;
  isActive: boolean;
}

const EMPTY: Draft = {
  name: '',
  slug: '',
  parent: '',
  type: 'component',
  componentType: '',
  order: '0',
  isActive: true,
};

/** Depth-first flatten so the editor can show the tree as an indented list. */
function flatten(nodes: CategoryNode[], depth = 0): { node: CategoryNode; depth: number }[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flatten(node.children, depth + 1),
  ]);
}

/**
 * The category tree, and nothing else.
 *
 * One client component rather than a page per category: the tree is small, staff edit it
 * rarely and in bursts, and seeing the parent list while naming a child is most of the
 * job. The form doubles as create and edit — `editing` decides which.
 */
export function CategoryManager({
  tree,
  onChanged,
}: {
  tree: CategoryNode[];
  /** Re-read the tree after a write — see the note on AttributeManager. */
  onChanged: () => void;
}) {
  const rows = flatten(tree);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  function submit() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = await saveCategory(
        {
          name: { fr: draft.name.trim() },
          slug: draft.slug.trim() || undefined,
          parent: draft.parent || null,
          type: draft.type,
          componentType: draft.type === 'component' ? draft.componentType || undefined : undefined,
          order: Number(draft.order) || 0,
          isActive: draft.isActive,
        },
        draft.id,
      );
      if (result.ok) {
        setDraft(null);
        onChanged();
      } else setError(result.message ?? t.common.error);
    });
  }

  function remove(id: string, name: string) {
    if (!window.confirm(t.admin.categoryDeleteConfirm.replace('{name}', name))) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.ok) onChanged();
      else setError(result.message ?? t.common.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-faint">{rows.length}</p>
        <button
          type="button"
          className="btn btn-primary w-full xs:w-auto"
          onClick={() => setDraft({ ...EMPTY })}
        >
          {t.admin.newCategory}
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
            {draft.id ? t.admin.editCategory : t.admin.newCategory}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-muted">{t.admin.categoryName}</span>
              <input
                required
                value={draft.name}
                onChange={(event) => set('name', event.target.value)}
                className="field"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-muted">{t.admin.fieldSlug}</span>
              <input
                value={draft.slug}
                onChange={(event) => set('slug', event.target.value)}
                className="field"
                placeholder={t.admin.categorySlugHelp}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-muted">
                {t.admin.categoryParent}
              </span>
              <select
                value={draft.parent}
                onChange={(event) => set('parent', event.target.value)}
                className="field"
              >
                <option value="">{t.admin.categoryNone}</option>
                {rows
                  // A category cannot be its own parent, and nesting it under one of its
                  // own descendants would detach that whole branch from the tree.
                  .filter(({ node }) => node.id !== draft.id)
                  .map(({ node, depth }) => (
                    <option key={node.id} value={node.id}>
                      {'— '.repeat(depth)}
                      {node.name.fr}
                    </option>
                  ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-muted">{t.admin.categoryType}</span>
              <select
                value={draft.type}
                onChange={(event) => set('type', event.target.value)}
                className="field"
              >
                {CATEGORY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            {draft.type === 'component' ? (
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-[12.5px] font-semibold text-muted">
                  {t.admin.categoryComponentType}
                </span>
                <select
                  value={draft.componentType}
                  onChange={(event) => set('componentType', event.target.value)}
                  className="field"
                >
                  <option value="">—</option>
                  {COMPONENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <span className="text-[11.5px] text-faint">{t.admin.categoryComponentHelp}</span>
              </label>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-semibold text-muted">{t.admin.categoryOrder}</span>
              <input
                type="number"
                value={draft.order}
                onChange={(event) => set('order', event.target.value)}
                className="field"
              />
            </label>

            <label className="flex items-center gap-2.5 sm:mt-7">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => set('isActive', event.target.checked)}
                className="h-5 w-5 accent-[var(--accent)]"
              />
              <span className="text-[13px]">{t.admin.categoryActive}</span>
            </label>
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

      {rows.length ? (
        <ul className="surface-card divide-y divide-[rgba(16,24,48,.09)]">
          {rows.map(({ node, depth }) => (
            <li
              key={node.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1" style={{ paddingInlineStart: `${depth * 16}px` }}>
                <p className="truncate text-[13.5px] font-semibold">
                  {node.name.fr}
                  {!node.isActive ? (
                    <span className="ml-2 text-[11px] font-medium text-faint">
                      ({t.admin.fieldStatusDraft})
                    </span>
                  ) : null}
                </p>
                <p className="truncate font-mono text-[11px] text-faint">/{node.slug}</p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: node.id,
                      name: node.name.fr,
                      slug: node.slug,
                      parent: node.parent ?? '',
                      type: node.type,
                      componentType: node.componentType ?? '',
                      order: String(node.order),
                      isActive: node.isActive,
                    })
                  }
                  className="inline-flex min-h-[44px] items-center rounded-md border border-line px-3.5 text-[13px] font-semibold text-muted transition hover:border-accent2 hover:text-accent2 sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-[11.5px]"
                >
                  {t.admin.edit}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(node.id, node.name.fr)}
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
          {t.admin.categoriesEmpty}
        </p>
      )}
    </div>
  );
}
