# 04 — The Bushveld

Gathering, discovery, and the only place in the game where the world — not the player — sets the pace.

For prices, stack caps and sale values of everything found here, see `02 §6.2`. This document owns **scene tuning**: hotspots, scarcity, yields, the Field Journal, and the calendar.

---

## 1. What the Bushveld is for

Three jobs, in priority order:

1. **Discovery.** The Field Journal is one of the Three Pillars. This is where it fills.
2. **Crafting supply.** Wood, clay, palm fiber, stone, thatch — the inputs for Poleto, Thapo and Setena.
3. **Texture.** The place that makes Molemisi feel like somewhere, rather than like a spreadsheet with a farm on it.

What it is explicitly **not** for: being a second farm. The Bushveld must never out-earn the fields. If gathering becomes the optimal income route, the craft chain inverts, the water tension on the Farm stops mattering, and the whole economy tips. The scarcity model in §4 exists primarily to guarantee this.

> **Ruling (2026-09-11) — how this invariant is verified.** The *structural* half is proven in code: `apps/api/src/launch/launch-readiness.spec.ts` shows Kagiso caps gathering at ≤6 taps per scene per day and cannot be bought. The *comparative* half — does Bushveld income stay below farm income at every farm size? — is **not** settled by a pre-launch model. `scripts/balance_verify.py` §8 models the worst case (a twice-daily, material-maximising player spending all 18 pips/day on the best material per scene) and reports Bushveld net **P153.90/day** against a 4-plot starter farm's P49/day — an inversion at 4, 8 and 12 plots that closes by 20 plots (0.63×). **Princess Eugenia has ruled that live income telemetry answers this question post-launch, not the model.** P10 therefore signs off on the structural proof plus a telemetry commitment; the §8 inversion stands as a recorded, accepted state. If live data shows gathering is the optimal route, the fix belongs here — in Kagiso regen (§4), tap cost, material value, or farm income — never in the gate script. See `docs/KNOWN_LIMITATIONS.md`.

---

## 2. The loop

1. Open the Bushveld → pick a scene.
2. The scene shows hand-illustrated bush with 5–8 Hotspots — small animated tells: a rustling branch, fresh tracks, a glint among stones.
3. Tap a ready Hotspot → resolves instantly → reward pops with a flourish → the Hotspot settles into its resting state → **the scene's Kagiso meter drops**.
4. Occasionally a tap is a first-time **Discovery**, written to the Field Journal with a line from Mogolo.

One tap resolves a Hotspot. No confirmations, no menus, no collecting later.

---

## 3. Casual-tap rules

| Action | Max taps |
|---|---|
| Resolve a Hotspot | 1 |
| Switch Scene | 1 |

- Minimum touch target **48 × 48 dp** on every Hotspot.
- No drag gestures, no timing inputs, no combos.
- Resting Hotspots stay visible in a resting state — the scene must read clearly at a glance.
- **No fail states.** Only *which* reward varies, never *whether* you get one.
- **Signs, not animals.** Every wildlife find is a track, feather, dropping or fleeting glimpse. Nothing is fought, chased or killed. This keeps the game safe and casual, and keeps the art budget on footprints and feathers instead of animated creatures.

---

## 4. Scarcity — the Kagiso meter

### 4.1 Why respawn timers don't work here

The previous model gave each Hotspot its own respawn band: common 20–40 min, uncommon 2–4 h, rare 8–16 h.

**Every band is shorter than a day.** A player who checks in once per day therefore finds *every* Hotspot ready, every time — 5–8 per scene, ~20 across the Bushveld, always. The old spec's own feel target ("2–3 ready per scene per visit") is mathematically unreachable at a daily cadence, and with no scarcity the Daily Sparkle is decoration.

You cannot fix this by lengthening timers. Any timer long enough to matter at a daily cadence is long enough to feel dead when the player does show up.

### 4.2 The fix: the scene is quiet, or it isn't

Replace per-Hotspot respawn with a **per-scene quiet meter**, called **Kagiso** (*peace, stillness*).

> **The bush gives when it is settled. Disturb it and it goes quiet. You cannot hurry it — you can only come back.**

| Knob | Value |
|---|---|
| `kagiso_max` | **6** |
| Regeneration | **+1 per 4 hours** — 6 per day, **full settle in 24 h** |
| Tap cost — Common / material Hotspot | **1** |
| Tap cost — Uncommon / Rare / seasonal Hotspot | **2** |
| Per-Hotspot rest | **60 minutes** (independent of Kagiso) |
| New-scene starting value | 6 |
| Material yield per tap | 2–4 units |
| Rarity weight at Kagiso ≥ 5 | rare ×2 |
| Rarity weight at Kagiso 3–4 | ×1 (baseline) |
| Rarity weight at Kagiso 1–2 | rare ×0.5, common ×1.5 |

Tapping requires `kagiso >= hotspot.kagiso_cost`. Below that, the Hotspot renders as resting and the collect call returns **409** with reason `scene_not_settled`.

**The per-Hotspot rest still exists**, at 60 minutes, so a single Hotspot can't be drained repeatedly inside one visit. Kagiso limits how much the *scene* gives; the rest spreads that across *different* Hotspots.

### 4.3 What this actually produces

- **A daily player has ~6 pips per scene to spend** (~18 across the Bushveld). At 1–2 pips per tap that's **2–4 resolved Hotspots per scene, 6–12 across a full daily visit**.
- **A twice-daily player gets ~3 pips per scene per visit** — a proper sweep each time, not a trickle. This is why the regen is 4 h and not 6 h: at 6 h the second visit of the day found one or two pips, which read as stingy rather than as a sweep. 24 h to a full settle is also simply easier to communicate than 36 h.
- **You cannot bank the Bushveld.** Three days away gives you 6 pips, not 18. Binge-then-vanish earns nothing extra — which is precisely the behaviour the reward function in `02 §9` exists to discourage.
- **The Daily Sparkle is suddenly meaningful**, because it tells you *where* to spend a scarce resource.
- **Rarity becomes a decision, not a dice roll.** Spending 2 pips on the leopard print is a gamble against spending 1 on wood you know you need.

Restated feel target, replacing the old one: **2–4 Hotspots per scene per visit, 6–12 across the Bushveld per day.** Not "2–3 per scene" — that number was derived from a model that could not produce it.

> **Tuning range for the simulator: 3–8 h.** Below 3 h the Bushveld starts competing with the Farm as an income source; above 8 h a twice-daily player finds almost nothing on the second visit.

### 4.4 Why "Kagiso" and not an energy bar

An energy bar says *you* are tired. Kagiso says *the place* is unsettled. Same mechanic, opposite fiction — and the second one is true to the setting, teaches itself without a tutorial, and is the single most Botswana-specific system in the game. A player who has never seen an energy bar will understand "the bush went quiet because I disturbed it" immediately.

Show it as **six pips** at the top of the scene, filling visibly. Do not hide it. Transparency is a feature (principle in `01 §4`).

---

## 5. Scenes

| Scene | Setswana | Unlock | v1 content |
|---|---|---|---|
| Open Bush | Naga e Bulegileng | From the start | Yes |
| Riverbank | Fa Nokeng | From the start | Yes |
| Rocky Outcrop | Matlapa a Kwa Godimo | From the start | Yes |
| Deep Bushveld | Botho jwa Naga | Botho ≥ 300 | **No.** Row exists, zero Hotspots, client shows "coming soon" |

Deep Bushveld's gate is a threshold check on the scene row itself — no separate progression system. Its content ships post-MVP (see `01 §7`).

**Riverbank is the economic heart of the Bushveld.** Clay and palm fiber feed Setena and Thapo, and Thapo is the best profit-per-slot-minute in the craft chain (`02 §6.3`). Its two material tells should therefore be generous relative to their cost, and its Kagiso budget is the one players will argue about.

---

## 6. Scene content

Grouped by **tell** — the visual cue the player taps. Each entry gives the find, its rarity, its Kagiso cost band, and its Field Journal line.

Journal lines are written in one voice: **Mogolo**, an elder looking over the player's shoulder, naming what's been found. Common finds get a quick, almost dismissive line. Rare finds get a beat of stillness. Materials get a shorter line, because there is less to teach about a pile of wood than about an animal's passing.

### 6.1 Open Bush — Naga e Bulegileng

**Deadfall tell** *(cost 1; seasonal cost 2 during the Phane window)*

| Find | Rarity | Journal line |
|---|---|---|
| Dikgong (Wood) | Common | *(first collection)* Good, dry wood. Mogolo doesn't waste words on this one — you'll be collecting a lot of it. |
| Phane (Mophane worms) | Rare, seasonal | The branch is stripped bare, and something has been busy. Mogolo's face changes — this is the one they've been waiting all year to see again. |

**Tracks tell** *(cost 1 common / 2 uncommon / 2 rare)*

| Find | Rarity | Journal line |
|---|---|---|
| Tholo (Kudu) | Common | Deep, heart-shaped prints pressed into the sand. Mogolo says a kudu never hurries at dawn — it already knows where it's going. |
| Phuduhudu (Steenbok) | Common | Small, neat prints, close together. Mogolo calls the steenbok the smallest worry in the bush, and the easiest to miss entirely. |
| Kolobe (Warthog) | Uncommon | Blunt prints, dragged at the toe. Mogolo laughs every time — something so low to the ground has no business being that loud. |
| Magogwe (Honey Badger) ⚑ | Rare | Torn earth and a raided nest. Mogolo goes quiet here — you do not want to meet the one who did this. |

**Nest / feather tell** *(cost 1 common / 2 rare)*

| Find | Rarity | Journal line |
|---|---|---|
| Kgaka (Guinea Fowl) | Common | A speckled feather caught in the thorn grass. Mogolo says where you find one guinea fowl, six more are already watching you from somewhere close. |
| Manong (Vulture) ⚑ | Rare | A long, dark feather drifts down from nowhere you can see. Mogolo tips his head back — something died near here, and something else already knows it. |

### 6.2 Riverbank — Fa Nokeng

**Material tells** *(cost 1)*

| Find | Rarity | Journal line |
|---|---|---|
| Letsopa (Clay) | Common | *(first collection)* Cool, heavy clay from the riverbank. Good for building. Better, Mogolo says, for teaching patience. |
| Mokolwane (Palm Fiber) | Common | *(first collection)* Tough palm fronds, ready to be worked. The baskets sold at the Kgotla market all start exactly here. |
| Lotlhaka (Thatch / Reeds) | Common | *(first collection)* Reeds cut green bend; cut dry they hold. Mogolo says the same is true of people. |

**Ripple tell** *(cost 1 common / 2 uncommon / 2 rare)*

| Find | Rarity | Journal line |
|---|---|---|
| Catfish ⚑ | Common | The water folds over itself once, near the bank, and goes still again. Mogolo says a catfish sees you long before you ever see it. |
| Kingfisher ⚑ | Uncommon | A flash of blue drops into the water and comes up with something silver. Mogolo says blink at the wrong moment and you've missed the whole hunt. |
| Otter ⚑ | Rare | A smooth, wet groove runs down the bank, still glistening. Mogolo grins at this one — whatever made it was clearly enjoying itself. |

**Muddy-bank tracks tell** *(cost 2)*

| Find | Rarity | Journal line |
|---|---|---|
| Waterbuck ⚑ | Uncommon | Broad, splayed prints sunk deep at the water's edge. Mogolo says the waterbuck never strays far from the river — it trusts nothing else to save it. |
| Heron / Crane ⚑ | Uncommon | Thin, careful prints, spaced with patience. Mogolo says the heron holds still better than most men manage at anything. |
| Kwena (Crocodile) | Rare | A wide groove drags down into the water and does not come back up the bank. Mogolo goes still, and so should you. |

**Flora tell** *(cost 2)*

| Find | Rarity | Journal line |
|---|---|---|
| Morula (Marula tree) | Uncommon | Yellow fruit litters the ground beneath the branches. Mogolo says even the elephants know when marula season starts before the people do. |

### 6.3 Rocky Outcrop — Matlapa a Kwa Godimo

**Glint tell** *(cost 1 / 2 rare)*

| Find | Rarity | Journal line |
|---|---|---|
| Matlapa (Stone) | Common | *(first collection)* Plain stone, but there's plenty of it. Mogolo says the rocks remember more than the trees do — they just don't talk about it. |
| Quartz Shard | Rare | A piece of stone catches the light wrong — too clean, too bright for ordinary rock. Mogolo turns it over twice before he says anything at all. |

**Crevice / track tell** *(cost 1 common / 2 rare)*

| Find | Rarity | Journal line |
|---|---|---|
| Pela (Rock Hyrax) ⚑ | Common | Small droppings tucked into a crack in the stone. Mogolo says the pela never goes far from home — sensible, for something so small. |
| Tshwene (Baboon) | Common | Scattered prints, in every direction at once. Mogolo shakes his head — a troop of baboons leaves a scene looking like an argument. |
| Nkwe (Leopard) ⚑ | Rare | A single clean print in the dust, and then nothing. Mogolo doesn't say anything at all — some things you're only meant to almost see. |

**Perch tell** *(cost 2)*

| Find | Rarity | Journal line |
|---|---|---|
| Raptor (kestrel / buzzard) ⚑ | Uncommon | A shape circles once, high over the outcrop, and is gone. Mogolo doesn't bother looking up — he says you only see them once they've already decided you're not worth the trouble. |

**Flora tell** *(cost 1)*

| Find | Rarity | Journal line |
|---|---|---|
| Aloe ⚑ | Common | A cluster of thick, spiked leaves wedged into a crack in the stone. Mogolo says it survives on less water than seems fair to anything else out here. |

⚑ **= name offered at lower confidence.** Confirm with a Setswana speaker before this ships as final copy.

### 6.4 A note on totems

Kwena (crocodile) especially, and several others here, are traditional Tswana clan totems. A Discovery entry can carry that weight without asserting which families hold it — the Kwena line above is written that way deliberately. **Naming actual clan-totem pairings should come from firsthand knowledge, not research.** That detail is personal.

> **Quartz Shard is a Discovery, not an item.** Rare finds never enter inventory (R3). There is no `Special` category.

---

## 7. The Field Journal

### 7.1 What it is

One page per scene, listing every find in it, greyed until discovered. Orgainised by real scene — not by category, not alphabetically.

### 7.2 What it rewards: restoration

**The Journal's reward is the restoration of the scene's art** (R5 — the old page buffs are removed).

Complete a scene's page and that scene's background visibly recovers: more plants, more birds, more life. A degraded, over-grazed-looking scene becomes what it was before.

Three milestones per scene is enough — say 40% / 70% / 100% of that scene's finds.

Why this and not a buff:

- It costs no balance. No progression maths to defend.
- It is **permanent and visible**, which a percentage bonus never is.
- It is the most distinctive thing in the design: **the world changes because you paid attention to it.** Postmodern in the only sense that matters here — the player's act of *noticing* is the act that alters the fiction.
- It's already in the Bushveld spec's future scope, so it's a pull-forward rather than new work.

### 7.3 Journal and Pillar 3

This makes the Journal a genuine third pillar alongside Pula and Botho, which it stopped being when the page buffs were removed (C18). It rewards exactly the thing `02 §9` says to reward: something that **cannot be multiplied by grinding**, because the Bushveld's own recovery gates it.

---

## 8. Daily Sparkle

Once per day, **exactly one** Hotspot across all unlocked scenes carries a ✦ badge and a boosted loot table for that day only.

- No claim button, no separate screen. Tapping it works like tapping any other.
- It is chosen by a daily cron from currently-ready Hotspots, written to one row per date.
- **It can land on the same Hotspot as a seasonal badge.** The two are independent and both may apply.
- With Kagiso scarcity, the Sparkle finally does a job: it tells a player with 4 pips *where to spend one of them*.

---

## 9. The calendar

### 9.1 The year is real

The Bushveld follows the **real-world calendar**, not a simulated in-game clock. Every player experiences the same weeks.

```
 1  Ferikgong     5  Motsheganong   9  Lwetse
 2  Tlhakole      6  Seetebosigo   10  Diphalane
 3  Mopitlwe      7  Phukwe        11  Ngwanatsele
 4  Moranang      8  Phatwe        12  Sedimonthole
```

### 9.2 Chapters

| Chapter | Name | Months | Character |
|---|---|---|---|
| 1 | **Sekala sa Pula** | Nov – Jan | Rains. Planting. Water plentiful, the Jojo tank fills itself. |
| 2 | **Sekala sa Phane** | Feb – Apr | Late rains, long growth. The April phane window closes it. |
| 3 | **Sekala sa Moriti** | May – Jul | Dry and cold. Water is the whole game. |
| 4 | **Sekala sa Letlhafula** | Aug – Oct | Harvest, wind, preparation. |

Chapter Tokens are themed per chapter and **expire to zero at chapter end** (`02 §3.3`).

### 9.3 The Mophane event

Mophane worms have **two** real annual windows in Botswana: roughly **Moranang (April)** and **Sedimonthole (December)**.

One named Deadfall Hotspot in Open Bush — **`Setlhare sa Phane`** — behaves as an ordinary wood source for ten months, and serves a Phane-weighted loot table during those two. A small caterpillar badge marks it active.

**Implementation requirement:** this is a plain comparison of the real-world month against `active_months = [4, 12]`. It must be **decoupled from whatever clock drives the farm's seasons** — deliberately, because a real-calendar event and a chapter boundary are two different things and must be allowed to disagree.

Note the consequence and keep it: **the December window falls in Chapter 1, the April window in Chapter 2.** The phane appears in two different chapters, because that is when it actually appears. The calendar is real; the chapters are a frame laid over it. They don't have to nest neatly, and the mismatch is a feature.

### 9.4 Daily proverb

One line from Mogolo, rotating daily. Setswana shown first, English gloss on tap. Purely cosmetic.

| Setswana | Gloss | Confidence |
|---|---|---|
| Motho ke motho ka batho | A person is a person because of other people | High |
| Kgosi ke kgosi ka batho | A chief is a chief because of the people | Medium |
| Pula ke matshelo, ga e a tshaba | Rain is life; it should not be feared | Medium |
| Pula e a na, ga e na noka | Rain falls, but there is no river | Medium |
| Tsela e e telele e simolola ka kgato e le nngwe | A long road begins with a single step | Medium |
| Tsamaya o le nosi, o tla fitlhelela | *(given as)* "Walk slowly and you will arrive" | **Low** |
| Go se leka go ja, go se sepe | Not trying to eat means nothing | **Low** |

Only the first is independently well-established. **This list needs a native-speaker pass more than any other content in the specification.** Three further candidates exist only as English translations from an academic source ("To travel is to see," "Plenty is like the mist," "Famine hides under the granary") and would need their Setswana supplied before joining the rotation.

See also `03 §7` — the proverb should respond to what the player actually did, which is the same rules-table machinery as the Elder's tip.

---

## 10. Data model

```text
bushveld_scenes
  id, slug, name, background_asset_key
  kagiso_max                       -- 6
  kagiso_regen_minutes             -- 240 (tuning range 180-480)
  unlock_condition                 -- null | {botho_gte: 300}
  restoration_asset_keys JSONB     -- [degraded, partial, recovered, full]
  restoration_thresholds JSONB     -- [0.4, 0.7, 1.0]

bushveld_hotspots
  id, scene_id, x, y, sprite_key
  loot_table_id
  kagiso_cost INT                  -- 1 (common/material) | 2 (uncommon/rare/seasonal)
  rest_minutes INT                 -- 60
  seasonal_loot_table_id           -- nullable
  active_months INT[]              -- nullable, e.g. {4,12}

player_scene_state
  player_id, scene_id
  kagiso INT                       -- 0..6
  kagiso_updated_at TIMESTAMPTZ
  PRIMARY KEY (player_id, scene_id)

player_hotspot_state
  player_id, hotspot_id
  last_collected_at TIMESTAMPTZ
  PRIMARY KEY (player_id, hotspot_id)

daily_sparkle
  date DATE PRIMARY KEY
  hotspot_id

field_journal_entries
  player_id, discovery_slug, scene_id, discovered_at
  PRIMARY KEY (player_id, discovery_slug)
```

**Kagiso is computed on read, not by a cron.** `kagiso = min(max, stored + floor((now - kagiso_updated_at) / regen_minutes))`, then persisted on write. No scheduled job, no drift, and it survives a server being down for a week.

---

## 11. API

```text
GET  /bushveld/scenes
  → unlocked scenes with kagiso, kagiso_max, seconds_to_next_pip,
    finds_discovered, finds_total, restoration_stage

GET  /bushveld/scenes/:sceneId
  → hotspots with: position, sprite_key, kagiso_cost,
    state (ready | resting | scene_not_settled),
    eta_seconds if resting,
    is_sparkling_today, is_seasonal_active_today

POST /bushveld/hotspots/:id/collect
  → server recomputes and persists kagiso for the scene
  → 409 if kagiso < hotspot.kagiso_cost        (reason: scene_not_settled)
  → 409 if now - last_collected_at < rest_minutes (reason: hotspot_resting)
  → rolls loot table (seasonal table if current month ∈ active_months;
    rarity weights scaled by kagiso per §4.2; boosted further if sparkling)
  → debits kagiso, updates last_collected_at
  → inserts field_journal_entries on a first-time find
  → recomputes restoration stage
  → returns { reward, is_new_discovery, discovery?, kagiso_remaining,
              restoration_stage_changed? }
```

The client never supplies quantity, rarity or reward. Ever.

---

## 12. Content is data

Every scene, hotspot, loot table, cost, badge and journal line lives in **config and seed**, not code (principle 6 in `01 §4`). Adding a find must not require a deploy of application logic.

Seed requirements for v1: three scenes, 5–8 hotspots each, all journal lines, one seasonal hotspot with `active_months = [4, 12]`, Deep Bushveld's row present with zero hotspots.
