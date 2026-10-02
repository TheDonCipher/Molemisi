/**
 * The Kgotla Year — the authoritative data spine for the player year-loop.
 *
 * Source of truth: `docs/36_Kgotla_Year_Quest_Specification.md` (cast, 12 Charges,
 * 4 Council Projects, reward formula §5.1, faucet §8.1) as consolidated and made
 * implementation-ready by `docs/38_Consolidated_Year_Loop_Specification.md`
 * (§0 constants, §4.3 I-1).
 *
 * This module is **data only**. It holds the numbers and the two pure helpers
 * (`cycleKey`, `chargePula`) that the Kgotla service reads. No application code may
 * hardcode a Charge reward, threshold, NPC id or cycle rule — they live here.
 *
 * Why a single module: `docs/38` I-1 requires "no numeric literal in app code" for
 * the year loop. The Pula faucet (P915/yr) and Botho (120/yr) are *derived* from the
 * data below, not asserted as magic constants, so the economy gate
 * (`scripts/balance_verify.py`) and the spec stay in lock-step.
 */

import { chapterForMonth, type ChapterSlug } from './chapters';

/* ----------------------------------------------------------------- Coherence */

/** The canonical NPC ids. Ids are STABLE (docs/38 T-10 / I-4): display names may
 *  change (Elder Neo → Mogolo, Oupa Kabelo → Ntate Kabelo) but the id never does. */
export const CHARGE_NPC_IDS = [
  'elder_neo',
  'oupa_kabelo',
  'thabo',
  'refilwe',
  'mama_naledi',
] as const;
export type ChargeNpcId = (typeof CHARGE_NPC_IDS)[number];

/** Premium applied to a good's base value in the reward formula (docs/36 §5.1). */
export type GoodCategory = 'grown' | 'gathered' | 'crafted';

const PREMIUM: Record<GoodCategory, number> = {
  // grown OR gathered share the 1.25 band (docs/36 §5.1); crafted carries its own margin.
  grown: 1.25,
  gathered: 1.25,
  crafted: 1.1,
};

export interface ChargeAsk {
  /** Canonical item id (matches `crops` / `crafting` ids where applicable). */
  item: string;
  qty: number;
  /** Per-unit base value in Pula (docs/36 §5.1 base table). */
  base: number;
  category: GoodCategory;
}

export interface ChargeYearEntry {
  /** Stable, readable id — the join key for the `(farm, charge, cycle)` unique constraint. */
  chargeId: string;
  /** Real calendar month 1–12 in which the Charge is revealed (docs/36 §5.3). */
  month: number;
  /** Shipped NPC id (display name resolved elsewhere). */
  npcId: ChargeNpcId;
  /** Player-facing Charge name (English; Setswana passes are a later step, docs/36 §9). */
  name: string;
  asks: ChargeAsk[];
  /** Botho granted through the capped credit path (docs/36 §5.2 / K6). Always 10. */
  botho: number;
  /** Season stamps (Chapter Tokens) granted; expire with the chapter (docs/38 §0). Always 1. */
  stamp: number;
  /** Almanac `quests` increment per delivery (docs/36 §5.2). Always 1. */
  almanacQuests: number;
  /** Server-computed Pula reward (docs/36 §5.1). Derived once at load. */
  pulaReward: number;
}

/* -------------------------------------------------------------------- Formula */

/** Sum of per-unit base values across all asks (the Charge's base value, docs/36 §8.1). */
export function chargeBaseValue(asks: ChargeAsk[]): number {
  return asks.reduce((sum, a) => sum + a.base * a.qty, 0);
}

/**
 * docs/36 §5.1 — Pula reward = round-to-nearest-P5 of Σ(base × premium).
 * `Math.round(x/5)*5` is the nearest-P5 rounding (handles the 37.5/82.5/93.75 halves
 * exactly as the §8.1 table does: 40 / 85 / 95).
 */
export function computeChargePula(asks: ChargeAsk[]): number {
  const raw = asks.reduce((sum, a) => sum + a.base * a.qty * PREMIUM[a.category], 0);
  return Math.round(raw / 5) * 5;
}

/* ---------------------------------------------------------------------- Data */

/**
 * The twelve monthly Charges (docs/36 §4, §6, §8.1). Item base values and categories
 * are reproduced from docs/36 §5.1 so the reward is recomputable from first principles.
 */
const CHARGE_YEAR_RAW: Omit<ChargeYearEntry, 'pulaReward'>[] = [
  {
    chargeId: 'straight_rows',
    month: 11,
    npcId: 'thabo',
    name: 'Straight Rows',
    asks: [{ item: 'sorghum', qty: 10, base: 3, category: 'grown' }],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'first_phane',
    month: 12,
    npcId: 'refilwe',
    name: 'The First Phane',
    asks: [{ item: 'phane', qty: 3, base: 10, category: 'gathered' }],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'grain_lean_months',
    month: 1,
    npcId: 'elder_neo',
    name: 'Grain for the Lean Months',
    asks: [{ item: 'millet', qty: 12, base: 4, category: 'grown' }],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'round_ones',
    month: 2,
    npcId: 'mama_naledi',
    name: 'The Round Ones',
    asks: [{ item: 'watermelon', qty: 6, base: 11, category: 'grown' }],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'kraal_gate',
    month: 3,
    npcId: 'oupa_kabelo',
    name: 'The Kraal Gate',
    asks: [
      { item: 'plank', qty: 4, base: 7, category: 'crafted' },
      { item: 'rope', qty: 2, base: 18, category: 'crafted' },
    ],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'pot_feast',
    month: 4,
    npcId: 'elder_neo',
    name: 'Something for the Pot',
    asks: [
      { item: 'groundnuts', qty: 5, base: 11, category: 'grown' },
      { item: 'pepper', qty: 2, base: 17, category: 'grown' },
    ],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'threshing_day',
    month: 5,
    npcId: 'thabo',
    name: 'Threshing Day',
    asks: [{ item: 'cowpeas', qty: 8, base: 6, category: 'grown' }],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'cold_pot',
    month: 6,
    npcId: 'refilwe',
    name: 'The Cold Pot',
    asks: [{ item: 'herbs', qty: 3, base: 25, category: 'grown' }],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'long_promise',
    month: 7,
    npcId: 'elder_neo',
    name: 'The Long Promise',
    asks: [{ item: 'morula', qty: 2, base: 46, category: 'grown' }],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'pepper_stall',
    month: 8,
    npcId: 'mama_naledi',
    name: 'Pepper for the Stall',
    asks: [{ item: 'pepper', qty: 4, base: 17, category: 'grown' }],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'ropes_ploughing',
    month: 9,
    npcId: 'oupa_kabelo',
    name: 'Ropes for the Ploughing',
    asks: [
      { item: 'rope', qty: 3, base: 18, category: 'crafted' },
      { item: 'brick', qty: 3, base: 11, category: 'crafted' },
    ],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
  {
    chargeId: 'seed_scattering',
    month: 10,
    npcId: 'elder_neo',
    name: 'Seed for the Scattering',
    asks: [
      { item: 'sorghum', qty: 8, base: 3, category: 'grown' },
      { item: 'millet', qty: 6, base: 4, category: 'grown' },
    ],
    botho: 10,
    stamp: 1,
    almanacQuests: 1,
  },
];

export const CHARGE_YEAR: ChargeYearEntry[] = CHARGE_YEAR_RAW.map((c) => ({
  ...c,
  pulaReward: computeChargePula(c.asks),
}));

/** The year's total Pula faucet — docs/36 §8.1 / docs/38 §0 (exactly P915). */
export const CHARGE_YEAR_PULA_FAUCET = CHARGE_YEAR.reduce((s, c) => s + c.pulaReward, 0);
/** The year's total Botho from Charges — docs/36 §8.1 (exactly 120, never the 150 prize floor). */
export const CHARGE_YEAR_BOTHO_TOTAL = CHARGE_YEAR.reduce((s, c) => s + c.botho, 0);

/* -------------------------------------------------------------- Council projects */

export interface CouncilProject {
  projectId: string;
  name: string;
  /** Chapter the project is active in (one per chapter, docs/36 K9 / §4). */
  chapter: ChapterSlug;
  /** Pula contribution threshold to fill the farm's own bar (docs/38 §0, C6). */
  thresholdPula: number;
  /** Season stamps granted once, when the bar first fills (docs/38 §0, AC-04). */
  stampReward: number;
}

/**
 * Four chapter-long Council Projects (docs/36 §4, K9; docs/38 §0 / I-3).
 * Schedule: Reservoir→Pula, Festival→Letlhafula, Water Store→Mariga, School→Dikgakologo.
 * `market_square` is retired (docs/38 T-6). Thresholds 100/150/150/200, stamps 5/8/8/12.
 */
export const COUNCIL_PROJECTS: CouncilProject[] = [
  { projectId: 'water_reservoir', name: 'Water Reservoir', chapter: 'pula', thresholdPula: 100, stampReward: 5 },
  { projectId: 'mophane_festival', name: 'The Mophane Festival', chapter: 'phane', thresholdPula: 150, stampReward: 8 },
  { projectId: 'water_store', name: 'The Water Store', chapter: 'moriti', thresholdPula: 150, stampReward: 8 },
  { projectId: 'school', name: 'The School', chapter: 'letlhafula', thresholdPula: 200, stampReward: 12 },
];

export function projectForChapter(slug: ChapterSlug): CouncilProject | undefined {
  return COUNCIL_PROJECTS.find((p) => p.chapter === slug);
}

/* --------------------------------------------------------------------- Helpers */

/** The Charge revealed in a given real month (docs/36 §5.3). Undefined for an invalid month. */
export function chargeForMonth(month: number): ChargeYearEntry | undefined {
  return CHARGE_YEAR.find((c) => c.month === month);
}

/** Every Charge whose month falls in `slug` (3 per chapter, docs/36 §4). */
export function chargesForChapter(slug: ChapterSlug): ChargeYearEntry[] {
  return CHARGE_YEAR.filter((c) => chapterForMonth(c.month).slug === slug);
}

/**
 * docs/36 §5.5 — the per-cycle key, a pure function of the Gaborone date.
 * The game year begins 1 November; the cycle is named for that start year.
 *   2026-11-01 → '2026/27'   2027-01-15 → '2026/27'
 *   2027-10-31 → '2026/27'   2027-11-01 → '2027/28'
 * Must use UTC so it agrees with chapter boundaries (00:00 Gaborone = 22:00 UTC prev day).
 */
export function cycleKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const startYear = month >= 11 ? year : year - 1;
  // docs/36 §5.5 style: full start year, two-digit end year (2026/27, 2027/28).
  const endYear = String(startYear + 1).slice(-2);
  return `${startYear}/${endYear}`;
}
