export interface BuildingConfig {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  baseCost: { currency: number; wood?: number; stone?: number; iron?: number };
  upgradeCosts: Array<{ currency: number; wood?: number; stone?: number; iron?: number }>;
  constructionTime: number; // minutes
  upgradeTimes: number[]; // minutes per level
  capacity: number;
  capacityType: string; // 'chicken' | 'goat' | 'cow' | 'pig' | 'storage'
  wearPerHour: number;
  maintenanceCost: number;
  maintenanceIntervalDays: number;
  spriteSheet: string;
}

export const BUILDINGS: Record<string, BuildingConfig> = {
  well: {
    id: 'well',
    name: 'Well',
    description: 'Provides unlimited water for your farm.',
    unlockLevel: 1,
    baseCost: { currency: 200, stone: 10 },
    upgradeCosts: [
      { currency: 400, stone: 20 },
      { currency: 800, stone: 40 },
    ],
    constructionTime: 30,
    upgradeTimes: [45, 60],
    capacity: -1, // unlimited
    capacityType: 'water',
    wearPerHour: 0.005,
    maintenanceCost: 50,
    maintenanceIntervalDays: 14,
    spriteSheet: 'building_well.png',
  },
  coop: {
    id: 'coop',
    name: 'Chicken Coop',
    description: 'A cozy shelter for chickens.',
    unlockLevel: 1,
    baseCost: { currency: 150, wood: 5 },
    upgradeCosts: [
      { currency: 300, wood: 10 },
      { currency: 600, wood: 20 },
    ],
    constructionTime: 20,
    upgradeTimes: [30, 45],
    capacity: 10,
    capacityType: 'chicken',
    wearPerHour: 0.005,
    maintenanceCost: 37,
    maintenanceIntervalDays: 14,
    spriteSheet: 'building_coop.png',
  },
  barn: {
    id: 'barn',
    name: 'Barn',
    description: 'Storage for harvested crops and materials.',
    unlockLevel: 2,
    baseCost: { currency: 500, wood: 20, stone: 10 },
    upgradeCosts: [
      { currency: 1000, wood: 40, stone: 20 },
      { currency: 2000, wood: 80, stone: 40 },
    ],
    constructionTime: 60,
    upgradeTimes: [90, 120],
    capacity: 50,
    capacityType: 'storage',
    wearPerHour: 0.003,
    maintenanceCost: 125,
    maintenanceIntervalDays: 14,
    spriteSheet: 'building_barn.png',
  },
  goat_pen: {
    id: 'goat_pen',
    name: 'Goat Pen',
    description: 'Shelter for goats.',
    unlockLevel: 3,
    baseCost: { currency: 300, wood: 10 },
    upgradeCosts: [
      { currency: 600, wood: 20 },
      { currency: 1200, wood: 40 },
    ],
    constructionTime: 30,
    upgradeTimes: [45, 60],
    capacity: 5,
    capacityType: 'goat',
    wearPerHour: 0.005,
    maintenanceCost: 75,
    maintenanceIntervalDays: 14,
    spriteSheet: 'building_goat_pen.png',
  },
  mill: {
    id: 'mill',
    name: 'Mill',
    description: 'Process grain into flour.',
    unlockLevel: 4,
    baseCost: { currency: 400, stone: 15, wood: 5 },
    upgradeCosts: [
      { currency: 800, stone: 30, wood: 10 },
      { currency: 1600, stone: 60, wood: 20 },
    ],
    constructionTime: 45,
    upgradeTimes: [60, 90],
    capacity: 5,
    capacityType: 'production',
    wearPerHour: 0.004,
    maintenanceCost: 100,
    maintenanceIntervalDays: 14,
    spriteSheet: 'building_mill.png',
  },
  paddock: {
    id: 'paddock',
    name: 'Paddock',
    description: 'Open area for cattle.',
    unlockLevel: 5,
    baseCost: { currency: 800, wood: 30, stone: 15 },
    upgradeCosts: [
      { currency: 1600, wood: 60, stone: 30 },
      { currency: 3200, wood: 120, stone: 60 },
    ],
    constructionTime: 90,
    upgradeTimes: [120, 150],
    capacity: 3,
    capacityType: 'cow',
    wearPerHour: 0.006,
    maintenanceCost: 200,
    maintenanceIntervalDays: 14,
    spriteSheet: 'building_paddock.png',
  },
  pig_pen: {
    id: 'pig_pen',
    name: 'Pig Pen',
    description: 'Enclosed area for pigs.',
    unlockLevel: 6,
    baseCost: { currency: 600, wood: 20, stone: 10 },
    upgradeCosts: [
      { currency: 1200, wood: 40, stone: 20 },
      { currency: 2400, wood: 80, stone: 40 },
    ],
    constructionTime: 60,
    upgradeTimes: [90, 120],
    capacity: 4,
    capacityType: 'pig',
    wearPerHour: 0.005,
    maintenanceCost: 150,
    maintenanceIntervalDays: 14,
    spriteSheet: 'building_pig_pen.png',
  },
};

export function getBuildingConfig(buildingType: string): BuildingConfig | undefined {
  return BUILDINGS[buildingType];
}

export function getUnlockedBuildings(level: number): BuildingConfig[] {
  return Object.values(BUILDINGS).filter((b) => b.unlockLevel <= level);
}
