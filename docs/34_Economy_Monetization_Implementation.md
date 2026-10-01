# 34 — Economy & Monetization Implementation

> **The build sequence for the decided strategy in `docs/33_Economy_and_Monetization_Strategy.md`.**
> **Status:** LIVING · created 2026-10-01 · roadmap slot = `docs/32` Pass 5 (tasks 5.1–5.11)
> **Authority:** `docs/33` decides **what**; this file decides **how**. `docs/MVP/` remains normative on everything else.
> **Target reader:** someone implementing this cold, with the repo open.

---

## 0. How to use this file

- **Nothing here is optional scope.** Waves 1 and 2 are the economy becoming *correct*; Waves 3–4 make it *sellable*.
- **Every task has an acceptance test.** Run it; if it fails, the task is not done.
- **Order matters.** Wave 2's migration is additive and safe, but Wave 2.2 changes what a payment *grants* — do not ship it before Wave 2.1 exists or you will credit a currency that has no balance column.
- **Current state to beat:** the store grants **Pula** for BWP (`payments.service.ts` → `wallet.credit(playerId, 'pula', …, 'topup', …)`), `wallet_apply()` **rejects** `'madi'`, and `TOP_UP_PACKS` are `P5/50/100/250/500 → 5/50/105/265/540 Pula`.

## 1. The decision, condensed

| | Value |
|---|---|
| **Pula (P)** | Soft. Earned by play. **Never sold.** |
| **Madi (M)** | Hard. `1 M = BWP 1.00`. **Spend-only.** Buys Festival decorations + Village Pass. |
| **Botho** | A meter, capped **50/day**. Unlocks helpers. **Never sold.** |
| **Store products** | Decorations (Market=Pula, Festival=Madi) · **Village Pass M50/mo**. That's it. |
| **Boosts** | **Cut** — remove from the catalogue, not just `available:false`. |
| **Top-ups** | P5→5 · P20→20 · P50→**55** · P100→**110** · P250→**275** Madi. Cap **P500/day**. |

## 2. Wave order

| Wave | What it does | Blocked by | Effort |
|---|---|---|---|
| **1 — Config fixes** | Livestock economics · Botho ladder · maintenance rhythm | — | S–M |
| **2 — Madi money** | Migration · packs · entitlement change | Wave 1 (no) | **L** |
| **3 — Products** | Decorations · Village Pass · cut boosts · season stamps | Wave 2 | M |
| **4 — Pacing & UI** | Land tail · store UI · currency copy | Wave 3 | S–L |

---

## Wave 1 — Config fixes (no schema, no payments; ship first)

> **1.1 — Fix livestock economics (highest-value fix).**
>
> ⚠️ **CORRECTED 2026-10-01 during implementation.** An earlier draft of this task was
> written from `MVP/02 §6.2`, which is **stale**: it lists eggs P3 / milk P5. The
> authoritative catalogue (`items.ts`, confirmed by `docs/26 §G3`) has **eggs P5 and
> milk P15**. `milk.baseValue` therefore needs **no change at all**. The *finding* was
> right — the feed map was the bug — but the magnitudes below are the corrected ones,
> and no `_milk_price.sql` migration is required.
>
> `livestock.ts` mapped goat/cow feed to `herbs` (**baseValue P25**). A cow burned
> **P200/day** of fodder to make **P45/day** of milk. Guinea fowl burned P18/day of
> sorghum for P16/day of eggs. Three of four animals were net-negative. `docs/33` §8.

| File | Change | Done |
|---|---|---|
| `game-config/livestock.ts` | `feedType`: goat & cow `herbs` → **`sorghum`** | ✅ |
| `game-config/livestock.ts` | `feedPerDay`: chicken **2**, guinea_fowl **3**, goat **3**, cow **6** | ✅ |
| `game-config/livestock.ts` | goat `productQuantity`: **1 → 2** | ✅ |
| ~~`game-config/items.ts`~~ | ~~`milk` `baseValue` 5 → 12~~ — **already P15; no change** | n/a |
| ~~`supabase/migrations/…_milk_price.sql`~~ | ~~not needed~~ — no price moved | n/a |

Resulting net/day: chicken **P14** · guinea fowl **P7** · goat **P21** · cow **P27** —
all positive, and all below morula (P40.63), so animals complement the crop ladder
rather than dominate it. Herbs keep their livestock role as the **`treat`** item
(`TREATMENT_ITEM`), which is a better fit than fodder.

✅ **Acceptance:** `livestock.spec.ts` asserts **every animal is net-positive per day at
base prices**, plus the exact margins, plus "no animal eats herbs", plus a payback
window. `animalNetPerDay()` exists so the rule is one assertion rather than a paragraph.
`pnpm test` **146/146** + `python scripts/balance_verify.py` **PASS**.

> **1.3 — Maintenance rhythm.** 90-day lump → **30-day bill, bill UNCHANGED.**
> `game-config/economy.ts` `MAINTENANCE.intervalDays` **90 → 30**; the four
> `BUILDINGS[*].maintenanceIntervalDays` follow. Added `MAINTENANCE.warningLeadHours = 24`.
>
> ⚠️ **CORRECTED 2026-10-01.** An earlier draft said "30-day bill, **⅓ the size**".
> That is self-cancelling: a ⅓ bill on a ⅓ period is the **same daily rate**, so it
> would have smoothed the lump while leaving audit P1-8 ("recurring sink too small")
> completely unfixed. What actually works is the pair:
>
> - **period ÷3 with the bill held** → the daily drain **triples** (P3 → ~P9.5/day), and
> - the player's **annual** cost is **unchanged** — it is not more expensive, only more
>   often, which is the entire point. A quarterly lump followed by three dead months is
>   what left the material economy flat between bills.
>
> ✅ **Acceptance:** `economy.spec.ts` asserts `intervalDays === 30`, that all four
> buildings agree on the cadence, and that bill/period rose **exactly 3×** while the
> annual bill did not move. **DONE.**

> **1.2 — Botho helper ladder.** **DONE (config layer).** Replaces the old
> "Auto-Collector 150 → Auto-Feeder 300 → Irrigation 500" plan (`docs/32` 3.5) with
> **`docs/33` §4**: **Auto-Feeder at 300 · Auto-helper at 500.**
> `game-config/economy.ts` — `BOTHO_THRESHOLDS` gains `AUTO_FEEDER: 300` and
> `AUTO_HELPER: 500`; a new exported `AUTOMATION_LADDER` array plus
> `automationUnlockedAt()` make the ladder readable by the client so the UI can show
> "unlocks at 300 Botho" without hardcoding the numbers.
> Every rung is a **chore remover, never a yield multiplier** — that is what lets the
> same behaviour also be the paid Village Pass helper without becoming pay-to-win.
> ⚠️ **STILL BLOCKED at the persistence layer — needs schema sign-off** (a place to
> record unlocks). Same blocker as `docs/32` 3.4/3.5. The config is landed; the
> unlocks are not yet stored, so nothing is granted at runtime yet.

---

## Wave 2 — Madi money (the migration)

> This is the one piece of real schema work. It is **additive** — nothing existing is dropped.

### 2.1 Migration — add a Madi balance

`ledger_entries.currency` is already `TEXT CHECK (currency IN ('pula','botho','madi'))` — the foresight comment in `20260908000016_v1_wallet_and_ledger.sql` anticipated this. But `wallet_apply()` hard-rejects anything that isn't `pula`/`botho`, and `player_wallets` has no `madi` column.

**New file:** `supabase/migrations/20260930000040_add_madi_balance.sql`

```sql
-- 34 Wave 2 — Madi balance (docs/33 §2: spend-only premium currency).
-- 1 Madi = BWP 1.00. Never converts to Pula. Never withdrawable.

ALTER TABLE public.player_wallets
  ADD COLUMN IF NOT EXISTS madi_balance INT NOT NULL DEFAULT 0,
  ADD CONSTRAINT player_wallets_madi_non_negative CHECK (madi_balance >= 0);

COMMENT ON COLUMN public.player_wallets.madi_balance IS
  '34 §2.1 — DECIDED 2026-10-01 (docs/33 §2). Spend-only premium currency.
   1:1 backed by deposits, never converts to Pula, never withdrawable.
   Pula is NEVER sold (MVP/02 §3.1).';

-- wallet_apply is the ONLY writer (R6). Teach it the third currency.
CREATE OR REPLACE FUNCTION public.wallet_apply(
  p_player_id UUID, p_currency TEXT, p_amount NUMERIC,
  p_source TEXT, p_ref_id TEXT
) RETURNS NUMERIC AS $$
DECLARE v_balance NUMERIC;
BEGIN
  IF p_player_id IS NULL THEN
    RAISE EXCEPTION 'wallet_apply: player_id is required';
  END IF;
  IF p_currency IS NULL OR p_currency NOT IN ('pula','botho','madi') THEN
    RAISE EXCEPTION 'wallet_apply: unsupported currency %', p_currency;
  END IF;
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'wallet_apply: amount must be non-zero (got %)', p_amount;
  END IF;

  IF p_currency = 'pula' THEN
    UPDATE public.player_wallets SET pula_balance = pula_balance + p_amount
      WHERE player_id = p_player_id RETURNING pula_balance INTO v_balance;
  ELSIF p_currency = 'botho' THEN
    UPDATE public.player_wallets SET botho_points = botho_points + p_amount::INT
      WHERE player_id = p_player_id RETURNING botho_points INTO v_balance;
  ELSE -- 'madi'
    UPDATE public.player_wallets SET madi_balance = madi_balance + p_amount::INT
      WHERE player_id = p_player_id RETURNING madi_balance INTO v_balance;
  END IF;
  -- …balance_after / ledger insert unchanged…
  RETURN v_balance;
END; $$ LANGUAGE plpgsql;
```

> ⚠️ **Do not hand-edit the live function.** Copy `20260908000016` + the two follow-ups (`…017`, `…018` floor) and produce one new definition — a `CREATE OR REPLACE` that drops the Pula floor rule from `…018` is a silent regression.

✅ **Acceptance:** `supabase db push --dry-run` clean · a service-role insert of `('madi', +10)` lands in `madi_balance` **and** writes a ledger row · `('madi', -10)` on an empty balance is refused.

### 2.2 Entitlements grant Madi, never Pula

**This is the anti-pay-to-win switch. Do not skip the second test.**

| File | Change |
|---|---|
| `api/wallet/wallet.service.ts` | `WalletCurrency` → add **`'madi'`**; add `creditMadi()` / `spendMadi()` mirroring `credit`/`spendPula`; add `'madi_topup'`, `'madi_spend'` to `LedgerSource` |
| `api/wallet/wallet.service.ts` | `topUpTotalToday` — read **BWP spent**, not the currency. Today it sums `currency='pula' AND source='topup'`; change to the **payments** table (`SUM(amount)` where `status='completed'`, player's Botswana day). This keeps the **P500/day** cap meaningful once the currency changes. |
| `api/payments/payments.service.ts` | `case 'currency'` → `await this.wallet.credit(playerId, 'madi', amount, 'madi_topup', paymentId)` **instead of** `'pula'/'topup'` |
| `api/payments/payments.service.ts` | `bwpFor()` — match packs on `grantedMadi`, not `grantedPula` |

✅ **Acceptance (three tests, all must pass):**
1. A completed top-up credits **`madi_balance`**, and **`pula_balance` is unchanged**.
2. `pula_balance` never increases from any `payments` code path — assert no ledger row `('pula', +, 'madi_topup')` can be written.
3. The daily cap still refuses a P501 purchase in **Botswana time**.

### 2.3 Top-up packs — re-denominated

`game-config/economy.ts` — replace `TOP_UP_PACKS` (`grantedPula`) with `grantedMadi`:

```ts
export interface TopUpPack { slug: string; name: string; priceBwp: number; grantedMadi: number }
export const TOP_UP_PACKS: TopUpPack[] = [
  { slug: 'spark',   name: 'Spark',   priceBwp:   5, grantedMadi:   5 },
  { slug: 'farmer',  name: 'Farmer',  priceBwp:  20, grantedMadi:  20 },
  { slug: 'harvest', name: 'Harvest', priceBwp:  50, grantedMadi:  55 }, // flagship
  { slug: 'cattle',  name: 'Cattle',  priceBwp: 100, grantedMadi: 110 },
  { slug: 'export',  name: 'Export',  priceBwp: 250, grantedMadi: 275 },
];
export const DAILY_TOP_UP_CAP_BWP = 500; // unchanged (R4)
```

Then in `store.ts`, `TOP_UP_ENTITLEMENTS` becomes `entitlement: { type: 'madi', amount: p.grantedMadi }`, and `VirtualEntitlement` gains `{ type: 'madi'; amount: number }`.

**Downstream renames** (compile errors are your checklist): `grantedPula` → `grantedMadi`, `premium_currency` → `madi`, `store.ts` description copy.

✅ **Acceptance:** every pack's bonus is **0–10%** (`(madi−bwp)/bwp`); the storefront shows BWP prominently; a P50 purchase credits exactly **55 Madi** and **0 Pula**.

---

## Wave 3 — The two products

### 3.1 Decorations — two shelves

`store.ts` `COSMETIC_ENTITLEMENTS` becomes two lists:

| Shelf | Currency | Prices | Rule |
|---|---|---|---|
| **Market** | `PULA` | **P200 / P600 / P1,500** | The everyday line; also the sink that absorbs late-game Pula (`MVP/02 §7.1`) |
| **Festival** | `MADI` | **M40 / M80 / M150 / M300** | Seasonal; every one needs a Market-shelf cousin in the **same slot** |

**The rule that matters:** *nobody's farm looks poorer because they didn't pay.* Enforce it as a test, not a comment.

✅ **Acceptance:** for each Festival SKU there exists a Market SKU with the same `slot`; a free player can reach every visual affordance.

### 3.2 Village Pass — M50/month

`economy.ts` `GUILD_SUBSCRIPTION` → `VILLAGE_PASS` (`priceBwp` stays the pack-price field, but the **entitlement** is monthly M50): helper (waters + collects) · one festival outfit/month · **+50% storage stacking**.
- `monetisation.service.ts` — `flipLapsedSubscriptions` keeps working unchanged (it only moves `subscription_status`).
- **Delete the weekly Pula Stone grant** (`grantWeeklyPulaStones`): Pula Stone is a cut boost. If you keep the method, it grants a cosmetic instead — decide once and say so in the code comment.
- `getGood` entitlement for the helper must be **cosmetic/convenience only** — never Botho (`creditBothoCapped` stays unreachable from the subscription path; that is I4).

### 3.3 Cut the boosts

Remove `BOOSTS` from `economy.ts` and their entries in `store.ts` — **not** `available: false`, which was a workaround for selling something that did nothing. Keep `launch-readiness.spec.ts`'s `BOOST_SLUGS` pin updated.

### 3.4 Season stamps

- **Rename in UI only** — keep the internal slug `chapter_token` and the ledger `currency='chapter_token'` (renaming the column is not worth the migration risk).
- **Wire a spend route**: `ChapterService.spendTokens()` exists but `ChapterController` exposes no route. Add `POST /chapters/tokens/spend`. Sinks: **season souvenir (cosmetic)** only — never seeds, Pula, Botho, or water.
- **Or, if that slips:** hide the balance in the UI. A currency you cannot spend is worse than no currency — the same reasoning that withdrew the boosts.

✅ **Acceptance:** a player can buy the season souvenir with stamps; balance decrements in the ledger; no gameplay-affecting sink exists.

---

## Wave 4 — Pacing & player-facing copy

### 4.1 Land tail

`game-config/economy.ts` `LAND_LADDER` — **structure stays** (3.7 already inserted the 16 rung), costs change:

```ts
export const LAND_LADDER: LandTier[] = [
  { plots: 4,  costPula: null },
  { plots: 8,  costPula: 1200 },
  { plots: 12, costPula: 6000 },
  { plots: 16, costPula: 8000 },   // was 14,000
  { plots: 20, costPula: 15000 },  // was 30,000
];
```

`LAND_LADDER_TOTAL` → **31,200**. Also update `docs/MVP/02 §6.5` (done) and any test pinning the total.

**Why:** the old 16→20 rung took **~254 days** of marginal payback — a churn wall sitting right where players decide to commit. **Rule going forward: no land rung may exceed ~60 days of marginal payback.**

✅ **Acceptance:** `balance_verify.py` **PASS** · a spec asserts every rung's payback ≤ ~60 days.

### 4.2 Currency copy (player-facing)

`apps/web/src/components/CurrencyGuide.tsx` is the single source of the currency explainer. Rewrite to the decided model:

| Currency | Show as | One line |
|---|---|---|
| Pula | 🟡 coin | "Your farm money. Earned by playing — we never sell it." |
| Madi | 📱 phone | "Bought with your phone. Spent on decorations and the Village Pass." |
| Botho | 🤝 hand | "How much the village likes you. Filled by helping — never bought." |
| Season stamp | ✦ stamp | "A mark of the season you were here for. Resets each season." |

Also: `WalletScreen.tsx` gains a **Madi row** (hidden until `madi_balance` exists); `README.md` and `KNOWN_LIMITATIONS.md` updated (done in this pass).

### 4.3 Store UI

`docs/10` records **"No React store UI"** — `StoreScreen` exists as a component reference but there is no wired purchase flow against the real endpoint. Build it **against the stub provider first**; real PSPs are Phase 7 and need no economy change (`docs/10 §2`, provider abstraction).

✅ **Acceptance:** a player can buy a pack end-to-end against the stub, see their Madi balance update, and buy a Festival decoration — with **no** change to the economy constants.

---

## 5. Definition of done (the whole thing)

Run in order; all must be green before this is "shipped":

```bash
pnpm typecheck            # tsc api + web = 0
pnpm test                 # jest green (add the two new assertions below)
python scripts/balance_verify.py   # PASS
```

**New assertions that must exist:**
1. **Every animal is net-positive per day** at base prices. *(§Wave 1.1)*
2. **No top-up credits Pula.** No ledger row `('pula', +, 'madi_topup')` is writable. *(§2.2)*
3. **Every Festival decoration has a Market-shelf cousin** in the same slot. *(§3.1)*
4. **Every land rung pays back in ≤ ~60 days.** *(§4.1)*
5. **No boost SKU exists** in the catalogue. *(§3.3)*

## 6. Do-not-do list

| ❌ | Why |
|---|---|
| Don't let any code path convert **Madi → Pula** | It would make Pula purchasable, breaking the cozy promise and the compliance hinge (`docs/33` §2). |
| Don't let the Village Pass's helper earn **Botho** | I4: Botho gates a real-money prize; the subscription must be structurally unable to reach `creditBothoCapped`. |
| Don't re-enable a boost until **every** effect works | The reason they were withdrawn is that they were sold doing nothing. |
| Don't rename the `chapter_token` **column** | UI rename only — a schema rename buys nothing and costs a migration. |
| Don't tune income numbers "by feel" | `balance_verify.py` is the gate (`docs/MVP/README`); if it FAILs, the spec is wrong, not the script. |

## 7. Provenance

- Strategy & rationale: `docs/33_Economy_and_Monetization_Strategy.md` (**decided 2026-10-01**)
- Roadmap slot: `docs/32_Sprint_Roadmap.md` Pass 5 (5.1–5.11) + issue **R11**
- Normative numbers: `docs/MVP/02 §1/§3/§6.4/§6.5/§6.6` and `docs/MVP/01 D2/D7/D10/R8/R9` (updated this pass)
- Payment architecture: `docs/10 §1/§2` (updated this pass)
- Underlying findings: `docs/30` (P0-1/P0-2), `docs/31` (P0-2/P0-3, P1-6/8/9, P2-13)