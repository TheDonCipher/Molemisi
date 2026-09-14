# Molemisi — MVP Completeness Audit

**Date:** 2026-09-11 · **Arbiter:** `docs/MVP/06_Verification_Rubric.md` (wins on "is it done?") · **Auditor:** Belvedere
**Scope:** everything `docs/MVP/01`–`06` requires for v1, checked against the actual code *and* the actual database.

---

## Verdict

**The code is MVP-complete. The deployment is not.**

One hard blocker and a short list of genuine gaps. The Bushveld comparative gate is resolved by ruling (live telemetry), so the only thing between the build and a deploy is the migration push. The engineering is in better shape than the ship.

**Gates re-run today (all green):**

| Gate | Result |
|---|---|
| `tsc --noEmit -p apps/api` | **0** |
| `tsc --noEmit -p apps/web` | **0** |
| `jest` (apps/api) | **209/209**, 18 suites |
| `python scripts/balance_verify.py` | **PASS** — dead-zone 0, dominance 1, spread 3.32×, thirst 7.5×; + crafting (5 recipes) and Bushveld-vs-farm (§8) |

---

## 1. BLOCKER — the linked database is 11 migrations behind (verified live)

There are **27 migration files**; `000000`–`000015` are applied to the linked project
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

Read-only probe against the linked project:

| Probe | Result | Meaning |
|---|---|---|
| `profiles.is_admin` (migration `000015`) | HTTP **200** | applied |
| `player_wallets` (`000016`) | HTTP **404** `PGRST205` | **absent** |
| `item_definitions` (`000019`) | HTTP **404** `PGRST205` | **absent** |
| `chapters` (`000110`) | HTTP **404** `PGRST205` | **absent** |
| `player_boosts` (`000120`) | HTTP **404** `PGRST205` | **absent** |
| `profiles.role` (`000021`) | HTTP **400** `42703` "column profiles.role does not exist" | **absent** |

The live schema stops at the **P0/P1 boundary**: scaffold tables (`profiles`, `farms`, `farm_plots`, `game_config`, `market_prices`, `livestock`, `buildings`, `notifications`) exist; **everything from P2 (wallet) through P9 (monetisation) plus the role column has never been pushed.**

**Why this blocks the MVP:**

- `AdminGuard` and `DevGuard` both `select(... role)`. PostgREST errors → both guards **fail closed** → **every `/admin` and `/dev` route returns 403.**
- `GET /auth/me` (`AuthService.getRole`) selects `role` with no error check → `data` is null → **everyone, including admins, is reported as `role: 'player'`, `isAdmin: false`.** The Settings "Dev Tools" link never appears; role-aware UI is dead.
- No wallet, inventory, crafting, bushveld, chapter or store table exists → **none of P2–P9 can function at runtime.**

**Fix (one step):** push migrations to the linked project — `supabase db push` (applies `000016`→`000021`) — then seed (`supabase/seed/seed.sql` + the config seed). Re-run the probes above to confirm. Nothing else in this report can be validated end-to-end until this is done.

> Note: no local Supabase is running (`:54321` refuses). Both `apps/api/.env` and `apps/web/.env.local` point at the linked remote project, so this is the environment the app actually targets.

---

## 2. GATE — the deferred tuning sandbox (P10 depends on it)

`05 §P10` lists the tuning sandbox as a dependency of P10; `06 §5` defers it until after P6. Its one irreplaceable question is **comparative**:

> Does Bushveld income stay *below* farm income at every farm size?

`launch-readiness.spec.ts` proves the **structural** half (Kagiso caps gathering at ≤6/day and cannot be bought) and explicitly states it does **not** prove the comparative half.

**Update (2026-09-11): the comparative half is now modelled.** §8 of `scripts/balance_verify.py` computes the worst case for the invariant — a twice-daily, material-maximising player spending the whole Kagiso budget (6 pips × 3 scenes = 18 pips/day) on the single best material per scene. Bushveld gross **P162/day**; net **P153.90** at the 1.0× band (P76.95 at 0.5×, P307.80 at 2.0×).

| Farm size | Starter farm P/d | Bush/Farm | Median farm P/d | Bush/Farm |
|---|---|---|---|---|
| 4 plots | 49.00 | **3.14×** | 81.52 | **1.89×** |
| 8 plots | 98.00 | **1.57×** | 163.04 | 0.94× |
| 12 plots | 147.00 | **1.05×** | 244.56 | 0.63× |
| 20 plots | 245.00 | 0.63× | 407.60 | 0.38× |

**The invariant is inverted at 4, 8 and 12 plots against a starter-performing farm** (and at 4 plots even against a median-performing one). The script **reports** this rather than asserting it, because the result is entirely a function of the modelling assumption. **This is a ruling, not a bug:** the fix, if any, belongs in the economy spec (Kagiso regen, tap cost, material value, or farm income) — never in the script. See `05 §P10` and `07 §10.1`.

**P10 is signed off on the ruling** (2026-09-11): the structural invariant is proven in code, and the comparative half is answered by live income telemetry rather than a pre-launch model. The inversion above is a recorded, accepted state — if live data shows gathering is the optimal route, fix the economy spec, never the gate script.

---

## 3. Genuine spec gaps (specified, not implemented)

| # | Spec | State |
|---|---|---|
| 1 | **Wildlife raids** (`03 §1.3`; Kraal protects livestock, Farm Boundary protects crops, Ancestral Ward 3-day shield) | **Not implemented.** No raid mechanic anywhere in `apps/api/src` — only config prose ("Protects livestock from overnight raids"). Consequence: **Ancestral Ward protects against nothing.** |
| 2 | **Boost effects** (`05 §P9`) | **Not wired.** Pula Stone / Ancestral Ward / Breath of the Land are catalogued and (weekly) granted, but there is **no endpoint that applies an effect** — no tank refill / rain guarantee, no shield, no timer completion. |
| 3 | **P10 manual items** | Open: on-device PWA install (Android **and** iOS), throttled-3G smoke test, production-config confirmation, scripted end-to-end walkthrough in one sitting. |
| 4 | **`apps/game` deletion** (`07` G2, `01` D3) | Still present. Dead code (only `FarmScene` registered); contradicts "React only". |
| 5 | **Four-screen navigation** (`01 §3`, `07 §7.2`, G1) | Footer is now **10 columns** (Farm, Kgotla, Bushveld, Market, Store, Wallet, Crafting, Inventory, Journal, Settings). Spec wants **4 primary** (Farm · Kgotla · Bushveld · Market) + Inventory/Settings in the header. |
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

1. **Push migrations `000016`–`000021` to the linked project and seed.** *(the blocker — nothing else runs without it)*
2. **Bushveld comparative gate — RULED (telemetry).** The structural half is proven in code; the comparative inversion is recorded and accepted, to be confirmed by live income telemetry post-launch (ruling 2026-09-11).
3. **Do the four P10 manual checks.**
4. **Decide whether wildlife raids + boost effects are in v1 or formally deferred** — right now they are specified-but-absent, which is the worst of both worlds (the Ward is sold and protects nothing).
5. **Small UX / cleanup:** delete `apps/game`, reconcile the nav with the four-screen model. *(The sell-sheet tax transparency is done.)*
