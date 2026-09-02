export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'storm' | 'drought';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface WeatherState {
  type: WeatherType;
  temperature: number; // Celsius
  humidity: number; // 0-1
  season: Season;
}

export interface SeasonConfig {
  id: Season;
  name: string;
  growthModifier: number; // multiplier on growth speed
  rainChance: number; // probability of rain/storm combined
  frostRisk: number; // probability of frost damage (winter only)
  pestModifier: number; // multiplier on pest chance
  weatherProbabilities: Record<WeatherType, number>;
}

export const SEASONS: Record<Season, SeasonConfig> = {
  spring: {
    id: 'spring',
    name: 'Spring',
    growthModifier: 1.1,
    rainChance: 0.4,
    frostRisk: 0.05,
    pestModifier: 1.0,
    weatherProbabilities: {
      clear: 0.35,
      cloudy: 0.25,
      rain: 0.25,
      storm: 0.10,
      drought: 0.05,
    },
  },
  summer: {
    id: 'summer',
    name: 'Summer',
    growthModifier: 1.0,
    rainChance: 0.15,
    frostRisk: 0.0,
    pestModifier: 1.3,
    weatherProbabilities: {
      clear: 0.45,
      cloudy: 0.20,
      rain: 0.15,
      storm: 0.10,
      drought: 0.10,
    },
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn',
    growthModifier: 1.05,
    rainChance: 0.3,
    frostRisk: 0.0,
    pestModifier: 0.8,
    weatherProbabilities: {
      clear: 0.40,
      cloudy: 0.25,
      rain: 0.20,
      storm: 0.10,
      drought: 0.05,
    },
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    growthModifier: 0.8,
    rainChance: 0.1,
    frostRisk: 0.15,
    pestModifier: 0.5,
    weatherProbabilities: {
      clear: 0.50,
      cloudy: 0.25,
      rain: 0.10,
      storm: 0.05,
      drought: 0.10,
    },
  },
};

/** Hours between weather changes */
export const WEATHER_CHANGE_INTERVAL = 6;

/** Season duration in game weeks */
export const SEASON_DURATION_WEEKS = 4;

/** Game hours per season = weeks * 7 days * 24 hours */
export const SEASON_DURATION_HOURS = SEASON_DURATION_WEEKS * 7 * 24;

/** Temperature ranges per season */
const TEMPERATURE_RANGES: Record<Season, { min: number; max: number }> = {
  spring: { min: 15, max: 28 },
  summer: { min: 22, max: 38 },
  autumn: { min: 12, max: 25 },
  winter: { min: 2, max: 18 },
};

/** Generate a random temperature for a season and weather type */
export function getTemperature(season: Season, weather: WeatherType): number {
  const range = TEMPERATURE_RANGES[season];
  const base = range.min + Math.random() * (range.max - range.min);

  // Weather modifiers
  switch (weather) {
    case 'clear':
      return Math.round(base + 2);
    case 'cloudy':
      return Math.round(base - 1);
    case 'rain':
      return Math.round(base - 3);
    case 'storm':
      return Math.round(base - 5);
    case 'drought':
      return Math.round(base + 5);
    default:
      return Math.round(base);
  }
}

/** Get humidity for a weather type */
export function getHumidity(weather: WeatherType): number {
  switch (weather) {
    case 'clear':
      return 0.2 + Math.random() * 0.2;
    case 'cloudy':
      return 0.4 + Math.random() * 0.2;
    case 'rain':
      return 0.6 + Math.random() * 0.3;
    case 'storm':
      return 0.7 + Math.random() * 0.3;
    case 'drought':
      return 0.1 + Math.random() * 0.1;
    default:
      return 0.3;
  }
}

/** Generate weather for a given season using weighted random selection */
export function generateWeather(season: Season): WeatherState {
  const config = SEASONS[season];
  const roll = Math.random();

  let cumulative = 0;
  for (const [type, prob] of Object.entries(config.weatherProbabilities)) {
    cumulative += prob;
    if (roll <= cumulative) {
      const weatherType = type as WeatherType;
      return {
        type: weatherType,
        temperature: getTemperature(season, weatherType),
        humidity: getHumidity(weatherType),
        season,
      };
    }
  }

  // Fallback
  return {
    type: 'clear',
    temperature: getTemperature(season, 'clear'),
    humidity: getHumidity('clear'),
    season,
  };
}

/** Get the next season in the cycle */
export function getNextSeason(current: Season): Season {
  const order: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

/** Calculate season growth modifier */
export function getSeasonGrowthModifier(season: Season): number {
  return SEASONS[season].growthModifier;
}
