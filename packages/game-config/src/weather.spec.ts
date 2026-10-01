import { CHAPTERS } from './chapters';
import {
  chapterWeather,
  generateWeather,
  WEATHER_CHANGE_INTERVAL,
  type WeatherType,
} from './weather';

const bySlug = (slug: string) => CHAPTERS.find((c) => c.slug === slug)!;

describe('Weather System (Pass 3.1 — one chapter calendar)', () => {
  describe('chapterWeather', () => {
    it('derives rainChance directly from chapter.rainCoverage', () => {
      expect(chapterWeather(bySlug('pula')).rainChance).toBeCloseTo(0.8, 5);
      expect(chapterWeather(bySlug('moriti')).rainChance).toBeCloseTo(0.05, 5);
    });

    it('drier chapters are less rainy than wet ones', () => {
      expect(chapterWeather(bySlug('moriti')).rainChance).toBeLessThan(
        chapterWeather(bySlug('pula')).rainChance,
      );
    });

    it('growthModifier is a gentle positive function of rain (0 < m < 2)', () => {
      for (const c of CHAPTERS) {
        const m = chapterWeather(c).growthModifier;
        expect(m).toBeGreaterThan(0);
        expect(m).toBeLessThanOrEqual(2.0);
      }
    });

    it('weather probabilities sum to ~1.0', () => {
      for (const c of CHAPTERS) {
        const sum = Object.values(chapterWeather(c).weatherProbabilities).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 2);
      }
    });

    it('no frost/pest modifiers — Botswana has no frost', () => {
      // SeasonConfig no longer carries frostRisk/pestModifier; this documents that
      // the deleted sim-season table (and its winter_solstice frost) is gone for good.
      const cfg = chapterWeather(bySlug('moriti'));
      expect((cfg as Record<string, unknown>).frostRisk).toBeUndefined();
      expect((cfg as Record<string, unknown>).pestModifier).toBeUndefined();
    });
  });

  describe('generateWeather', () => {
    it('tags weather with the chapter slug (one calendar)', () => {
      for (const c of CHAPTERS) {
        expect(generateWeather(c).season).toBe(c.slug);
      }
    });

    it('returns sane temperature and humidity', () => {
      for (let i = 0; i < 50; i++) {
        const w = generateWeather(bySlug('pula'));
        expect(w.temperature).toBeGreaterThanOrEqual(10);
        expect(w.temperature).toBeLessThanOrEqual(50);
        expect(w.humidity).toBeGreaterThanOrEqual(0);
        expect(w.humidity).toBeLessThanOrEqual(1);
      }
    });

    it('produces varied weather types over many calls (wet chapter)', () => {
      const types = new Set<WeatherType>();
      for (let i = 0; i < 200; i++) {
        types.add(generateWeather(bySlug('pula')).type);
      }
      expect(types.size).toBeGreaterThanOrEqual(2);
    });

    it('dry chapters produce almost no rain', () => {
      let rainy = 0;
      for (let i = 0; i < 200; i++) {
        if (generateWeather(bySlug('moriti')).type === 'rain') rainy++;
      }
      expect(rainy).toBeLessThan(40); // ~5% expected
    });
  });

  describe('Constants', () => {
    it('WEATHER_CHANGE_INTERVAL is positive', () => {
      expect(WEATHER_CHANGE_INTERVAL).toBeGreaterThan(0);
    });
  });
});
