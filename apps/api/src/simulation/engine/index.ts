/**
 * The deterministic simulation orchestrator (09 §2).
 *
 * ONE PURE CALL: `runSimulation(input) => output`.
 *   - no clock reads (the instant is `input.now`),
 *   - no global RNG (every draw comes from `input.seed`),
 *   - no I/O (the caller owns Supabase).
 *
 * That is what makes the engine testable (16 §5) and reproducible (09 §10): a
 * captured `SimulationInput` replays to the identical `SimulationOutput`.
 *
 * CROP NOTE: `runSimulation` also advances crops through the spec's reference
 * model (./crops.ts). The LIVE farm read path keeps using the tank-gated
 * `WaterService.advanceFarmGrowth` for the client; this engine's crop ticks are
 * what the offline simulator and the Game-Simulation suite run, so the crop
 * rules have one pure, seeded home. See ./crops.ts for the reconciliation.
 */

import { chapterWeather, createRng } from '@molemisi/game-config';
import { resolveTimeWindows } from './time';
import { simulateCrop } from './crops';
import { simulateLivestock } from './livestock';
import { simulateBuilding } from './buildings';
import { finalWeather, simulateWeatherTimeline } from './weather';
import type {
  BuildingTick,
  CropTick,
  LivestockTick,
  SimulationInput,
  SimulationOutput,
  SimulationTotals,
} from './types';

export * from './types';
export * from './time';
export * from './crops';
export * from './livestock';
export * from './buildings';
export * from './weather';

/** Run one deterministic tick for a farm. */
export function runSimulation(input: SimulationInput): SimulationOutput {
  const windows = resolveTimeWindows(input.elapsedHours);
  const nowMs = input.now.getTime();

  // One root stream per tick; each system forks its own child so adding a draw
  // in one system cannot shift another's sequence (see rng.ts `fork`).
  const root = createRng(input.seed);

  // ---- Weather -----------------------------------------------------------
  const weatherTimeline = simulateWeatherTimeline(
    input.chapter,
    input.weather,
    windows.systemHours,
    root.fork('weather'),
  );
  const weather = finalWeather(weatherTimeline);
  const seasonChanged = input.weather.season !== input.chapter.slug;

  // ---- Crops -------------------------------------------------------------
  const seasonGrowthModifier = chapterWeather(input.chapter).growthModifier;
  const cropTicks: CropTick[] = input.crops.map((crop) =>
    simulateCrop(crop, windows.systemHours, weather, root.fork(`crop:${crop.id}`), seasonGrowthModifier),
  );

  // ---- Livestock (72 h window for decay, uncapped for self-sustain) ------
  const livestockTicks: LivestockTick[] = input.livestock.map((animal) =>
    simulateLivestock(animal, windows.livestockHours, windows.livestockAwayHours, nowMs),
  );

  // ---- Buildings (construction absolute; wear uncapped) ------------------
  const buildingTicks: BuildingTick[] = input.buildings.map((building) =>
    simulateBuilding(building, windows.buildingWearHours, nowMs),
  );

  // ---- Totals + notifications -------------------------------------------
  const totals: SimulationTotals = {
    cropsSimulated: cropTicks.filter((t) => t.changed).length,
    cropsAdvanced: cropTicks.filter((t) => t.lifecycle === 'GROWING' || t.lifecycle === 'READY')
      .length,
    cropsReady: cropTicks.filter((t) => t.ready).length,
    cropsWithered: cropTicks.filter((t) => t.withered).length,
    cropsStalled: cropTicks.filter((t) => t.stalled).length,
    livestockSimulated: livestockTicks.filter((t) => t.changed).length,
    livestockProducts: livestockTicks.filter((t) => t.productReady).length,
    livestockSelfSustaining: livestockTicks.filter((t) => t.selfSustaining).length,
    buildingsSimulated: buildingTicks.filter((t) => t.changed).length,
    buildingsCompleted: buildingTicks.filter((t) => t.completed).length,
    buildingsMaintenance: buildingTicks.filter((t) => t.needsMaintenance).length,
  };

  const notifications = buildNotifications(totals, seasonChanged, input.chapter.slug);

  return {
    weather,
    weatherTimeline,
    seasonChanged,
    newSeason: seasonChanged ? input.chapter.slug : null,
    cropTicks,
    livestockTicks,
    buildingTicks,
    totals,
    notifications,
    awayHours: windows.awayHours,
    appliedHours: windows.systemHours,
  };
}

function buildNotifications(
  totals: SimulationTotals,
  seasonChanged: boolean,
  chapterSlug: string,
): string[] {
  const notes: string[] = [];
  if (seasonChanged) notes.push(`Season changed to ${chapterSlug}!`);
  if (totals.cropsReady > 0) notes.push(`${totals.cropsReady} crop(s) ready for harvest!`);
  if (totals.cropsWithered > 0) notes.push(`${totals.cropsWithered} crop(s) withered from lack of water!`);
  if (totals.livestockProducts > 0) notes.push(`${totals.livestockProducts} animal product(s) ready to collect!`);
  if (totals.buildingsCompleted > 0) notes.push(`${totals.buildingsCompleted} building(s) finished construction!`);
  if (totals.buildingsMaintenance > 0) notes.push(`${totals.buildingsMaintenance} building(s) need maintenance!`);
  return notes;
}
