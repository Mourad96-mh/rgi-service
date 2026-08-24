import { t } from '@/locales/fr';
import { HeroView } from './view';

export const metadata = { title: t.admin.heroTitle };

export default function AdminHeroPage() {
  return <HeroView />;
}
