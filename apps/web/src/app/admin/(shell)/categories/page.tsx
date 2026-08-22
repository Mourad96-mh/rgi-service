import { redirect } from 'next/navigation';
import type { CategoryNode } from '@rgi/types';
import { t } from '@/locales/fr';
import { adminFetch, currentStaff } from '@/lib/admin/session';
import { CategoryManager } from '@/components/admin/CategoryManager';

export const metadata = { title: t.admin.categoriesTitle };

/**
 * The shop's category tree — menus, URLs, and which technical characteristics a product
 * is asked for. It had a complete API and no screen at all, which meant the one structure
 * everything else hangs off could only be changed by a developer.
 *
 * The role check is real, not decorative: `/categories` writes are `@Roles('admin')` on
 * the API, so staff without that role are sent back rather than shown a form whose every
 * submission would 403.
 */
export default async function AdminCategoriesPage() {
  const staff = await currentStaff();
  if (staff.role !== 'admin') redirect('/admin');

  const tree = await adminFetch<CategoryNode[]>('/categories');

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="t-h1 font-display font-bold">{t.admin.categoriesTitle}</h1>
        <p className="mt-1 max-w-[62ch] text-[13px] text-faint">{t.admin.categoriesSubtitle}</p>
      </div>

      <CategoryManager tree={tree} />
    </div>
  );
}
