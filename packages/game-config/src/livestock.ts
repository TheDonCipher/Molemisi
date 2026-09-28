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
   * the client's `FEED_INFO` mirror already shows (chicken/pig → sorghum,
   * goat/cow → herbs) — one source of truth, zero new items, and the feed sink
   * stays inside the crop economy (docs/31 P0-2's "or map feed to crops" option).
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
    feedPerDay: 4,
    feedType: 'herbs',
    productionCycleHours: 24,
    productType: 'goat_milk',
    productQuantity: 1,
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
    feedPerDay: 8,
    feedType: 'herbs',
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
  pig: {
    id: 'pig',
    name: 'Pig',
    description: 'A pig that occasionally finds truffles.',
    feedPerDay: 6,
    feedType: 'sorghum',
    productionCycleHours: 48,
    productType: 'truffle',
    productQuantity: 1,
    purchaseCost: 300,
    hungerDecayRate: 0.02,
    healthDecayRate: 0.07,
    happinessDecayRate: 0.04,
    buildingRequired: 'kraal',
    spriteSheet: 'animal_pig.png',
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
  truffle: 'truffle',
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
