# MOLEMISI
# Bushveld Gameplay — Specification

---

## 1. Core Idea

The Bushveld is a small set of hand-illustrated scenes. Each scene hides a handful of tappable spots — Hotspots. Tapping a ready Hotspot instantly reveals what's there, and that spot then needs time to rest before it can be tapped again. No map to walk, no timer to wait out, no energy to budget.

## 2. Design Principles

- **One tap resolves a Hotspot.** No confirmation step, no menu, no expedition to start and separately collect.
- **Every Hotspot regulates itself.** Its own respawn cooldown is the only gate — there's no shared energy pool to manage or explain.
- **Signs, not live animals.** Every wildlife find is a track, feather, dropping, or fleeting glimpse — never a modeled animal the player fights or chases. This keeps the game casual and safe, and keeps the art budget to footprints and feathers instead of full animated creatures.
- **Content is data, not code.** Scenes, Hotspots, loot tables, and respawn timing all live in configuration and seed data.
- **Nothing is required reading.** Lore and cultural notes are always an optional expandable line, never blocking or mandatory.

---

## 3. The Loop

1. Open the Bushveld → pick one of the unlocked Scenes.
2. The Scene shows background art with 5–8 Hotspots — small animated tells: a rustling bush, fresh tracks, a glint among stones.
3. Tap a ready Hotspot → resolves instantly → reward pops with a small flourish → the Hotspot visually depletes into a resting state.
4. Each Hotspot has its own respawn timer, independent of every other Hotspot.
5. Occasionally a tap is a first-time Discovery — a new plant, animal, or resource — added to the Field Journal with a short line of flavor text.
6. Once a day, exactly one ready Hotspot across all unlocked scenes is marked with a small ✦ badge, carrying a better loot table for that day only.

---

## 4. Casual-Tap Rules

| Action | Max Taps |
|---|---|
| Resolve a Hotspot | 1 |
| Switch Scene | 1 |

- Minimum touch target: 48dp × 48dp on every Hotspot.
- No drag gestures, no timing-based inputs, no combo chains anywhere in the Bushveld.
- Depleted Hotspots stay visible in a resting state rather than disappearing, so the scene reads clearly at a glance.
- No fail states on basic collection — only which reward you get varies, never whether you get one.

---

## 5. Scenes

| Scene | Setswana | Unlock |
|---|---|---|
| Open Bush | Naga e Bulegileng | Available from the start |
| Riverbank | Fa Nokeng | Available from the start |
| Rocky Outcrop | Matlapa a Kwa Godimo | Available from the start |
| Deep Bushveld | *(name not yet set)* | A later community-standing milestone |

Deep Bushveld's unlock condition is a simple threshold check on the scene itself — no separate progression system required — but its actual content (which rarer finds live there) isn't designed yet; see §11.

---

## 6. Scene Content

Each entry below is grouped by its "tell" — the visual cue the player taps — with its rarity and its Field Journal line, written in one consistent voice: **Mogolo**, an elder looking over the player's shoulder, naming what's been found. Common finds get a quick, almost dismissive line; rare finds get a beat of stillness in the writing. Materials get a shorter line on first collection, since there's less to teach about a pile of wood than about an animal's passing.

### Open Bush — Naga e Bulegileng

**Deadfall tell**

| Find | Rarity | Journal Entry |
|---|---|---|
| Dikgong (Wood) | Common | *(first collection)* Good, dry wood. Mogolo doesn't waste words on this one — you'll be collecting a lot of it. |
| Phane (Mophane worms — seasonal) | Rare | The branch is stripped bare, and something has been busy. Mogolo's face changes — this is the one they've been waiting all year to see again. |

**Tracks tell**

| Find | Rarity | Journal Entry |
|---|---|---|
| Tholo (Kudu) | Common | Deep, heart-shaped prints pressed into the sand. Mogolo says a kudu never hurries at dawn — it already knows where it's going. |
| Phuduhudu (Steenbok) | Common | Small, neat prints, close together. Mogolo calls the steenbok the smallest worry in the bush, and the easiest to miss entirely. |
| Kolobe (Warthog) | Uncommon | Blunt prints, dragged at the toe. Mogolo laughs every time — something so low to the ground has no business being that loud. |
| Magogwe (Honey Badger) *(name TBD)* | Rare | Torn earth and a raided nest. Mogolo goes quiet here — you do not want to meet the one who did this. |

**Nest/Feather tell**

| Find | Rarity | Journal Entry |
|---|---|---|
| Kgaka (Guinea Fowl) | Common | A speckled feather caught in the thorn grass. Mogolo says where you find one guinea fowl, six more are already watching you from somewhere close. |
| Manong (Vulture) *(name TBD)* | Rare | A long, dark feather drifts down from nowhere you can see. Mogolo tips his head back — something died near here, and something else already knows it. |

### Riverbank — Fa Nokeng

**Material tells**

| Find | Rarity | Journal Entry |
|---|---|---|
| Letsopa (Clay) | Common | *(first collection)* Cool, heavy clay from the riverbank. Good for building. Better, Mogolo says, for teaching patience. |
| Mokolwane (Palm Fiber) | Common | *(first collection)* Tough palm fronds, ready to be worked. The baskets sold at the Kgotla market all start exactly here. |

**Ripple tell**

| Find | Rarity | Journal Entry |
|---|---|---|
| Catfish *(name TBD)* | Common | The water folds over itself once, near the bank, and goes still again. Mogolo says a catfish sees you long before you ever see it. |
| Kingfisher *(name TBD)* | Uncommon | A flash of blue drops into the water and comes up with something silver. Mogolo says blink at the wrong moment and you've missed the whole hunt. |
| Otter *(name TBD)* | Rare | A smooth, wet groove runs down the bank, still glistening. Mogolo grins at this one — whatever made it was clearly enjoying itself. |

**Muddy-bank Tracks tell**

| Find | Rarity | Journal Entry |
|---|---|---|
| Waterbuck *(name TBD)* | Uncommon | Broad, splayed prints sunk deep at the water's edge. Mogolo says the waterbuck never strays far from the river — it trusts nothing else to save it. |
| Heron/Crane *(name TBD)* | Uncommon | Thin, careful prints, spaced with patience. Mogolo says the heron holds still better than most men manage at anything. |
| Kwena (Crocodile) | Rare | A wide groove drags down into the water and does not come back up the bank. Mogolo goes still, and so should you. |

**Flora**

| Find | Rarity | Journal Entry |
|---|---|---|
| Morula (Marula tree) | Uncommon | Yellow fruit litters the ground beneath the branches. Mogolo says even the elephants know when marula season starts before the people do. |

### Rocky Outcrop — Matlapa a Kwa Godimo

**Glint tell**

| Find | Rarity | Journal Entry |
|---|---|---|
| Matlapa (Stone) | Common | *(first collection)* Plain stone, but there's plenty of it. Mogolo says the rocks remember more than the trees do — they just don't talk about it. |
| Quartz Shard *(journal-only, not a crafting material)* | Rare | A piece of stone catches the light wrong — too clean, too bright for ordinary rock. Mogolo turns it over twice before he says anything at all. |

**Crevice/Track tell**

| Find | Rarity | Journal Entry |
|---|---|---|
| Pela (Rock Hyrax) *(name TBD)* | Common | Small droppings tucked into a crack in the stone. Mogolo says the pela never goes far from home — sensible, for something so small. |
| Tshwene (Baboon) | Common | Scattered prints, in every direction at once. Mogolo shakes his head — a troop of baboons leaves a scene looking like an argument. |
| Nkwe (Leopard) *(name TBD)* | Rare | A single clean print in the dust, and then nothing. Mogolo doesn't say anything at all — some things you're only meant to almost see. |

**Perch tell**

| Find | Rarity | Journal Entry |
|---|---|---|
| Raptor (kestrel/buzzard) *(name TBD)* | Uncommon | A shape circles once, high over the outcrop, and is gone. Mogolo doesn't bother looking up — he says you only see them once they've already decided you're not worth the trouble. |

**Flora**

| Find | Rarity | Journal Entry |
|---|---|---|
| Aloe *(name TBD)* | Common | A cluster of thick, spiked leaves wedged into a crack in the stone. Mogolo says it survives on less water than seems fair to anything else out here. |

*Terms marked (TBD) are offered at lower confidence and worth confirming before they ship as final copy — everything else in this section is at moderate-to-high confidence.*

### A Note on Totems

A few of the animals above — Kwena (crocodile) especially — are traditional Tswana clan totems. A Discovery entry for a totem animal can carry weight without asserting which specific families hold it; the Kwena entry above is written that way deliberately. Naming actual clan-totem pairings is worth doing later, from firsthand knowledge rather than research, given how personal that detail is.

---

## 7. Daily and Seasonal Systems

### 7.1 Daily Sparkle

Once per day, one random ready Hotspot across all unlocked scenes is marked with a small ✦ badge and serves a boosted loot table for that day only. No claim button, no separate screen — tapping it works exactly like tapping any other Hotspot.

### 7.2 The Calendar

```text
1  Ferikgong    5  Motsheganong   9  Lwetse
2  Tlhakole     6  Seetebosigo   10  Diphalane
3  Mopitlwe     7  Phukwe        11  Ngwanatsele
4  Moranang     8  Phatwe        12  Sedimonthole
```

A small label showing the current month can sit anywhere the daily proverb (below) is displayed — pure flavor, no mechanical effect.

### 7.3 The Mophane Event

Mophane worms have two real annual harvest windows in Botswana, roughly **Moranang (April)** and **Sedimonthole (December)**. One specifically-named Deadfall Hotspot in Open Bush — **Setlhare sa Phane** — behaves like an ordinary wood source the other ten months of the year, and serves a Phane-weighted loot table during those two. A small moth/caterpillar badge marks it as active; this badge and the Daily Sparkle badge are independent and can both appear on the same Hotspot at once.

### 7.4 Daily Proverb

A single flavor line, attributed to Mogolo, rotating once a day. Setswana text shown first, with the English gloss available on tap. Purely cosmetic — no loot-table effect.

| Setswana | Gloss | Confidence |
|---|---|---|
| Motho ke motho ka batho | A person is a person because of other people | High |
| Kgosi ke kgosi ka batho | A chief is a chief because of the people | Medium |
| Pula ke matshelo, ga e a tshaba | Rain is life; it should not be feared | Medium |
| Pula e a na, ga e na noka | Rain falls, but there is no river | Medium |
| Tsela e e telele e simolola ka kgato e le nngwe | A long road begins with a single step | Medium |
| Tsamaya o le nosi, o tla fitlhelela | (given as) "Walk slowly and you will arrive" | Low — worth checking |
| Go se leka go ja, go se sepe | Not trying to eat means nothing | Low |
| Go bona leleme la ngwana, ga se go bona leleme la morena | Seeing a child's [tongue/eye] isn't seeing the chief's | Low |

This list needs a native-speaker pass more than any other content in this specification before shipping — several of the sources behind it look like the same article duplicated across low-quality sites rather than independent documentation, and only the first entry is independently well-established elsewhere. Three additional candidates exist only as English translations from an academic source ("To travel is to see," "Plenty is like the mist," "Famine hides under the granary") and would need their original Setswana wording supplied before joining this rotation.

---

## 8. Data Model

```text
BushveldScene
  id, name, background_asset_key, unlock_condition

BushveldHotspot
  id, scene_id, x, y, sprite_key, loot_table_id, respawn_minutes
  seasonal_loot_table_id   -- nullable
  active_months            -- nullable int array, e.g. [4, 12]

PlayerHotspotState
  player_id, hotspot_id, last_collected_at

DailySparkle
  date, hotspot_id
```

Discoveries reuse whatever collection/journal storage exists elsewhere in the codebase rather than a dedicated new table.

## 9. API Surface

```text
GET  /bushveld/scenes/:sceneId
  → hotspots with: position, state (ready | resting), eta_seconds if resting,
    is_sparkling_today, is_seasonal_active_today

POST /bushveld/hotspots/:id/collect
  → checks (now - last_collected_at) >= respawn_minutes, else 409
  → rolls loot_table_id (seasonal table if active, boosted further if
    is_sparkling_today)
  → updates last_collected_at
  → returns { reward, is_new_discovery, discovery? }
```

---

## 10. Simulation Targets

| Rarity Tier | Respawn Target | Rationale |
|---|---|---|
| Common | 20–40 min | Multiple ready on most visits — the reliable, low-effort tap |
| Uncommon | 2–4 hours | Ready again on a second visit within the same day |
| Rare | 8–16 hours | Roughly once per day — a genuine "did I check today" moment |
| Seasonal (Phane) | Gated by month, not a timer | Active every day within its window, ordinary the rest of the year |

Aim for a player checking in once or twice a day to typically find 2–3 ready Hotspots per scene — enough for a satisfying visit without the Bushveld alone consuming the whole daily session. These are starting targets for playtesting, not a validated simulation.

---

## 11. Future Scope

- **Deep Bushveld content.** The scene slot and its unlock condition are ready; the actual rarer Hotspot pool inside it isn't designed yet.
- **A restoration arc.** Tracking overall Journal completion and swapping each scene's background art at a few completion milestones is a natural long-term hook — the same pattern a Building's visual tier-upgrade would use, just applied to scenes. Correctly sequenced after the core loop is proven, not before.
- **More proverbs and more totem detail**, once the confidence flags above are resolved.
