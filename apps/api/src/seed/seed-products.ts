import type { Attributes } from '@rgi/types';

export interface SeedProduct {
  nameFr: string;
  sku: string;
  brand: string;
  /** category slug this product belongs to */
  categorySlug: string;
  descriptionFr: string;
  /** price in MAD (converted to centimes at seed time — CLAUDE.md §6) */
  priceMad: number;
  compareAtMad?: number;
  stock: number;
  attributes: Attributes;
}

/**
 * A demo catalog wide enough to exercise the configurator: two sockets (AM5 + LGA1700),
 * DDR4 and DDR5, an ITX case that rejects an ATX board, a 850 W and a 1000 W PSU, a GPU
 * too long for the small case, and a CPU with integrated graphics so the GPU slot can be
 * left empty. Prices are indicative Moroccan retail (MAD).
 */
export const SEED_PRODUCTS: SeedProduct[] = [
  // ─────────────── Boîtiers ───────────────
  {
    nameFr: 'Boîtier Lian Li Lancool 216 RGB Noir',
    sku: 'CASE-LL216-BK',
    brand: 'Lian Li',
    categorySlug: 'composants/boitiers',
    descriptionFr:
      "Boîtier moyen tour au flux d'air généreux : deux ventilateurs 160 mm en façade, panneau latéral en verre trempé et compatibilité radiateur 360 mm. Un excellent point de départ pour une configuration gaming silencieuse.",
    priceMad: 1290,
    stock: 12,
    attributes: {
      form_factors_supported: ['ATX', 'mATX', 'ITX'],
      max_gpu_length_mm: 392,
      max_cooler_height_mm: 180,
      psu_form_factor: 'ATX',
      radiator_support_mm: 360,
      side_panel: 'Verre trempé',
    },
  },
  {
    nameFr: 'Boîtier NZXT H6 Flow Blanc',
    sku: 'CASE-H6FLOW-WH',
    brand: 'NZXT',
    categorySlug: 'composants/boitiers',
    descriptionFr:
      'Boîtier double chambre au design panoramique, pensé pour exposer la carte graphique. Trois ventilateurs 120 mm inclus et une gestion des câbles simple à réussir.',
    priceMad: 1490,
    compareAtMad: 1690,
    stock: 8,
    attributes: {
      form_factors_supported: ['ATX', 'mATX', 'ITX'],
      max_gpu_length_mm: 365,
      max_cooler_height_mm: 163,
      psu_form_factor: 'ATX',
      radiator_support_mm: 360,
      side_panel: 'Verre trempé',
    },
  },
  {
    nameFr: 'Boîtier Cooler Master NR200P Mini-ITX',
    sku: 'CASE-NR200P-BK',
    brand: 'Cooler Master',
    categorySlug: 'composants/boitiers',
    descriptionFr:
      "Cube Mini-ITX de 18 litres pour une configuration compacte à poser sur le bureau. Alimentation SFX obligatoire et carte graphique limitée à 330 mm.",
    priceMad: 990,
    stock: 5,
    attributes: {
      form_factors_supported: ['ITX'],
      max_gpu_length_mm: 330,
      max_cooler_height_mm: 155,
      psu_form_factor: 'SFX',
      radiator_support_mm: 280,
      side_panel: 'Mesh',
    },
  },
  // ─────────────── Cartes mères ───────────────
  {
    nameFr: 'Carte mère MSI MAG B650 Tomahawk WiFi',
    sku: 'MB-B650TOMA-WIFI',
    brand: 'MSI',
    categorySlug: 'composants/cartes-meres',
    descriptionFr:
      "Carte mère ATX AM5 pour Ryzen 7000/9000 : quatre slots DDR5, deux ports M.2 PCIe 4.0, Wi-Fi 6E et une étage d'alimentation robuste pour les processeurs 8 cœurs et plus.",
    priceMad: 2690,
    stock: 9,
    attributes: {
      socket: 'AM5',
      chipset: 'B650',
      form_factor: 'ATX',
      ram_type: 'DDR5',
      ram_slots: 4,
      max_ram_gb: 128,
      m2_slots: 2,
      wifi: true,
    },
  },
  {
    nameFr: 'Carte mère ASUS TUF Gaming B760M-PLUS DDR5',
    sku: 'MB-B760M-TUF',
    brand: 'ASUS',
    categorySlug: 'composants/cartes-meres',
    descriptionFr:
      'Carte mère micro-ATX LGA1700 pour processeurs Intel 12e à 14e génération, avec deux ports M.2 et une connectique complète. Format compact, compatible avec la majorité des boîtiers.',
    priceMad: 1890,
    stock: 7,
    attributes: {
      socket: 'LGA1700',
      chipset: 'B760',
      form_factor: 'mATX',
      ram_type: 'DDR5',
      ram_slots: 4,
      max_ram_gb: 128,
      m2_slots: 2,
      wifi: false,
    },
  },
  {
    nameFr: 'Carte mère Gigabyte B550M DS3H DDR4',
    sku: 'MB-B550M-DS3H',
    brand: 'Gigabyte',
    categorySlug: 'composants/cartes-meres',
    descriptionFr:
      "Carte mère micro-ATX AM4 en DDR4, le choix économique pour une configuration Ryzen 5000 avec un très bon rapport prix/performances.",
    priceMad: 1090,
    stock: 14,
    attributes: {
      socket: 'AM4',
      chipset: 'B550',
      form_factor: 'mATX',
      ram_type: 'DDR4',
      ram_slots: 4,
      max_ram_gb: 128,
      m2_slots: 2,
      wifi: false,
    },
  },
  {
    nameFr: 'Carte mère ASRock B650E PG-ITX WiFi',
    sku: 'MB-B650E-ITX',
    brand: 'ASRock',
    categorySlug: 'composants/cartes-meres',
    descriptionFr:
      'Carte mère Mini-ITX AM5 haut de gamme pour les configurations compactes : DDR5, PCIe 5.0 et Wi-Fi 6E dans un format 17 × 17 cm.',
    priceMad: 3190,
    stock: 4,
    attributes: {
      socket: 'AM5',
      chipset: 'B650E',
      form_factor: 'ITX',
      ram_type: 'DDR5',
      ram_slots: 2,
      max_ram_gb: 96,
      m2_slots: 2,
      wifi: true,
    },
  },
  // ─────────────── Processeurs ───────────────
  {
    nameFr: 'Processeur AMD Ryzen 7 7800X3D',
    sku: 'CPU-R7-7800X3D',
    brand: 'AMD',
    categorySlug: 'composants/processeurs',
    descriptionFr:
      "La référence du jeu vidéo : 8 cœurs, 16 threads et 96 Mo de cache 3D V-Cache qui font la différence dans les jeux gourmands en processeur. Ventirad non fourni.",
    priceMad: 4790,
    compareAtMad: 5290,
    stock: 6,
    attributes: {
      socket: 'AM5',
      cores: 8,
      threads: 16,
      base_clock_ghz: 4.2,
      boost_clock_ghz: 5,
      tdp_watts: 120,
      integrated_graphics: true,
      includes_cooler: false,
    },
  },
  {
    nameFr: 'Processeur AMD Ryzen 5 7600',
    sku: 'CPU-R5-7600',
    brand: 'AMD',
    categorySlug: 'composants/processeurs',
    descriptionFr:
      'Six cœurs AM5 livrés avec leur ventirad Wraith Stealth : le meilleur point d’entrée pour une configuration gaming 1080p/1440p en DDR5.',
    priceMad: 2290,
    stock: 11,
    attributes: {
      socket: 'AM5',
      cores: 6,
      threads: 12,
      base_clock_ghz: 3.8,
      boost_clock_ghz: 5.1,
      tdp_watts: 65,
      integrated_graphics: true,
      includes_cooler: true,
    },
  },
  {
    nameFr: 'Processeur Intel Core i5-14600KF',
    sku: 'CPU-I5-14600KF',
    brand: 'Intel',
    categorySlug: 'composants/processeurs',
    descriptionFr:
      "14 cœurs hybrides (6P + 8E) pour le jeu comme pour la création. Version KF sans circuit graphique intégré : une carte graphique est indispensable.",
    priceMad: 3190,
    stock: 8,
    attributes: {
      socket: 'LGA1700',
      cores: 14,
      threads: 20,
      base_clock_ghz: 3.5,
      boost_clock_ghz: 5.3,
      tdp_watts: 125,
      integrated_graphics: false,
      includes_cooler: false,
    },
  },
  {
    nameFr: 'Processeur AMD Ryzen 5 5600',
    sku: 'CPU-R5-5600',
    brand: 'AMD',
    categorySlug: 'composants/processeurs',
    descriptionFr:
      'Le choix budget en AM4 DDR4 : six cœurs, douze threads et un ventirad fourni, parfait pour une première configuration gaming.',
    priceMad: 1290,
    stock: 15,
    attributes: {
      socket: 'AM4',
      cores: 6,
      threads: 12,
      base_clock_ghz: 3.5,
      boost_clock_ghz: 4.4,
      tdp_watts: 65,
      integrated_graphics: false,
      includes_cooler: true,
    },
  },
  // ─────────────── Refroidissement ───────────────
  {
    nameFr: 'Ventirad be quiet! Dark Rock Pro 5',
    sku: 'COOL-DRP5',
    brand: 'be quiet!',
    categorySlug: 'composants/refroidissement',
    descriptionFr:
      'Ventirad double tour quasi inaudible, capable de dissiper 270 W. Sa hauteur de 163 mm demande un boîtier moyen ou grand format.',
    priceMad: 1190,
    stock: 6,
    attributes: {
      socket_support: ['AM5', 'AM4', 'LGA1700', 'LGA1200'],
      type: 'air',
      height_mm: 163,
      tdp_watts: 270,
    },
  },
  {
    nameFr: 'Watercooling AIO Arctic Liquid Freezer III 360',
    sku: 'COOL-LF3-360',
    brand: 'Arctic',
    categorySlug: 'composants/refroidissement',
    descriptionFr:
      "Kit tout-en-un 360 mm au rapport performances/prix imbattable, avec ventilateur VRM intégré. Vérifiez que le boîtier accepte un radiateur de 360 mm.",
    priceMad: 1390,
    stock: 7,
    attributes: {
      socket_support: ['AM5', 'AM4', 'LGA1700', 'LGA1851'],
      type: 'aio',
      height_mm: 60,
      radiator_mm: 360,
      tdp_watts: 300,
    },
  },
  {
    nameFr: 'Ventirad Thermalright Peerless Assassin 120 SE',
    sku: 'COOL-PA120-SE',
    brand: 'Thermalright',
    categorySlug: 'composants/refroidissement',
    descriptionFr:
      'Le ventirad qui a bousculé le marché : deux tours, six caloducs et un tarif contenu. 155 mm de haut, il passe dans la plupart des boîtiers moyens.',
    priceMad: 420,
    stock: 20,
    attributes: {
      socket_support: ['AM5', 'AM4', 'LGA1700', 'LGA1200'],
      type: 'air',
      height_mm: 155,
      tdp_watts: 245,
    },
  },
  // ─────────────── Mémoire RAM ───────────────
  {
    nameFr: 'Kit mémoire Corsair Vengeance RGB 32 Go (2×16) DDR5 6000 MHz',
    sku: 'RAM-CORS-32-DDR5-6000',
    brand: 'Corsair',
    categorySlug: 'composants/memoire-ram',
    descriptionFr:
      "Kit DDR5 de 32 Go en deux barrettes, cadencé à 6000 MHz CL30 — le point idéal pour les plateformes AM5 et Intel récentes. Éclairage RGB adressable.",
    priceMad: 1290,
    stock: 10,
    attributes: {
      ram_type: 'DDR5',
      capacity_gb: 32,
      modules: 2,
      speed_mhz: 6000,
      cas_latency: 30,
      rgb: true,
    },
  },
  {
    nameFr: 'Kit mémoire Kingston Fury Beast 16 Go (2×8) DDR5 5200 MHz',
    sku: 'RAM-KING-16-DDR5-5200',
    brand: 'Kingston',
    categorySlug: 'composants/memoire-ram',
    descriptionFr:
      'Kit DDR5 16 Go abordable pour une configuration d’entrée de gamme, extensible plus tard grâce aux deux slots restants.',
    priceMad: 690,
    stock: 18,
    attributes: {
      ram_type: 'DDR5',
      capacity_gb: 16,
      modules: 2,
      speed_mhz: 5200,
      cas_latency: 40,
      rgb: false,
    },
  },
  {
    nameFr: 'Kit mémoire G.Skill Ripjaws V 32 Go (2×16) DDR4 3600 MHz',
    sku: 'RAM-GSK-32-DDR4-3600',
    brand: 'G.Skill',
    categorySlug: 'composants/memoire-ram',
    descriptionFr:
      'Le duo parfait pour une plateforme AM4 ou Intel DDR4 : 32 Go à 3600 MHz CL18, profil XMP prêt à l’emploi.',
    priceMad: 890,
    stock: 12,
    attributes: {
      ram_type: 'DDR4',
      capacity_gb: 32,
      modules: 2,
      speed_mhz: 3600,
      cas_latency: 18,
      rgb: false,
    },
  },
  // ─────────────── Cartes graphiques ───────────────
  {
    nameFr: 'Carte graphique ASUS TUF Gaming GeForce RTX 5080 16 Go',
    sku: 'GPU-RTX5080-TUF',
    brand: 'ASUS',
    categorySlug: 'composants/cartes-graphiques',
    descriptionFr:
      "Carte graphique haut de gamme pour le jeu en 4K : 16 Go de GDDR7, DLSS dernière génération et un refroidissement TUF à trois ventilateurs. Longueur 348 mm, à vérifier avec votre boîtier.",
    priceMad: 16990,
    stock: 3,
    attributes: {
      chipset: 'RTX 5080',
      vram_gb: 16,
      length_mm: 348,
      tdp_watts: 360,
      recommended_psu_watts: 850,
    },
  },
  {
    nameFr: 'Carte graphique MSI GeForce RTX 5070 Ventus 3X 12 Go',
    sku: 'GPU-RTX5070-VENTUS',
    brand: 'MSI',
    categorySlug: 'composants/cartes-graphiques',
    descriptionFr:
      'Le compromis 1440p par excellence : 12 Go de mémoire, un excellent rendement énergétique et un format qui passe dans la plupart des boîtiers.',
    priceMad: 8490,
    compareAtMad: 8990,
    stock: 6,
    attributes: {
      chipset: 'RTX 5070',
      vram_gb: 12,
      length_mm: 305,
      tdp_watts: 250,
      recommended_psu_watts: 650,
    },
  },
  {
    nameFr: 'Carte graphique Sapphire Pulse Radeon RX 9070 XT 16 Go',
    sku: 'GPU-RX9070XT-PULSE',
    brand: 'Sapphire',
    categorySlug: 'composants/cartes-graphiques',
    descriptionFr:
      '16 Go de mémoire et des performances taillées pour le 1440p haute fréquence, avec un refroidissement Pulse discret.',
    priceMad: 9290,
    stock: 4,
    attributes: {
      chipset: 'RX 9070 XT',
      vram_gb: 16,
      length_mm: 320,
      tdp_watts: 304,
      recommended_psu_watts: 750,
    },
  },
  {
    nameFr: 'Carte graphique Gigabyte GeForce RTX 5060 Eagle 8 Go',
    sku: 'GPU-RTX5060-EAGLE',
    brand: 'Gigabyte',
    categorySlug: 'composants/cartes-graphiques',
    descriptionFr:
      'Carte compacte de 242 mm pensée pour le 1080p et les petits boîtiers, avec une consommation très mesurée.',
    priceMad: 4290,
    stock: 9,
    attributes: {
      chipset: 'RTX 5060',
      vram_gb: 8,
      length_mm: 242,
      tdp_watts: 145,
      recommended_psu_watts: 550,
    },
  },
  // ─────────────── Stockage ───────────────
  {
    nameFr: 'SSD Samsung 990 PRO 2 To NVMe PCIe 4.0',
    sku: 'SSD-990PRO-2TB',
    brand: 'Samsung',
    categorySlug: 'composants/stockage',
    descriptionFr:
      'SSD NVMe de référence : jusqu’à 7450 Mo/s en lecture, idéal comme disque système et pour les jeux les plus lourds.',
    priceMad: 1890,
    stock: 10,
    attributes: {
      interface: 'NVMe',
      capacity_gb: 2000,
      read_speed_mbs: 7450,
      tdp_watts: 8,
    },
  },
  {
    nameFr: 'SSD Crucial P3 Plus 1 To NVMe PCIe 4.0',
    sku: 'SSD-P3PLUS-1TB',
    brand: 'Crucial',
    categorySlug: 'composants/stockage',
    descriptionFr:
      'Un To de stockage rapide à prix contenu, parfait comme disque principal d’une configuration gaming équilibrée.',
    priceMad: 690,
    stock: 16,
    attributes: {
      interface: 'NVMe',
      capacity_gb: 1000,
      read_speed_mbs: 5000,
      tdp_watts: 6,
    },
  },
  {
    nameFr: 'SSD Kingston A400 480 Go SATA',
    sku: 'SSD-A400-480',
    brand: 'Kingston',
    categorySlug: 'composants/stockage',
    descriptionFr:
      'SSD SATA 2,5 pouces pour ajouter du stockage secondaire à moindre coût.',
    priceMad: 320,
    stock: 22,
    attributes: {
      interface: 'SATA',
      capacity_gb: 480,
      read_speed_mbs: 500,
      tdp_watts: 3,
    },
  },
  // ─────────────── Alimentations ───────────────
  {
    nameFr: 'Alimentation Corsair RM1000e 1000 W 80+ Gold',
    sku: 'PSU-RM1000E',
    brand: 'Corsair',
    categorySlug: 'composants/alimentations',
    descriptionFr:
      'Alimentation entièrement modulaire de 1000 W certifiée 80+ Gold, avec un connecteur 12V-2x6 pour les cartes graphiques récentes.',
    priceMad: 2190,
    stock: 5,
    attributes: {
      wattage: 1000,
      form_factor: 'ATX',
      efficiency: '80+ Gold',
      modular: true,
    },
  },
  {
    nameFr: 'Alimentation MSI MAG A850GL 850 W 80+ Gold',
    sku: 'PSU-A850GL',
    brand: 'MSI',
    categorySlug: 'composants/alimentations',
    descriptionFr:
      '850 W modulaires certifiés 80+ Gold : la puissance de référence pour une configuration RTX 5070/5080.',
    priceMad: 1490,
    stock: 8,
    attributes: {
      wattage: 850,
      form_factor: 'ATX',
      efficiency: '80+ Gold',
      modular: true,
    },
  },
  {
    nameFr: 'Alimentation be quiet! System Power 10 650 W 80+ Bronze',
    sku: 'PSU-SP10-650',
    brand: 'be quiet!',
    categorySlug: 'composants/alimentations',
    descriptionFr:
      'Alimentation silencieuse de 650 W pour les configurations milieu de gamme sans carte graphique gourmande.',
    priceMad: 790,
    stock: 12,
    attributes: {
      wattage: 650,
      form_factor: 'ATX',
      efficiency: '80+ Bronze',
      modular: false,
    },
  },
  {
    nameFr: 'Alimentation Cooler Master V850 SFX Gold 850 W',
    sku: 'PSU-V850-SFX',
    brand: 'Cooler Master',
    categorySlug: 'composants/alimentations',
    descriptionFr:
      'Bloc SFX de 850 W pour les configurations Mini-ITX : toute la puissance d’une ATX dans un format réduit.',
    priceMad: 2290,
    stock: 4,
    attributes: {
      wattage: 850,
      form_factor: 'SFX',
      efficiency: '80+ Gold',
      modular: true,
    },
  },
  // ─────────────── Ventilateurs ───────────────
  {
    nameFr: 'Ventilateur Arctic P12 PWM PST 120 mm',
    sku: 'FAN-P12-PWM',
    brand: 'Arctic',
    categorySlug: 'composants/ventilateurs',
    descriptionFr:
      'Ventilateur 120 mm à forte pression statique, efficace en extraction comme sur un radiateur.',
    priceMad: 79,
    stock: 40,
    attributes: { size_mm: 120, rgb: false, tdp_watts: 2 },
  },
  {
    nameFr: 'Ventilateur Lian Li Uni Fan SL120 V2 RGB (pack de 3)',
    sku: 'FAN-SL120-V2-3P',
    brand: 'Lian Li',
    categorySlug: 'composants/ventilateurs',
    descriptionFr:
      'Pack de trois ventilateurs RGB à connexion en série : câblage minimal et éclairage homogène.',
    priceMad: 690,
    stock: 9,
    attributes: { size_mm: 120, rgb: true, tdp_watts: 6 },
  },
  // ─────────────── PC Gamer montés ───────────────
  {
    nameFr: 'PC Gamer Rgi Nova RTX 5070 / Ryzen 5 7600',
    sku: 'PC-NOVA-5070',
    brand: 'Rgi Service',
    categorySlug: 'pc-gamer',
    descriptionFr:
      "Configuration montée, testée et garantie par notre atelier : Ryzen 5 7600, RTX 5070 12 Go, 32 Go de DDR5 et un SSD NVMe de 1 To. Prête à jouer en 1440p dès la sortie du carton.",
    priceMad: 17990,
    compareAtMad: 19490,
    stock: 4,
    attributes: {
      cpu: 'AMD Ryzen 5 7600',
      gpu: 'GeForce RTX 5070 12 Go',
      ram_gb: 32,
      storage_gb: 1000,
      usage: 'Gaming 1440p',
    },
  },
  {
    nameFr: 'PC Gamer Rgi Apex RTX 5080 / Ryzen 7 7800X3D',
    sku: 'PC-APEX-5080',
    brand: 'Rgi Service',
    categorySlug: 'pc-gamer',
    descriptionFr:
      'Notre configuration 4K : Ryzen 7 7800X3D, RTX 5080 16 Go, 32 Go de DDR5 6000 MHz, watercooling 360 mm et alimentation 1000 W Gold.',
    priceMad: 32990,
    stock: 2,
    attributes: {
      cpu: 'AMD Ryzen 7 7800X3D',
      gpu: 'GeForce RTX 5080 16 Go',
      ram_gb: 32,
      storage_gb: 2000,
      usage: 'Gaming 4K',
    },
  },
  {
    nameFr: 'PC Gamer Rgi Start RTX 5060 / Ryzen 5 5600',
    sku: 'PC-START-5060',
    brand: 'Rgi Service',
    categorySlug: 'pc-gamer',
    descriptionFr:
      'La porte d’entrée du jeu PC en 1080p : Ryzen 5 5600, RTX 5060 8 Go, 16 Go de DDR4 et SSD NVMe 1 To.',
    priceMad: 9990,
    stock: 6,
    attributes: {
      cpu: 'AMD Ryzen 5 5600',
      gpu: 'GeForce RTX 5060 8 Go',
      ram_gb: 16,
      storage_gb: 1000,
      usage: 'Gaming 1080p',
    },
  },
  // ─────────────── Station de travail ───────────────
  {
    nameFr: 'Station de travail Rgi Studio 64 Go / RTX 5080',
    sku: 'WS-STUDIO-64',
    brand: 'Rgi Service',
    categorySlug: 'stations-de-travail',
    descriptionFr:
      'Machine de création : 64 Go de mémoire, RTX 5080 16 Go et 4 To de stockage NVMe pour le montage 4K, la 3D et le calcul.',
    priceMad: 42990,
    stock: 2,
    attributes: {
      cpu: 'AMD Ryzen 9 9950X',
      gpu: 'GeForce RTX 5080 16 Go',
      ram_gb: 64,
      storage_gb: 4000,
      usage: 'Montage vidéo',
    },
  },
  // ─────────────── PC Portables ───────────────
  {
    nameFr: 'PC portable ASUS ROG Strix G16 RTX 5070',
    sku: 'NB-ROG-G16-5070',
    brand: 'ASUS',
    categorySlug: 'pc-portables',
    descriptionFr:
      'Portable gaming 16 pouces 165 Hz, Core i7 et RTX 5070 : la puissance d’un PC fixe dans un sac à dos.',
    priceMad: 21990,
    stock: 3,
    attributes: {
      cpu: 'Intel Core i7-14650HX',
      gpu: 'GeForce RTX 5070 Laptop',
      ram_gb: 16,
      storage_gb: 1000,
      screen_inches: 16,
      refresh_hz: 165,
    },
  },
  {
    nameFr: 'PC portable Lenovo LOQ 15 RTX 5060',
    sku: 'NB-LOQ15-5060',
    brand: 'Lenovo',
    categorySlug: 'pc-portables',
    descriptionFr:
      'Portable gaming 15 pouces au rapport prix/performances solide, avec dalle 144 Hz et RTX 5060.',
    priceMad: 13490,
    stock: 5,
    attributes: {
      cpu: 'AMD Ryzen 7 8845HS',
      gpu: 'GeForce RTX 5060 Laptop',
      ram_gb: 16,
      storage_gb: 512,
      screen_inches: 15.6,
      refresh_hz: 144,
    },
  },
  // ─────────────── Écrans ───────────────
  {
    nameFr: 'Écran LG UltraGear 27GS95QE OLED 27" 240 Hz',
    sku: 'MON-LG-27GS95QE',
    brand: 'LG',
    categorySlug: 'ecrans',
    descriptionFr:
      'Dalle OLED 1440p à 240 Hz et 0,03 ms : contrastes infinis et réactivité maximale pour le jeu compétitif.',
    priceMad: 8990,
    stock: 3,
    attributes: {
      screen_inches: 27,
      resolution: '2560x1440',
      refresh_hz: 240,
      panel: 'OLED',
      curved: false,
    },
  },
  {
    nameFr: 'Écran Samsung Odyssey G5 32" incurvé 165 Hz',
    sku: 'MON-SAM-G5-32',
    brand: 'Samsung',
    categorySlug: 'ecrans',
    descriptionFr:
      'Grand écran incurvé 32 pouces en 1440p à 165 Hz, immersif et abordable.',
    priceMad: 3290,
    compareAtMad: 3690,
    stock: 7,
    attributes: {
      screen_inches: 32,
      resolution: '2560x1440',
      refresh_hz: 165,
      panel: 'VA',
      curved: true,
    },
  },
  // ─────────────── Périphériques ───────────────
  {
    nameFr: 'Clavier Logitech G Pro X TKL sans fil',
    sku: 'PER-GPROX-TKL',
    brand: 'Logitech',
    categorySlug: 'peripheriques',
    descriptionFr:
      'Clavier mécanique compact sans fil Lightspeed, pensé pour l’esport et les bureaux dégagés.',
    priceMad: 2190,
    stock: 8,
    attributes: { peripheral_type: 'Clavier', connection: 'Sans fil', rgb: true },
  },
  {
    nameFr: 'Souris Razer DeathAdder V3 Pro',
    sku: 'PER-DAV3-PRO',
    brand: 'Razer',
    categorySlug: 'peripheriques',
    descriptionFr:
      'Souris sans fil ultra-légère de 63 g, capteur 30 000 dpi et autonomie de 90 heures.',
    priceMad: 1690,
    stock: 10,
    attributes: { peripheral_type: 'Souris', connection: 'Sans fil', rgb: false },
  },
  {
    nameFr: 'Casque HyperX Cloud III',
    sku: 'PER-CLOUD3',
    brand: 'HyperX',
    categorySlug: 'peripheriques',
    descriptionFr:
      'Casque filaire confortable au son précis, micro antibruit détachable : la valeur sûre du jeu en ligne.',
    priceMad: 990,
    stock: 14,
    attributes: { peripheral_type: 'Casque', connection: 'Filaire', rgb: false },
  },
  // ─────────────── Consoles ───────────────
  {
    nameFr: 'Console Sony PlayStation 5 Slim Digital',
    sku: 'CON-PS5-SLIM-DIG',
    brand: 'Sony',
    categorySlug: 'consoles',
    descriptionFr:
      'PlayStation 5 Slim en version 100 % numérique, 1 To de stockage SSD.',
    priceMad: 5490,
    stock: 6,
    attributes: { brand_family: 'PlayStation', storage_gb: 1000, edition: 'Slim Digital' },
  },
  {
    nameFr: 'Console Microsoft Xbox Series X 1 To',
    sku: 'CON-XSX-1TB',
    brand: 'Microsoft',
    categorySlug: 'consoles',
    descriptionFr:
      'La console la plus puissante de Microsoft : 4K, 120 fps et lecteur de disques.',
    priceMad: 5990,
    stock: 4,
    attributes: { brand_family: 'Xbox', storage_gb: 1000, edition: 'Series X' },
  },
];
