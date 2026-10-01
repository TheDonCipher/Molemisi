/**
 * Livestock — docs/MVP/03_Core_Systems.md §5.
 *
 * D5/C12 — levels and XP are RETIRED. Animals are NOT level-gated (the old
 * `unlockLevel` has been deleted). Progression is the Pura/Botho/Journal pillar
 * set, so an animal is available as soon as the player can pay its
 * `purchaseCost` and has the required building. The `getUnlockedAnimals(level)`
 * helper that filtered on a level is gone too.
 *
 * `buildingRequired` is 'kraal' for every animal — the v1 building list (D8)
 * has ONE livestock building. The legacy per-animal pens (coop, goat_pen,
 * paddock, pig_pen) alias to kraal in `getBuildingConfig`, but
 * `livestock.service` queries the buildings table by raw `building_type`, so
 * keeping a legacy id here made every animal unpurchasable.
 *
 * G3 — there is no `baseProductPrice` on the animal anymore. The price of
 * record for a product is the ItemDef's `baseValue` (see `productValuePula`),
 * so an animal and its item can never drift into two prices again.
 */

import { ITEMS } from './items';

export interface AnimalConfig {
  id: string;
  name: string;
  description: string;
  feedPerDay: number;
  /**
   * R2/30-G3 — the inventory slug `feedAnimal` actually debits. This MUST be a
   * real `ITEMS` slug: the audit found `grain`/`hay`/`mixed_feed` were declared
   * but existed nowhere, so feeding could never be charged. Mapped to the crops
   * the client's `FEED_INFO` mirror already shows.
   *
   * docs/34 §Wave 1.1 (2026-10-01) — ALL FOUR now eat `sorghum` (baseValue P3),
   * the cheapest and most natural fodder ("the grain that carries a household
   * through the dry months", crops.ts). They used to be split sorghum/herbs,
   * which fed the P25 herbs to animals whose goods sell for P5–P15 and made
   * three of the four permanently loss-making. Herbs keep their livestock role
   * as MEDICINE instead — `TREATMENT_ITEM` — a better fit than fodder.
   */
  feedType: string;
  productionCycleHours: number;
  productType: string;
  productQuantity: number;
  purchaseCost: number;
  /**
   * R2/30-G10.1 — retuned from 0.10–0.15/h to a ~24 h feed cycle. Acceptance
   * criterion (docs/30 Pass 1 task 1.6): ONE visit per real day keeps a fed
   * animal above hunger 0.5 and still producing. With feeding topping hunger to
   * 1.0, 1.0 − 0.02×24 = 0.52 > 0.5. The doc's 0.035–0.05/h suggestion fails
   * that criterion arithmetically (1.0 − 0.035×24 = 0.16), so the criterion wins.
   */
  hungerDecayRate: number;
  healthDecayRate: number;
  happinessDecayRate: number;
  buildingRequired: string;
  spriteSheet: string;
}

/**
 * R1/30-1.4 — health decays only after this many CONSECUTIVE hours at
 * `hunger === 0` (the "starvation window"). One missed visit is a nudge, not a
 * death: from a full feed (hunger 1.0) an animal takes 50 h to reach zero at
 * 0.02/h, then 12 h more before health moves at all — a ~2.5-day absence with
 * zero health loss, and the `treat` recovery path behind that.
 */
export const STARVATION_ONSET_HOURS = 12;

/** R1/30-1.1 — the item a `treat` consumes, and the health it restores. */
export const TREATMENT_ITEM = 'herbs';
export const TREATMENT_HEALTH = 0.6;

/** R1/30-1.2 — a sick animal still eats, but gains only this much hunger. */
export const SICK_FEED_GAIN = 0.15;


export const ANIMALS: Record<string, AnimalConfig> = {
  chicken: {
    id: 'chicken',
    name: 'Chicken',
    description: 'A friendly chicken that lays eggs daily.',
    feedPerDay: 2,
    feedType: 'sorghum',
    productionCycleHours: 12,
    productType: 'egg',
    productQuantity: 2,
    purchaseCost: 50,
    hungerDecayRate: 0.02,
    healthDecayRate: 0.1,
    happinessDecayRate: 0.05,
    buildingRequired: 'kraal',
    spriteSheet: 'animal_chicken.png',
  },
  goat: {
    id: 'goat',
    name: 'Goat',
    description: 'A hardy goat that produces milk.',
    // docs/34 §Wave 1.1 — feed was `herbs` (baseValue P25), so a goat burned
    // P100/day of fodder to make P15/day of milk: -P85/day, permanently
    // loss-making. Sorghum (P3) is the natural fodder and keeps the sink
    // inside the crop economy. Two milk a day gives a P21/day margin, below
    // the top crops (P26-41) so animals complement rather than dominate.
    feedPerDay: 3,
    feedType: 'sorghum',
    productionCycleHours: 24,
    productType: 'goat_milk',
    productQuantity: 2,
    purchaseCost: 150,
    hungerDecayRate: 0.02,
    healthDecayRate: 0.08,
    happinessDecayRate: 0.04,
    buildingRequired: 'kraal',
    spriteSheet: 'animal_goat.png',
  },
  cow: {
    id: 'cow',
    name: 'Cow',
    description: 'A dairy cow that produces milk.',
    // docs/34 §Wave 1.1 — was 8 herbs/day (P200) for P45/day of milk: -P155/day.
    // The worst animal in the game by a wide margin. Now P18 of sorghum
    // against P45 of milk = P27/day, the strongest animal but still under
    // morula (P40.63) — a late-game earner, not an endgame shortcut.
    feedPerDay: 6,
    feedType: 'sorghum',
    productionCycleHours: 24,
    productType: 'cow_milk',
    productQuantity: 3,
    purchaseCost: 400,
    hungerDecayRate: 0.02,
    healthDecayRate: 0.06,
    happinessDecayRate: 0.03,
    buildingRequired: 'kraal',
    spriteSheet: 'animal_cow.png',
  },
  guinea_fowl: {
    id: 'guinea_fowl',
    name: 'Guinea Fowl',
    description: 'A speckled guinea fowl whose eggs are a bushveld delicacy.',
    // docs/34 §Wave 1.1 — 6 sorghum/day (P18) against P16 of eggs was P2/day
    // NEGATIVE. At 3/day it is P7/day positive: the premium-egg bird earns
    // its keep slowly, which is the point of it.
    feedPerDay: 3,
    feedType: 'sorghum',
    productionCycleHours: 36,
    productType: 'guinea_fowl_egg',
    productQuantity: 2,
    purchaseCost: 300,
    hungerDecayRate: 0.02,
    healthDecayRate: 0.07,
    happinessDecayRate: 0.04,
    buildingRequired: 'kraal',
    spriteSheet: 'animal_guinea_fowl.png',
  },
};

export function getAnimalConfig(animalType: string): AnimalConfig | undefined {
  return ANIMALS[animalType];
}

/**
 * R2/30-1.3 — the animal → inventory-slug feed map, derived from `ANIMALS` so
 * the two can never drift. This is the `FEED_ITEM` map the client's `FEED_INFO`
 * mirror claims to follow; the server now reads it on every feed.
 */
export const FEED_ITEM: Record<string, string> = Object.fromEntries(
  Object.values(ANIMALS).map((a) => [a.id, a.feedType]),
);

/**
 * G1 — every collect is also a muck-out: this many manure ride along with the
 * product, from every animal (03 §5: "produce eggs, milk and manure"; 01 §Animal
 * Products: "Manure — all livestock"). The service grants both in ONE combined
 * slot check so a full store fails the whole collect (G4) rather than
 * duplicating the byproduct on retry.
 */
export const MANURE_PER_COLLECT = 1;

/**
 * Livestock productType -> inventory item slug (02 §6.2). The bridge is
 * explicit because the two tables name things differently ('egg' vs 'eggs').
 * It lives here — with the animals — so adding a product means touching one
 * file, and so the item's price of record (ItemDef.baseValue) is always one
 * lookup away. Every productType MUST have an entry; a missing one is a
 * config error the spec suite fails on.
 */
export const PRODUCT_ITEM: Record<string, string> = {
  egg: 'eggs',
  goat_milk: 'milk',
  cow_milk: 'milk',
  guinea_fowl_egg: 'guinea_fowl_egg',
};

/** The inventory item an animal's product lands in. */
export function productItemSlug(animal: AnimalConfig): string | undefined {
  return PRODUCT_ITEM[animal.productType];
}

/**
 * The price of record for one unit of the animal's product — the ItemDef's
 * baseValue (G3). Returns null when the product maps to no item, which the
 * tests treat as a config error.
 */
export function productValuePula(animal: AnimalConfig): number | null {
  const slug = productItemSlug(animal);
  const def = slug ? ITEMS[slug] : undefined;
  return def ? def.baseValue : null;
}

/**
 * docs/34 §Wave 1.1 — an animal's margin per day at CATALOGUE prices, before
 * the 5% Co-op tax: `(24h / cycle) × productQuantity × productValue` minus
 * `feedPerDay × feedValue`.
 *
 * This exists so the "every animal is net-positive" rule is one assertion
 * rather than a paragraph someone has to re-derive by hand. It was added
 * *because* the feed map shipped the P25 herbs to animals whose goods sell
 * for P5–P15: the goat ran at -P85/day and the cow at -P155/day, and nobody
 * caught it because the number was only ever reasoned about in prose.
 *
 * Tax is deliberately excluded from BOTH sides so the figure is the animal's
 * own economics, not a claim about a particular day's market.
 */
export function animalNetPerDay(animal: AnimalConfig): number {
  const product = productValuePula(animal);
  const feed = ITEMS[animal.feedType]?.baseValue ?? 0;
  if (product === null) return Number.NaN; // config error, not an economics result
  const producesPerDay = (24 / animal.productionCycleHours) * animal.productQuantity;
  return producesPerDay * product - animal.feedPerDay * feed;
}
