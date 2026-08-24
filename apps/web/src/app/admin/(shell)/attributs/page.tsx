import { t } from '@/locales/fr';
import { AttributesView } from './view';

export const metadata = { title: t.admin.attributesTitle };

/** Server component for the title only; the screen itself has to run in the browser. */
export default function AdminAttributesPage() {
  return <AttributesView />;
}
