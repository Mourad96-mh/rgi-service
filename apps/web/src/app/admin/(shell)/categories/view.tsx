'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CategoryNode } from '@rgi/types';
import { t } from '@/locales/fr';
import { adminFetch } from '@/lib/admin/session';
import { useAdminData } from '@/lib/admin/useAdminData';
import { useStaff } from '@/components/admin/AdminShell';
import { AdminError, AdminLoading } from '@/components/admin/AdminState';
import { CategoryManager } from '@/components/admin/CategoryManager';

/**
 * The shop's category tree — menus, URLs, and which technical characteristics a product
 * is asked for. It had a complete API and no screen at all, which meant the one structure
 * everything else hangs off could only be changed by a developer.
 *
 * The role check mirrors the API rather than replacing it: `/categories` writes are
 * `@Roles('admin')` there, so staff without that role are sent back rather than shown a
 * form whose every submission would 403.
 */
export function CategoriesView() {
  const staff = useStaff();
  const router = useRouter();
  const allowed = staff.role === 'admin';

  useEffect(() => {
    if (!allowed) router.replace('/admin');
  }, [allowed, router]);

  const { data, error, loading, reload } = useAdminData<CategoryNode[]>(
    () => adminFetch<CategoryNode[]>('/categories'),
    [allowed],
  );

  if (!allowed) return null;
  if (loading) return <AdminLoading />;
  if (error || !data) return <AdminError message={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="t-h1 font-display font-bold">{t.admin.categoriesTitle}</h1>
        <p className="mt-1 max-w-[62ch] text-[13px] text-faint">{t.admin.categoriesSubtitle}</p>
      </div>

      <CategoryManager tree={data} onChanged={reload} />
    </div>
  );
}
