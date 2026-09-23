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
  /**
   * Elder-voiced lore line (docs/MOLEMISI_Field_Journal_Narrative_Voice_v1).
   * Optional, collapsed content on the Item Detail card — no mechanics talk,
   * no prices, no counts. Voice matches the crop descriptions and Mogolo's journal.
   */
  lore: string;
  isTool: boolean;
  sprite: string;
}

const seed = (id: string, setswana: string, value: number): Omit<ItemDef, 'lore'> => ({
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

const crop = (id: string, name: string, setswana: string, value: number): Omit<ItemDef, 'lore'> => ({
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

const RAW_ITEMS: Record<string, Omit<ItemDef, 'lore'>> = {
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
    baseValue: 5,
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
    baseValue: 15,
    use: 'Go rekisa. Sell at the Co-op.',
    isTool: false,
    sprite: 'ui/items/product_milk.png',
  },
  // G3 — eggs/milk prices ARE the AnimalConfig prices of record (P5/P15); the
  // duplicated AnimalConfig.baseProductPrice is deleted so this stays the only
  // source. G2 — the pig's truffle finally exists (P50/48 h as always intended).
  truffle: {
    slug: 'truffle',
    setswana: 'Truffle ya Naga',
    name: 'Truffle',
    category: 'DIPHOLOGOLO',
    maxStack: 30,
    baseValue: 50,
    use: 'Go rekisa. Sell at the Co-op — chefs pay well for it.',
    isTool: false,
    sprite: 'ui/items/product_truffle.png',
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
  // G5 — the Deep Bushveld's signature find (Botho ≥ 300). No recipe or
  // building consumes it yet; like phane it is a sellable material whose value
  // rewards the late-game scene only it grows in.
  hardwood: {
    slug: 'hardwood',
    setswana: 'Dikgong tse Diropa',
    name: 'Hardwood',
    category: 'DITSHIMOLOGO TSA NAGENG',
    maxStack: 50,
    baseValue: 8,
    use: 'Go rekisa. Dense deep-bush timber — the Co-op pays well.',
    isTool: false,
    // No dedicated art yet — reuses the wood icon until the manifest gains one.
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

/* ---------------------------------------------------------------------------
 * Lore — one elder-voiced line per item, keyed by slug.
 *
 * Content is data: every line lives here, not in a component. Voice rules from
 * docs/MOLEMISI_Field_Journal_Narrative_Voice_v1 — Botswana-rooted, spoken by
 * someone who has farmed this land, and NEVER about mechanics, prices or counts.
 * itemRelations.spec.ts asserts every item carries one.
 * ------------------------------------------------------------------------- */
const ITEM_LORE: Record<string, string> = {
  /* Crops */
  sorghum: 'Mabele fed this land before anyone thought to count a harvest. Mogolo says a field of sorghum is a promise kept.',
  millet: 'Lebelebele asks little and gives even when the rains fail. The old people planted it where nothing else would stand.',
  maize: 'Mmidi came from far away and made itself at home. A cob that fills the hand is worth the wait.',
  cowpeas: 'Dinawa feed the soil while they feed the pot. A wise field is never without them.',
  tomatoes: 'Tamati ripens all at once, like news in a small village. Carry it gently — it bruises like pride.',
  watermelon: 'A legapu cooled in the shade is the bushveld’s own answer to a hard afternoon.',
  groundnuts: 'Manoko hide their harvest underground. You only learn what you grew when you dig.',
  sesame: 'Sesame is small, but the traders count it like coins. Small things, kept well, add up.',
  pepper: 'Pepere bites back, and the cook loves it for that. A little heat wakes the whole pot.',
  herbs: 'The old remedies grow quietly along the fence lines. The bush keeps a pharmacy for those who ask politely.',
  morula: 'The morula belongs to no one until the fruit falls — and then it belongs to everyone. Even the elephants know.',

  /* Seeds */
  sorghum_seed: 'A handful of mabele seed is a whole field waiting to happen. Keep it dry and it will keep you.',
  millet_seed: 'Lebelebele seed is patient. It waits out the dry season the way the old people do — without complaint.',
  maize_seed: 'Plant mmidi when the rain promises, not when it arrives. Mogolo trusts the thunder more than the cloud.',
  cowpeas_seed: 'Dinawa seed costs little and forgives much. Good seed for a learning hand.',
  tomatoes_seed: 'Tamati seed is greedy for sun and water both. Give generously and it fills the basket.',
  watermelon_seed: 'Every legapu seed carries a whole sweet water inside its promise.',
  groundnuts_seed: 'Bury manoko shallow and walk away. They do their best work unseen.',
  sesame_seed: 'Sesame is sown thin and threshed gently. Some harvests are won with the fingertips, not the arms.',
  pepper_seed: 'Pepere seed sleeps late. Do not dig it up to check — Mogolo tried that once.',
  herbs_seed: 'Seed of the healing plants is sown with respect, or not at all.',
  morula_seed: 'A morula seed is a gift to someone not yet born. Plant it anyway.',

  /* Livestock products */
  eggs: 'A warm egg in the morning means the kraal is content. Mogolo counts eggs the way others count blessings.',
  milk: 'Mashi left to sit becomes maas, and maas keeps when milk cannot. The cow gives; patience decides.',
  manure: 'Manyoro is not waste. It is next year’s harvest wearing rough clothes.',
  truffle: 'The pig smells what the eye cannot see. A truffle is the bush keeping a secret for the patient.',

  /* Bushveld materials */
  wood: 'Dry dikgong from a deadfall, taken without hurting a living tree. The bush provides for those who look down.',
  hardwood: 'Heartwood does not hurry. A tree stood a hundred seasons to carry this weight, and the grain remembers every dry year it survived.',
  stone: 'The granite here is older than any story. It does not mind becoming a wall.',
  clay: 'The riverbank gives up letsopa where the water bends. Good clay remembers the river in every brick.',
  palm_fiber: 'Mokolwane twists into rope the way small words twist into news — strand by strand.',
  thatch: 'Lotlhaka from the reeds keeps a roof cool in the dry months and tight in the wet. Cut it cleanly; it grows back.',
  phane: 'Phane come with the rains and leave without saying goodbye. A worm season is a good year.',

  /* Crafted */
  poleto: 'A straight poleto is sawn twice — once with the eye, once with the blade.',
  thapo: 'Thapo holds the kraal together. Rope, like trust, is made by twisting many small fibres.',
  setena: 'A setena is river clay taught to hold a shape. Fire finishes the lesson.',
  bupi: 'Bupi is grain that has been persuaded. Between two stones, it gives up its secret.',
  borotho: 'Borotho fresh from the fire gathers people the way shade gathers cattle at noon.',

  /* Tools */
  mogoma: 'The mogoma is the first tool taken up and the last one put down. The handle learns the hand.',
  selepe: 'Selepe cuts what is dead so the living can grow. Sharpen it before the work, not during it.',
  watering_can: 'A nkgo ya metsi carries the river to the root, one careful pour at a time.',
  pickaxe: 'The piki argues with granite and usually wins. Stubbornness, aimed well, is a virtue.',
};

/** The catalogue: raw facts plus the lore line for that slug. */
export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  Object.entries(RAW_ITEMS).map(([key, def]) => [key, { ...def, lore: ITEM_LORE[key] ?? '' }]),
);

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
