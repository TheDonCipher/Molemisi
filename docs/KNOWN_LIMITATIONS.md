# Known Limitations

As-built gaps and debt as of **2026-10-03** (prior: 2026-09-28). See `DEVELOPMENT_STATE.md` for
the live inventory.

---

## RESOLVED since 2026-09-28 — the three P0 gameplay/visual defects

`docs/30_Gameplay_Visual_Narrative_Review.md` §6 laid out the fix plan. Two of the three P0s
are closed; the third is partially closed. Recorded here so the old "open bug" entries are not
re-discovered and re-reported.

### P0-1 — Animals became permanently sick, with no recovery — **RESOLVED**

Previously: health decayed while `hunger < 0.2`, `is_sick` was set at `health < 0.3`, and
feeding then **refused all further input**, with no heal endpoint or medicine item anywhere. Time
to the unrecoverable state was chicken ~7 h, goat ~8.8 h, pig ~10 h, cow ~11.7 h. The published
`SELF_SUSTAINING_THRESHOLD_HOURS = 72` could never fire, because elapsed time was clamped to
24 h first.

Now, three separate fixes:
- **12 h starvation window** — health only begins to decay after 12 *consecutive* hours at
  `hunger == 0`, tracked by the persisted `hunger_zero_since` column (migration
  `20260928000001`). An overnight gap no longer kills anything.
- **72 h livestock decay window** — `LIVESTOCK_OFFLINE_CAP_HOURS` replaces the old
  `min(elapsed, 24)` for animals, so a four-day absence decays as four days, not one.
- **Self-sustaining computed from uncapped away-time** — the threshold is compared against true
  away-time in `engine/time.ts`, so the constant is live rather than dead. Beyond 72 h: hunger
  decays at 25 %, no production, no health or happiness decay, hunger floored at 0.1.

### P0-2 — Feeding cost nothing — **RESOLVED**

`feedAnimal` now debits `{feedType, feedPerDay}` atomically through `InventoryService`, and
`AnimalConfig.feedPerDay` is read server-side. The real bug turned out to be the feed **map**, not
missing items: goat and cow were fed `herbs` (baseValue P25), so a cow burned P200/day of fodder
to make P45/day of milk and three of four animals were net-negative. All four are on `sorghum`
now. Per-kraal feeding (one tap feeds every feedable animal, summing rations atomically) landed
with the per-animal path kept as a fallback.

Resulting net/day: chicken **P14** · guinea fowl **P7** · goat **P21** · cow **P27** — all
positive, all below morula (P40.63), so animals complement the crop ladder rather than dominate
it. `livestock.spec.ts` asserts every one of these, so this cannot silently regress.

### P0-3 — ~198 of 423 asset files unreachable — **PARTIALLY CLOSED**

Reachability improved: kraal, morula, crafted and Deep Bushveld content is now wired, and the
four building `lvl1` sheets were replaced by a `kraal/` set. Withdrawn art (pig, saffron,
`building_borehole`, `building_greenhouse`, `snowflake`) moved to `assets/_archive/` so it stops
being counted as shipped.

**Still open:** buildings render as 32×32 item icons in a list, so the four building states
required by `docs/05 §5` have no visual presence; the palette/quantise pass (V-2) has not run, and
sampled assets were measured at 0 % in-palette with ~20 colours covering 80 % of a 32×32 icon.
Doc 30 Pass 2 is not finished.

---

## Open gaps — `docs/34` Wave 4 (partial)

The economy/monetization strategy is **decided** and **Waves 1–3 are implemented**. What remains
is Wave 4 plus two persistence holes. Recorded here so "specified but absent" never reads as an
oversight.

| # | Gap | State | Needed |
| --- | --- | --- | --- |
| **W4-a** | **Store purchase UI not wired** | `StoreScreen` exists as a component reference; no live purchase flow against the real endpoint | Wire end-to-end against the stub provider (`docs/34` §4.3) |
| **W4-b** | **Botho automation unlocks have no persistence** | `BOTHO_THRESHOLDS` + `AUTOMATION_LADDER` + `automationUnlockedAt()` are config-only; nothing stores an unlock, so nothing is granted at runtime | A place to record unlocks — same blocker as `docs/32` 3.4/3.5 |
| **W4-c** | **Chapter Tokens are unspentable — RESOLVED in code** | `ChapterService.spendTokens()` exists **and** `POST /chapters/tokens/spend` is now routed (`chapter.controller.ts:56`); the balance is spendable. The supporting `spend_chapter_tokens` migration is present but **untracked**, so the route is reachable only after that migration is pushed | Push the untracked `spend_chapter_tokens` migration (`docs/38` T-4 / I-7), then the route is fully live against the remote DB |
| **W4-d** | **Maintenance rhythm not fully rolled out** | `MAINTENANCE.intervalDays` is 30 and `economy.spec.ts` asserts it, but the four `BUILDINGS[*].maintenanceIntervalDays` consumer path is not re-verified end-to-end | Confirm the building path reads the new cadence |

### Landed (Waves 1–3) — for the avoidance of doubt

- **Madi is real.** `player_wallets.madi_balance` exists (migration `20261001000003`) with a
  non-negative constraint, and `wallet_apply()` accepts `'pula' | 'botho' | 'madi'`. There is
  deliberately **no conversion helper** anywhere in the schema — the absence is the feature, and
  adding a `madi_to_pula()` later must be a separate, argued migration.
- **Top-ups grant Madi, never Pula.** `TOP_UP_PACKS` are P5/20/50/100/250 → 5/20/55/110/275 Madi.
- **Two cosmetic shelves.** Market (Pula 200/600/1,500) and Festival (Madi 40/80/150/300), with
  every Festival item required to have a Market cousin in the same slot — asserted by
  `store.spec.ts`, because that promise is the whole product.
- **Village Pass** replaced the Guild subscription: M50/month, helper + monthly outfit + 50 %
  storage. The helper is also earned free at Botho 500, so paying gets it early and playing gets
  it forever.
- **Boosts are cut**, not withdrawn: `BOOSTS` is `readonly never[]` and `BOOST_SLUGS` is empty.

---

## Real-money rails

Unimplemented and unchanged: `StubPaymentProvider` only. Orange Money, Mascom MyZaka and BTC
BeMobile Smega are all **Phase 7**. The `PaymentProvider` interface means adding one needs no
economy change (`docs/10 §2`) — the abstraction is real and working, there is just nothing
behind it but the stub.

---

## Schema push status

### The original deploy gap is closed (2026-09-14); 41 of 51 migrations pushed live, 10 untracked

The 11-migration deploy gap (`000016`–`000120` + `000021`) was pushed to `nyapfgawanqvnkkjudxb`;
`/admin`, `/dev` and P2–P9 now run at runtime and `/auth/me` resolves roles correctly.

The repo has **51 migration files**: **41 are committed and pushed live** to `nyapfgawanqvnkkjudxb`
(through `20261002000000`), and **10 further are present in the working tree as untracked files**
(`20261002000001` → `20261003000020`: the M-series security hardening, the atomic
`inventory_take`/`botho_cap`/`kgotla_charge` helpers, and `spend_chapter_tokens`). Those 10 are
**not yet committed or pushed**, so there is a pending schema delta for them.

| Pushed live (2026-10-02) | Summary |
| --- | --- |
| `20260914000022` | `player_cosmetics.cosmetic_id` UUID → TEXT drift fix |
| `20260916000030` | drop 2 obsolete `plant_crop_transaction` overloads |
| `20260923000031` | livestock inventory cutover |
| `20260923000032` | Kgotla charges + decay |
| `20260923000033` | deep time & lore content |
| `20260923000034` | batch-2 Deep Bushveld + fertilizer |
| `20260924000000` | reconcile `market_prices` to the catalogue |
| `20260928000001` | livestock starvation window (`hunger_zero_since`) |
| `20261001000001` | economy metrics (`economy_price_snapshots`) |
| `20261001000002` | anti-cheat (`anti_cheat_flags`) |
| `20261001000003` | **`madi_balance` + `wallet_apply()` third currency** |

> ✅ **Resolved (pushed 2026-10-02):** `madi_balance` exists in the database and Madi paths resolve;
> Pula-spend paths continue to work. The Wave 2.1 → 2.2 push-order dependency is satisfied.
>
> ⚠️ `20261001000001` must call `public.is_admin(auth.uid())`, never the bare `is_admin()`. The
> function has no zero-arg overload, so the bare form is a `42883` at `CREATE POLICY` time,
> which aborts the transaction and leaves the migration unapplied.

---

## Deferred from v1 by ruling (2026-09-11)

Two features are specified in the normative set and deliberately **not** in v1. Recorded here
so "specified but absent" never reads as an oversight.

### Wildlife raids are not implemented

`03 §1.3` describes jackals and baboons raiding plots overnight, with the Kraal protecting
livestock, the Farm Boundary protecting crops, and the Ancestral Ward granting a 3-day shield.
**No raid mechanic exists anywhere in `apps/api/src`.** Deferred because it touches the
highest-risk surface — the growth simulation, building effects, and the offline-elapsed-time
pass — and no v1 done-criterion tests it. The Ancestral Ward was one of the three boosts, and
**all three boosts are now cut from the catalogue entirely** (`docs/34` §3.3), so nothing is sold
that does nothing. Re-adding the SKUs is a deliberate act gated on every effect working —
see `docs/34` §6 "do-not-do".

### Boost effects are not wired

`05 §P9` required three boosts (Pula Stone, Ancestral Ward, Breath of the Land). They were
catalogued and sold while **no endpoint applied any of their effects** — no tank refill or rain
guarantee, no shield, no timer completion. The ruling of 2026-09-11 withdrew them
(`available: false`); `docs/34` §3.3 then went further and **deleted the entries**, because
catalogue entries that do nothing can be half-restored by a later merge and keep `BOOSTS`
looking like a live product line. `BOOSTS` is now `readonly never[]` and `BOOST_SLUGS` is empty,
and `store.spec.ts` asserts the catalogue stays empty.

### Bushveld comparative income is answered by telemetry, not a model

`04 §1` requires the Bushveld never to out-earn the fields. The structural half is proven in
code; the comparative half is modelled in `scripts/balance_verify.py` §8.

> **CORRECTED 2026-10-03 — the figures below were a THREE-scene number and are now stale.**
> `04 §5` ships FOUR scenes: Deep Bushveld got four hotspots in batch 2 (G5, 2026-09-23), but
> the gate script still modelled `SCENE_COUNT = 3` and omitted the deep scene entirely. It
> has been corrected to 4. Corrected figures:
>
> | | 3 scenes (old, sub-Botho-300) | 4 scenes (current) |
> |---|---|---|
> | Kagiso ceiling | 18 pips/day | **24 pips/day** |
> | gross/day | P162.00 | **P258.00** |
> | net @1.0× band | P153.90 | **P245.10** |
> | net @0.5× / 2.0× | P76.95 / P307.80 | **P122.55 / P490.20** |
>
> The best deep-scene tap is `db_heartwood` → hardwood P8 at 6 taps × 2 avg (hardwood yields
> 1–3, not the 2–4 every other material gives) = **P96/day**. Deep Bushveld is **Botho
> 300-gated**, so the 3-scene column is still the honest *launch* figure and the 4-scene
> column is the *post-ladder* one; §8 now prints both.
>
> **The previously-ruled P153.90 figure was itself stale, not merely the comparison.** The
> 2026-09-11 ruling was made against a 3-scene model, so it blessed an understatement: the
> inversion it accepted was measured P245.10/day below and is in fact P245.10/day above.
>
> With 4 scenes the inversion now covers **4, 8, 12 AND 20 plots** on the starter basis
> (5.00× / 2.50× / 1.67× / 1.00×) — previously 20 plots closed the inversion at 0.63× and
> now it does not. Against the median crop it is 3.01× / 1.50× / 1.00× / 0.60×. The
> P153.90 inversion at 4, 8 and 12 plots (closing by 20 at 0.63×) remains the accurate
> *launch* (sub-Botho-300) description.
>
> **Ruled 2026-09-11: live income telemetry answers this post-launch.** The inversion is a
> recorded, accepted state, not an open bug. The widening above sharpens the telemetry ask —
> it is now a Botho-300 player's question, not a launch-week one.

---

## Product / UX

### Phaser is not the player client

`/game` is a React screen switcher. The standalone Phaser prototype `apps/game` (Boot / Preload /
FarmScene on port 3002, with Kgotla/Bushveld/Market scenes and `apps/game/src/ui` panels) was
**deleted on 2026-09-11**. React `/game` is now the only client; the spec's "React only" intent
(`01` D3) is satisfied.

### Token key split

Login writes both `molemisi_token` and `token`. `apps/web/src/lib/api.ts` reads
`molemisi_token` first, then `token`. Admin uses `molemisi_admin_token`. Easy to desync;
superseded by the Supabase session token in practice.

### No token refresh

Login/register return a Supabase `refreshToken`. There is no `POST /auth/refresh`. Sessions
die with JWT expiry (`jwt_expiry = 3600` in `supabase/config.toml`).

### No audio

No Phaser sound, Howler, or audio assets. Settings BGM/SFX sliders only write React state.

### Store UI exists on the web client, but the purchase flow is not wired

`StoreScreen` renders the in-game store (`GET /store`) and real-money packs (`GET
/payments/store`). There is **no live purchase flow** against the real endpoint yet — this is
`docs/34` §4.3 and is tracked as **W4-a** above. The boosts are gone from both shelves entirely.

### Bushveld React forage is partly client-side

`BushveldScreen` can show forage nodes without going through every API path. The server
`POST .../bushveld/hotspots/:id/collect` is authoritative when used.

### No i18n beyond en/tn strings

`translations.ts` covers UI copy. Content (crop names, NPC dialogue) is English in
config/services.

### Nav is hybrid (resolved)

`HeaderNav` shows the 4 primary screens (Farm, Kgotla, Bushveld, Market) in the footer and the
rest (Store, Wallet, Crafting, Inventory, Journal, Settings) in a header **More** menu. This
reconciles the four-screen model (`01 §3` / `07 §7.2`); Inventory + Settings live in the header.

---

## API / backend

### `PUT /config` is now admin-gated (resolved)

**RESOLVED.** `config.controller.ts` carries `@UseGuards(AdminGuard)` on **both** `PUT /config`
and `PUT /config/:key`. The class-level `AuthGuard` still applies, so a plain player now gets
403 rather than being able to change live `game_config`. (Before the fix it returned 500 for
non-admins, which was the SEC-06 finding.)

### Payment webhook requires JWT

Comments say webhook is unauthenticated. Class-level `AuthGuard` still applies. Stub
`verifyWebhookEvent` always returns true. No Stripe/Orange Money HMAC.

### Stub payments only

`StubPaymentProvider` completes immediately. Stripe / Orange Money env vars are commented in
`.env.example`. Entitlements for extra plots/storage/cosmetics are largely logged, not fully
applied.

### Exception filter unused

`AllExceptionsFilter` is not registered in `main.ts`.

### Rate limit is in-process

60 requests / 60 seconds, memory map, not Redis. Resets per API process.

### Anti-cheat exists but has no admin review UI

Detection is shipped: pure passive rules (negative balances, negative inventory, orphan crops,
resources without a source) and active rules (rapid currency gain, cost bypass, inventory
manipulation, market flip / out-of-band price, sequence violations) in
`apps/api/src/anti-cheat/rules.ts`, plus the `anti_cheat_flags` table and admin read endpoints
(`GET /admin/anti-cheat/flags`, `POST .../passive`, `POST .../active`).

**What is missing is the human half.** There is no review surface in `/admin`, so a reviewer has
to use the API directly. Two design points to preserve when building it: writing a flag **never**
mutates player state, and the unique-open index means one open flag of the same kind per target —
a reviewer resolving a flag is what allows a repeat to be re-raised.

### State validation exists but is not wired into a scheduled sweep

`validateGameState()` / `planRecovery()` are pure and complete, and they run inside the anti-cheat
pass. There is **no cron or admin sweep** that walks all farms, so a corrupted row on a dormant
account is detected only when that player returns.

### Analytics has no HTTP API

`analytics_events` table + service exist. No player or admin query endpoints. Events are
emitted from most actions but not all. (Note the new `economy/` module *is* queryable — it reads
`economy_price_snapshots` and the ledger, not `analytics_events`.)

### Validation schemas underused

Zod schemas exist for fertilize, heal, etc. Controllers mostly use loose body types. Nest
`ValidationPipe` + class-validator run on DTOs that exist; many routes have none.

### Contracts / NPCs / zones / events not data-driven

Hardcoded in Nest services. `packages/game-config` does not export them. This is a deliberate
MVP scoping choice (verified), not drift — flagged so it is not mistaken for debt.

### No idempotency on most mutations

Payments table has an idempotency column. Plant/water/harvest/market are not idempotent-keyed.

---

## Frontend / infra

### No reverse proxy

Next.js has no `rewrites` for `/api`. Online single-port preview cannot reach the API unless
`NEXT_PUBLIC_API_URL` is publicly reachable and `CORS_ORIGIN` allows the preview origin. For
local work, set `CORS_ORIGIN=http://localhost:3000` (or a comma-separated list) — this is the
only thing standing between a local `pnpm dev` and a CORS failure.

### Vite `allowedHosts` not set (removed)

This limitation referenced `apps/game/vite.config.ts`, which no longer exists — the Phaser
prototype was deleted on 2026-09-11. Not applicable to the shipped React client.

### Dual Next config

`next.config.js` is the active file. `next.config.mjs` is a stale duplicate.

### PWA is minimal

Custom `sw.js`, no `next-pwa`, no offline game simulation on the client, no push.

### Capacitor / native

Not started (ADR-011).

### Redis

Not used (ADR-012: optional later). No cache, no distributed rate limit, no job queue.

---

## Testing / ops

### Unit coverage is broad; integration coverage is narrow

**37 Jest suites / 615 tests** across the workspace (`apps/api` 28 suites / 417 tests;
`packages/game-config` 8 / 163; `packages/validation` 1 / 35) — a real suite, and the new
`engine`, `economy`, `anti-cheat`, `livestock` and `world-events` suites are the direct
counter-evidence to the old "thin tests" claim.

What is still missing:
- `apps/api/test/core-loop.integration.spec.ts` sits outside Jest's `rootDir: src` and is
  **never run**.
- No Playwright or other E2E. Live coverage is `scripts/test-*.mjs` against a running API.
- No test exercises the real Supabase schema, so a migration that fails to apply is invisible to
  `pnpm test`. A migration that fails to apply is invisible to the test suite, so schema
  health still needs an explicit `supabase migration list` / apply check in CI.

### CI has no database

GitHub Actions runs lint, typecheck, test, build. No Supabase service, no migration check, no
deploy.

### No staging/production pipeline

Deployment spec is design-only.

---

## Tooling debt

### `db:seed` is a dead script in two places

The root `package.json` defines `"db:seed": "pnpm --filter @molemisi/api db:seed"`, and
`apps/api/package.json` defines `"db:seed": "ts-node src/database/seed.ts"` — but
**`apps/api/src/database/` contains only `database.module.ts` and `supabase.service.ts`**. The
command therefore fails on a missing file. Either restore the script or delete both entries;
leaving it documented-but-broken is how people lose an afternoon.

---

## Security notes (known, not a scan)

- JWT in localStorage (XSS-sensitive), not httpOnly cookies
- Service role key is server-only if env is set correctly
- Admin is a boolean on `profiles` (`is_admin`) **and** a `role` (`admin`) — either grants
  `AdminGuard`, and `role='dev'` is the top tier, admitted to both `/admin` and `/dev`
- `DevGuard` is the mirror: `role='dev'`, `role='admin'` or `is_admin`, so admins can reach dev
  tooling. Neither guard reads a JWT claim; both query `profiles` on every request.
- Banned users can still hit `/admin/` URLs at the guard layer (intended for admin tooling)
- `anti_cheat_flags` has RLS enabled with **no** player policy — players cannot read their own
  flags, and nothing writes from the client. Admins reach it through the service role only.
- Payment webhook verification is a stub that always returns true, so a real PSP must bring its
  own HMAC/signature check with it

---

## Won't-fix for Alpha unless blocking

- Full Phaser embedding in Next.js (ADR-001/002; React owns the playable UI)
- Real payment providers (behind a working `PaymentProvider` interface)
- Sound design
- Push notifications
- Friend/social features (post-MVP roadmap)
