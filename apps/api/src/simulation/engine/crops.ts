/**
 * Crop state-transition model (09 §3–§6).
 *
 * RECONCILIATION NOTE — read before changing a number:
 *   The LIVE farm read path grows crops in `WaterService.advanceFarmGrowth`,
 *   where growth is gated by the shared Jojo tank and readiness is
 *   `growth_progress_hours >= crop.growthHours`. That path is authoritative for
 *   the client and is NOT replaced here.
 *
 *   This module is the deterministic reference model the spec describes:
 *   hydration decay, hydration-gated growth, season + fertilizer multipliers,
 *   and withering from dehydration. It is what the offline simulator and the
 *   Game-Simulation test suite (16 §5) run against, so a "what will this crop
 *   do over N hours" question has one pure answer that needs no database.
 *
 *   NOTE — disease and pest were RETIRED by 03 §1.1/§1.3, so this model no
 *   longer rolls them and never reduces health for any reason other than
 *   dehydration. The sim is therefore fully deterministic (the injected `Rng`
 *   is accepted for contract stability but is no longer drawn).
 *
 *   The spec's illustrative vectors in 09 §10 ("4 h fully watered => stage +1")
 *   predate the retuned crop table: no crop matures in <18 h (crops.ts hard rule
 *   #1), so a 4 h tick cannot reach the next third of ANY crop's maturity. The
 *   formulas below are correct; the stale vectors are not. Tests assert against
 *   the real config and document the drift.
 *
 * Time is a per-HOUR loop, not a closed form, so order-dependent events (a
 * stage flip on hour 3 vs hour 5) are reproducible. Every draw comes from the
 * injected seeded `Rng`, so the same (crop, hours, weather, seed) always yields
 * the same outcome (09 §10 / NFR-SIM-009).
 */

import { getCropConfig, type CropConfig } from '@molemisi/game-config';
import type { CallableRng, WeatherState } from '@molemisi/game-config';
import type { CropLifecycle, CropState, CropTick } from './types';

/** Single source of truth for the crop reference model's tunables. */
export const CROP_SIM = {
  /** Hydration lost per hour for a thirst-1 crop (x thirst). */
  hydrationDecayPerThirstHour: 0.0045,
  /** Below this hydration a crop drinks nothing and does not grow. */
  hydrationGrowthFloor: 0.2,
  /** Consecutive hours at zero hydration before a full-health crop withers. */
  witherHoursAtZeroHydration: 6,
} as const;

/** How much hydration this crop loses in one hour. */
export function hydrationDecayPerHour(crop: CropConfig): number {
  return CROP_SIM.hydrationDecayPerThirstHour * crop.thirst;
}

/** Growth stage 0..3 for a given progress, matching the live path's 3-cut model. */
export function stageFor(progressHours: number, growthHours: number): 0 | 1 | 2 | 3 {
  if (growthHours <= 0) return 3;
  const stage = Math.floor((progressHours / growthHours) * 3 + 1e-9);
  return Math.min(3, Math.max(0, stage)) as 0 | 1 | 2 | 3;
}

/**
 * A crop's state after the farm ticks forward `elapsedHours`.
 * Pure: no clock reads, no database, no `Math.random`.
 */
export function simulateCrop(
  crop: CropState,
  elapsedHours: number,
  weather: WeatherState,
  rng: CallableRng,
  seasonGrowthModifier = 1,
): CropTick {
  const config = getCropConfig(crop.cropType);
  const unchanged: CropTick = {
    id: crop.id,
    plotId: crop.plotId,
    lifecycle: lifecycleOf(crop),
    growthStage: crop.growthStage,
    growthProgressHours: crop.growthProgressHours,
    hydration: crop.hydration,
    health: crop.health,
    ready: false,
    withered: false,
    stalled: false,
    changed: false,
  };
  if (!config || elapsedHours <= 0 || !Number.isFinite(elapsedHours)) return unchanged;

  let hydration = clamp01(crop.hydration);
  let health = clamp01(crop.health);
  let progress = Math.max(0, crop.growthProgressHours);
  let stage = crop.growthStage;
  let ready = progress >= config.growthHours;
  let withered = false;

  const decayPerHour = hydrationDecayPerHour(config);
  const dehydrationDamagePerHour = 1 / CROP_SIM.witherHoursAtZeroHydration;
  const fertilizerMultiplier = crop.fertilizerActive ? 1 + crop.fertilizerBonus : 1;

  const wholeHours = Math.floor(elapsedHours);
  const fractionalHours = elapsedHours - wholeHours;

  const tickHour = (hoursIncrement: number) => {
    if (withered) return;
    hydration = Math.max(0, hydration - decayPerHour * hoursIncrement);

    const growing = hydration >= CROP_SIM.hydrationGrowthFloor;
    if (growing && progress < config.growthHours) {
      progress = Math.min(
        config.growthHours,
        progress + hydration * fertilizerMultiplier * seasonGrowthModifier * hoursIncrement,
      );
    }

    // Stage transitions are recorded for the next-tick comparison (09 §4–5).
    const nextStage = stageFor(progress, config.growthHours);
    if (nextStage > stage) {
      stage = nextStage;
    }

    // Health only moves downhill. Watering a scorched crop does not undo it.
    // (Disease/pest were retired by 03 §1.1/§1.3; only dehydration now harms health.)
    if (hydration <= 0) health -= dehydrationDamagePerHour * hoursIncrement;
    health = Math.max(0, health);

    if (health <= 0) {
      withered = true;
      return;
    }
    if (progress >= config.growthHours) ready = true;
  };

  for (let h = 0; h < wholeHours; h++) tickHour(1);
  if (fractionalHours > 0) tickHour(fractionalHours);

  const lifecycle: CropLifecycle = withered
    ? 'WITHERED'
    : ready
      ? 'READY'
      : progress > 0
        ? 'GROWING'
        : 'PLANTED';
  const stalled =
    !withered && !ready && hydration < CROP_SIM.hydrationGrowthFloor && elapsedHours > 0;

  const changed =
    lifecycle !== unchanged.lifecycle ||
    stage !== crop.growthStage ||
    !approxEqual(progress, crop.growthProgressHours) ||
    !approxEqual(hydration, crop.hydration) ||
    !approxEqual(health, crop.health);

  return {
    id: crop.id,
    plotId: crop.plotId,
    lifecycle,
    growthStage: stage,
    growthProgressHours: round6(progress),
    hydration: round6(hydration),
    health: round6(health),
    ready,
    withered,
    stalled,
    changed,
  };
}

/** The lifecycle a crop is in *before* a tick, derived from its stored state. */
export function lifecycleOf(crop: CropState): CropLifecycle {
  const config = getCropConfig(crop.cropType);
  if (!config) return 'EMPTY';
  if (crop.health <= 0) return 'WITHERED';
  if (crop.growthProgressHours >= config.growthHours) return 'READY';
  return crop.growthProgressHours > 0 ? 'GROWING' : 'PLANTED';
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
