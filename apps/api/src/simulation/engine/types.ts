/**
 * Deterministic simulation engine — shared types.
 *
 * These interfaces ARE the contract in 09 §2:
 *   `last_simulated_at + elapsed_time + game_state + rules = new_game_state`
 *
 * `SimulationInput` is the frozen left-hand side; `SimulationOutput` the derived
 * right-hand side. Every field is plain data — no Supabase clients, no `Date`
 * side effects — so a run can be replayed from a captured input + seed.
 */

import type { Chapter, WeatherState } from '@molemisi/game-config';

/** A crop's lifecycle state as the engine reports it (mirrors `farm_plots.state`). */
export type CropLifecycle = 'EMPTY' | 'PLANTED' | 'GROWING' | 'READY' | 'WITHERED';

export interface CropState {
  id: string;
  plotId: string;
  cropType: string;
  /** Cumulative effective growing hours (the readiness counter — 03 §8). */
  growthProgressHours: number;
  /** 0..3, derived from progress (see `growthStage`). */
  growthStage: number;
  /** 0..1; tank/hydration supply. Display value in the live path, gating here. */
  hydration: number;
  /** 0..1 crop health. Reaches 0 => WITHERED. */
  health: number;
  /** +bonus growth while a fertilizer window is live (G1). */
  fertilizerActive: boolean;
  fertilizerBonus: number;
}

export interface LivestockState {
  id: string;
  farmId: string;
  animalType: string;
  hunger: number;
  health: number;
  happiness: number;
  productReady: boolean;
  productTimerHours: number;
  isSick: boolean;
  lastFedAt: string;
  lastPetAt: string | null;
  /** R1/30-1.4 — when hunger last hit 0; null while fed. Survives passes. */
  hungerZeroSince?: string | null;
}

export interface BuildingState {
  id: string;
  farmId: string;
  buildingType: string;
  level: number;
  state: string;
  wear: number;
  constructionStartedAt: string | null;
  constructionEndsAt: string | null;
  lastMaintainedAt: string;
}

/** Everything the engine needs to advance one farm by `elapsedHours`. */
export interface SimulationInput {
  farmId: string;
  /** The instant this tick is evaluated at. Injected, never `Date.now()`. */
  now: Date;
  /** Real wall-clock hours since `last_simulated_at`. Never pre-clamped. */
  elapsedHours: number;
  /** Seed for every stochastic draw in this tick (09 §10). */
  seed: number;
  /** The real Botswana chapter for `now` (one calendar — Pass 3.1). */
  chapter: Chapter;
  /** The farm's weather *before* this tick. */
  weather: WeatherState;
  crops: CropState[];
  livestock: LivestockState[];
  buildings: BuildingState[];
}

export interface CropTick {
  id: string;
  plotId: string;
  lifecycle: CropLifecycle;
  growthStage: number;
  growthProgressHours: number;
  hydration: number;
  health: number;
  /** True when this tick crossed the maturity line. */
  ready: boolean;
  /** True when this tick killed the crop (hydration starvation). */
  withered: boolean;
  /** True when this tick tried to grow but drank nothing (F17 telemetry). */
  stalled: boolean;
  changed: boolean;
}

export interface LivestockTick {
  id: string;
  hunger: number;
  health: number;
  happiness: number;
  productReady: boolean;
  productTimerHours: number;
  isSick: boolean;
  /** The persisted starvation-window start (R1/30-1.4). */
  hungerZeroSince: string | null;
  /** True while the animal is in the 3-day self-sustaining mode (docs/09 §9). */
  selfSustaining: boolean;
  changed: boolean;
}

export interface BuildingTick {
  id: string;
  state: string;
  wear: number;
  completed: boolean;
  needsMaintenance: boolean;
  changed: boolean;
}

export interface SimulationTotals {
  cropsSimulated: number;
  cropsAdvanced: number;
  cropsReady: number;
  cropsWithered: number;
  cropsStalled: number;
  livestockSimulated: number;
  livestockProducts: number;
  livestockSelfSustaining: number;
  buildingsSimulated: number;
  buildingsCompleted: number;
  buildingsMaintenance: number;
}

export interface SimulationOutput {
  weather: WeatherState;
  /** Every weather change that occurred during the tick, oldest first. */
  weatherTimeline: WeatherState[];
  seasonChanged: boolean;
  newSeason: string | null;
  cropTicks: CropTick[];
  livestockTicks: LivestockTick[];
  buildingTicks: BuildingTick[];
  totals: SimulationTotals;
  notifications: string[];
  /** Real hours away (uncapped). */
  awayHours: number;
  /** Hours actually applied to the 24 h-capped systems. */
  appliedHours: number;
}
