import { t } from '@/locales/fr';
import { CategoriesView } from './view';

export const metadata = { title: t.admin.categoriesTitle };

export default function AdminCategoriesPage() {
  return <CategoriesView />;
}
