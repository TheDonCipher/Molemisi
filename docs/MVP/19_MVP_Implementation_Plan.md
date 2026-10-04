# 19 — MVP Implementation Plan

**Owner of record:** Belvedere (royal counsel), for Princess Eugenia.
**Status:** Draft, 2026-10-04 (rev. 2 — second ruling pass folded in). Turns the eleven ✅‑RULED decisions of `08` into executable work, organised by feature/module.
**Recommended lock-down date:** **2026‑10‑25** — contingent on Princess Eugenia's ratification.

> **Authority chain (read this first).** `01`–`06` (normative; `06` decides "is it done?") → `08` (locked decisions, 2026‑10‑04 rulings) → `09`–`18` (build instructions) → `DEVELOPMENT_STATE.md` (as‑built). **Where a lower item disagrees, the higher wins; where a conflict is about *what exists today*, `DEVELOPMENT_STATE.md` wins.** Every number in this plan is a pointer to `02 §6` / `04 §4.2`, never a second source of truth (`09 §4`).
>
> **Rev. 2 changes (2026‑10‑04, second ruling pass).** All eleven decisions are now ruled: **D7 confirmed (no crafting endpoint)**, **D4 refined (farm name = market identity; player name + avatar = Kgotla identity)**, **D10 extended (3‑layer avatar: base gender variant + outfit + always‑on Farmer's Hat; cosmetics sink sufficient; no Madi purchase reads as rank)**, and **two ambient animations added (NPC breathing in the Kgotla; animal breathing on the farm — new item B8)**. The §7 blocker list drops from four open items to two.
>
> **Verified at authoring time (2026‑10‑04):** `git ls-files supabase/migrations/*.sql` = **49**, `git status` shows **0 untracked**; `python scripts/balance_verify.py` prints **PASS**. The `README`/`DEVELOPMENT_STATE` "51 files / 10 untracked" figures are **stale**.

---

## 0.0 Implementation status - build pass of 2026-10-04

Recorded so the plan reflects what is actually built. Gates were **re-run, not trusted**:
`tsc` 0/0 (api + web) - api Jest **34 suites / 498 tests green** - game-config Jest **11 suites / 229 tests green** - `balance_verify.py` **PASS** - `pnpm db:seed --dry-run` **exit 0**.

| Item | Plan ref | Status |
|---|---|---|
| **Seeding pipeline restored** | W0.2 | **DONE.** `apps/api/src/database/seed.ts` restored. Idempotent (upsert on each natural key; `chapters` DO NOTHING so the rollover window is never dragged back), `--dry-run`, env found by walking up so it works from both `src` and `dist`. Materialises `item_definitions`, `market_prices`, `game_config`, `achievements`, `chapters` **from `packages/game-config`**. Root `db:seed` now builds game-config first. |
| **StoreScreen purchase flow** | W6.8 | **ALREADY WIRED - the doc was stale.** `POST /store/purchase` -> `StoreService.purchase()` -> `WalletService` (Pula or Madi by shelf) -> `player_cosmetics`; `useStore().buy()`; `StoreScreen` mounted at `case 'store'`. Verified end-to-end, not rebuilt. |
| **Achievements + honorific ladder** | W5.2-W5.3 / B2 | **DONE.** `game-config/src/achievements.ts` (5 rungs, pure predicates), `achievements` + `player_achievements` tables, `GET /achievements`, `GET /achievements/title`, `POST /achievements/evaluate`. Idempotent on `(player_id, achievement_slug)`. Rank is **never purchasable**. |
| **Events live service** | W5.4-W5.5 / B3 | **DONE.** `game-config/src/events.ts` (one template per chapter), `events` + `event_grants` (UNIQUE = idempotency guard), `GET /events`, `POST /events/:id/claim`. Grants the goods because D7 defers crafting; Chapter Tokens flow only through `ChapterService.addTokens`, so the P8 rollover stays the sole owner of expiry (I13). |
| **3-layer avatar** | W6.4 / B4 | **DONE (code).** `game-config/src/avatar.ts`, `player_avatar` table, `GET /avatar`, `POST /avatar` (create), `PUT /avatar/outfit`, `AvatarSprite` renderer drawing base -> outfit -> **hat last, always**. The base is immutable after creation, enforced server-side; `GET /avatar` returns `ownedOutfits` so the wardrobe renders only what may be equipped. |
| **Global Kgotla chat** | W7 / B1 | **DONE, and UNMODERATED.** `kgotla_messages` table, `GET /chat`, `POST /chat/messages`, rendered by `KgotlaCommunityPanel`. **No profanity filter, no mute/block, no report queue** - withdrawn by ruling (see `08` D5 and §7 below). Anti-flood only. |
| **Kgotla community panel** | W7.4 | **DONE.** One tabbed panel above the council hall: **Talk** (chat), **Events** (claim), **Honours** (ladder + earned title). Only the active tab mounts, so the chat stops polling when off-screen (`20 §5.4`). Author line is the PLAYER identity (D4). |
| **PixelLab manifest** | §0.2 | **UPDATED.** 12 keys added to `assets/manifest.json`: 6 avatar (3 bases, hat, 2 live outfits) + 6 calendar (header, month strip, one note tile **per chapter**). The files are not generated yet, and every consumer degrades gracefully until they land. |
| **New migrations** | - | `20261004000001` achievements, `20261004000002` player_avatar, `20261004000003` events, `20261004000004` kgotla_chat. **53 total.** Each one balanced `BEGIN;...COMMIT;`. **APPLIED LIVE 2026-10-04** (`supabase db push`, confirmed by `supabase migration list`). |

**Not started:** W12 breathing loops (art-led, B12), W10 contextual dev affordances, the real PSP (B10), `mailer_autoconfirm` (B9).

---

## 1. How to read this plan

Molemisi's MVP is **code-complete and the four gates are green** (`DEVELOPMENT_STATE.md`). This plan therefore does three things, not one:

1. **Verify-and-close** the *already-built* work against the rubric (P0–P10 are mostly "confirm and assert", not "write from scratch").
2. **Build the net-new scope** the ruling pass introduced (`08 §0.2` B1–B7) — this is where the real estimate lives.
3. **Wire and harden** the two gaps that are code-complete but not *usable*: the store purchase flow and the Botho automation persistence (`DEVELOPMENT_STATE.md` §Current objective).

**Reading order for a coding agent:** `09 §4` (config canon) + `09 §5` (scope fence) → `10` (module boundaries) → this plan's module workstreams (§4) → `17 §5` per‑phase gates → `18` the go‑live runbook.

**Notation.**
- **RULED** = decided by Princess Eugenia, 2026‑10‑04, no longer needs sign‑off (`08 §0.1`).
- **✅ 2nd pass** = decided in the 2026‑10‑04 second ruling pass (D1, D4, D10 extension, breathing).
- **[DISCRETION]** = a value the specs left open; tagged in `08`, needs a call.
- **🔶** = depends on an unresolved sign‑off (§7).
- W‑numbers (`W1…`) are workstreams; tasks are `Wn.n`.

---

## 2. Scope boundaries (the fence)

### 2.1 In scope for v1

Farm · Kgotla · Bushveld · **Co‑op Market only** · Economy/wallets · Auth · **avatar + cosmetics** · **Events (live service)** · **achievements** · **calendar education UI** · **World Tree asset** · **global Kgotla chat** · farm naming. Closed loop: **no Madi outflow**.

### 2.2 Deferred / excluded (do not build — a build of any of these means the brief was misread)

| Deferred | Ruling | Returns |
|---|---|---|
| Crafting & cooking — **product UI *and* endpoint exposure** | D7 RULED — MVP farming‑only | v1.1 (recipe tables stay seeded as spec‑of‑record, `02 §6.3`) |
| Exchange (P2P), withdrawals, KYC | v1 closed loop (`01 D12`); gated B1 legal + B2 PSP | v1.1 — P11–P14 |
| Wildlife raids | ruling 2026‑09‑11 | post‑launch, same commit as the raid tick |
| Boosts (Pula Stone, Ancestral Ward, Breath of the Land) | cut from the catalogue entirely (`docs/34 §3.3`) | when every effect works |
| Soil degradation | D3 RULED | not planned |
| Voice acting | D11 RULED | "later versions" |
| Level / XP system | C12 | never |
| `Special` inventory category | R3 | never |
| **Kgotla renaming** | D4 ✅ (farm name only) | — |
| 4th Bushveld scene *content* | `01 §6` | post‑MVP (slot + gate exist) |
| Next.js `/api` proxy | documented deviation | optional, P0‑nice‑to‑have |

### 2.3 Scope ambiguities needing confirmation

1. **🔶 D7 — does *any* crafting endpoint ship?** Recommended: **no player‑facing route at all**; keep the code behind `DevGuard` or omit. This is the single biggest scope cut and needs explicit sign‑off (`08 §7` Q1).
2. **🔶 Avatar base variants** — how many `avatar_base` ship in MVP (recommend 2–3 Setswana attire bases) (`08 §10` Q2, `15 §4.1`).
3. **🔶 Farm name vs village name** — D4 gives the *farm* a name; confirm we do **not** also allow a Kgotla/village rename (`08 §4` Q1).
4. **Second cosmetic sink** — season stamps currently have one sink (25‑stamp souvenir). Confirm that is sufficient or add a second (`08 §6` Q2, `37` R‑C5).
5. **Cosmetics as Guild/status benefit** — keep status earned‑only; confirm no Madi purchase reads as rank (`08 §5` Q4).

---

## 3. Decision → workstream map (the nine rulings, operationalised)

D1–D11 are **all ruled** as of the 2026‑10‑04 second pass. "Net‑new?" flags the `08 §0.2` build items (plus **B8** for the two ambient animations) — **these are the estimate**.

| # | Ruling | Must be true in code/data | Owning systems | Depends on | Verified by | Net‑new? |
|---|---|---|---|---|---|---|
| **D1** | Animations: instant feedback + state change + reward‑pop; **no time‑compressed loop** for async; craft FX deferred with D7; **+ ambient breathing loops (see B8)** | Tap feedback, building CONSTRUCT→ACTIVE→MAINTENANCE→DISABLED indicators, kraal feed bounce/hearts, `+💰` float + coin SFX on sale with 5% tax shown **before** confirm; **NPC + animal idle breathing** | `apps/web` screens; `22 §4.5/§4.6/§12.2` | B8 art | `06` P10 walkthrough (feel, low‑end); reduced‑motion path disables breathing | **B8 (breathing)** |
| **D2** | Lore: Sesana + World Tree + educational spine | World Tree sprite stage 0→3 tied to a **community‑restoration meter** (Botho + Council Projects); setting copy; four chapter verbs; cultural grounding rules | art pipeline + `progression` + `kgotla` | native‑speaker pass; **myth copy approval 🔶** | `06` P10; `Asset_Manifest_MVP.md` §6 | **B5 (World Tree)** |
| **D3** | Ag sim: no soil decay; raids later; biome OK | **No soil‑quality field** (`03 §2`, `06` P3). Land recovery = Journal restoration only (`04 §7`) | `farms`/`water`/`simulation` (already conform) | — | `06` P3 (no soil field), P4 (halts, never kills) | No |
| **D4** | **RULED — farm name only; it is the market (buy/sell) identity; player name + avatar = the Kgotla identity; Kgotla never renamed** | `farms.name` nullable, editable **once**, Setswana+English, **profiled server‑side**, rendered on the **Co‑op Market trade surface** + Farm header + project boards; `profiles.display_name` + `player_avatar` rendered in the **Kgotla** (chat author, NPC dialogue, title) | `farms` + `profile` + `market` + chat | schema add (`11 §3`) | `06` P5/P7; `11 §2.3` | small migration |
| **D5** | Culture: global Kgotla chat + honorific ladder via **achievements** | Chat panel (Setswana+English, profanity filter, rate limit, mute/block, report); `achievements` + `player_achievements`; 5 rungs; titles display‑only | new chat module; `kgotla`; `monetisation` | D2 (status meaning); moderation infra | `06` P5; `15 §5` | **B1 (chat), B2 (achievements)** |
| **D6** | Bupi/Borotho Kgotla demand **via Events**; **Event grants flour/bread** (no crafting) | `events` + `event_grants`; grant idempotency; Kgotla turn‑in → chapter tokens | new Events service; `kgotla`; `inventory` | D8 (calendar) | `06` P8/I13; `14 §9` | **B3 (Events)** |
| **D7** | **✅ RULED — DEFER cooking/crafting; MVP farming‑only; NO crafting endpoint exposed** | No crafting UI; **no player‑facing crafting route** (code stays behind `DevGuard` or is omitted); recipe data seeded only as v1.1 spec‑of‑record | `crafting` (gated), `apps/web` | — | `09 §5`; `06` P3 recipe rows still close horizontally (kept v1.1) | No (a **cut**, now confirmed) |
| **D8** | Calendar: keep "Sekala sa…"; year‑loop simulatable; calendar education UI; Events live service | 12 Setswana months; 4 chapters at real 1 Nov/1 Feb/1 May/1 Aug 00:00 UTC+2; Almanac teaches months+chapters+"why it matters"; `runSimulation(input.now)` advances a full year in ≤24 h steps | `chapters`, `simulation/engine`, `apps/web` Almanac | D9 (date‑jump); **9 missing month notes 🔶** | `06` P8; `14 §8`; `35` V‑5 | **B6 (calendar UI)** |
| **D9** | Dev: **contextual in‑game** affordances, not a `/dev` wall | Dev‑only controls layered on real screens: calendar long‑press → date‑jump; Farm → spawn/reset; Kgotla → quest force‑complete; progression sim; corrupt‑state overlay | `dev` module; each screen | D8; **throwaway DB default** | `06` P8/I13 (rollover without waiting); `18 §4` hazard | extends dev tooling |
| **D10** | **✅ RULED — farm+avatar only; expandable SKUs; 3‑layer avatar (base gender variant + outfit + always‑on Farmer's Hat); sink sufficient; no Madi purchase reads as rank** | `cosmetic_skus` data manifest (5 slots: hut/kraal/frame/livestock/outfit); Market (Pula) + Festival (Madi) shelves with **same‑slot cousins**; `player_avatar(base_key, equipped_outfit)`; **hat is a fixed non‑cosmetic layer**; **no Kgotla/Bushveld slot**; rank comes only from earned markers | `monetisation`, `store`, `apps/web` Store | D5 (earned tier) | `15 §9`; `06` P9 | **B4 (avatar), B7 (SKUs)** |
| **D11** | **DEFER all voice** | No VO assets; text‑only; Setswana/English toggle | `apps/web` Settings | — | `06` P10; `24 §54` | No (a **cut**) |

> **The estimate lives in B1–B8.** D7 and D11 *reduce* scope; the other nine rulings *add* it; **B8 is the newest addition**. NPC art is **not** a gap — all five canonical sprites already exist (`08` correction of record).

---

## 4. Implementation workstreams

Each workstream lists: **rulings covered · doc mapping (`09` set + normative) · tasks in execution order · document updates · verification**. Sequenced per `18 §2` (P0 → P1 → P2 → P3 → P4 → P7/P5 → P6 → P8 → P9 → P10).

---

### W0 — Foundation & gates (P0–P2) — *do first; everything hangs on it*

**Rulings:** none directly; prerequisite for all. **Docs:** `10 §2`, `11 §4`, `13 §3`, `17 §2`, `18 §2–§3`.

**Tasks (order):**
1. **W0.1** Verify the schema of record: `git ls-files supabase/migrations/*.sql | wc -l` = **49**; `git status --porcelain supabase/migrations/` empty; `supabase migration list --linked` → *every* row shows a Remote timestamp. ✅ *(already confirmed 2026‑10‑04)*.
2. **W0.2** **Fix or remove `pnpm db:seed`** — root delegates to a non‑existent `src/database/seed.ts` (`11 §4.5`). Config *cannot* materialise without it. This is the #1 blocker for P1.
3. **W0.3** Confirm P0 items: `POST /auth/logout` wired to Settings; Next rewrite `/api/*`→`:3001` (or accept CORS); **`AdminGuard` on both `PUT /config`; non‑admin gets 403 on a direct call** (sec‑06 closed, re‑assert); signup→farm→sell→logout→login has no dead end.
4. **W0.4** Re‑run the real gates (do **not** trust "gates green"): `tsc --noEmit -p apps/api` = 0 (**HEAD was not 0 before the remediation pass**, `16 §9`); `tsc -p apps/web` = 0; `cd apps/api && node node_modules/jest/bin/jest.js --runInBand` green; `python scripts/balance_verify.py` **PASS** ✅.
5. **W0.5** P2 wallet reconciliation: REC‑1 `sum(old) == sum(player_wallets.pula_balance)`; REC‑2 old Kgotla standing migrated into `botho_points` and the old column **deleted** (no second counter, I10).

**Doc updates:** `README`/`DEVELOPMENT_STATE` — strike the stale "51 files/10 untracked" (already corrected in `11 §1`, `18 §3.1`; finish the job in `README`/`DEVELOPMENT_STATE`).

**Verification (`06` P0–P2):** logout/signup loop; 403 on non‑admin `PUT /config`; reconciliation passes; ledger append‑only with nullable currency accepting `'madi'`; **no P2P Pula**; **no withdrawal endpoint** (I15).

---

### W1 — Economy, config canon & balance gate (P1)

**Rulings:** underpins all. **Docs:** `13` (whole), `09 §4` (config canon), `11 §4.5`, `06` P1/§5.

**Tasks:**
1. **W1.1** Every value in `02 §6` present in **`packages/game-config/`** and seeded from there: `crops.ts`, `items.ts`, `economy.ts`, `buildings.ts`, `livestock.ts`, `chapters.ts`, `bushveld.ts`, `store.ts`, `almanac.ts`, `botswanaTime.ts`. **Application code contains no numeric literal from `02 §6`.**
2. **W1.2** Confirm crop table = `02 §6.1` exactly (sorghum P3 · millet P4 · maize P5 · cowpeas P6 · tomatoes P10 · watermelon P11 · groundnuts P11 · sesame P15 · pepper P17 · herbs P25 · morula P46 — **not** the legacy P15/P20/P40).
3. **W1.3** Dead‑zone rule: **0 crops with growth in (24 h, 40 h)**; every crop 1‑day (16–24 h) or 2‑day (40–48 h).
4. **W1.4** Seed calendar seeded: six seeds/chapter; **out‑of‑season seed is not purchasable**; every seed exposes a **1–3 drop thirst rating**.
5. **W1.5** Enum hygiene: `DIPHOLOGOLO` (not DIPHOLOFOLO); `setena` (not setene); **no `Special`** category. Delete any `unlockLevel`/`XP_REWARDS`/`STARTING_ENERGY`/`calculateLevelXpRequired` remnant (C12).
6. **W1.6** Wire `scripts/balance_verify.py` into **CI as a required gate**.

**Doc updates:** fix the Bupi millet count in `35 §4.2` (3 → 4; `02 §6.3` wins) — a v1.1 spec correction owed now.

**Verification (`06` P1 + §5):** gate **PASS** against the **seeded config** at P10; second `db:seed` is a **no‑op**; no numeric literal in app code.

---

### W2 — Farm, water & ag simulation (P4) — D3

**Rulings:** **D3** (no soil decay; raids later). **Docs:** `14 §4` (water‑stress), `12 §4`, `11 §2.3`.

**Tasks:**
1. **W2.1** Confirm **empty tank halts** growth (clock stops; crop never dies) and refill **resumes from frozen progress** (pure `advanceCropGrowth`, `14 §4`).
2. **W2.2** Water charged **only while `GROWING`** — never while `READY` (F5). P1.00/unit, tank 60, full refill P60; per‑chapter multiplier by `rainCoverage`.
3. **W2.3** Rain/storm credits the tank (`rainRatePerHour` 2, `stormRatePerHour` 5, capped at capacity).
4. **W2.4** **Maintenance** falls due on a 30‑day bill; `warningLeadHours: 24`; creates real demand for a crafted material (C21). Building wear window **UNCAPPED**.
5. **W2.5** Land ladder **4 → 8 → 12 → 20** at `02 §6.5` costs; `LAND_LADDER_TOTAL = 30,200`; no rung bounces past ~60 d marginal payback.
6. **W2.6** Assert **no soil‑quality field exists** (D3) — land recovery is Journal art only.
7. **W2.7** *(D1)* Livestock feeding: one tap feeds the whole kraal; bounce + 2–3 hearts (`22 §4.5`). Building **maintenance repair flourish** on bill payment (1.0 s, [DISCRETION] low‑end budget).

**Doc updates:** `22` — add the craft‑timer reference (2–6 h) so animators don't assume minutes (relevant when D7 un‑defers); record the new maintenance flourish.

**Verification (`06` P4):** tank halt/resume; never kills; rain credits; **water only while growing**; 20‑plot thirsty farm drains in <1 day; maintenance demand; land ladder. *(Wildlife raid criterion is **STRUCK from v1**.)*

---

### W3 — Market (Co‑op only) (P7) — D7 (no crafted/processed in v1)

**Rulings:** **D7** removes crafted goods; **I8** (5% tax + band). **Docs:** `12 §7`, `13 §5/§8`, `10 §4.2`.

**Tasks:**
1. **W3.1** Sell path: server resolves price from `market_prices` × band; **client price ignored** (fuzz‑tested); `inventory_take` removes atomically; tax `round(gross × 0.05)`; `WalletService.credit(...,'pula','coop_sale')`; **one transaction**.
2. **W3.2** Band split by good type: **raw/foraged 0.5×–2.0×**, **crafted/processed ±10%**. In MVP the crafted half is dormant (no crafted sales), but the code path must stay correct for v1.1.
3. **W3.3** Seeds **not sellable**; seed stock **rotates by season**.
4. **W3.4** *(D1)* Co‑op sell shows the **5% tax line before confirm**; on confirm `+{amount} 💰` float + coin SFX (`22 §12.2`).
5. **W3.5** *(D4)* The **farm name is the trade identity**: the Co‑op buy/sell surface renders the **farm name** (not the player name) for both counterparties; the market quote/receipt echoes it. Read from `farms.name`, server‑profiled.

**Verification (`06` P7):** tax server‑side on every path; client price rejected; raw moves across the band; seed rotation; **the market shows the farm name, never the player name**. *(Crafted‑±10% assertion becomes live at v1.1.)*

---

### W4 — Kgotla, Botho & Letsema (P5) — D4, D5 (partial), D1

**Rulings:** **D4** (farm name, Kgotla fixed), **D5** (ladder lives here), **D1** (feeding feedback). **Docs:** `12 §8`, `13 §6/§10`, `11 §2.6`.

**Tasks:**
1. **W4.1** `GET /progression` returns exactly `{ pula, botho:{current,thresholds,next}, journal:{pagesComplete,totalPages} }`; **no Level/XP reads** anywhere.
2. **W4.2** Botho single canonical number on `player_wallets.botho_points` (I10); accrual routing through `botho_credit_capped` (50/day, UTC+2); **manual acts only**.
3. **W4.3** **Letsema** double‑gated server‑side: rejected below Botho **500** *and* within **7 days**; completes every ready plot in one call.
4. **W4.4** Thresholds enforced **server‑side** (I9): Bupi 100 · Deep Bushveld + Auto‑Feeder 300 · Letsema + Auto‑Helper 500. Direct API call below threshold fails (not merely UI‑hidden).
5. **W4.5** Elder's tip = **rules table** (tank/weather/Botho/season), not static text; proverb responds to recent player action (`13 §10`).
6. **W4.6** Deep Bushveld returns **`coming_soon`** at Botho ≥ 300 (not a 403).
7. **W4.7** *(D4)* `farms.name` — **editable once**, Setswana+English, **profiled server‑side**, shown on the Farm header + Kgotla community‑project leaderboards **and on the Co‑op Market trade surface (W3.5)**. Kgotla name stays **"Kgotla"** — no rename, no village‑name variant.
8. **W4.8** *(D5)* Kgotla shows the player's current **honorific title** (read‑only, from achievements).
9. **W4.9** *(D4 — identity split)* **Kgotla identity = player name + avatar.** The chat author line, NPC dialogue attribution and title display read `profiles.display_name` + `player_avatar`; the **farm name never appears in the Kgotla** and the **player name never appears at the Market**. Add a single shared `identityFor(surface)` helper so the two are never swapped by accident.

**Doc updates:** `08_API_Specification.md §15` is **stale** (one generic NPC) — correct to the five‑NPC cast (`08 §11` Q2, `09 §7`).

**Verification (`06` P5):** `/progression` shape; Letsema double‑gate + one‑call completion; Botho capped/day; Elder tip reactive; `coming_soon` at ≥300; farm‑name filter server‑side and **rendered only on economic surfaces**; player name/avatar **rendered only on social surfaces**; title display‑only.

---

### W5 — Events live service & achievements (B2, B3) — *new scope; D6, D8, D5*

**Rulings:** **D6** (Events create Bupi/Borotho demand; the Event **grants** the goods), **D8** (Events run on the calendar), **D5** (achievements gate the ladder). **Docs:** `14 §9`, `11 §3`, `15 §5`, `12 §10`.

**Tasks (order):**
1. **W5.1** Migrations (additive, one balanced `BEGIN;…COMMIT;` each — `11 §4.2`): `achievements`, `player_achievements`, `events`, `event_grants` (`11 §3`, `15 §5.1`, `14 §9`).
2. **W5.2** **Achievements catalog** (data‑driven): each `slug → rung + milestone JSONB`, machine‑checkable. Rungs: **Molemi → Molemi‑Morui → Moagi → Motsadi → Mokgosi** — attained, never purchased; **display‑only** (no advantage). Botho thresholds *inform* the milestone; the *rung* is the achievement.
3. **W5.3** Achievement attainment service: evaluate milestones on state change (crops planted, buildings raised, Charges completed, Events won), idempotent write to `player_achievements`.
4. **W5.4** **Events service**: seeded on the calendar (`starts_at`/`ends_at` within a chapter); `grant(playerId,eventId)` asserts active + not‑already‑claimed → `InventoryService.addItem(bupi|borotho)` → insert `event_grant` (**idempotency guard**, `14 §9`).
5. **W5.5** **Kgotla turn‑in**: award **chapter tokens by achievement** (not purchase); tokens **expire to zero** at chapter end (I13).
6. **W5.6** *(D10 linkage)* `outfit_mokgosi_cloak` = top‑rung **earned** SKU (`shelf='earned'`, `unlock_condition {achievement:'mokgosi'}`); grants at attainment, **403 `not_purchasable`** if bought.
7. **W5.7** *(D1)* Event reward‑pop feedback (instant tap → state change → reward pop; **no waiting loop**).

**Doc updates:** new service section in `12` (Events routes); `14 §9` is the contract of record.

**Verification (`06` P8 + I13):** Event grant idempotent (second claim = no‑op); turn‑in awards tokens by achievement; rollover zeroes tokens **exactly once**; ladder rungs attain in order; earned SKU not purchasable.

---

### W6 — Cosmetics, store & avatar (B4, B7) — D10, D5

**Rulings:** **D10** (farm+avatar only; expandable SKUs; **3‑layer avatar**), **D5** (Botho‑tier earned cosmetics). **Confirmed 2nd pass:** avatar at creation = **gender variant + outfit**, **always wearing the signature Farmer's Hat**; **cosmetics sink is sufficient** (no second sink); **no Madi purchase reads as rank**. **Docs:** `15` (whole), `12 §11`, `11 §2.9/§3`.

**Tasks:**
1. **W6.1** Migration `cosmetic_skus` (`11 §3`) — data manifest: `slug, slot, shelf, price, currency, asset_key, cousin_slug, is_earned, unlock_condition, active`.
2. **W6.2** Slot vocabulary **exactly** `{hut, kraal, frame, livestock, outfit}` — **no Kgotla/Bushveld slot exists** (`15 §3.2`). `frame` = the player's own **farm** banner; the **hat is not a slot** (it is a fixed layer, W6.4).
3. **W6.3** Two shelves: **Market (Pula P200/P600/P1,500)** and **Festival (Madi M40/M80/M150/M300)**; **every Festival SKU has a same‑slot Market cousin** (`cousin_slug` non‑null).
4. **W6.4** **Avatar (B4) — 3 layers.** `player_avatar(base_key, equipped_outfit)`, rendered as: **`avatar_base` (gender/attire variant, chosen once at creation)** → **`avatar_outfit` (cosmetic overlay)** → **`avatar_hat` (the signature Farmer's Hat, always drawn on top, non‑removable, not purchasable, not a SKU)**. All three share the 32×64 footprint/anchor. The store swaps **only** the outfit layer; the base is chosen at creation and the hat never changes.
5. **W6.5** `POST /store/purchase` — server reads `price`/`currency` from the SKU row (never client), debits via `WalletService`, inserts `player_cosmetics` (optional preview‑before‑buy sprite swap).
6. **W6.6** **Village Pass** (M50/mo): helper (waters+collects) · one festival outfit/month · **+50% storage stacking**. **Wire the storage bonus** to the tier check — `effectiveSlotCap(tier, isGuildSubscriber)` exists but the subscription‑state read is missing (`15 §6`, `08 §10` Q3).
7. **W6.7** **Botho‑tier cosmetics** = earned, excluded from both shelves.
8. **W6.8** **Wire the StoreScreen purchase flow end‑to‑end** against the stub provider (`DEVELOPMENT_STATE` §Current objective; P10 depends on this).
9. **W6.9** *(D1)* Store preview = 2D sprite swap (cheap on low‑end; no 3D).
10. **W6.10** *(D10 — status guard)* **Rank is never purchasable.** Assert that no Festival/Market SKU is displayed as, or maps to, a rank/honorific marker; the honorific ladder (D5) and Botho rank are the **only** status signals. The `outfit_mokgosi_cloak` is earned‑only.
11. **W6.11** *(D10 — sink sufficiency)* No second sink is added; the **25‑stamp season souvenir** stands as the sole season‑stamp sink, and cosmetics + the Letsema fund remain the unbounded Pula sinks (F7).

**Verification (`15 §9`):** adding a cosmetic = **data only**; Festival cousin non‑null; earned SKU 403 on purchase; price from SKU; **avatar swaps the outfit layer only, base + hat never change**; **no bought cosmetic reads as rank**; a maxed‑land player can spend Pula and watch the balance fall (`06` P9 — the **unbounded sink** is live).

---

### W12 — Ambient animation: NPC & animal breathing (B8) — *new scope; D1*

**Rulings:** **D1 (second pass RULED)** — NPC breathing in the Kgotla; animal breathing on the farm. Always‑on idle loops. **Docs:** `22 §4.5` (animal feed feedback), `22 §11.5` (accessibility toggles), `Asset_Manifest_MVP.md §2/§3/§4`.

**Tasks:**
1. **W12.1** **NPC breathing (Kgotla)** — add an **always‑on idle breathing loop** (~3 s period, 2–4 px vertical/scale) to all five canonical NPC sprites (`elder_neo`, `mama_naledi`, `oupa_kabelo`, `refilwe`, `thabo`). It is a *presence* cue; it never blocks input and never competes with a dialogue tap.
2. **W12.2** **Animal breathing (Farm)** — add the same idle loop to every livestock sprite, **layered under** the existing `22 §4.5` feeding bounce/hearts so feed feedback still reads on top.
3. **W12.3** **Art pipeline** — generate/author the idle frames (new entries in `Asset_Manifest_MVP.md` §3/§4); keep frame counts low for low‑end devices. *These frames do not currently exist — NPC sprites are single‑frame today.*
4. **W12.4** **Accessibility** — breathing is a motion effect and **must switch off** when the reduced‑motion / Particles‑OFF profile is active (`22 §11.5`), consistent with the existing accessibility standing rule.
5. **W12.5** **Scope guard** — breathing is the **only** ambient idle loop in v1; do **not** extend it to crops, buildings or scene props without a new ruling.

**Verification:** both loops run on the Kgotla and Farm screens; they stop under the reduced‑motion profile; feed bounce/hearts still read above the idle; frame budget does not regress the low‑end 3G smoke test (`06` P10).

---

### W7 — Global Kgotla chat (B1) — *new scope; D5*

**Rulings:** **D5** — global chat is **enabled** in the Kgotla; **moderation is a launch requirement, not a nice‑to‑have**. **Docs:** `08 §5`, `20 §5.4` (no chatty polling), `13_Security`.

**Tasks:**
1. **W7.1** Transport decision (Supabase Realtime vs WebSocket) + schema (channel, message, rate window). *Moderation transport is the open engineering/trust item (`08 §5` Q2).*
2. **W7.2** **Profanity filter** — Setswana **and** English wordlists.
3. **W7.3** **Rate limit** per player; **mute / block**; **report path** with a review surface.
4. **W7.4** Chat panel framed as a peaceful community space ("all words of the kgotla are sweet"); Setswana + English.
5. **W7.5** Cost discipline: batch/cache; **no chatty polling** (target audience is mobile data).

**Doc updates:** new chat panel section (`12` / `22`); T&S note.

**Verification:** filter blocks listed terms (both languages); rate limit holds; mute/block/report function; a report reaches a reviewer. *(Trust‑and‑safety pass signed off before launch.)*

---

### W8 — Calendar, Almanac education UI & year‑loop (B6) — D8, D2

**Rulings:** **D8** (keep "Sekala sa…"; simulatable; education UI; Events on calendar), **D2** (four chapter verbs). **Docs:** `14 §8`, `13 §4.1`, `11 §2.8`.

**Tasks:**
1. **W8.1** Four chapters on **real dates**: 1 Nov/1 Feb/1 May/1 Aug, boundaries **00:00 Africa/Gaborone (UTC+2)**; **display names keep the normative `Sekala sa …` form** (`04 §9.2` wins).
2. **W8.2** Twelve Setswana months configured; chapter frame abstracted over them (game calendar == real 2026/2027 dates).
3. **W8.3** **Year‑loop simulatable**: `runSimulation(input.now,input.seed)` advances a full year in **≤24 h steps** (`MAX_OFFLINE_HOURS=24`). No new calendar engine needed.
4. **W8.4** **Calendar education UI (B6)**: Almanac shows current Setswana month, active chapter + character, **next rollover date**, and a one‑line "why it matters" (e.g. Moriti: "water is the whole game — keep the Jojo full"). Illustrated with calendar UI assets.
5. **W8.5** **🔶 Dependency:** nine of twelve month *notes* are not yet supplied (`35` V‑5) — **B6 cannot be rich without them**. Schedule the copy.
6. **W8.6** **World events**: Mophane windows = real months **{4,12}**, **decoupled from the season clock** (`14 §6`); Letsema declaration beat on/after 1 Oct (cosmetic); Reading of Names (1 Nov) flagged as **invented ritual**, not tradition.

**Doc updates:** correct `35`/`37` chapter‑name conflict to `04 §9.2` (`08 §8` Q1 — resolved).

**Verification (`06` P8):** four chapters on real dates; Mophane loot changes **only** in April/December with a **mocked clock**; rollover zeroes tokens once; Almanac reflects live month/chapter/rollover.

---

### W9 — Bushveld & Field Journal (P6) — D2 (World Tree), D3 (biome)

**Rulings:** **D2** (World Tree centerpiece; Bushveld is the margin that restores the village), **D3** (biome archetypes; no real‑location 1:1). **Docs:** `14 §6/§10`, `11 §2.7`, `12 §9`, `04 §10`.

**Tasks:**
1. **W9.1** Four scenes seeded (3 from start + Deep Bushveld Botho‑300‑gated), 5–8 hotspots each; the Deep Bushveld row present with **zero** hotspots until unlocked.
2. **W9.2** Kagiso **computed on read** from `kagiso_updated_at` (no cron); bounds `0 ≤ kagiso ≤ 6` under replay + concurrency (I14).
3. **W9.3** Two distinct 409 reasons: **`scene_not_settled`** (below cost) vs **`hotspot_resting`** (within 60 min). Client must tell them apart.
4. **W9.4** Rarity weights scale with Kagiso; **exactly one Sparkle system‑wide per day**; Sparkle + seasonal badges **coexist**.
5. **W9.5** Seasonal loot: `Setlhare sa Phane` changes loot **only** when real month ∈ `active_months = {4,12}`; **decoupled** from the farm season clock (mocked‑clock test).
6. **W9.6** Journal: first‑time find writes `field_journal_entries`; **repeats don't duplicate**; a **rare find never creates an inventory row** (C4/R3).
7. **W9.7** **Restoration**: completing a scene's page **swaps its background asset** at 0.4 / 0.7 / 1.0 (`restoration_thresholds`); resting hotspots **render resting**, not removed.
8. **W9.8** Touch targets **≥ 48×48 dp**.
9. **W9.9** *(D2)* **World Tree (B5)**: stage 0→3 sprite + a **community‑restoration meter** (Botho + completed Council Projects), distinct from the Bushveld scene stages.

**Doc updates:** `04 §4` is the tuning owner; **if live telemetry shows gathering is optimal, fix `04 §4` or farm income — never the gate script** (`13 §9`).

**Verification (`06` P6):** both 409 reasons; Kagiso bounded; one Sparkle/day; coexistence; mocked‑clock Mophane; journal write‑once; restoration swap; rendering; touch targets.

---

### W10 — Dev tooling, contextual in‑game (B‑dev) — D9, D8

**Rulings:** **D9** — dev affordances placed **elegantly in‑game**, not a walled `/dev` panel. **Docs:** `12 §12`, `14 §8/§11`, `18 §4`, `09 §7` hazard 2.

**Tasks:**
> **W10.1-W10.3 and W10.5 LANDED 2026-10-04.** Date-jump (long-press the Almanac chapter header), the Farm spawn
> gear, the Kgotla force-complete gear and the seven-class state panel are implemented and `DevGuard`-gated; the
> client renders `null` for non-devs. The **live-project guard** (`isLiveProjectUrl`, pure and unit-tested) refuses
> every mutating route unless `DEV_TOOLS_ALLOW_LIVE=true`, and the UI disables the buttons behind a loud banner.
> Spawn uses `InventoryService.addItem` (the sanctioned inverse of `inventory_take`); the date-jump drives
> `ChapterService.rolloverChapters`, which zeroes Chapter Tokens exactly once - **I13 validated without waiting a
> season**. **W10.4 (progression sim) and farm reset inside the panel remain open.**

1. **W10.1** **Calendar date‑jump**: long‑press any date / chapter header in the (rewritten) calendar UI → dev date‑picker (**DevGuard‑gated**) → sets `input.now` → re‑derives chapter/season/Kagiso/chapters. Validates **I13** rollover without waiting a season.
2. **W10.2** **Farm spawn/reset**: dev affordance on the Farm screen (long‑press avatar / small gear) → `POST /dev/inventory/grant` (**uses the sanctioned inverse of `inventory_take`**) and `reset‑farm`.
3. **W10.3** **Kgotla quest test**: dev affordance validates NPC talk/quest endpoints and **force‑completes a Charge**.
4. **W10.4** **Progression sim**: drives plant/harvest/quest in a loop against the engine, asserting `GET /progression` milestones.
5. **W10.5** **State panel**: the seven corruption classes (`14 §11`) surfaced on the relevant screen, each with its `planRecovery()` action.
6. **W10.6** **Default to a throwaway DB** — the dev overlay must **never** point at the live project (`09 §7` hazard 2, `17 §8`); enforce in the UI, not just by convention.

**Doc updates:** `18`/`09` gain the in‑game dev affordances (they were `/dev`‑only).

**Verification:** date‑jump re‑derives chapter/season and zeroes tokens (I13); spawn uses `inventory_take`'s inverse; force‑complete reaches both success and failure endpoints; corrupt‑state overlay names each action; live‑project guard blocks the default.

---

### W11 — Monetisation, payments & launch readiness (P9–P10)

**Rulings:** D10 (store), D7 (no boosts). **Docs:** `13 §11`, `12 §11`, `18 §5–§7`.

**Tasks:**
1. **W11.1** `GET /payments/store` = packs + Village Pass at `02 §6.6` values; **boosts absent from both storefronts and the catalogue entirely** (asserted by `store.spec.ts`, both directions).
2. **W11.2** Top‑up **credits only on webhook**; `provider_tx_id UNIQUE` is the idempotency guard (I3); P100 pack credits exactly 105 once.
3. **W11.3** **Daily cap P500 in UTC+2** (not server‑local) — boundary + one thebe past (C5/I12).
4. **W11.4** Lapsed subscription **immediately** stops auto‑collect, storage bonus and cosmetics; daily cron flips lapsed; **weekly cron must not grant a cut SKU** (a job granting a boost is a bug, `18 §5.2`).
5. **W11.5** **Auto‑Collector leaves Botho untouched** (I4) — dedicated **CI test** on any Auto‑Collector/Botho change.
6. **W11.6** **≥1 unbounded Pula sink live** (cosmetics, the Letsema fund, or both, F7); Letsema‑fund donations do **not** exceed the Botho daily cap (I4).
7. **W11.7** **Wire a real PSP** behind `PaymentProvider` (no economy change); `PaymentsModule` **throws at boot in production if the stub resolves**; `PAYMENT_WEBHOOK_SECRET` set ⇒ unsigned webhooks rejected (H3).
8. **W11.8** P10 manual: full walkthrough desktop + mobile; PWA installs Android + iOS (no Play Store); low‑end 3G smoke.

**Verification (`06` P9–P10):** store has no boosts; webhook‑only credit; UTC+2 cap; lapsed sub drops benefits; Auto‑Collector Botho‑neutral; run the gate **against the seeded config**; **I2, I7–I10, I13–I15 in production configuration, not only in tests**.

---

## 5. Sequencing & dependencies

```
W0 Foundation ──► W1 Economy/config ──► W2 Farm/water ──► W3 Market
                        │                    │
                        ├──► W4 Kgotla/Botho ┤
                        │                    ├──► W9 Bushveld/Journal
                        ├──► W8 Calendar ────┘
                        │        │
                        │        ├──► W5 Events + Achievements ──► W6 Cosmetics/Store ◄── W4 (ladder)
                        │        │
                        │        └──► W10 Dev date-jump (needs W8)
                        └──► W11 Monetisation ──► P10 launch
                        └──► W7 Chat (parallelisable once W4 exists)
                              W12 Breathing (art-led; runs beside W4 + W2)
```

**Hard constraints inside the chain (`08 §0.1`):**
- **W8 (calendar) precedes W5 (Events) and seed stocking** — chapter tokens, seasonal demand and Events are calendar‑driven.
- **W2 (lore/D2) precedes W4/W7** — why Kgotla & Botho matter comes from the spine.
- **W9 (Kagiso; P6) unlocks the tuning sandbox** (`06 §5.1`) — *build first, then simulate*; do **not** stand up the sandbox before P6 (it would re‑create the three‑sources‑of‑truth bug `balance_verify.py` just removed).
- **W4/W5 (status) precedes W6** — cosmetics signal status, and status is defined by culture/achievements.
- **W7 (chat) is cross‑cutting** — infra + moderation; schedule it but it can run beside W6/W8.
- **W12 (breathing) is art‑led and independent** — it touches the Kgotla and Farm screens but blocks nothing; start the sprite work early so it is not on the critical path at P10.
- **W4.9 (identity split) is load‑bearing for W3.5 and W7** — build the `identityFor(surface)` helper once, then both surfaces read from it.

**Two hard blockers inside the ruling chain (`08 §0.1`):** 7 (recipes) is **deferred** — its Bupi/Borotho demand is satisfied by **W5 Events**, not crafting. 11 (VO) is **deferred**.

---

## 6. Critical operational constraints (do not violate)

1. **49 migrations — all committed, pushed, live.** Verify with `supabase migration list --linked`; **a blank Remote column = not applied.** New tables ship as **additive** migrations, one **balanced `BEGIN;…COMMIT;`** per file (unbalanced ⇒ `db push` prints "Finished" yet rolls back silently).
2. **Config canon.** Every number lives in **`packages/game-config/`** and is seeded from there; **application code contains no numeric literal from `02 §6`** (`06` P1). Seeding is **idempotent**.
3. **The balance gate.** `python scripts/balance_verify.py` — **fix the spec, never the script.** Run it on every phase touching a number; at P10 run it against **seeded config**.
4. **The 15 hard invariants** (`06 §2`) each need an **automated test** (`17 §3`): I1–I15. Highlights: **I2** no P2P Pula; **I3** webhook once; **I4** Auto‑Collector never increments Botho (**CI‑enforced**); **I7** server authority (fuzz); **I8** 5% tax + crafted exemption; **I10** single canonical Botho; **I13** tokens zero at chapter end (idempotent); **I14** Kagiso bounded; **I15** no withdrawal endpoint (**fail closed**).
5. **Currency & cap rules (49 rules live):** **Pula earned‑only, nontransferable**; **Madi spend‑only in v1** (top‑up only; Pula never sold); **chapter tokens expire to zero at chapter end**; **Botho 50/day cap** (manual acts only); **Co‑op 5% tax + 0.5×–2.0× band** (crafted ±10%); **Letsema** = one free instant full‑harvest, Botho ≥ 500, 7‑day cooldown; **Village Pass M50/mo** = helper + monthly festival outfit + **50% stacking storage**. Madi is **1:1 backed by deposits** (I1).
6. **`WalletService.credit/debit` are the only balance writers**; both transactional, each writes one `ledger_entries` row. **`game_ledger_entries` is retired — never write it.** All inventory removals go via **`inventory_take`** (atomic) — never reintroduce a select‑then‑update (that was C3).
7. **Standing hazards** (`09 §7`): run API Jest **from `apps/api`**; **never point the simulator/dev‑date‑jump at the live project**; `pnpm` is broken under Git Bash; `COMMENT ON … IS 'a' 'b'` (never `||`); `is_admin(auth.uid())` in RLS.
8. **Open security findings** still live (`16 §9`): **H1** Botho cap read‑then‑write (verify `botho_credit_capped` applied), **H2** flat 60/min rate limit + no `trust proxy` + in‑memory Map, **H4** Kgotla pool count‑then‑insert, **H5** admin service uses the anon client, **M1** `AdminGuard ≡ DevGuard` (no genuine admin‑only surface). **M8** contracts pay 1.25× vs spec 1.05×, no 3/day accept cap.

---

## 7. Outstanding blockers & sign‑offs (from `08 §13`)

| # | Item | Blocks | Owner | Feeds |
|---|---|---|---|---|
| **B1** | **Princess ratifies the lock‑down date (2026‑10‑25)** | the whole schedule | Princess | W0–W12 |
| ~~B2~~ | ~~🔶 D7 scope~~ — ✅ **RESOLVED 2026‑10‑04 (2nd pass): MVP farming‑only; no crafting endpoint exposed.** | — | — | W3, W11 |
| **B3** | **🔶 D9 placement** — contextual in‑game long‑press patterns agreed with eng | W10 | eng + Princess | W10 |
| ~~**B5a**~~ | ~~Chat moderation sign-off~~ **CLOSED 2026-10-04 by ruling: NO CHAT MODERATION.** The profanity filter, mute/block and report queue were withdrawn before they were built, so no trust-and-safety pass is required. Anti-flood protection remains and is a cost control (`20 §5.4`), not content policy. | — | — | closed |
| ~~**B4**~~ | ~~Calendar month notes: 9 of 12 missing (`35` V-5)~~ **CLOSED 2026-10-04** — the twelve Setswana months are RULED CORRECT, so there is no missing-notes blocker. The calendar education UI reads `SETSWANA_MONTHS` straight from `game-config`. | — | — | closed |
| **B5** | **Native-speaker pass** - proverbs, "Mogolo", totems, ladder titles (month notes are no longer part of this) | all shipped Setswana copy | native speaker | D2/D5/D8/D11 |
| **B6** | **🔶 Myth copy approval** — Sesana/World Tree setting text | D2 copy | Princess | D2 |
| **B7** | **🔶 `08_API §15` corrected** to the five‑NPC cast | doc bug | eng | W4 |
| **B8** | **🔶 Build estimates for B1–B8** enter the sprint plan | the real cost | eng | W5–W8, W12 |
| **B9** | **🔶 `mailer_autoconfirm:false`** — real users cannot sign up | launch | operator | W11/P10 |
| **B10** | **🔶 Stub PSP** + `PAYMENT_WEBHOOK_SECRET` | real top‑ups | eng + PSP | W11.7 |
| **B11** | v1.1 gates: **B1 legal + B2 PSP** (naming/currency/promo budget) | P11–P14 only | Princess + lawyer | post‑v1 |
| **B12** | **🔶 Breathing frames don't exist yet** — NPC/animal sprites are single‑frame; the idle loops are new art | W12 | art pipeline | W12.3 |

> **Ratified at 2026‑10‑04 (all eleven decisions):** D1 ✅ (+ breathing), D2 ✅ (myth copy owed), D3 ✅, **D4 ✅ (farm name = market identity; player name + avatar = Kgotla identity)**, D5 ✅, D6 ✅ (Events grants), **D7 ✅ (no crafting endpoint)**, D8 ✅ (names kept), D9 ✅ (placement form) — *long‑press patterns still to be agreed with eng*, **D10 ✅ (3‑layer avatar: base + outfit + always‑on Farmer's Hat; sink sufficient; no Madi purchase reads as rank)**, D11 ✅ (VO deferred). **Open:** D9 placement detail, the doc bug (B7), the native‑speaker pass (B5), myth copy (B6), and the launch blockers (B9/B10). **CLOSED 2026‑10‑04:** month notes (months are ruled correct) and chat moderation (no moderation shipped).

---

## 8. Lock‑down readiness check — must be true before **2026‑10‑25**

*Contingent on Princess Eugenia's ratification (B1).* This is the "is the realm ready to freeze the design?" gate — distinct from P10 launch readiness.

### 8.1 Design

- [ ] Every ruling in the §3 table has an owner, a workstream, and a **test** — no ruling left "implicit". **All eleven are now ruled** ✅.
- [ ] **D7** scope signed ✅ (no crafting endpoint exposed).
- [ ] **D4** identity split signed ✅ (farm name = market; player name + avatar = Kgotla).
- [ ] **D10** avatar model signed ✅ (3‑layer; hat always on; sink sufficient; no Madi purchase reads as rank).
- [ ] **D9** placement agreed: contextual long‑press patterns (B3).
- [ ] **B8** breathing animations scheduled with the art pipeline (B12) — frames do not exist yet.
- [ ] Scope fence (§2.2) acknowledged by the team — **no crafted UI, no raids, no boosts, no VO, no soil decay, no Kgotla rename, no ambient loop beyond NPC/animal breathing**.
- [ ] Open `[DISCRETION]` calls closed: maintenance flourish budget; **avatar gender‑variant count/naming** (art pass).

### 8.2 Schema & config

- [ ] **49 migrations verified live** — `supabase migration list --linked` shows a Remote timestamp on every row; `git status` clean.
- [ ] **New‑scope tables designed and ordered** (additive batch, `11 §3`): `cosmetic_skus`, `achievements`, `player_achievements`, `events`, `event_grants`, `player_avatar`, **`farms.name`** — each with a unique 14‑digit prefix and one balanced transaction.
- [ ] **Config canon complete**: every `02 §6` value in `packages/game-config/`; `pnpm db:seed` **works and is idempotent** (W0.2).
- [ ] `README`/`DEVELOPMENT_STATE` stale "51 files/10 untracked" corrected.

### 8.3 Test coverage (the 15 invariants → automated)

- [ ] Each of **I1–I15** has a test at the layer that can falsify it (`17 §3`) — CI‑wired.
- [ ] **CI additions live**: `balance_verify.py` required; **I4 dedicated CI**; "no numeric literal" static check; **I15 route assertion**; integration runner with `rootDir` fixed so `apps/api/test/**` executes.
- [ ] `tsc` 0/0 · api Jest green (run **from `apps/api`**) · game‑config · validation — **re‑run, do not trust the claim**.
- [ ] The integration negative matrix (`17 §4.3`) passes: below‑threshold 403, before‑timer 409, replayed webhook once, over‑cap 429 UTC+2, cross‑player 403, mocked‑clock rollover, empty‑tank freeze, `scene_not_settled`, `hotspot_resting`.

### 8.4 P0–P10 acceptance criteria (`06 §4`) — map to lock‑down

| Phase | Lock‑down status |
|---|---|
| **P0** Stabilise | ✅ code‑complete; **`db:seed` is the open item** (W0.2) |
| **P1** Numbers of record | gates PASS; **must be re‑verified against seeded config** once `db:seed` works |
| **P2** Wallet/ledger | ✅ single writer; **REC‑1/REC‑2 to re‑run on a fresh environment** |
| **P3** Inventory/storage/crafting | catalogue + caps done; **recipe rows stay (v1.1)** but **no crafting route exposed** (D7 ✅) |
| **P4** Farm loop | ✅ (raids criterion struck); **+ animal breathing (W12.2)** |
| **P5** Kgotla/pillars | ✅ Botho cap + Letsema; **farm‑name (D4)** + **identity split (W4.9)** + **title display (D5)** + **NPC breathing (W12.1)** are the deltas |
| **P6** Bushveld | ✅ Kagiso/Journal/Sparkle; **World Tree meter (D2)** is the delta |
| **P7** Co‑op | ✅ tax + band; **seasonal seed rotation** asserted; **farm‑name trade surface (D4)** is the delta |
| **P8** Live service | chapters ✅; **Events service + achievements are new** (W5) |
| **P9** Monetisation | store = 2 shelves + Pass, **no boosts**; **store purchase UI must be wired** (W6.8); **no Madi purchase reads as rank** (W6.10) |
| **P10** Launch readiness | full walkthrough + PWA + 3G; **I2/I7–I10/I13–I15 in production config** |

**The honest summary:** code is largely done, and **the lock‑down risk is not the build — it is (a) the un‑wired store flow, (b) the broken `db:seed`, and (c) the net‑new B1–B7 scope**. Freeze the *design* by 2026‑10‑25 once §8.1 and §8.2 are true; the build of B1–B7 can then proceed against a stable spec.

---

## 9. Immediate next actions (for the development team)

1. **W0.2 — fix/remove `db:seed`.** Nothing downstream can verify without it.
2. **W0.4 — re‑run the four gates** and record the true numbers (don't trust "green").
3. **W1.1–W1.5 — confirm the config canon** and the crop table against `02 §6.1`.
4. **W5.1 — author the five additive migrations** (`cosmetic_skus`, `achievements`, `player_achievements`, `events`, `event_grants`) + `farms.name`, on a throwaway project first.
5. **W6.8 — wire the StoreScreen purchase flow** (P10 depends on it).
6. **W10.1 — build the in‑game dev date‑jump** so I13 rollover is testable without waiting a season.
7. **Close §7 blockers** — especially **B3 (D9 placement detail)**, **B4 (month notes)**, **B5 (native‑speaker pass)** and **B12 (breathing frames)**, which gate shipped copy and the new animation art. *D7 is already closed ✅.*
8. **W12.3 — start the breathing sprite work now** (art‑led, blocks nothing, and must not land on the critical path at P10).

*End of `19`. This plan yields to `01`–`06` on every conflict; `06` decides completion. The gate remains `scripts/balance_verify.py` — fix the spec, never the script.*
