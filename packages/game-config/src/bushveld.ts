/**
 * The Bushveld — scenes, hotspots, loot tables and the Field Journal.
 * Source: docs/MVP/04_Bushveld.md.
 *
 * The Bushveld is explicitly NOT a second farm (04 §1). If gathering out-earns the
 * fields, the craft chain inverts and the whole economy tips. The Kagiso scarcity
 * model exists primarily to guarantee that cannot happen.
 *
 * Content is DATA, not code (principle 6, 01 §4). Adding a find must not require a
 * deploy of application logic.
 */

/* ============================================================ Scarcity */
/**
 * 04 §4.2 — Kagiso (*peace, stillness*). The bush gives when it is settled.
 * Disturb it and it goes quiet. You cannot hurry it — you can only come back.
 *
 * Respawn timers could not work here: every old band was shorter than a day, so a
 * daily player found every hotspot ready, every time (C17).
 */
export const KAGISO = {
  max: 6,
  /** +1 per 4 hours — 6 per day, full settle in 24 h. Tuning range 180–480 min. */
  regenMinutes: 240,
  /** A new scene starts settled. */
  startingValue: 6,
  /** Per-hotspot rest, independent of Kagiso, so one hotspot can't be drained in a visit. */
  restMinutes: 60,
  /** Cost bands: common / material = 1, uncommon / rare / seasonal = 2. */
  costCommon: 1,
  costPremium: 2,
  materialYield: { min: 2, max: 4 },
} as const;

/** Rarity weights scale with Kagiso, so rarity is a decision rather than a dice roll. */
export const RARITY_WEIGHT_BY_KAGISO: Record<string, { common: number; uncommon: number; rare: number }> = {
  high: { common: 1, uncommon: 1, rare: 2 }, // Kagiso >= 5
  mid: { common: 1, uncommon: 1, rare: 1 }, // Kagiso 3–4
  low: { common: 1.5, uncommon: 1, rare: 0.5 }, // Kagiso 1–2
};

export function rarityWeights(kagiso: number) {
  if (kagiso >= 5) return RARITY_WEIGHT_BY_KAGISO.high!;
  if (kagiso >= 3) return RARITY_WEIGHT_BY_KAGISO.mid!;
  return RARITY_WEIGHT_BY_KAGISO.low!;
}

/* ============================================================ Scenes */
export type SceneSlug = 'open_bush' | 'riverbank' | 'rocky_outcrop' | 'deep_bushveld';

export interface BushveldScene {
  slug: SceneSlug;
  name: string;
  setswana: string;
  /** Botho >= 300 for Deep Bushveld (04 §5). null = from the start. */
  unlock: { bothoGte: number } | null;
  /** Restoration art swaps at these fractions of the scene's finds (04 §7.2). */
  restorationThresholds: number[];
  /** One background per stage: degraded, partial, recovered, full. */
  restorationAssets: string[];
  blurb: string;
}

export const SCENES: BushveldScene[] = [
  {
    slug: 'open_bush',
    name: 'Open Bush',
    setswana: 'Naga e Bulegileng',
    unlock: null,
    restorationThresholds: [0.4, 0.7, 1.0],
    restorationAssets: [
      'backgrounds/open_bush_stage_0.png',
      'backgrounds/open_bush_stage_1.png',
      'backgrounds/open_bush_stage_2.png',
      'backgrounds/open_bush_stage_3.png',
    ],
    blurb: 'Pale sand, thorn trees, and the tracks of everything that passed in the night.',
  },
  {
    slug: 'riverbank',
    name: 'Riverbank',
    setswana: 'Fa Nokeng',
    unlock: null,
    restorationThresholds: [0.4, 0.7, 1.0],
    restorationAssets: [
      'backgrounds/riverbank_stage_0.png',
      'backgrounds/riverbank_stage_1.png',
      'backgrounds/riverbank_stage_2.png',
      'backgrounds/riverbank_stage_3.png',
    ],
    blurb:
      'The economic heart of the Bushveld. Clay and palm fiber feed Setena and Thapo, and Thapo is the best profit per slot-hour in the craft chain.',
  },
  {
    slug: 'rocky_outcrop',
    name: 'Rocky Outcrop',
    setswana: 'Matlapa a Kwa Godimo',
    unlock: null,
    restorationThresholds: [0.4, 0.7, 1.0],
    restorationAssets: [
      'backgrounds/rocky_outcrop_stage_0.png',
      'backgrounds/rocky_outcrop_stage_1.png',
      'backgrounds/rocky_outcrop_stage_2.png',
      'backgrounds/rocky_outcrop_stage_3.png',
    ],
    blurb: 'Granite that remembers more than the trees do. Stone for bricks, and things that watch from above.',
  },
  {
    slug: 'deep_bushveld',
    name: 'Deep Bushveld',
    setswana: 'Botho jwa Naga',
    unlock: { bothoGte: 300 },
    restorationThresholds: [0.4, 0.7, 1.0],
    restorationAssets: [],
    blurb: 'Not yet. Earn Botho 300 and the way in opens.',
  },
];

export function getScene(slug: string): BushveldScene | undefined {
  return SCENES.find((s) => s.slug === slug);
}

/** 04 §7.2 — three milestones: 40% / 70% / 100% of a scene's finds. */
export function restorationStage(found: number, total: number): number {
  if (total <= 0) return 0;
  const pct = found / total;
  if (pct >= 1) return 3;
  if (pct >= 0.7) return 2;
  if (pct >= 0.4) return 1;
  return 0;
}

/* ============================================================ Loot */
export type Rarity = 'common' | 'uncommon' | 'rare';

export interface LootEntry {
  /** Inventory item slug — null when the find is a Discovery only (R3). */
  item?: string;
  /** Field Journal discovery slug. */
  discovery: string;
  /** English + Setswana names, for the Journal page. */
  name: string;
  setswana: string;
  rarity: Rarity;
  weight: number;
  qty?: { min: number; max: number };
  /** Mogolo's line — written in one voice (04 §6). */
  journal: string;
}

export interface HotspotDef {
  id: string;
  scene: SceneSlug;
  /** The visual cue the player taps. */
  tell: string;
  /** Position within the scene, as a percentage (0–100). */
  x: number;
  y: number;
  sprite: string;
  /** 1 for common / material, 2 for uncommon / rare / seasonal (04 §4.2). */
  kagisoCost: number;
  loot: LootEntry[];
  /** Seasonal override: real-world months (04 §9.3). */
  activeMonths?: number[];
  seasonalLoot?: LootEntry[];
}

/* ------------------------- Open Bush — Naga e Bulegileng ------------------------- */
const OPEN_BUSH: HotspotDef[] = [
  {
    id: 'ob_deadfall',
    scene: 'open_bush',
    tell: 'Deadfall',
    x: 24,
    y: 62,
    sprite: 'sprites/hotspots/open_bush_deadfall.png',
    kagisoCost: 1,
    loot: [
      {
        item: 'wood',
        discovery: 'dikgong',
        name: 'Wood',
        setswana: 'Dikgong',
        rarity: 'common',
        weight: 10,
        qty: { min: 2, max: 4 },
        journal:
          'Good, dry wood. Mogolo doesn’t waste words on this one — you’ll be collecting a lot of it.',
      },
    ],
  },
  {
    // 04 §9.3 — Setlhare sa Phane. Ordinary wood for ten months, phane-weighted in
    // Moranang (April) and Sedimonthole (December). Decoupled from the chapter clock.
    id: 'ob_setlhare_sa_phane',
    scene: 'open_bush',
    tell: 'Stripped deadfall',
    x: 68,
    y: 48,
    sprite: 'sprites/hotspots/open_bush_deadfall.png',
    kagisoCost: 2,
    activeMonths: [4, 12],
    loot: [
      {
        item: 'wood',
        discovery: 'dikgong',
        name: 'Wood',
        setswana: 'Dikgong',
        rarity: 'common',
        weight: 10,
        qty: { min: 2, max: 4 },
        journal:
          'Good, dry wood. Mogolo doesn’t waste words on this one — you’ll be collecting a lot of it.',
      },
    ],
    seasonalLoot: [
      {
        item: 'phane',
        discovery: 'phane',
        name: 'Mophane Worms',
        setswana: 'Phane',
        rarity: 'rare',
        weight: 6,
        qty: { min: 2, max: 4 },
        journal:
          'The branch is stripped bare, and something has been busy. Mogolo’s face changes — this is the one they’ve been waiting all year to see again.',
      },
      {
        item: 'wood',
        discovery: 'dikgong',
        name: 'Wood',
        setswana: 'Dikgong',
        rarity: 'common',
        weight: 4,
        qty: { min: 2, max: 4 },
        journal:
          'Good, dry wood. Mogolo doesn’t waste words on this one — you’ll be collecting a lot of it.',
      },
    ],
  },
  {
    id: 'ob_tracks',
    scene: 'open_bush',
    tell: 'Tracks in the sand',
    x: 42,
    y: 78,
    sprite: 'sprites/hotspots/open_bush_tracks.png',
    kagisoCost: 1,
    loot: [
      {
        discovery: 'tholo',
        name: 'Kudu',
        setswana: 'Tholo',
        rarity: 'common',
        weight: 6,
        journal:
          'Deep, heart-shaped prints pressed into the sand. Mogolo says a kudu never hurries at dawn — it already knows where it’s going.',
      },
      {
        discovery: 'phuduhudu',
        name: 'Steenbok',
        setswana: 'Phuduhudu',
        rarity: 'common',
        weight: 6,
        journal:
          'Small, neat prints, close together. Mogolo calls the steenbok the smallest worry in the bush, and the easiest to miss entirely.',
      },
    ],
  },
  {
    id: 'ob_tracks_heavy',
    scene: 'open_bush',
    tell: 'Torn earth',
    x: 80,
    y: 70,
    sprite: 'sprites/hotspots/open_bush_tracks.png',
    kagisoCost: 2,
    loot: [
      {
        discovery: 'kolobe',
        name: 'Warthog',
        setswana: 'Kolobe',
        rarity: 'uncommon',
        weight: 5,
        journal:
          'Blunt prints, dragged at the toe. Mogolo laughs every time — something so low to the ground has no business being that loud.',
      },
      {
        discovery: 'magogwe',
        name: 'Honey Badger',
        setswana: 'Magogwe',
        rarity: 'rare',
        weight: 2,
        journal:
          'Torn earth and a raided nest. Mogolo goes quiet here — you do not want to meet the one who did this.',
      },
    ],
  },
  {
    id: 'ob_feather',
    scene: 'open_bush',
    tell: 'Feather in the grass',
    x: 56,
    y: 34,
    sprite: 'sprites/hotspots/open_bush_feather.png',
    kagisoCost: 1,
    loot: [
      {
        discovery: 'kgaka',
        name: 'Guinea Fowl',
        setswana: 'Kgaka',
        rarity: 'common',
        weight: 10,
        journal:
          'A speckled feather caught in the thorn grass. Mogolo says where you find one guinea fowl, six more are already watching you from somewhere close.',
      },
    ],
  },
  {
    id: 'ob_feather_dark',
    scene: 'open_bush',
    tell: 'A dark feather drifting',
    x: 16,
    y: 28,
    sprite: 'sprites/hotspots/open_bush_feather.png',
    kagisoCost: 2,
    loot: [
      {
        discovery: 'manong',
        name: 'Vulture',
        setswana: 'Manong',
        rarity: 'rare',
        weight: 3,
        journal:
          'A long, dark feather drifts down from nowhere you can see. Mogolo tips his head back — something died near here, and something else already knows it.',
      },
    ],
  },
];

/* ------------------------- Riverbank — Fa Nokeng ------------------------- */
const RIVERBANK: HotspotDef[] = [
  {
    id: 'rv_clay',
    scene: 'riverbank',
    tell: 'Exposed clay',
    x: 30,
    y: 66,
    sprite: 'sprites/hotspots/riverbank_clay.png',
    kagisoCost: 1,
    loot: [
      {
        item: 'clay',
        discovery: 'letsopa',
        name: 'Clay',
        setswana: 'Letsopa',
        rarity: 'common',
        weight: 10,
        qty: { min: 2, max: 4 },
        journal:
          'Cool, heavy clay from the riverbank. Good for building. Better, Mogolo says, for teaching patience.',
      },
    ],
  },
  {
    id: 'rv_palm',
    scene: 'riverbank',
    tell: 'Fallen palm frond',
    x: 62,
    y: 44,
    sprite: 'sprites/hotspots/riverbank_palm.png',
    kagisoCost: 1,
    loot: [
      {
        item: 'palm_fiber',
        discovery: 'mokolwane',
        name: 'Palm Fiber',
        setswana: 'Mokolwane',
        rarity: 'common',
        weight: 10,
        qty: { min: 2, max: 4 },
        journal:
          'Tough palm fronds, ready to be worked. The baskets sold at the Kgotla market all start exactly here.',
      },
    ],
  },
  {
    id: 'rv_reeds',
    scene: 'riverbank',
    tell: 'Reed bed',
    x: 78,
    y: 74,
    sprite: 'sprites/hotspots/riverbank_reeds.png',
    kagisoCost: 1,
    loot: [
      {
        item: 'thatch',
        discovery: 'lotlhaka',
        name: 'Thatch / Reeds',
        setswana: 'Lotlhaka',
        rarity: 'common',
        weight: 10,
        qty: { min: 2, max: 4 },
        journal: 'Reeds cut green bend; cut dry they hold. Mogolo says the same is true of people.',
      },
    ],
  },
  {
    // G7 — wood's second home. Every plank used to come from Open Bush alone;
    // the river lays its own deadfall along the bank after the floods.
    id: 'rv_driftwood',
    scene: 'riverbank',
    tell: 'Driftwood on the bank',
    x: 10,
    y: 70,
    sprite: 'sprites/hotspots/open_bush_deadfall.png',
    kagisoCost: 1,
    loot: [
      {
        item: 'wood',
        discovery: 'driftwood',
        name: 'Wood',
        setswana: 'Dikgong',
        rarity: 'common',
        weight: 8,
        qty: { min: 2, max: 4 },
        journal:
          'The river gives back what the bank gives up in the floods. Pale, dry driftwood — good dikgong that never hurt a living tree.',
      },
    ],
  },
  {
    id: 'rv_ripple',
    scene: 'riverbank',
    tell: 'A ripple near the bank',
    x: 46,
    y: 82,
    sprite: 'sprites/hotspots/riverbank_ripple.png',
    kagisoCost: 1,
    loot: [
      {
        discovery: 'catfish',
        name: 'Catfish',
        setswana: 'Thobolo',
        rarity: 'common',
        weight: 10,
        journal:
          'The water folds over itself once, near the bank, and goes still again. Mogolo says a catfish sees you long before you ever see it.',
      },
    ],
  },
  {
    id: 'rv_ripple_bright',
    scene: 'riverbank',
    tell: 'A flash of blue',
    x: 20,
    y: 52,
    sprite: 'sprites/hotspots/riverbank_ripple.png',
    kagisoCost: 2,
    loot: [
      {
        discovery: 'kingfisher',
        name: 'Kingfisher',
        setswana: 'Sebatanyane sa Noka',
        rarity: 'uncommon',
        weight: 5,
        journal:
          'A flash of blue drops into the water and comes up with something silver. Mogolo says blink at the wrong moment and you’ve missed the whole hunt.',
      },
      {
        discovery: 'otter',
        name: 'Otter',
        setswana: 'Ntswi',
        rarity: 'rare',
        weight: 2,
        journal:
          'A smooth, wet groove runs down the bank, still glistening. Mogolo grins at this one — whatever made it was clearly enjoying itself.',
      },
    ],
  },
  {
    id: 'rv_mud_tracks',
    scene: 'riverbank',
    tell: 'Prints at the water’s edge',
    x: 68,
    y: 88,
    sprite: 'sprites/hotspots/riverbank_mud_tracks.png',
    kagisoCost: 2,
    loot: [
      {
        discovery: 'waterbuck',
        name: 'Waterbuck',
        setswana: 'Phofu',
        rarity: 'uncommon',
        weight: 5,
        journal:
          'Broad, splayed prints sunk deep at the water’s edge. Mogolo says the waterbuck never strays far from the river — it trusts nothing else to save it.',
      },
      {
        discovery: 'heron',
        name: 'Heron',
        setswana: 'Legodi',
        rarity: 'uncommon',
        weight: 5,
        journal:
          'Thin, careful prints, spaced with patience. Mogolo says the heron holds still better than most men manage at anything.',
      },
      {
        discovery: 'kwena',
        name: 'Crocodile',
        setswana: 'Kwena',
        rarity: 'rare',
        weight: 2,
        journal:
          'A wide groove drags down into the water and does not come back up the bank. Mogolo goes still, and so should you.',
      },
    ],
  },
  {
    id: 'rv_morula',
    scene: 'riverbank',
    tell: 'Fruit beneath the branches',
    x: 86,
    y: 30,
    sprite: 'sprites/hotspots/riverbank_morula_tree.png',
    kagisoCost: 2,
    loot: [
      {
        discovery: 'morula_tree',
        name: 'Marula tree',
        setswana: 'Morula',
        rarity: 'uncommon',
        weight: 5,
        journal:
          'Yellow fruit litters the ground beneath the branches. Mogolo says even the elephants know when marula season starts before the people do.',
      },
    ],
  },
];

/* ------------------------- Rocky Outcrop — Matlapa ------------------------- */
const ROCKY: HotspotDef[] = [
  {
    id: 'ro_glint',
    scene: 'rocky_outcrop',
    tell: 'Stone among the rocks',
    x: 34,
    y: 70,
    sprite: 'sprites/hotspots/rocky_outcrop_glint.png',
    kagisoCost: 1,
    loot: [
      {
        item: 'stone',
        discovery: 'matlapa',
        name: 'Stone',
        setswana: 'Matlapa',
        rarity: 'common',
        weight: 10,
        qty: { min: 2, max: 4 },
        journal:
          'Plain stone, but there’s plenty of it. Mogolo says the rocks remember more than the trees do — they just don’t talk about it.',
      },
    ],
  },
  {
    id: 'ro_quartz',
    scene: 'rocky_outcrop',
    tell: 'Something catching the light',
    x: 72,
    y: 40,
    sprite: 'sprites/hotspots/rocky_outcrop_glint.png',
    kagisoCost: 2,
    loot: [
      // R3 — Quartz Shard is a Discovery with no item. That is correct; it is the
      // restoration payoff, not loot (G6).
      {
        discovery: 'quartz_shard',
        name: 'Quartz Shard',
        setswana: 'Letlapa le le Tshetlhang',
        rarity: 'rare',
        weight: 3,
        journal:
          'A piece of stone catches the light wrong — too clean, too bright for ordinary rock. Mogolo turns it over twice before he says anything at all.',
      },
    ],
  },
  {
    id: 'ro_crevice',
    scene: 'rocky_outcrop',
    tell: 'Droppings in a crack',
    x: 22,
    y: 44,
    sprite: 'sprites/hotspots/rocky_outcrop_crevice.png',
    kagisoCost: 1,
    loot: [
      {
        discovery: 'pela',
        name: 'Rock Hyrax',
        setswana: 'Pela',
        rarity: 'common',
        weight: 6,
        journal:
          'Small droppings tucked into a crack in the stone. Mogolo says the pela never goes far from home — sensible, for something so small.',
      },
      {
        discovery: 'tshwene',
        name: 'Baboon',
        setswana: 'Tshwene',
        rarity: 'common',
        weight: 6,
        journal:
          'Scattered prints, in every direction at once. Mogolo shakes his head — a troop of baboons leaves a scene looking like an argument.',
      },
    ],
  },
  {
    id: 'ro_leopard',
    scene: 'rocky_outcrop',
    tell: 'A single clean print',
    x: 58,
    y: 84,
    sprite: 'sprites/hotspots/rocky_outcrop_crevice.png',
    kagisoCost: 2,
    loot: [
      {
        discovery: 'nkwe',
        name: 'Leopard',
        setswana: 'Nkwe',
        rarity: 'rare',
        weight: 3,
        journal:
          'A single clean print in the dust, and then nothing. Mogolo doesn’t say anything at all — some things you’re only meant to almost see.',
      },
    ],
  },
  {
    id: 'ro_perch',
    scene: 'rocky_outcrop',
    tell: 'A shape circling high',
    x: 82,
    y: 18,
    sprite: 'sprites/hotspots/rocky_outcrop_perch.png',
    kagisoCost: 2,
    loot: [
      {
        discovery: 'raptor',
        name: 'Raptor',
        setswana: 'Phakwe',
        rarity: 'uncommon',
        weight: 5,
        journal:
          'A shape circles once, high over the outcrop, and is gone. Mogolo doesn’t bother looking up — he says you only see them once they’ve already decided you’re not worth the trouble.',
      },
    ],
  },
  {
    id: 'ro_aloe',
    scene: 'rocky_outcrop',
    tell: 'Spiked leaves in a crack',
    x: 46,
    y: 58,
    sprite: 'sprites/hotspots/rocky_outcrop_aloe.png',
    kagisoCost: 1,
    loot: [
      {
        discovery: 'aloe',
        name: 'Aloe',
        setswana: 'Sekgophana',
        rarity: 'common',
        weight: 10,
        journal:
          'A cluster of thick, spiked leaves wedged into a crack in the stone. Mogolo says it survives on less water than seems fair to anything else out here.',
      },
    ],
  },
];

export const HOTSPOTS: HotspotDef[] = [...OPEN_BUSH, ...RIVERBANK, ...ROCKY];

/* Deep Bushveld — G5 (2026-09-23). This was zero hotspots ("ships post-MVP",
 * 04 §5); the scene now ships content the moment Botho 300 opens it, and
 * `hardwood` — the densest, most valuable timber in the game — grows nowhere
 * else. Scene background art is still pending (restorationAssets stays empty);
 * hotspots reuse existing sprites until it lands. */
export const DEEP_BUSHVELD_HOTSPOTS: HotspotDef[] = [
  {
    id: 'db_deadfall',
    scene: 'deep_bushveld',
    tell: 'A great deadfall',
    x: 24,
    y: 62,
    sprite: 'sprites/hotspots/open_bush_deadfall.png',
    kagisoCost: 1,
    loot: [
      {
        item: 'wood',
        discovery: 'deep_wood',
        name: 'Wood',
        setswana: 'Dikgong',
        rarity: 'common',
        weight: 8,
        qty: { min: 2, max: 4 },
        journal:
          'The old trees fall where they stood. Mogolo says the deep wood keeps its own weather — you hear the silence before you hear anything else.',
      },
      {
        item: 'hardwood',
        discovery: 'dikgong_tse_diropa',
        name: 'Hardwood',
        setswana: 'Dikgong tse Diropa',
        rarity: 'uncommon',
        weight: 6,
        qty: { min: 1, max: 3 },
        journal:
          'This is the wood that outlives the house built from it. Dense, dark, slow — the deep bush does not hurry, and neither did the tree.',
      },
    ],
  },
  {
    id: 'db_heartwood',
    scene: 'deep_bushveld',
    tell: 'An ancient heartwood stump',
    x: 60,
    y: 40,
    sprite: 'sprites/hotspots/open_bush_deadfall.png',
    kagisoCost: 1,
    loot: [
      {
        item: 'hardwood',
        discovery: 'Diropa',
        name: 'Hardwood',
        setswana: 'Dikgong tse Diropa',
        rarity: 'common',
        weight: 10,
        qty: { min: 1, max: 3 },
        journal:
          'A stump thick with rings, older than the fence lines. Mogolo rests a hand on it and says some things are simply still here, waiting for you to notice.',
      },
    ],
  },
  {
    id: 'db_kopje',
    scene: 'deep_bushveld',
    tell: 'A weathered kopje',
    x: 36,
    y: 72,
    sprite: 'sprites/hotspots/rocky_outcrop_glint.png',
    kagisoCost: 1,
    loot: [
      {
        item: 'stone',
        discovery: 'deep_granite',
        name: 'Stone',
        setswana: 'Matlapa',
        rarity: 'common',
        weight: 10,
        qty: { min: 2, max: 4 },
        journal:
          'Older than the stories told about it. The deep kopje has watched more seasons than any elder has years.',
      },
    ],
  },
  {
    id: 'db_spoor',
    scene: 'deep_bushveld',
    tell: 'A spoor in the dust',
    x: 78,
    y: 58,
    sprite: 'sprites/hotspots/open_bush_tracks.png',
    kagisoCost: 2,
    loot: [
      {
        discovery: 'deep_spoor',
        name: 'Leopard Spoor',
        setswana: 'Ditoto tsa Tau',
        rarity: 'rare',
        weight: 3,
        journal:
          'A track pressed deep into the dust, still soft at the edges. Whatever made it is close, and it already knows you are here.',
      },
    ],
  },
];

export function hotspotsForScene(scene: SceneSlug): HotspotDef[] {
  if (scene === 'deep_bushveld') return DEEP_BUSHVELD_HOTSPOTS;
  return HOTSPOTS.filter((h) => h.scene === scene);
}

export function getHotspot(id: string): HotspotDef | undefined {
  return HOTSPOTS.find((h) => h.id === id);
}

/** Every distinct find in a scene — the denominator for restoration progress. */
export function findsForScene(scene: SceneSlug): LootEntry[] {
  const seen = new Map<string, LootEntry>();
  for (const h of hotspotsForScene(scene)) {
    for (const e of [...h.loot, ...(h.seasonalLoot ?? [])]) {
      if (!seen.has(e.discovery)) seen.set(e.discovery, e);
    }
  }
  return [...seen.values()];
}

/** All journal lines in one place, keyed by discovery slug — for the Field Journal page. */
export const JOURNAL_LINES: Record<string, { name: string; setswana: string; journal: string }> =
  Object.fromEntries(
    HOTSPOTS.flatMap((h) => [...h.loot, ...(h.seasonalLoot ?? [])]).map((e) => [
      e.discovery,
      { name: e.name, setswana: e.setswana, journal: e.journal },
    ]),
  );

/* ============================================================ Daily Sparkle */
/**
 * 04 §8 — once per day, exactly ONE hotspot across all unlocked scenes carries a ✦
 * badge and a boosted loot table, for that day only. No claim button, no separate
 * screen: tapping it works like tapping any other. With Kagiso scarcity the Sparkle
 * finally does a job — it tells a player with 4 pips where to spend one of them.
 */
export const SPARKLE_RARE_WEIGHT_BONUS = 3;

/* ============================================================ Elder / proverbs */
/**
 * 04 §9.4 — one line from Mogolo, rotating daily. Setswana first, English gloss on tap.
 * Only the first is independently well-established; several are flagged low confidence
 * and the whole list needs a native-speaker pass before shipping as final copy.
 *
 * 03 §7 — the proverb should also RESPOND to what the player actually did, which is
 * the same rules-table machinery as the Elder's guidance.
 */
export interface Proverb {
  setswana: string;
  english: string;
  confidence: 'high' | 'medium' | 'low';
}
export const PROVERBS: Proverb[] = [
  { setswana: 'Motho ke motho ka batho', english: 'A person is a person because of other people', confidence: 'high' },
  { setswana: 'Kgosi ke kgosi ka batho', english: 'A chief is a chief because of the people', confidence: 'medium' },
  { setswana: 'Pula ke matshelo, ga e a tshaba', english: 'Rain is life; it should not be feared', confidence: 'medium' },
  { setswana: 'Pula e a na, ga e na noka', english: 'Rain falls, but there is no river', confidence: 'medium' },
  { setswana: 'Tsela e e telele e simolola ka kgato e le nngwe', english: 'A long road begins with a single step', confidence: 'medium' },
];

/* ============================================================ Reactive proverbs (03 §7) */
/**
 * 03 §7 — the proverb should also RESPOND to what the player actually did, using
 * the same rules-table idea as `ELDER_RULES`. An action maps to a `PROVERBS` index;
 * `selectReactiveProverb` returns the matching line, or null when the action has no
 * mapping. Mappings are provisional — the whole `PROVERBS` list is flagged
 * low-confidence and still needs a native-speaker Setswana pass before shipping.
 */
export type PlayerActionKind =
  | 'plant'
  | 'harvest'
  | 'water'
  | 'forage'
  | 'buy'
  | 'sell'
  | 'contribute'
  | 'build'
  | 'craft'
  | 'rest';

export const REACTIVE_PROVERBS: Partial<Record<PlayerActionKind, number>> = {
  plant: 4, // a long road begins with a single step
  harvest: 0, // a person is a person because of other people (reaping together)
  water: 2, // rain is life
  forage: 3, // rain falls, but there is no river (bushveld nature)
  buy: 1, // a chief is a chief because of the people
  sell: 1,
  contribute: 0, // community
  build: 4, // a beginning
  craft: 4,
  rest: 2, // rain is life (rest / renewal)
};

export function selectReactiveProverb(kind: PlayerActionKind | null | undefined): Proverb | null {
  if (!kind) return null;
  const idx = REACTIVE_PROVERBS[kind];
  if (idx == null) return null;
  return PROVERBS[idx] ?? null;
}

/**
 * 03 §7 — the Elder reads REAL player state, not a fixed dialogue tree.
 * Ordered: the first matching rule wins, so put the specific ones first.
 */
export interface ElderRule {
  id: string;
  /** Evaluated against the snapshot the API builds. */
  when: (s: ElderSnapshot) => boolean;
  setswana: string;
  english: string;
}

export interface ElderSnapshot {
  tankPct: number;
  weather: string;
  botho: number;
  chapter: string;
  readyPlots: number;
  thirstyPlots: number;
  uncollectedCrafts: number;
  contributedToday: boolean;
}

export const ELDER_RULES: ElderRule[] = [
  {
    id: 'tank_empty',
    when: (s) => s.tankPct <= 0,
    setswana: 'Metsi a fedile. Tshimo ga e gole e se na metsi.',
    english: 'The tank is dry. Nothing grows without water — fill it and the clock starts again.',
  },
  {
    id: 'crops_thirsty',
    when: (s) => s.thirstyPlots > 0,
    setswana: 'Go na le tse di nyorilweng. Di emetse wena.',
    english: 'Some of your plots are waiting on water. They have stopped, not failed.',
  },
  {
    id: 'tank_low',
    when: (s) => s.tankPct < 25,
    setswana: 'Tanka e a fela. Pula e ngata ga e na go nna teng ka bonako.',
    english: 'The tank is running low. Rain is not something to count on in this season.',
  },
  {
    id: 'crafts_ready',
    when: (s) => s.uncollectedCrafts > 0,
    setswana: 'Tiro ya gago e fedile. E tsaya.',
    english: 'Your work is finished. Go and take it — nothing improves by being left.',
  },
  {
    id: 'harvest_ready',
    when: (s) => s.readyPlots > 0,
    setswana: 'Tshimo e goletswe. Robala ka yone.',
    english: 'The field has given you something. Take it before the birds do.',
  },
  {
    id: 'community',
    when: (s) => s.contributedToday,
    setswana: 'Motho ke motho ka batho.',
    english: 'A person is a person because of other people. You gave today; that is remembered.',
  },
  {
    id: 'rain',
    when: (s) => s.weather === 'rain',
    setswana: 'Pula ke matshelo, ga e a tshaba.',
    english: 'Rain is life; it should not be feared. The tank is filling on its own today.',
  },
  {
    id: 'drought',
    when: (s) => s.chapter === 'moriti',
    setswana: 'Moriti o o botlhoko. Jala tse di itshokang.',
    english: 'This is the dry season. Plant what can bear it, or spend your days fetching water.',
  },
  {
    id: 'default',
    when: () => true,
    setswana: 'Tshameka, jala, rekisa, duelelwa.',
    english: 'Play, plant, sell, get paid. There is work here if you want it.',
  },
];

export function elderLine(s: ElderSnapshot): { setswana: string; english: string; id: string } {
  const rule = ELDER_RULES.find((r) => r.when(s)) ?? ELDER_RULES[ELDER_RULES.length - 1]!;
  return { setswana: rule.setswana, english: rule.english, id: rule.id };
}
