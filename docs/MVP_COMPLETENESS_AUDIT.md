# Molemisi — MVP Completeness Audit

**Date:** 2026-09-11 (refreshed 2026-09-16) · **Arbiter:** `docs/MVP/06_Verification_Rubric.md` (wins on "is it done?") · **Auditor:** Belvedere
**Scope:** everything `docs/MVP/01`–`06` requires for v1, checked against the actual code *and* the actual database.

> ### ⚠️ SUPERSEDED — read this first (2026-10-03)
>
> This audit describes the state as of **2026-09-16** and its gate counts, migration inventory
> and rulings are **no longer current**. It is kept as a record of what was verified then.
> **For the live position use `DEVELOPMENT_STATE.md` and `KNOWN_LIMITATIONS.md`.**
>
> What changed since this audit was written:
>
> | This document says | Reality as of 2026-10-04 |
> |---|---|
> | `jest` (apps/api) **209/209, 18 suites** | **37 suites / 615 tests** across the workspace (api 28/417, game-config 8/163, validation 1/35) |
> | **29** migration files, 11 unpushed | **49** migration files, **all committed and pushed live** (corrected 2026-10-04; commit `bf235be` landed the M-series batch on 2026-10-03) |
> | Schema current / deployed | **49** migrations pushed live through `20261003000020_spend_chapter_tokens` |
> | Boosts "withdrawn from sale", still catalogued | **Cut from the catalogue entirely** (`docs/34` §3.3); `BOOSTS` is `readonly never[]` |
> | Pula granted for BWP | **Top-ups grant Madi, never Pula** (`docs/33` §2, implemented) |
> | Real-money payments a gap | Still true — `StubPaymentProvider` only |
> | No mention of | Deterministic simulation engine · anti-cheat · state validation/recovery · economy metrics API · livestock 72 h window + 12 h starvation window |
>
> Gates were **re-run and re-verified on 2026-10-03** and remain green: `tsc` api 0, `tsc` web 0,
> `jest` 615/615, `balance_verify.py` PASS. **There is no pending schema delta** — the 10 M-series
> migrations referenced in earlier versions of this banner are now committed and applied live.
>
> ### Amended 2026-10-04 — the MVP/08 design rulings
>
> Nine design decisions were ruled on 2026-10-04 (`docs/MVP/08_MVP_Design_Decisions.md`) and a
> ten-part implementation document set (`docs/MVP/09`–`18`) was generated. Two rulings touch this
> audit's conclusions:
>
> - **D7 — crafting/recipes are deferred.** This audit lists crafting as an MVP surface. The MVP
>   is **farming-only**; crafting, cooking and recipes move to v1.1. Read any "crafting gap" here
>   as **out of scope by ruling**, not as debt.
> - **D5/D6/D10 add surfaces this audit did not check.** The MVP acceptance set now also includes
>   global Kgotla chat, an achievement/honorific ladder, a live Events service, and cosmetics +
>   a 2-layer avatar. None were in the `docs/MVP/01`–`06` normative set when this audit ran, so
>   its completeness verdict does not cover them.
>
> Everything else in this audit stands as the 2026-09-16 record.

---

## Verdict

**The code is MVP-complete and the schema is deployed; the deployment is no longer blocked by migrations.**

One hard blocker (the migration push) and a short list of genuine gaps. The Bushveld comparative gate is resolved by ruling (live telemetry), and the migration push landed on 2026-09-14, so the build is schema-current. The remaining gaps are real-money payments, wildlife raids, and boost effects (the last two ruled deferred from v1).

**Gates re-run today (all green):**

> *(Counts in this section are as of 2026-09-16 and are superseded by the banner above —
> currently 37 suites / 615 tests. The gate **method** is what matters here.)*

| Gate | Result (2026-09-16) |
|---|---|
| `tsc --noEmit -p apps/api` | **0** |
| `tsc --noEmit -p apps/web` | **0** |
| `jest` (apps/api) | **209/209**, 18 suites |
| `python scripts/balance_verify.py` | **PASS** — dead-zone 0, dominance 1, spread 3.32×, thirst 7.5×; + crafting (5 recipes) and Bushveld-vs-farm (§8) |

---

## 1. BLOCKER — RESOLVED: the linked database is schema-current (migrations pushed 2026-09-14)

There are **29 migration files**; `000000`–`000015` are applied to the linked project
`nyapfgawanqvnkkjudxb`, and **11 are not**:

| Unpushed migration | Phase |
| --- | --- |
| `000016` v1 wallet + ledger | P2 |
| `000017` legacy currency mirror | P2 |
| `000018` Pula floor | P2 |
| `000019` P3 inventory + crafting | P3 |
| `000020` plant transaction → player_inventory | P3 |
| `000040` P4 growth + water (Jojo tank) | P4 |
| `000050` P5 Kgotla pillars (Botho / Letsema) | P5 |
| `000100` P6 Bushveld (Kagiso / scenes / journal / sparkle) | P6 |
| `000110` P8 chapters + almanac | P8 |
| `000120` P9 monetisation (top-up / subscription / boosts / cosmetics) | P9 |
| `000021` `profiles.role` + tiers | roles |

> **RESOLVED 2026-09-14** — the `supabase db push` described below was applied; the linked project is now current (`supabase db push --dry-run` reports "Remote database is up to date"). The original probe below predates that push and its 404s are no longer accurate — live probes since confirm `plant_crop_transaction`, `player_inventory` and `item_definitions` exist, and `player_wallets`, `chapters`, `player_boosts` and `profiles.role` were created by the same push. Retained as a historical record of the pre-launch blocker.

Read-only probe against the linked project (pre-push, 2026-09-06):

| Probe | Result (then) | Meaning (then → now) |
|---|---|---|
| `profiles.is_admin` (migration `000015`) | HTTP **200** | applied |
| `player_wallets` (`000016`) | HTTP **404** `PGRST205` | **absent → now applied** |
| `item_definitions` (`000019`) | HTTP **404** `PGRST205` | **absent → now applied** |
| `chapters` (`000110`) | HTTP **404** `PGRST205` | **absent → now applied** |
| `player_boosts` (`000120`) | HTTP **404** `PGRST205` | **absent → now applied** |
| `profiles.role` (`000021`) | HTTP **400** `42703` "column profiles.role does not exist" | **absent → now applied** |

The live schema **now spans P0 through P9** (and the `role` column): the 2026-09-14 push applied `000016`→`000120` plus `000021`, so `player_wallets`, inventory/crafting, Kgotla, Bushveld, chapters/almanac, monetisation and `profiles.role` all exist. Admin/Dev guards, `/auth/me` role resolution, and P2–P9 runtime all function.

> Note: no local Supabase is running (`:54321` refuses). Both `apps/api/.env` and `apps/web/.env.local` point at the linked remote project, so this is the environment the app actually targets.

---

## 2. GATE — the deferred tuning sandbox (P10 depends on it)

`05 §P10` lists the tuning sandbox as a dependency of P10; `06 §5` defers it until after P6. Its one irreplaceable question is **comparative**:

> Does Bushveld income stay *below* farm income at every farm size?

`launch-readiness.spec.ts` proves the **structural** half (Kagiso caps gathering at ≤6/day and cannot be bought) and explicitly states it does **not** prove the comparative half.

**Update (2026-09-11): the comparative half is now modelled.** §8 of `scripts/balance_verify.py` computes the worst case for the invariant — a twice-daily, material-maximising player spending the whole Kagiso budget on the single best material per scene.

**Update (2026-10-03): the table below was a THREE-scene model and is STALE — including the P153.90 figure the 2026-09-11 ruling blessed.** Deep Bushveld shipped four hotspots in batch 2 (G5, 2026-09-23) making it four scenes, but the script still hardcoded `SCENE_COUNT = 3`. Corrected: 6 pips × **4** scenes = 24 pips/day; gross **P258/day**; net **P245.10** at 1.0× (P122.55 at 0.5×, P490.20 at 2.0×).

*Original (3-scene, still accurate for a sub-Botho-300 player — the deep scene is Botho 300-gated):* 6 pips × 3 scenes = 18 pips/day. Bushveld gross **P162/day**; net **P153.90** at the 1.0× band (P76.95 at 0.5×, P307.80 at 2.0×).

| Farm size | Starter farm P/d | Bush/Farm (3 scenes) | Median farm P/d | Bush/Farm (3) | Bush/Farm (**4 scenes**) |
|---|---|---|---|---|---|
| 4 plots | 49.00 | **3.14×** | 81.52 | **1.89×** | **5.00× / 3.01×** |
| 8 plots | 98.00 | **1.57×** | 163.04 | 0.94× | **2.50× / 1.50×** |
| 12 plots | 147.00 | **1.05×** | 244.56 | 0.63× | **1.67× / 1.00×** |
| 20 plots | 245.00 | 0.63× | 407.60 | 0.38× | **1.00× / 0.60×** |

**The invariant is inverted at 4, 8 and 12 plots against a starter-performing farm** on the 3-scene (launch) figures, and at **4, 8, 12 AND 20 plots** once Deep Bushveld is unlocked — 20 plots no longer closes the inversion (1.00× vs the old 0.63×). The script **reports** this rather than asserting it, because the result is entirely a function of the modelling assumption. **This is a ruling, not a bug:** the fix, if any, belongs in the economy spec (Kagiso regen, tap cost, material value, or farm income) — never in the script. See `05 §P10` and `07 §10.1`.

**P10 is signed off on the ruling** (2026-09-11): the structural invariant is proven in code, and the comparative half is answered by live income telemetry rather than a pre-launch model. The inversion above is a recorded, accepted state — if live data shows gathering is the optimal route, fix the economy spec, never the gate script.

---

## 3. Genuine spec gaps (specified, not implemented)

| # | Spec | State |
|---|---|---|
| 1 | **Wildlife raids** (`03 §1.3`; Kraal protects livestock, Farm Boundary protects crops, Ancestral Ward 3-day shield) | **DEFERRED FROM v1 (ruling 2026-09-11). Not implemented.** No raid mechanic anywhere in `apps/api/src`. The original audit line here quoted the config prose *"Protects livestock from overnight raids"* — that copy no longer exists: both `kraal` and `farm_boundary` `benefit` strings were rewritten on 2026-10-03 to describe what those buildings actually do, because advertising a threat with no mechanic behind it is a consumer-protection problem, not a content gap. `store.spec.ts` now asserts no building benefit mentions a raid/wildlife/predator/thief or an overnight threat. Consequence of the ruling: the Ancestral Ward would have protected against nothing, and all three boosts are cut from the catalogue (`docs/34` §3.3). |
| 2 | **Boost effects** (`05 §P9`) | **Not wired.** Pula Stone / Ancestral Ward / Breath of the Land are catalogued and (weekly) granted, but there is **no endpoint that applies an effect** — no tank refill / rain guarantee, no shield, no timer completion. |
| 3 | **P10 manual items** | Open: on-device PWA install (Android **and** iOS), throttled-3G smoke test, production-config confirmation, scripted end-to-end walkthrough in one sitting. |
| 4 | **`apps/game` deletion** (`07` G2, `01` D3) | ✅ **Done 2026-09-11.** Legacy Phaser prototype removed (418 files); `pnpm-workspace.yaml` now excludes it, `scripts/sync-assets.mjs` + `scripts/build-font.mjs` no longer emit into it, and `eslint.config.js` dropped the `generated-assets.ts` ignore. React `/game` is the only client. |
| 5 | **Four-screen navigation** (`01 §3`, `07 §7.2`, G1) | ✅ **Resolved** — footer is now 4 primary screens (Farm · Kgotla · Bushveld · Market) + a header **More** menu (Store, Wallet, Crafting, Inventory, Journal, Settings). |
| 6 | **"Never surprise the player with a cost"** (`01 §4`, `07 §7.5`) | ✅ **Fixed 2026-09-11.** New `GET /market/quote?itemType=&quantity=` returns the authoritative Price / Gross / Tax / You-receive (it calls the same `computeSale` as `sellItem`; a spec asserts the quote and the sale agree to the cent). `MarketScreen` renders all four lines in the confirm sheet and drops the misleading client-side `P{unitValue} each`. |
| 7 | **Reactive proverb** (`03 §7`) | `PROVERBS` config exists; **no endpoint serves it** and the "responds to what you did" extension is unbuilt. Cosmetic. |
| 8 | **Next.js `/api/*` rewrite** (`05 §P0`) | Not done — the browser calls `:3001` cross-port with CORS (`CORS_ORIGIN`). Documented as a **deliberate deviation** in `README` + `KNOWN_LIMITATIONS`; still blocks single-port preview. |

---

## 4. Open decisions (need a ruling, not code)

- **Bushveld comparative** — build the sandbox now, or launch + live telemetry? *(blocks P10)*
- **Almanac tuning** is provisional; `almanac.ts` values are scaffolding; activity-gating unbuilt.
- **Cosmetics as a Guild benefit** — `GUILD_SUBSCRIPTION.benefits` lists `'cosmetics'`, but the catalogue is Pula-priced / owned-forever.
- **Uncapped Letsema fund** (`P5`/F7) — only the capped P200/day community donation exists (`KGOTLA_DAILY_CONTRIBUTION_CAP`); the unbounded sink from `02 §7.1` is missing.
- **Starter Jojo Tank seeding; maintenance timing; per-act Botho quantum** (`BOTHO_PER_QUEST = 10`, `BOTHO_PER_PULA_DONATED = 1` — flagged in code for confirmation).
- **v1.1** (gated on B1 legal + B2 PSP): legal sign-off, PSP vs self-custody, Madi name, promotional budget.
- **`game-types` `Farm.level` / `*_skill_xp`** ruling; **no daily login/streak** anywhere.

---

## 5. Verified complete (so the report is not all bad news)

- **P0–P9 code** with all four gates green.
- **Supabase auth** — login / register / logout via `supabase.auth.signOut`, session mirroring, `hydrateTokenFromSession`.
- **Role tiers** (`player`/`admin`/`dev`) + separate `/dev` area; `AdminGuard` admin-only, `DevGuard` dev-only.
- **Field Journal** in Mogolo's voice (sign + collapsed note), fed by real discoveries.
- **Wallet + ledger** with Botswana-day caps (R4/I4); `startOfBotswanaDay` correct.
- **Crafting** — 2/2/3/4/6 h timers, batch fees 1×/2.5×/4×, substitution groups, the 6× batch exploit fixed.
- **Market** — 5% tax server-side; crafted/processed band exemption (`0.9–1.1` vs `0.5–2.0`).
- **Bushveld** — Kagiso computed on read, two distinct 409 reasons, Daily Sparkle (one row/date, no cron), restoration stages.
- **Chapters** — idempotent token rollover with dry-run, boot catch-up.
- **Almanac** — free + Guild tracks, sequential claims, Guild gated on subscription.
- **Monetisation** — top-up packs, P100→105 once, P500/day in UTC+2, weekly Pula Stone, cosmetics catalogue (6 SKUs).
- **Progression** — no XP/level, enforced by a static scan in `launch-readiness.spec.ts`.
- **Inventory** — tools excluded from storage slots (F15); Guild +50% stacking (R7/C8).
- **PWA** — manifest + custom service worker + icons + iOS splash screens.

---

## 6. Bottom line

To call the MVP complete:

1. **Migrations `000016`–`000021` pushed + seeded (done 2026-09-14).** The only remaining schema delta is two non-blocking corrective migrations.
2. **Bushveld comparative gate — RULED (telemetry).** The structural half is proven in code; the comparative inversion is recorded and accepted, to be confirmed by live income telemetry post-launch (ruling 2026-09-11).
3. **Do the four P10 manual checks.**
4. **Wildlife raids + boost effects — RULED DEFERRED FROM v1 (2026-09-11), and enforced 2026-10-03.** This was previously listed here as an open decision ("the Ward is sold and protects nothing"). The decision was made: both are deferred. The Ward and the other two boosts are cut from the catalogue entirely, and the raid-advertising `benefit` copy on `kraal` / `farm_boundary` has been removed with `store.spec.ts` asserting it stays removed.
5. **Small UX / cleanup:** `apps/game` deletion is **done** (2026-09-11); the footer nav is **reconciled** (hybrid 4-primary + More). The currency-clarity UI (`?` guide + Wallet section) and Kgotla NPC head-portraits are added. *(The sell-sheet tax transparency is done.)*
