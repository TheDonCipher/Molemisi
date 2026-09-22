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
 */

export interface AnimalConfig {
  id: string;
  name: string;
  description: string;
  feedPerDay: number;
  feedType: string;
  productionCycleHours: number;
  productType: string;
  productQuantity: number;
  baseProductPrice: number;
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
    baseProductPrice: 5,
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
    baseProductPrice: 15,
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
    baseProductPrice: 15,
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
    baseProductPrice: 50,
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
