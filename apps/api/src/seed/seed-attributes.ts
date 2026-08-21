import type { AttributeDataType } from '@rgi/types';

export interface SeedAttribute {
  key: string;
  labelFr: string;
  dataType: AttributeDataType;
  unit?: string;
  enumValues?: string[];
  multiple?: boolean;
  required?: boolean;
  filterable?: boolean;
  usedInCompatibility?: boolean;
}

const SOCKETS = ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'];
const FORM_FACTORS = ['E-ATX', 'ATX', 'mATX', 'ITX'];

/**
 * The typed attributes staff fill in and the configurator reads — one source of truth
 * (CLAUDE.md §6). Keys are snake_case and must match the rule operands exactly.
 */
export const SEED_ATTRIBUTES: Record<string, SeedAttribute[]> = {
  cpu: [
    { key: 'socket', labelFr: 'Socket', dataType: 'enum', enumValues: SOCKETS, required: true, filterable: true, usedInCompatibility: true },
    { key: 'cores', labelFr: 'Nombre de cœurs', dataType: 'number', required: true, filterable: true },
    { key: 'threads', labelFr: 'Nombre de threads', dataType: 'number' },
    { key: 'base_clock_ghz', labelFr: 'Fréquence de base', dataType: 'number', unit: 'GHz' },
    { key: 'boost_clock_ghz', labelFr: 'Fréquence turbo', dataType: 'number', unit: 'GHz' },
    { key: 'tdp_watts', labelFr: 'Consommation (TDP)', dataType: 'number', unit: 'W', required: true, usedInCompatibility: true },
    { key: 'integrated_graphics', labelFr: 'Graphiques intégrés', dataType: 'boolean', required: true, filterable: true, usedInCompatibility: true },
    { key: 'includes_cooler', labelFr: 'Ventirad fourni', dataType: 'boolean', usedInCompatibility: true },
  ],
  motherboard: [
    { key: 'socket', labelFr: 'Socket', dataType: 'enum', enumValues: SOCKETS, required: true, filterable: true, usedInCompatibility: true },
    { key: 'chipset', labelFr: 'Chipset', dataType: 'string', filterable: true },
    { key: 'form_factor', labelFr: 'Format', dataType: 'enum', enumValues: FORM_FACTORS, required: true, filterable: true, usedInCompatibility: true },
    { key: 'ram_type', labelFr: 'Type de mémoire', dataType: 'enum', enumValues: ['DDR4', 'DDR5'], required: true, filterable: true, usedInCompatibility: true },
    { key: 'ram_slots', labelFr: 'Slots mémoire', dataType: 'number', required: true, usedInCompatibility: true },
    { key: 'max_ram_gb', labelFr: 'Mémoire maximale', dataType: 'number', unit: 'Go', required: true, usedInCompatibility: true },
    { key: 'm2_slots', labelFr: 'Slots M.2', dataType: 'number' },
    { key: 'wifi', labelFr: 'Wi-Fi intégré', dataType: 'boolean', filterable: true },
  ],
  ram: [
    { key: 'ram_type', labelFr: 'Type de mémoire', dataType: 'enum', enumValues: ['DDR4', 'DDR5'], required: true, filterable: true, usedInCompatibility: true },
    { key: 'capacity_gb', labelFr: 'Capacité totale du kit (Go)', dataType: 'number', unit: 'Go', required: true, filterable: true, usedInCompatibility: true },
    { key: 'modules', labelFr: 'Nombre de barrettes', dataType: 'number', required: true, usedInCompatibility: true },
    { key: 'speed_mhz', labelFr: 'Fréquence', dataType: 'number', unit: 'MHz', required: true, filterable: true },
    { key: 'cas_latency', labelFr: 'Latence CAS', dataType: 'number' },
    { key: 'rgb', labelFr: 'RGB', dataType: 'boolean', filterable: true },
  ],
  gpu: [
    { key: 'chipset', labelFr: 'Puce graphique', dataType: 'string', required: true, filterable: true },
    { key: 'vram_gb', labelFr: 'Mémoire vidéo', dataType: 'number', unit: 'Go', required: true, filterable: true },
    { key: 'length_mm', labelFr: 'Longueur', dataType: 'number', unit: 'mm', required: true, usedInCompatibility: true },
    { key: 'tdp_watts', labelFr: 'Consommation (TDP)', dataType: 'number', unit: 'W', required: true, usedInCompatibility: true },
    { key: 'recommended_psu_watts', labelFr: 'Alimentation recommandée', dataType: 'number', unit: 'W', required: true, usedInCompatibility: true },
  ],
  psu: [
    { key: 'wattage', labelFr: 'Puissance', dataType: 'number', unit: 'W', required: true, filterable: true, usedInCompatibility: true },
    { key: 'form_factor', labelFr: 'Format', dataType: 'enum', enumValues: ['ATX', 'SFX'], required: true, usedInCompatibility: true },
    { key: 'efficiency', labelFr: 'Certification', dataType: 'enum', enumValues: ['80+ White', '80+ Bronze', '80+ Gold', '80+ Platinum', '80+ Titanium'], required: true, filterable: true },
    { key: 'modular', labelFr: 'Modulaire', dataType: 'boolean', filterable: true },
  ],
  case: [
    { key: 'form_factors_supported', labelFr: 'Formats de carte mère supportés', dataType: 'enum', enumValues: FORM_FACTORS, multiple: true, required: true, filterable: true, usedInCompatibility: true },
    { key: 'max_gpu_length_mm', labelFr: 'Longueur GPU maximale', dataType: 'number', unit: 'mm', required: true, usedInCompatibility: true },
    { key: 'max_cooler_height_mm', labelFr: 'Hauteur ventirad maximale', dataType: 'number', unit: 'mm', required: true, usedInCompatibility: true },
    { key: 'psu_form_factor', labelFr: 'Format alimentation', dataType: 'enum', enumValues: ['ATX', 'SFX'], required: true, usedInCompatibility: true },
    { key: 'radiator_support_mm', labelFr: 'Radiateur maximal', dataType: 'number', unit: 'mm', usedInCompatibility: true },
    { key: 'side_panel', labelFr: 'Panneau latéral', dataType: 'enum', enumValues: ['Verre trempé', 'Acier', 'Mesh'], filterable: true },
  ],
  cooler: [
    { key: 'socket_support', labelFr: 'Sockets supportés', dataType: 'enum', enumValues: SOCKETS, multiple: true, required: true, usedInCompatibility: true },
    { key: 'type', labelFr: 'Type', dataType: 'enum', enumValues: ['air', 'aio'], required: true, filterable: true },
    { key: 'height_mm', labelFr: 'Hauteur', dataType: 'number', unit: 'mm', required: true, usedInCompatibility: true },
    { key: 'radiator_mm', labelFr: 'Taille du radiateur', dataType: 'number', unit: 'mm', usedInCompatibility: true },
    { key: 'tdp_watts', labelFr: 'Dissipation maximale', dataType: 'number', unit: 'W', required: true, usedInCompatibility: true },
  ],
  storage: [
    { key: 'interface', labelFr: 'Interface', dataType: 'enum', enumValues: ['NVMe', 'SATA', 'M.2'], required: true, filterable: true, usedInCompatibility: true },
    { key: 'capacity_gb', labelFr: 'Capacité', dataType: 'number', unit: 'Go', required: true, filterable: true },
    { key: 'read_speed_mbs', labelFr: 'Lecture séquentielle', dataType: 'number', unit: 'Mo/s' },
    { key: 'tdp_watts', labelFr: 'Consommation', dataType: 'number', unit: 'W', usedInCompatibility: true },
  ],
  fan: [
    { key: 'size_mm', labelFr: 'Taille', dataType: 'number', unit: 'mm', required: true, filterable: true },
    { key: 'rgb', labelFr: 'RGB', dataType: 'boolean', filterable: true },
    { key: 'tdp_watts', labelFr: 'Consommation', dataType: 'number', unit: 'W', usedInCompatibility: true },
  ],
  prebuilt: [
    { key: 'cpu', labelFr: 'Processeur', dataType: 'string', required: true, filterable: true },
    { key: 'gpu', labelFr: 'Carte graphique', dataType: 'string', required: true, filterable: true },
    { key: 'ram_gb', labelFr: 'Mémoire', dataType: 'number', unit: 'Go', required: true, filterable: true },
    { key: 'storage_gb', labelFr: 'Stockage', dataType: 'number', unit: 'Go', required: true, filterable: true },
    { key: 'usage', labelFr: 'Usage', dataType: 'enum', enumValues: ['Gaming 1080p', 'Gaming 1440p', 'Gaming 4K', 'Création', 'Bureautique'], filterable: true },
  ],
  laptop: [
    { key: 'cpu', labelFr: 'Processeur', dataType: 'string', required: true, filterable: true },
    { key: 'gpu', labelFr: 'Carte graphique', dataType: 'string', filterable: true },
    { key: 'ram_gb', labelFr: 'Mémoire', dataType: 'number', unit: 'Go', required: true, filterable: true },
    { key: 'storage_gb', labelFr: 'Stockage', dataType: 'number', unit: 'Go', required: true, filterable: true },
    { key: 'screen_inches', labelFr: 'Écran', dataType: 'number', unit: 'pouces', required: true, filterable: true },
    { key: 'refresh_hz', labelFr: 'Taux de rafraîchissement', dataType: 'number', unit: 'Hz', filterable: true },
  ],
  monitor: [
    { key: 'screen_inches', labelFr: 'Diagonale', dataType: 'number', unit: 'pouces', required: true, filterable: true },
    { key: 'resolution', labelFr: 'Résolution', dataType: 'enum', enumValues: ['1920x1080', '2560x1440', '3440x1440', '3840x2160'], required: true, filterable: true },
    { key: 'refresh_hz', labelFr: 'Taux de rafraîchissement', dataType: 'number', unit: 'Hz', required: true, filterable: true },
    { key: 'panel', labelFr: 'Dalle', dataType: 'enum', enumValues: ['IPS', 'VA', 'TN', 'OLED'], filterable: true },
    { key: 'curved', labelFr: 'Incurvé', dataType: 'boolean', filterable: true },
  ],
  peripheral: [
    { key: 'peripheral_type', labelFr: 'Type', dataType: 'enum', enumValues: ['Clavier', 'Souris', 'Casque', 'Tapis', 'Microphone', 'Webcam', 'Manette'], required: true, filterable: true },
    { key: 'connection', labelFr: 'Connexion', dataType: 'enum', enumValues: ['Filaire', 'Sans fil', 'Bluetooth'], filterable: true },
    { key: 'rgb', labelFr: 'RGB', dataType: 'boolean', filterable: true },
  ],
  console: [
    { key: 'brand_family', labelFr: 'Famille', dataType: 'enum', enumValues: ['PlayStation', 'Xbox', 'Nintendo'], required: true, filterable: true },
    { key: 'storage_gb', labelFr: 'Stockage', dataType: 'number', unit: 'Go', filterable: true },
    { key: 'edition', labelFr: 'Édition', dataType: 'string' },
  ],
  workstation: [
    { key: 'cpu', labelFr: 'Processeur', dataType: 'string', required: true, filterable: true },
    { key: 'gpu', labelFr: 'Carte graphique', dataType: 'string', filterable: true },
    { key: 'ram_gb', labelFr: 'Mémoire', dataType: 'number', unit: 'Go', required: true, filterable: true },
    { key: 'storage_gb', labelFr: 'Stockage', dataType: 'number', unit: 'Go', required: true, filterable: true },
    { key: 'usage', labelFr: 'Usage', dataType: 'enum', enumValues: ['3D / Rendu', 'Montage vidéo', 'CAO', 'IA / Data'], filterable: true },
  ],
};
