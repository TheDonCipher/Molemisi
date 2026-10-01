/**
 * Building state transitions (09 §8, with the G-13 reconciliation).
 *
 * THE 24 h / UNCAPPED SPLIT:
 *   - CONSTRUCTION completes on an ABSOLUTE timer (`construction_ends_at`), so
 *     it needs no elapsed window at all — a build that finished while the player
 *     was away is simply finished.
 *   - WEAR accrues on the UNCAPPED clock (30 G-13). Capping it at 24 h made the
 *     daily player wear buildings ~7x faster than the weekly player for the same
 *     wall-clock time, which is player-hostile in the wrong direction. Crops and
 *     weather stay capped; only wear reads the full away-time.
 *
 * The `MAINTENANCE_NEEDED` check is deliberately NOT nested inside the ACTIVE
 * branch (the spec's original pseudo-code did that, so an already-degraded
 * building never reached the DISABLED escalation). It runs after, on the
 * resulting state, so every degraded building is evaluated every tick.
 */

import { getBuildingConfig } from '@molemisi/game-config';
import type { BuildingState, BuildingTick } from './types';

const HOUR_MS = 3_600_000;

export interface BuildingSimResult extends BuildingTick {
  /** The state the building is in for reporting. */
  state: string;
}

/** Advance one building by `wearHours` (uncapped) at `nowMs` (injected). */
export function simulateBuilding(
  building: BuildingState,
  wearHours: number,
  nowMs: number,
): BuildingSimResult {
  const config = getBuildingConfig(building.buildingType);
  if (!config) {
    return {
      id: building.id,
      state: building.state,
      wear: building.wear,
      completed: false,
      needsMaintenance: false,
      changed: false,
    };
  }

  let newState = building.state;
  let wear = building.wear;
  let completed = false;
  let needsMaintenance = false;

  // --- Construction completes on an absolute timer ------------------------
  if (building.state === 'CONSTRUCTION' && building.constructionEndsAt) {
    const constructionEnd = new Date(building.constructionEndsAt).getTime();
    if (Number.isFinite(constructionEnd) && nowMs >= constructionEnd) {
      newState = 'ACTIVE';
      wear = 0;
      completed = true;
    }
  }

  // --- Wear accrues while ACTIVE (uncapped hours) -------------------------
  if (newState === 'ACTIVE' && wearHours > 0) {
    wear = Math.min(1.0, wear + config.wearPerHour * wearHours);
    if (wear >= 1.0) {
      newState = 'MAINTENANCE_NEEDED';
      needsMaintenance = true;
    }
  }

  // --- Maintenance overdue escalates to DISABLED --------------------------
  // Runs on the RESULTING state, never nested inside the ACTIVE branch.
  if (newState === 'MAINTENANCE_NEEDED') {
    const lastMaintained = new Date(building.lastMaintainedAt).getTime();
    if (Number.isFinite(lastMaintained)) {
      const hoursSinceMaint = (nowMs - lastMaintained) / HOUR_MS;
      if (hoursSinceMaint > config.maintenanceIntervalDays * 24) {
        newState = 'DISABLED';
      }
    }
  }

  const changed = newState !== building.state || wear !== building.wear;

  return {
    id: building.id,
    state: newState,
    wear,
    completed,
    needsMaintenance,
    changed,
  };
}
