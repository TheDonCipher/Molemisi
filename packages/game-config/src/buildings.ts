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
  /** G6 — thatch is a building input (storage upgrades, the kraal), not a dead-end. */
  thatch?: number;
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
  capacityType: 'storage' | 'livestock' | 'water' | 'crafting_slots' | 'protection' | 'heritage';
  /** How many tiers this line actually has (D8 — only Storage has 3). */
  maxTier: number;
  wearPerHour: number;
  maintenanceCost: number;
  maintenanceIntervalDays: number;
  /** What a maintenance cycle consumes — permanent demand for crafted goods. */
  maintenanceMaterials?: BuildCost;
  spriteSheet: string;
  benefit: string;
  /**
   * Doc 11 §6.2 — true when the building's benefit applies WITHOUT the player
   * acting on it (the tank feeds growth, the kraal guards overnight, the
   * Heritage Tree remembers water). Surfaced as `is_automated` on
   * `GET /farms/current` and `GET /farms/:id/buildings`.
   */
  automated?: boolean;
  /**
   * Doc 11 §6 — Setlhare sa Boswa (Heritage Tree) adjacency: the plots directly
   * around the tree drink at `waterDemandMultiplier` of the normal rate — the
   * "Water Memory" endgame buff. Purely positive: it only ever saves water.
   */
  adjacency?: {
    /** Plot-grid width the buff is computed against (Farm Screen `md:grid-cols-4`). */
    gridColumns: number;
    /** How many plots the buff touches — the 4 immediately surrounding the tree. */
    adjacentPlots: number;
    /** 0.8 = 20% slower water demand on the neighbouring plots. */
    waterDemandMultiplier: number;
  };
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
    // G6 — thatch: the shed and storehouse are thatch-roofed, which is what turns
    // foraged reeds into a recurring building sink (03 §3.5 "re-ratching thatch").
    // `storageUpgradeCost` still reports the Pula line only; the materials are
    // charged by buildings.service alongside it, exactly like the Workshop's.
    upgradeCosts: [
      { currency: 2500, thatch: 6 },
      { currency: 12000, thatch: 12 },
    ],
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
    // G6 — a kraal roof is re-thatched as often as its poles are reset.
    baseCost: { currency: 1200, poleto: 6, thapo: 2, thatch: 4 },
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
  // Doc 11 §6 — Setlhare sa Boswa (The Heritage Tree), the endgame monument.
  // The REAL gate is the Guardian of Sesana title (Journal 100% AND Botho >= 500),
  // enforced SERVER-side in BuildingsService.constructBuilding against
  // profiles.is_guardian_of_sesana; `unlock` below is only the store's display
  // hint. wearPerHour 0 and no maintenance on purpose: a purely positive
  // mechanic must never become a chore or a decay timer.
  setlhare_sa_boswa: {
    id: 'setlhare_sa_boswa',
    name: 'Heritage Tree',
    setswana: 'Setlhare sa Boswa',
    description:
      'An ancient tree planted for the land you leave behind. Its shade remembers water — the plots around it drink more slowly.',
    unlock: { bothoGte: 500 },
    baseCost: { currency: 12000 },
    upgradeCosts: [],
    upgradeTimes: [],
    constructionTime: 120,
    capacity: 0,
    capacityType: 'heritage',
    maxTier: 1,
    wearPerHour: 0,
    maintenanceCost: 0,
    maintenanceIntervalDays: 0,
    spriteSheet: 'tiles/decorations/setlhare_sa_boswa.png',
    automated: true,
    // Water Memory: the 4 plots immediately around the tree (cross adjacency on
    // the 4-column grid) satisfy only 80% of their normal water demand — an
    // endless, passive saving, never a penalty (Doc 11 §6).
    adjacency: {
      gridColumns: 4,
      adjacentPlots: 4,
      waterDemandMultiplier: 0.8,
    },
    benefit:
      'The 4 plots around it drink at 80% water demand — the land remembers every rain you listened to.',
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

/* ==================================================== Deep Time Lore (Doc 11) */

/**
 * True when the building's benefit applies without the player acting on it —
 * the tank feeds growth, the kraal and boundary guard overnight, the Heritage
 * Tree remembers water. Storage and the Workshop wait for your hands, so they
 * are not automated. Surfaced as `is_automated` on `GET /farms/current`.
 */
const AUTOMATED_BUILDING_IDS = new Set([
  'water_source',
  'kraal',
  'farm_boundary',
  'setlhare_sa_boswa',
]);

export function isBuildingAutomated(buildingType: string): boolean {
  const resolved = LEGACY_ALIASES[buildingType] ?? buildingType;
  return AUTOMATED_BUILDING_IDS.has(resolved);
}

/**
 * Doc 11 §6 — cross adjacency of a plot slot on the Farm Screen grid: the plots
 * directly up / down / left / right (never diagonal, never row-wrap), clipped to
 * `[0, plotCount)`. Edge slots therefore return fewer than `adjacentPlots`
 * neighbours — a tree in the corner simply shades what it can.
 *
 * One implementation shared by the server (water-demand multiplier in
 * `WaterService`) and the client (golden-mist overlay), so the glow and the
 * saving can never disagree about which plots are blessed.
 */
export function adjacentPlotSlots(
  slotIndex: number,
  gridColumns: number,
  plotCount: number,
): number[] {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= plotCount) return [];
  if (!Number.isInteger(gridColumns) || gridColumns < 1) return [];

  const col = slotIndex % gridColumns;
  const row = Math.floor(slotIndex / gridColumns);
  const slots: number[] = [];

  const push = (r: number, c: number) => {
    // Guard the column FIRST: slot-1 / slot+1 would otherwise wrap into the
    // previous/next row at the grid edges.
    if (c < 0 || c >= gridColumns) return;
    const i = r * gridColumns + c;
    if (i >= 0 && i < plotCount) slots.push(i);
  };

  push(row - 1, col);
  push(row + 1, col);
  push(row, col - 1);
  push(row, col + 1);
  return slots;
}
