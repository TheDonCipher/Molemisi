# 05 — Implementation Plan

Phases, dependencies, schema, and done-criteria. **v1 ships closed-loop** (no withdrawals); the Madi layer is v1.1 and gated on two external decisions.

---

## 0. How to read this

### 0.1 Two external blockers

| # | Blocker | Blocks | If it slips |
|---|---|---|---|
| B1 | **Legal sign-off** — Gaborone gaming/payments lawyer | v1.1 only | v1 ships. Nothing before P11 moves. |
| B2 | **PSP decision** — licensed PSP vs self-custody of BWP | v1.1 only, *and the wallet schema* | v1 ships. See §0.3. |

**Neither blocks v1.** That is the entire point of the ordering below. If B1 takes six months, Molemisi still launches as a complete, monetised, playable game — it just doesn't pay out yet.

### 0.2 Ordering principles

1. **Numbers before systems.** Every value lives in one config layer and is seeded from it. Nothing hardcodes a price.
2. **Wallet before economy.** Server authority on value has to exist before anything that creates value.
3. **Farm before Bushveld before Market.** The faucet, then the supplement, then the sink that prices both.
4. **Legal-facing work last.** Everything with compliance surface sits in v1.1.
5. **Each phase is independently shippable.** No phase ends in a state the game can't run in.

### 0.3 The one decision that touches v1's schema

B2 (PSP vs self-custody) determines whether Molemisi holds BWP or holds *entitlements* to BWP. It changes the data model — and Phase 2 is when the wallet is built.

**Mitigation:** design the ledger **now** with a nullable `currency` column and never let v1 code assume `pula` is the only row type. `player_wallets.madi_balance` is added in P12, not now. The cost of this foresight is one nullable column; the cost of not doing it is a wallet migration under time pressure later.

Recommendation, already stated in `02 §10`: **use a licensed PSP.** Holding redeemable BWP balances is plausibly e-money, which is Bank of Botswana territory, not the Gambling Authority's. Don't take that question on.

---

## v1 — closed loop

### P0 — Stabilise the build

**Depends on:** nothing. Can run in parallel with P1.

- Next.js rewrites `/api/*` → NestJS; remove the cross-port CORS path from the browser flow.
- Wire `POST /auth/logout` to Settings; clear the stored token on response.
- Add `AdminGuard` to `PUT /config` and `PUT /config/:key` — currently authenticated but not admin-gated.
- Fix or remove `pnpm db:seed` (points at a missing file).
- Visual pass on existing generated assets in the React `/game` screens.

**Done when:** signup → farm → sell → logout → login completes with no dead end, and a non-admin account gets 403 on a direct `PUT /config` call.

---

### P1 — Numbers of record & config layer

**Depends on:** P0 (not structural; can overlap).

This is the highest-value phase in the plan and the cheapest. Today `packages/game-config/src/crops.ts` carries sorghum **P15** / maize **P20** / watermelon **P40**, against the spec's P4 / P4 / P6. Nothing downstream has ever been correct, including the "corrected" crafting margins.

- Rebase `packages/game-config` onto `02 §6` — every crop, item, recipe, cost, threshold, and fee.
- **Delete** `calculateLevelXpRequired()`, `XP_REWARDS`, `STARTING_ENERGY`, and every `unlockLevel` field. Deleted, not extended (D5, C12).
- **Delete the `Special` inventory category.** Rare finds are journal Discoveries only (R3).
- Fix the category spelling `DIPHOLOGOLO` (R1) and the slug `Setena` (R2). Make both checked enums — a mismatch silently drops items from client filters.
- Add `active_months`, Kagiso fields, and restoration thresholds to the Bushveld config (see `04 §10`).
- One seed script that writes config → `item_definitions`, `crafting_recipes`, `bushveld_*`, `storage_tiers`, `top_up_packs`. **Idempotent.**

**Must not:** leave a single numeric literal in application code that appears in `02 §6`.

**Done when:** `pnpm db:seed` runs clean twice in a row with no change on the second run, and a test asserts every value in `02 §6` against the seeded database.

---

### P2 — Wallet, ledger, server authority

**Depends on:** P1.

```sql
CREATE TABLE player_wallets (
  player_id UUID PRIMARY KEY REFERENCES auth.users(id),
  pula_balance  INT NOT NULL DEFAULT 0,
  botho_points  INT NOT NULL DEFAULT 0,   -- canonical from day one (R6/C7)
  subscription_status TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id),
  currency TEXT NOT NULL,          -- 'pula' | 'botho' | 'madi'   ← nullable-ready, see §0.3
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL,            -- 'coop_sale' | 'craft_fee' | 'topup' | ...
  ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE real_world_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  provider_tx_id TEXT UNIQUE NOT NULL,   -- idempotency guard
  amount_bwp NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL,                  -- pending | completed | failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- `WalletService.credit(playerId, currency, amount, source)` and `.debit(...)` are the **only** functions permitted to touch a balance. Transactional, each writing a ledger row. **No function accepts two distinct player IDs** — enforced by signature, not convention.
- Migrate whatever currently holds Pula and the Kgotla standing score into this table in one pass. Run a reconciliation check (`sum(old) == sum(new)`) **before** cutting over reads. This is the highest-blast-radius change in the plan.
- Elapsed-time simulation on client load is **advisory**; the server recomputes and is authoritative.

**Done when:** a replayed webhook (same `provider_tx_id`) credits exactly once; an automated test enumerates every function touching a balance and asserts none accepts two player IDs; reconciliation passes.

---

### P3 — Inventory, storage, crafting

**Depends on:** P2.

```sql
CREATE TABLE item_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  base_value_pula INT NOT NULL,
  max_stack INT DEFAULT 99,
  is_tool BOOLEAN DEFAULT FALSE
);

CREATE TABLE player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_def_id UUID REFERENCES item_definitions(id),
  quantity INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_id, item_def_id)
);

CREATE TABLE storage_tiers (
  tier INT PRIMARY KEY,
  name TEXT NOT NULL,          -- Basket / Shed / Storehouse
  slot_cap INT NOT NULL,       -- 24 / 48 / 96
  listing_slots INT NOT NULL,  -- 5 / 10 / 20  (used in v1.1)
  upgrade_cost_pula INT
);

CREATE TABLE crafting_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,            -- poleto, thapo, setene, bupi, borotho
  output_item_id UUID REFERENCES item_definitions(id),
  output_qty INT DEFAULT 1,
  inputs JSONB NOT NULL,                -- [{item_id, qty}] — supports substitution groups
  fee_pula INT NOT NULL,
  duration_minutes INT NOT NULL,
  unlock_condition JSONB                -- null, or {botho_gte: 100}
);

CREATE TABLE crafting_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id),
  recipe_id UUID REFERENCES crafting_recipes(id),
  slot_index INT NOT NULL,              -- 0..2, bounded by unlocked slots
  qty INT NOT NULL,                     -- 1 | 3 | 6
  started_at TIMESTAMPTZ DEFAULT NOW(),
  collected_at TIMESTAMPTZ,
  UNIQUE (player_id, slot_index) WHERE collected_at IS NULL
);
```

Behaviour:

- **Concurrent slots:** 1 by default; 2nd and 3rd unlocked by the Crafting building upgrades (C22). `slot_index` is the enforcement point.
- **Batching:** 1 / 3 / 6, fee scaling 1× / 2.5× / 4× (sub-linear — batching trades capital for fee efficiency).
- **Substitution:** Bupi accepts **4×** of any grain (sorghum or millet). Setena accepts **any 2 of Clay / Stone** — mixed pairs allowed, so Stone has a recipe and Clay isn't a dead end (F8). `inputs` holds groups, not a fixed list. Follow the close-in-value rule in `03 §3.3`.
- **Timers 2–6 h, not minutes.** Matches the crop cadence it exists to serve; a 15-minute craft in a game whose crops take a day teaches the wrong rhythm (F14).
- **Variance, never failure:** a batch sometimes yields a bonus unit with a Mogolo line. **Never** a failed craft.
- Stack caps: Seeds 99, Crops 50, Forage 50, Livestock 30, Crafted 99, Processed 20.
- **Tools never occupy a storage slot.** They are durable equipment, not goods — a watering can counting against the same 96 as your harvest reads as a bug even when it isn't (F15).
- Storage cap enforced on write; Guild +50% **stacks** on tier (24→36, 48→72, 96→144) and vanishes the instant the subscription lapses (R7, C8).

**API:** `GET /inventory` · `GET /crafting/recipes` (filtered server-side by unlock) · `POST /crafting/start` · `POST /crafting/:jobId/collect` · `POST /farms/:farmId/storage/upgrade`

**Done when:** all five recipes craft end to end and net the margins in `02 §6.3` after tax — and each row closes horizontally when the input column is read at **opportunity cost** (base × 0.95), not at raw base value (F4); `POST /crafting/start` rejects on missing inputs **or** unaffordable fee with no partial deduction; Bupi fails below Botho 100 on a *direct API call*; Setena accepts a clay+stone mixed pair; storage upgrade raises the enforced cap; equipping all tools leaves the storage count unchanged; no recipe timer in config is shorter than 2 h; a third concurrent job is rejected while only two slots are unlocked.

---

### P4 — The Farm loop

**Depends on:** P3.

- **Crop growth 16–48 h, with nothing between 24 h and 40 h** (`02 §6.1`). Every crop is explicitly 1-day or 2-day. One harvest per daily check-in. This is the single most important balance change in the whole project — at the old 12-minute sorghum the farm was a trading terminal and the entire top-up ladder was worth under two hours of play (C16).
- **Water.** `waterDecayRate` per crop per game hour, `waterPerAction` per watering, Jojo tank capacity **60**, refill **P60**, unit price **P1.00**. **An empty tank halts the growth timer server-side.** It never kills a crop. Water is drawn **only while a crop is growing** — bare plots cost nothing, which is what makes the thirst rating a real decision rather than a flat tax (F5). Thirst is surfaced on the seed packet as a 1–3 drop rating, not buried in a config table.
- **Rain events** credit the tank. This makes rain the most anticipated event in the game, which is how it works in Botswana — and it's what gives the Pula Stone real value.
- **Wildlife.** Jackals and baboons raid plots overnight. Kraal protects livestock, Farm Boundary protects crops, Ancestral Ward grants a 3-day shield.
- **Buildings.** Storage (3 tiers), Water Source, Kraal, Farm Boundary (flat, maintenance), Crafting (1 + 2 slot upgrades). Visual tier-ups are **React sprite swaps** (D3).
- **Maintenance.** Seasonal, recurring — re-ratching thatch, repairing kraals, mending fences. This is what keeps Poleto, Thapo and Setena from becoming dead content within weeks (C21).
- **Land ladder** 4 → 8 → 12 → 20, exponential costs (`02 §6.5`).
- **Livestock.** Chickens and goats, fed with crops or feed, producing eggs, milk, manure. Lowest-effort, most reliable income — a floor under the economy.

**Done when:** with an empty tank, a crop's growth timer does not advance; refilling resumes it from where it stopped; a maintenance cycle falls due and creates real demand for a crafted material; no crop timer is under 12 hours anywhere in config.

---

### P5 — Kgotla and the Three Pillars

**Depends on:** P2 (Botho lives in `player_wallets`).

- `GET /progression` → `{ pula: {…}, botho: {current, thresholds, next}, journal: {pagesComplete, totalPages} }`. No response anywhere reads Level/XP.
- **Botho accrues only from explicit, manual, deliberate acts** — delivering a quest, contributing to a community project — and is **capped per player per day**.

  This cap is a **legal** control, not a balance one (C20). Botho gates a real-money prize; if a paid subscription's Auto-Collector supplies the materials for Botho-earning acts, the subscription indirectly buys prize eligibility. Three controls: cap the accrual, require a manual action, and make the Auto-Collector **provably incapable** of delivering a quest or donating. See `06` I4.
- Thresholds: 100 Bupi · 300 Deep Bushveld · 500 Letsema · 1000 prize eligibility. All enforced server-side (I9).
- **Letsema:** `botho >= 500` **and** not used in 7 days; completes every ready plot in one call.
- **Community projects:** shared, capped per day, deliberately not grindable (`02 §9`).
- **Elder's guidance:** a condition → line rules table read from real state (tank, weather, Botho, season). Not a dialogue tree. Extended into the proverb system.

**Done when:** Letsema fails below 500 Botho *and* within 7 days, both checked server-side; the Elder's line changes when tank/weather/Botho change; Deep Bushveld returns a `coming_soon` flag at Botho ≥ 300 rather than a 403.

---

### P6 — The Bushveld

**Depends on:** P5 (Deep Bushveld's gate reads Botho). Content seeds from P1's config.

Schema and API per `04 §10` and `04 §11`. The four things that are easy to get wrong:

1. **Kagiso is computed on read**, from `kagiso_updated_at` — not by a cron. No job, no drift, survives downtime.
2. **Kagiso is debited by `hotspot.kagiso_cost`** (1 common/material, 2 uncommon/rare/seasonal), never a flat 1.
3. **Two distinct 409 reasons** — `scene_not_settled` (Kagiso) vs `hotspot_resting` (60-min personal cooldown). The client must be able to tell them apart.
4. **The Mophane month check is decoupled from the farm's season clock.** Plain `month ∈ active_months` comparison inside the collect handler (C17-adjacent; see `04 §9.3`).

Plus: Daily Sparkle cron (midnight, one row per date, chosen from currently-ready hotspots); `field_journal_entries` on first find only; **restoration stage** recomputed on every write, swapping `background_asset_key` at 40% / 70% / 100% of a scene's finds.

**Done when:** collecting below the Kagiso cost returns 409 `scene_not_settled`; a second tap on the same hotspot within 60 min returns 409 `hotspot_resting`; exactly one hotspot system-wide carries the Sparkle per day; `Setlhare sa Phane` changes loot table only in real-world April and December, verified by mocking the clock; completing a scene's page swaps its background asset.

---

### P7 — Market: the Co-op

**Depends on:** P3.

- NPC buyer, Pula, always available, **5% tax server-side**. The client never supplies the price.
- **Price band 0.5×–2.0×** for raw and foraged goods, drifting on a 6-hour cycle.
- **Crafted and processed goods are exempt from the band** and sell at a stable 1.0× (±10%) (C14).

  Without that exemption, a crafted good can sell at 0.5× and every recipe loses money at random — which makes the margin table in `02 §6.3` a lie. With it, the player gets a real choice: **gathering is speculative, crafting is reliable.**
- Seed stock rotates by season — this is what replaces the retired level gate as the crop discovery mechanism (C12/D6).

**Done when:** a fuzz test confirms no client-supplied price is ever honoured; the 5% tax is applied on every sale path; a crafted good's sale price stays within ±10% of base across a full simulated band cycle while a raw good's does not.

---

### P8 — Live service: chapters and events

**Depends on:** P5 (Botho), P6 (scenes).

```sql
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,   -- pula | phane | moriti | letlhafula
  name TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL
);

CREATE TABLE player_chapter_state (
  player_id UUID REFERENCES auth.users(id),
  chapter_id UUID REFERENCES chapters(id),
  chapter_tokens INT NOT NULL DEFAULT 0,
  almanac_progress JSONB,
  PRIMARY KEY (player_id, chapter_id)
);
```

- Four chapters on the real calendar per `04 §9.2`.
- **Chapter Tokens expire to zero at chapter end.** Hard zero, not a decay. This is the cheapest anti-inflation device in the game.
- The **Almanac** — free track plus a Guild track.
- **Export Contracts** are house-posted and Madi-denominated, so they ship with v1.1, not here. The capped promotional budget that funds them must be configured then.

**Done when:** a chapter rollover zeroes every player's token balance exactly once, idempotently, and is safe to re-run; a dry-run of the rollover job against production-shaped data has been executed before the first real one.

---

### P9 — Monetisation

**Depends on:** P2, P3.

```sql
CREATE TABLE top_up_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,        -- starter, farmer, harvest, cattle, export
  price_bwp NUMERIC(10,2) NOT NULL,
  granted_pula INT NOT NULL         -- 5, 50, 105, 265, 540
);

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL DEFAULT 'guild',
  price_bwp NUMERIC(10,2) NOT NULL DEFAULT 49.00,
  benefits JSONB NOT NULL
);

CREATE TABLE premium_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,        -- pula_stone, ancestral_ward, breath_of_the_land
  price_pula INT NOT NULL,
  effect JSONB NOT NULL
);
```

- `POST /payments/topup` → pending `real_world_transactions` row, returns a provider checkout reference. **Credit only on webhook confirmation**, never on request.
- `POST /payments/webhook` → per-provider signature verification, then `WalletService.credit`, idempotent on `provider_tx_id`.
- **Daily cap P500**, enforced per player per calendar day **in Botswana time (UTC+2)**, not server-local (R4, C5). A UTC boundary lets a player top up twice inside one local evening.
- **Three boosts only:** Pula Stone P20, Ancestral Ward P25, Breath of the Land P15. **No Fertility Shell anywhere** — not in seed, not in the store response (R8, C10).
- **RULING 2026-09-11 — the three boosts are withdrawn from sale until their effects are wired.** They stay catalogued and seeded, but no endpoint applies any of their effects, and the Ancestral Ward's effect *is* the (deferred) raid shield. Selling them would be selling nothing. Setting `available: false` in `packages/game-config/src/store.ts` removes them from `GET /store` **and** `GET /payments/store` at once, and `StoreService.purchase` rejects them. Restore in the same commit that wires the effects. See `docs/KNOWN_LIMITATIONS.md`.
- **Auto-Collector** runs inside the existing offline-elapsed-time pass on farm load. **It must never call the Botho-increment function, deliver a quest, or donate** (I4).
- **Unbounded Pula sinks.** Cosmetics (P200–P2,000) and the Letsema community fund. Without these, a fully-built farm has nothing to spend on: P1,913–P8,814 per month accumulates with nowhere to go, and the top-up ladder quietly dies because nobody needs Pula any more (F7). Both are capped only by taste — that is the point. Ship at least one cosmetic line in v1 even if it is thin.

**Jobs:** daily — flip lapsed subscriptions to `free`; weekly — grant subscribers a Pula Stone.

**Done when:** a P100 pack credits exactly 105 Pula, once; a second top-up exceeding P500 on the same Botswana day is rejected; a subscriber's Auto-Collector runs and their Botho is provably unchanged; a lapsed subscription immediately drops auto-collect, storage bonus and cosmetics; a player at max land with a full store can still spend Pula and see their balance fall.

---

### P10 — v1 launch readiness

**Depends on:** all of v1, **and the deferred tuning-sandbox gate below.**

- Scripted walkthrough in one sitting, desktop and mobile widths: signup → farm → water → harvest → craft → sell (tax visible) → Bushveld sweep → journal discovery → Kgotla quest → Botho milestone → top-up → subscribe → boost.
- PWA installs on Android and iOS with no Play Store dependency (D13).
- Confirmed **in production configuration, not in tests:** 5% Co-op tax live; daily cap at P500 in UTC+2; no withdrawal endpoint exists; no P2P Pula transfer path exists; only three boosts in the store; prize pool floor/ceiling are the values in `02 §6.7`, not placeholder test values.
- Low-end device smoke test on throttled 3G.
- **`python scripts/balance_verify.py` prints PASS against the seeded config**, not against the spec on disk. This is the check that the numbers you shipped are the numbers you designed (F19).
- **The Bushveld has been shown to stay a supplement to the Farm** — see the tuning sandbox gate in §"Deferred" below. **Ruled 2026-09-11: this is answered by live income telemetry, not by a pre-launch model.** The structural half is proven in code (`launch-readiness.spec.ts`: Kagiso caps gathering at ≤6 taps/scene/day and cannot be bought). The comparative half is modelled in `scripts/balance_verify.py` §8 and reports an inversion at 4, 8 and 12 plots against a starter farm, closing by 20 plots (0.63×). That inversion is an accepted, recorded state — not an unresolved one. The launch obligation is therefore the telemetry commitment, not the sandbox. See `04 §1` and `docs/KNOWN_LIMITATIONS.md`.

---

## Deferred — the tuning sandbox (gates P10, starts after P6)

**Ruling 2026-09-07: implement v1 first; simulate second.** The interactive tuning sandbox in `06 §5` is *not* built up front. Reasoning in `06 §5.1`; the short version is that half its design (the API-driving bot that verifies the shipped build against the model) cannot exist before the build does, and a simulator now would be a third copy of the numbers — reintroducing the drift F19 just removed.

**Start after P6** (Farm loop *and* Bushveld both real), because its one irreplaceable question is comparative:

> **Does the Bushveld stay a supplement to the Farm rather than out-earning it?** If gathering income exceeds farm income at any farm size, Kagiso is too generous and the economy inverts.

That needs both income sources in code. Until then, `scripts/balance_verify.py` is the economy gate — headless, cheap, and already passing.

**Build it as a live-ops tool, not a one-off.** Sliders for Kagiso, prices, fees and timers; time controls; a simulated month playing out; sharing one config with the shipped build so model and game cannot drift. You will want this every season after launch, not just once.

---

## v1.1 — the Madi layer

**Gate: B1 (legal sign-off) and B2 (PSP) both resolved. Do not start P11 before then.**

### P11 — Identity and KYC

- One verified mobile number = one account. Botswana mobile money is KYC'd at the SIM, which is Sybil resistance Web3 has to pay for.
- KYC before first withdrawal: Omang or passport matching the account name, plus proof the number is yours (recent mobile money statement).
- Admin review queue with an audit trail on every verification decision.

### P12 — Madi ledger and deposits

- `player_wallets.madi_balance NUMERIC(10,2) NOT NULL DEFAULT 0` — added here, which is why `ledger_entries.currency` was nullable back in P2.
- Orange Money and Mascom MyZaka rails (D2). BTC Smega is v2.
- Madi is created **only** by a deposit or by being paid by another player. Never by the house (`02 §2`).
- If B2 went the PSP route: the PSP holds the BWP, Molemisi tracks entitlements. Confirm the reconciliation job before enabling deposits.

### P13 — The Exchange and contracts

- Player-to-player listings, player-set prices, **10% fee charged to the seller**, listing slots bounded by storage tier (5 / 10 / 20).
- Eligible goods: crafted, Bushveld materials, seasonal, livestock products. **Basic crops go to the Co-op** so the Pula economy isn't bypassed.
- **Player contracts** at the Kgotla — *"50 sorghum by Friday, paying 20 Madi."* Player-funded, so it satisfies the Withdrawal Funding Rule outright. This should carry most Exchange volume.
- **Export Contracts** — house-posted, funded from the capped monthly promotional budget, capped in configuration and logged.

### P14 — Withdrawals, caps, fraud

- Closed-loop: withdraw only to the number that funded the account. Betway's exact rule.
- Withdrawal fee `max(P5, 2%)` — flat P5 floor, 2% above P250, no ceiling. Minimum withdrawal **P100**.
- Caps: P2,000/day, P10,000/month.
- **30-day holding period on new accounts.** Kills nearly all bot-and-dash behaviour. Explain it in the UI and players accept it.
- Device/IP clustering on accounts that transact with each other.
- Monthly community prize — already specified in `02 §6.7`; KYC required before any payout, permissioned as a promotional competition under s.67.

**Done when:** a deposit → withdraw round trip costs **at most** `max(P5, 2%)` — and a P100 withdrawal is accepted, not silently rejected for being uneconomic (F9); a self-dealing sale costs 12%; no withdrawal succeeds to a number other than the funding number; no withdrawal succeeds before day 30; no withdrawal under P100 succeeds; **trades-per-deposit is instrumented and reported** — Exchange profitability is a velocity problem, not a volume problem (F10); no payout succeeds while `kyc_status != 'verified'`.

---

## Critical path

```
P0 ─┐
    ├─→ P1 ─→ P2 ─→ P3 ─→ P4 ─→ P7 ─┐
        │         └─→ P5 ─→ P6 ─→ P8 ─┤
        └─────────────────────── P9 ──┤
                                      │
                        [ tuning sandbox ] ──→ P10
                          (starts after P6)

                [ B1 + B2 ] ─→ P11 ─→ P12 ─→ P13 ─→ P14
```

`balance_verify.py` runs as a **CI gate from P1 onward** — it is not a phase, it is a check on every phase that touches a number.

**P1 is on the critical path for everything.** A wrong number in config propagates into every system built on top of it, and by the time it's visible it looks like a balance problem rather than a data problem.

**P2 is the highest-risk phase.** It moves every player's balance. Reconciliation before cutover, or don't cut over.

**Everything from P11 right is behind the gate.** If B1 and B2 resolve late, v1 has already shipped and is earning.
