# MVP Design Decisions — Eleven Locked Calls for Molemisi

**Status:** Decision record with **Princess rulings incorporated (2026-10-04, second pass)**. **All eleven decisions are now ruled** — the first pass settled nine (D2 · D3 · D5 · D6 · D7 · D8 · D9 · D10 · D11); this second pass settles the two that stood as first written (**D1 animations, D4 Kgotla customization**) and adds two ambient-animation rulings and three cosmetic/avatar confirmations (§10). Ready for sign-off once the §13 checklist is closed.
**Owner of record:** Belvedere (royal counsel), consolidated for Princess Eugenia.
**Authoritative baseline this document reconciles against:** `docs/MVP/01`–`06` (the normative set, `06` wins on "is it done?"), `DEVELOPMENT_STATE.md` (as-built, 2026-10-03), and `docs/MVP/README.md`.
**Also consulted:** `docs/35`–`38` (year-loop / calendar / meals / Kgotla quests — **explicitly "Draft for ruling, nothing implemented" and yield to `01`–`06` on conflict**), `docs/08` (API), `docs/05` (art), `docs/22` (UI/GX), `docs/10`·`33`·`34` (monetisation), `docs/18`·`09` (admin/sim), `docs/26`·`27`·`29` (inventory/market/Kgotla reconciliation), `docs/30` (narrative review), `ASSET_MANIFEST.md` (Bushveld pipeline), and the Field-Journal narrative-voice doc.

> **Reading rule.** Where this document proposes a value the specs leave open, it is tagged **[DISCRETION]**. Where a supporting draft spec contradicts the normative MVP set, the MVP set governs and the contradiction is logged under *Open questions*. **✅ RULED (2026-10-04)** marks a decision the Princess has settled explicitly; those no longer need sign-off.
>
> **Correction of record (2026-10-04).** An earlier draft claimed Mogolo, Mama Naledi, and Ntate Kabelo NPC sprites were *missing* from `assets/manifest.json`. On inspection all five canonical NPCs have full-body sprites (`elder_neo`, `mama_naledi`, `refilwe`, `thabo`, `oupa_kabelo`, 32×64, `npcs` group). The missing-asset claim was wrong and is withdrawn; the only genuine new art the rulings require is the **World Tree**, the **avatar layers**, and the **data-driven cosmetics/World-Tree/calendar UI** assets (see §0.2 and `Asset_Manifest_MVP.md`).

---

## 0. The binding constraint — timeline, sequence, and what blocks what

These eleven decisions are not independent. Several are **prerequisites** for others, and one of them (the calendar) is the clock every other live-service decision hangs on. Locking them in the wrong order means re-work.

**Recommended lock-down date: 2026-10-25** (three weeks from the 2026-10-04 baseline). Rationale: the MVP is code-complete and alpha is unblocked (`DEVELOPMENT_STATE.md`, M16); **the schema is fully landed (49 migrations, all live — corrected 2026-10-04)**, and Wave-4 store UI + real-PSP wiring + the P10 manual checks are gated on *content* decisions (cosmetics, NPC art, calendar, live service), not on the build. **Princess Eugenia must ratify the date** — it is a recommendation, not an assumption.

### 0.1 Decision-lock sequence (dependency-gated)

```
WAVE A — the world's rules (decide FIRST; everything else hangs on these)
   2  Lore framework ............. RULED: Sesana + World Tree + educational spine
   8  Authentic calendar ......... RULED: keep "Sekala sa…"; simulatable; Events live svc
   3  Agricultural simulation .... RULED: no soil decay; raids later; biome OK

WAVE B — systems built on the spine
   7  Recipes, meals, cooking .... RULED: DEFERRED — MVP is farming-only
   5  Culture & competition ...... RULED: global Kgotla chat + achievement ladder
   4  Kgotla customization ....... RULED: farm name only (market identity); Kgotla fixed; player name+avatar = Kgotla identity
   11 NPCs & voice acting ........ RULED: DEFER all VO
   —  Ambient animation .......... RULED: NPC breathing (Kgotla) + animal breathing (Farm), always-on idle loops

WAVE C — reconciliation & expression
   6  Inventory/craft/market ↔ Kgotla quests ... RULED: Bupi/Borotho demand via Events
   10 Cosmetics catalogue ........................ RULED: farm+avatar only; expandable; avatar sys
   1  Animations & feedback ...................... RULED: craft FX deferred w/ D7; + NPC & animal breathing loops (§1)

WAVE D — tooling (spec any time, build last)
   9  Dev account testing & simulation ........... RULED: contextual in-game dev UI
```

**Hard blockers inside the chain:**
- **8 (calendar) precedes 6 and the Events live service** — seed stocking, chapter tokens, and Kgotla seasonal demand are calendar-driven.
- **2 (lore) precedes 11** — NPC voice and "why Kgotla/Botho matter" come from the spine.
- **5 (culture) precedes 10** — cosmetics signal status; status is defined by the culture/achievement system.
- **7 (recipes) deferred** — the five recipes become v1.1 spec-of-record only; the D6 reconciliation's Bupi/Borotho demand is satisfied by the **Events** live service, not by player crafting (see D6 open question 1).

### 0.2 New build items introduced by the rulings (not in current specs/code)

The nine rulings **add net-new engineering/ui/art scope** beyond what `01`–`06` and the as-built code contain. These must be estimated and scheduled — they are the real cost of the ruling pass.

| # | Build item | Decision | In specs today? | In code today? | Notes |
|---|---|---|---|---|---|
| B1 | **Global Kgotla chat** | D5 | No | No | Real-time, moderated, Setswana+English; needs infra + profanity filter + rate limit. Cross-cutting. |
| B2 | **Player achievement system** | D5 | No (Botho only) | Partial (Botho thresholds) | `player_achievements` table + achievement catalog driving the honorific ladder. |
| B3 | **Events live service** | D6 / D8 | No | No | Seasonal live-ops awarding **chapter tokens by achievement**; creates Kgotla demand for Bupi/Borotho. |
| B4 | **Avatar system (3-layer)** | D10 | No | No | Base gender variant + outfit overlay + always-on Farmer's Hat; expandable cosmetic SKUs. See `Asset_Manifest_MVP.md`. |
| B8 | **Ambient idle loops** | D1 (2nd pass) | No | No | NPC breathing (Kgotla) + animal breathing (Farm); always-on, reduced-motion-aware. New sprite frames. |
| B5 | **World Tree asset** | D2 | No | No | Restoration centerpiece; new Bushveld/community sprite + progress visual. |
| B6 | **Calendar education UI** | D8 | Partial (Almanac) | Partial | Rewrite guide/Almanac to teach Setswana months + chapters + why seasons matter. |
| B7 | **Data-driven cosmetics SKUs** | D10 | Partial (logged) | Partial | Refactor cosmetics to a code-expandable manifest (farm + avatar slots only). |
| — | **Crafting / cooking systems** | D7 | Yes (spec) | Partial | **SCOPE REDUCTION:** deferred to v1.1 — *not* a v1 build item. |

> **NPC art is NOT a build item.** All five canonical NPCs (`elder_neo`/Mogolo, `mama_naledi`/Mama Naledi, `refilwe`, `thabo`, `oupa_kabelo`/Ntate Kabelo) already have full-body sprites in `assets/manifest.json`. Two *surplus* sprites (`market_vendor`, `bushveld_scout`) exist but are not in the hardcoded cast — either wire them into content or deprecate them (doc/art hygiene, not a gap).

---

## 1. Animations for crafting, building, livestock feeding, and transactions

**Decision statement.** Every action resolves with **instant feedback on the tap + a state-change indicator + a reward pop on resolution**, and **no time-compressed loop for async work**. Crafting is *asynchronous* (2–6 h timers, `02 §6.3`), so its "animation" is a slot state-change when started and a reward-pop when collected next session — never a spinning progress loop the player waits on. This is the only shape consistent with the no-babysitting accessibility goal (`01 §4` D4; `02 §6.3` "crafting is start-now/collect-tomorrow") and low-end devices (`01 §2`).

> **✅ RULED context (D7):** crafting/cooking are deferred to v1.1, so the *crafting-slot* start/collect flourishes below are **not built in MVP**. The building-construct, livestock-feeding, and transaction feedback remain in scope.
>
> **✅ RULED (2026-10-04) — breathing animations (new, in scope).** Two ambient idle loops are added to v1:
> - **NPC breathing (Kgotla)** — the five canonical NPC sprites (`elder_neo`, `mama_naledi`, `oupa_kabelo`, `refilwe`, `thabo`) gain a subtle **always-on idle breathing loop** (a gentle 2–4 px vertical/scale cycle, ~3 s period). It is a *presence* cue, not a state change — it never blocks input and never competes with a dialogue tap.
> - **Animal breathing (Farm)** — every livestock sprite gains the same **always-on idle breathing loop**, layered under the existing `22 §4.5` feeding bounce/hearts so feed feedback still reads on top of the idle.
>
> Both are **sprite-sheet/idle animations, not physics**: one loop per sprite, frame-count kept low for low-end devices, and both are **disabled when the reduced-motion / Particles-OFF accessibility profile is active** (`22 §11.5`). This is the only ambient-motion work in v1; no other sprite gains an idle loop by default.

**Integration with existing systems.**
- Crafting timers are 2–6 h by design (`02 §6.3`, `03 §3.2`); a craft animation that *plays* for hours is impossible, so the visible artefact is the **slot state** (`crafting_jobs.slot_index`, `05 §P3`) plus a collect flourish.
- Building states are already specified as four state-change indicators: CONSTRUCTION → ACTIVE → MAINTENANCE → DISABLED (`05 §5`).
- Market transaction feedback (`+💰` float, coin SFX) is specified in `22 §12.2`.
- Livestock feeding is a one-tap kraal action (`09 §5`); its hearts/bounce feedback is in `22 §4.5`.

**Implementation notes (concrete).**
- **Crafting start/collect (DEFERRED with D7):** tap `POST /crafting/start` → "crafting" chip; on collect, reward-pop + `+N` float + craft SFX. **MVP: hidden** — no crafting UI ships.
- **Building construct:** scaffold → hammer sparks → progress bar → reveal bounce (`22 §4.6`). **Building maintenance:** when a building enters MAINTENANCE (cracks state, `05 §5`), paying the 30-day bill (`09 §8`, `warningLeadHours: 24`) triggers a short 1.0 s "repair" dust flourish + settle bounce, then returns to ACTIVE. *[DISCRETION: `22 §4.6` covers construct/upgrade only; maintenance has no flourish today — this adds one.]*
- **Livestock feeding:** keep `22 §4.5` (bounce + 2–3 floating hearts + eat anim). One tap feeds the whole kraal (`09 §5`).
- **Transactions:** Co-op sell shows the **5% tax line before confirm** (`01 §4` principle 4; `02 §4.1`). On confirm: `+{amount} 💰` floats up + coin SFX (`22 §12.2`).
- **Accessibility:** expose the existing **Particles / Screen Shake / Pixel-Perfect** toggles (`22 §11.5`) prominently; on a throttled-3G low-end profile, default Particles OFF.

**Open questions for review.**
1. **Time-compressed tutorial only.** The 3-second crop-grow time-lapse (`22` tutorial step 4) is the *sole* sanctioned time-compressed loop. Confirm we do not extend it to building. *(Dependency: none — can lock in Wave C.)*
2. The craft timer (2–6 h) is **absent from `docs/05`/`22`**; only `02 §6.3` states it. Flag the art/UX spec as needing the timer reference so animators don't assume minutes (relevant when D7 un-defers).
3. **[DISCRETION]** Maintenance flourish is newly specified here; confirm the 1.0 s budget is acceptable on low-end.

---

## 2. Lore framework connecting Botswana and fantasy

**✅ RULED (2026-10-04).** The following is now settled; the open "origin myth" question narrows to copy approval only.

**Decision statement.** The player is **one of the first major farmers in the fictional village of Sesana**, in the years **after Botswana's independence** — a young community learning to feed itself. The theme is **farming / survival: "going green, learning natural rhythms"** — the player learns the basics and intricacies of agriculture and civilization by playing. Underlying the village is the **restoration of a World Tree**, the symbolic heart of Sesana that the community brings back to life as Botho grows. The game is explicitly **educational**: it teaches the player the real *processes* of how their food is produced and the *importance of community* in producing it. Molemisi's world is the single village of **Sesana** on the Botswana highveld/savanna: the player's homestead (Farm) and the shared **Kgotla**, bordered by the **Bushveld** — the wild margin that restores the village (wood, clay, fibre, phane) and "gives when settled, goes quiet when disturbed" (`04 §4.4`), a metaphysical echo of Botho.

The spine is **Botho** — *motho ke motho ka batho* ("a person is a person through others"): the land was given into the care of the people *through* mutual responsibility, and the Kgotla is where the village agrees to live by the land's rhythm. This justifies, in-fiction, the three things the mechanics require:
- **Seasonal crop rotation** — water is scarce in the dry season, so the land *commands* rotation (`02 §6.1`); Mogolo voices the reason (`30 §5.3`).
- **The Bushveld's existence** — it is the margin that *restores* the village; it is also where the **World Tree** stands at the edge of Sesana.
- **Why Kgotla & Botho matter** — community survival *is* the win condition; the reward function pays best for acts that cannot be ground (`02 §9`), so the lore and the economy say the same thing.

The **yearly arc** is the four-chapter Setswana cycle (Begin · Give · Keep · Leave). **Mogolo is the narrative voice** — a village-elder *voice*, not an NPC (`MOLEMISI_Field_Journal_Narrative_Voice_v1 §1`). The **World Tree** is the visible macro-goal: as the player's Botho and Journal mastery rise, the tree is progressively restored (a new restoration visual, distinct from the Bushveld scene stages).

**Integration with existing systems.** Anchors to the Three Pillars (`03 §6`), the reward function (`02 §9`), the Kagiso fiction (`04 §4.4`), the chapter cycle (`04 §9.2`), the Field-Journal restoration (`04 §7`), and the four-verb year-loop (`37 §4`, draft). The World Tree adds a *community* restoration meter alongside the *ecological* Journal meter.

**Implementation notes (concrete).**
- **Setting copy (working text, needs Princess's myth-approval):** *Sesana was founded by the first settlers after independence, on land the old people said was "listening." They planted, and the land answered. At the heart of the village stood a World Tree, whose roots held the water and whose shade held the counsel. When the people forgot the rhythms, the tree grew quiet. Your work — planting, tending, giving — wakes it again.* (Working text; the creation-myth slot is **absent from all current docs** — see research B.)
- **Yearly arc verbs** (from draft `37 §4`, reconciled to normative chapters): Pula = *Begin* (plant, rains), Phane = *Give* (long growth, Mophane generosity), Moriti = *Keep* (water is the whole game, restraint), Letlhafula = *Leave* (harvest, and leave something behind for the land).
- **World Tree visual:** a large centerpiece sprite (stage 0 degraded → stage 3 full) tied to a community-restoration progress (Botho + completed Council Projects). New asset — see `Asset_Manifest_MVP.md` B5.
- **Cultural grounding rules (hard):** Mogolo *refuses to scold* (`30 §5.1`); respect prefixes **Mma / Rre** for elders (`23:21,24`); community-first language; clan totems are *personal*, never researched (`04 §6.4`).

**Open questions for review.**
1. **World origin / creation myth is undefined in every spec** (research B). The Sesana/World Tree text above is a proposal — **requires Princess Eugenia's myth approval** before it ships as copy (this is the only remaining D2 open item).
2. **Are the four "seasons" traditional Setswana?** `35 §5` (V-6) flags this as **open** — they may be a borrowed frame. Decision: treat chapters as *the game's* chapters, not a claim to traditional Setswana seasons. Confirm.
3. **Native-speaker pass required** on: "Mogolo" (moderate confidence, narrative-voice doc `:7`), the proverb list (`04 §9.4` — only *Motho ke motho ka batho* is high-confidence), and totem/clan pairings (`04 §6.4`). *No* Setswana in player-facing copy until that pass (`30 §1037` gate).
4. **Reading of Names (1 Nov)** is an *invented* ritual (`36` V-6) — flag as game fiction, not tradition.

---

## 3. Agricultural simulation grounded in real Botswana processes

**✅ RULED (2026-10-04).** Three points are now settled:
- **Do NOT implement soil degradation** as a mechanic in MVP (land recovery stays the Journal-restoration art only, `04 §7`).
- **Wildlife raids are for later versions** (already deferred from v1 by ruling 2026-09-11; confirmed here).
- **The biome archetype is fine for now for the Bushveld** — real Botswana ecoregions *inspire* the scenes; they are not 1:1 maps of named towns.

**Decision statement.** Model Botswana farming at the level the mechanics already implement — **seasonal crop selection by rainfall, water-stress as the central tension, and livestock as a reliable floor** — and treat *land recovery* as the **Field-Journal scene restoration** (`04 §7`), not a soil-decay number. Explicit agronomy lessons are taught *through* Mogolo's lines and the thirst rating on seed packets (`03 §1.2`), never through a tutorial wall. Real Botswana ecoregions **inspire** the Bushveld scenes as **biome archetypes**; they are not 1:1 maps of named settlements (to avoid misrepresenting real places).

**Integration with existing systems.**
- Crop selection by season + rainfall: the seed calendar stocks six seeds/chapter, clustering thirsty crops in the rainy chapters (`02 §6.1`); growth modifier scales with `rainCoverage` (`37 §3`, draft).
- Water stress: an empty Jojo tank **halts** growth server-side, never kills (`03 §1.2`, `04`/`02`); rain credits the tank (`05 §P4`). This is the highest-value change in the project (`03 §1.2`).
- Livestock rotation: chickens + goats are the lowest-effort, most reliable income floor (`03 §5`); wildlife rotation is **deferred from v1** (confirmed by ruling).
- Land degradation/recovery: represented *only* by Journal restoration (`04 §7`, R5/C18); no soil-quality field in v1 (`03 §2`, `06` P3).

**Implementation notes (concrete).**
- **Real regions inspiring each Bushveld scene [DISCRETION]:** Open Bush = *Naga e Bulegileng* (open savanna); Riverbank = *Fa Nokeng* (a seasonal river line); Rocky Outcrop = *Matlapa a Kwa Godimo* (kopje/granite hills); Deep Bushveld = *Botho jwa Naga* (dense woodland). These are **biome archetypes**, not named settlements.
- **What players learn by playing:** (a) water matters — a 20-plot watermelon field drains a full tank in <½ day (`02 §6.5`); (b) rotation is forced by the seed calendar (`02 §6.1`); (c) Kagiso teaches *disturbance* (`04 §4.4`); (d) livestock is a floor, crops a ceiling (`03 §5`).

**Open questions for review.**
1. **✅ RULED — soil degradation NOT in v1.** Confirmed. No open item.
2. **✅ RULED — wildlife raids deferred.** Confirmed. No open item.
3. Real-location mapping is **silent in specs**; the biome-archetype approach above is a discretion call (consistent with the ruling that the biome archetype is fine).

---

## 4. Kgotla customization (name editing and ownership)

**✅ RULED (2026-10-04) — farm name only, and it is the market identity.** The earlier "STANDS as written" framing is now superseded by an explicit refinement of *where each identity is displayed*.

**Decision statement.** The **Kgotla itself is never renamed** — it is a shared cultural institution, and renaming it fragments the one social space the game's identity depends on (`01 §4` principle 7; Botho is *community*, not personal). **Only the farm may be named.** The player has **two distinct identity surfaces**, and they are not interchangeable:

| Identity | Used at | Notes |
|---|---|---|
| **Farm name** | **the Co-op Market** (buy and sell), Farm screen header, community-project leaderboards | the player's *economic* identity — the trading handle. Editable **once**, Setswana-or-English, filtered server-side. |
| **Player name + avatar** | **the Kgotla** (global chat, NPC interactions, honorific title display) | the player's *social* identity. The avatar carries the always-on Farmer's Hat (§10). |

Personalization of the shared Kgotla is expressed through the **player's identity at the Kgotla** (name + avatar) and the earned honorific ladder (§5) — **not** through editing the institution, and **not** through a Kgotla cosmetic slot (§10).

**Integration with existing systems.** Aligns with the Three Pillars and the "specificity is the moat" principle (`01 §4` D7). Trade surfaces read the **farm name**; social surfaces read the **player name + avatar**. Cosmetics remain the sanctioned expression layer for the *farm and the avatar* (`02 §7.1`, `10`).

**Implementation notes (concrete).**
- **Farm name:** editable **once**, Setswana + English allowed, profanity/SLUR filtered server-side; rendered on the **Co-op Market** trade surface (so both buyer and seller see the farm, not the player), the Farm screen header, and Kgotla community-project leaderboards. Stored on `farms` (new nullable `name` column — a small, safe migration; flag for schema review).
- **Player name + avatar:** rendered in the **Kgotla** (chat author line, NPC dialogue, title display) and in Settings. `profiles.display_name` + `player_avatar` (D10).
- **Kgotla:** name fixed as "Kgotla". There is **no** Kgotla renaming and **no** Kgotla/Bushveld cosmetic slot (`08 §10` ruling).

**Open questions for review.**
1. **✅ RULED (2026-10-04) — farm name only; it is the market identity.** Kgotla rename is **not** permitted, and no village-name alternative is introduced. The farm name doubles as the buy/sell handle at the Co-op Market. `farms.name` is additive against the 49 live migrations and ships as a new batch at any time (`docs/MVP/11 §3`).

---

## 5. Core culture and competition system

**✅ RULED (2026-10-04).** Two additions are now settled: (a) **enable global chat in the Kgotla**, and (b) the honorific ladder is the **canonical Setswana ladder** below, each title attained **meaningfully via a player achievement system**.

**Decision statement.** The culture is **Botho** (Ubuntu / community-first). Competition is **cooperative-framed, never zero-sum** — `30 §5.1` (N-2) explicitly flags competitive framing as contradicting botho and the cozy mandate. The **Kgotla is where all players interact with each other**, and Princess Eugenia quotes the Setswana: *"Mafoko otlhe a lekgotla a mantle"* ("all words of the kgotla are sweet/peaceful") — so **global chat is enabled there**, framed as a peaceful community space (moderated). Status is signalled by **earned social markers**, not by bought rank:
- **Botho rank** (the canonical number, `02 §6.4` / `03 §6.2`) → honorific titles.
- **Journal mastery** (scene-restoration %).
- **Cosmetics** (expression, Decision 10).
- **Chapter-Token prize draw** + **monthly community prize** (`02 §6.7`).

**Canonical honorific ladder (✅ RULED) — attained by player achievements, not purchase:**

| Title | Meaning | Attained at (achievement-driven) |
|---|---|---|
| **Molemi** | Farmer | start / first farm established |
| **Molemi-Morui** | Farmer-Rearer | livestock + early Botho milestones |
| **Moagi** | Builder | buildings + Council Projects |
| **Motsadi** | Elder | sustained Botho + community acts |
| **Mokgosi** | Leader | top Botho + event achievements |

These are **cosmetic social markers**, earnable only. The achievement system (B2) is the new machinery that gates each rung; Botho thresholds from `02 §6.4` inform the milestones but the *rung* is an achievement, not a raw number.

**Integration with existing systems.** The reward function already pays best for non-grindable acts (`02 §9`); Botho gates automation + Letsema (`03 §6.2`, `05 §P5`); the monthly prize ranks by **monthly** Botho delta (`02 §6.7`). The cosmetics store is the expression layer (`02 §7.1`). Global chat is a new Kgotla surface (B1) requiring moderation infra.

**Implementation notes (concrete).**
- **Titles are display-only** — they never grant advantage (honours `docs/33` rule 5: money buys expression, never access).
- **Achievement system (B2):** a `player_achievements` table + an achievement catalog (data-driven). Each catalog entry maps to a rung of the ladder and to one or more in-game milestones (crops planted, buildings raised, Charges completed, Events won). The Kgotla shows the player's current title.
- **Global chat (B1) — ✅ RULED (2026-10-04, third pass): NO MODERATION.** A Kgotla chat panel, Setswana + English, **one shared global channel**. There is **no profanity filter, no mute/block and no report path** — the moderation subsystem, the bilingual wordlists and the trust-and-safety sign-off are all **withdrawn**. What remains is an **anti-flood** guard: a per-player interval + rolling-window limit and a payload-length cap. These constrain *how often* a player posts, never *what they may say*, and they exist for cost discipline (`20 §5.4`: the target audience is on mobile data), not for content policy. Transport is **polling at a slow interval, visible-tab only** — no socket, no chatty traffic. **Shipped:** `apps/api/src/chat/` + `apps/web/src/lib/chat.ts` + `KgotlaCommunityPanel`, migration `20261004000004`.
- **Competition surface:** the Kgotla leaderboard + community projects + global chat; framing is "who served most," never "who has most."

**Open questions for review.**
1. **✅ RULED — ladder settled.** Native-speaker confirmation on each title (*Molemi-Morui*, *Moagi*, *Motsadi*, *Mokgosi*) before copy ships — a linguistic pass, not a design decision.
2. ~~**Global chat moderation**~~ — **✅ CLOSED 2026-10-04 (third pass): no chat moderation.** The open engineering/trust item is withdrawn by ruling; there is no filter, no mute/block, no report queue and no T&S sign-off to wait on. The chat ships unmoderated with anti-flood protection only.
3. Confirm the prize pool stays permissioned as a promotional competition under s.67 (`02 §6.7`) — legal, not design, but it shapes how "competition" is messaged.
4. Botho-per-Pula is flagged `=1` in `37` R-C4 — confirm the culture system doesn't let Madi spending *buy* status-adjacent cosmetics that read as rank.

---

## 6. Inventory, crafting, cooking, and market reconciliation with Kgotla quests

**✅ RULED (2026-10-04).** Bupi/Borotho should carry **Kgotla demand during "Events"** — a **live service** that awards **chapter tokens** based on player achievements.

**Decision statement.** The five craftables each have a purpose and each Kgotla demand is met by a craftable **in v1.1**; in **MVP (farming-only, per D7)** the player grows and sells crops, and the **Bupi (flour) / Borotho (bread) Kgotla demand is created by the Events live service (B3)** — a seasonal live-ops loop that *grants* flour/bread as participation rewards and then asks the player to bring them to the Kgotla for **chapter tokens**. Inventory is grouped **by use** (Plant · Sell · Craft · Build), not by taxonomy (`03 §2.1`).

**Integration with existing systems.**
- Five recipes: `02 §6.3` (values), `03 §3` (behaviour), `05 §P3` (schema) — *spec-of-record for v1.1; not built in MVP (D7)*.
- Kgotla Charges: `36 §4` + code `kgotla.service.ts` `CHARGES` (still present; Charge 6 "Something for the Pot" remains a Charge).
- Events live service (B3): runs on the calendar (`08` §0.2), awards chapter tokens by achievement, and raises Kgotla demand for Bupi/Borotho during its window.

**Implementation notes (concrete) — the reconciliation map (v1.1 target; MVP = Events-granted Bupi/Borotho only).**

| Craftable | Building maintenance (recurring sink) | Kgotla Charge demand | Events demand (B3, MVP-visible) | Other purpose |
|---|---|---|---|---|
| Poleto (Plank) | Farm Boundary — 3 / 90d (`26 §7`) | Charge 5 *Kraal Gate* — 4 | — | build input |
| Thapo (Rope) | Kraal — 2 / 90d | Charge 5 — 2; Charge 11 — 3 | — | build input |
| Setena (Brick) | Water Source — 2 / 90d | Charge 11 — 3 | — | build input |
| Bupi (Flour) | — | Charge 6 (v1.1) | **Events: turn-in for chapter tokens** | DIKUNO; Co-op sale |
| Borotho (Bread) | — | Charge 6 (v1.1) | **Events: turn-in for chapter tokens** | DIKUNO; Co-op sale; gift |

- **Events live service (B3):** during a Bupi/Borotho Event window, the Event *grants* flour/bread to participants (so MVP players who cannot craft, per D7, can still fulfil it), and the Kgotla shows the demand + chapter-token reward. This satisfies D6 within MVP scope **without** a crafting system.
- **Charge rewards:** Botho +10, no Pula (`kgotla.service.ts` `CHARGES`); projects pay Botho + season stamps (`37 §6.3`).
- **Inventory grouping** by intent, Setswana *names* kept on items, one-line use statement per item (`03 §2.1`).

**Open questions for review.**
1. **✅ RULED (2026-10-04) — Event-grants-them path confirmed.** D7 defers crafting, so players **cannot craft** Bupi/Borotho in MVP. To honour D6's "Bupi/Borotho Kgotla demand during Events," the **Events service GRANTS flour/bread as participation rewards** — MVP players receive them from the Event (not by crafting), then turn them in at the Kgotla for chapter tokens. This makes D6 real in MVP with no crafting system. Bupi/Borotho Kgotla demand is **not** deferred to v1.1.
2. **Season-stamp sink is the only cosmetics sink** (`37` R-C5) — no extra stamp sinks. Confirm the souvenir (25 stamps) is sufficient, or add a second.
3. `ItemDef.sellable` is referenced in `27 §4` but **does not exist in code** (research A) — the market-reconciliation doc over-claims. Fix the doc before building on it.

---

## 7. Recipes, meals, and cooking flow

**✅ RULED (2026-10-04). DEFERRED.** The Princess ruled: *"Defer all cooking and crafting implementation to later versions. Let's focus on farming for the MVP."*

**Decision statement.** **MVP ships farming-only.** All crafting and cooking systems — the five recipes, the craft slots/timers, substitution, batching, DIKUNO meals — are **deferred to v1.1** and are **not built in this release**. The five recipes below remain the **authoritative spec-of-record for v1.1** (values from `02 §6.3`) so the later build does not re-litigate them. In MVP the player **grows crops and sells them at the Co-op**; there is no crafting UI, no cooking flow, and no player-hunger mechanic. Bread is referenced only as a *world-event* item (via the D6 Events service), not as a crafted deliverable.

**Integration with existing systems.** Values: `02 §6.3`; behaviour (slots, batching, substitution, variance): `03 §3`; timers 2–6 h: `02 §6.3`/`03 §3.2`; meals deferred to v1.1: `35 §4.3`, `37` E-16. The crafting schema (`05 §P3`) may stay in the DB as forward-looking, but **no crafting endpoint is exposed in MVP**.

**Implementation notes (concrete) — the five recipes (v1.1 spec-of-record; NOT built in MVP).**

| Recipe | Inputs | Fee | Timer | Sale (Pula) | Profit@opp-cost | ROI |
|---|---|---|---|---|---|---|
| Poleto (Plank) | 2× Wood | P1 | 2 h | P7 | P1.85 | 38.5% |
| Thapo (Rope) | 3× Palm Fiber | P1 | 2 h | P18 | P4.70 | 37.9% |
| Setena (Brick) | any 2 of Clay/Stone | P2 | 3 h | P11 | P2.75 | 35.7% |
| Bupi (Flour) | 4× Sorghum **or 4× Millet** | P2 | 4 h | P20 | P5.60 | 41.8% |
| Borotho (Bread) | 2× Bupi | P3 | 6 h | P60 | P16.00 | 39.0% |

- **"Cooking = crafting specialization"** (DIKUNO category, `26 §1,§3`) is the v1.1 design — reuse the craft slot/timer/batching machinery; no separate CookingScreen.
- **Meals in MVP:** mention only (Charge 6 copy, Mophane Festival feast) — surfaced via the D6 Events service, never as a player flow.
- **Economic gate:** these numbers remain subject to `scripts/balance_verify.py` when v1.1 is built. Do not "rebalance" them by hand.

**Open questions for review.**
1. **🔶 Scope confirmation.** MVP = farming-only; crafting/cooking UI hidden. Confirm we do not expose *any* crafting endpoint in MVP (recommended) — this is the single biggest scope-reduction in the ruling pass and should be explicit sign-off.
2. **Bupi millet count conflict** (`02 §6.3` = 4 vs `35 §4.2` = 3) — resolve to 4 (normative wins) when v1.1 is built; correct `35` now.
3. v1.1 dish names are provisional (`35` V-4 "Dried Phane") — native-speaker pass before v1.1.

---

## 8. Authentic calendar system

**✅ RULED (2026-10-04).** Three points settled: (a) **keep the "Sekala sa …" chapter names** (this *resolves* the prior chapter-name conflict); (b) **a simulation of a year-loop must be possible** (drives the deterministic engine + dev testing); (c) **improve the in-game guide/Almanac for calendar education**, and **Events is a live service awarding chapter tokens by achievement, with rewards and quests at the Kgotla**.

**Decision statement.** Use the **real Botswana calendar** — 12 Setswana months, four chapters mapped to real rainfall, boundaries at 00:00 Africa/Gaborone (UTC+2) on **1 Nov / 1 Feb / 1 May / 1 Aug** (`35 §2.4`, `04 §9.2`). The game calendar **matches real-world 2026/2027 dates**; only the chapter *frame* is abstracted over the months. **Chapter display names keep the normative `Sekala sa …` form** (`04 §9.2` wins — ruled). The year-loop is **fully simulatable** through the deterministic engine (`runSimulation(input.now, input.seed)`, `09 §10`) so dev/test can fast-forward a full year without waiting. The in-game **guide/Almanac is rewritten to teach** the Setswana months, the four chapters, and *why* seasons matter (water, rotation, harvest). **Events** is a live service (B3) running on this calendar, awarding chapter tokens by achievement, with its rewards and quests surfaced at the Kgotla.

**Integration with existing systems.** `04 §9` (real calendar, chapters, Mophane, proverbs); `02 §6.1` (seed calendar); `05 §P8` (chapters table); the deterministic engine computes seasons via `SEASON_DURATION_HOURS` (`DEVELOPMENT_STATE.md`); `09 §10` (replayable sim). The Events live service (B3) consumes this calendar.

**Implementation notes (concrete).**
- **12 Setswana months** (`04 §9.1`): Ferikgong, Tlhakole, Mopitlwe, Moranang, Motsheganong, Seetebosigo, Phukwe, Phatwe, Lwetse, Diphalane, Ngwanatsele, Sedimonthole.
- **Four chapters (normative `04 §9.2` — AUTHORITATIVE, ✅ RULED keep names):**

| Chapter | Months | Character |
|---|---|---|
| Sekala sa Pula | Nov–Jan | Rains; planting; tank fills itself |
| Sekala sa Phane | Feb–Apr | Late rains; long growth; April phane window |
| Sekala sa Moriti | May–Jul | Dry & cold; water is the whole game |
| Sekala sa Letlhafula | Aug–Oct | Harvest, wind, preparation |

- **Simulatable year-loop:** the deterministic engine already derives chapter/season/Kagiso/chapters from `input.now`; dev date-jump (D9) and the `MAX_OFFLINE_HOURS=24` clamp confirm a full year can be advanced in ≤24 h steps. No new calendar engine needed — only the *education UI* (B6) and the *Events service* (B3).
- **Calendar education UI (B6):** rewrite the Almanac/guide screen to show the current Setswana month, the active chapter with its character, the next rollover date, and a one-line "why it matters" (e.g., Moriti: "water is the whole game — keep the Jojo full"). Illustrated with calendar UI assets (`Asset_Manifest_MVP.md`).
- **World events:** Mophane windows = real months **{4,12}** (decoupled from chapters, `04 §9.3`); Letsema declaration beat on/after 1 Oct (cosmetic, `35 §2.5`); Reading of Names 1 Nov (invented ritual, `36` V-6). **Events live service (B3)** layers seasonal chapter-token awards + Kgotla quests on top.

**Open questions for review.**
1. **✅ RULED — chapter names kept (`Sekala sa …`).** The prior `35`/`37` rename conflict is resolved in favour of `04 §9.2`. No open item; correct `35`/`37` to match.
2. **Initiation ceremonies / harvest festivals** are **not present** as world events (`35` notes Mophane Festival is a game construct, `36` V-7). If cultural events are wanted beyond the Events service, they need a sensitivity review — flag, don't build un-reviewed.
3. `35` V-5: nine of twelve month *notes* are not yet supplied — the calendar education UI (B6) needs those notes before the Almanac is rich. **This is now a build dependency for B6.**

---

## 9. Dev account testing and simulation capabilities

**✅ RULED (2026-10-04).** Dev tools should be **placed elegantly and meaningfully in-game** — contextual affordances on the actual game screens, not a separate walled `/dev` panel — for easy navigation and use.

**Decision statement.** A dev account (`role='dev'`, top tier, `DEVELOPMENT_STATE.md` auth) must be able to: **jump to any future date** (chapter rollover / season), **spawn items** (any `item_definitions` row), **reset player state** (already `POST /admin/players/:id/reset-farm`), **simulate full progression** (drive a farm from zero to max land/Botho via the deterministic engine), **test NPC interactions** (talk/quest endpoints), and **validate quest completion paths**. Form: **contextual in-game dev affordances** — dev-only controls layered *onto the real screens* the player uses (Farm, Kgotla, Calendar), so a dev navigates by playing the game, not by learning a separate tool. Today `docs/18` enumerates only reset-farm / config-edit / inspection / moderation — so this decision **extends and re-homes** the dev tooling into the game.

**Integration with existing systems.** `18 §1` (dev = top tier, admitted to `/admin` + in-game dev affordances); `09 §10` (deterministic engine, replayable); `09 §11` (state-validation corruption classes); `kgotla.service.ts` NPC/Charge endpoints. The year-loop simulation (`08` §0.2) is the backbone of date-jump.

**Implementation notes (concrete) — contextual placement.**
- **Calendar date-jump:** a **long-press on any date / the chapter header** in the (rewritten) calendar UI (B6) opens a dev date-picker (DevGuard-gated) → sets `input.now` on `runSimulation` → re-derives chapter/season/Kagiso/chapters. Validates chapter-rollover zeroing (`06` I13) without waiting a season.
- **Farm spawn / reset:** a dev affordance on the Farm screen (e.g., a long-press on the player's avatar or a small dev gear) exposes spawn-item (`POST /dev/inventory/grant`) and reset-farm. Spawn uses the sanctioned `inventory_take` RPC (`DEVELOPMENT_STATE.md`).
- **Kgotla quest test:** a dev affordance on the Kgotla screen validates NPC talk/quest endpoints and force-completes a Charge for testing.
- **Progression sim:** a dev affordance drives plant/harvest/craft/quest in a loop against the engine, asserting `GET /progression` milestones.
- **State panel:** corrupt states (`09 §11`: NEGATIVE_CURRENCY, NEGATIVE_BOTHO, NEGATIVE_INVENTORY, ORPHAN_CROP, PLOT_WITHOUT_CROP, STALE_SIMULATION, FUTURE_SIMULATION) surfaced in a small dev overlay on the relevant screen, each with its `planRecovery()` action.

**Open questions for review.**
1. The enumerated dev abilities (date-jump, spawn, simulate, validate quests) are **not in `docs/18`/`09`** today — this decision specifies them as *in-game contextual* affordances; confirm the placement (long-press patterns) with eng.
2. **Never point the simulator at the live project** (`DEVELOPMENT_STATE.md` hazard) — dev affordances must default to a throwaway DB. Enforce in the dev overlay.
3. The M-series migrations (`spend_chapter_tokens`, etc.) are **live** as of 2026-10-04, so dev date-jump testing of chapter tokens runs against the current schema. (Corrected — this item previously read "should land before dev date-jump testing".)

---

## 10. Player cosmetics: inventory, purchase, and display locations

**✅ RULED (2026-10-04).** Cosmetics must be **expandable in code** (data-driven SKUs), limited to **farm and avatar only**, and we must **decide the avatar system**; an **asset manifest for PixelLab** is required (delivered separately as `Asset_Manifest_MVP.md`).

**Decision statement.** Cosmetics are **cosmetic-only** (`docs/33` rule 5) and split into **Market shelf (Pula, earned)** and **Festival shelf (Madi, bought)**, each Festival item having a same-slot Market cousin so "nobody's farm looks poorer because they didn't pay" (`34 §3.1`). **Display slots are limited to FARM and AVATAR only** — `hut`/`kraal`/`frame`/`livestock` → farm; `outfit` → avatar. The earlier proposal to also render a cosmetic `frame` at the Kgotla/Bushveld is **withdrawn** (ruling restricts cosmetics to farm+avatar). Cosmetics are defined by a **data-driven, code-expandable SKU manifest** so new items are added without code changes. The **avatar system is a 3-layer model** (base gender variant + outfit overlay + the always-worn Farmer's Hat) so outfits are swappable and expandable. **Botho-tier cosmetics** are *earned* social markers (Decision 5) — the milestone outfit. **Rank is never purchasable** (2026-10-04 second-pass confirmation): a Madi/Festival purchase is expression, never status; the honorific ladder (D5) and Botho rank are the only rank signals.

**Integration with existing systems.** `02 §7.1` (cosmetics = unbounded Pula sink, P200–P2,000), `10 §1` (two shelves + Village Pass), `33 §2`/`34 §3` (store structure), `DEVELOPMENT_STATE.md` (store UI not yet wired; cosmetics "largely logged rather than fully applied").

**Implementation notes (concrete).**
- **Avatar system (B4) — decided (extended 2026-10-04).** A **three-layer sprite**:
  1. `avatar_base` (body) — **chosen once at creation as a gender/attire variant**; not a cosmetic, not purchasable, **not** editable from the store.
  2. `avatar_outfit` (overlay) — the cosmetic layer; **the store swaps THIS layer only**. Expandable: new outfits = new `outfit` SKU row, no code change.
  3. `avatar_hat` — the **signature Farmer's Hat**, worn **always** (non-removable). It is the player's permanent silhouette cue, drawn on top of the outfit so the hat is never occluded by a cosmetic.

  All three layers are new assets — see `Asset_Manifest_MVP.md` §2.
- **Farm slots:** `hut` · `kraal` · `frame` · `livestock` (Market + Festival shelves).
- **Avatar slot:** `outfit` only (Market + Festival shelves). **No Kgotla/Bushveld cosmetic slots (ruling).**
- **Market shelf (Pula):** P200 / P600 / P1,500 — hut · kraal · frame · livestock · outfit.
- **Festival shelf (Madi):** M40 / M80 / M150 / M300 — same five slots, one Market cousin each.
- **Village Pass (M50/mo):** helper (waters+collects) · **one festival outfit/month** · +50% storage (stacking). Helper also earned free at Botho 500 (`02 §6.4`).
- **Botho-tier (earned, cosmetic-only):** e.g., a *Mokgosi* cloak at the top achievement ladder rung (Decision 5) — unlock, not purchase.
- **Expandable SKU manifest:** cosmetics move from hardcoded rows to a `cosmetics` data file the store reads; adding an SKU = editing data only.
- **Preview-before-buy:** a 2D sprite-swap preview in the store (cheap on low-end; no 3D needed) — retained from the first draft.
- **Asset manifest:** the full PixelLab asset list (avatar base+outfit, farm cosmetics, World Tree, calendar UI, NPCs) is `Asset_Manifest_MVP.md`.

**Open questions for review.**
1. **✅ RULED — farm + avatar only.** The Kgotla/Bushveld `frame` cosmetic proposal is withdrawn. No open item.
2. **✅ RULED (2026-10-04) — avatar at creation = choose gender variant + outfit; always wears the signature Farmer's Hat.** The `avatar_base` set is confirmed in MVP; **the exact number and naming of gender variants is a [DISCRETION] for the art pass** (recommend a small, Setswana-attire-grounded set rather than binary-coding the choice). The hat is non-removable.
3. **✅ RULED (2026-10-04) — cosmetics are sufficient as the sink; no second sink is added.** The 25-stamp season souvenir stands as the only season-stamp sink (`37` R-C5); the unbounded Pula sinks remain **cosmetics + the Letsema fund** (F7 satisfied).
4. **✅ RULED (2026-10-04) — cosmetics as Guild/status benefit confirmed: no Madi purchase reads as rank.** Rank is signalled **only** by earned markers — Botho rank, honorific ladder (D5), Journal mastery. A bought Festival cosmetic is expression, never status; the same-slot Market cousin guarantee holds.
3. **Village Pass +50% storage is not yet wired** to the storage-tier check (`10 §8`) — a build dependency for Wave 4, not a design one, but flag it.
4. Cosmetics are "largely logged rather than fully applied at runtime" (`DEVELOPMENT_STATE.md`) — the store UI (Wave 4) is where this lands; this decision defines *what* ships.

---

## 11. Voice acting and NPC finalization

**✅ RULED (2026-10-04). DEFERRED.** The Princess ruled: *"Defer all voice for later versions."*

**Decision statement.** **No recorded voice acting in any version until later.** The five Kgotla NPCs are **hardcoded in the API** (`kgotla.service.ts:266–308`) with distinct Setswana names — finalized as: **Mogolo** (The Elder, `elder_neo`), **Mama Naledi** (Market Trader, `mama_naledi`), **Ntate Kabelo** (Builder, `oupa_kabelo`), **Refilwe** (Herbalist, `refilwe`), **Thabo** (Farmer, `thabo`). Dialogue "voice" is **written prose**; the game ships with a **Setswana/English text toggle** (Settings EN/TN, `24 §54`). Narrative voice = Mogolo as village-elder *narrator* (`MOLEMISI_Field_Journal_Narrative_Voice_v1 §1`); the others are in-character but community-first. **All VO is post-MVP.**

**Integration with existing systems.** Code is the source of truth for the cast (`ARCHITECTURE_OVERVIEW.md` "Content" — NPCs hardcoded); `08_API_Specification.md §15` is **stale** (documents one generic NPC) and must be corrected. Cultural grounding: Mogolo refuses to scold (`30 §5.1`); respect prefixes Mma/Rre (`23`); botho/community-first (`30 §5.1` N-2).

**Implementation notes (concrete).**
- **Cast (finalized, all five have full-body sprites in `assets/manifest.json` — no art gap):** Mogolo `elder_neo`, Mama Naledi `mama_naledi`, Ntate Kabelo `oupa_kabelo`, Refilwe `refilwe`, Thabo `thabo`. Charges pay Botho +10 (`kgotla.service.ts` `CHARGES`).
- **Quest lines:** one Charge per NPC (`CHARGES` array) + 4 chapter Council Projects (config-driven from `COUNCIL_PROJECTS`, `kgotla.service.ts:323`).
- **Cultural grounding (hard):** no scold pool; Thabo "never a rival"; Setswana respect prefixes; clan totems personal (`04 §6.4`).
- **VO decision:** **deferred to later versions** — v1 (and the near-term roadmap) is text-only. *If* VO is ever added, it is Setswana with English subtitles, Mogolo + Mama Naledi first. This is explicitly **not** in scope now.

**Open questions for review.**
1. **✅ RULED — all VO deferred.** No open item on scope.
2. **`08_API §15` is stale** (one generic NPC) — correct it to the five-NPC cast; this is a doc bug, not a design question.
3. **Native-speaker pass required** before any copy ships: "Mogolo" (moderate confidence), totem/clan pairings (`04 §6.4`), and the proverb list (`04 §9.4`). ~~and nine missing month notes (`35` V-5)~~ — **the twelve Setswana months are ✅ RULED CORRECT (2026-10-04)**; there is no missing-notes blocker, and the calendar education UI renders the months straight from `SETSWANA_MONTHS` in `game-config`.
4. `oupa_kabelo` id retains an Afrikaans-derived slug though the display name is corrected to *Ntate Kabelo* (`30 §857`) — leave the id (DB-stable) but confirm the display name is canonical.
5. **Two sources of truth for the cast** (`30` N-2): hardcoded `NPCS` vs `game-config` "mogolo" voice. Recommend one authoritative cast list in `game-config` with one elder — a refactor, flag for eng. (Also note: `market_vendor` and `bushveld_scout` sprites exist in `assets/manifest.json` but are not in the cast — wire in or deprecate.)

---

## 12. Spec-silence & discretion log (where the brief left room)

| # | Decision | Where the spec was silent | Discretion taken | Ruling (2026-10-04) |
|---|---|---|---|---|
| 1 | Animations | `docs/05`/`22` omit crafting + maintenance flourish | Added state-change + reward-pop; maintenance dust flourish | **✅ RULED (2nd pass)** — stands; crafting FX deferred with D7; **+ NPC & animal breathing loops added to v1** |
| 2 | Lore | No creation myth in any doc | Proposed Sesana/World Tree working myth | **✅ RULED** — Sesana post-independence + World Tree + educational |
| 3 | Ag sim | Real-location mapping unspecified | Biome archetypes, not 1:1 towns | **✅ RULED** — no soil decay; raids later; biome OK |
| 4 | Kgotla name | Farm vs Kgotla naming unspecified | Farm name editable; Kgotla fixed | **✅ RULED (2nd pass)** — **farm name only, and it is the market (buy/sell) identity; player name + avatar = Kgotla identity** |
| 5 | Culture | Honorific ladder + chat unspecified | Canonical ladder + global chat proposed | **✅ RULED** — Molemi→Molemi-Morui→Moagi→Motsadi→Mokgosi + achievement system + global chat |
| 6 | Reconciliation | Bupi/Borotho v1 Kgotla demand | Charge 6 accepts Flour/Bread | **✅ RULED** — demand via Events live service → chapter tokens; Events grants flour/bread (D7 tension resolved) |
| 7 | Recipes | Bupi millet count conflict (4 vs 3) | Normative 4 wins | **✅ RULED** — DEFER cooking/crafting; MVP farming-only; **no crafting endpoint exposed** |
| 8 | Calendar | Chapter-name conflict (draft vs `04 §9.2`) | `04 §9.2` authoritative | **✅ RULED** — keep "Sekala sa…"; year-loop simulatable; calendar UI + Events |
| 9 | Dev | Tooling form unspecified | `/dev` panel | **✅ RULED** — contextual in-game dev affordances |
| 10 | Cosmetics | Kgotla/Bushveld display + preview silent | `frame`-slot proposal + 2D preview | **✅ RULED (2nd pass)** — farm+avatar only; expandable SKUs; **3-layer avatar (base gender variant + outfit + always-on Farmer's Hat)**; sink sufficient; **no Madi purchase reads as rank** |
| 11 | VO | All specs silent on recorded VO | v1 text-only; Setswana/English toggle | **✅ RULED** — defer all VO |
| — | NPC art | (prior claim of missing sprites) | — | **CORRECTED** — all five exist; no gap |

## 13. Sign-off checklist (lock by 2026-10-25)

- [ ] **Princess Eugenia** ratifies the lock-down date (2026-10-25).
- [x] **D2 (lore)** ✅ Sesana post-independence + World Tree + educational spine — *myth copy still needs approval* (open item 1).
- [x] **D8 (calendar)** ✅ "Sekala sa…" names kept; year-loop simulatable; calendar UI + Events.
- [x] **D11 (VO)** ✅ all VO deferred.
- [x] **D6 (reconciliation)** ✅ Bupi/Borotho demand via Events → chapter tokens; **Events grants flour/bread** so MVP players (no crafting per D7) can fulfil it (D6 Q1 resolved).
- [x] **D5/D10** ✅ honorific ladder + Botho-tier cosmetics + global chat + farm/avatar cosmetics + avatar system.
- [x] **D7 (scope)** ✅ **RULED 2026-10-04 (2nd pass) — MVP = farming-only; no crafting endpoint will be exposed** (`08 §7` Q1 resolved).
- [x] **D1 (animations)** ✅ maintenance flourish budget confirmed for low-end; **+ NPC breathing (Kgotla) and animal breathing (Farm) ruled into v1** (2026-10-04, 2nd pass).
- [x] **D4 (Kgotla customization)** ✅ **RULED 2026-10-04 (2nd pass) — farm name only, and it is the market buy/sell identity; player name + avatar are the Kgotla identity; Kgotla never renamed.**
- [x] **D10 (cosmetics) 2nd pass** ✅ avatar at creation = gender variant + outfit, always wears the signature Farmer's Hat; cosmetics-as-sink sufficient; **no Madi purchase reads as rank**.
- [ ] **D9 (dev)** contextual in-game placement (long-press patterns) agreed with eng.
- [ ] `08_API §15` corrected to the five-NPC cast (doc bug).
- [ ] Native-speaker pass scheduled for proverbs, "Mogolo", totems. *(Month notes are no longer owed — the twelve Setswana months are ✅ RULED correct, 2026-10-04.)*
- [x] **Global Kgotla chat — ✅ RULED (2026-10-04, third pass): NO moderation.** Filter, mute/block and report queue withdrawn; T&S sign-off no longer a blocker. Shipped with anti-flood protection only.
- [ ] **Build-items estimated (§0.2 B1–B7):** global chat, achievement system, Events service, avatar system, World Tree asset, calendar UI, expandable cosmetics SKUs — these are NEW scope from the rulings and must enter the sprint plan. **Add B8 (ambient idle loops: NPC + animal breathing sprites/animations)** introduced by the 2026-10-04 second pass.

*End of decision record. Conflicts with `01`–`06` are resolved in favour of `01`–`06`; conflicts with the draft `35`–`38` are logged above for ruling. The economy gate `scripts/balance_verify.py` remains the source of truth for all numbers — fix the spec, never the script. **All eleven decisions of 2026-10-04 are now ruled** (the second pass settled D1 and D4 and added the ambient-animation and avatar/cosmetic confirmations); the remaining items in §13 are engineering placement, a doc bug, and linguistic/estimate work.*
