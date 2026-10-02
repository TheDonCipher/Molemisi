/**
 * Game Simulation test suite (16 §5 / NFR-TST-005).
 *
 * Targets the three things the engine promises:
 *   1. DETERMINISM — same (state, elapsed, seed) => same output (09 §10).
 *   2. TIME WINDOWS — 24 h for crops/weather, 72 h for livestock, wear uncapped
 *      (09 §9 reconciled in ./engine/time.ts).
 *   3. TRANSITION CORRECTNESS — growth/hydration/withering, hunger/health/
 *      production at the 24 h and 72 h boundaries, construction and wear.
 *
 * NOTE ON STALE SPEC VECTORS: 09 §10's illustrative table ("4 h fully watered
 * => stage +1") predates the retuned crop table — no crop matures in <18 h, so
 * 4 h cannot cross a stage for ANY crop. The expectations below assert against
 * the real `CROPS` config and call the drift out explicitly.
 */

import {
  CROP_SIM,
  resolveTimeWindows,
  belowSimulationFloor,
  CROP_OFFLINE_CAP_HOURS,
  LIVESTOCK_OFFLINE_CAP_HOURS,
  simulateCrop,
  simulateLivestock,
  simulateBuilding,
  simulateWeatherTimeline,
  runSimulation,
  stageFor,
  type CropState,
  type LivestockState,
  type BuildingState,
  type SimulationInput,
} from './index';
import {
  CROPS,
  MAX_OFFLINE_HOURS,
  SELF_SUSTAINING_THRESHOLD_HOURS,
  WEATHER_CHANGE_INTERVAL,
  chapterForDate,
  createRng,
  getAnimalConfig,
  getBuildingConfig,
  type WeatherState,
} from '@molemisi/game-config';

const weather = (over: Partial<WeatherState> = {}): WeatherState => ({
  type: 'clear',
  temperature: 26,
  humidity: 0.3,
  season: 'pula',
  ...over,
});

const makeCrop = (over: Partial<CropState> = {}): CropState => ({
  id: 'crop-1',
  plotId: 'plot-1',
  cropType: 'sorghum',
  growthProgressHours: 0,
  growthStage: 0,
  hydration: 1,
  health: 1,
  fertilizerActive: false,
  fertilizerBonus: 0,
  ...over,
});

const makeAnimal = (over: Partial<LivestockState> = {}): LivestockState => ({
  id: 'cow-1',
  farmId: 'farm-1',
  animalType: 'chicken',
  hunger: 1,
  health: 1,
  happiness: 1,
  productReady: false,
  productTimerHours: 0,
  isSick: false,
  lastFedAt: '2026-09-01T00:00:00.000Z',
  lastPetAt: '2026-09-01T00:00:00.000Z',
  hungerZeroSince: null,
  ...over,
});

const makeBuilding = (over: Partial<BuildingState> = {}): BuildingState => ({
  id: 'b-1',
  farmId: 'farm-1',
  buildingType: 'water_source',
  level: 1,
  state: 'ACTIVE',
  wear: 0,
  constructionStartedAt: null,
  constructionEndsAt: null,
  lastMaintainedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

/* ============================================================ TIME WINDOWS */

describe('Time-window reconciliation (09 §9 vs as-built)', () => {
  it('caps crops/weather at 24 h, livestock at 72 h, and leaves wear uncapped', () => {
    const w = resolveTimeWindows(240); // 10 days away
    expect(w.awayHours).toBe(240);
    expect(w.systemHours).toBe(MAX_OFFLINE_HOURS);
    expect(w.livestockHours).toBe(SELF_SUSTAINING_THRESHOLD_HOURS);
    expect(w.livestockAwayHours).toBe(240); // uncapped — decides self-sustaining
    expect(w.buildingWearHours).toBe(240); // uncapped — G-13
  });

  it('applies a sub-cap absence in full', () => {
    const w = resolveTimeWindows(6);
    expect(w.systemHours).toBe(6);
    expect(w.livestockHours).toBe(6);
    expect(w.buildingWearHours).toBe(6);
  });

  it('uses the declared constants (regression guard on the cap table)', () => {
    expect(CROP_OFFLINE_CAP_HOURS).toBe(24);
    expect(LIVESTOCK_OFFLINE_CAP_HOURS).toBe(72);
    expect(SELF_SUSTAINING_THRESHOLD_HOURS).toBe(72);
  });

  it('treats negative / NaN elapsed time as zero, never negative', () => {
    expect(resolveTimeWindows(-5).systemHours).toBe(0);
    expect(resolveTimeWindows(Number.NaN).awayHours).toBe(0);
  });

  it('floors sub-minute ticks (belowSimulationFloor)', () => {
    expect(belowSimulationFloor(0)).toBe(true);
    expect(belowSimulationFloor(1 / 3600)).toBe(true);
    expect(belowSimulationFloor(1)).toBe(false);
    expect(belowSimulationFloor(Number.NaN)).toBe(true);
  });
});

/* =================================================================== CROPS */

describe('Crop simulation (09 §3)', () => {
  const sorghum = CROPS.sorghum!;

  it('advances a fully watered crop but does NOT reach stage+1 in 4 h (stale vector)', () => {
    const t = simulateCrop(makeCrop({ hydration: 1 }), 4, weather(), createRng(1));
    // Growth is hydration-weighted, so 4 h of perfect water ~= 4 progress hours.
    expect(t.growthProgressHours).toBeGreaterThan(3.5);
    // Sorghum matures in 18 h => each stage is 6 h. 4 h is NOT enough for +1.
    expect(t.growthStage).toBe(0);
    expect(t.lifecycle).toBe('GROWING');
    expect(t.ready).toBe(false);
    expect(t.withered).toBe(false);
  });

  it('grows nothing while dry', () => {
    const t = simulateCrop(makeCrop({ hydration: 0 }), 4, weather(), createRng(1));
    expect(t.growthProgressHours).toBe(0);
    expect(t.lifecycle).toBe('PLANTED');
    expect(t.withered).toBe(false);
    // F17 water-squeeze telemetry: it WANTED to grow and drank nothing.
    expect(t.stalled).toBe(true);
  });

  it('withers after ~6-8 h at zero hydration', () => {
    const four = simulateCrop(makeCrop({ hydration: 0 }), 4, weather(), createRng(2));
    expect(four.withered).toBe(false);
    expect(four.health).toBeCloseTo(1 - 4 / CROP_SIM.witherHoursAtZeroHydration, 5);

    const eight = simulateCrop(makeCrop({ hydration: 0 }), 8, weather(), createRng(2));
    expect(eight.withered).toBe(true);
    expect(eight.lifecycle).toBe('WITHERED');
  });

  it('becomes READY once progress reaches growthHours', () => {
    const t = simulateCrop(
      makeCrop({ growthProgressHours: sorghum.growthHours - 0.5, growthStage: 2 }),
      2,
      weather(),
      createRng(42),
    );
    expect(t.growthProgressHours).toBeCloseTo(sorghum.growthHours, 5);
    expect(t.ready).toBe(true);
    expect(t.lifecycle).toBe('READY');
    expect(t.withered).toBe(false);
  });

  it('stageFor maps progress to 0..3 like the live path', () => {
    expect(stageFor(0, 18)).toBe(0);
    expect(stageFor(6.1, 18)).toBe(1);
    expect(stageFor(12.1, 18)).toBe(2);
    expect(stageFor(18, 18)).toBe(3);
    expect(stageFor(999, 18)).toBe(3);
    expect(stageFor(1, 0)).toBe(3); // degenerate config never blocks readiness
  });

  it('is DETERMINISTIC: identical input + seed => identical output', () => {
    const crop = makeCrop({ hydration: 0.6 });
    const a = simulateCrop(crop, 24, weather({ humidity: 0.9 }), createRng(7), 1.1);
    const b = simulateCrop(crop, 24, weather({ humidity: 0.9 }), createRng(7), 1.1);
    expect(a).toEqual(b);
  });


  it('applies fertilizer and season multipliers to growth', () => {
    const plain = simulateCrop(makeCrop(), 4, weather(), createRng(3), 1);
    const boosted = simulateCrop(
      makeCrop({ fertilizerActive: true, fertilizerBonus: 0.5 }),
      4,
      weather(),
      createRng(3),
      1,
    );
    const seasonal = simulateCrop(makeCrop(), 4, weather(), createRng(3), 1.5);
    expect(boosted.growthProgressHours).toBeGreaterThan(plain.growthProgressHours!);
    expect(seasonal.growthProgressHours).toBeGreaterThan(plain.growthProgressHours!);
  });

  it('returns an unchanged tick for a non-positive or non-finite window', () => {
    const c = makeCrop();
    expect(simulateCrop(c, 0, weather(), createRng(1)).changed).toBe(false);
    expect(simulateCrop(c, Number.NaN, weather(), createRng(1)).changed).toBe(false);
    expect(simulateCrop({ ...c, cropType: 'nope' }, 4, weather(), createRng(1)).changed).toBe(false);
  });
});

/* =============================================================== LIVESTOCK */

describe('Livestock simulation (09 §7, 30 G-4, R1/30-1.4)', () => {
  const NOW = new Date('2026-09-15T12:00:00.000Z');
  const HOUR_MS = 3_600_000;
  const chicken = getAnimalConfig('chicken')!;

  it('decays hunger at the config rate over 24 h (09 §5 test vector)', () => {
    const t = simulateLivestock(makeAnimal({ hunger: 1 }), 24, 24, NOW.getTime());
    expect(t.hunger).toBeCloseTo(1 - chicken.hungerDecayRate * 24, 5);
    expect(t.selfSustaining).toBe(false);
    expect(t.changed).toBe(true);
  });

  it('produces once the cycle elapses while fed and healthy', () => {
    const t = simulateLivestock(makeAnimal(), 24, 24, NOW.getTime());
    expect(t.productReady).toBe(true);
    expect(t.productTimerHours).toBe(0);
  });

  it('does NOT produce when underfed (hunger <= 0.5)', () => {
    const t = simulateLivestock(makeAnimal({ hunger: 0.4 }), 6, 6, NOW.getTime());
    expect(t.productReady).toBe(false);
    expect(t.productTimerHours).toBe(0);
  });

  it('does not decay health before the 12 h starvation onset', () => {
    const t = simulateLivestock(makeAnimal({ hunger: 0 }), 12, 12, NOW.getTime());
    expect(t.hunger).toBe(0);
    expect(t.health).toBe(1); // exactly at the onset boundary — no decay yet
    expect(t.hungerZeroSince).not.toBeNull();
  });

  it('decays health (and reports sick) once starvation passes the onset', () => {
    const t = simulateLivestock(makeAnimal({ hunger: 0 }), 24, 24, NOW.getTime());
    expect(t.health).toBeLessThan(1);
    expect(t.isSick).toBe(true);
  });

  it('honours the 72 h boundary: full decay at 72, self-sustaining at 73', () => {
    const at72 = simulateLivestock(makeAnimal({ hunger: 1 }), 72, 72, NOW.getTime());
    expect(at72.selfSustaining).toBe(false);
    expect(at72.hunger).toBe(0);

    const at73 = simulateLivestock(makeAnimal({ hunger: 1 }), 72, 73, NOW.getTime());
    expect(at73.selfSustaining).toBe(true);
    expect(at73.hunger).toBeCloseTo(1 - chicken.hungerDecayRate * 0.25 * 72, 5);
    expect(at73.health).toBe(1); // no health decay while self-sustaining
    expect(at73.productReady).toBe(false);
  });

  it('never applies more than the 72 h livestock cap, however long the absence', () => {
    const t = simulateLivestock(makeAnimal({ hunger: 1 }), 72, 400, NOW.getTime());
    expect(t.selfSustaining).toBe(true);
    expect(t.hunger).toBeGreaterThanOrEqual(0.1); // floor, not 0
  });

  it('resets the starvation clock once the animal is fed again', () => {
    const t = simulateLivestock(
      makeAnimal({ hunger: 0.9, hungerZeroSince: '2026-09-14T00:00:00.000Z' }),
      12,
      12,
      NOW.getTime(),
    );
    expect(t.hunger).toBeCloseTo(0.9 - chicken.hungerDecayRate * 12, 5);
    expect(t.hungerZeroSince).toBeNull();
  });

  it('decays happiness only when neglected for >24 h (fixed rule)', () => {
    const recent = simulateLivestock(
      makeAnimal({ lastPetAt: new Date(NOW.getTime() - 1 * HOUR_MS).toISOString() }),
      24,
      24,
      NOW.getTime(),
    );
    const neglected = simulateLivestock(
      makeAnimal({ lastPetAt: new Date(NOW.getTime() - 30 * HOUR_MS).toISOString() }),
      24,
      24,
      NOW.getTime(),
    );
    expect(recent.happiness).toBe(1);
    expect(neglected.happiness).toBe(0);
  });

  it('is deterministic for the same (state, window, now)', () => {
    const a = simulateLivestock(makeAnimal({ hunger: 0 }), 24, 24, NOW.getTime());
    const b = simulateLivestock(makeAnimal({ hunger: 0 }), 24, 24, NOW.getTime());
    expect(a).toEqual(b);
  });

  it('returns unchanged for an unknown animal type or a zero window', () => {
    const unknown = simulateLivestock(
      makeAnimal({ animalType: 'dragon' }),
      24,
      24,
      NOW.getTime(),
    );
    expect(unknown.changed).toBe(false);
    expect(unknown.hunger).toBe(1);

    const zero = simulateLivestock(makeAnimal(), 0, 0, NOW.getTime());
    expect(zero.changed).toBe(false);
  });
});

/* =============================================================== BUILDINGS */

describe('Building simulation (09 §8, 30 G-13)', () => {
  const NOW = new Date('2026-09-15T12:00:00.000Z');
  const water = getBuildingConfig('water_source')!;

  it('completes construction on an absolute timer (no elapsed window needed)', () => {
    const done = simulateBuilding(
      makeBuilding({
        state: 'CONSTRUCTION',
        constructionEndsAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
      }),
      0, // zero elapsed — the build still finishes because the deadline passed
      NOW.getTime(),
    );
    expect(done.completed).toBe(true);
    expect(done.state).toBe('ACTIVE');
    expect(done.wear).toBe(0);

    const pending = simulateBuilding(
      makeBuilding({
        state: 'CONSTRUCTION',
        constructionEndsAt: new Date(NOW.getTime() + 10 * 3_600_000).toISOString(),
      }),
      5,
      NOW.getTime(),
    );
    expect(pending.completed).toBe(false);
    expect(pending.state).toBe('CONSTRUCTION');
    expect(pending.changed).toBe(false);
  });

  it('accrues wear by wearPerHour over the window', () => {
    const t = simulateBuilding(makeBuilding(), 48, NOW.getTime());
    expect(t.wear).toBeCloseTo(Math.min(1, water.wearPerHour * 48), 6);
    expect(t.state).toBe('ACTIVE');
  });

  it('flips to MAINTENANCE_NEEDED exactly when wear reaches 1.0', () => {
    const hoursToFull = 1 / water.wearPerHour;
    const justBelow = simulateBuilding(makeBuilding(), hoursToFull - 0.5, NOW.getTime());
    expect(justBelow.state).toBe('ACTIVE');
    expect(justBelow.needsMaintenance).toBe(false);

    const atFull = simulateBuilding(makeBuilding(), hoursToFull, NOW.getTime());
    expect(atFull.state).toBe('MAINTENANCE_NEEDED');
    expect(atFull.needsMaintenance).toBe(true);
    expect(atFull.wear).toBe(1);
  });

  it('escalates an overdue MAINTENANCE_NEEDED building to DISABLED', () => {
    const overdue = simulateBuilding(
      makeBuilding({
        state: 'MAINTENANCE_NEEDED',
        wear: 1,
        lastMaintainedAt: new Date(
          NOW.getTime() - (water.maintenanceIntervalDays + 1) * 24 * 3_600_000,
        ).toISOString(),
      }),
      1,
      NOW.getTime(),
    );
    expect(overdue.state).toBe('DISABLED');

    // Not yet overdue => stays MAINTENANCE_NEEDED (the check runs on the
    // RESULTING state, never nested inside the ACTIVE branch).
    const recent = simulateBuilding(
      makeBuilding({
        state: 'MAINTENANCE_NEEDED',
        wear: 1,
        lastMaintainedAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
      }),
      1,
      NOW.getTime(),
    );
    expect(recent.state).toBe('MAINTENANCE_NEEDED');
  });

  it('returns unchanged for an unknown building type', () => {
    const t = simulateBuilding(makeBuilding({ buildingType: 'unicorn_stable' }), 48, NOW.getTime());
    expect(t.changed).toBe(false);
    expect(t.state).toBe('ACTIVE');
  });
});

/* ================================================================= WEATHER */

describe('Weather progression (09 §7, 03 §1.2)', () => {
  const chapter = chapterForDate(new Date('2026-01-10T00:00:00.000Z')); // January => Pula
  const start = weather({ season: chapter.slug });

  it('changes every WEATHER_CHANGE_INTERVAL hours', () => {
    const near = simulateWeatherTimeline(chapter, start, WEATHER_CHANGE_INTERVAL - 0.1, createRng(1));
    expect(near).toHaveLength(1);

    const onTheHour = simulateWeatherTimeline(chapter, start, WEATHER_CHANGE_INTERVAL, createRng(1));
    expect(onTheHour).toHaveLength(2);

    const long = simulateWeatherTimeline(chapter, start, 18, createRng(1));
    expect(long).toHaveLength(4); // initial + 18/6 changes
  });

  it('tags every generated state with the chapter slug (one calendar)', () => {
    const timeline = simulateWeatherTimeline(chapter, start, 48, createRng(9));
    for (const w of timeline) expect(w.season).toBe(chapter.slug);
  });

  it('is DETERMINISTIC: same seed => identical timeline', () => {
    const a = simulateWeatherTimeline(chapter, start, 48, createRng(2026));
    const b = simulateWeatherTimeline(chapter, start, 48, createRng(2026));
    expect(a).toEqual(b);
  });

  it('produces variety across different seeds (stochastic but seeded)', () => {
    const unique = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const t = simulateWeatherTimeline(chapter, start, 36, createRng(seed));
      unique.add(t.map((w) => w.type).join('>'));
    }
    expect(unique.size).toBeGreaterThan(1);
  });
});

/* ========================================================= RUN_SIMULATION */

describe('runSimulation (09 §2) — one deterministic farm tick', () => {
  const NOW = new Date('2026-01-15T06:00:00.000Z');
  const chapter = chapterForDate(NOW);

  const makeInput = (over: Partial<SimulationInput> = {}): SimulationInput => ({
    farmId: 'farm-1',
    now: NOW,
    elapsedHours: 24,
    seed: 1234,
    chapter,
    weather: weather({ season: chapter.slug }),
    crops: [makeCrop(), makeCrop({ id: 'crop-2', plotId: 'plot-2', hydration: 0 })],
    livestock: [makeAnimal()],
    buildings: [makeBuilding()],
    ...over,
  });

  it('is DETERMINISTIC: same input + seed => identical output', () => {
    expect(runSimulation(makeInput())).toEqual(runSimulation(makeInput()));
  });

  it('weather differs across seeds, proving the seed controls the stochastic part', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const out = runSimulation(makeInput({ seed, elapsedHours: 72 }));
      seen.add(out.weatherTimeline.map((w) => w.type).join('>'));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('caps applied time at 24 h while reporting the uncapped away time', () => {
    const out = runSimulation(makeInput({ elapsedHours: 240 }));
    expect(out.appliedHours).toBe(24);
    expect(out.awayHours).toBe(240);
  });

  it('runs a 24-hour offline tick across every system (16 §5)', () => {
    const out = runSimulation(makeInput({ elapsedHours: 24 }));
    expect(out.cropTicks).toHaveLength(2);
    expect(out.livestockTicks).toHaveLength(1);
    expect(out.buildingTicks).toHaveLength(1);
    expect(out.weatherTimeline).toHaveLength(5); // initial + 24/6 changes

    // Chicken (12 h cycle) finishes a production run in a day.
    expect(out.livestockTicks[0]!.productReady).toBe(true);
    expect(out.livestockTicks[0]!.hunger).toBeCloseTo(0.52, 5);

    // The watered crop grew; the dry one did not.
    expect(out.cropTicks[0]!.growthProgressHours).toBeGreaterThan(0);
    expect(out.cropTicks[1]!.growthProgressHours).toBe(0);

    expect(out.notifications.length).toBeGreaterThan(0);
  });

  it('flags a season change when the chapter moved on', () => {
    const out = runSimulation(makeInput({ weather: weather({ season: 'moriti' }) }));
    expect(out.seasonChanged).toBe(true);
    expect(out.newSeason).toBe(chapter.slug);
    expect(out.notifications.some((n) => n.includes('Season changed'))).toBe(true);
  });

  it('sends animals self-sustaining on a 4-day absence while crops stay capped', () => {
    const out = runSimulation(makeInput({ elapsedHours: 96 }));
    expect(out.livestockTicks[0]!.selfSustaining).toBe(true);
    expect(out.totals.livestockSelfSustaining).toBe(1);
    expect(out.appliedHours).toBe(24); // crops/weather still capped at 24 h
    expect(out.awayHours).toBe(96);
  });
});




