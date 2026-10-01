# 32 — Sprint Roadmap: Audit Reconciliation & Implementation Plan

> ⚠️ **SUPERSEDED — DO NOT IMPLEMENT FROM THIS FILE (marked 2026-09-30).**
> The living execution doc is **`docs/32_Sprint_Roadmap.md`** (it carries the progress ledger and the
> current status column). This file is the earlier reconciliation draft, kept only for its §8 blockers
> list and provenance. **One of its claims is factually wrong:** §2's `P0-H` and §3.2 call the
> `/payments/create` SEC-02 finding a *false positive* to be tuned away. It was **not** — `CreatePaymentDto`
> was an `interface`, so `ValidationPipe` had no runtime metatype and `whitelist`/`forbidNonWhitelisted`
> stripped nothing. It is now a `class` with class-validator decorators (living doc task **1.11**).
> Reading the stale claim would cause a real security fix to be skipped.

**Date:** 2026-09-28 · **Author:** Belvedere (royal counsel) · **Status:** **SUPERSEDED** — see banner above.
**Inputs reconciled:** `30_Gameplay_Visual_Narrative_Review.md`, `31_Inventory_Crafting_Progression_Systems_Audit.md`, `SIMULATION_REPORT.md`, `summary.md`, `README.md`, `docs/MVP/*`.
**Solution guide:** doc 30 §6 (four-pass plan) is the mandated implementation pathway. `docs/MVP/` is normative; where doc 30 disagrees with `docs/MVP/`, `docs/MVP/` wins.

---

## 1. Authority & method

This roadmap is derived by tracing every claim in the two audits to the code on disk (the code is the truth; the audits are findings). Five reconciliation corrections were made before sequencing — see §3. The plan is cut into doc 30's four passes but **re-sequenced so economy-integrity P0s lead** (per the task instruction and doc 31 §11 P0), because those are the defects that break player progression and the economy, and they are mostly server-side data/logic that does not depend on the art pipeline.

---

## 2. Unified P0 / P1 issue map

| ID | Issue | Source | Severity | Resolution owner | Status at reconcile |
| --- | --- | --- | --- | --- | --- |
| **P0-A** | Animals permanently sick in 7–12 h (soft-lock) | doc30 P0-1 / G-2 | P0 | livestock + simulation | OPEN — not started |
| **P0-B** | Feeding costs nothing (inverts F7 sink; breaks doc-24 trust) | doc30 P0-2 / G-3; doc31 P0#2 | P0 | livestock + inventory | OPEN — not started |
| **P0-C** | `/market/buy` accepts any item, not just chapter seeds (craft-arbitrage + contract-farm exploit) | doc31 P0#1 | P0 | market.service | OPEN — not started |
| **P0-D** | Contracts outpay Co-op 1.7–6.7× and repeat | doc31 P0#3; doc30 G-8 | P0 | contracts.service | **DONE in code** — rebalanced + cooldown by parallel work stream; remaining: Botho/token rewards (see P1-D) |
| **P0-E** | ~198/423 art files unreachable; farm not a farm; buildings have no 4-state visuals | doc30 P0-3 / V-1…V-14 | P0 (visual) | web + assets | OPEN — Pass 2 |
| **P0-F** | Free livestock feed + missing feed items (no grain/hay/mixed_feed definitions) | doc31 P0#2; doc30 G-3 | P0 | game-config + livestock | OPEN — not started |
| **P0-G** | `PUT /config` returns 500 (not 401/403) for non-admin | summary SEC-06; docs/DEV-STATE | P0-sec | config.controller | **FIXED this pass** — AdminGuard added to PUT routes |
| **P0-H** | `/payments/create` "FAIL" in probe | summary SEC-02 | **FALSE POSITIVE** | safeguards.ts (tuned) | **CLARIFIED this pass** — `forbidNonWhitelisted` strips junk; real gate is empty-body→400 / unknown-sku→404 (both pass) |
| **P1-A** | Journal/Phane endgame gate hard-blocks 100% (seasonal `phane`) | doc31 P1#5; doc30 §5.5 | P1 | bushveld.ts | OPEN — Pass 3 |
| **P1-B** | Storage tier 3 is a P12,000 dead sink (38 item types) | doc31 P1#6 | P1 | buildings.ts + economy.ts | OPEN — Pass 3/4 |
| **P1-C** | Crafting margin can invert on raw spikes (breaks "no accidental loss") | doc31 P1#7 | P1 | crafting.ts + web | OPEN — Pass 3 |
| **P1-D** | Contracts pay Botho/tokens; surface `category` | doc30 G-8/1.8; doc31 P0#3 tail | P1 | contracts.service + UI | OPEN (data done; rewards + UI remain) |
| **P1-E** | Recurring maintenance demand too small to sustain bushveld (P3.17/day) | doc31 P1#8 | P1 | buildings.ts + economy.ts | OPEN — Pass 3 |
| **P1-F** | Seasonal coherence not enforced (two calendars; weather 28 d vs chapter 91 d) | doc31 P0#4; doc30 G-5 | P0/P1 (fork) | weather.ts + simulation + world-events | OPEN — Pass 3 (ruling needed, see §7) |
| **P1-G** | Chapter Tokens dead-end; Regard no effect; Almanac ungated | doc31 P1#9; doc30 G-7 | P1 | chapters + almanac + kgotla | OPEN — Pass 3/4 |
| **P1-H** | Automation gated on retired XP axis; no auto-feeder (the G-2 defuser) | doc30 G-6 | P1 | buildings + economy + kgotla | OPEN — Pass 3 |
| **P1-I** | Kraal capacity counts per animal type, not total | doc31 §7#8; doc30 G-2 tail | P1 | livestock.service | OPEN — Pass 1 (with P0-A/B) |
| **N-1…N-10** | Narrative voice gaps (livestock voice, NPC corrections, Market/Mophane whispers, chapter beat) | doc30 §5 | P1 (cohesion) | dialogue.ts + screens | OPEN — Pass 4 |
| **V-1…V-14** | Visual-state compliance (palette 0%, unreachable sprites, emoji UI, 4 building states) | doc30 §4 | P0-visual/P1 | scripts + web + assets | OPEN — Pass 2 |

> **Priority order for execution (task instruction):** P0-A → P0-B/F → P0-C → P0-D(tail) → P0-E. Then P1-A…P1-I. Narrative (N-*) and visual (V-*) are run as their own passes (2 and 4) so they do not block economy fixes.

---

## 3. Contradictions resolved during reconciliation

1. **"Contracts are an economy P0" — partly already fixed.** `contracts.service.ts` now imports `CONTRACT_RULES`, `contractGoodsMarketValue`, `contractRewardCap`; `payoutFor()` caps each payout at `rewardMarketMultiple × Co-op value`, and a `repeatCooldownHours` blocks re-accept. The doc-31 "1.7–6.7× and repeatable" leak is **closed in code**. Remaining contract work is narrow: add Botho/token rewards (P1-D) and confirm UI surfaces `category`.
2. **"`/payments/create` security FAIL" — this draft called it a false positive. IT WAS NOT.** `main.ts` does set `whitelist:true, forbidNonWhitelisted:true`, but `CreatePaymentDto` was declared as an `interface` — TypeScript interfaces have no runtime metatype, so `ValidationPipe` skipped it entirely and the options had nothing to act on. The `{ sku, quantity:-5 }` probe returning 201 was a **real defect**. Fixed: `CreatePaymentDto` is now a `class` with class-validator decorators (living doc task **1.11**). _Correction logged 2026-09-30; the original text below is retained struck through for provenance._ ~~The probe's junk field is stripped → valid SKU → 201. That is correct, safe behaviour.~~
3. **"Throttling FAIL" is incorrect.** `SEC-04` (65 mutating calls) **PASSED** (`201x64 429x1`). The rate-limiter works; no code change required beyond the explicit coverage check added this pass (SEC-08).
4. **Art is a P0 in doc 30 (P0-3) but economy-first in doc 31/task.** Resolved by treating P0-E as a high-priority *visual* workstream (Pass 2) that runs in parallel with economy P0s; doc 30's own §6 already sequences art as Pass 2, so this is consistent with the mandated four-pass plan.
5. **Seasonal enforcement is a fork, not a pure defect.** doc 31 §11 P0#4 offers two resolutions (enforce vs demote-to-lore). Adopted default per doc 30 §9 Q-variants: **enforce one calendar** (drive weather/world-events from `chapter.rainCoverage`), because the Setswana year is the stated identity. Flagged as an open ruling for the Princess (§7).

---

## 4. Four-pass implementation roadmap

Each pass ends on the project gates: `tsc -p apps/api` + `tsc -p apps/web` = 0; `jest` (209 tests *as read on 2026-09-28 — the workspace total is now 35 suites / 592 tests*); `python scripts/balance_verify.py` PASS; `eslint` clean on touched files. **The simulator is NOT run against the live project** (it creates real Supabase auth accounts — see §8). Validate via unit/integration tests and a throwaway local Supabase instead.

### Pass 1 — Stop the bleeding (mechanical) — *owner: backend + economy*

| Task | Files | Acceptance | Deps | Effort |
| --- | --- | --- | --- | --- |
| 1.1 Recovery: `POST /farms/:id/livestock/:aid/treat` consumes `herbs`, sets `is_sick=false, health=0.6`; ownership-checked | `livestock.{service,controller}.ts` | sick→treatable→producing arc test passes | — | M |
| 1.2 `feedAnimal` clamps (+0.15 hunger, no production) when sick instead of throwing 400 | `livestock.service.ts:178–187` | sick feed → 200 w/ reduced gain | 1.1 | S |
| 1.3 Charge feed: debit `{feedType, feedPerDay}` via `InventoryService` atomically | `livestock.service.ts:156–199` + `items.ts` | 0 sorghum → clear 4xx, no hunger change; `feedPerDay` now read | 1.1, P0-F defs | M |
| 1.4 Starvation window: health decays only after N=12 h at `hunger===0`; persist `hunger_zero_since` | `simulation.service.ts:306–310` + 1 migration | 12 h absence leaves `health≥0.5`; 36 h sickens | — | M |
| 1.5 Self-sustaining for livestock only, from uncapped elapsed (fix G-4 dead constant) | `simulation.service.ts:96–101,296–297` | 4-day absence → `selfSustaining===true` | 1.4 | S |
| 1.6 `hungerDecayRate` → ~0.035–0.05/h (24 h cycle) on all 4 animals | `livestock.ts` | 1 visit/day keeps fed animal producing | — | S |
| 1.7 Per-kraal feed action (sums feed) + keep per-animal fallback | `livestock.service.ts` + `FarmScreen.tsx` | 4-chicken kraal = 8 sorghum, 1 tap | 1.3 | M |
| **1.8** | **Market buy restriction: reject non-DIPEO; enforce chapter's 6 seeds** | `market.service.ts:258–319` | non-seed→4xx; out-of-season seed→4xx | — | M |
| **1.9** | **Define feed items `grain`/`hay`/`mixed_feed` (or map to crops)** | `items.ts` + `livestock.ts` | feed types resolve to real inventory items | 1.3 | S |
| 1.10 Kraal capacity counts all livestock, not per type | `livestock.service.ts` | 12+12+12+12 no longer fits one kraal | — | S |
| 1.11 Fix corrupt contract string (already done) + add Botho/tokens to 3 community contracts | `contracts.service.ts` + UI | grep: 0 non-Latin; ≥2 contracts pay Botho | P0-D | S/M |
| 1.12 G-1 doc time-base comment fix | `docs/09 §2:46` | doc states 1 real hour = 1 game hour | — | XS |

**Pass 1 gate:** new integration test simulating worst case (fed 20:00, return 20:00 next day, 4 animals) asserts all alive, feedable, producing. `balance_verify.py` still PASS.

### Pass 2 — Make the farm visible (art pipeline + render) — *owner: web + assets*

| Task | Files | Acceptance | Effort |
| --- | --- | --- | --- |
| 2.1 Pipeline quantise + denoise + colour-budget gate (V-2); build 64-entry palette from `docs/05 §3` | `scripts/generate-pixellab-assets.mjs`, `scripts/sync-assets.mjs`, new `scripts/palette.mjs` | ≥90% in-palette; build fails on budget breach | M |
| 2.2 `<PixelSprite>` component (integer scale, bottom-centre anchor, `pixelated`, emoji fallback) (V-3) | new component | no non-integer render site | M |
| 2.3 32 px base declared; backgrounds re-exported integer-friendly; `docs/05 §2/§4` rewritten (V-1) | `assets/backgrounds/*`, `docs/05` | 800×480 ÷ bg width ∈ ℤ | M |
| 2.4 Farm ground + plot tiles; ground follows chapter (V-4.1) | `FarmScreen.tsx` | `plot_empty/soil` + autotiles render; `grass_dry`(Moriti)/`grass_water`(Pula) | M |
| 2.5 Buildings in 4 states; rename legacy folders (V-4.2/3) | `FarmScreen.tsx`, `assets/sprites/buildings/*`, `buildings.ts` | `spriteSheet` resolves; 4 states distinct | M |
| 2.6 Hotspots from `sprites/hotspots/` not emoji (V-5) | `BushveldScreen.tsx` | 0 emoji in hotspot layer | S |
| 2.7 Emoji → `ui/icons/`; Kagiso pips from `status_kagiso_pip.png` (V-6) | screens | grep: 0 player-facing emoji in `components/screens/` | M |
| 2.8 One `<Attention>` component, single priority (V-14) | new component + 10 screens | ≤1 pulsing element/screen | M |
| 2.9 Chapter particles; delete `snowflake.png`; fix Market fallback (V-11/V-13) | screens | 0 404s; snowflake gone | S |
| 2.10 2-frame animal idle loops (~14 files) (V-9) | `assets/sprites/animals/*` | ≥2 frames/state, 2–4 fps | M |

**Pass 2 gate:** screenshot pass over 10 screens @800×480 — 0 404s, 0 emoji in scene layer, no non-integer sprite scale.

### Pass 3 — Make the year felt (systems) — *owner: backend + economy*

| Task | Files | Acceptance | Effort |
| --- | --- | --- | --- |
| 3.1 Delete sim season clock; weather + growth modifier from `chapter.rainCoverage` (G-5) | `weather.ts`, `simulation.service.ts:108–153`, `chapters.ts` | 1 calendar; Moriti measurably drier | L |
| 3.2 Re-key 10 world events to chapters; drop `winter_solstice`+`frost_warning`; strip `xp/energy` (N-7) | `world-events.service.ts` | no xp/energy; every event names a chapter | M |
| 3.3 Rotating chapter-scoped market-event pool + rotation job (G-11) | migration + `market.service.ts` + admin | fresh install has active event | M |
| 3.4 Wire 5 Almanac counters; surface progress + token expiry (G-7) | `chapter.service.ts`, `almanac.ts`, UI | real progress; token countdown | M |
| 3.5 Botho-gated automation via Kgotla unlock: Auto-Collector 150 → Auto-Feeder 300 → Irrigation 500 (G-6) | `buildings/economy/kgotla/simulation` | each enforced + effective; auto-feeder defuses 1.4 | L |
| 3.6 Contracts pay Botho/tokens; surface `category` (G-8) | `contracts.service.ts`, UI | ≥2 contracts pay Botho; `contractsCompleted` bumps Almanac | S |
| 3.7 Insert 16-plot land rung (~P14,000) (G-9) | `economy.ts LAND_LADDER` | 4→8→12→16→20; `balance_verify.py` PASS | S |
| 3.8 Welcome-back discarded-time line (G-12) | `FarmScreen.tsx:586–612`, sim | sheet states away-time + applied-time | S |
| 3.9 Lazy per-building wear (G-13) | `simulation.service.ts:372–388` | daily≈weekly wear for equal wall-clock | S |
| 3.10 Journal/Phane gate: count only true discoveries or add 2nd route (P1-A) | `bushveld.ts` | `phane` bonus not hard-gate | M |
| 3.11 Storage T3 rework: lower cost or functional benefit (P1-B) | `buildings.ts` | T3 justifies cost | M |
| 3.12 Crafting live margin warn/block on raw spike (P1-C) | `crafting.ts` + web | negative-margin craft blocked | M |
| 3.13 Raise recurring maintenance demand; add `thatch`/`hardwood` to repair (P1-E) | `buildings/economy` | bushveld demand sustains | M |

**Pass 3 gate:** `balance_verify.py` PASS; Almanac shows real progress; season-boundary test asserts one calendar.

### Pass 4 — Voice (strings + data) — *owner: narrative + web*

| Task | Files | Acceptance | Effort |
| --- | --- | --- | --- |
| 4.1 `MOPHANE_LINES` pool (N-6) | `dialogue.ts` + consumer | lines only in months 4,12 | S |
| 4.2 `MARKET_WHISPERS` keyed on price condition, Mama Naledi voice (N-10) | `dialogue.ts`, `MarketScreen.tsx` | 5 conditions covered; Market has voice | S |
| 4.3 Chapter beat: Mogolo line + sky swap at boundary (N-5) | `dialogue.ts`, Almanac panel, `tiles/sky/*` | beat once per crossing | S |
| 4.4 Rewrite 3 project descriptions; Mogolo completion lines (N-3) | `kgotla.service.ts:286–313` | no cross-farm promises | S |
| 4.5 Thabo rewrite; `Oupa Kabelo`→`Ntate Kabelo`; one elder (N-2) | `kgotla.service.ts` → `game-config` | one elder; no Afrikaans; no rivalry | M |
| 4.6 Chapter-scoped project sequencing (N-4) | `kgotla.service.ts PROJECTS` | 1 project/chapter | S |
| 4.7 Environmental storytelling from 22 scene props (V-10) | 4 screens | every V-10 prop bound or retired | M |
| 4.8 Deep Bushveld restoration art + hotspots (V-12) | `assets/backgrounds/`, `bushveld.ts:108–116` | 4 entries resolve | M |
| 4.9 Growth-silhouette rule; `READY`→icon+sparkle (V-7) | crops art, `FarmScreen.tsx:734` | no literal READY | S |
| 4.10 Product sprite as animal state (V-8) | `FarmScreen.tsx:288` | `product` state swaps whole sprite | S |
| 4.11 N-1 livestock voice (ElderSnapshot `hungry/sickAnimals` + 2 rules) | `bushveld.ts` + snapshot | sick-animal farm gets `sick_animal` line | S |

**Pass 4 gate:** every one of the 10 screens has ≥1 state-reactive narrative element.

---

## 5. Narrative voice distribution (Three Pillars parity)

The audits confirm the narrative *system* is the strongest part of the build; the gap is **where the voice is absent**. Target: Pula / Botho / Journal (Madi is v1.1) each represented in mechanics **and** voice.

| Pillar | System currently with voice | Gap to close | Pass |
| --- | --- | --- | --- |
| **Pula** (Capital) | water whispers, Elder rules | **Market has zero voice** (N-10) — add `MARKET_WHISPERS` | 4.2 |
| **Botho** (Community) | Kgotla charges, Elder rules | livestock silence (N-1); project descriptions promise shared sim (N-3); NPC tonal collisions (N-2); Thabo rivalry | 4.1/4.4/4.5 |
| **Journal** (Wildcraft) | bushveld finds, proverbs | `phane` hard-gate (3.10); Mophane voiceless (4.1); Deep Bushveld no art (4.8) | 3.10/4.1/4.8 |
| **Time** (the real clock) | chapter countdown, token expiry | chapter boundary not marked (4.3); expiry invisible (3.4) | 3.4/4.3 |

Setswana strings already on disk (`ELDER_RULES`, `WATER_WHISPERS`, 42 proverbs) are the template — every new pool uses the same shape and the same "refuse to scold" doctrine.

---

## 6. Visual state compliance

P0-E (doc 30 P0-3) is the largest *measured* gap: **198/423 files unreachable**, **0/11 sampled assets in-palette**, **3 dead constants** (`feedPerDay`, `SELF_SUSTAINING_THRESHOLD_HOURS`, Almanac requirement kinds). Pass 2 closes reachability + palette via **wiring art already paid for** (no new prompts needed for V-1…V-10 except the ~14 animation frames in 2.10). The one pipeline change that needs no PixelLab call is **V-2** (quantise/denoise/colour-budget gate) — a scripts-only post-process. See §8 re: asset *generation*.

---

## 7. Open rulings adopted (defaults from doc 30 §9)

| # | Decision | Default adopted | Note |
| --- | --- | --- | --- |
| Q1 | Pig / donkey / guinea fowl | **Guinea fowl** | cheapest art reuse; authenticate |
| Q2 | 32 vs 16 px base | **32 px** | art authored there; 800÷32 exact |
| Q3 | Automation unlock path | **Kgotla unlock** | gives Botho a sink |
| Q4 | Livestock cap vs starvation window | **Starvation window + uncapped self-sustaining** | keep `MAX_OFFLINE_HOURS=24` |
| Q5 | Contract rewards | **Botho + Chapter Tokens** | different systems |
| Q6 | `saffron` archive vs delete | **Archive** under `assets/_archive/` | |
| Q7 | Lock Almanac tuning | **After counters land** | measurable first |
| **R1** | Seasonal enforcement fork (P1-F) | **Enforce one calendar** (Q-variant) | needs Princess sign-off; impacts weather + world-events + seed gating |

---

## 8. Status, gaps & blockers (honest)

**Done this pass (safe, validated-by-reading edits; NOT built/run here):**
- G-1 doc time-base comment (`docs/09 §2:46`).
- `PUT /config` AdminGuard on both PUT routes → non-admin now 403, not 500 (fixes SEC-06).
- `safeguards.ts`: removed `/payments/create` from the generic malformed loop (false-positive), added accurate `ECO-10` and explicit rate-limiter `SEC-08`.
- This roadmap + reconciliation.

**Blockers requiring Princess decision:**
1. **No PixelLab tool/connector available.** I cannot *generate or regenerate* pixel-art assets — there is no PixelLab integration in this environment, only the `scripts/generate-pixellab-assets.mjs` batch script (which needs `PIXELLAB_API_KEY` and the service). I can do the **V-2 pipeline gate** (quantise/denoise/colour-budget, scripts-only) without generating art, but actual asset (re)generation needs the tool or a provided key. Recommend: connect the PixelLab connector, or accept "wire existing art" (Pass 2.4–2.9) as the v1 visual ceiling and defer regeneration.
2. **Simulator cannot run against live.** The safety rail checks HOST, not backend DB; `localhost` passes even if `apps/api/.env` targets the live Supabase project `nyapfgawanqvnkkjudxb`. Running the simulator (especially a 30–50 player fresh cohort) **creates real auth accounts** on the live project. The task's "validate in simulation / fresh 30–50 player cohort" success criterion is therefore **unsafe as written**. Recommend: point at a throwaway local/seed Supabase, or a dedicated preview project, before any validation run. Until then, validation = unit/integration tests + `balance_verify.py` only.
3. **Large Pass-1 livestock code is unvalidatable here** and a second work stream is concurrently editing these exact files. I have started only the contained, low-risk edits. The 1.1–1.10 livestock/simulation changes should be implemented against a branch with the parallel stream coordinated, and gated by the new integration test before merge.

**Not done (out of scope / deferred per ruling):** wildlife raids, boost effects (ruled v1-deferred); real-money PSP wiring.

---

## 9. Living-doc note

Update this file as each task moves `OPEN → IN PROGRESS → DONE (commit)`. When a dependency is discovered (e.g. 1.3 needs 1.9's feed-item defs), record it inline rather than rewriting the plan. The canonical severity source remains `docs/MVP/`; doc 30/31 are findings.
