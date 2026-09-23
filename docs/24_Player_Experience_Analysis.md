# Document 24: Player Experience Analysis

> **Molemisi Player Experience**
> Version: 1.0.0 (post-review)
> Status: Living analysis + recommendations ledger
> Last Updated: 2026-09-22
> Companion work: Farm UI/GX review pass, 2026-09-22 sessions

---

## 1. Executive summary

Molemisi is a **server-authoritative, real-calendar farming management sim**
set in Botswana (I7). The player experience rests on four interlocking
economies:

| Pillar | Currency | Earned through | Spent on | UI home |
|---|---|---|---|---|
| **Capital** | Pula | crops, animal products, market trading | seeds, water, land, buildings, livestock, community | Farm / Market |
| **Community** | Botho | kgotla quests, donations (daily-capped, I4) | crafting unlocks (Bupi/Borotho ≥ 100), standing | Kgotla |
| **Wildcraft** | Kagiso + finds | bushveld hotspots (rest/scarcity-gated) | crafting inputs, journal pages | Bushveld |
| **Time** | Real calendar | showing up | — it shapes everything | All |

The spine of the experience — the thing a competitor cannot copy — is **the
Setswana year**: four real-calendar chapters (Pula → Phane → Moriti →
Letlhafula) that rotate the six stocked seeds, shift water demand (rain
coverage 0.8 → 0.05), and stage the two Mophane events (April, December).

Verdict: the daily loop is complete and honest — every number on screen is
server-backed. The mid-game has real texture. The five leftovers found in the
2026-09-22 review are addressed in §5; the build now ships the land ladder,
the Botho catch-up, and the water telemetry that were missing.

## 2. The player's world: screens → systems

| Screen | System | Player verb | Status |
|---|---|---|---|
| **Farm** | plots, tank, weather, livestock, buildings, land, coach | plant / harvest / water / feed / collect / build / repair / upgrade / expand | complete |
| **Market** | live prices (0.5–2.0× raw swing), events, 5% co-op tax | sell produce / buy seeds & materials | complete |
| **Crafting** | 5 recipes, batch 1/3/6 (1×/2.5×/4× fees), Workshop slots 1→3, substitution | craft building inputs & food | complete |
| **Bushveld** | Kagiso scarcity, hotspot rest (60 min), rarity-by-settlement, scene restoration 40/70/100%, Mophane swap | forage | complete |
| **Kgotla** | Botho ladder + daily cap (I4), council NPCs, community projects with contribution caps | talk / quest / donate | complete |
| **Journal** | Mogolo's reactive proverbs, finds ledger, real active contracts | reflect / track | complete |
| **Wallet** | ledger, purse, subscription state | read-only trust surfaces | complete |
| **Store** | Pula-priced boosts + cosmetics (real-money = top-ups & Guild sub, Madi in v1.1) | spend | complete |
| **Settings** | audio, language (EN/TN), notification prefs | configure | complete |

Every write path goes through `WalletService` / `InventoryService`. The
historic client-side lies (demo farms, fake quests, local Pula mutation) were
all deleted in the 2026-09-22 pass.

---

## 3. The session: what a day actually feels like

### 3.1 First five minutes (new player)

1. **Coach mark** (one-time): three taps explained — plant, gauge, kraal.
2. A 4-plot farm, all empty soil, P0 — twelve identical tiles reduced to one
   obvious action: *tap a plot, pick a seed*. The current chapter's stock (six
   seeds) appears with in-season marks.
3. First plant → 16–24h timer. The "come back tomorrow" beat lands *inside the
   first session*, by design (F1: no crop finishes while you watch).

### 3.2 The daily session (5–15 min)

**Return moment** — the welcome-back sheet appears only when the offline
simulation has news (≥30 min away + something reportable): crops ready, animal
products, buildings finished, season turned, or **Botho catch-up** (03 §9.4,
ruled 2026-09-22). Zero noise on a quick re-log.

Then the loop, in the player's natural priority order:

1. **Harvest** — gold-pulsing plots; the 🌾 badge shows the count.
2. **Replant** — from granary seeds; in-season badges guide rotation.
3. **Water read** — the one strategic call of the day: tank above demand?
   Rain filling (HUD chip + scene FX)? Or squeeze season (Moriti: rain covers
   5% of demand)? Pump costs P60 per 60L.
4. **Kraal** — feed animals (2–8 units from the granary — feed *competes* with
   selling), collect on 12–48h cycles, pet for happiness.
5. **Buildings** — repair amber/red cards (Pula + Poleto/Thapo/Setena, the
   03 §3.5 sink); save for Workshop/Storage tiers.
6. **Crafting** — start batches at the default "max affordable"; collect.
7. **Market** — sell at live events, co-op tax visible in every receipt.
8. **Kgotla** — talk, quest, donate up to the daily cap (I4). The day's Botho.
9. **Bushveld** (2–3× weekly) — Kagiso-capped, hotspot rests; restoration is a
   *weeks-long* arc with background art at 40/70/100%.

### 3.3 The weekly & seasonal rhythm

- **Every chapter (~3 real months):** seed stock rotates, water demand shifts,
  the meta changes. Pula = tomatoes freely; Moriti = sorghum/morula + hoard
  water.
- **Twice a year:** Mophane windows (April/December) — rare-resource event,
  deliberately decoupled from chapter boundaries.
- **Continuously:** journal finds → restoration; Botho → thresholds 100/300/
  500/1000; **land rungs 4→8→12→20** at P1,200 / P6,000 / P30,000.


## 4. Progression analysis

### 4.1 What progresses

| Track | Pacing | Codified by |
|---|---|---|
| **Pula / plots** | ~P64/day at 4 plots → ~P176 at 12 → ~P294 at 20 (balance model); land rungs P1,200 / P6,000 / P30,000 (P37,800 total incl. rung 1) | `LAND_LADDER`, C15 |
| **Buildings** | Storage 24→48→96 slots (P2.5k/P12k); Workshop slots 1→2→3 (P0.6k/3k/9k + materials) | `BUILDINGS` |
| **Botho** | daily-capped (I4); Bupi/Borotho at 100; deep bush at 300; PRIZE_ELIGIBILITY at 1000 | `BOTHO_THRESHOLDS` |
| **Journal/Bushveld** | scene restoration 40/70/100% across repeated visits; Kagiso discipline | bushveld config |
| **Seasonal power** | seed calendar forces rotation; best meta rotates Tomatoes → Pepper → Morula → Morita | `CHAPTERS` |
| **Livestock** | chicken P50/12h → pig P300/48h truffles; Kraal capacity 12 | `ANIMALS` |

### 4.2 The strengths of this progression design

1. **The calendar replaces levels** (D6) — discovery comes from the year, not
   XP. Copy-proof, culture-authentic, and it creates *anticipation*.
2. **Every sink reinforces another system**: maintenance eats crafting goods
   (03 §3.5); animal feed eats granary stock; community projects eat Pula; the
   co-op tax eats margin. The economy is a web, not a treadmill.
3. **Scarcity is scheduled, never random**: Kagiso and hotspot rests make the
   bushveld a *planned expedition*; rarity weights scale with settlement.
4. **The 24-hour cliff was engineered away** (F1): every crop is explicitly
   1-day (16–24h) or 2-day (40–48h). Daily check-ins never silently halve
   yield; "Ready in ~4h" labels the estimate as approximate because growth is
   tank-gated.

### 4.3 Former holes — now closed (§5)

1. **Land ladder** — was documented-but-unimplemented; **now live** via
   `POST /farms/current/plots/purchase` with the F17-raised tier curve.
2. **Botho had no catch-up** — daily-capped absence was a permanent loss;
   **now credited** per 03 §9.4 (below).
3. **Mid-game water feel** — now instrumented (`cropsStalled` telemetry) for the
   Moriti playtest; UI side is legible (rain chip, gauge, stall states).
4. **Offline promise conflict** — doc 20 restated: installable + cached shell,
   live state needs the server; demo data removed.


## 5. The five leftovers — addressed 2026-09-22

### 5.1 Land ladder (rec #1: the missing endgame)

**Was:** `plot_count` starts at 4 (`STARTING_PLOTS`) and *nothing* sold plots
5–20 — C15, the 114-day land curve, and the canonical Pula sink were missing.

**Now:** rung purchases are a wallet-atomic `POST /farms/current/plots/purchase`.
Findings made along the way:

- The numbers lived in **two reconciled sources**: `economy.ts`
  (`LAND_LADDER`, `LAND_LADDER_TOTAL = 37,200`, F17-raised, batch tiers)
  vs `balance_verify.py` §5 (per-plot reading, P15,800 in
  `balance_audit.py`). The audit/py side is the stale one — §5's tiers read as
  **batch prices** (1200/6000/30000 summing to 37,200), and `balance_audit.py`
  still prints P15,800. Flagged below as drift to clean up.
- Pricing is **batch, not per-plot**: a 4-plot farm pays P1,200 and jumps to
  8; 8→12 costs P6,000; 12→20 costs P30,000. The UI quotes straight from the
  server row (`nextLand`), so neither side can drift (F19 lesson).
- Each purchased plot is a real `farm_plots` row (identical shape to
  registration); `farms.plot_count` stays the capacity truth; failure
  anywhere refunds both money and rows.

### 5.2 Server push (rec #2: return hooks)

**Was:** in-app notifications + SW receiver only; no server push.

**Addressed in scope:** the client receiver is in place (`sw.js` handles
`push`/`notificationclick`; gameState registers the SW on mount; Settings
holds permission + the two toggles from 03 §12). The remaining server work is
mechanically defined but unbuilt: VAPID keys, `POST /notifications/subscribe`,
and "crop ready" triggers inside `advanceFarmGrowth`. Left explicitly because
VAPID keys cannot be provisioned in a code change.

### 5.3 Botho catch-up (rec #3: the harshest cliff)

**Was:** daily-capped (I4) with no catch-up — skipped days were permanent loss.

**Now (ruled 2026-09-22):** missed days credit **25% of the daily cap each**,
at most **3 days**, via `creditBothoCapped(playerId, round(50 × 0.25 ×
missedDays), 'botho_catchup')` on the welcome-back pass in `farms.service`.
Routing through `creditBothoCapped` keeps today's legal cap (I4) unbypassable:
the catch-up tops up toward the cap, it never exceeds it. The credited amount
appears as a `🤝 +{n} Botho from the community` row in the welcome-back sheet.

### 5.4 Water telemetry (rec #4: measure the squeeze)

**Was:** the Moriti water squeeze (F5: 7.5× thirst spread) needed playtesting.

**Now:** `advanceFarmGrowth` returns `cropsStalled` (crops that wanted to grow
but drank nothing, dry tank or rationed), plumbed through `SimulationResult`
and the existing spec fixed. Combined with the new analytics events
(`tank_refilled`, `crops_stalled`, `plot_purchased`), the playtest answer —
*stalls per farm-day vs plot count vs crop mix* — will arrive in
`analytics_events` rather than as opinion.

### 5.5 The small items

- **Soil fertility**: deleted — it was a hardcoded 92. The HUD chip is now
  weather • season only.
- **Growth-stage sprites**: plot tiles render `stage_N.png` buckets from hour
  progress, with step-down on missing files and emoji fallback.
- **Time-to-ready**: the plot panel shows "Ready in ~4h" ( tank-gated, always
  approximate).
- **Season-aware picker**: in/off-season marks from `isSeedInSeason`.
- **Coach mark**: one-time first-visit sheet.
- **Background fallback**: no third-party URLs; local sprite, dark gradient.
- **Journal quests**: rewired to real active contracts (the last mock consumer
  outside the Farm screen).
- **Constructions now charge materials**: `constructBuilding`, `upgradeBuilding`
  and `upgradeStorage` consume `baseCost`/`upgradeCosts` Poleto/Thapo/Setena
  with refund-on-failure (03 §3.5 sink was display-only before).
- **Livestock→Kraal bug**: animal `buildingRequired` now points at the v1
  `kraal` (purchase was impossible before).
- **Buildings upgrade surface**: tier button in the building sheet with
  server-quoted cost (`nextUpgradeCost` on the row).


## 6. Player flows — health check

| Flow | Shape | Health |
|---|---|---|
| **Onboarding** | coach → first plant → overnight wait → harvest → market | strong; the "come back tomorrow" beat is enforced by design |
| **Return from absence** | sim (24h cap) → welcome-back sheet → Botho catch-up → notifications | strong |
| **Farm loop** | harvest → replant (season-checked) → water read → sell | complete, self-explaining |
| **Land expansion** | save P1,200 → jump to 8 → P6,000 → 12 → P30,000 → 20 | newly live; watch tier-3 jump pacing |
| **Livestock** | buy (kraal-gated) → feed/pet/collect cycles | complete |
| **Buildings** | build sheet → timers → wear → repair with crafted goods → upgrades | complete; repair is the 03 §3.5 sink made visible |
| **Crafting** | affordability-led; substitution; batching; slots | best-UX'd system (03 §3.6 implemented faithfully) |
| **Trade** | live prices + events + co-op tax | healthy |
| **Bushveld** | scenes → Kagiso/rest gates → collect → restore | healthy; restoration is the long-game |
| **Kgotla** | talk → quest → donate (capped) → Botho ladder | healthy |
| **Monetisation** | Pula store now; top-ups/sub later; Madi v1.1 (nullable `ledger_entries.currency` already in place) | gentle; v1.1 has explicit infra |

---

## 7. Remaining risks & open items

1. **Tier-3 jump pacing** (12→20 at P30,000): the largest single leap in the
   ladder. The balance model blesses it; watch `plot_purchased` + income
   telemetry for the first cohorts before touching it.
2. **balance_verify.py §5 / balance_audit.py land numbers are stale**
   (P15,800 in the audit vs 37,200 in config) — the only place the F19
   single-source rule is currently violated. Next pass: make the script read
   the batch tiers or print both readings with a drift alarm.
3. **Server push VAPID + subscribe endpoint** — the only recommendation left
   partially open (§5.2); requires provisioned keys, not a code decision.
4. **Market screen redesign** (other agent in flight) — port layout against the
   live state layer; do not let it reintroduce local price math.
5. **Two-agent file contention** — `FarmScreen.tsx`, `buildings.service.ts`,
   `MarketScreen.tsx` all have large uncommitted changes from parallel agents.
   Commit before the next write.

---

## 8. Verification of this pass

- `tsc --noEmit`: web ✅ / api ✅ / game-config build ✅ (71/71 config tests)
- API suite: 18/18 suites, **209/209 tests** (one spec updated for the new
  `cropsStalled` counter)
- ESLint: no new issues on touched files (pre-existing useState formatting +
  repo-wide CRLF noise only)
- The Botho catch-up was routed through `creditBothoCapped` deliberately so
  the I4 legal cap counts it against *today's* allowance — absence helps, but
  it can never double-dip the cap.

