/**
 * Items — numbers of record from docs/MVP/02_Economy_And_Currencies.md §6.2.
 *
 * Rulings applied:
 *   R1: the livestock category is DIPHOLOGOLO.
 *   R2: brick is Setena.
 *   R3: the `Special` category is DROPPED. Rare finds are Field Journal Discoveries,
 *       never inventory items.
 *   F15: tools are equipment. They never occupy a storage slot.
 *
 * 03 §2.1 — every item states its use in one line. A name and a number is not
 * enough for a player who may be semi-literate in English. That line is `use`.
 */

export const ITEM_CATEGORIES = [
  'DIPEO', // Seeds
  'DIJALO', // Crops
  'DIPHOLOGOLO', // Livestock products (R1)
  'DITSHIMOLOGO TSA NAGENG', // Bushveld materials
  'DITSALO', // Crafted building materials
  'DIKUNO', // Processed goods
  'DIDIRISIWA', // Tools — equipment, not inventory (F15)
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface ItemDef {
  slug: string;
  /** Setswana name — shown first. */
  setswana: string;
  name: string;
  category: ItemCategory;
  maxStack: number;
  baseValue: number;
  /** One-line statement of what it is FOR (03 §2.1). */
  use: string;
  isTool: boolean;
  sprite: string;
}

const seed = (id: string, setswana: string, value: number): ItemDef => ({
  slug: `${id}_seed`,
  setswana: `Peo ya ${setswana}`,
  name: `${setswana} Seed`,
  category: 'DIPEO',
  maxStack: 99,
  baseValue: value,
  use: 'Go jala. For planting.',
  isTool: false,
  sprite: `ui/items/seed_${id}.png`,
});

const crop = (id: string, name: string, setswana: string, value: number): ItemDef => ({
  slug: id,
  setswana,
  name,
  category: 'DIJALO',
  maxStack: 50,
  baseValue: value,
  use: 'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.',
  isTool: false,
  sprite: `ui/items/product_${id}.png`,
});

export const ITEMS: Record<string, ItemDef> = {
  /* ---------------- Crops (02 §6.2) ---------------- */
  ...Object.fromEntries(
    (
      [
        ['sorghum', 'Sorghum', 'Mabele', 3],
        ['millet', 'Millet', 'Lebelebele', 4],
        ['maize', 'Maize', 'Mmidi', 5],
        ['cowpeas', 'Cowpeas', 'Dinawa', 6],
        ['tomatoes', 'Tomatoes', 'Tamati', 10],
        ['watermelon', 'Watermelon', 'Legapu', 11],
        ['groundnuts', 'Groundnuts', 'Manoko', 11],
        ['sesame', 'Sesame', 'Sesame', 15],
        ['pepper', 'Pepper', 'Pepere', 17],
        ['herbs', 'Herbs', 'Ditlhare tsa Setso', 25],
        ['morula', 'Morula', 'Morula', 46],
      ] as const
    ).map(([id, name, setswana, value]) => [id, crop(id, name, setswana, value)]),
  ),

  /* ---------------- Seeds: base value = the crop's seed cost (02 §6.2) ---- */
  ...Object.fromEntries(
    (
      [
        ['sorghum', 'Mabele', 2],
        ['millet', 'Lebelebele', 2],
        ['maize', 'Mmidi', 3],
        ['cowpeas', 'Dinawa', 3],
        ['tomatoes', 'Tamati', 5],
        ['watermelon', 'Legapu', 6],
        ['groundnuts', 'Manoko', 8],
        ['sesame', 'Sesame', 10],
        ['pepper', 'Pepere', 12],
        ['herbs', 'Herbs', 16],
        ['morula', 'Morula', 28],
      ] as const
    ).map(([id, setswana, value]) => [`${id}_seed`, seed(id, setswana, value)]),
  ),

  /* ---------------- Livestock products ---------------- */
  eggs: {
    slug: 'eggs',
    setswana: 'Mae',
    name: 'Eggs',
    category: 'DIPHOLOGOLO',
    maxStack: 30,
    baseValue: 3,
    use: 'Go rekisa kgotsa go baka. Sell, or bake into bread.',
    isTool: false,
    sprite: 'ui/items/product_egg.png',
  },
  milk: {
    slug: 'milk',
    setswana: 'Mashi',
    name: 'Milk',
    category: 'DIPHOLOGOLO',
    maxStack: 30,
    baseValue: 5,
    use: 'Go rekisa. Sell at the Co-op.',
    isTool: false,
    sprite: 'ui/items/product_milk.png',
  },
  manure: {
    slug: 'manure',
    setswana: 'Manyoro',
    name: 'Manure',
    category: 'DIPHOLOGOLO',
    maxStack: 30,
    baseValue: 1,
    use: 'Go nontsha tshimo. Enriches the soil.',
    isTool: false,
    sprite: 'ui/items/material_manyoro.png',
  },

  /* ---------------- Bushveld materials ---------------- */
  wood: {
    slug: 'wood',
    setswana: 'Dikgong',
    name: 'Wood',
    category: 'DITSHIMOLOGO TSA NAGENG',
    maxStack: 50,
    baseValue: 2,
    use: 'Go dira Poleto. For planks.',
    isTool: false,
    sprite: 'ui/items/material_wood.png',
  },
  stone: {
    slug: 'stone',
    setswana: 'Matlapa',
    name: 'Stone',
    category: 'DITSHIMOLOGO TSA NAGENG',
    maxStack: 50,
    baseValue: 3,
    use: 'Go dira Setena. For bricks — two clay, or clay and stone (F8).',
    isTool: false,
    sprite: 'ui/items/material_stone.png',
  },
  clay: {
    slug: 'clay',
    setswana: 'Letsopa',
    name: 'Clay',
    category: 'DITSHIMOLOGO TSA NAGENG',
    maxStack: 50,
    baseValue: 3,
    use: 'Go dira Setena. For bricks.',
    isTool: false,
    sprite: 'ui/items/material_letsopa.png',
  },
  palm_fiber: {
    slug: 'palm_fiber',
    setswana: 'Mokolwane',
    name: 'Palm Fiber',
    category: 'DITSHIMOLOGO TSA NAGENG',
    maxStack: 50,
    baseValue: 4,
    use: 'Go dira Thapo. For rope.',
    isTool: false,
    sprite: 'ui/items/material_mokolwane.png',
  },
  thatch: {
    slug: 'thatch',
    setswana: 'Lotlhaka',
    name: 'Thatch / Reeds',
    category: 'DITSHIMOLOGO TSA NAGENG',
    maxStack: 50,
    baseValue: 3,
    use: 'Go tlhabolola matlo. For re-ratching roofs.',
    isTool: false,
    sprite: 'ui/items/material_lotlhaka.png',
  },
  phane: {
    slug: 'phane',
    setswana: 'Phane',
    name: 'Mophane Worms',
    category: 'DITSHIMOLOGO TSA NAGENG',
    maxStack: 50,
    baseValue: 10,
    use: 'Go rekisa. A seasonal delicacy — only in Moranang and Sedimonthole.',
    isTool: false,
    sprite: 'ui/items/material_phane.png',
  },

  /* ---------------- Crafted (02 §6.3) ---------------- */
  poleto: {
    slug: 'poleto',
    setswana: 'Poleto',
    name: 'Plank',
    category: 'DITSALO',
    maxStack: 99,
    baseValue: 7,
    use: 'Go aga. Building material.',
    isTool: false,
    sprite: 'ui/items/product_poleto.png',
  },
  thapo: {
    slug: 'thapo',
    setswana: 'Thapo',
    name: 'Rope',
    category: 'DITSALO',
    maxStack: 99,
    baseValue: 18,
    use: 'Go aga le go baakanya. Building and kraal repair.',
    isTool: false,
    sprite: 'ui/items/product_thapo.png',
  },
  setena: {
    slug: 'setena',
    setswana: 'Setena',
    name: 'Brick',
    category: 'DITSALO',
    maxStack: 99,
    baseValue: 11,
    use: 'Go aga. Building material (R2 — Setena, not Setene).',
    isTool: false,
    sprite: 'ui/items/product_setena.png',
  },
  bupi: {
    slug: 'bupi',
    setswana: 'Bupi',
    name: 'Flour',
    category: 'DIKUNO',
    maxStack: 20,
    baseValue: 20,
    use: 'Go baka Borotho. For bread.',
    isTool: false,
    sprite: 'ui/items/product_bupi.png',
  },
  borotho: {
    slug: 'borotho',
    setswana: 'Borotho',
    name: 'Bread',
    category: 'DIKUNO',
    maxStack: 20,
    baseValue: 60,
    use: 'Go rekisa. The most valuable thing you can make.',
    isTool: false,
    sprite: 'ui/items/product_borotho.png',
  },

  /* ---------------- Tools / equipment (F15 — no storage slot) ---------------- */
  mogoma: {
    slug: 'mogoma',
    setswana: 'Mogoma',
    name: 'Hoe',
    category: 'DIDIRISIWA',
    maxStack: 1,
    baseValue: 0,
    use: 'Go lema. For working the soil.',
    isTool: true,
    sprite: 'ui/items/tool_hoe.png',
  },
  selepe: {
    slug: 'selepe',
    setswana: 'Selepe',
    name: 'Axe',
    category: 'DIDIRISIWA',
    maxStack: 1,
    baseValue: 0,
    use: 'Go rema. For cutting wood.',
    isTool: true,
    sprite: 'ui/items/tool_pickaxe.png',
  },
  watering_can: {
    slug: 'watering_can',
    setswana: 'Nkgo ya Metsi',
    name: 'Watering Can',
    category: 'DIDIRISIWA',
    maxStack: 1,
    baseValue: 0,
    use: 'Go nosetsa. For watering crops.',
    isTool: true,
    sprite: 'ui/items/tool_watering_can.png',
  },
  pickaxe: {
    slug: 'pickaxe',
    setswana: 'Piki',
    name: 'Pickaxe',
    category: 'DIDIRISIWA',
    maxStack: 1,
    baseValue: 0,
    use: 'Go epa. For breaking stone.',
    isTool: true,
    sprite: 'ui/items/tool_pickaxe.png',
  },
};

export const TOOL_SLUGS = Object.values(ITEMS)
  .filter((i) => i.isTool)
  .map((i) => i.slug);

export function getItemDef(slug: string): ItemDef | undefined {
  return ITEMS[slug];
}

/**
 * 03 §2.1 — group the inventory by what you DO with it, not by taxonomy.
 * "Plant · Sell · Craft · Build" beats all-caps Setswana category headers for a
 * semi-literate player. The Setswana stays on the item; the grouping is functional.
 */
export type IntentGroup = 'plant' | 'sell' | 'craft' | 'build' | 'equipment';

export function intentGroup(item: ItemDef): IntentGroup {
  if (item.isTool) return 'equipment';
  switch (item.category) {
    case 'DIPEO':
      return 'plant';
    case 'DITSALO':
      return 'build';
    case 'DITSHIMOLOGO TSA NAGENG':
    case 'DIKUNO':
      return 'craft';
    default:
      return 'sell';
  }
}

export const INTENT_GROUP_LABELS: Record<IntentGroup, { en: string; tn: string }> = {
  plant: { en: 'Plant', tn: 'Go jala' },
  sell: { en: 'Sell', tn: 'Go rekisa' },
  craft: { en: 'Craft', tn: 'Go dira' },
  build: { en: 'Build', tn: 'Go aga' },
  equipment: { en: 'Equipment', tn: 'Didiriswa' },
};
