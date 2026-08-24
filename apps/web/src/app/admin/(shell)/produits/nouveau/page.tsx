import { t } from '@/locales/fr';
import { NewProductView } from './view';

export const metadata = { title: t.admin.newProductTitle };

export default function NewProductPage() {
  return <NewProductView />;
}
