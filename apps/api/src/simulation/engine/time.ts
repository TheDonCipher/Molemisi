/**
 * Time-window reconciliation (09 §9 vs the as-built rulings).
 *
 * THE AMBIGUITY THIS FILE RESOLVES:
 *   Doc 09 §9 says "cap offline accumulation at 24 h for most systems, 3 days
 *   for livestock". The as-built code caps *everything* at 24 h
 *   (`MAX_OFFLINE_HOURS`), then reads the UNCAPPED clock for two special cases:
 *   livestock self-sustaining (G-4) and building wear (G-13). Which number
 *   applies to which system was therefore a property of scattered call sites,
 *   not of a rule.
 *
 * Here it is one table, one function, one place to change:
 *
 *   | System                         | Window          | Why                         |
 *   | ------------------------------ | --------------- | --------------------------- |
 *   | Crops (growth)                 | 24 h cap        | A once-daily check-in        |
 *   | Weather                        | 24 h cap        | Only weather crops will see  |
 *   | Building construction          | absolute timer  | Ends on its own; no cap      |
 *   | Building wear                  | UNCAPPED (G-13) | Weekly != 7x the wear        |
 *   | Livestock hunger/health/prod.  | 72 h cap        | "decays up to three days"    |
 *   | Livestock self-sustaining flag | UNCAPPED, >72 h | docs/09 §9 self-sustain rule |
 *
 * The 72 h livestock window supersedes the old `min(elapsed, 24)` that made a
 * four-day absence decay as though the player had been gone one day. The
 * self-sustaining threshold stays `SELF_SUSTAINING_THRESHOLD_HOURS` (72) and is
 * compared against the UNCAPPED away-time, so it can actually fire (30 G-4).
 */

import { MAX_OFFLINE_HOURS, SELF_SUSTAINING_THRESHOLD_HOURS } from '@molemisi/game-config';

/** Crops, weather and anything else that must not out-run a daily check-in. */
export const CROP_OFFLINE_CAP_HOURS = MAX_OFFLINE_HOURS;

/** Livestock decays for up to three offline days, then self-sustains (09 §9). */
export const LIVESTOCK_OFFLINE_CAP_HOURS = SELF_SUSTAINING_THRESHOLD_HOURS;

/** Below this an "away" is not worth simulating at all (sub-minute reads). */
export const MIN_SIMULATED_HOURS = 1 / 60;

export interface TimeWindows {
  /** Real wall-clock hours since the last tick — never clamped. */
  awayHours: number;
  /** Hours applied to the 24 h-capped systems (crops, weather). */
  systemHours: number;
  /** Hours applied to livestock hunger/health/production decay (72 h cap). */
  livestockHours: number;
  /** Hours used ONLY to decide self-sustaining mode (uncapped). */
  livestockAwayHours: number;
  /** Hours applied to building wear — uncapped by design (G-13). */
  buildingWearHours: number;
}

/** True when a tick is too small to bother writing to the database. */
export function belowSimulationFloor(elapsedHours: number): boolean {
  return !Number.isFinite(elapsedHours) || elapsedHours < MIN_SIMULATED_HOURS;
}

/** Resolve every system's window from one uncapped elapsed figure. */
export function resolveTimeWindows(elapsedHours: number): TimeWindows {
  const away = Number.isFinite(elapsedHours) && elapsedHours > 0 ? elapsedHours : 0;
  return {
    awayHours: away,
    systemHours: Math.min(away, CROP_OFFLINE_CAP_HOURS),
    livestockHours: Math.min(away, LIVESTOCK_OFFLINE_CAP_HOURS),
    livestockAwayHours: away,
    buildingWearHours: away,
  };
}
