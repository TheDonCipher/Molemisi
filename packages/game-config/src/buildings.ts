/**
 * Buildings — docs/MVP/03_Core_Systems.md §4, 01 §5 (D8, D9), 02 §6.5.
 *
 * | Building      | Tiers | Notes                                             |
 * |---------------|-------|---------------------------------------------------|
 * | Storage       | 3     | Basket / Shed / Storehouse — the ONLY tiered line  |
 * | Water Source  | 1     | Flat, requires maintenance                        |
 * | Kraal         | 1     | Flat, maintenance, protects livestock             |
 * | Farm Boundary | 1     | Flat, maintenance, protects crops                 |
 * | Crafting      | 1 + 2 | Unlocks the 2nd and 3rd crafting slots (C22)      |
 *
 * D3 — visual tier-ups are React sprite swaps, not Phaser.
 * D5 — levels and XP are RETIRED. Nothing here is level-gated; the real gate is
 *      `unlock` (Botho), and `unlockLevel` has been deleted entirely (C12).
 *
 * 03 §3.5 — seasonal maintenance is what stops Poleto, Thapo and Setena from becoming
 * dead content within weeks. A kraal in Botswana is never finished; that is not a
 * chore, it is the truth of the thing.
 */

export interface BuildCost {
  currency: number;
  poleto?: number;
  thapo?: number;
  setena?: number;
}

export interface BuildingConfig {
  id: string;
  name: string;
  setswana: string;
  description: string;
  /** Real gate, if any. null = available from the start. */
  unlock: { bothoGte: number } | null;
  baseCost: BuildCost;
  upgradeCosts: BuildCost[];
  /** Minutes per upgrade step. */
  upgradeTimes: number[];
  constructionTime: number;
  capacity: number;
  capacityType: 'storage' | 'livestock' | 'water' | 'crafting_slots' | 'protection';
  /** How many tiers this line actually has (D8 — only Storage has 3). */
  maxTier: number;
  wearPerHour: number;
  maintenanceCost: number;
  maintenanceIntervalDays: number;
  /** What a maintenance cycle consumes — permanent demand for crafted goods. */
  maintenanceMaterials?: BuildCost;
  spriteSheet: string;
  benefit: string;
}

export const BUILDINGS: Record<string, BuildingConfig> = {
  storage: {
    id: 'storage',
    name: 'Storage',
    setswana: 'Polokelo',
    description: 'How much you can carry. The only building line in v1 that grows.',
    unlock: null,
    baseCost: { currency: 0 },
    // Not fixed in 02 §6.5 (which gives slot caps and land costs only). Chosen to sit
    // far below the land ladder so storage never competes with land for Pula.
    upgradeCosts: [{ currency: 2500 }, { currency: 12000 }],
    upgradeTimes: [240, 480],
    constructionTime: 0,
    capacity: 24,
    capacityType: 'storage',
    maxTier: 3,
    wearPerHour: 0,
    maintenanceCost: 0,
    maintenanceIntervalDays: 0,
    spriteSheet: 'ui/items/building_barn.png',
    benefit: 'Basket 24 → Shed 48 → Storehouse 96 slots. Guild subscribers get +50% on top.',
  },
  water_source: {
    id: 'water_source',
    name: 'Jojo Tank',
    setswana: 'Tanka ya Metsi',
    description: 'A green tank on a stand. In Botswana this is the difference between a farm and a garden.',
    unlock: null,
    baseCost: { currency: 800, setena: 4 },
    upgradeCosts: [],
    upgradeTimes: [],
    constructionTime: 180,
    capacity: 60,
    capacityType: 'water',
    maxTier: 1,
    wearPerHour: 0.004,
    maintenanceCost: 60,
    maintenanceIntervalDays: 90,
    maintenanceMaterials: { currency: 0, setena: 2 },
    spriteSheet: 'ui/items/building_jojo_tank.png',
    benefit: 'Holds 60 units. An empty tank stops growth — it never kills a crop.',
  },
  kraal: {
    id: 'kraal',
    name: 'Kraal',
    setswana: 'Lesaka',
    description: 'A thorn-branch enclosure. Keeps the livestock in and the jackals out.',
    unlock: null,
    baseCost: { currency: 1200, poleto: 6, thapo: 2 },
    upgradeCosts: [],
    upgradeTimes: [],
    constructionTime: 240,
    capacity: 12,
    capacityType: 'livestock',
    maxTier: 1,
    wearPerHour: 0.006,
    maintenanceCost: 90,
    maintenanceIntervalDays: 90,
    maintenanceMaterials: { currency: 0, thapo: 2 },
    spriteSheet: 'ui/items/building_paddock.png',
    benefit: 'Protects livestock from overnight raids.',
  },
  farm_boundary: {
    id: 'farm_boundary',
    name: 'Farm Boundary',
    setswana: 'Legora',
    description: 'A fence. Baboons can climb it; they will still think twice.',
    unlock: null,
    baseCost: { currency: 1500, poleto: 8, thapo: 3 },
    upgradeCosts: [],
    upgradeTimes: [],
    constructionTime: 240,
    capacity: 0,
    capacityType: 'protection',
    maxTier: 1,
    wearPerHour: 0.006,
    maintenanceCost: 90,
    maintenanceIntervalDays: 90,
    maintenanceMaterials: { currency: 0, poleto: 3 },
    spriteSheet: 'ui/items/building_fence.png',
    benefit: 'Protects crops from overnight wildlife raids.',
  },
  crafting: {
    id: 'crafting',
    name: 'Workshop',
    setswana: 'Lefelo la Tiro',
    description: 'One slot to start. Two more, and crafting stops being a queue.',
    unlock: null,
    baseCost: { currency: 600, poleto: 4 },
    // C22 — the 2nd and 3rd concurrent crafting slots. This swings crafting income
    // roughly tenfold, so it cannot be left unspecified.
    upgradeCosts: [
      { currency: 3000, poleto: 6, setena: 4 },
      { currency: 9000, poleto: 10, setena: 8 },
    ],
    upgradeTimes: [180, 360],
    constructionTime: 120,
    capacity: 1,
    capacityType: 'crafting_slots',
    maxTier: 3,
    wearPerHour: 0.003,
    maintenanceCost: 45,
    maintenanceIntervalDays: 90,
    spriteSheet: 'ui/items/building_mill.png',
    benefit: 'Unlocks a 2nd and 3rd concurrent crafting slot.',
  },
};

/**
 * Legacy ids from before the v1 building list. Existing databases hold rows keyed
 * these ways; without an alias a lookup returns undefined and the service crashes on
 * `.name`. They resolve to the nearest v1 equivalent.
 */
const LEGACY_ALIASES: Record<string, string> = {
  well: 'water_source',
  barn: 'storage',
  coop: 'kraal',
  goat_pen: 'kraal',
  paddock: 'kraal',
  pig_pen: 'kraal',
  mill: 'crafting',
};

export function getBuildingConfig(buildingType: string): BuildingConfig | undefined {
  return BUILDINGS[LEGACY_ALIASES[buildingType] ?? buildingType];
}

export const BUILDING_IDS = Object.keys(BUILDINGS);

export function getUnlockedBuildings(_level?: number): BuildingConfig[] {
  return Object.values(BUILDINGS);
}

/**
 * 03 §4 — how many concurrent crafting slots the player has unlocked.
 * One by default; the Workshop's two upgrades add one each (max 3).
 */
export function craftingSlotsFor(workshopTier: number): number {
  return Math.min(3, 1 + Math.max(0, workshopTier - 1));
}
