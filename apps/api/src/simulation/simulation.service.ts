import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WaterService } from '../water/water.service';
import {
  createRng,
  tickSeed,
  chapterForDate,
  type CallableRng,
  type Chapter,
  type WeatherState,
} from '@molemisi/game-config';
import {
  resolveTimeWindows,
  simulateBuilding as engineSimulateBuilding,
  simulateLivestock as engineSimulateLivestock,
  simulateWeatherTimeline as engineSimulateWeatherTimeline,
} from './engine';

interface LivestockRow {
  id: string;
  farm_id: string;
  animal_type: string;
  hunger: number;
  health: number;
  happiness: number;
  product_ready: boolean;
  product_timer_hours: number;
  is_sick: boolean;
  last_fed_at: string;
  last_pet_at: string | null;
  /** R1/30-1.4 — when hunger last hit 0; null while the animal is fed. */
  hunger_zero_since?: string | null;
}

interface BuildingRow {
  id: string;
  farm_id: string;
  building_type: string;
  level: number;
  state: string;
  wear: number;
  construction_started_at: string | null;
  construction_ends_at: string | null;
  last_maintained_at: string;
}

interface FarmRow {
  id: string;
  last_simulated_at: string;
  season: string;
  weather_state: string;
  weather_temperature: number;
  weather_humidity: number;
  current_day: number;
}

export interface SimulationResult {
  cropsSimulated: number;
  cropsAdvanced: number;
  cropsWithered: number;
  cropsReady: number;
  /** Crops that wanted to grow but drank nothing (F17 water-squeeze telemetry). */
  cropsStalled: number;
  livestockSimulated: number;
  livestockFed: number;
  livestockProducts: number;
  buildingsSimulated: number;
  buildingsCompleted: number;
  buildingsMaintenance: number;
  weather: WeatherState | null;
  seasonChanged: boolean;
  newSeason: string | null;
  notifications: string[];
  /** G-12 — total real time away (uncapped), for the welcome-back "discarded time" line. */
  awayHours: number;
  /** G-12 — time actually applied to simulation (capped at MAX_OFFLINE_HOURS). */
  appliedHours: number;
}

@Injectable()
export class SimulationService {
  constructor(
    private supabaseService: SupabaseService,
    private waterService: WaterService,
  ) {}

  /**
   * Run the complete elapsed-time simulation for a farm.
   * Simulates: weather, crops, livestock, buildings, seasons.
   * Returns a summary for the welcome-back display.
   */
  async simulateFarm(
    farmId: string,
    nowDate: Date = new Date(),
    seed?: number,
  ): Promise<SimulationResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get farm state
    const { data: farm } = await adminClient.from('farms').select('*').eq('id', farmId).single();

    if (!farm) {
      return this.emptyResult();
    }

    const farmRow = farm as unknown as FarmRow;
    const lastSimulated = new Date(farmRow.last_simulated_at).getTime();
    // The instant is INJECTED (09 §2 / §10) — no hidden `Date.now()`, so a tick
    // replayed with the same (state, now, seed) produces the same result.
    const now = nowDate.getTime();
    const elapsedMs = now - lastSimulated;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // Explicit per-system windows (see ./engine/time.ts): crops/weather 24 h,
    // livestock 72 h, building wear uncapped (G-13).
    const windows = resolveTimeWindows(elapsedHours);
    const cappedHours = windows.systemHours;

    // If less than 1 minute has passed, skip simulation
    if (cappedHours < 1 / 60) {
      return this.emptyResult();
    }

    // Deterministic stream for this tick. Callers (tests, the offline simulator)
    // may pass an explicit seed; otherwise it is derived from the farm + tick so
    // the SAME tick reproduces and the NEXT tick differs (09 §10).
    const rng: CallableRng = createRng(seed ?? tickSeed(farmId, Math.round(now / 60_000)));

    // Get the real Botswana chapter for right now (one calendar — Pass 3.1).
    const chapter = chapterForDate(new Date(now));
    const chapterSlug = chapter.slug;
    let currentWeather: WeatherState = {
      type: (farmRow.weather_state as WeatherState['type']) || 'clear',
      temperature: farmRow.weather_temperature || 25,
      humidity: farmRow.weather_humidity || 0.3,
      season: (farmRow.season as string) || chapterSlug,
    };

    const result: SimulationResult = {
      cropsSimulated: 0,
      cropsAdvanced: 0,
      cropsWithered: 0,
      cropsReady: 0,
      cropsStalled: 0,
      livestockSimulated: 0,
      livestockFed: 0,
      livestockProducts: 0,
      buildingsSimulated: 0,
      buildingsCompleted: 0,
      buildingsMaintenance: 0,
      weather: currentWeather,
      seasonChanged: false,
      newSeason: null,
      notifications: [],
      awayHours: elapsedHours,
      appliedHours: cappedHours,
    };

    // Simulate weather changes over elapsed time
    const weatherChanges = this.simulateWeatherTimeline(chapter, currentWeather, cappedHours, rng);
    if (weatherChanges.length > 0) {
      currentWeather = weatherChanges[weatherChanges.length - 1]!;
      result.weather = currentWeather;
    }

    // Pass 3.1 — one calendar. A "season change" is now a chapter-boundary
    // crossing on the real Botswana calendar, not a 28-day sim tick. The
    // welcome-back screen celebrates it (FarmScreen keys off `seasonChanged`).
    const chapterChanged = farmRow.season !== chapterSlug;
    if (chapterChanged) {
      result.seasonChanged = true;
      result.newSeason = chapterSlug;
      result.notifications.push(`Season changed to ${chapterSlug}!`);
    }

    // Crops — delegated to the P4 water-gated growth engine. The legacy per-stage sim
    // (drought-withering, disease/pest rolls) is removed: 03 §1.1/§1.3 retired those
    // fail-states, and an empty tank must halt growth without killing the crop.
    const growth = await this.waterService.advanceFarmGrowth(farmId, new Date(now));
    result.cropsSimulated = growth.cropsAdvanced;
    result.cropsAdvanced = growth.cropsAdvanced;
    result.cropsReady = growth.cropsReady;
    result.cropsStalled = growth.cropsStalled;
    result.cropsWithered = 0;

    // Get all livestock
    const { data: livestock } = await adminClient
      .from('livestock')
      .select('*')
      .eq('farm_id', farmId);

    if (livestock && livestock.length > 0) {
      for (const rawAnimal of livestock) {
        const animal = rawAnimal as unknown as LivestockRow;
        // 1.5 — livestock gets BOTH windows (see ./engine/time.ts): decay runs
        // over the 72 h LIVESTOCK window, while self-sustaining reads the
        // UNCAPPED away-time (G-4), so a 4-day absence finally passes the
        // SELF_SUSTAINING_THRESHOLD_HOURS threshold.
        const animalResult = this.simulateLivestock(
          animal,
          windows.livestockHours,
          windows.livestockAwayHours,
          now,
        );
        result.livestockSimulated++;

        if (animalResult.productReady) result.livestockProducts++;
        if (animalResult.wasFed) result.livestockFed++;

        if (animalResult.stateChanged) {
          await adminClient
            .from('livestock')
            .update({
              hunger: animalResult.newHunger,
              health: animalResult.newHealth,
              happiness: animalResult.newHappiness,
              product_ready: animalResult.productReady,
              product_timer_hours: animalResult.newProductTimer,
              is_sick: animalResult.isSick,
              // R1/30-1.4 — the starvation window must survive simulation passes.
              hunger_zero_since: animalResult.newHungerZeroSince,
              updated_at: new Date(now).toISOString(),
            })
            .eq('id', animal.id);
        }
      }
    }

    // Get all buildings
    const { data: buildings } = await adminClient
      .from('buildings')
      .select('*')
      .eq('farm_id', farmId);

    if (buildings && buildings.length > 0) {
      for (const rawBuilding of buildings) {
        const building = rawBuilding as unknown as BuildingRow;
        // G-13 — wear accrues by REAL wall-clock time, not the 24h sim cap. A
        // daily player who logs in every day and a weekly player who returns after
        // seven days must accrue equal wear for equal elapsed time; capping at
        // MAX_OFFLINE_HOURS made the engaged player wear buildings ~7x faster,
        // which is player-hostile in the wrong direction (30 G-13). Crops and
        // weather stay capped — only wear reads the uncapped clock.
        const buildingResult = this.simulateBuilding(building, windows.buildingWearHours, now);
        result.buildingsSimulated++;

        if (buildingResult.completed) result.buildingsCompleted++;
        if (buildingResult.needsMaintenance) result.buildingsMaintenance++;

        if (buildingResult.stateChanged) {
          await adminClient
            .from('buildings')
            .update({
              state: buildingResult.newState,
              wear: buildingResult.newWear,
              updated_at: new Date(now).toISOString(),
            })
            .eq('id', building.id);
        }
      }
    }

    // Generate notifications
    if (result.cropsReady > 0) {
      result.notifications.push(`${result.cropsReady} crop(s) ready for harvest!`);
    }
    if (result.cropsWithered > 0) {
      result.notifications.push(`${result.cropsWithered} crop(s) withered from lack of water!`);
    }
    if (result.livestockProducts > 0) {
      result.notifications.push(`${result.livestockProducts} animal product(s) ready to collect!`);
    }
    if (result.buildingsMaintenance > 0) {
      result.notifications.push(`${result.buildingsMaintenance} building(s) need maintenance!`);
    }

    // Update farm timestamp and weather
    const newDay = farmRow.current_day
      ? farmRow.current_day + Math.floor(cappedHours / 24)
      : Math.floor(cappedHours / 24);

    await adminClient
      .from('farms')
      .update({
        last_simulated_at: new Date(now).toISOString(),
        weather_state: currentWeather.type,
        weather_temperature: currentWeather.temperature,
        weather_humidity: currentWeather.humidity,
        season: chapterSlug,
        current_day: newDay,
      })
      .eq('id', farmId);

    return result;
  }

  /**
   * Simulate a single animal's state over elapsed hours.
   */
  private simulateLivestock(
    animal: LivestockRow,
    elapsedHours: number,
    uncappedHours: number = elapsedHours,
    nowMs: number = Date.now(),
  ): {
    newHunger: number;
    newHealth: number;
    newHappiness: number;
    productReady: boolean;
    newProductTimer: number;
    isSick: boolean;
    wasFed: boolean;
    stateChanged: boolean;
    newHungerZeroSince: string | null;
  } {
    // Pure transition lives in ./engine/livestock.ts (deterministic, unit
    // tested). This is the DB-row adapter: snake_case row in, snake_case update
    // out — so `simulateFarm` stays the only place that touches Supabase.
    const tick = engineSimulateLivestock(
      {
        id: animal.id,
        farmId: animal.farm_id,
        animalType: animal.animal_type,
        hunger: animal.hunger,
        health: animal.health,
        happiness: animal.happiness,
        productReady: animal.product_ready,
        productTimerHours: animal.product_timer_hours,
        isSick: animal.is_sick,
        lastFedAt: animal.last_fed_at,
        lastPetAt: animal.last_pet_at,
        hungerZeroSince: animal.hunger_zero_since ?? null,
      },
      elapsedHours,
      uncappedHours,
      nowMs,
    );
    return {
      newHunger: tick.hunger,
      newHealth: tick.health,
      newHappiness: tick.happiness,
      productReady: tick.productReady,
      newProductTimer: tick.productTimerHours,
      isSick: tick.isSick,
      wasFed: false,
      stateChanged: tick.changed,
      newHungerZeroSince: tick.hungerZeroSince,
    };
  }

  /**
   * Simulate a building's state over elapsed hours. Construction completes on
   * an absolute timer; wear accrues over the UNCAPPED window (G-13). See
   * ./engine/buildings.ts.
   */
  private simulateBuilding(
    building: BuildingRow,
    elapsedHours: number,
    nowMs: number = Date.now(),
  ): {
    newState: string;
    newWear: number;
    completed: boolean;
    needsMaintenance: boolean;
    stateChanged: boolean;
  } {
    const tick = engineSimulateBuilding(
      {
        id: building.id,
        farmId: building.farm_id,
        buildingType: building.building_type,
        level: building.level,
        state: building.state,
        wear: building.wear,
        constructionStartedAt: building.construction_started_at,
        constructionEndsAt: building.construction_ends_at,
        lastMaintainedAt: building.last_maintained_at,
      },
      elapsedHours,
      nowMs,
    );
    return {
      newState: tick.state,
      newWear: tick.wear,
      completed: tick.completed,
      needsMaintenance: tick.needsMaintenance,
      stateChanged: tick.changed,
    };
  }

  /**
   * Simulate weather changes over elapsed hours, drawn from the tick's SEEDED
   * stream (09 §10) so an offline replay reproduces the identical weather.
   * Returns an array of weather states that occurred, oldest first.
   */
  private simulateWeatherTimeline(
    chapter: Chapter,
    currentWeather: WeatherState,
    elapsedHours: number,
    rng: CallableRng,
  ): WeatherState[] {
    return engineSimulateWeatherTimeline(chapter, currentWeather, elapsedHours, rng);
  }

  private emptyResult(): SimulationResult {
    return {
      cropsSimulated: 0,
      cropsAdvanced: 0,
      cropsWithered: 0,
      cropsReady: 0,
      cropsStalled: 0,
      livestockSimulated: 0,
      livestockFed: 0,
      livestockProducts: 0,
      buildingsSimulated: 0,
      buildingsCompleted: 0,
      buildingsMaintenance: 0,
      weather: null,
      seasonChanged: false,
      newSeason: null,
      notifications: [],
      awayHours: 0,
      appliedHours: 0,
    };
  }
}
