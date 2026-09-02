# Document 09: Game Simulation Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-02

---

## 1. Simulation Overview

**NFR-SIM-001**

The game simulation is the authoritative engine that advances all time-dependent game state. It runs server-side in NestJS and is completely independent of rendering.

### Core Principle

```
last_simulated_at + elapsed_time + game_state + rules = new_game_state
```

The simulation is **deterministic** — given the same inputs, it produces the same outputs.

---

## 2. Simulation Engine

### Tick-Based Design

The simulation does NOT update every entity every second. Instead, it uses **elapsed-time calculations**.

**When simulation runs (on player connect or background job):**
1. Calculate elapsed time since last simulation
2. Apply all time-dependent state changes in one pass
3. Update `last_simulated_at`
4. Return new state

### Simulation Entry Point

```typescript
async function simulateFarm(farmId: string, currentTime: Date): Promise<SimulationResult> {
  const farm = await getFarm(farmId);
  const elapsed = currentTime.getTime() - farm.lastSimulatedAt.getTime();
  const elapsedHours = elapsed / (1000 * 60); // 1 real minute = 1 game hour

  // Cap simulation at 24 hours
  const cappedHours = Math.min(elapsedHours, 24);

  const result: SimulationResult = {
    crops: [],
    livestock: [],
    buildings: [],
    weather: null,
    notifications: [],
  };

  // Simulate each system
  result.crops = simulateCrops(farm, cappedHours);
  result.livestock = simulateLivestock(farm, cappedHours);
  result.buildings = simulateBuildings(farm, cappedHours);
  result.weather = simulateWeather(farm, cappedHours);
  result.notifications = generateNotifications(result);

  // Update farm state
  await updateFarmState(farmId, result, currentTime);

  return result;
}
```

---

## 3. Crop Simulation

**NFR-SIM-002**

### Growth Calculation

```typescript
function simulateCrop(crop: CropInstance, elapsedHours: number, weather: WeatherState): CropUpdate {
  let currentStage = crop.growthStage;
  let currentHydration = crop.hydration;
  let health = crop.health;
  let diseaseEvents = crop.diseaseEvents;
  let pestEvents = crop.pestEvents;

  for (let hour = 0; hour < elapsedHours; hour++) {
    // 1. Decay hydration
    const waterDecay = getCropConfig(crop.cropType).waterDecayRate;
    currentHydration = Math.max(0, currentHydration - waterDecay);

    // 2. Calculate growth multiplier
    const growthMultiplier = currentHydration >= 0.2 ? currentHydration : 0;
    const fertilizerMultiplier = crop.fertilizerActive ? (1 + crop.fertilizerBonus) : 1;
    const seasonMultiplier = getSeasonGrowthModifier(weather.season);
    const effectiveMultiplier = growthMultiplier * fertilizerMultiplier * seasonMultiplier;

    // 3. Check if growth stage advances
    if (effectiveMultiplier > 0 && currentStage < crop.maxStages) {
      const stageTimeRequired = getCropConfig(crop.cropType).timePerStage;
      // Track cumulative effective time
      crop.cumulativeEffectiveTime = (crop.cumulativeEffectiveTime || 0) + effectiveMultiplier;
      
      if (crop.cumulativeEffectiveTime >= stageTimeRequired) {
        currentStage++;
        crop.cumulativeEffectiveTime = 0;

        // 4. Disease check at each stage boundary
        if (Math.random() < getDiseaseChance(crop, weather)) {
          diseaseEvents++;
          health = Math.max(0, health - 0.25);
        }

        // 5. Pest check at each stage boundary
        if (Math.random() < getPestChance(crop, weather)) {
          pestEvents++;
          health = Math.max(0, health - 0.15);
        }
      }
    }

    // 6. Check for withering
    if (currentHydration === 0 && hour > 6) {
      // Withered if dry for more than 6 hours
      return { ...crop, state: 'WITHERED', growthStage: currentStage, hydration: 0, health };
    }
  }

  return {
    ...crop,
    growthStage: currentStage,
    hydration: currentHydration,
    health,
    diseaseEvents,
    pestEvents,
    state: currentStage >= crop.maxStages ? 'READY' : 'GROWING',
  };
}
```

### Disease and Pest Formulas

```typescript
function getDiseaseChance(crop: CropInstance, weather: WeatherState): number {
  const config = getCropConfig(crop.cropType);
  const baseChance = config.diseaseChancePerStage;
  
  // Increase in humid weather
  const humidityModifier = weather.type === 'rain' ? 1.3 : 
                           weather.type === 'storm' ? 1.5 : 1.0;
  
  // Increase when hydrated poorly
  const hydrationModifier = crop.hydration < 0.3 ? 1.2 : 1.0;
  
  return Math.min(baseChance * humidityModifier * hydrationModifier, 0.5);
}

function getPestChance(crop: CropInstance, weather: WeatherState): number {
  const config = getCropConfig(crop.cropType);
  const baseChance = config.pestChancePerStage;
  
  // Increase in warm weather
  const warmthModifier = weather.temperature > 30 ? 1.4 : 1.0;
  
  // Decrease in rain
  const rainModifier = (weather.type === 'rain' || weather.type === 'storm') ? 0.5 : 1.0;
  
  return Math.min(baseChance * warmthModifier * rainModifier, 0.4);
}
```

---

## 4. Water Simulation

**NFR-SIM-003**

### Hydration Decay

```typescript
function simulateWaterDecay(crop: CropInstance, elapsedHours: number): number {
  const config = getCropConfig(crop.cropType);
  let hydration = crop.hydration;

  for (let hour = 0; hour < elapsedHours; hour++) {
    hydration = Math.max(0, hydration - config.waterDecayRate);
    
    // Rain adds hydration
    if (currentWeather === 'rain') {
      hydration = Math.min(1.0, hydration + 0.2);
    } else if (currentWeather === 'storm') {
      hydration = Math.min(1.0, hydration + 0.3);
    }
  }

  return hydration;
}
```

---

## 5. Livestock Simulation

**NFR-SIM-004**

### Hunger Decay

```typescript
function simulateLivestock(animal: Livestock, elapsedHours: number): LivestockUpdate {
  let hunger = animal.hunger;
  let health = animal.health;
  let happiness = animal.happiness;
  let productReady = animal.productReady;
  let productTimer = animal.productTimer;

  // Check if in self-sustaining mode (offline > 3 days)
  const offlineDays = elapsedHours / 24;
  const selfSustaining = offlineDays > 3;

  const hungerDecayRate = selfSustaining ? 0.04 : 0.15; // 75% reduction

  for (let hour = 0; hour < elapsedHours; hour++) {
    // 1. Hunger decay
    hunger = Math.max(0, hunger - hungerDecayRate);

    // 2. Health decay if starving
    if (hunger < 0.2) {
      health = Math.max(0, health - 0.1);
    }

    // 3. Happiness decay if overcrowded or not petted
    if (!selfSustaining && hour % 24 === 0) {
      const timeSincePet = elapsedHours - (animal.lastPetAt ? 
        (Date.now() - animal.lastPetAt.getTime()) / (1000 * 60) : 0);
      if (timeSincePet > 24) {
        happiness = Math.max(0, happiness - 0.05);
      }
    }

    // 4. Production check
    if (!selfSustaining && hunger > 0.5 && health > 0.5 && !productReady) {
      productTimer = (productTimer || 0) + 1;
      const productionCycle = getAnimalConfig(animal.animalType).productionCycleHours;
      if (productTimer >= productionCycle) {
        productReady = true;
        productTimer = 0;
      }
    }
  }

  // Self-sustaining mode: no production, minimum hunger
  if (selfSustaining) {
    hunger = Math.max(0.1, hunger);
    productReady = false;
  }

  return {
    ...animal,
    hunger,
    health,
    happiness,
    productReady,
    productTimer,
    isSick: health < 0.3,
  };
}
```

---

## 6. Production Simulation

**NFR-SIM-005**

### Production Jobs

```typescript
function simulateProduction(job: ProductionJob, elapsedHours: number): ProductionJobUpdate {
  const elapsedMinutes = elapsedHours * 60;
  const totalMinutes = (job.endsAt.getTime() - job.startedAt.getTime()) / (1000 * 60);
  const progress = Math.min(1.0, elapsedMinutes / totalMinutes);

  return {
    ...job,
    progress,
    completed: progress >= 1.0,
  };
}
```

---

## 7. Weather Simulation

**NFR-SIM-006**

### Weather Determination

Weather changes every 6 game hours (6 real-time minutes).

```typescript
function simulateWeather(farm: Farm, elapsedHours: number): WeatherState[] {
  const weatherChanges: WeatherState[] = [];
  const hoursBetweenChanges = 6;

  for (let hour = 0; hour < elapsedHours; hour += hoursBetweenChanges) {
    const season = farm.season;
    const weather = generateWeather(season);
    weatherChanges.push(weather);
  }

  return weatherChanges;
}

function generateWeather(season: Season): WeatherState {
  const probabilities = getSeasonWeatherProbabilities(season);
  const roll = Math.random();
  
  let cumulative = 0;
  for (const [weather, prob] of Object.entries(probabilities)) {
    cumulative += prob;
    if (roll <= cumulative) {
      return {
        type: weather as WeatherType,
        temperature: getTemperature(season, weather),
        humidity: getHumidity(weather),
        season,
      };
    }
  }

  return { type: 'clear', temperature: 25, humidity: 0.3, season };
}

function getSeasonWeatherProbabilities(season: Season): Record<WeatherType, number> {
  switch (season) {
    case 'spring': return { clear: 0.35, cloudy: 0.25, rain: 0.25, storm: 0.10, drought: 0.05 };
    case 'summer': return { clear: 0.45, cloudy: 0.20, rain: 0.15, storm: 0.10, drought: 0.10 };
    case 'autumn': return { clear: 0.40, cloudy: 0.25, rain: 0.20, storm: 0.10, drought: 0.05 };
    case 'winter': return { clear: 0.50, cloudy: 0.25, rain: 0.10, storm: 0.05, drought: 0.10 };
  }
}
```

---

## 8. Building Simulation

**NFR-SIM-007**

### Construction Timer

```typescript
function simulateBuilding(building: Building, elapsedHours: number): BuildingUpdate {
  if (building.state === 'CONSTRUCTION') {
    const elapsedMinutes = elapsedHours * 60;
    const constructionMinutes = (building.constructionEndsAt.getTime() - building.constructionStartedAt.getTime()) / (1000 * 60);
    
    if (elapsedMinutes >= constructionMinutes) {
      return { ...building, state: 'ACTIVE', wear: 0 };
    }
  }

  if (building.state === 'ACTIVE') {
    // Accumulate wear
    const wearPerHour = getBuildingConfig(building.buildingType).wearPerHour;
    const newWear = Math.min(1.0, building.wear + (wearPerHour * elapsedHours));

    if (newWear >= 1.0) {
      return { ...building, state: 'MAINTENANCE_NEEDED', wear: newWear };
    }

    // Check if maintenance overdue
    const hoursSinceMaint = (Date.now() - building.lastMaintainedAt.getTime()) / (1000 * 60);
    if (hoursSinceMaint > 72 && building.state === 'MAINTENANCE_NEEDED') {
      return { ...building, state: 'DISABLED', wear: 1.0 };
    }

    return { ...building, wear: newWear };
  }

  return building;
}
```

---

## 9. Offline Progression

**NFR-SIM-008**

### Offline Caps

| System | Max Offline Time | Behavior After Cap |
|--------|-----------------|-------------------|
| Crops | 24 hours | Paused |
| Livestock | 3 days (self-sustaining after) | Minimal decay |
| Buildings | 24 hours | Paused |
| Energy | 24 hours | Capped at max |

### Self-Sustaining Mode

After 3 days offline, animals enter self-sustaining mode:
- Hunger decays at 25% rate
- No production
- No health decay
- Minimum hunger: 0.1

### Catch-Up Display

When a player returns after absence:
1. Calculate elapsed time
2. Run simulation
3. Display "Welcome back!" summary:
   - Crops harvested (if ready)
   - Animals that needed feeding
   - Buildings that need maintenance
   - Resources gathered automatically
   - Weather events that occurred

---

## 10. Deterministic Testing

**NFR-SIM-009**

The simulation must be testable with fixed seeds:

```typescript
// For testing, use a seeded random number generator
function simulateWithSeed(farm: Farm, elapsedHours: number, seed: number): SimulationResult {
  const rng = seedRandom(seed);
  // Replace Math.random() with rng() in all simulation functions
  // ...
}
```

### Test Vectors

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Crop growth, fully watered | 4 hours, hydration 1.0 | Stage +1 |
| Crop growth, dry | 4 hours, hydration 0.0 | No growth |
| Crop withering | 8 hours, hydration 0.0 | WITHERED |
| Animal hunger decay | 12 hours, hunger 0.8 | hunger ≈ 0.02 |
| Animal starvation | 24 hours, hunger 0.1 | health decreased |
| Production completion | 30 minutes | progress = 1.0 |
| Weather change | 6 hours | New weather generated |
