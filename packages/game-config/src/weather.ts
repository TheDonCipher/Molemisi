import type { Chapter } from './chapters';
import type { RngSource } from './rng';

export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'storm' | 'drought';

export interface WeatherState {
  type: WeatherType;
  temperature: number; // Celsius
  humidity: number; // 0-1
  /** The real Botswana chapter slug this weather belongs to (one calendar — Pass 3.1). */
  season: string;
}

export interface SeasonConfig {
  growthModifier: number; // multiplier on crop growth speed
  rainChance: number; // probability of rain (0-1)
  weatherProbabilities: Record<WeatherType, number>;
}

/** Hours between weather changes */
export const WEATHER_CHANGE_INTERVAL = 6;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Pass 3.1 — ONE calendar. Weather + crop growth are derived from the real
 * Botswana chapter's `rainCoverage` (04 §9.1), not a 28-day simulation clock.
 * The old `SEASON_DURATION_HOURS` / `getNextSeason` sim-season table is gone.
 *
 * rainChance = rainCoverage, so the rainy Season of Rain is ~80% wet and the dry
 * Season of Shade ~5%. growthModifier is a GENTLE function of rain because rain
 * already feeds growth indirectly through water credits (the water.service rain
 * rate), so a steep seasonal growth swing would double-count the same signal.
 */
export function chapterWeather(chapter: Chapter): SeasonConfig {
  const r = clamp01(chapter.rainCoverage);
  const rainy = r;
  const cloudy = (1 - r) * 0.4;
  const clear = Math.max(0, 1 - rainy - cloudy);
  return {
    rainChance: r,
    growthModifier: 0.85 + 0.3 * r,
    weatherProbabilities: {
      clear,
      cloudy,
      rain: rainy,
      storm: 0,
      drought: 0,
    },
  };
}

/**
 * Generate weather for a chapter using weighted random selection.
 *
 * `rng` defaults to `Math.random` so every existing one-argument call site keeps
 * working, but the simulation injects a SEEDED source (09 §10) so a given
 * farm + tick always yields the same weather. Without that, "given the same
 * inputs it produces the same outputs" is false for the whole crop pipeline,
 * because rain is what refills the tank (03 §1.2).
 */
export function generateWeather(chapter: Chapter, rng: RngSource = Math.random): WeatherState {
  const config = chapterWeather(chapter);
  const entries = (Object.entries(config.weatherProbabilities) as [WeatherType, number][]).filter(
    ([, p]) => p > 0,
  );
  const total = entries.reduce((s, [, p]) => s + p, 0) || 1;
  let roll = rng() * total;
  let chosen: WeatherType = 'clear';
  for (const [type, prob] of entries) {
    roll -= prob;
    if (roll <= 0) {
      chosen = type;
      break;
    }
  }
  const r = config.rainChance;
  // Drier chapters run hotter; humidity tracks rainCoverage.
  return {
    type: chosen,
    temperature: Math.round((30 - 8 * r) * 10) / 10,
    humidity: Math.round((0.3 + 0.6 * r) * 100) / 100,
    season: chapter.slug,
  };
}
