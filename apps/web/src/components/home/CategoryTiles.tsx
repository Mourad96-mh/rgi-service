import Link from 'next/link';
import type { CategoryNode } from '@rgi/types';
import { routes } from '@/lib/routes';

/** Emoji stand-ins until the client supplies category artwork. */
const ICONS: Record<string, string> = {
  'pc-gamer': '🎮',
  'stations-de-travail': '🧠',
  'pc-portables': '💻',
  composants: '🧩',
  ecrans: '🖥️',
  peripheriques: '⌨️',
  consoles: '🕹️',
};

export function CategoryTiles({ categories }: { categories: CategoryNode[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={routes.category(category.slug)}
          className="group relative min-h-[112px] overflow-hidden rounded-card border border-line bg-surface p-4 transition hover:-translate-y-1 hover:border-accent hover:shadow-soft sm:min-h-[130px] sm:p-[22px]"
        >
          <span aria-hidden className="mb-2.5 block text-[26px] sm:mb-3.5 sm:text-[30px]">
            {ICONS[category.slug] ?? '🔧'}
          </span>
          <h3 className="text-[15px] font-semibold sm:text-base">{category.name.fr}</h3>
          <span className="block text-[12.5px] text-faint">
            {category.children.length
              ? `${category.children.length} sous-catégories`
              : 'Voir la sélection'}
          </span>
          <span
            aria-hidden
            className="absolute -bottom-8 -right-8 h-[110px] w-[110px] rounded-full bg-grad-soft opacity-0 transition group-hover:opacity-100"
          />
        </Link>
      ))}
    </div>
  );
}
