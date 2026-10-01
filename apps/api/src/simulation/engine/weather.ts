/**
 * Weather progression (09 §7, 03 §1.2).
 *
 * Weather changes every `WEATHER_CHANGE_INTERVAL` (6 h). The timeline walks the
 * elapsed window in whole intervals and, for each one, generates the next state
 * from the SEEDED stream — so the rain that refills the tank during an offline
 * tick is reproducible (a replayed tick produces the identical storm).
 *
 * Only the capped `systemHours` window is walked: there is no point generating
 * weather the crop and water systems will never see (see ./time.ts).
 */

import { WEATHER_CHANGE_INTERVAL, generateWeather } from '@molemisi/game-config';
import type { CallableRng, Chapter, WeatherState } from '@molemisi/game-config';

/** The ordered list of weather states that occurred during the tick. */
export function simulateWeatherTimeline(
  chapter: Chapter,
  current: WeatherState,
  hours: number,
  rng: CallableRng,
): WeatherState[] {
  const changes: WeatherState[] = [current];
  if (!Number.isFinite(hours) || hours < WEATHER_CHANGE_INTERVAL) return changes;

  let remaining = hours;
  while (remaining >= WEATHER_CHANGE_INTERVAL) {
    remaining -= WEATHER_CHANGE_INTERVAL;
    changes.push(generateWeather(chapter, rng));
  }
  return changes;
}

/** The weather state the farm settles on after the tick. */
export function finalWeather(timeline: readonly WeatherState[]): WeatherState {
  return timeline[timeline.length - 1]!;
}
