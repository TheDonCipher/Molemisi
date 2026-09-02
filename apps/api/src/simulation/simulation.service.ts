import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import {
  getCropConfig,
  getAnimalConfig,
  getBuildingConfig,
  generateWeather,
  getSeasonGrowthModifier,
  getNextSeason,
  MAX_OFFLINE_HOURS,
  SELF_SUSTAINING_THRESHOLD_HOURS,
  WEATHER_CHANGE_INTERVAL,
  SEASON_DURATION_HOURS,
  type WeatherState,
  type Season,
} from '@molemisi/game-config';

interface CropInstanceRow {
  id: string;
  plot_id: string;
  farm_id: string;
  crop_type: string;
  growth_stage: number;
  max_growth_stages: number;
  hydration: number;
  health: number;
  fertilizer_active: boolean;
  fertilizer_bonus: number;
  disease_events: number;
  pest_events: number;
  planted_at: string;
  last_watered_at: string;
  expected_ready_at: string | null;
}

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

interface PlotRow {
  id: string;
  state: string;
}

export interface SimulationResult {
  cropsSimulated: number;
  cropsAdvanced: number;
  cropsWithered: number;
  cropsReady: number;
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
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Run the complete elapsed-time simulation for a farm.
   * Simulates: weather, crops, livestock, buildings, seasons.
   * Returns a summary for the welcome-back display.
   */
  async simulateFarm(farmId: string): Promise<SimulationResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get farm state
    const { data: farm } = await adminClient
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single();

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
    const weatherChanges = this.simulateWeatherTimeline(
      currentSeason,
      currentWeather,
      cappedHours,
    );
    if (weatherChanges.length > 0) {
      currentWeather = weatherChanges[weatherChanges.length - 1];
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

    // Get all active crops
    const { data: crops } = await adminClient
      .from('crop_instances')
      .select('*')
      .eq('farm_id', farmId);

    if (crops && crops.length > 0) {
      for (const rawCrop of crops) {
        const crop = rawCrop as unknown as CropInstanceRow;
        const cropResult = this.simulateCrop(crop, cappedHours, currentWeather);
        result.cropsSimulated++;

        if (cropResult.advanced) result.cropsAdvanced++;
        if (cropResult.withered) result.cropsWithered++;
        if (cropResult.ready) result.cropsReady++;

        // Update crop in database
        await adminClient
          .from('crop_instances')
          .update({
            growth_stage: cropResult.newStage,
            hydration: cropResult.newHydration,
            health: cropResult.newHealth,
            disease_events: cropResult.diseaseEvents,
            pest_events: cropResult.pestEvents,
            updated_at: new Date(now).toISOString(),
          })
          .eq('id', crop.id);

        // Update plot state
        await adminClient
          .from('farm_plots')
          .update({
            state: cropResult.newState,
            updated_at: new Date(now).toISOString(),
          })
          .eq('id', crop.plot_id);
      }
    }

    // Get all livestock
    const { data: livestock } = await adminClient
      .from('livestock')
      .select('*')
      .eq('farm_id', farmId);

    if (livestock && livestock.length > 0) {
      for (const rawAnimal of livestock) {
        const animal = rawAnimal as unknown as LivestockRow;
        const animalResult = this.simulateLivestock(animal, cappedHours);
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
      result.notifications.push(
        `${result.cropsReady} crop(s) ready for harvest!`,
      );
    }
    if (result.cropsWithered > 0) {
      result.notifications.push(
        `${result.cropsWithered} crop(s) withered from lack of water!`,
      );
    }
    if (result.livestockProducts > 0) {
      result.notifications.push(
        `${result.livestockProducts} animal product(s) ready to collect!`,
      );
    }
    if (result.buildingsMaintenance > 0) {
      result.notifications.push(
        `${result.buildingsMaintenance} building(s) need maintenance!`,
      );
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
   * Simulate a single crop's growth over elapsed hours.
   */
  private simulateCrop(
    crop: CropInstanceRow,
    elapsedHours: number,
    weather: WeatherState,
  ): {
    newStage: number;
    newHydration: number;
    newHealth: number;
    newState: string;
    diseaseEvents: number;
    pestEvents: number;
    advanced: boolean;
    withered: boolean;
    ready: boolean;
  } {
    const config = getCropConfig(crop.crop_type);
    if (!config) {
      return {
        newStage: crop.growth_stage,
        newHydration: crop.hydration,
        newHealth: crop.health,
        newState: 'GROWING',
        diseaseEvents: crop.disease_events,
        pestEvents: crop.pest_events,
        advanced: false,
        withered: false,
        ready: false,
      };
    }

    let hydration = crop.hydration;
    let health = crop.health;
    let diseaseEvents = crop.disease_events;
    let pestEvents = crop.pest_events;

    // Decay hydration
    const decayAmount = config.waterDecayRate * elapsedHours;
    hydration = Math.max(0, hydration - decayAmount);

    // Rain adds hydration
    if (weather.type === 'rain') {
      hydration = Math.min(1.0, hydration + 0.2 * elapsedHours);
    } else if (weather.type === 'storm') {
      hydration = Math.min(1.0, hydration + 0.3 * elapsedHours);
    }

    // Calculate growth
    let newStage = crop.growth_stage;
    const alreadyReady = crop.growth_stage >= crop.max_growth_stages;

    if (!alreadyReady && hydration > 0.2) {
      // Growth multiplier: scales with hydration (0.2-1.0)
      const hydrationMultiplier = Math.max(0.2, hydration);

      // Season modifier
      const seasonModifier = getSeasonGrowthModifier(weather.season);

      // Fertilizer bonus
      const fertilizerMultiplier = crop.fertilizer_active
        ? 1 + crop.fertilizer_bonus
        : 1;

      // Effective growth hours
      const effectiveGrowthHours =
        elapsedHours * hydrationMultiplier * seasonModifier * fertilizerMultiplier;

      // Hours per stage
      const hoursPerStage = config.timePerStage / 60;

      // How many stages can we advance?
      const stagesAdvanced = Math.floor(effectiveGrowthHours / hoursPerStage);

      if (stagesAdvanced > 0) {
        newStage = Math.min(crop.max_growth_stages, crop.growth_stage + stagesAdvanced);

        // Disease/pest check at each stage boundary
        for (let i = 0; i < stagesAdvanced; i++) {
          const diseaseChance = this.getDiseaseChance(config, weather, hydration);
          if (Math.random() < diseaseChance) {
            diseaseEvents++;
            health = Math.max(0, health - 0.25);
          }

          const pestChance = this.getPestChance(config, weather);
          if (Math.random() < pestChance) {
            pestEvents++;
            health = Math.max(0, health - 0.15);
          }
        }
      }
    }

    // Check for withering
    let newState = 'GROWING';
    let withered = false;
    let ready = false;

    if (hydration === 0 && elapsedHours > 6) {
      newState = 'WITHERED';
      withered = true;
    } else if (newStage >= crop.max_growth_stages) {
      newState = 'READY';
      ready = !alreadyReady;
    } else if (newStage > 0) {
      newState = 'GROWING';
    } else {
      newState = 'PLANTED';
    }

    return {
      newStage,
      newHydration: hydration,
      newHealth: health,
      newState,
      diseaseEvents,
      pestEvents,
      advanced: newStage > crop.growth_stage,
      withered,
      ready,
    };
  }

  /**
   * Simulate a single animal's state over elapsed hours.
   */
  private simulateLivestock(
    animal: LivestockRow,
    elapsedHours: number,
  ): {
    newHunger: number;
    newHealth: number;
    newHappiness: number;
    productReady: boolean;
    newProductTimer: number;
    isSick: boolean;
    wasFed: boolean;
    stateChanged: boolean;
  } {
    const config = getAnimalConfig(animal.animal_type);
    if (!config) {
      return {
        newHunger: animal.hunger,
        newHealth: animal.health,
        newHappiness: animal.happiness,
        productReady: animal.product_ready,
        newProductTimer: animal.product_timer,
        isSick: animal.is_sick,
        wasFed: false,
        stateChanged: false,
      };
    }

    let hunger = animal.hunger;
    let health = animal.health;
    let happiness = animal.happiness;
    let productReady = animal.product_ready;
    let productTimerHours = animal.product_timer_hours;

    // Check if in self-sustaining mode (offline > 3 days)
    const offlineDays = elapsedHours / 24;
    const selfSustaining = offlineDays > SELF_SUSTAINING_THRESHOLD_HOURS / 24;

    // Self-sustaining: reduced decay rates
    const hungerDecayRate = selfSustaining
      ? config.hungerDecayRate * 0.25
      : config.hungerDecayRate;

    // Decay hunger over elapsed hours
    const hungerDecay = hungerDecayRate * elapsedHours;
    hunger = Math.max(0, hunger - hungerDecay);

    // Health decay if starving (hunger < 0.2)
    if (hunger < 0.2) {
      const healthDecay = config.healthDecayRate * elapsedHours;
      health = Math.max(0, health - healthDecay);
    }

    // Happiness decay if not petted for 24+ hours
    if (!selfSustaining && animal.last_pet_at) {
      const hoursSincePet =
        elapsedHours -
        (Date.now() - new Date(animal.last_pet_at).getTime()) / (1000 * 60 * 60);
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
      isSick !== animal.is_sick;

    return {
      newHunger: hunger,
      newHealth: health,
      newHappiness: happiness,
      productReady,
      newProductTimer: productTimerHours,
      isSick,
      wasFed: false,
      stateChanged,
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
        (Date.now() - new Date(building.last_maintained_at).getTime()) /
        (1000 * 60 * 60);
      if (hoursSinceMaint > config.maintenanceIntervalDays * 24) {
        newState = 'DISABLED';
      }
    }

    const stateChanged =
      newState !== building.state || wear !== building.wear;

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

  /**
   * Calculate disease chance based on crop config, weather, and hydration.
   */
  private getDiseaseChance(
    config: { diseaseChancePerStage: number },
    weather: WeatherState,
    hydration: number,
  ): number {
    const baseChance = config.diseaseChancePerStage;
    const humidityModifier =
      weather.type === 'rain' ? 1.3 : weather.type === 'storm' ? 1.5 : 1.0;
    const hydrationModifier = hydration < 0.3 ? 1.2 : 1.0;
    return Math.min(baseChance * humidityModifier * hydrationModifier, 0.5);
  }

  /**
   * Calculate pest chance based on crop config and weather.
   */
  private getPestChance(
    config: { pestChancePerStage: number },
    weather: WeatherState,
  ): number {
    const baseChance = config.pestChancePerStage;
    const warmthModifier = weather.temperature > 30 ? 1.4 : 1.0;
    const rainModifier =
      weather.type === 'rain' || weather.type === 'storm' ? 0.5 : 1.0;
    return Math.min(baseChance * warmthModifier * rainModifier, 0.4);
  }

  private emptyResult(): SimulationResult {
    return {
      cropsSimulated: 0,
      cropsAdvanced: 0,
      cropsWithered: 0,
      cropsReady: 0,
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
