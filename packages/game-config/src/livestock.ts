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
  feedType: string;
  productionCycleHours: number;
  productType: string;
  productQuantity: number;
  purchaseCost: number;
  hungerDecayRate: number;
  healthDecayRate: number;
  happinessDecayRate: number;
  buildingRequired: string;
  spriteSheet: string;
}

export const ANIMALS: Record<string, AnimalConfig> = {
  chicken: {
    id: 'chicken',
    name: 'Chicken',
    description: 'A friendly chicken that lays eggs daily.',
    feedPerDay: 2,
    feedType: 'grain',
    productionCycleHours: 12,
    productType: 'egg',
    productQuantity: 2,
    purchaseCost: 50,
    hungerDecayRate: 0.15,
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
    feedType: 'hay',
    productionCycleHours: 24,
    productType: 'goat_milk',
    productQuantity: 1,
    purchaseCost: 150,
    hungerDecayRate: 0.12,
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
    feedType: 'hay',
    productionCycleHours: 24,
    productType: 'cow_milk',
    productQuantity: 3,
    purchaseCost: 400,
    hungerDecayRate: 0.1,
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
    feedType: 'mixed_feed',
    productionCycleHours: 48,
    productType: 'truffle',
    productQuantity: 1,
    purchaseCost: 300,
    hungerDecayRate: 0.13,
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
