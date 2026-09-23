/**
 * Economy — every economic constant that is not a crop, item or recipe.
 * Source: docs/MVP/02_Economy_And_Currencies.md §4, §6.4–6.7, §7 and
 * docs/MVP/05_Implementation_Plan.md.
 *
 * Nothing in application code may hardcode a number that appears here.
 */

/* ------------------------------------------------------------------ Market */
/** 02 §4.1 — the Co-op's tax. Applied server-side on every sale. */
export const COOP_TAX_RATE = 0.05;
/** Price band for raw and foraged goods (02 §4.1). */
export const PRICE_BAND = { min: 0.5, max: 2.0 } as const;
/** The band drifts on a 6-hour cycle. */
export const PRICE_CYCLE_HOURS = 6;
/**
 * C14 / 02 §4.1 — crafted and processed goods are EXEMPT from the band and sell at
 * a stable 1.0x ± 10%. Without this a crafted good can sell at 0.5x and every recipe
 * loses money at random, which makes the crafting margin table a lie.
 */
export const CRAFTED_BAND = { min: 0.9, max: 1.1 } as const;
export const CRAFTED_CATEGORIES = ['DITSALO', 'DIKUNO'] as const;

/* ------------------------------------------------------------------ Water */
/**
 * 03 §1.2 — water is the central tension. F5 raised the price to P1.00/unit and
 * widened crop thirst so the Jojo tank is a real decision rather than decoration.
 * An empty tank HALTS growth. It never kills a crop.
 */
export const WATER = {
  /** Pula per tank unit. */
  unitPricePula: 1.0,
  /** Jojo tank capacity, in units. */
  tankCapacity: 60,
  /** Cost of a full refill (the water truck). 60 units x P1.00. */
  fullRefillPula: 60,
  /** Water is drawn only while a crop is GROWING — never while it sits ready. */
  chargedWhileState: 'GROWING',
  /**
   * Rain is free water that credits the tank (03 §1.2). Units credited per hour of
   * rain weather; capped at tank capacity. A storm fills faster. This keeps the dry
   * season a real decision without ever weaponising drought into a crop-killer.
   */
  rainRatePerHour: 2,
  stormRatePerHour: 5,
} as const;

/* ------------------------------------------------------------------ Storage */
/** D9 / 02 §6.5 — the only tiered building line in v1. */
export interface StorageTier {
  tier: number;
  name: string;
  setswana: string;
  slotCap: number;
  listingSlots: number;
  upgradeCostPula: number | null;
}
export const STORAGE_TIERS: StorageTier[] = [
  { tier: 1, name: 'Storage Basket', setswana: 'Seroto', slotCap: 24, listingSlots: 5, upgradeCostPula: null },
  { tier: 2, name: 'Storage Shed', setswana: 'Shedi', slotCap: 48, listingSlots: 10, upgradeCostPula: 1200 },
  { tier: 3, name: 'Storehouse', setswana: 'Ntlo ya Polokelo', slotCap: 96, listingSlots: 20, upgradeCostPula: 6000 },
];
/** R7 / C8 — Guild +50% STACKS on tier (24→36, 48→72, 96→144). */
export const GUILD_STORAGE_MULTIPLIER = 1.5;

export function effectiveSlotCap(tier: number, isGuildSubscriber: boolean): number {
  const t = STORAGE_TIERS.find((x) => x.tier === tier) ?? STORAGE_TIERS[0]!;
  return Math.floor(t.slotCap * (isGuildSubscriber ? GUILD_STORAGE_MULTIPLIER : 1));
}

/* ------------------------------------------------------------------ Land */
/** D10 / 02 §6.5 — start 4, max 20. F17 raised these so pacing holds after the crop retune. */
export interface LandTier {
  plots: number;
  costPula: number | null;
}
export const LAND_LADDER: LandTier[] = [
  { plots: 4, costPula: null },
  { plots: 8, costPula: 1200 },
  { plots: 12, costPula: 6000 },
  { plots: 20, costPula: 30000 },
];
export const STARTING_PLOTS = 4;
export const MAX_PLOTS = 20;
export const LAND_LADDER_TOTAL = 37200;

/**
 * The next rung of the land ladder above `currentPlots`, or null when maxed.
 * A rung is bought as a BATCH: paying `costPula` grants every plot up to
 * `plots` (e.g. a 6-plot farm pays 6,000 and jumps to 12).
 */
export function nextLandTier(currentPlots: number): LandTier | null {
  return LAND_LADDER.find((t) => t.plots > currentPlots) ?? null;
}

/* ------------------------------------------------------------------ Botho */
/** 02 §6.4 — the three pillars have no levels and no XP. */
export const BOTHO_THRESHOLDS = {
  BUPI_RECIPE: 100,
  DEEP_BUSHVELD: 300,
  LETSEMA: 500,
  PRIZE_ELIGIBILITY: 1000,
} as const;

/**
 * I4 — Botho accrues only from explicit, manual, deliberate acts and is capped per
 * player per day. This is a LEGAL control, not a balance one: Botho gates a real-money
 * prize, and if a paid subscription's Auto-Collector supplied the materials for
 * Botho-earning acts, the subscription would indirectly buy prize eligibility.
 */
export const BOTHO_DAILY_CAP = 50;
/** Letsema: Botho >= 500 AND not used in 7 days. */
export const LETSEMA_COOLDOWN_DAYS = 7;

/**
 * 02 §9 — community-project contribution is capped per day, deliberately, so the
 * thing the design pays best for cannot be multiplied by grinding. The spec fixes
 * the *principle* and leaves the number to us; 200 keeps a daily contributor well
 * ahead of a spreadsheet without letting a whale buy the leaderboard in a week.
 * FLAGGED for Princess Eugenia — this is an economic number and belongs in 02 §6
 * once confirmed.
 */
export const KGOTLA_DAILY_CONTRIBUTION_CAP = 200;

/* ------------------------------------------------------------------ Monetisation */
export interface TopUpPack {
  slug: string;
  name: string;
  priceBwp: number;
  grantedPula: number;
}
/** 02 §6.6 — Pula is transparent and 1:1. */
export const TOP_UP_PACKS: TopUpPack[] = [
  { slug: 'starter', name: 'Starter', priceBwp: 5, grantedPula: 5 },
  { slug: 'farmer', name: 'Farmer', priceBwp: 50, grantedPula: 50 },
  { slug: 'harvest', name: 'Harvest', priceBwp: 100, grantedPula: 105 },
  { slug: 'cattle', name: 'Cattle', priceBwp: 250, grantedPula: 265 },
  { slug: 'export', name: 'Export', priceBwp: 500, grantedPula: 540 },
];
/** R4 / C5 — enforced per player per calendar day in BOTSWANA TIME (UTC+2), not server-local. */
export const DAILY_TOP_UP_CAP_BWP = 500;
export const BOTSWANA_UTC_OFFSET = '+02:00';

export const GUILD_SUBSCRIPTION = {
  slug: 'guild',
  priceBwp: 49,
  benefits: [
    'auto_collector',
    'storage_bonus_50',
    'cosmetics',
    'weekly_pula_stone',
    'ad_free',
  ],
} as const;

export interface Boost {
  slug: string;
  name: string;
  setswana: string;
  pricePula: number;
  effect: string;
}
/** R8 — Fertility Shell is REMOVED. Three boosts, and only three. */
export const BOOSTS: Boost[] = [
  {
    slug: 'pula_stone',
    name: 'Pula Stone',
    setswana: 'Lentswe la Pula',
    pricePula: 20,
    effect: 'Refill the Jojo tank to 50%, or guarantee rain within 24 hours.',
  },
  {
    slug: 'ancestral_ward',
    name: 'Ancestral Ward',
    setswana: 'Thebe ya Badimo',
    pricePula: 25,
    effect: 'A three-day shield against wildlife raids.',
  },
  {
    slug: 'breath_of_the_land',
    name: 'Breath of the Land',
    setswana: 'Phefo ya Lefatshe',
    pricePula: 15,
    effect: 'Instantly complete an active crafting or building timer.',
  },
];
export const BOOST_SLUGS = BOOSTS.map((b) => b.slug);

/* ------------------------------------------------------------------ Prize */
/** 02 §6.7 — monthly Botho EARNED, not lifetime (F16: lifetime totals converge and ties become endemic). */
export const PRIZE = {
  revenueShare: 0.1,
  floorPula: 350,
  ceilingPula: 1500,
  split: [4, 2, 1],
  minimumBothoInPeriod: 150,
  topN: 3,
} as const;

/* ------------------------------------------------------------------ Sinks */
/**
 * F7 — without an unbounded sink, Pula accumulates with nowhere to go: P1,913 / P5,288
 * / P8,814 per month at 4 / 12 / 20 plots. Two sinks fix it, and both are required.
 */
export const COSMETIC_PRICE_RANGE = { min: 200, max: 2000 } as const;
export const SINKS = ['seeds', 'water', 'land', 'maintenance', 'coop_tax', 'cosmetics', 'letsema_fund'] as const;

/** Seasonal maintenance — what keeps Poleto, Thapo and Setena alive after the build (03 §3.5). */
export const MAINTENANCE = {
  intervalDays: 90,
  costs: { kraal: { thapo: 2 }, boundary: { poleto: 3 }, water_source: { setena: 2 } },
} as const;

/* ------------------------------------------------------------------ Starting state */
export const STARTING_PULA = 250;
export const STARTING_BOTHO = 0;
export const STARTING_STORAGE_TIER = 1;
/** New scenes start settled (04 §4.2). */
export const STARTING_KAGISO = 6;
