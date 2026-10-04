# 14 — Deterministic Simulation

> Companion to `09`. Normative anchors: `03 §1` (farming), `04 §4` (Kagiso), `09_Game_Simulation_Specification.md` (long-form), `DEVELOPMENT_STATE.md` §Simulation (as-built).
> **Core contract:** one pure `runSimulation(input) => output`. No clock reads. No global RNG. No I/O. A captured input replays to an **identical** output.

---

## 1. Why determinism is non-negotiable

Offline progression is the heart of a cozy farm game — the player closes the app, comes back tomorrow, and the world has moved. That economy is only auditable (and only anti-cheat-provable) if the same elapsed time and the same seed produce the same result, every time, on any machine.

Determinism buys three things that nothing else does:

1. **Replayability** — a support ticket ("my crop vanished") can be replayed exactly from its captured input.
2. **A headless economy model** — the same engine powers `scripts/balance_verify.py` and the future tuning sandbox, so model and game cannot drift (`06 §5.1`).
3. **Anti-cheat** — a client that reports impossible state can be detected by recomputing what the server's engine *would* have produced.

---

## 2. The pure engine

Location: `apps/api/src/simulation/engine/`.

```ts
interface SimulationInput {
  now: Date;                 // the ONLY time source
  seed: string;              // the ONLY randomness source
  playerId: UUID;
  farmState: FarmSnapshot;   // plots, crop_instances, water, livestock, buildings
  awayHours: number;         // resolved elapsed time (see §3)
  config: GameConfigVersion; // pinned config version
}

interface SimulationOutput {
  farmState: FarmSnapshot;   // the new state — caller persists it
  events: SimulationEvent[]; // { type, payload } — weather, rain-credit, harvest-ready, decay
  clamps: ClampRecord[];     // which windows clamped, for observability
}

function runSimulation(input: SimulationInput): SimulationOutput;
```

**Discipline rules:**

| Rule | Enforcement |
|---|---|
| No `Date.now()`, no `new Date()` inside the engine | lint rule + code review |
| No `Math.random()` — only `seededRng(seed)` | `rng.ts` is the sole RNG |
| No network, no DB, no filesystem | pure function; the caller persists |
| Deterministic iteration order | never iterate a `Set`/`Map` whose insertion order is caller-dependent |
| Config is an **input**, never a module global | pinned `GameConfigVersion` in the input |

The RNG is a seeded PRNG in `packages/game-config/src/rng.ts` (with `rng.spec.ts`). Every random draw is keyed on a stable id (e.g. `seed + cropInstanceId`) so reordering work does not change outcomes.

---

## 3. Per-system offline windows

**One table, one place:** `engine/time.ts::resolveTimeWindows(awayHours)`. The old "cap everything at 24 h" reading made several rulings unreachable, so each system declares its own window.

| System | Window | Why |
|---|---|---|
| Crops (growth) | **24 h cap** (`MAX_OFFLINE_HOURS`) | a once-daily check-in must not be out-run |
| Weather | **24 h cap** | only weather crops will see |
| Building construction | **absolute timer** | ends on its own; no cap |
| Building wear | **UNCAPPED** | weekly ≠ 7× the wear (G-13) |
| Livestock hunger/health/production | **72 h cap** (`LIVESTOCK_OFFLINE_CAP_HOURS`) | "decays up to three days" (`09 §9`) |
| Livestock self-sustaining flag | **UNCAPPED, > 72 h** | compared against true away-time so it can actually fire (G-4) |

> ⚠️ **`MAX_OFFLINE_HOURS = 24` clamps elapsed sim time.** A simulator that wants to advance a week must do so in **≤24 h steps**. This is also what makes the year-loop simulatable in day-sized steps (`08 §8`).

Adding a system = adding a row here. Never cap at a call site.

---

## 4. Water-stress mechanics

`03 §1.2`, `02 §6.5`. **The highest-value mechanic in the project.**

```
advanceCropGrowth(crop, elapsedHours, tank):
  waterDrawn = crop.waterPerHour × elapsedHours
  if tank.units < waterDrawn:
      affordableHours = tank.units / crop.waterPerHour
      // growth advances ONLY for the hours the tank could sustain
      growthHours = affordableHours
      tank.units = 0
      // the clock STOPS — it does not kill the crop
  else:
      growthHours = elapsedHours
      tank.units -= waterDrawn
  crop.growthProgress += growthHours / crop.growthHours
  // water is drawn ONLY while state == GROWING — never while READY (F5)
```

**Rules:**

| Rule | Notes |
|---|---|
| Empty tank **halts** growth | never kills, never penalises (`03 §1.2`) |
| Refilling **resumes from where it stopped** | the progress is preserved; only the clock paused |
| Water drawn **only while `GROWING`** | a `READY` crop costs nothing to hold (F5) |
| Rain credits the tank | `rainRatePerHour` 2, `stormRatePerHour` 5, capped at capacity |
| Charged at P1.00/unit (Ch1 base) | scaled per chapter by `rainCoverage` (`13 §5`) |

**Acceptance (`06` P4):**
- With an empty tank, a crop's growth timer does not advance; refilling resumes it from where it stopped.
- An empty tank never kills a crop.
- Rain events credit the tank.

---

## 5. Livestock decay

`03 §5`, `09 §9`. **72-h window.**

```
advanceLivestock(animal, awayHours):
  window = min(awayHours, LIVESTOCK_OFFLINE_CAP_HOURS)   // 72 h
  hunger -= decayRate × window
  if hunger == 0:
      if hunger_zero_since is null: hunger_zero_since = now
      // health decay begins ONLY after 12 CONSECUTIVE hours at hunger 0
      if hoursSince(hunger_zero_since) >= 12: health -= healthDecayRate
  else:
      hunger_zero_since = null        // the window resets
  produce if ready and fed
```

**Self-sustaining mode** (after 72 h **uncapped** away-time): hunger decays at 25% rate, no production, no health decay, no happiness decay, hunger floored at 0.1. The 12-hour starvation window (`hunger_zero_since`, migration `20260928000001`) removed the unrecoverable-death loop.

**All four animals eat `sorghum`** — never herbs. `livestock.spec.ts` asserts every animal is **net-positive per day** with exact margins, that no animal eats herbs, and the payback window.

---

## 6. Kagiso — Bushveld scarcity (computed on read)

`04 §4.2`. **Kagiso is computed on read from `kagiso_updated_at`, not by a cron.** No job, no drift, and it survives a server being down for a week.

```sql
-- Recomputed and persisted on every write (collect):
kagiso = LEAST(
           kagiso_max,                                        -- 6
           stored_kagiso + FLOOR((now() - kagiso_updated_at) / (kagiso_regen_minutes || ' minutes')::interval)
         )
```

| Knob | Value |
|---|---|
| `kagiso_max` | **6** |
| Regeneration | **+1 per 4 h** → 6/day, full settle in 24 h |
| Tap cost — common / material | **1** |
| Tap cost — uncommon / rare / seasonal | **2** |
| Per-hotspot rest | **60 minutes** (independent of Kagiso) |
| New-scene starting value | 6 |
| Material yield per tap | 2–4 units (hardwood 1–3) |

**Rarity weights scale with Kagiso:**

| Kagiso | Rare weight | Common weight |
|---|---|---|
| ≥ 5 | ×2 | ×1 |
| 3–4 | ×1 (baseline) | ×1 |
| 1–2 | ×0.5 | ×1.5 |

**Collect guards:**

```
collect(playerId, hotspotId):
  scene.kagiso = recompute(scene)
  if scene.kagiso < hotspot.kagiso_cost  → 409 scene_not_settled
  if now − last_collected_at < rest_minutes → 409 hotspot_resting
  roll loot (seasonal table if realMonth ∈ hotspot.active_months)
  scene.kagiso -= hotspot.kagiso_cost
  last_collected_at = now
  if first find: insert field_journal_entries   else: no-op (no duplicate)
  recompute restoration stage; swap background asset at 0.4 / 0.7 / 1.0
```

**Invariants (I14):** Kagiso never negative, never above max, under concurrent and replayed collects. Collecting below `kagiso_cost` returns **409 `scene_not_settled`** — a named reason, not a generic failure.

**Mophane is decoupled from the season clock.** `Setlhare sa Phane` changes its loot table only in real-world **April (4)** and **December (12)** — a plain `month ∈ active_months` comparison, verified with a mocked clock. Note the consequence and keep it: the December window falls in Chapter 1, the April window in Chapter 2 — the phane appears in two different chapters, because that is when it actually appears (`04 §9.3`).

---

## 7. Seeded, replayable farm state machine

**State machine (crop):**

```
EMPTY ──plant──▶ GROWING ──(growth_progress ≥ 1)──▶ READY ──harvest──▶ EMPTY
                    ▲                                │
                    └──(water refill resumes)────────┘  (water only halts, never blocks)
```

**Idempotent seeding.** Repeated runs with the same seed produce identical results. This applies to **both** the simulation engine and the config seeder:

- Engine: `runSimulation(sameInput)` → deep-equal output, asserted by the `engine` suite.
- Seeder: `pnpm db:seed` twice → zero change on the second run (`06` P1).

**Weather** advances every 6 hours; **seasons** via `SEASON_DURATION_HOURS`; **chapters** derive from the real calendar (see §8), not from gameplay.

---

## 8. Seasonal & calendar logic

`04 §9`, `08 §8`, `35 §2.4`. **The game calendar matches real-world dates; only the chapter frame is abstracted.**

| Chapter | Name | Months | Character |
|---|---|---|---|
| 1 | **Sekala sa Pula** | Nov–Jan | Rains; planting; tank fills itself |
| 2 | **Sekala sa Phane** | Feb–Apr | Late rains; long growth; April phane window |
| 3 | **Sekala sa Moriti** | May–Jul | Dry & cold; water is the whole game |
| 4 | **Sekala sa Letlhafula** | Aug–Oct | Harvest, wind, preparation |

Boundaries at **00:00 Africa/Gaborone (UTC+2)** on **1 Nov / 1 Feb / 1 May / 1 Aug**.

**The full year is simulatable** through `runSimulation(input.now, input.seed)` — dev date-jump (D9) advances `input.now` in ≤24 h steps, so chapter rollover, season change, Kagiso, and Mophane windows can all be driven without waiting.

**Web production** advances every 6 hours and is capped at 24 h offline (only weather a crop sees).

---

## 9. Events live service (B3 — new scope, D6/D8)

The Events service is the mechanism that makes **Bupi/Borotho Kgotla demand real in MVP without a crafting system** (D6 Q1). Because D7 defers crafting, players cannot craft flour/bread — so the **Event grants them** as participation rewards, then the Kgotla asks for them back in exchange for **chapter tokens**.

```
Event lifecycle:
  seeded on the calendar (starts_at / ends_at within a chapter)
  ├─ grants: participation reward → inventory item (bupi | borotho) ── see event_grants
  ├─ demand: Kgotla turn-in → awards chapter tokens by achievement
  └─ closes: at ends_at, the demand is withdrawn; tokens already earned persist

grant(playerId, eventId):
  1. assert event active (now ∈ [starts_at, ends_at])
  2. assert playerId has not already claimed this event's participation grant
  3. InventoryService.addItem(playerId, event.grant_item_slug, event.grant_qty)
  4. insert event_grant(player_id, event_id, claimed_at)   -- idempotency guard
```

**Kgotla turn-in** awards **chapter tokens by achievement** (not by purchase), and the tokens **expire to zero at chapter end**.

---

## 10. Kagiso scarcity bounds (the comparative question)

The Bushveld must **never out-earn the Farm** (`04 §1`). This is the economy's structural invariant, and it splits in two:

| Half | Status |
|---|---|
| **Structural** — Kagiso caps gathering at ≤6 taps/scene/day and **cannot be bought** | **Proven in code** (`launch-readiness.spec.ts`) |
| **Comparative** — Bushveld net < Farm net at every farm size | **Answered by live telemetry post-launch** (ruling 2026-09-11), not by a model |

`scripts/balance_verify.py` §8 models the worst case and **reports** (does not assert) an inversion: Bushveld net **P245.10/day** (4 scenes, 24 pips/day) against a 4-plot starter farm's P49/day — spanning 4–20 plots on the starter basis. This inversion is a **recorded, accepted state**.

**If live data shows gathering is optimal**, the fix belongs in `04 §4` (Kagiso regen, tap cost, material value) or in farm income — **never in the gate script**.

---

## 11. State validation & recovery

`apps/api/src/simulation/state-validation.ts`. Two pure functions:

```ts
validateGameState(state): CorruptedState[]   // detection
planRecovery(corruption): RecoveryAction     // the named fix
```

**Corruption classes (`09 §11`), each with a named recovery action:**

| Class | Detection | Recovery |
|---|---|---|
| `NEGATIVE_CURRENCY` | any balance < 0 | `reset_to_zero` + ledger note |
| `NEGATIVE_BOTHO` | `botho_points < 0` | `reset_to_zero` |
| `NEGATIVE_INVENTORY` | any quantity < 0 | `delete_row` |
| `ORPHAN_CROP` | crop_instance with no plot | `expunge` |
| `PLOT_WITHOUT_CROP` | plot state ≠ EMPTY, no crop | `reset_plot` |
| `STALE_SIMULATION` | `updated_at` far in the past | `run_simulation` |
| `FUTURE_SIMULATION` | timestamp in the future | `clamp_to_now` |

Validation feeds the anti-cheat module (`16 §6`) as a **review signal** — it never auto-mutates player state.

---

## 12. The deterministic-engine acceptance tests

| Test | Assertion |
|---|---|
| Replay identity | `runSimulation(input)` twice → deep-equal output |
| No clock reads | static grep / lint: no `Date.now` in `engine/` |
| No global RNG | static grep: no `Math.random` in `engine/` |
| Window correctness | each system clamps per §3 |
| Water halt | tank empty → growthProgress frozen, crop alive |
| Water resume | refill → growth continues from the frozen progress |
| Livestock 72 h | decay beyond 72 h uncapped only for the self-sustaining flag |
| Kagiso bounds | property test: 0 ≤ kagiso ≤ max under replay + concurrency (I14) |
| Mophane clock | loot table changes only when mocked month ∈ {4, 12} |
| Chapter rollover | tokens zero exactly once, idempotent (I13) |

*End of `14`. Proceed to `15_Cosmetics_And_Avatar_System.md`.*
