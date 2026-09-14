# Molemisi Simulator — Implementation Prompt

Build the simulator described in `MOLEMISI_Simulator_Specification.md` into this codebase. Read that document first — this prompt is the "build it" companion, not a restatement of the design.

---

## 0. Before You Write Any Code

- Build the production-target safety rail first, before anything else. A simulator that can accidentally touch production data is worse than no simulator.
- Reuse `game-types`, `shared`, and `validation` from the existing packages rather than redefining player/item/action shapes.
- Reuse the real game's existing seed data (items, recipes, Bushveld scenes/Hotspots, top-up packs, subscription plan, boosts) for the simulator's test database rather than maintaining a parallel content set. If any of it doesn't already exist in a test environment, building it is a prerequisite task, not something the simulator invents at runtime.

## 1. Package and CLI

Create `packages/simulator` (or `tools/simulator` — check the monorepo's existing conventions first). One CLI entry point:

```
pnpm simulate --profiles=f2p:70,payer:20,mid:8,whale:2,churner:5 --players=1000 --days=90 --target=http://localhost:3001 --seed=<n>
```

- `--profiles` — comma-separated profile:weight pairs, per the spec's Section 2.
- `--players` — total synthetic population.
- `--days` — simulated days to compress into the run.
- `--target` — API base URL; the safety rail rejects anything not explicitly allow-listed.
- `--seed` — RNG seed, for reproducing a specific failing run.

## 2. Event Log

Build this before any player-behavior code — everything else depends on it:

```ts
interface SimEvent {
  timestamp: string;
  simulatedDay: number;
  playerId: string;
  profile: string;
  system: 'farming' | 'crafting' | 'storage' | 'bushveld' | 'kgotla' | 'market' | 'economy' | 'security' | 'anticheat';
  action: string;
  result: 'success' | 'rejected' | 'error';
  metadata: Record<string, unknown>;
}
```

Every actor function appends one `SimEvent` per action, success or failure, to `raw_events.jsonl`. No report reads from anything other than this log plus final database state.

## 3. Player Actors

Each simulated player is a real row in `auth.users`/`profiles`/`farms`, created through the real registration flow — not a synthetic bypass. From there, each profile's per-simulated-day loop drives real HTTP calls across every system: plant/water/harvest; craft and collect from all five recipes the player has unlocked; upgrade storage tiers; check all unlocked Bushveld scenes and collect every ready Hotspot; accept/complete Kgotla quests, contribute to community projects, use Letsema when eligible; sell and buy at the Market; and, for payer/subscriber/whale profiles, top-up, subscribe, and purchase boosts.

**Two things the run configuration must get right or the report will be silently wrong:**
- **Time span:** default runs should cover at least 12 simulated real-world-calendar months, specifically so the Mophane seasonal event's two real-world windows (April, December) actually get exercised. The harness should log which real months each `advanceSimulatedTime` call crosses and warn if a run never touches either one.
- **Population mix:** use the spec's default segmentation (70/20/8/2 among payers, ~3% of total population being payers) unless explicitly overridden, so realized ARPU/ARPPU are comparable to the P2.27/P75.80 targets rather than being arbitrary.

## 4. Time Advancement

One function, `advanceSimulatedTime(days: number)`: back-date the relevant `_at` columns for every active player in the test database, then call the real endpoints that already compute state from elapsed time — the game's own logic resolves the result, not the simulator's. This is the one place the simulator touches the database directly instead of going through the API; document it clearly as the deliberate exception it is.

## 5. Security and Anti-Cheat

Implement Section 4.1 (security) and 4.2 (anti-cheat) of the spec as two separate groups of named, pass/fail assertion functions — not a fuzzer, not a learned agent. Run the full checklist after at least one simulated month of population activity, so ownership/threshold/replay checks have real state to act against.

- **The concurrency/duplication check is the one to get right.** Fire both requests via `Promise.all` (or equivalent) against the same resource — not one immediately followed by the other. A fast sequential pair can accidentally look like a pass even when the transaction boundary is genuinely broken; this check only means something if it actually races the server.
- **Multi-accounting checks** need their own small set of extra accounts, created specifically for this purpose and tagged so the economy/ARPU report doesn't count them as real population.
- **Malformed-input checks** should be table-driven — one list of bad payloads (negative, zero, oversized, wrong-typed, missing-field) run against every mutating endpoint in a loop, so a new endpoint later doesn't require a hand-written new test.
- Log the bot-speed/inhuman-pace gap explicitly in the report output as "not tested, no defense found in current design" — don't omit it silently.

## 6. Reports

Build one aggregation function per system, reading only `raw_events.jsonl` and final database state:

- `reportFarming` — crops/day, average idle-plot time.
- `reportCrafting` — usage per recipe, realized margin per recipe vs. the spec's table, days-to-first-Flour.
- `reportStorage` — % of time at cap per tier, average day each tier is reached.
- `reportBushveld` — collection rate per scene (flag any scene with near-zero activity), realized vs. target rarity distribution, daily-sparkle engagement rate, whether the run actually crossed a Mophane window and what happened if so, Journal completion curve.
- `reportKgotla` — Botho accrual rate per profile, days-to-threshold for each gate, Letsema usage rate, which Elder tips fire and how often.
- `reportMarket` — transaction volume, contract fulfillment rate.
- `reportEconomy` — faucets vs. sinks, realized ARPU/ARPPU against the P2.27/P75.80 targets (with the actual segmentation ratio used stated plainly), computed prize pool at the run's actual ending subscriber count against the formula.
- `reportSafeguards` — pass/fail table for every 4.1 and 4.2 check, reported as two distinct groups.

Compose all of these into `summary.md`; write `raw_events.jsonl` as-is; write `safeguards.json` from the last function's output with a non-zero exit code on any failure.

## 7. CI Integration

Wire a scaled-down run (small population, short duration) into CI on pull requests touching the API — enough to catch a regression in the core safeguard checks and crafting-margin figures, not a full 90-day/1000-player run on every commit. The scaled-down run will not naturally cross a Mophane window; its report should say so explicitly rather than silently reporting a false negative. Save the full-scale, calendar-spanning run for a manual or pre-release trigger.

## 8. Definition of Done

- [ ] The simulator refuses to run against anything not explicitly allow-listed as a test target.
- [ ] A mixed-profile run of at least 100 players over at least 30 simulated days completes, touches every system in Section 3, and produces all three report files.
- [ ] At least one full-scale run has crossed a real April or December, and the Bushveld report confirms the Mophane Hotspot's seasonal table actually activated.
- [ ] All three live Bushveld scenes show non-trivial collection activity; Deep Bushveld correctly shows zero.
- [ ] Realized crafting margins match the spec's table within tolerance for all five recipes.
- [ ] Realized blended ARPU/ARPPU are reported alongside their targets, with the actual segmentation ratio used stated plainly.
- [ ] Every Section 4.1 security check and 4.2 anti-cheat check passes against the real API, reported as two distinct groups — including a verified-by-code-review concurrent (not sequential) execution of the duplication check.
- [ ] The bot-speed/inhuman-pace gap appears explicitly in the report as a known, untested limitation.
- [ ] A scaled-down version of this run is wired into CI and fails the build on any security or anti-cheat check failure.
