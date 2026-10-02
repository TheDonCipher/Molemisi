/**
 * Economy — every economic constant that is not a crop, item or recipe.
 * Source: docs/MVP/02_Economy_And_Currencies.md §4, §6.4–6.7, §7 and
 * docs/MVP/05_Implementation_Plan.md.
 *
 * Nothing in application code may hardcode a number that appears here.
 */

import { BUILDINGS } from './buildings';
import { getItemDef } from './items';
import { type ChapterSlug } from './chapters';

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
/* --------------------------------------------------------------- Contracts */
/**
 * R3 / docs-31 P0-2 — the contract board paid MORE for a basket of goods than the
 * Co-op did, and a completed contract could be re-accepted in the same second.
 * accept → deliver → complete → accept therefore printed Pula faster than any sink
 * could drain it (the audit measured roughly P1.35 paid per P1.00 of goods handed
 * in). Two rules close it, and both live here so no call site can drift.
 */
export const CONTRACT_RULES = {
  /** A completed contract stays off ONE farm's board for this many hours. */
  repeatCooldownHours: 24,
  /**
   * The reward ceiling, as a multiple of what the SAME goods would net at the
   * Co-op at a neutral 1.0x price. 1.25 keeps contracts the better offer — they
   * are meant to be — without making the market strictly wrong to use.
   */
  rewardMarketMultiple: 1.25,
} as const;

/**
 * What `requirements` would net at the Co-op at a neutral price: catalogue
 * base value, less the Co-op's tax (02 §4.1). This is the honest yardstick for
 * "is this contract paying too much", because it is the alternative the player
 * was already free to take.
 */
export function contractGoodsMarketValue(
  requirements: readonly { itemType: string; quantity: number }[],
): number {
  const gross = requirements.reduce(
    (sum, r) => sum + (getItemDef(r.itemType)?.baseValue ?? 0) * r.quantity,
    0,
  );
  return Math.round(gross * (1 - COOP_TAX_RATE) * 100) / 100;
}

/**
 * The most a contract with these requirements may pay. Floored at 1 so an
 * unrecognised slug cannot silently zero a player's reward.
 */
export function contractRewardCap(
  requirements: readonly { itemType: string; quantity: number }[],
): number {
  return Math.max(
    1,
    Math.round(contractGoodsMarketValue(requirements) * CONTRACT_RULES.rewardMarketMultiple),
  );
}


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
/**
 * D9 / 02 §6.5 — the only tiered building line in v1.
 * G8: the upgrade COST is not here. It lives once in
 * `BUILDINGS.storage.upgradeCosts` (charged by buildings.service as
 * 'storage_upgrade'); read it via `storageUpgradeCost(tier)`. The old
 * `upgradeCostPula` field duplicated it with stale values (P1,200/P6,000).
 */
export interface StorageTier {
  tier: number;
  name: string;
  setswana: string;
  slotCap: number;
  listingSlots: number;
}
export const STORAGE_TIERS: StorageTier[] = [
  { tier: 1, name: 'Storage Basket', setswana: 'Seroto', slotCap: 24, listingSlots: 5 },
  { tier: 2, name: 'Storage Shed', setswana: 'Shedi', slotCap: 48, listingSlots: 10 },
  { tier: 3, name: 'Storehouse', setswana: 'Ntlo ya Polokelo', slotCap: 96, listingSlots: 20 },
];
/** R7 / C8 — Guild +50% STACKS on tier (24→36, 48→72, 96→144). */
export const GUILD_STORAGE_MULTIPLIER = 1.5;

export function effectiveSlotCap(tier: number, isGuildSubscriber: boolean): number {
  const t = STORAGE_TIERS.find((x) => x.tier === tier) ?? STORAGE_TIERS[0]!;
  return Math.floor(t.slotCap * (isGuildSubscriber ? GUILD_STORAGE_MULTIPLIER : 1));
}

/**
 * 31 §6.2 / 32 §5 — Storage tier 3's FUNCTIONAL benefit (ruled 2026-09-28).
 *
 * Tier 2's 48 slots already hold every one of the game's 38 item types, so tier 3's
 * extra 48 slots are pure headroom and the P12,000 price tag bought nothing — the
 * audit called it a dead sink, correctly. The audit's own first suggestion is a
 * stack-cap multiplier, and it is the one that turns the tier's value from BREADTH
 * (saturated) into DEPTH (not): a Storehouse keeps twice as much of every single
 * thing, so a real harvest can be held back and sold into a market spike — which is
 * exactly the behaviour the reactive price band rewards (02 §4.1).
 *
 * Note the alternative the roadmap floated, "+listing slots", is NOT available: the
 * listing count belongs to the Madi / P2P Exchange economy, which is outside the v1
 * Co-op loop (31 §6.2). This benefit changes no income, so `scripts/balance_verify.py`
 * is untouched by it.
 */
export const STORAGE_T3_STACK_MULTIPLIER = 2;

/**
 * The per-type stack cap actually enforced for a farm's storage tier. Tier 3 doubles
 * the item's own `maxStack`; tiers 1–2 leave it exactly as authored. It only ever
 * RAISES a cap, never lowers one — so a player who downgrades (impossible in v1, but
 * still) can never have stock destroyed by this rule.
 */
export function effectiveStackCap(baseMaxStack: number, storageTier: number): number {
  return Math.floor(baseMaxStack * (storageTier >= 3 ? STORAGE_T3_STACK_MULTIPLIER : 1));
}

/**
 * G8 — the Pula cost to upgrade TO `tier`, read from the single source
 * (`BUILDINGS.storage.upgradeCosts`). Null for the starter tier and for the
 * top tier (nothing further to buy).
 */
export function storageUpgradeCost(tier: number): number | null {
  if (tier <= 1) return null;
  // `storage` is a required v1 building (D8/D9); absence is a config error.
  const storage = BUILDINGS['storage'];
  if (!storage) return null;
  return storage.upgradeCosts[tier - 2]?.currency ?? null;
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
  { plots: 16, costPula: 8000 }, // docs/34 §4.1 — was 14,000
  { plots: 20, costPula: 15000 }, // docs/34 §4.1 — was 30,000
];
export const STARTING_PLOTS = 4;
export const MAX_PLOTS = 20;

export const LAND_LADDER_TOTAL = 30200; // 1200 + 6000 + 8000 + 15000 (= 30,200)

/**
 * docs/34 §4.1 (2026-10-01) — the TAIL is retuned, the ladder's shape is not.
 *
 * 12→20 used to cost P30,000 for ~+P118/day of marginal income: a ~254-day
 * payback (docs/31 P2-13) sitting exactly in the window where a player decides
 * whether to commit. A four-month wall is not aspiration, it is a churn trigger
 * arriving just before the moment they would have spent.
 *
 * The standing rule from here on: **no land rung may exceed ~60 days of marginal
 * payback.** `landRungPaybackDays` exists so that rule is an assertion in
 * economy.spec rather than a paragraph someone has to re-derive.
 */
export function landRungPaybackDays(
  fromPlots: number,
  marginalPulaPerPlotPerDay = 20.4,
): number | null {
  const current = nextLandTier(fromPlots);
  if (!current || current.costPula === null) return null;
  const newPlots = current.plots - fromPlots;
  if (newPlots <= 0) return null;
  return current.costPula / (newPlots * marginalPulaPerPlotPerDay);
}

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
  /** docs/34 §Wave 1.2 — "bake bread": the first value-add recipe. */
  AUTO_FEEDER: 300,
  LETSEMA: 500,
  /** "waters and harvests for you" — the capstone helper. */
  AUTO_HELPER: 500,
  /**
   * @deprecated Lifetime value retained ONLY for backward compatibility. The real
   * prize gate is `PRIZE.minimumBothoInPeriod` — a MONTHLY Botho delta ≥ 150
   * (docs/38 T-5 / I-8 / MVP/02 §6.7), NOT this lifetime 1000. Do not use for
   * eligibility; the monthly-delta path is the one that keeps a payment from buying
   * the prize.
   */
  PRIZE_ELIGIBILITY: 1000,
} as const;

/**
 * docs/34 §Wave 1.2 — the earned-helper ladder, as data so the client can
 * render "unlocks at 300 Botho" without hardcoding the numbers.
 *
 * This REPLACES the earlier "Auto-Collector 150 → Auto-Feeder 300 → Irrigation
 * 500" plan (docs/32 task 3.5). Collector folded into the 500 helper: three
 * unlock tiers is the friendly number, and a 150-tier told players nothing.
 *
 * Every entry is a CHORE REMOVER, never a yield multiplier — which is what lets
 * the same behaviour also be a paid convenience (Village Pass) without becoming
 * pay-to-win.
 */
export const AUTOMATION_LADDER = [
  { slug: 'auto_feeder', botho: 300, name: 'Auto-Feeder', setswana: 'Moima o Tima', effect: 'Feed every animal in your kraal in one tap.' },
  { slug: 'auto_helper', botho: 500, name: 'Auto-Helper', setswana: 'Mpho yo thusa', effect: 'Water and harvest for you while you are away.' },
] as const;

export function automationUnlockedAt(botho: number): (typeof AUTOMATION_LADDER)[number][] {
  return AUTOMATION_LADDER.filter((a) => botho >= a.botho);
}

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
 * R-C4 / docs/38 A3 — Botho granted per Pula donated to a Council Project, through
 * the capped credit path (I4). 1 is the decided rate; 2/Pula would let a funded
 * player hit the 50/day cap for P25, which reads as "buying standing". KgotlaService
 * imports this instead of redeclaring its own private copy.
 */
export const BOTHO_PER_PULA_DONATED = 1;

/**
 * docs/37 §6.3 / 38 A4 / R-C3 — the ONE sink for season stamps: a cosmetic
 * souvenir, bought only with stamps, never seeds/Pula/Botho/water/gameplay.
 * `chapter.service.spendTokens()` enforces that `purpose` is one of these SKUs
 * and `amount` equals its `stamps` price, so the price is server-authoritative.
 * Default (R-C3): one souvenir at 25 stamps — ~half a free-path chapter, so an
 * engaged player buys one per chapter and a completionist must choose.
 */
export const SEASON_SOUVENIRS: ReadonlyArray<{ sku: string; stamps: number; type: 'cosmetic' }> = [
  { sku: 'season_souvenir', stamps: 25, type: 'cosmetic' },
];

/* ------------------------------------------------------------- Fertilizer (G1) */
/**
 * 01 §Fertilization — a fertilizer is an inventory item consumed at apply time.
 * `bonus` is the fraction of eligible growth progress it adds (manure: +20%),
 * and `stages` is how many growth stages it covers (01: manure/compost one
 * stage, super two). The server enforces the window via
 * `crop_instances.fertilized_until_stage`; the Farm-screen button that exposes
 * `POST /plots/:id/fertilize` to players is still to ship — only `manure` has
 * an item in v1, so the other two types stay reserved.
 */
export interface FertilizerDef {
  /** Inventory item consumed on apply. */
  item: string;
  /** Fraction of eligible progress added while active. */
  bonus: number;
  /** Growth stages the dose covers. */
  stages: number;
}

export const FERTILIZERS: Record<string, FertilizerDef> = {
  manure: { item: 'manure', bonus: 0.2, stages: 1 },
  // Reserved — they need their own items first (docs/01 table):
  // compost: { item: 'compost', bonus: 0.1, stages: 1 },
  // super_fertilizer: { item: 'super_fertilizer', bonus: 0.3, stages: 2 },
};

/**
 * 02 §9 — community-project contribution is capped per day, deliberately, so the
 * thing the design pays best for cannot be multiplied by grinding. The spec fixes
 * the *principle* and leaves the number to us; 200 keeps a daily contributor well
 * ahead of a spreadsheet without letting a whale buy the leaderboard in a week.
 * FLAGGED for Princess Eugenia — this is an economic number and belongs in 02 §6
 * once confirmed.
 */
export const KGOTLA_DAILY_CONTRIBUTION_CAP = 200;

/* ------------------------------------------------------------------ Kgotla charges */
/**
 * docs/Screens/Kgotla/SPEC.md §5.1 — the daily charge allowance is a SHARED POOL:
 * three charges per farm per Botswana day across the whole council, not one per
 * elder. Five elders, three charges — the player must choose whom to serve, and
 * that choice is the decision the council chamber exists to create.
 */
export const KGOTLA_DAILY_CHARGE_POOL = 3;

/** §5.2 — regard granted per completed charge, alongside the currency rewards. */
export const REGARD_PER_CHARGE = 10;

/**
 * §4.1 — regard is not permanent. An elder who is not served forgets a little:
 * −2 regard per full 7-day period in which no charge for that elder was completed,
 * floored at 0.
 *
 * At +10 per charge a wholly neglected elder falls from Respected (75) to
 * Acquaintance (24) in about 26 weeks — slower than a chapter. It is a nudge to
 * keep visiting, never a punishment for taking a holiday.
 */
export const REGARD_DECAY = {
  points: 2,
  periodDays: 7,
  /** Surface a warning this long before the next period elapses (§4.1 "visible"):
   *  nobody is silently punished. */
  warningLeadHours: 24,
} as const;

/* ------------------------------------------------------------------ Monetisation */
export interface TopUpPack {
  slug: string;
  name: string;
  priceBwp: number;
  grantedMadi: number;
}

/**
 * docs/33 §2.3 / docs/34 §2.3 (DECIDED 2026-10-01) — packs grant **MADI**, not
 * Pula. Pula is earned-only (MVP/02 §3.1), which is what makes "a free player
 * reaches everything" structurally true instead of a promise.
 *
 * `1 Madi = BWP 1.00`. The bonus is a FLAT 10% on the three larger packs —
 * monotonic, capped, and explainable in one sentence ("bigger packs get a 10%
 * thank-you"). The old ladder rewarded P100/P250/P500, which is what pushed
 * the flagship to P500 — a purchase no Botswana mobile-money player makes by
 * accident.
 */
export const TOP_UP_PACKS: TopUpPack[] = [
  { slug: 'spark', name: 'Spark', priceBwp: 5, grantedMadi: 5 },
  { slug: 'farmer', name: 'Farmer', priceBwp: 20, grantedMadi: 20 },
  { slug: 'harvest', name: 'Harvest', priceBwp: 50, grantedMadi: 55 }, // flagship
  { slug: 'cattle', name: 'Cattle', priceBwp: 100, grantedMadi: 110 },
  { slug: 'export', name: 'Export', priceBwp: 250, grantedMadi: 275 },
];

/** The pack we expect most buyers to take, and the one every UI should feature. */
export const FLAGSHIP_PACK_SLUG = 'harvest';

/**
 * The bonus as a fraction, so the storefront can show it and the spec can
 * assert it: docs/34 §5 requires every pack to sit within 0–10%.
 */
export function packBonus(pack: TopUpPack): number {
  return pack.priceBwp === 0 ? 0 : (pack.grantedMadi - pack.priceBwp) / pack.priceBwp;
}
/** R4 / C5 — enforced per player per calendar day in BOTSWANA TIME (UTC+2), not server-local. */
export const DAILY_TOP_UP_CAP_BWP = 500;
export const BOTSWANA_UTC_OFFSET = '+02:00';

/**
 * docs/33 §2.2 / docs/34 §3.2 (DECIDED 2026-10-01) — the **Village Pass**
 * replaces the Guild subscription. One recurring product instead of a
 * subscription plus three boosts.
 *
 * Priced **M50/month**, not P49 BWP, because it is bought with Madi. Two things
 * were deliberately dropped from the old benefit list:
 *   - `weekly_pula_stone` — Pula Stone is a cut boost (docs/34 §3.3).
 *   - the weekly *mechanical* grant entirely, so there is no recurring free
 *     resource drip to budget around.
 *
 * `auto_helper` is the SAME behaviour the Botho-500 ladder grants free
 * (AUTOMATION_LADDER). Paying gets it early; playing gets it forever. It is a
 * chore remover, never a yield multiplier, which is what keeps it on the right
 * side of the no-pay-to-win line.
 */
export const VILLAGE_PASS = {
  slug: 'village_pass',
  /** Charged monthly, in whole Madi. */
  priceMadi: 50,
  days: 30,
  benefits: ['auto_helper', 'storage_bonus_50', 'monthly_festival_outfit', 'ad_free'],
} as const;

/**
 * @deprecated Renamed by docs/34 §3.2. Kept as an alias so existing callers keep
 * compiling; `slug` changed with it, so anything comparing to 'guild' must move.
 */
export const GUILD_SUBSCRIPTION = {
  slug: VILLAGE_PASS.slug,
  priceMadi: VILLAGE_PASS.priceMadi,
  days: VILLAGE_PASS.days,
  benefits: VILLAGE_PASS.benefits,
} as const;

/**
 * docs/34 §3.3 (DECIDED 2026-10-01) — **BOOSTS ARE CUT.**
 *
 * Pula Stone, Ancestral Ward and Breath of the Land were catalogued and sold
 * while no endpoint applied any of their effects (docs/KNOWN_LIMITATIONS.md).
 * `available: false` was the withdrawal; this removes them outright, so the
 * catalogue cannot advertise something that does nothing and cannot be
 * half-restored by a later merge.
 *
 * They are not gone forever — each returns only when EVERY effect in its
 * description actually works (docs/34 §6 "do-not-do" list). Re-adding one is a
 * deliberate act with a test, not a revert.
 */
export const BOOSTS: readonly never[] = [];
export const BOOST_SLUGS: readonly string[] = [];

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

/**
 * Seasonal maintenance — what keeps Poleto, Thapo and Setena alive after the
 * build (03 §3.5). A kraal in Botswana is never finished; that is not a chore,
 * it is the truth of the thing.
 *
 * docs/34 §Wave 1.3 (2026-10-01) — interval 90 → 30 days, and the per-cycle
 * bill is deliberately LEFT ALONE. Those two choices together matter:
 *
 *   bill/period is the recurring daily drain, so shortening the period by 3× is
 *   exactly what triples it (~P3 → ~P9.5/day, closing audit P1-8's "too small"
 *   finding), while the player's ANNUAL cost is unchanged. It is not more
 *   expensive — only more often, which is the whole point: a once-a-quarter
 *   lump followed by three months of nothing left the material economy dead
 *   between bills.
 *
 * (An earlier draft of docs/34 said "⅓ the bill on a 30-day rhythm". That is
 * self-cancelling — 1/3 bill over 1/3 period is the SAME daily rate, so it
 * would have fixed the lump while leaving P1-8 unfixed. The spec has been
 * corrected to match this arithmetic.)
 */
export const MAINTENANCE = {
  intervalDays: 30,
  costs: { kraal: { thapo: 2 }, boundary: { poleto: 3 }, water_source: { setena: 2 } },
  /** Hours before a due bill that the UI starts warning (never ambush a returner). */
  warningLeadHours: 24,
} as const;

/**
 * 3.8d — maintenance demand rises with the size of the estate (audit P1-8: the
 * recurring material sink was too small — P3.17/day — and scale-free). Every
 * building beyond the first adds a small multiple to each maintenance quote, so a
 * large farm's upkeep grows with the number of structures it must keep standing.
 * The coefficient is the single tuning knob; keep it small — a nudge, not a tax.
 */
export const MAINTENANCE_SCALE_PER_BUILDING = 0.05;

/** Multiplier applied to one maintenance cycle's Pula + material demand. */
export function maintenanceScaleFor(buildingCount: number): number {
  return 1 + MAINTENANCE_SCALE_PER_BUILDING * Math.max(0, buildingCount - 1);
}

/* --------------------------------------------------- Chapter market events */
/**
 * 3.3 / 30 §3.5 — every chapter carries a themed Co-op market event so the market
 * is never dead on a fresh install and the calendar is felt at the stall. The pool
 * is keyed by the real Botswana chapter slug (04 §9.1); `MarketService` seeds the
 * current chapter's event on first market read and rotates it when the chapter
 * changes. No schema change: the row lives in the existing `market_events` table.
 *
 * `effect` must match `getEventModifier`'s taxonomy (`grain` | `food` | `materials`
 * | `all` | <itemType>) and `multiplier` is the price multiplier (1.0 = no effect).
 */
export interface ChapterMarketEvent {
  name: string;
  description: string;
  effect: string;
  multiplier: number;
  /** How long the event stays live before the next rotation check (hours). */
  rotationHours: number;
}

export const CHAPTER_MARKET_EVENTS: Record<ChapterSlug, ChapterMarketEvent> = {
  pula: {
    name: 'Pula e tlile',
    description: 'The rains came — seed and grain demand swells at the Co-op.',
    effect: 'grain',
    multiplier: 1.4,
    rotationHours: 7 * 24,
  },
  phane: {
    name: 'Mophane Window',
    description: 'The Mophane harvest fills the market with food.',
    effect: 'food',
    multiplier: 1.3,
    rotationHours: 7 * 24,
  },
  moriti: {
    name: 'Moriti Scarcity',
    description: 'Dry season — water-hungry produce grows dear.',
    effect: 'food',
    multiplier: 1.2,
    rotationHours: 7 * 24,
  },
  letlhafula: {
    // docs/38 T-3 / E-14 — Act IV (Dikgakologo) is ploughing PREPARATION, not a
    // festival. The festival lives in Act II (phane). Re-scoped copy-only; the
    // grain-demand shape is unchanged.
    name: 'Ploughing Preparation',
    description: 'The ploughing season is declared — seed and grain demand swells for the scattering.',
    effect: 'grain',
    multiplier: 1.3,
    rotationHours: 7 * 24,
  },
};

/* ------------------------------------------------------------------ Starting state */
export const STARTING_PULA = 250;
export const STARTING_BOTHO = 0;
export const STARTING_STORAGE_TIER = 1;
/** New scenes start settled (04 §4.2). */
export const STARTING_KAGISO = 6;
