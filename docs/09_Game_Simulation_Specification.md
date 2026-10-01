# Document 09: Game Simulation Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target), **reconciled to the as-built engine 2026-10-02**
> Last Updated: 2026-10-02
> Implementation: `apps/api/src/simulation/simulation.service.ts` runs on `GET /farms/current`
> (live read path). `apps/api/src/simulation/engine/` is a **pure, seeded, deterministic**
> orchestrator — `runSimulation(input) => output`, no clock reads, no global RNG, no I/O — and is
> where the per-system time windows are defined. No dedicated simulation HTTP API.

> **Read §9 before trusting any other cap number.** This document originally said "cap offline
> accumulation at 24 h for most systems" and the code did exactly that everywhere, which silently
> killed three separate rulings. The as-built rule is a per-system table, now in one place:
> `engine/time.ts`.

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

**When simulation runs (on player connect):**

1. Calculate elapsed time since last simulation
2. Resolve the per-system time windows (§9, `engine/time.ts::resolveTimeWindows`)
3. Apply all time-dependent state changes in one pass
4. Update `last_simulated_at`
5. Return new state

There is no background job and no cron: simulation is computed on read and persisted on write.

### Simulation Entry Point

The literal signature below is the **reference model**. The as-built code splits the two
concerns, and the split is deliberate:

```typescript
// PURE — apps/api/src/simulation/engine/index.ts
// No clock reads (the instant is input.now), no global RNG (every draw comes from
// input.seed), no I/O. This is what makes the engine testable (16 §5) and
// reproducible (§10): a captured SimulationInput replays to an identical output.
export function runSimulation(input: SimulationInput): SimulationOutput;
```

```typescript
// IMPURE — apps/api/src/simulation/simulation.service.ts
// Owns Supabase and the real clock; invoked from GET /farms/current.
async function simulateFarm(farmId: string, currentTime: Date): Promise<SimulationResult> {
  const farm = await getFarm(farmId);
  const elapsedHours = (currentTime.getTime() - farm.lastSimulatedAt.getTime()) / 3_600_000;

  // 1 real hour = 1 game hour (doc 32 / G-1: was wrongly "1 real minute = 1 game hour")

  // Resolve every window from ONE uncapped elapsed figure (engine/time.ts).
  const w = resolveTimeWindows(elapsedHours);

  // Crops and weather see the 24 h cap; livestock sees 72 h; building wear is uncapped.
  const result = runSimulation({
    now: currentTime,
    elapsedHours,
    weather: farm.weather,
    chapter: chapterForDate(currentTime),
    crops: farm.crops,
    livestock: farm.animals,
    buildings: farm.buildings,
    seed: farm.simulationSeed,
  });

  await updateFarmState(farmId, result, currentTime);
  return result;
}
```

> **Crop reconciliation note.** In the live path, crop advancement still goes through the
> tank-gated `WaterService.advanceFarmGrowth`, because an empty Jojo tank must halt the growth
> timer and that check is a database read. `engine/crops.ts` holds the same rules in pure form
> for the offline simulator and the engine suite. The rules have one home; the *gating* differs.

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
    const fertilizerMultiplier = crop.fertilizerActive ? 1 + crop.fertilizerBonus : 1;
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
  const humidityModifier = weather.type === 'rain' ? 1.3 : weather.type === 'storm' ? 1.5 : 1.0;

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
  const rainModifier = weather.type === 'rain' || weather.type === 'storm' ? 0.5 : 1.0;

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

  // Self-sustaining mode. DECIDED: compare the threshold against the UNCAPPED
  // away-time, not the clamped window. Comparing against the clamped window is
  // what made SELF_SUSTAINING_THRESHOLD_HOURS a dead constant (doc 30 G-4):
  // elapsedHours was already min(elapsed, 24), so offlineDays could never exceed 1.
  const selfSustaining = awayHours > SELF_SUSTAINING_THRESHOLD_HOURS;

  // Self-sustaining: reduced decay rates
  const hungerDecayRate = selfSustaining
    ? getAnimalConfig(animal.animalType).hungerDecayRate * 0.25
    : getAnimalConfig(animal.animalType).hungerDecayRate;

  for (let hour = 0; hour < elapsedHours; hour++) {
    // 1. Hunger decay
    hunger = Math.max(0, hunger - hungerDecayRate);

    // 2. Health decay — STARVATION WINDOW (doc 30 G-2). Health only begins to
    //    fall after 12 CONSECUTIVE hours at hunger === 0, tracked by the persisted
    //    `hunger_zero_since` column. The old `hunger < 0.2` test made a single
    //    overnight gap permanently kill an animal (chicken ~7 h to unrecoverable),
    //    which is a game-over state in a game that promises there are none.
    if (hunger === 0) {
      if (hungerZeroSince === null) hungerZeroSince = nowMs;
      if ((nowMs - hungerZeroSince) / 3_600_000 >= STARVATION_WINDOW_HOURS) {
        health = Math.max(0, health - 0.1);
      }
    } else {
      hungerZeroSince = null;
    }

    // 3. Happiness decay if overcrowded or not petted
    if (!selfSustaining && hour % 24 === 0) {
      const timeSincePet =
        elapsedHours -
        (animal.lastPetAt ? (Date.now() - animal.lastPetAt.getTime()) / (1000 * 60) : 0);
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
    hungerZeroSince,
    isSick: health < 0.3,
  };
}
```

> **Feeding is no longer free.** `feedAnimal` debits `{ feedType, feedPerDay }` from the
> player's inventory atomically via `InventoryService` and throws a 4xx when the player has
> none. `AnimalConfig.feedPerDay` is read server-side, so the number the Feed button renders is
> the number the server charges. A per-kraal action feeds every feedable animal in one tap,
> summing rations atomically; the per-animal path is kept as a fallback. All four animals are fed
> `sorghum` — the old goat/cow `herbs` mapping (baseValue P25) made three of four animals
> net-negative, and `livestock.spec.ts` now asserts every animal is net-positive per day.

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
    case 'spring':
      return { clear: 0.35, cloudy: 0.25, rain: 0.25, storm: 0.1, drought: 0.05 };
    case 'summer':
      return { clear: 0.45, cloudy: 0.2, rain: 0.15, storm: 0.1, drought: 0.1 };
    case 'autumn':
      return { clear: 0.4, cloudy: 0.25, rain: 0.2, storm: 0.1, drought: 0.05 };
    case 'winter':
      return { clear: 0.5, cloudy: 0.25, rain: 0.1, storm: 0.05, drought: 0.1 };
  }
}
```

---

## 8. Building Simulation

**NFR-SIM-007**

### Construction Timer

Construction is an **absolute timer**, not an accumulated one — a building under construction
simply reaches its end time. Capping it would be meaningless.

### Wear — UNCAPPED (corrected 2026-09-28)

> The pseudocode below takes a single `elapsedHours`. As built, wear and construction use
> **different** windows: construction is absolute, and wear is applied against the **uncapped**
> away-time. This was G-13 — with a 24 h cap, a player who checked in daily wore their buildings
> ~7× faster than a player who checked in weekly, which is the opposite of what "wear per hour"
> means. `resolveTimeWindows()` returns `buildingWearHours` uncapped for exactly this reason.

```typescript
function simulateBuilding(building: Building, elapsedHours: number, nowMs: number): BuildingUpdate {
  if (building.state === 'CONSTRUCTION') {
    // Absolute: it ends when it ends.
    if (nowMs >= building.constructionEndsAt.getTime()) {
      return { ...building, state: 'ACTIVE', wear: 0 };
    }
  }

  if (building.state === 'ACTIVE') {
    // Accumulate wear over the UNCAPPED elapsed hours.
    const wearPerHour = getBuildingConfig(building.buildingType).wearPerHour;
    const newWear = Math.min(1.0, building.wear + wearPerHour * elapsedHours);

    if (newWear >= 1.0) {
      return { ...building, state: 'MAINTENANCE_NEEDED', wear: newWear };
    }

    // Check if maintenance overdue
    const hoursSinceMaint = (nowMs - building.lastMaintainedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceMaint > MAINTENANCE.intervalDays * 24 && building.state === 'MAINTENANCE_NEEDED') {
      return { ...building, state: 'DISABLED', wear: 1.0 };
    }

    return { ...building, wear: newWear };
  }

  return building;
}
```

**Maintenance cadence (changed 2026-10-01, `docs/34` §1.3):** `MAINTENANCE.intervalDays` is
**30**, not 90, with `warningLeadHours: 24`. The bill is **unchanged** — the period was divided
by three while the bill was held, so the *daily* drain triples (P3 → ~P9.5/day) while the
*annual* cost is identical. A ⅓ bill on a ⅓ period is the same daily rate and would have
smoothed the lump while fixing nothing; the whole point is that a quarterly lump followed by
three dead months left the material economy flat between bills. `economy.spec.ts` asserts the
cadence, that all four buildings agree, and that bill/period rose exactly 3× with the annual
bill unmoved.

---

## 9. Offline Progression

**NFR-SIM-008**

### Offline Caps — the as-built per-system table

> This section is the authority. The earlier text here said "24 hours for most systems" and the
> code applied 24 h *everywhere*, which silently disabled the livestock self-sustaining ruling
> (G-4) and made a four-day absence decay as though the player had been gone one day. The windows
> now live in **one function**: `apps/api/src/simulation/engine/time.ts::resolveTimeWindows()`.

| System | Window | Constant | Why |
| --- | --- | --- | --- |
| Crops (growth) | **24 h cap** | `MAX_OFFLINE_HOURS` | A once-daily check-in must not be out-run |
| Weather | **24 h cap** | `MAX_OFFLINE_HOURS` | Only weather crops will ever see it |
| Livestock hunger / health / production | **72 h cap** | `LIVESTOCK_OFFLINE_CAP_HOURS` | "decays up to three days" — this document's own rule |
| Livestock self-sustaining decision | **UNCAPPED** | `SELF_SUSTAINING_THRESHOLD_HOURS` (72) | Compared against true away-time, so it can fire at all |
| Building construction | **absolute timer** | — | Ends on its own; a cap is meaningless |
| Building wear | **UNCAPPED** | — | Weekly is not 7× the daily wear (G-13) |
| Kagiso / crafting jobs / chapter rollover | recomputed on read | — | Never a stored timer |

```typescript
// apps/api/src/simulation/engine/time.ts — the whole rule, in one place.
export const CROP_OFFLINE_CAP_HOURS   = MAX_OFFLINE_HOURS;              // 24
export const LIVESTOCK_OFFLINE_CAP_HOURS = SELF_SUSTAINING_THRESHOLD_HOURS; // 72
export const MIN_SIMULATED_HOURS = 1 / 60; // sub-minute reads do nothing

export function resolveTimeWindows(elapsedHours: number): TimeWindows {
  const away = Number.isFinite(elapsedHours) && elapsedHours > 0 ? elapsedHours : 0;
  return {
    awayHours: away,                                  // never clamped
    systemHours: Math.min(away, CROP_OFFLINE_CAP_HOURS),
    livestockHours: Math.min(away, LIVESTOCK_OFFLINE_CAP_HOURS),
    livestockAwayHours: away,                         // for the self-sustain test only
    buildingWearHours: away,                          // uncapped by design
  };
}
```

**There is no energy system**, so the old "Energy — 24 hours — capped at max" row has no
counterpart in the code and has been removed rather than left as a phantom.

### Self-Sustaining Mode

After **72 hours of uncapped** absence, animals enter self-sustaining mode:

- Hunger decays at **25 %** rate
- No production
- No health decay
- No happiness decay
- Minimum hunger: **0.1**

This is the answer to the product's no-punitive-mechanics constraint: leave for a week, come
back, and your kraal is exactly as you left it rather than a graveyard. The structural invariant
is proven in code by `engine/livestock.ts` and asserted in `engine.spec.ts`.

### Starvation window (added 2026-09-28)

Even inside the 72 h window, health only begins to decay after **12 consecutive hours** at
`hunger === 0`, tracked by the persisted `hunger_zero_since` column (migration
`20260928000001_livestock_starvation_window.sql`). Without it the old `hunger < 0.2` test put a
fully-fed animal into an unrecoverable sick state in 7–11.7 h depending on species, and feeding
was then refused — an unrecoverable death, i.e. a game-over state, in a cozy game.

### Catch-Up Display

When a player returns after absence:

1. Calculate elapsed time
2. Resolve the per-system windows
3. Run simulation
4. Display "Welcome back!" summary:
   - Crops harvested (if ready)
   - Animals that needed feeding
   - Buildings that need maintenance
   - Resources gathered automatically
   - Weather events that occurred

`runSimulation()` returns a `notifications: string[]` built from the tick totals
(`buildNotifications()` in `engine/index.ts`), so the summary is derived from the same pass that
mutated state — it cannot drift from what actually happened.

---

## 10. Deterministic Testing

**NFR-SIM-009**

The simulation must be testable with fixed seeds. **This is now structural rather than aspirational**:
`runSimulation()` takes the instant as `input.now` and every random draw from `input.seed`, so
there is no `Date.now()` and no `Math.random()` to stub. A captured `SimulationInput` replays to
a byte-identical `SimulationOutput`.

```typescript
// The seeded generator lives in packages/game-config/src/rng.ts.
const root = createRng(input.seed);
```

One RNG **root stream per tick**; each system takes a named child via `root.fork('weather')` or
`root.fork('crop:' + crop.id)` and so on. Forking per system rather than sharing one stream is
what makes the guarantee survive maintenance: adding a draw in weather cannot shift the
sequence livestock sees, so a weather tuning change does not silently rewrite every livestock
test vector.

```typescript
// A test is just: build an input, call it twice, assert equality.
const input: SimulationInput = { now, elapsedHours: 24, weather, chapter, crops, livestock, buildings, seed: 42 };
expect(runSimulation(input)).toEqual(runSimulation(input));
```

`apps/api/src/simulation/engine/engine.spec.ts` does exactly this, alongside the per-system
assertions below.

### Test Vectors

| Test Case | Input | Expected Output |
| --- | --- | --- |
| Crop growth, fully watered | 4 hours, hydration 1.0 | Stage +1 |
| Crop growth, dry | 4 hours, hydration 0.0 | No growth |
| Crop withering | 8 hours, hydration 0.0 | WITHERED |
| Animal hunger decay | 12 hours, hunger 0.8 | hunger reduced by `hungerDecayRate × 12` |
| Animal starvation (inside window) | 12 hours at `hunger == 0` | health **unchanged** — the window has not elapsed |
| Animal starvation (past window) | 24 hours at `hunger == 0` | health decreased |
| Self-sustaining triggers | **96 h** away | `selfSustaining === true` (proves the threshold reads uncapped time) |
| Livestock window | 96 h away | decay applied for **72 h**, not 96 and not 24 |
| Building wear, weekly absence | 168 h away | wear accumulated for **168 h** |
| Crop cap | 96 h away | growth applied for **24 h** |
| Production completion | 30 minutes | progress = 1.0 |
| Weather change | 6 hours | New weather generated |

> The last five rows are the regressions that the old "cap everything at 24 h" implementation
> would fail. They exist specifically so the per-system table in §9 cannot silently collapse
> back into a single global cap.

---

## 11. Corrupted-State Detection and Recovery

**NFR-SIM-010** (added 2026-10-02)

Server-authoritative simulation is also the last line of defence against a corrupted state. Per
doc 11 §5 the engine must not merely *detect* a bad state — it must name the corrective action
so a caller can apply it and log an incident.

`apps/api/src/simulation/state-validation.ts` implements this as **two pure functions**:

```typescript
validateGameState(snapshot: GameStateSnapshot, now?: Date): ValidationResult;
planRecovery(result: ValidationResult): RecoveryAction[];  // deterministic, same issues => same plan
```

| Code | Meaning | Recovery action |
| --- | --- | --- |
| `NEGATIVE_CURRENCY` | `pula_balance` < 0 | `SET_CURRENCY_ZERO` |
| `NEGATIVE_BOTHO` | `botho_points` < 0 | `SET_BOTHO_ZERO` |
| `NEGATIVE_INVENTORY` | a row with quantity < 0 | `SET_INVENTORY_ZERO` |
| `ORPHAN_CROP` | plot `PLANTED`/`GROWING`/`READY` with no crop | `REMOVE_ORPHAN_CROP` |
| `PLOT_WITHOUT_CROP` | the inverse — a crop on an empty plot | `REMOVE_ORPHAN_CROP` |
| `STALE_SIMULATION` | `last_simulated_at` older than the 24 h cap, or absent/unparseable | `RERUN_SIMULATION` |
| `FUTURE_SIMULATION` | `last_simulated_at` in the future (clock skew or tamper) | `RERUN_SIMULATION` |

Both halves are pure so they can run inside the anti-cheat pass, inside a migration's
reconciliation block, or inside a Jest test with no database at all.

> **Known gap:** this is wired into the anti-cheat pass but there is **no cron or admin sweep**
> that walks all farms, so a corrupted row on a dormant account is only detected when that player
> returns. See `KNOWN_LIMITATIONS.md`.
