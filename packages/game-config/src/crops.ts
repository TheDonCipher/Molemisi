/**
 * Crops — numbers of record from docs/MVP/02_Economy_And_Currencies.md §6.1.
 *
 * THREE HARD RULES GOVERN THIS TABLE (02 §6.1):
 *   1. No crop's growth sits between 24 h and 40 h. With a once-daily check-in a
 *      crop finishing just after 24 h still yields only one harvest per visit, so
 *      it earns half what a 23 h crop of identical value earns. (F1)
 *   2. A 2-day crop pays ~2x a comparable 1-day crop per harvest, so waiting is a
 *      trade against tied-up capital rather than a penalty.
 *   3. Water hunger, not price, is what differentiates crops.
 *
 * Net per plot per day ranges P12.25 (sorghum) -> P40.63 (morula): a 3.3x spread,
 * ordered by seed cost and capital at risk. Verified by scripts/balance_verify.py.
 *
 * D6: all 11 crops are unlocked from the start. What changes with the season is
 * which seeds are stocked — see ./chapters.ts.
 */

export type CropId =
  | 'sorghum'
  | 'millet'
  | 'maize'
  | 'cowpeas'
  | 'tomatoes'
  | 'watermelon'
  | 'groundnuts'
  | 'sesame'
  | 'pepper'
  | 'herbs'
  | 'morula';

/** 1 = 💧 drought-hardy, 3 = 💧💧💧 thirsty. Shown on every seed packet. */
export type ThirstRating = 1 | 2 | 3;

export interface CropConfig {
  id: CropId;
  /** English name. */
  name: string;
  /** Setswana name — shown first in the UI. */
  setswana: string;
  description: string;
  /** Cost of one seed, in Pula. Doubles as the item's base value (02 §6.2). */
  seedCost: number;
  /** Base sale value per unit of harvest, in Pula. */
  baseValue: number;
  yield: { min: number; max: number };
  /** Hours to maturity. Never 24 < h < 40. Never under 12. */
  growthHours: number;
  /** Explicit 1-day or 2-day cadence — derived, but stored so the UI can show it. */
  cadenceDays: 1 | 2;
  /** Tank units consumed per hour while the crop is GROWING (never while ready). */
  waterPerHour: number;
  thirst: ThirstRating;
  spriteSheet: string;
  /**
   * Number of growth-stage sprite files on disk for this crop:
   * `stage_0.png` … `stage_{spriteStages-1}.png`. Drives `CropSprite` so art
   * follows each crop's real stage count instead of a hardcoded 5. Every crop
   * has 5 except watermelon (6 — its `stage_5` is the final swelling).
   */
  spriteStages: number;
  seedSprite: string;
  productSprite: string;
  /**
   * DEPRECATED FIELDS — used by the legacy Phaser-era simulation only.
   *
   * The MVP spec replaces per-stage growth with hour-based growth and removes
   * disease/pest events (03 §1.1, 03 §1.3). These fields are kept optional so the
   * legacy `simulation.service.ts` still compiles; new code (the Farm path, Bushveld,
   * Market) must NOT read them. When the legacy service is removed, remove these too.
   *
   * Populated by `withLegacyFields` below; consumers see a fully-shaped object.
   */
  growthStages?: 4;
  timePerStage?: number;
  waterDecayRate?: number;
  waterPerAction?: number;
  diseaseChancePerStage?: number;
  pestChancePerStage?: number;
}

export const CROPS: Record<CropId, CropConfig> = {
  sorghum: {
    id: 'sorghum',
    spriteStages: 5,
    name: 'Sorghum',
    setswana: 'Mabele',
    description: 'The grain that carries a household through the dry months. Asks almost nothing of the tank.',
    seedCost: 2,
    baseValue: 3,
    yield: { min: 4, max: 6 },
    growthHours: 18,
    cadenceDays: 1,
    waterPerHour: 0.04,
    thirst: 1,
    spriteSheet: 'sprites/crops/sorghum',
    seedSprite: 'ui/items/seed_sorghum.png',
    productSprite: 'ui/items/product_sorghum.png',
  },
  millet: {
    id: 'millet',
    spriteStages: 5,
    name: 'Millet',
    setswana: 'Lebelebele',
    description: 'Quick, hardy, and out of the ground before anything else. The beginner\'s friend.',
    seedCost: 2,
    baseValue: 4,
    yield: { min: 3, max: 5 },
    growthHours: 16,
    cadenceDays: 1,
    waterPerHour: 0.06,
    thirst: 1,
    spriteSheet: 'sprites/crops/millet',
    seedSprite: 'ui/items/seed_millet.png',
    productSprite: 'ui/items/product_millet.png',
  },
  maize: {
    id: 'maize',
    spriteStages: 5,
    name: 'Maize',
    setswana: 'Mmidi',
    description: 'A heavy feeder. Big yields, but it will drink the tank dry if you let it.',
    seedCost: 3,
    baseValue: 5,
    yield: { min: 4, max: 6 },
    growthHours: 22,
    cadenceDays: 1,
    waterPerHour: 0.2,
    thirst: 3,
    spriteSheet: 'sprites/crops/maize',
    seedSprite: 'ui/items/seed_maize.png',
    productSprite: 'ui/items/product_maize.png',
  },
  cowpeas: {
    id: 'cowpeas',
    spriteStages: 5,
    name: 'Cowpeas',
    setswana: 'Dinawa',
    description: 'A modest drinker that gives the soil something back. Quietly reliable.',
    seedCost: 3,
    baseValue: 6,
    yield: { min: 3, max: 5 },
    growthHours: 20,
    cadenceDays: 1,
    waterPerHour: 0.1,
    thirst: 2,
    spriteSheet: 'sprites/crops/cowpeas',
    seedSprite: 'ui/items/seed_cowpeas.png',
    productSprite: 'ui/items/product_cowpeas.png',
  },
  tomatoes: {
    id: 'tomatoes',
    spriteStages: 5,
    name: 'Tomatoes',
    setswana: 'Tamati',
    description: 'The best of the one-day crops, if you can keep up with its thirst.',
    seedCost: 5,
    baseValue: 10,
    yield: { min: 2, max: 4 },
    growthHours: 24,
    cadenceDays: 1,
    waterPerHour: 0.26,
    thirst: 3,
    spriteSheet: 'sprites/crops/tomatoes',
    seedSprite: 'ui/items/seed_tomatoes.png',
    productSprite: 'ui/items/product_tomatoes.png',
  },
  watermelon: {
    id: 'watermelon',
    spriteStages: 6,
    name: 'Watermelon',
    setswana: 'Legapu',
    description: 'Two days, and a tank and a half. Plant it in the rains or not at all.',
    seedCost: 6,
    baseValue: 11,
    yield: { min: 4, max: 6 },
    growthHours: 44,
    cadenceDays: 2,
    waterPerHour: 0.3,
    thirst: 3,
    spriteSheet: 'sprites/crops/watermelon',
    seedSprite: 'ui/items/seed_watermelon.png',
    productSprite: 'ui/items/product_watermelon.png',
  },
  groundnuts: {
    id: 'groundnuts',
    spriteStages: 5,
    name: 'Groundnuts',
    setswana: 'Manoko',
    description: 'Two days under the soil, and it barely drinks. The dry season\'s backbone.',
    seedCost: 8,
    baseValue: 11,
    yield: { min: 4, max: 6 },
    growthHours: 40,
    cadenceDays: 2,
    waterPerHour: 0.1,
    thirst: 2,
    spriteSheet: 'sprites/crops/groundnuts',
    seedSprite: 'ui/items/seed_groundnuts.png',
    productSprite: 'ui/items/product_groundnuts.png',
  },
  sesame: {
    id: 'sesame',
    spriteStages: 5,
    name: 'Sesame',
    setswana: 'Sesame',
    description: 'Patient, sparing with water, and worth the wait when the price is up.',
    seedCost: 10,
    baseValue: 15,
    yield: { min: 3, max: 5 },
    growthHours: 46,
    cadenceDays: 2,
    waterPerHour: 0.12,
    thirst: 1,
    spriteSheet: 'sprites/crops/sesame',
    seedSprite: 'ui/items/seed_sesame.png',
    productSprite: 'ui/items/product_sesame.png',
  },
  pepper: {
    id: 'pepper',
    spriteStages: 5,
    name: 'Pepper',
    setswana: 'Pepere',
    description: 'Two days of heat and water for a crop that pays like nothing else in Phane.',
    seedCost: 12,
    baseValue: 17,
    yield: { min: 3, max: 5 },
    growthHours: 44,
    cadenceDays: 2,
    waterPerHour: 0.18,
    thirst: 2,
    spriteSheet: 'sprites/crops/pepper',
    seedSprite: 'ui/items/seed_pepper.png',
    productSprite: 'ui/items/product_pepper.png',
  },
  herbs: {
    id: 'herbs',
    spriteStages: 5,
    name: 'Herbs',
    setswana: 'Ditlhare tsa Setso',
    description: 'Traditional medicine, gathered leaf by leaf. Slow, and never cheap.',
    seedCost: 16,
    baseValue: 25,
    yield: { min: 2, max: 4 },
    growthHours: 48,
    cadenceDays: 2,
    waterPerHour: 0.14,
    thirst: 2,
    spriteSheet: 'sprites/crops/herbs',
    seedSprite: 'ui/items/seed_herbs.png',
    productSprite: 'ui/items/product_herbs.png',
  },
  morula: {
    id: 'morula',
    spriteStages: 5,
    name: 'Morula',
    setswana: 'Morula',
    description:
      'A tree, not a crop. Two days, almost no water, and the top of the ladder. Replaced Saffron — Saffron is not Botswana.',
    seedCost: 28,
    baseValue: 46,
    yield: { min: 2, max: 3 },
    growthHours: 48,
    cadenceDays: 2,
    waterPerHour: 0.04,
    thirst: 1,
    spriteSheet: 'sprites/crops/morula',
    seedSprite: 'ui/items/seed_morula.png',
    productSprite: 'ui/items/product_morula.png',
  },
};

export const CROP_IDS = Object.keys(CROPS) as CropId[];

/**
 * Attach deprecated per-stage fields to every crop so the legacy simulation service
 * does not crash. Disease and pest chances are ZERO per the MVP spec (03 §1.3 — no
 * fail states on work); the water rate is the new per-hour rate restated per day.
 * Consumers of the new Farm path must not read these.
 */
function withLegacyFields(c: CropConfig): CropConfig {
  return {
    ...c,
    growthStages: 4 as const,
    timePerStage: Math.max(1, Math.round((c.growthHours * 60) / 4)),
    waterDecayRate: c.waterPerHour * 24,
    waterPerAction: 1,
    diseaseChancePerStage: 0,
    pestChancePerStage: 0,
  };
}
for (const k of CROP_IDS) CROPS[k] = withLegacyFields(CROPS[k]);

export function getCropConfig(cropType: string): CropConfig | undefined {
  return CROPS[cropType as CropId];
}

/**
 * The pre-MVP simulation service reads per-stage fields the spec no longer defines.
 * `withLegacyFields` populates them at runtime; this accessor gives TypeScript the
 * same guarantee so that service keeps compiling.
 *
 * NEW CODE MUST NOT CALL THIS. It exists only to keep the legacy per-stage
 * simulation alive until P2 replaces it with the hour-based / Jojo-tank model from
 * 03 §1.2. Delete it in the same commit that deletes simulation.service.ts.
 */
export type LegacyCropSim = Required<
  Pick<
    CropConfig,
    | 'growthStages'
    | 'timePerStage'
    | 'waterDecayRate'
    | 'waterPerAction'
    | 'diseaseChancePerStage'
    | 'pestChancePerStage'
  >
>;

export function legacyCropSim(c: CropConfig): LegacyCropSim {
  return {
    growthStages: c.growthStages ?? 4,
    timePerStage: c.timePerStage ?? Math.max(1, Math.round((c.growthHours * 60) / 4)),
    waterDecayRate: c.waterDecayRate ?? c.waterPerHour * 24,
    waterPerAction: c.waterPerAction ?? 1,
    diseaseChancePerStage: c.diseaseChancePerStage ?? 0,
    pestChancePerStage: c.pestChancePerStage ?? 0,
  };
}

/**
 * D6 — no level gate. All 11 crops exist from the first minute; the seed calendar
 * (./chapters.ts) is what actually paces discovery. Kept as a function so any
 * caller that used to filter by level keeps working and returns everything.
 */
export function getAllCrops(): CropConfig[] {
  return Object.values(CROPS);
}

/** Growth stage 0..3, for the plot sprite. Stage 3 = ready. */
export function growthStage(crop: CropConfig, hoursGrown: number): 0 | 1 | 2 | 3 {
  const pct = Math.min(1, Math.max(0, hoursGrown / crop.growthHours));
  if (pct >= 1) return 3;
  if (pct >= 0.66) return 2;
  if (pct >= 0.33) return 1;
  return 0;
}

/** Expected net Pula per plot per day, after Co-op tax, before water. */
export function netPerPlotPerDay(crop: CropConfig, taxRate = 0.05): number {
  const avgYield = (crop.yield.min + crop.yield.max) / 2;
  const netPerHarvest = crop.baseValue * avgYield * (1 - taxRate) - crop.seedCost;
  return netPerHarvest / crop.cadenceDays;
}
