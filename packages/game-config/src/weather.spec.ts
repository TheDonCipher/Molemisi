import {
  SEASONS,
  generateWeather,
  getNextSeason,
  getSeasonGrowthModifier,
  getTemperature,
  getHumidity,
  WEATHER_CHANGE_INTERVAL,
  SEASON_DURATION_HOURS,
  type Season,
  type WeatherType,
} from './weather';

describe('Weather System', () => {
  // ========================================
  // Season Configuration
  // ========================================
  describe('SEASONS', () => {
    it('has all 4 seasons', () => {
      expect(Object.keys(SEASONS)).toHaveLength(4);
      expect(SEASONS.spring).toBeDefined();
      expect(SEASONS.summer).toBeDefined();
      expect(SEASONS.autumn).toBeDefined();
      expect(SEASONS.winter).toBeDefined();
    });

    it('each season has valid growth modifier', () => {
      for (const season of Object.values(SEASONS)) {
        expect(season.growthModifier).toBeGreaterThan(0);
        expect(season.growthModifier).toBeLessThanOrEqual(2.0);
      }
    });

    it('winter has reduced growth modifier', () => {
      expect(SEASONS.winter.growthModifier).toBeLessThan(1.0);
    });

    it('spring has boosted growth modifier', () => {
      expect(SEASONS.spring.growthModifier).toBeGreaterThan(1.0);
    });

    it('weather probabilities sum to approximately 1.0', () => {
      for (const season of Object.values(SEASONS)) {
        const sum = Object.values(season.weatherProbabilities).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 2);
      }
    });

    it('winter has frost risk', () => {
      expect(SEASONS.winter.frostRisk).toBeGreaterThan(0);
    });

    it('summer has highest pest modifier', () => {
      expect(SEASONS.summer.pestModifier).toBeGreaterThanOrEqual(
        SEASONS.spring.pestModifier,
      );
    });
  });

  // ========================================
  // getNextSeason
  // ========================================
  describe('getNextSeason', () => {
    it('spring → summer', () => {
      expect(getNextSeason('spring')).toBe('summer');
    });

    it('summer → autumn', () => {
      expect(getNextSeason('summer')).toBe('autumn');
    });

    it('autumn → winter', () => {
      expect(getNextSeason('autumn')).toBe('winter');
    });

    it('winter → spring (cycles)', () => {
      expect(getNextSeason('winter')).toBe('spring');
    });
  });

  // ========================================
  // getSeasonGrowthModifier
  // ========================================
  describe('getSeasonGrowthModifier', () => {
    it('returns a number for each season', () => {
      const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
      for (const season of seasons) {
        const mod = getSeasonGrowthModifier(season);
        expect(typeof mod).toBe('number');
        expect(mod).toBeGreaterThan(0);
      }
    });

    it('winter has the lowest growth modifier', () => {
      const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
      const mods = seasons.map((s) => getSeasonGrowthModifier(s));
      const winterMod = getSeasonGrowthModifier('winter');
      expect(winterMod).toBe(Math.min(...mods));
    });
  });

  // ========================================
  // generateWeather
  // ========================================
  describe('generateWeather', () => {
    it('returns valid WeatherState for each season', () => {
      const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
      for (const season of seasons) {
        const weather = generateWeather(season);
        expect(weather.type).toBeDefined();
        expect(['clear', 'cloudy', 'rain', 'storm', 'drought']).toContain(weather.type);
        expect(typeof weather.temperature).toBe('number');
        expect(typeof weather.humidity).toBe('number');
        expect(weather.season).toBe(season);
      }
    });

    it('temperature is within reasonable range', () => {
      for (let i = 0; i < 50; i++) {
        const weather = generateWeather('summer');
        expect(weather.temperature).toBeGreaterThanOrEqual(10);
        expect(weather.temperature).toBeLessThanOrEqual(50);
      }
    });

    it('humidity is between 0 and 1', () => {
      for (let i = 0; i < 50; i++) {
        const weather = generateWeather('spring');
        expect(weather.humidity).toBeGreaterThanOrEqual(0);
        expect(weather.humidity).toBeLessThanOrEqual(1);
      }
    });

    it('produces varied weather types over many calls', () => {
      const types = new Set<WeatherType>();
      for (let i = 0; i < 200; i++) {
        const weather = generateWeather('spring');
        types.add(weather.type);
      }
      // Should produce at least 3 different types over 200 calls
      expect(types.size).toBeGreaterThanOrEqual(3);
    });
  });

  // ========================================
  // getTemperature
  // ========================================
  describe('getTemperature', () => {
    it('summer temperatures are higher than winter', () => {
      // Run many times to average out randomness
      let summerTotal = 0;
      let winterTotal = 0;
      const N = 100;
      for (let i = 0; i < N; i++) {
        summerTotal += getTemperature('summer', 'clear');
        winterTotal += getTemperature('winter', 'clear');
      }
      expect(summerTotal / N).toBeGreaterThan(winterTotal / N);
    });

    it('drought is warmer than rain', () => {
      let droughtTotal = 0;
      let rainTotal = 0;
      const N = 100;
      for (let i = 0; i < N; i++) {
        droughtTotal += getTemperature('summer', 'drought');
        rainTotal += getTemperature('summer', 'rain');
      }
      expect(droughtTotal / N).toBeGreaterThan(rainTotal / N);
    });
  });

  // ========================================
  // getHumidity
  // ========================================
  describe('getHumidity', () => {
    it('storm is more humid than drought', () => {
      let stormTotal = 0;
      let droughtTotal = 0;
      const N = 100;
      for (let i = 0; i < N; i++) {
        stormTotal += getHumidity('storm');
        droughtTotal += getHumidity('drought');
      }
      expect(stormTotal / N).toBeGreaterThan(droughtTotal / N);
    });

    it('all humidity values are between 0 and 1', () => {
      const types: WeatherType[] = ['clear', 'cloudy', 'rain', 'storm', 'drought'];
      for (const type of types) {
        for (let i = 0; i < 50; i++) {
          const h = getHumidity(type);
          expect(h).toBeGreaterThanOrEqual(0);
          expect(h).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  // ========================================
  // Constants
  // ========================================
  describe('Constants', () => {
    it('WEATHER_CHANGE_INTERVAL is positive', () => {
      expect(WEATHER_CHANGE_INTERVAL).toBeGreaterThan(0);
    });

    it('SEASON_DURATION_HOURS is a full season length', () => {
      // 4 weeks * 7 days * 24 hours = 672
      expect(SEASON_DURATION_HOURS).toBe(672);
    });
  });
});
