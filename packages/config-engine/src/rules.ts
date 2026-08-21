import type { Rule } from '@rgi/types';
import { BASE_SYSTEM_WATTS, PSU_HEADROOM_FACTOR } from '@rgi/types';

/**
 * The default compatibility rule set (CONFIGURATOR_ENGINE.md §2).
 *
 * These are *seed data*, not logic: they are written into the `compatibilityrules`
 * collection at seed time and edited by admins in the dashboard. The engine never
 * hardcodes a rule — it only knows how to evaluate the six operators.
 */
export const DEFAULT_RULES: Rule[] = [
  {
    id: 'cpu_mobo_socket',
    description: 'Le socket du processeur doit correspondre à celui de la carte mère.',
    type: 'match',
    left: { slot: 'cpu', attr: 'socket' },
    right: { slot: 'motherboard', attr: 'socket' },
    severity: 'error',
    messageFr:
      'Le processeur et la carte mère n’ont pas le même socket. Choisissez un processeur compatible avec le socket de votre carte mère.',
    isActive: true,
  },
  {
    id: 'cooler_socket',
    description: 'Le ventirad doit supporter le socket de la carte mère.',
    type: 'includes',
    left: { slot: 'motherboard', attr: 'socket' },
    right: { slot: 'cooler', attr: 'socket_support' },
    severity: 'error',
    messageFr: 'Ce système de refroidissement ne supporte pas le socket de votre carte mère.',
    isActive: true,
  },
  {
    id: 'ram_type',
    description: 'Le type de mémoire doit correspondre à celui de la carte mère.',
    type: 'match',
    left: { slot: 'ram', attr: 'ram_type' },
    right: { slot: 'motherboard', attr: 'ram_type' },
    severity: 'error',
    messageFr:
      'La mémoire choisie n’est pas du bon type pour cette carte mère (DDR4 et DDR5 ne sont pas interchangeables).',
    isActive: true,
  },
  {
    id: 'ram_slots',
    description: 'Le nombre de barrettes ne peut pas dépasser le nombre de slots mémoire.',
    type: 'sum_lte',
    left: { slot: 'ram', attr: 'modules' },
    right: { slot: 'motherboard', attr: 'ram_slots' },
    sumSlots: ['ram'],
    sumAttr: 'modules',
    severity: 'error',
    messageFr: 'Vous avez plus de barrettes de mémoire que de slots disponibles sur la carte mère.',
    isActive: true,
  },
  {
    id: 'ram_capacity',
    description: 'La capacité mémoire totale ne peut pas dépasser le maximum de la carte mère.',
    type: 'sum_lte',
    left: { slot: 'ram', attr: 'capacity_gb' },
    right: { slot: 'motherboard', attr: 'max_ram_gb' },
    sumSlots: ['ram'],
    sumAttr: 'capacity_gb',
    severity: 'error',
    messageFr: 'La capacité mémoire totale dépasse le maximum supporté par la carte mère.',
    isActive: true,
  },
  {
    id: 'mobo_case_form',
    description: 'Le format de la carte mère doit être supporté par le boîtier.',
    type: 'includes',
    left: { slot: 'motherboard', attr: 'form_factor' },
    right: { slot: 'case', attr: 'form_factors_supported' },
    severity: 'error',
    messageFr: 'Le format de cette carte mère n’entre pas dans le boîtier choisi.',
    isActive: true,
  },
  {
    id: 'gpu_length',
    description: 'La carte graphique doit tenir dans le boîtier.',
    type: 'fits',
    left: { slot: 'gpu', attr: 'length_mm' },
    right: { slot: 'case', attr: 'max_gpu_length_mm' },
    severity: 'error',
    messageFr: 'La carte graphique est trop longue pour ce boîtier.',
    isActive: true,
  },
  {
    id: 'cooler_height',
    description: 'Le ventirad doit tenir en hauteur dans le boîtier.',
    type: 'fits',
    left: { slot: 'cooler', attr: 'height_mm' },
    right: { slot: 'case', attr: 'max_cooler_height_mm' },
    severity: 'error',
    messageFr: 'Le ventirad est trop haut pour ce boîtier.',
    isActive: true,
  },
  {
    id: 'psu_form',
    description: "Le format de l'alimentation doit correspondre au boîtier.",
    type: 'match',
    left: { slot: 'psu', attr: 'form_factor' },
    right: { slot: 'case', attr: 'psu_form_factor' },
    severity: 'error',
    messageFr: 'Le format de cette alimentation (ATX / SFX) ne correspond pas au boîtier.',
    isActive: true,
  },
  {
    id: 'psu_wattage',
    description:
      'La puissance estimée du système, majorée de 20% de marge, doit rester sous la puissance de l’alimentation.',
    type: 'sum_lte',
    left: { slot: 'cpu', attr: 'tdp_watts' },
    right: { slot: 'psu', attr: 'wattage' },
    sumSlots: ['cpu', 'gpu'],
    sumAttr: 'tdp_watts',
    baseAllowance: BASE_SYSTEM_WATTS,
    factor: PSU_HEADROOM_FACTOR,
    severity: 'error',
    messageFr:
      'L’alimentation est trop faible pour cette configuration. Choisissez un modèle plus puissant (20% de marge recommandée).',
    isActive: true,
  },
  {
    id: 'psu_recommended',
    description: 'La puissance recommandée par le fabricant de la carte graphique.',
    type: 'gte',
    left: { slot: 'psu', attr: 'wattage' },
    right: { slot: 'gpu', attr: 'recommended_psu_watts' },
    severity: 'warning',
    messageFr:
      'L’alimentation est en dessous de la puissance recommandée par le fabricant de la carte graphique.',
    isActive: true,
  },
  {
    id: 'radiator_fit',
    description: 'Le radiateur du watercooling doit être supporté par le boîtier.',
    type: 'includes',
    left: { slot: 'cooler', attr: 'radiator_mm' },
    right: { slot: 'case', attr: 'radiator_support_mm' },
    severity: 'warning',
    messageFr:
      'Ce boîtier ne mentionne pas le support de ce format de radiateur. Vérifiez le montage avant de valider.',
    isActive: true,
  },
];
