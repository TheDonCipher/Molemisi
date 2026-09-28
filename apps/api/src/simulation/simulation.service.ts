import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WaterService } from '../water/water.service';
import {
  getAnimalConfig,
  getBuildingConfig,
  generateWeather,
  getNextSeason,
  MAX_OFFLINE_HOURS,
  SELF_SUSTAINING_THRESHOLD_HOURS,
  STARVATION_ONSET_HOURS,
  WEATHER_CHANGE_INTERVAL,
  SEASON_DURATION_HOURS,
  type WeatherState,
  type Season,
} from '@molemisi/game-config';

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
  newSeason: Season | null;
  notifications: string[];
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
  async simulateFarm(farmId: string): Promise<SimulationResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get farm state
    const { data: farm } = await adminClient.from('farms').select('*').eq('id', farmId).single();

    if (!farm) {
      return this.emptyResult();
    }

    const farmRow = farm as unknown as FarmRow;
    const lastSimulated = new Date(farmRow.last_simulated_at).getTime();
    const now = Date.now();
    const elapsedMs = now - lastSimulated;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // Cap simulation at MAX_OFFLINE_HOURS
    const cappedHours = Math.min(elapsedHours, MAX_OFFLINE_HOURS);

    // If less than 1 minute has passed, skip simulation
    if (cappedHours < 1 / 60) {
      return this.emptyResult();
    }

    // Get current season and weather
    const currentSeason = (farmRow.season as Season) || 'spring';
    let currentWeather: WeatherState = {
      type: (farmRow.weather_state as WeatherState['type']) || 'clear',
      temperature: farmRow.weather_temperature || 25,
      humidity: farmRow.weather_humidity || 0.3,
      season: currentSeason,
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
    };

    // Simulate weather changes over elapsed time
    const weatherChanges = this.simulateWeatherTimeline(currentSeason, currentWeather, cappedHours);
    if (weatherChanges.length > 0) {
      currentWeather = weatherChanges[weatherChanges.length - 1]!;
      result.weather = currentWeather;
    }

    // Simulate season progression
    const hoursInCurrentSeason = farmRow.current_day
      ? (farmRow.current_day % (SEASON_DURATION_HOURS / 24)) * 24
      : 0;
    const totalHoursInSeason = hoursInCurrentSeason + cappedHours;

    if (totalHoursInSeason >= SEASON_DURATION_HOURS) {
      const newSeason = getNextSeason(currentSeason);
      result.seasonChanged = true;
      result.newSeason = newSeason;
      result.notifications.push(`Season changed to ${newSeason}!`);
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
        // 1.5 — livestock gets BOTH windows: the 24 h cap for growth stays, but
        // the self-sustaining rule reads the UNCAPPED elapsed time (G-4), so a
        // 4-day absence finally reaches `SELF_SUSTAINING_THRESHOLD_HOURS`.
        const animalResult = this.simulateLivestock(animal, cappedHours, elapsedHours);
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
        const buildingResult = this.simulateBuilding(building, cappedHours);
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
        season: result.newSeason || currentSeason,
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
    const config = getAnimalConfig(animal.animal_type);
    if (!config) {
      return {
        newHunger: animal.hunger,
        newHealth: animal.health,
        newHappiness: animal.happiness,
        productReady: animal.product_ready,
        newProductTimer: animal.product_timer_hours,
        isSick: animal.is_sick,
        wasFed: false,
        stateChanged: false,
        newHungerZeroSince: animal.hunger_zero_since ?? null,
      };
    }

    let hunger = animal.hunger;
    let health = animal.health;
    let happiness = animal.happiness;
    let productReady = animal.product_ready;
    let productTimerHours = animal.product_timer_hours;

    // 1.5 / G-4 — self-sustaining mode: computed from the UNCAPPED elapsed
    // time, livestock only. The old code divided the already-clamped 24 h by
    // 24, so `offlineDays <= 1` and the published "3 days then self-sustaining"
    // promise (docs/09 §9) could never fire — the constant was dead code and
    // every absence decayed at full rate. Now a 4-day absence yields true.
    const selfSustaining = uncappedHours > SELF_SUSTAINING_THRESHOLD_HOURS;

    const hungerDecayRate = selfSustaining ? config.hungerDecayRate * 0.25 : config.hungerDecayRate;
    const startingHunger = hunger;
    const hungerDecay = hungerDecayRate * elapsedHours;
    hunger = Math.max(0, hunger - hungerDecay);

    // 1.4 — STARVATION WINDOW (R1/P0-1). Health decays only after
    // `STARVATION_ONSET_HOURS` CONSECUTIVE hours at hunger 0 — not merely
    // "hunger < 0.2", which turned one overnight gap into a permanent
    // soft-lock (feeding threw, no heal endpoint existed). The window start is
    // persisted as `hunger_zero_since` so it survives across simulation passes.
    let newHungerZeroSince: string | null = animal.hunger_zero_since ?? null;
    if (selfSustaining) {
      // Self-sustaining is the off-switch: hunger is floored at 0.1 below and
      // no health may decay during a long absence.
      if (hunger > 0) newHungerZeroSince = null;
    } else if (hunger <= 0) {
      const nowMs = Date.now();
      const windowStartMs = nowMs - elapsedHours * 3_600_000;
      const parsedZero = animal.hunger_zero_since
        ? Date.parse(animal.hunger_zero_since)
        : Number.NaN;

      let hoursAtZeroBefore: number;
      let hoursAtZeroInWindow: number;
      let zeroSinceMs: number;
      if (startingHunger > 0) {
        // Hunger hit zero part-way through this window.
        const hoursToZero = Math.min(
          elapsedHours,
          hungerDecayRate > 0 ? startingHunger / hungerDecayRate : elapsedHours,
        );
        hoursAtZeroInWindow = Math.max(0, elapsedHours - hoursToZero);
        zeroSinceMs = nowMs - hoursAtZeroInWindow * 3_600_000;
        hoursAtZeroBefore = 0;
      } else {
        // Already at zero when this window opened — resume the persisted clock
        // (or start it at the window edge for rows predating the column).
        zeroSinceMs = Number.isFinite(parsedZero) ? parsedZero : windowStartMs;
        hoursAtZeroBefore = Math.max(0, (windowStartMs - zeroSinceMs) / 3_600_000);
        hoursAtZeroInWindow = elapsedHours;
      }
      newHungerZeroSince = new Date(zeroSinceMs).toISOString();

      // Hours that fall beyond the onset threshold, minus the portion already
      // "spent" before this window — so repeated passes never over-decay.
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

    // Happiness decay if not petted for 24+ hours
    if (!selfSustaining && animal.last_pet_at) {
      const hoursSincePet =
        elapsedHours - (Date.now() - new Date(animal.last_pet_at).getTime()) / (1000 * 60 * 60);
      if (hoursSincePet > 24) {
        happiness = Math.max(0, happiness - config.happinessDecayRate * elapsedHours);
      }
    }

    // Production check
    if (!selfSustaining && hunger > 0.5 && health > 0.5 && !productReady) {
      productTimerHours += elapsedHours;
      if (productTimerHours >= config.productionCycleHours) {
        productReady = true;
        productTimerHours = 0;
      }
    }

    // Self-sustaining mode: no production, minimum hunger
    if (selfSustaining) {
      hunger = Math.max(0.1, hunger);
      productReady = false;
    }

    const isSick = health < 0.3;
    const stateChanged =
      hunger !== animal.hunger ||
      health !== animal.health ||
      happiness !== animal.happiness ||
      productReady !== animal.product_ready ||
      productTimerHours !== animal.product_timer_hours ||
      isSick !== animal.is_sick ||
      (newHungerZeroSince ?? null) !== (animal.hunger_zero_since ?? null);

    return {
      newHunger: hunger,
      newHealth: health,
      newHappiness: happiness,
      productReady,
      newProductTimer: productTimerHours,
      isSick,
      wasFed: false,
      stateChanged,
      newHungerZeroSince,
    };
  }

  /**
   * Simulate a building's state over elapsed hours.
   */
  private simulateBuilding(
    building: BuildingRow,
    elapsedHours: number,
  ): {
    newState: string;
    newWear: number;
    completed: boolean;
    needsMaintenance: boolean;
    stateChanged: boolean;
  } {
    const config = getBuildingConfig(building.building_type);
    if (!config) {
      return {
        newState: building.state,
        newWear: building.wear,
        completed: false,
        needsMaintenance: false,
        stateChanged: false,
      };
    }

    let newState = building.state;
    let wear = building.wear;
    let completed = false;
    let needsMaintenance = false;

    // Construction timer
    if (building.state === 'CONSTRUCTION' && building.construction_ends_at) {
      const constructionEnd = new Date(building.construction_ends_at).getTime();
      const now = Date.now();
      if (now >= constructionEnd) {
        newState = 'ACTIVE';
        wear = 0;
        completed = true;
      }
    }

    // Wear accumulation for active buildings
    if (newState === 'ACTIVE') {
      const wearIncrease = config.wearPerHour * elapsedHours;
      wear = Math.min(1.0, wear + wearIncrease);

      if (wear >= 1.0) {
        newState = 'MAINTENANCE_NEEDED';
        needsMaintenance = true;
      }
    }

    // Check if maintenance overdue
    if (newState === 'MAINTENANCE_NEEDED') {
      const hoursSinceMaint =
        (Date.now() - new Date(building.last_maintained_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceMaint > config.maintenanceIntervalDays * 24) {
        newState = 'DISABLED';
      }
    }

    const stateChanged = newState !== building.state || wear !== building.wear;

    return {
      newState,
      newWear: wear,
      completed,
      needsMaintenance,
      stateChanged,
    };
  }

  /**
   * Simulate weather changes over elapsed hours.
   * Returns an array of weather states that occurred.
   */
  private simulateWeatherTimeline(
    currentSeason: Season,
    currentWeather: WeatherState,
    elapsedHours: number,
  ): WeatherState[] {
    const changes: WeatherState[] = [currentWeather];
    let remainingHours = elapsedHours;
    let lastWeather = currentWeather;

    while (remainingHours >= WEATHER_CHANGE_INTERVAL) {
      remainingHours -= WEATHER_CHANGE_INTERVAL;
      // Use the season from the latest weather (may change)
      const newWeather = generateWeather(lastWeather.season);
      changes.push(newWeather);
      lastWeather = newWeather;
    }

    return changes;
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
    };
  }
}
