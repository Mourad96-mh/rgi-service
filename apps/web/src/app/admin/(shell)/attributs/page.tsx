import { redirect } from 'next/navigation';
import type { AttributeDefinition, CategoryNode } from '@rgi/types';
import { t } from '@/locales/fr';
import { adminFetch, currentStaff } from '@/lib/admin/session';
import { AttributeManager } from '@/components/admin/AttributeManager';

export const metadata = { title: t.admin.attributesTitle };

/** Every `categoryType` / `componentType` actually present in the tree, deduplicated. */
function typesInTree(nodes: CategoryNode[]): string[] {
  const out = new Set<string>();
  const walk = (list: CategoryNode[]) => {
    for (const node of list) {
      out.add(node.componentType ?? node.type);
      walk(node.children);
    }
  };
  walk(nodes);
  return [...out].sort();
}

/**
 * The typed characteristics that drive the product form, the storefront facets and the
 * configurator's compatibility rules — the "structured attributes are one source of truth"
 * rule in CLAUDE.md, finally editable without a developer.
 *
 * Admin-only, matching the API's `@Roles('admin')` on `/attribute-definitions`.
 */
export default async function AdminAttributesPage() {
  const staff = await currentStaff();
  if (staff.role !== 'admin') redirect('/admin');

  const [definitions, tree] = await Promise.all([
    adminFetch<AttributeDefinition[]>('/attribute-definitions'),
    adminFetch<CategoryNode[]>('/categories'),
  ]);

  // Types that already have definitions but no category yet must still be reachable, or
  // their fields would become invisible and un-editable.
  const types = [
    ...new Set([...typesInTree(tree), ...definitions.map((d) => d.categoryType)]),
  ].sort();

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="t-h1 font-display font-bold">{t.admin.attributesTitle}</h1>
        <p className="mt-1 max-w-[62ch] text-[13px] text-faint">{t.admin.attributesSubtitle}</p>
      </div>

      <AttributeManager definitions={definitions} categoryTypes={types} />
    </div>
  );
}
