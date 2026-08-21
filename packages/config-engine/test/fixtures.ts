import type { Attributes, Part } from '@rgi/types';

/** Test parts, priced in centimes. Specs are realistic so failures read like real builds. */
let seq = 0;
function part(
  categoryType: string,
  name: string,
  priceMad: number,
  attributes: Attributes,
  stock = 5,
): Part {
  seq += 1;
  return {
    id: `p${seq}`,
    categoryType,
    name,
    price: Math.round(priceMad * 100),
    stock,
    attributes,
  };
}

// ── boîtiers ──────────────────────────────────────────────────────────────
export const caseAtx = part('case', 'Lian Li Lancool 216 ATX', 1090, {
  form_factors_supported: ['ATX', 'MATX', 'ITX'],
  max_gpu_length_mm: 392,
  max_cooler_height_mm: 180,
  psu_form_factor: 'ATX',
  radiator_support_mm: ['240', '280', '360'],
});

export const caseItx = part('case', 'Cooler Master NR200 ITX', 990, {
  form_factors_supported: ['ITX'],
  max_gpu_length_mm: 330,
  max_cooler_height_mm: 155,
  psu_form_factor: 'SFX',
  radiator_support_mm: ['240'],
});

// ── cartes mères ──────────────────────────────────────────────────────────
export const moboAm5Atx = part('motherboard', 'MSI B650 Tomahawk ATX', 2390, {
  socket: 'AM5',
  form_factor: 'ATX',
  ram_type: 'DDR5',
  ram_slots: 4,
  max_ram_gb: 192,
});

export const moboLga1700Atx = part('motherboard', 'ASUS TUF B760-Plus ATX', 2090, {
  socket: 'LGA1700',
  form_factor: 'ATX',
  ram_type: 'DDR5',
  ram_slots: 4,
  max_ram_gb: 128,
});

export const moboAm4Ddr4Matx = part('motherboard', 'Gigabyte B550M DS3H mATX', 1090, {
  socket: 'AM4',
  form_factor: 'MATX',
  ram_type: 'DDR4',
  ram_slots: 4,
  max_ram_gb: 128,
});

// ── processeurs ───────────────────────────────────────────────────────────
export const cpuRyzen7600 = part('cpu', 'AMD Ryzen 5 7600', 2190, {
  socket: 'AM5',
  tdp_watts: 65,
  integrated_graphics: true,
  includes_cooler: true,
});

export const cpuRyzen7800x3d = part('cpu', 'AMD Ryzen 7 7800X3D', 4590, {
  socket: 'AM5',
  tdp_watts: 120,
  integrated_graphics: true,
  includes_cooler: false,
});

export const cpuIntel14600kf = part('cpu', 'Intel Core i5-14600KF', 2790, {
  socket: 'LGA1700',
  tdp_watts: 181,
  integrated_graphics: false,
  includes_cooler: false,
});

// ── refroidissement ───────────────────────────────────────────────────────
export const coolerAirAm5 = part('cooler', 'DeepCool AK620 (air)', 690, {
  socket_support: ['AM5', 'AM4', 'LGA1700'],
  height_mm: 160,
  tdp_watts: 260,
  type: 'air',
});

export const coolerTallAir = part('cooler', 'Noctua NH-D15 (air)', 1290, {
  socket_support: ['AM5', 'AM4', 'LGA1700'],
  height_mm: 165,
  tdp_watts: 250,
  type: 'air',
});

export const coolerAio360 = part('cooler', 'Arctic Liquid Freezer III 360', 1490, {
  socket_support: ['AM5', 'LGA1700'],
  height_mm: 60,
  tdp_watts: 300,
  type: 'aio',
  radiator_mm: 360,
});

export const coolerAm4Only = part('cooler', 'Ventirad AM4 uniquement', 390, {
  socket_support: ['AM4'],
  height_mm: 150,
  tdp_watts: 150,
  type: 'air',
});

// ── mémoire ───────────────────────────────────────────────────────────────
export const ramDdr5_32 = part('ram', 'Corsair Vengeance 32 Go DDR5-6000 (2x16)', 1190, {
  ram_type: 'DDR5',
  modules: 2,
  capacity_gb: 32,
  speed_mhz: 6000,
});

export const ramDdr5_16 = part('ram', 'Kingston Fury 16 Go DDR5-5600 (1x16)', 620, {
  ram_type: 'DDR5',
  modules: 1,
  capacity_gb: 16,
  speed_mhz: 5600,
});

export const ramDdr4_32 = part('ram', 'G.Skill Ripjaws 32 Go DDR4-3600 (2x16)', 890, {
  ram_type: 'DDR4',
  modules: 2,
  capacity_gb: 32,
  speed_mhz: 3600,
});

export const ramDdr5_128 = part('ram', 'Kit 128 Go DDR5 (4x32)', 4890, {
  ram_type: 'DDR5',
  modules: 4,
  capacity_gb: 128,
  speed_mhz: 5200,
});

// ── cartes graphiques ─────────────────────────────────────────────────────
export const gpuRtx4060 = part('gpu', 'MSI RTX 4060 Ventus 8G', 3290, {
  chipset: 'RTX4060',
  length_mm: 200,
  tdp_watts: 115,
  recommended_psu_watts: 550,
});

export const gpuRtx4080 = part('gpu', 'Gigabyte RTX 4080 Super Gaming OC', 13900, {
  chipset: 'RTX4080S',
  length_mm: 340,
  tdp_watts: 320,
  recommended_psu_watts: 850,
});

export const gpuRtx5090 = part('gpu', 'ASUS ROG Astral RTX 5090', 29900, {
  chipset: 'RTX5090',
  length_mm: 358,
  tdp_watts: 575,
  recommended_psu_watts: 1000,
});

// ── stockage ──────────────────────────────────────────────────────────────
export const ssd1tb = part('storage', 'Samsung 990 EVO 1 To NVMe', 890, {
  interface: 'NVMe',
  capacity_gb: 1000,
});

export const ssd2tb = part('storage', 'WD Black SN850X 2 To NVMe', 1690, {
  interface: 'NVMe',
  capacity_gb: 2000,
});

// ── alimentations ─────────────────────────────────────────────────────────
export const psu650Atx = part('psu', 'Corsair RM650e 650W 80+ Gold', 890, {
  wattage: 650,
  form_factor: 'ATX',
  efficiency: '80+ Gold',
});

export const psu850Atx = part('psu', 'Corsair RM850e 850W 80+ Gold', 1290, {
  wattage: 850,
  form_factor: 'ATX',
  efficiency: '80+ Gold',
});

export const psu1200Atx = part('psu', 'Seasonic Vertex 1200W 80+ Platinum', 2790, {
  wattage: 1200,
  form_factor: 'ATX',
  efficiency: '80+ Platinum',
});

export const psu750Sfx = part('psu', 'Corsair SF750 SFX 750W', 1690, {
  wattage: 750,
  form_factor: 'SFX',
  efficiency: '80+ Platinum',
});

export const psuOutOfStock = part(
  'psu',
  'Alimentation en rupture 850W',
  1190,
  { wattage: 850, form_factor: 'ATX', efficiency: '80+ Gold' },
  0,
);

/** A complete, valid AM5 build used as the baseline in most tests. */
export const validAm5Build = {
  case: caseAtx,
  motherboard: moboAm5Atx,
  cpu: cpuRyzen7800x3d,
  cooler: coolerAirAm5,
  ram: [ramDdr5_32],
  gpu: gpuRtx4060,
  storage: [ssd1tb],
  psu: psu650Atx,
};
