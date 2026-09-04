export * from './crops';
export * from './buildings';
export * from './livestock';
export * from './weather';
export * from './store';
export * from './theme';

// Game constants
export const GAME_VERSION = '0.1.0';
export const STARTING_CURRENCY = 100;
export const STARTING_ENERGY = 100;
export const MAX_PLOTS = 20;
export const STARTING_PLOTS = 4;
export const MAX_OFFLINE_HOURS = 24;
export const SELF_SUSTAINING_THRESHOLD_HOURS = 72;
export const SIMULATION_TICK_INTERVAL_MINUTES = 5;
export const MARKET_PRICE_UPDATE_INTERVAL_HOURS = 6;
export const MIN_PRICE_MULTIPLIER = 0.5;
export const MAX_PRICE_MULTIPLIER = 2.0;

// Level formula: 100 * (level ^ 1.5)
export function calculateLevelXpRequired(level: number): number {
  return Math.ceil(100 * Math.pow(level, 1.5));
}

// Daily bonus amounts
export const DAILY_BONUS = [10, 15, 20, 25, 30, 40, 50];

// XP rewards
export const XP_REWARDS = {
  PLANT_CROP: 5,
  HARVEST_CROP: 10,
  WATER_CROP: 2,
  FEED_ANIMAL: 3,
  COLLECT_PRODUCT: 8,
  CONSTRUCT_BUILDING: 25,
  UPGRADE_BUILDING: 50,
  MARKET_SALE: 5,
  COMPLETE_CONTRACT: 30,
  KGOTLA_DONATION: 15,
  BUSHVELD_DISCOVERY: 20,
} as const;
