import type { CategoryType, ComponentType } from '@rgi/types';

export interface SeedCategory {
  nameFr: string;
  slug: string;
  type: CategoryType;
  componentType?: ComponentType;
  configuratorSlot?: string;
  order: number;
  children?: SeedCategory[];
}

/**
 * The catalog tree. Slugs mirror the URL structure Google will index
 * (SEO_STRATEGY.md §1): `/composants/cartes-graphiques/`.
 */
export const SEED_CATEGORIES: SeedCategory[] = [
  { nameFr: 'PC Gamer', slug: 'pc-gamer', type: 'prebuilt', order: 1 },
  { nameFr: 'Stations de travail', slug: 'stations-de-travail', type: 'workstation', order: 2 },
  { nameFr: 'PC Portables', slug: 'pc-portables', type: 'laptop', order: 3 },
  {
    nameFr: 'Composants',
    slug: 'composants',
    type: 'component',
    order: 4,
    children: [
      { nameFr: 'Processeurs', slug: 'composants/processeurs', type: 'component', componentType: 'cpu', configuratorSlot: 'cpu', order: 1 },
      { nameFr: 'Cartes mères', slug: 'composants/cartes-meres', type: 'component', componentType: 'motherboard', configuratorSlot: 'motherboard', order: 2 },
      { nameFr: 'Mémoire RAM', slug: 'composants/memoire-ram', type: 'component', componentType: 'ram', configuratorSlot: 'ram', order: 3 },
      { nameFr: 'Cartes graphiques', slug: 'composants/cartes-graphiques', type: 'component', componentType: 'gpu', configuratorSlot: 'gpu', order: 4 },
      { nameFr: 'Stockage', slug: 'composants/stockage', type: 'component', componentType: 'storage', configuratorSlot: 'storage', order: 5 },
      { nameFr: 'Alimentations', slug: 'composants/alimentations', type: 'component', componentType: 'psu', configuratorSlot: 'psu', order: 6 },
      { nameFr: 'Boîtiers', slug: 'composants/boitiers', type: 'component', componentType: 'case', configuratorSlot: 'case', order: 7 },
      { nameFr: 'Refroidissement', slug: 'composants/refroidissement', type: 'component', componentType: 'cooler', configuratorSlot: 'cooler', order: 8 },
      { nameFr: 'Ventilateurs', slug: 'composants/ventilateurs', type: 'component', componentType: 'fan', configuratorSlot: 'fans', order: 9 },
    ],
  },
  { nameFr: 'Écrans', slug: 'ecrans', type: 'monitor', order: 5 },
  { nameFr: 'Périphériques', slug: 'peripheriques', type: 'peripheral', order: 6 },
  { nameFr: 'Consoles', slug: 'consoles', type: 'console', order: 7 },
];
