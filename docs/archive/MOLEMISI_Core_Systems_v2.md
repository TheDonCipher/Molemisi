# Molemisi — Core Systems & Progression Specification (v2.0, MVP-Aligned)

**Status:** Locked design intent for MVP, reconciled with the Inventory System and Bushveld Gameplay specifications and the MVP Roadmap. Where this document previously conflicted with either of those two — quality grading, freshness decay, tool durability, tiered buildings beyond Storage, station-gated crafting — this version resolves in favor of the simpler, shipped-first design, with the fuller original vision preserved as Post-MVP Vision (Section 6) rather than deleted.

---

## 1. Inventory System

### 1.1 Categories

| Category (Setswana) | English | Stackable |
|---|---|---|
| DIPEO | Seeds | Yes (99) |
| DIJALO | Raw Crops | Yes (50) |
| DITSHIMOLOGO TSA NAGENG | Wild Forage | Yes (50) |
| DIPHOLOFOLO | Livestock Products | Yes (30) |
| DITSALO | Crafted Materials | Yes (99) |
| DIKUNO | Processed Goods | Yes (20) |
| DIDIRISWA | Tools | No (1 each) |
| Special | Rare Discoveries | Yes (10), not sellable |

The full item list, Setswana naming, and per-item values live in the Inventory System Specification and are not duplicated here — this document governs structure, that one governs content.

### 1.2 Item State (MVP)

An item has a `quantity` and, for tools only, nothing else tracked yet. **No quality grade, no freshness/spoilage timer, no tool durability in MVP** — see Section 6.1 for why, and for how these return later without a schema redesign.

### 1.3 Schema

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Rare Bushveld discoveries (tracks, feathers, mineral glints) never get a row here — they live only in the Field Journal (Section 1.5), as one-time, non-sellable finds.

### 1.4 Storage

One building line, three tiers, raising the inventory slot cap:

| Tier | Name | Approx. Cap |
|---|---|---|
| 1 | Storage Basket | ~24 slots (starting cap) |
| 2 | Storage Shed | ~48 slots |
| 3 | Storehouse | ~96 slots |

No separate Silo, no spoilage-prevention framing — there's no spoilage to prevent yet (Section 6.1).

### 1.5 Field Journal

First-time Bushveld finds — every tell in every scene — write to a Field Journal, organized by scene page (Open Bush, Riverbank, Rocky Outcrop, and Deep Bushveld once it ships). This is new storage, not a reuse of an existing table — nothing like it exists yet.

---

## 2. Crafting System

Five recipes, no dedicated station buildings, no quality inheritance (nothing to inherit). Available directly from the Farm's crafting menu once unlocked.

| Recipe (Setswana) | Output | Input | Fee | Time | Sale Value |
|---|---|---|---|---|---|
| Poleto | Plank | 2× Wood | P1 | 10 min | P7 |
| Thapo | Rope | 3× Palm Fiber | P1 | 10 min | P18 |
| Setene | Brick | 2× Clay | P2 | 15 min | P11 |
| Bupi | Flour | 3× Sorghum or Maize | P2 | 20 min | P20 |
| Borotho | Bread | 2× Flour | P3 | 30 min | P60 |

**Sale values above are corrected from earlier drafts** — see Section 6.2 for why the original numbers didn't work and how these were derived. Plank, Rope, and Brick are primarily building-construction inputs; their sale values exist so they're never a punishing trap if sold instead, not so selling them is the main plan.

### 2.1 Recipe Unlocks

- Poleto, Thapo, Setene: available from the start.
- Bupi: unlocks at Botho 100 (replaces the earlier Dairy/Madila reward — see Section 3, Pillar 2).
- Borotho: unlocks naturally once Bupi is unlocked, since it requires Flour as an input.

### 2.2 Premium Boost Integration

- **Breath of the Land:** instantly completes any active crafting timer. Unchanged.
- **Fertility Shell:** redefined for MVP — the next harvest *sold* gets +50% sale value, rather than a guaranteed quality grade (there's no grade to guarantee). Reverts to a grade-based effect once quality grading ships (Section 6.1).

---

## 3. Building & Infrastructure System

**MVP: single-tier, functional buildings** for Water Source, Kraal (livestock defense), and Farm Boundary — built once, working immediately, no upgrade ladder yet. **Storage is the only tiered building** (Section 1.4). The full multi-tier vision for every building line is preserved in Section 6.3 as the first thing to build after MVP, not abandoned.

Visual progression on building placement/storage-tier-up is rendered in React — sprite or image swap based on tier state. No Phaser dependency (Section 6.4).

---

## 4. The Core Game Loop

### 4.1 Micro Loop (Daily, 5–15 minutes)
1. **Bushveld:** check unlocked scenes, tap whichever Hotspots are ready (one tap each, per the Bushveld Gameplay Specification — no energy budget, no expedition to start).
2. **Farm:** water crops, collect eggs/milk, address any wildlife-defense prompts.
3. **Craft:** start or collect a Poleto/Thapo/Setene/Bupi/Borotho batch.
4. **Market:** sell finished goods and forage, buy seeds.
5. **Kgotla:** deliver a quest item, check community-standing progress.

### 4.2 Macro Loop (Days to Weeks)
- Seasonal shift affects Bushveld art and Market prices, on the game's simulated season clock — a separate clock from the Bushveld's real-calendar Mophane event (Section 6.5 flags this distinction; don't wire the two together).
- Market contracts: multi-day supply agreements at a locked price.
- Community projects: multi-day material-contribution goals at the Kgotla.

### 4.3 Meta Loop (Post-MVP)
Village Evolution (permanent Kgotla/Market visual upgrades from completed community projects), the Bushveld restoration arc, and Master Molemisi/NPC Apprentices are all real, intended features — none are in MVP. Full detail in Section 6.6/6.7.

---

## 5. Progression & Tech Tree — Three Pillars

No player levels. Three independent gates.

### 5.1 Pillar 1 — Infrastructure (Pula Gate)
Building and land-expansion costs (4 → 8 → 12 plots), gated purely by having enough Pula and materials. Costs scale exponentially tier over tier.

### 5.2 Pillar 2 — Social Capital (Botho Gate)
Botho Points **are** the existing community-standing score already tracked at the Kgotla — not a second, parallel counter.

| Botho | Unlocks |
|---|---|
| 100 | Bupi (Flour) recipe |
| 300 | Reserved — Deep Bushveld shows "coming soon" until its content ships |
| 500 | Letsema — one free instant full-harvest per week |
| 1000 | Eligibility for the Monthly Community Prize |

### 5.3 Pillar 3 — Ecological Mastery (Journal Gate)
Journal pages are organized by real Bushveld scene, matching the Field Journal in Section 1.5 — not by invented cross-scene categories. Each completed page grants one permanent buff:

| Page | Buff |
|---|---|
| Open Bush, complete | +5% chance of bonus-yield (one extra unit) on Farm harvests |
| Riverbank, complete | Weather-forecast tooltip, making next-day rain easier to predict |
| Rocky Outcrop, complete | Small discount on the next Storage tier upgrade |
| Deep Bushveld, complete | *(designed alongside that scene's content, post-MVP)* |

### 5.4 The Elder's Guidance
Unchanged in spirit: a small rules table (condition → tip), read from real player state (tank level, weather, Botho total), not a fixed dialogue tree. Content examples should be updated to match Section 5.2/5.3's real gates rather than referencing the Windmill or Dairy directly.

---

## 6. Post-MVP Vision (preserved, not discarded)

### 6.1 Why quality, freshness, and durability wait
These are real, good systems — deliberately deferred because they're interlocking (a decay timer touches inventory, pricing, and crafting all at once) and none of it is required for grow → gather → craft → sell → contract to be complete and playable on its own. They return as additive fields on the schema in Section 1.3, not a redesign: `quality_grade`, `freshness_remaining_days`, `tool_durability` slot back into `player_inventory` when this phase starts.

### 6.2 The crafting-economics fix
The original recipe sale values didn't hold up under their own stated purpose. Working through the actual numbers: Bupi at 3× raw crop (12 Pula) + a 2 Pula fee cost 14 Pula to make, against an 8 Pula sale value — a guaranteed loss, and the same pattern held for every recipe in the original list. "Value Addition" only means something if the output is worth more than the input plus the fee. Section 2's values were recalculated to give each recipe a consistent ~35–40% margin over its input-plus-fee cost after the 5% Market Tax, which is the actual economic reason to craft at all rather than sell raw materials directly.

### 6.3 Full building tiers (first post-MVP phase)
The original three-tier vision for Water Source (Stone Well → Windmill → Solar Borehole), Kraal (Basic Fence → Reinforced Thorns → Stone & Iron), and Farm Boundary (Open Dirt → Picket Fence → Beehive Fence) stands as designed and is the first thing built after MVP ships.

### 6.4 Rendering
React, not Phaser, for all visual state including building/storage tier swaps. This is a confirmed decision, not an open question.

### 6.5 Two different "seasons"
The Macro Loop's simulated season clock (governing weather and market-price cycles) and the Bushveld's real-world-calendar Mophane event are separate mechanisms measuring different things. Keep them decoupled in code — don't let a future refactor quietly merge them.

### 6.6 Village Evolution
Community-project completions driving permanent, shared visual upgrades to the Kgotla and Market scenes. Shared world state, not per-player — confirm this framing again once it's actually scheduled, since it's a different data shape than everything else in this document.

### 6.7 Master Molemisi & NPC Apprentices
A capstone requiring all three pillars at a high threshold, granting a title and one automated daily task. Which task the apprentice automates needs to be decided when this phase starts, not guessed at now.
