/**
 * Livestock state transitions (09 §7, 30-G4, R1/30-1.4).
 *
 * THE TWO-CLOCK RULE (see ./time.ts for the full table):
 *   - hunger / health / happiness / production decay are applied over
 *     `hoursApplied` — the 72 h-capped LIVESTOCK window;
 *   - self-sustaining mode is decided from `awayHours` — the UNCAPPED away-time —
 *     so a four-day absence actually reaches the 72 h threshold. The old code
 *     divided the 24 h-clamped figure by 24, so `offlineDays <= 1` and the
 *     published "3 days then self-sustaining" promise could never fire (30 G-4).
 *
 * THE STARVATION WINDOW (R1/30-1.4 / P0-1):
 *   Health decays only after `STARVATION_ONSET_HOURS` CONSECUTIVE hours at
 *   hunger 0 — not merely "hunger < 0.2", which turned one overnight gap into a
 *   permanent soft-lock. The window start is carried on `hungerZeroSince` so it
 *   survives across passes; this function never reads the wall clock itself.
 */

import {
  STARVATION_ONSET_HOURS,
  SELF_SUSTAINING_THRESHOLD_HOURS,
  getAnimalConfig,
} from '@molemisi/game-config';
import type { LivestockState, LivestockTick } from './types';

const HOUR_MS = 3_600_000;

/** True when the animal should stop caring until the player returns (09 §9). */
export function isSelfSustaining(awayHours: number): boolean {
  return awayHours > SELF_SUSTAINING_THRESHOLD_HOURS;
}

/**
 * Advance one animal by `hoursApplied`, using `awayHours` only for the
 * self-sustaining decision. `nowMs` is injected so the result is deterministic.
 */
export function simulateLivestock(
  animal: LivestockState,
  hoursApplied: number,
  awayHours: number,
  nowMs: number,
): LivestockTick {
  const config = getAnimalConfig(animal.animalType);

  if (!config || hoursApplied <= 0 || !Number.isFinite(hoursApplied)) {
    return {
      id: animal.id,
      hunger: animal.hunger,
      health: animal.health,
      happiness: animal.happiness,
      productReady: animal.productReady,
      productTimerHours: animal.productTimerHours,
      isSick: animal.isSick,
      hungerZeroSince: animal.hungerZeroSince ?? null,
      selfSustaining: false,
      changed: false,
    };
  }

  let hunger = animal.hunger;
  let health = animal.health;
  let happiness = animal.happiness;
  let productReady = animal.productReady;
  let productTimerHours = animal.productTimerHours;

  const selfSustaining = isSelfSustaining(awayHours);

  // --- Hunger decay (self-sustaining runs at 25% rate) --------------------
  const hungerDecayRate = selfSustaining
    ? config.hungerDecayRate * 0.25
    : config.hungerDecayRate;
  const startingHunger = hunger;
  hunger = Math.max(0, hunger - hungerDecayRate * hoursApplied);

  // --- Starvation window -> health decay ----------------------------------
  let newHungerZeroSince: string | null = animal.hungerZeroSince ?? null;
  if (selfSustaining) {
    // Self-sustaining is the off-switch: no health may decay on a long absence.
    if (hunger > 0) newHungerZeroSince = null;
  } else if (hunger <= 0) {
    const windowStartMs = nowMs - hoursApplied * HOUR_MS;
    const parsedZero = animal.hungerZeroSince ? Date.parse(animal.hungerZeroSince) : Number.NaN;

    let hoursAtZeroBefore: number;
    let hoursAtZeroInWindow: number;
    let zeroSinceMs: number;
    if (startingHunger > 0) {
      // Hunger hit zero part-way through this window.
      const hoursToZero = Math.min(
        hoursApplied,
        hungerDecayRate > 0 ? startingHunger / hungerDecayRate : hoursApplied,
      );
      hoursAtZeroInWindow = Math.max(0, hoursApplied - hoursToZero);
      zeroSinceMs = nowMs - hoursAtZeroInWindow * HOUR_MS;
      hoursAtZeroBefore = 0;
    } else {
      // Already at zero when this window opened — resume the persisted clock
      // (or start it at the window edge for rows predating the column).
      zeroSinceMs = Number.isFinite(parsedZero) ? parsedZero : windowStartMs;
      hoursAtZeroBefore = Math.max(0, (windowStartMs - zeroSinceMs) / HOUR_MS);
      hoursAtZeroInWindow = hoursApplied;
    }
    newHungerZeroSince = new Date(zeroSinceMs).toISOString();

    // Hours beyond the onset threshold, minus the portion already "spent"
    // before this window — so repeated passes never over-decay.
    const decayingHours =
      Math.max(0, hoursAtZeroBefore + hoursAtZeroInWindow - STARVATION_ONSET_HOURS) -
      Math.max(0, hoursAtZeroBefore - STARVATION_ONSET_HOURS);

    if (decayingHours > 0) {
      health = Math.max(0, health - config.healthDecayRate * decayingHours);
    }
  } else {
    // Fed again — the starvation clock resets.
    newHungerZeroSince = null;
  }

  // --- Happiness decay when neglected -------------------------------------
  // FIXED DEFECT: the previous formula computed
  //   `elapsedHours - (now - lastPet) / h`
  // which measures "hours from window start to the pet", not "hours since the
  // pet". With an elapsed window of 24 h that value can never exceed 24, so the
  // "not petted for 24+ hours" decay could NEVER fire — and when it did (longer
  // windows) it fired for the wrong reason. The honest measure is simply how
  // long ago the pet happened.
  if (!selfSustaining && animal.lastPetAt) {
    const hoursSincePet = (nowMs - new Date(animal.lastPetAt).getTime()) / HOUR_MS;
    if (hoursSincePet > 24) {
      happiness = Math.max(0, happiness - config.happinessDecayRate * hoursApplied);
    }
  }

  // --- Production ---------------------------------------------------------
  if (!selfSustaining && hunger > 0.5 && health > 0.5 && !productReady) {
    productTimerHours += hoursApplied;
    if (productTimerHours >= config.productionCycleHours) {
      productReady = true;
      productTimerHours = 0;
    }
  }

  // --- Self-sustaining floor ----------------------------------------------
  if (selfSustaining) {
    hunger = Math.max(0.1, hunger);
    productReady = false;
  }

  const isSick = health < 0.3;
  const changed =
    hunger !== animal.hunger ||
    health !== animal.health ||
    happiness !== animal.happiness ||
    productReady !== animal.productReady ||
    productTimerHours !== animal.productTimerHours ||
    isSick !== animal.isSick ||
    (newHungerZeroSince ?? null) !== (animal.hungerZeroSince ?? null);

  return {
    id: animal.id,
    hunger,
    health,
    happiness,
    productReady,
    productTimerHours,
    isSick,
    hungerZeroSince: newHungerZeroSince,
    selfSustaining,
    changed,
  };
}

