import {
  CROPS,
  getCropConfig,
  getUnlockedCrops,
  calculateLevelXpRequired,
  XP_REWARDS,
  STARTING_CURRENCY,
  STARTING_PLOTS,
  MAX_PLOTS,
} from './index';

describe('Game Config', () => {
  // ========================================
  // Crop Configuration
  // ========================================
  describe('CROPS', () => {
    it('has all 11 crop types', () => {
      expect(Object.keys(CROPS)).toHaveLength(11);
    });

    it('each crop has required fields', () => {
      for (const [id, crop] of Object.entries(CROPS)) {
        expect(crop.id).toBe(id);
        expect(crop.name).toBeTruthy();
        expect(crop.growthStages).toBeGreaterThanOrEqual(3);
        expect(crop.timePerStage).toBeGreaterThan(0);
        expect(crop.waterDecayRate).toBeGreaterThan(0);
        expect(crop.yield.min).toBeGreaterThan(0);
        expect(crop.yield.max).toBeGreaterThanOrEqual(crop.yield.min);
        expect(crop.seedCost).toBeGreaterThan(0);
        expect(crop.basePrice).toBeGreaterThan(0);
      }
    });

    it('yield max is always >= yield min', () => {
      for (const crop of Object.values(CROPS)) {
        expect(crop.yield.max).toBeGreaterThanOrEqual(crop.yield.min);
      }
    });

    it('sorghum has 4 growth stages', () => {
      expect(CROPS.sorghum.growthStages).toBe(4);
    });

    it('unlock levels are monotonically increasing', () => {
      const levels = Object.values(CROPS).map((c) => c.unlockLevel);
      // Each subsequent crop should require a higher or equal level
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
      }
    });
  });

  // ========================================
  // getCropConfig
  // ========================================
  describe('getCropConfig', () => {
    it('returns config for valid crop type', () => {
      const config = getCropConfig('sorghum');
      expect(config).toBeDefined();
      expect(config!.name).toBe('Sorghum');
    });

    it('returns undefined for unknown crop', () => {
      const config = getCropConfig('nonexistent');
      expect(config).toBeUndefined();
    });

    it('returns same reference for same input', () => {
      const a = getCropConfig('maize');
      const b = getCropConfig('maize');
      expect(a).toBe(b);
    });
  });

  // ========================================
  // getUnlockedCrops
  // ========================================
  describe('getUnlockedCrops', () => {
    it('level 1 returns only level-1 crops', () => {
      const crops = getUnlockedCrops(1);
      expect(crops.length).toBeGreaterThanOrEqual(1);
      crops.forEach((c) => expect(c.unlockLevel).toBeLessThanOrEqual(1));
    });

    it('level 10 returns all crops', () => {
      const crops = getUnlockedCrops(10);
      expect(crops.length).toBe(Object.keys(CROPS).length);
    });

    it('level 0 returns no crops', () => {
      const crops = getUnlockedCrops(0);
      expect(crops.length).toBe(0);
    });

    it('returns more crops at higher levels', () => {
      const low = getUnlockedCrops(1);
      const high = getUnlockedCrops(8);
      expect(high.length).toBeGreaterThanOrEqual(low.length);
    });
  });

  // ========================================
  // XP & Progression
  // ========================================
  describe('XP & Progression', () => {
    it('calculateLevelXpRequired(1) returns a positive number', () => {
      expect(calculateLevelXpRequired(1)).toBeGreaterThan(0);
    });

    it('XP requirement increases with level', () => {
      for (let l = 1; l < 10; l++) {
        expect(calculateLevelXpRequired(l + 1)).toBeGreaterThan(calculateLevelXpRequired(l));
      }
    });

    it('level 1 requires 100 XP', () => {
      // 100 * (1 ^ 1.5) = 100
      expect(calculateLevelXpRequired(1)).toBe(100);
    });

    it('XP_REWARDS has all required reward types', () => {
      expect(XP_REWARDS.PLANT_CROP).toBeGreaterThan(0);
      expect(XP_REWARDS.HARVEST_CROP).toBeGreaterThan(0);
      expect(XP_REWARDS.WATER_CROP).toBeGreaterThan(0);
      expect(XP_REWARDS.FEED_ANIMAL).toBeGreaterThan(0);
      expect(XP_REWARDS.COLLECT_PRODUCT).toBeGreaterThan(0);
      expect(XP_REWARDS.CONSTRUCT_BUILDING).toBeGreaterThan(0);
      expect(XP_REWARDS.MARKET_SALE).toBeGreaterThan(0);
    });

    it('harvest gives more XP than planting', () => {
      expect(XP_REWARDS.HARVEST_CROP).toBeGreaterThan(XP_REWARDS.PLANT_CROP);
    });

    it('STARTING_CURRENCY is positive', () => {
      expect(STARTING_CURRENCY).toBeGreaterThan(0);
    });

    it('STARTING_PLOTS is positive and <= MAX_PLOTS', () => {
      expect(STARTING_PLOTS).toBeGreaterThan(0);
      expect(STARTING_PLOTS).toBeLessThanOrEqual(MAX_PLOTS);
    });
  });

  // ========================================
  // Game Constants
  // ========================================
  describe('Game Constants', () => {
    it('MAX_PLOTS is reasonable', () => {
      expect(MAX_PLOTS).toBeGreaterThanOrEqual(4);
      expect(MAX_PLOTS).toBeLessThanOrEqual(50);
    });
  });
});
