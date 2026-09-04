# Document 01: Game Design Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-02

---

## Table of Contents

1. [Game Fantasy](#1-game-fantasy)
2. [Core Game Loop](#2-core-game-loop)
3. [Session Loop](#3-session-loop)
4. [Player Goals](#4-player-goals)
5. [Player Actions](#5-player-actions)
6. [Progression](#6-progression)
7. [Failure and Success States](#7-failure-and-success-states)
8. [Game Pacing](#8-game-pacing)
9. [Farming System](#9-farming-system)
10. [Livestock System](#10-livestock-system)
11. [Buildings System](#11-buildings-system)
12. [Resources](#12-resources)
13. [Time System](#13-time-system)
14. [Market System](#14-market-system)
15. [Production System](#15-production-system)
16. [Kgotla System](#16-kgotla-system)
17. [Bushveld System](#17-bushveld-system)
18. [Automation System](#18-automation-system)
19. [Requirement Traceability](#19-requirement-traceability)

---

## 1. Game Fantasy

**FR-GDS-001**

Molemisi is a pixel-art farm management simulator set in a Botswana-inspired world. The player manages a living, breathing farm that grows, produces, and evolves over time.

The core fantasy: **You are building something that lives.**

The farm is not a backdrop. The farm is your character. Every crop you plant, every animal you raise, every building you construct, and every relationship you build with the Kgotla community tells the story of your growing homestead.

**What the game IS:**

- A cozy, low-stress management experience
- A game about growth, patience, and community
- A game where watching your farm thrive is the reward
- A game with meaningful choices about what to grow, build, and trade
- A game that respects the player's time, including when they are offline

**What the game IS NOT:**

- An action game
- A combat game
- A competitive PvP game
- A game requiring long continuous play sessions
- A game that punishes absence

---

## 2. Core Game Loop

**FR-GDS-002**

The core game loop is a continuous cycle of **Invest → Grow → Harvest → Sell → Invest**.

```
┌─────────────────────────────────────────────────────────┐
│                    CORE GAME LOOP                       │
│                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│   │  INVEST  │───▶│   GROW   │───▶│ HARVEST  │         │
│   │ (plant,  │    │ (wait,   │    │ (collect,│         │
│   │  build,  │    │  water,  │    │  process,│         │
│   │  buy)    │    │  care)   │    │  gather) │         │
│   └──────────┘    └──────────┘    └──────────┘         │
│        ▲                                │               │
│        │          ┌──────────┐          │               │
│        └──────────│   SELL   │◀─────────┘               │
│                   │ (market, │                          │
│                   │ contract,│                          │
│                   │ process) │                          │
│                   └──────────┘                          │
└─────────────────────────────────────────────────────────┘
```

**Key design principle:** Every loop completion should leave the player in a better position than before, but with new options and challenges that create desire to continue.

**Loop cycle times (target):**

- Quick loop (water/harvest): 30 seconds to 2 minutes
- Medium loop (crop cycle): 5-15 real-time minutes per growth stage
- Long loop (building upgrade): 30 minutes to 2 hours
- Extended loop (seasonal goals): Days to weeks

---

## 3. Session Loop

**FR-GDS-003**

Each play session follows this micro-structure:

### Session Entry (0-30 seconds)

1. Player opens the game
2. Offline progression is calculated and displayed (if any time has passed)
3. Notifications are shown (crops ready, animals hungry, events occurred)
4. Player sees their farm in its current state

### Active Play (1-10 minutes)

1. Player addresses urgent needs (watering, harvesting, feeding)
2. Player initiates new actions (planting, building, trading)
3. Player explores optional content (Kgotla, Bushveld)
4. Player checks market prices and plans next moves

### Session Exit

1. Player closes the game
2. Server records `last_active_at` timestamp
3. All game state persists on server
4. Offline simulation begins for eligible systems

**Session frequency target:** 2-5 sessions per day, 1-10 minutes each.

**Critical rule:** A player who plays for 2 minutes twice per day should progress at roughly the same rate as a player who plays for 10 minutes once per day, assuming equivalent resource allocation decisions.

---

## 4. Player Goals

**FR-GDS-004**

### Short-term Goals (per session)

- Harvest ripe crops
- Water crops that need water
- Feed hungry animals
- Collect animal products
- Complete a market sale
- Start a new production job

### Medium-term Goals (days to weeks)

- Complete a building upgrade
- Fill all farm plots with productive crops
- Earn enough currency to buy a new animal
- Build reputation with a Kgotla NPC
- Complete a contract chain
- Unlock a new crop type

### Long-term Goals (weeks to months)

- Fully upgrade all core buildings
- Achieve max reputation with the Kgotla
- Complete the Bushveld discovery collection
- Build an automated farm
- Achieve farm level milestones
- Accumulate significant wealth
- Unlock all crop types and animal types

### Meta Goals

- Create a beautiful, thriving farm
- Help the Kgotla community flourish
- Become the most prosperous farm in the region
- Master all production chains
- Complete all achievements

---

## 5. Player Actions

**FR-GDS-005**

All player actions are point-and-click or tap interactions. The player never moves a character. Actions are performed by selecting farm elements and choosing contextual actions.

### Farm Actions

| Action          | Trigger                             | Cost            | Result                            |
| --------------- | ----------------------------------- | --------------- | --------------------------------- |
| Plant crop      | Select empty plot → choose seed     | Seed cost       | Crop planted, plot occupied       |
| Water crop      | Select crop → water action          | Water resource  | Crop hydration increases          |
| Fertilize crop  | Select crop → fertilize action      | Fertilizer cost | Growth speed boost                |
| Harvest crop    | Select mature crop → harvest action | Free            | Crop added to inventory           |
| Clear plot      | Select plot → clear action          | Free            | Plot becomes empty                |
| Feed animal     | Select animal → feed action         | Feed cost       | Animal fed                        |
| Collect product | Select animal → collect action      | Free            | Animal product added to inventory |
| Pet animal      | Select animal → pet action          | Free            | Animal happiness increases        |

### Building Actions

| Action             | Trigger                              | Cost                              | Result                             |
| ------------------ | ------------------------------------ | --------------------------------- | ---------------------------------- |
| Construct building | Select build menu → choose building  | Construction materials + currency | Building under construction        |
| Upgrade building   | Select building → upgrade action     | Upgrade cost                      | Building upgrade begins            |
| Enter building     | Select building → enter action       | Free                              | Building UI opens                  |
| Collect production | Select production building → collect | Free                              | Processed items added to inventory |
| Start production   | Select production building → start   | Input materials                   | Production job begins              |

### Market Actions

| Action          | Trigger                          | Cost     | Result                  |
| --------------- | -------------------------------- | -------- | ----------------------- |
| Buy item        | Open market → select item → buy  | Currency | Item added to inventory |
| Sell item       | Open market → select item → sell | Free     | Currency earned         |
| Accept contract | Open contracts → select contract | Free     | Contract begins         |

### Kgotla Actions

| Action       | Trigger                          | Cost      | Result              |
| ------------ | -------------------------------- | --------- | ------------------- |
| Talk to NPC  | Select NPC → talk                | Free      | Dialogue opens      |
| Accept quest | NPC offers quest → accept        | Free      | Quest begins        |
| Donate       | Select donation option → confirm | Resources | Reputation gained   |
| Attend event | Event available → attend         | Free      | Event participation |

### Bushveld Actions

| Action            | Trigger                       | Cost   | Result                      |
| ----------------- | ----------------------------- | ------ | --------------------------- |
| Explore zone      | Select Bushveld → choose zone | Energy | Zone exploration begins     |
| Gather resource   | Select resource node → gather | Free   | Resource added to inventory |
| Discover landmark | Random during exploration     | Free   | Discovery recorded          |

---

## 6. Progression

**FR-GDS-006**

### Farm Level

The player's farm has a level that represents overall progression. Farm level is earned through cumulative experience points (XP).

**XP Sources:**

| Action                 | XP Gained  |
| ---------------------- | ---------- |
| Plant a crop           | 5          |
| Harvest a crop         | 10         |
| Water a crop           | 2          |
| Feed an animal         | 3          |
| Collect animal product | 8          |
| Construct a building   | 25         |
| Upgrade a building     | 50         |
| Complete a market sale | 5 per sale |
| Complete a contract    | 30         |
| Kgotla donation        | 15         |
| Bushveld discovery     | 20         |

**Level Requirements:**

| Level | Total XP Required | Cumulative XP |
| ----- | ----------------- | ------------- |
| 1     | 0                 | 0             |
| 2     | 100               | 100           |
| 3     | 250               | 350           |
| 4     | 500               | 850           |
| 5     | 1,000             | 1,850         |
| 6     | 1,750             | 3,600         |
| 7     | 3,000             | 6,600         |
| 8     | 5,000             | 11,600        |
| 9     | 8,000             | 19,600        |
| 10    | 12,000            | 31,600        |

Formula: `level_xp_required = 100 * (level ^ 1.5)` (rounded up to nearest 50)

**Level Rewards:** Each level unlocks specific content (see Section 15 Content Data Specification).

### Skill Categories

Three skill categories track specialization:

**Farming Skill**

- Levels 1-10
- Unlocks: advanced crops, growth speed bonuses, yield bonuses, disease resistance
- XP gained from: planting, harvesting, watering, fertilizing

**Husbandry Skill**

- Levels 1-10
- Unlocks: animal types, feed efficiency, production bonuses, breeding
- XP gained from: feeding, collecting, petting, health management

**Trading Skill**

- Levels 1-10
- Unlocks: market tiers, contract difficulty, price bonuses, bulk trading
- XP gained from: market sales, contract completion, Kgotla reputation

### Unlock Schedule

| Farm Level | Farming Unlocks | Husbandry Unlocks | Trading Unlocks  |
| ---------- | --------------- | ----------------- | ---------------- |
| 1          | Sorghum, Maize  | Chickens          | Basic market     |
| 2          | Millet          | Goats             | Sell contracts   |
| 3          | Cowpeas         | -                 | Buy contracts    |
| 4          | Groundnuts      | Cattle            | Bulk sell        |
| 5          | Sesame          | -                 | Contract chains  |
| 6          | Watermelon      | Pigs              | Premium market   |
| 7          | Tomatoes        | -                 | Export contracts |
| 8          | Pepper          | Donkeys           | Trade routes     |
| 9          | Herbs           | Horses            | Master contracts |
| 10         | Saffron         | -                 | Elite trading    |

---

## 7. Failure and Success States

**FR-GDS-007**

### Failure States

Molemisi avoids hard failure. There is no "game over."

**Soft failures (recoverable):**

- Crop dies from neglect (no watering for 3+ days) → Plot is cleared, seed cost lost
- Animal becomes unhealthy (not fed for 2+ days) → Production stops until fed
- Contract deadline missed → Reputation penalty, no reward
- Insufficient funds → Cannot buy/build, must earn more
- Building maintenance neglected → Building temporarily disabled until repaired

**Failure recovery:**

- Dead crops can be replanted immediately
- Unhealthy animals recover after 2 feedings
- Reputation recovers through future contract completion
- Building repairs cost 25% of original construction cost

### Success States

Success is continuous and layered:

**Micro-success:** Every harvest, every sale, every collected product
**Meso-success:** Every building upgrade, every contract completion, every new animal
**Macro-success:** Every farm level, every skill unlock, every major milestone
**Meta-success:** Farm aesthetic, community standing, completion percentage

### Win Condition

There is no single win condition. The game is designed for indefinite play with ongoing goals. The closest analogues to "beating" the game:

- Reach farm level 10
- Complete all achievements
- Fully upgrade all buildings
- Max all three skill trees
- Complete all Kgotla quest lines
- Fully explore all Bushveld zones

---

## 8. Game Pacing

**FR-GDS-008**

### Pacing Model

The game uses a **growing complexity** model. Early gameplay is simple and teaches core mechanics. Later gameplay adds layers of complexity that interact with each other.

**Phase 1: Learning (Farm Levels 1-3)**

- 4-6 farm plots
- 2 crop types
- 1 animal type (chickens)
- 2 buildings
- Basic market
- Focus: plant → water → harvest → sell

**Phase 2: Expanding (Farm Levels 4-6)**

- 8-12 farm plots
- 6 crop types
- 2 animal types
- 4 buildings
- Production chains
- Kgotla introduction
- Focus: optimization, multi-step processes

**Phase 3: Mastering (Farm Levels 7-10)**

- 16-20 farm plots
- 10 crop types
- 5 animal types
- 6+ buildings
- Full production chains
- Bushveld exploration
- Automation
- Focus: efficiency, automation, completion

### Time Investment Curve

| Farm Level | Daily Time to Maintain | Daily Time to Progress |
| ---------- | ---------------------- | ---------------------- |
| 1-3        | 1-2 minutes            | 3-5 minutes            |
| 4-6        | 2-3 minutes            | 5-10 minutes           |
| 7-10       | 3-5 minutes            | 8-15 minutes           |

**"Time to maintain"** = minimum time to keep all existing assets productive (water, feed, harvest)
**"Time to progress"** = additional time to advance toward new goals

### Offboarding Prevention

The game avoids situations where a player returns after absence and faces overwhelming cleanup:

- Offline simulation caps at 24 hours of accumulation
- Crops die but plots auto-clear after 7 days offline
- Animals enter a "self-sustaining" mode after 3 days offline (reduced production but no death)
- Building maintenance pauses rather than degrading

---

## 9. Farming System

**FR-FARM-001**

### Plots

The farm consists of a grid of plots. Each plot can hold one crop at a time.

**Plot states:**

- `EMPTY` → Available for planting
- `PLANTED` → Crop planted, waiting for growth
- `GROWING` → Crop is actively growing (needs water)
- `READY` → Crop is ready for harvest
- `WITHERED` → Crop has died (auto-clears after 24 hours)

**Plot progression:**

```
EMPTY → PLANTED → GROWING (stage 1) → GROWING (stage 2) → ... → GROWING (stage N) → READY
                                    ↓                                          ↓
                              (no water)                                  (neglected)
                                    ↓                                          ↓
                              GROWING (paused)                           WITHERED → EMPTY
```

**Starting plots:** 4 plots (expandable to 20 via progression)

### Crop Lifecycle

Each crop type defines:

- **Growth stages:** Number of visual stages (typically 4-6)
- **Growth time per stage:** Real-time minutes per stage (affected by watering)
- **Water requirement:** How often the crop needs water per growth stage
- **Fertilizer effect:** Percentage speed increase from fertilization
- **Disease chance:** Base probability of disease per growth stage
- **Pest chance:** Base probability of pest damage per growth stage
- **Yield range:** Min/max harvest quantity
- **Quality tiers:** Probability distribution for quality levels

**Growth formula:**

```
effective_growth_time = base_growth_time * (1 - fertilizer_bonus) * water_efficiency
```

Where:

- `water_efficiency` = 1.0 when fully watered, 0.5 when half-watered, 0.0 when dry
- `fertilizer_bonus` = 0.0 to 0.3 (0% to 30% speed increase)

### Crop Types (MVP)

| Crop       | Growth Stages | Time/Stage | Water/Stage | Yield | Base Sell Price | Unlock Level |
| ---------- | ------------- | ---------- | ----------- | ----- | --------------- | ------------ |
| Sorghum    | 4             | 3 min      | 1           | 3-5   | 15              | 1            |
| Maize      | 5             | 4 min      | 2           | 4-6   | 20              | 1            |
| Millet     | 4             | 2.5 min    | 1           | 2-4   | 12              | 2            |
| Cowpeas    | 4             | 3.5 min    | 1           | 3-5   | 18              | 3            |
| Groundnuts | 5             | 5 min      | 2           | 4-7   | 25              | 4            |
| Sesame     | 4             | 4 min      | 1           | 2-3   | 35              | 5            |
| Watermelon | 6             | 5 min      | 3           | 2-4   | 40              | 6            |
| Tomatoes   | 5             | 3 min      | 2           | 5-8   | 22              | 7            |
| Pepper     | 4             | 4 min      | 1           | 3-5   | 45              | 8            |
| Herbs      | 3             | 6 min      | 1           | 1-3   | 80              | 9            |
| Saffron    | 5             | 8 min      | 1           | 1-2   | 200             | 10           |

### Watering

Water is a consumable resource. Crops require watering at regular intervals.

**Water mechanics:**

- Each crop has a `hydration` value from 0.0 to 1.0
- Hydration decreases by `water_decay_rate` per game hour
- Each crop type defines `water_decay_rate` (base: 0.1 per game hour)
- Watering increases hydration by 0.3 per action
- Maximum hydration: 1.0
- Growth pauses when hydration drops below 0.2
- Growth speed scales linearly: `growth_multiplier = hydration` (0.2 to 1.0)

**Water sources:**

- Rain (weather-dependent, automatic)
- Well (built structure, unlimited water, manual action)
- Irrigation (upgrade, automatic watering)
- Water tank (stored water, finite capacity)

### Fertilization

Fertilizer is a consumable resource that speeds up growth.

**Fertilizer types:**

| Type             | Growth Speed Bonus | Duration     | Cost        |
| ---------------- | ------------------ | ------------ | ----------- |
| Compost          | +10%               | Single stage | 10 currency |
| Manure           | +20%               | Single stage | 25 currency |
| Super fertilizer | +30%               | Two stages   | 60 currency |

**Fertilizer application:**

- Apply to a single plot
- Effect is immediate and applies to the current growth stage
- Cannot stack multiple fertilizers on the same plot simultaneously
- Effect is consumed when the growth stage completes

### Disease and Pests

**Disease system:**

- Each crop has a base disease probability per growth stage
- Disease probability increases if hydration is low (<0.3)
- Disease probability increases in humid weather
- Disease reduces yield by 25-50%
- Disease can be treated with pesticide (consumable item)

**Pest system:**

- Each crop has a base pest probability per growth stage
- Pest probability increases during warm, dry weather
- Pests reduce yield by 15-35%
- Pests can be deterred with natural repellent (consumable item)

**Disease/Pest probability formula:**

```
disease_chance = base_disease_chance * (1 + humidity_modifier * weather_humidity)
                * (1 - drought_modifier * max(0, 0.3 - hydration))

pest_chance = base_pest_chance * (1 + warmth_modifier * temperature_factor)
             * (1 - rain_modifier * weather_rain)
```

### Harvesting

When a crop reaches the READY state:

- Player selects the plot and chooses "Harvest"
- Yield is calculated: `yield = random(min_yield, max_yield) * quality_multiplier`
- Quality is determined by: `quality = f(hydration_consistency, fertilizer_used, disease_free, pest_free)`
- Harvested items are added to inventory
- Plot returns to EMPTY state

**Quality tiers:**

| Tier      | Quality Range | Price Multiplier |
| --------- | ------------- | ---------------- |
| Poor      | 0.0 - 0.3     | 0.5x             |
| Normal    | 0.3 - 0.7     | 1.0x             |
| Good      | 0.7 - 0.9     | 1.5x             |
| Excellent | 0.9 - 1.0     | 2.0x             |

**Quality score formula:**

```
quality = 0.4 * hydration_consistency + 0.2 * fertilizer_bonus + 0.2 * (1 - disease_events) + 0.2 * (1 - pest_events)
```

Where each factor is normalized to [0, 1].

---

## 10. Livestock System

**FR-LIVESTOCK-001**

### Animal Types (MVP)

| Animal  | Feed/Day | Products         | Production Cycle | Capacity             | Unlock Level |
| ------- | -------- | ---------------- | ---------------- | -------------------- | ------------ |
| Chicken | 2 feed   | Eggs (2/day)     | 12 hours         | 1 coop (10 chickens) | 1            |
| Goat    | 4 feed   | Milk (1/day)     | 24 hours         | 1 pen (5 goats)      | 3            |
| Cow     | 8 feed   | Milk (3/day)     | 24 hours         | 1 paddock (3 cows)   | 5            |
| Pig     | 6 feed   | Truffle (random) | 48 hours         | 1 pen (4 pigs)       | 6            |

### Animal States

Each animal has:

- `hunger`: 0.0 to 1.0 (decreases over time, refilled by feeding)
- `health`: 0.0 to 1.0 (decreases if hunger < 0.2 for extended time)
- `happiness`: 0.0 to 1.0 (increases with petting, decreases if overcrowded)
- `product_ready`: boolean (true when product is available)
- `product_timer`: time until next product

**Hunger decay:** -0.15 per game hour (adjustable per animal type)
**Health decay:** -0.1 per game hour when hunger < 0.2
**Happiness decay:** -0.05 per game hour when overcrowded or not petted for 24 hours

### Feeding

- Feed is a consumable resource (grain, hay, mixed feed)
- Each animal type consumes a specific amount per day
- Feeding increases hunger by 0.3 per action
- Overfeeding has no benefit but wastes feed

### Production

- Production starts when hunger > 0.5 and health > 0.5
- Production timer runs in real-time (affected by offline simulation)
- Product is available when timer reaches zero
- Collection requires player action (tap to collect)
- Product quality depends on: happiness, health, feed quality

### Health Management

- Animals can become sick if hunger stays below 0.2 for more than 6 game hours
- Sick animals produce nothing until treated
- Treatment requires medicine (purchased from market or Kgotla)
- Treatment restores health to 0.5 over 12 game hours

---

## 11. Buildings System

**FR-BUILD-001**

### Building Types (MVP)

| Building          | Base Cost                        | Construction Time | Capacity            | Function          | Unlock Level |
| ----------------- | -------------------------------- | ----------------- | ------------------- | ----------------- | ------------ |
| Well              | 200 currency, 10 stone           | 30 min            | Unlimited water     | Water source      | 1            |
| Coop              | 150 currency, 5 wood             | 20 min            | 10 chickens         | Houses chickens   | 1            |
| Barn              | 500 currency, 20 wood, 10 stone  | 1 hour            | 50 inventory slots  | Storage expansion | 2            |
| Goat Pen          | 300 currency, 10 wood            | 30 min            | 5 goats             | Houses goats      | 3            |
| Mill              | 400 currency, 15 stone, 5 wood   | 45 min            | 1 production line   | Processes grain   | 4            |
| Paddock           | 800 currency, 30 wood, 15 stone  | 1.5 hours         | 3 cows              | Houses cattle     | 5            |
| Pig Pen           | 600 currency, 20 wood, 10 stone  | 1 hour            | 4 pigs              | Houses pigs       | 6            |
| Irrigation System | 1000 currency, 30 stone, 10 iron | 2 hours           | 8 plots             | Auto-waters crops | 7            |
| Warehouse         | 2000 currency, 50 wood, 30 stone | 3 hours           | 200 inventory slots | Large storage     | 8            |

### Building States

- `CONSTRUCTION` → Building is being built (timer counting down)
- `ACTIVE` → Building is operational
- `MAINTENANCE_NEEDED` → Building needs repair (after 7 days of use)
- `DISABLED` → Building is non-functional (maintenance overdue by 3+ days)

### Construction

1. Player selects building from build menu
2. Resources are deducted from inventory
3. Construction timer begins
4. Building appears as "under construction" visual state
5. When timer completes, building becomes ACTIVE

### Upgrades

Each building has 3 upgrade levels:

- **Level 1:** Base functionality
- **Level 2:** +50% capacity, reduced maintenance frequency
- **Level 3:** +100% capacity, premium functionality

Upgrade cost formula: `upgrade_cost = base_cost * (2 ^ (level - 1))`

### Maintenance

- Each building accumulates `wear` over time
- Wear increases with each use
- At 100% wear, building enters MAINTENANCE_NEEDED
- Repair cost: 25% of original construction cost
- Neglect (3+ days at MAINTENANCE_NEEDED) → DISABLED state
- DISABLED buildings cannot function until repaired (50% of original cost)

---

## 12. Resources

**FR-RES-001**

### Currency

**Pula (P)** — the primary currency.

**Sources:**

- Market sales
- Contract rewards
- Kgotla quest rewards
- Bushveld rare finds
- Offspring sales (livestock)

**Sinks:**

- Seed purchases
- Building construction/upgrades
- Animal purchases
- Feed purchases
- Tool purchases
- Fertilizer purchases
- Medicine purchases
- Market buy orders
- Building maintenance

### Water

Water is a consumable resource measured in units.

**Sources:**

- Well: 10 units per action (unlimited)
- Rain: 2-5 units per rain event (weather-dependent)
- Water tank: stored water, finite capacity

**Usage:**

- Watering a crop: 1 unit per action
- Irrigation system: 2 units per game hour (automatic)

### Agricultural Resources

| Resource   | Source                     | Usage             |
| ---------- | -------------------------- | ----------------- |
| Seeds      | Market, contracts, harvest | Planting          |
| Feed       | Market, mill processing    | Animal feeding    |
| Fertilizer | Market, composting         | Crop speed boost  |
| Pesticide  | Market, Kgotla             | Disease treatment |
| Medicine   | Market, Kgotla             | Animal health     |

### Construction Materials

| Material | Source           | Usage                 |
| -------- | ---------------- | --------------------- |
| Wood     | Market, Bushveld | Building construction |
| Stone    | Market, Bushveld | Building construction |
| Iron     | Market, Bushveld | Advanced construction |
| Clay     | Market, Bushveld | Pottery, buildings    |
| Thatch   | Market, Bushveld | Roofing, decoration   |

### Livestock Resources

| Resource | Source        | Usage                 |
| -------- | ------------- | --------------------- |
| Eggs     | Chickens      | Selling, cooking      |
| Milk     | Goats, Cows   | Selling, processing   |
| Truffles | Pigs          | Selling, luxury items |
| Wool     | Goats         | Selling, crafting     |
| Manure   | All livestock | Fertilizer            |

### Processed Resources

| Resource | Input         | Processing | Output              |
| -------- | ------------- | ---------- | ------------------- |
| Flour    | Grain (any)   | Mill       | 3 flour per grain   |
| Butter   | Milk          | Dairy      | 2 butter per milk   |
| Cheese   | Milk          | Dairy      | 1 cheese per 3 milk |
| Leather  | Hide          | Tannery    | 1 leather per hide  |
| Bread    | Flour + Water | Bakery     | 2 bread per flour   |

---

## 13. Time System

**FR-TIME-001**

### Game Time

Molemisi uses a persistent game clock that advances in real-time.

**Time unit:** 1 real-time minute = 1 game hour

**Game day:** 24 game hours = 24 real-time minutes

**Game week:** 7 game days = 168 real-time minutes (2.8 hours)

**Game season:** 4 weeks = 672 real-time minutes (11.2 hours)

**Game year:** 4 seasons = 2,688 real-time minutes (44.8 hours ≈ 1.9 days)

### Time Progression

The server maintains a `last_simulated_at` timestamp. When a player connects or when simulation is triggered:

```
elapsed_hours = (current_time - last_simulated_at) / 60
```

All time-based systems are calculated using `elapsed_hours`.

### Offline Progression

**FR-TIME-002**

When a player is offline, the server simulates the effects of elapsed time:

**Crops:**

- Growth advances based on elapsed time
- Hydration decays (minimum: 0.0)
- Disease/pest checks are performed at each growth stage boundary
- Crops that wither are auto-cleared after 24 hours

**Livestock:**

- Hunger decays
- Production timers advance
- Health decays if hunger < 0.2
- After 3 days offline: animals enter "self-sustaining" mode
  - Hunger decays at 25% rate
  - No production
  - No health decay
  - Minimum hunger: 0.1

**Buildings:**

- Wear accumulates
- Production timers advance

**Offline cap:** Maximum 24 hours of simulation. Beyond 24 hours, systems pause.

### Seasons

| Season | Duration | Effects                                           |
| ------ | -------- | ------------------------------------------------- |
| Spring | 4 weeks  | +10% growth speed, rain chance: 40%               |
| Summer | 4 weeks  | Normal growth, rain chance: 15%, heat stress      |
| Autumn | 4 weeks  | +5% growth speed, rain chance: 30%, harvest bonus |
| Winter | 4 weeks  | -20% growth speed, rain chance: 10%, frost risk   |

**Season effects:**

- Spring: Best planting season, more rain
- Summer: Hot, less rain, pest risk higher
- Autumn: Harvest season, good weather
- Winter: Cold, slow growth, frost can damage unprotected crops

### Weather

**FR-TIME-003**

Weather changes every 6 game hours (6 real-time minutes).

**Weather types:**

| Weather | Probability | Effects                                      |
| ------- | ----------- | -------------------------------------------- |
| Clear   | 40%         | Normal conditions                            |
| Cloudy  | 25%         | -5% growth speed                             |
| Rain    | 20%         | +20% hydration to all crops, free watering   |
| Storm   | 10%         | Crop damage risk (5%), +40% hydration        |
| Drought | 5%          | -50% hydration decay speed, +30% pest chance |

---

## 14. Market System

**FR-MARKET-001**

### Market Overview

The market is where players buy and sell goods. The market uses dynamic pricing based on supply and demand.

### Buying

Players can purchase:

- Seeds (for planting)
- Feed (for animals)
- Construction materials
- Tools (fertilizer, pesticide, medicine)
- Animals

All purchases use Pula currency.

### Selling

Players can sell:

- Harvested crops
- Animal products
- Processed goods
- Rare Bushveld finds

### Dynamic Pricing

**FR-MARKET-002**

The market uses a **server-authoritative dynamic pricing model**.

**Price formula:**

```
current_price = base_price * (1 + demand_modifier - supply_modifier) * season_modifier * event_modifier
```

Where:

- `base_price`: Fixed per item type
- `demand_modifier`: Increases when item is scarce (no recent sales from this player)
- `supply_modifier`: Decreases when item is oversupplied (many recent sales)
- `season_modifier`: 0.8 to 1.2 based on seasonal demand
- `event_modifier`: 0.5 to 2.0 based on active market events

**Price update frequency:** Every 6 game hours (server-side calculation)

**Price bounds:** `current_price` is clamped to `[base_price * 0.5, base_price * 2.0]`

### Supply and Demand

The market tracks global supply and demand for each item:

- `global_supply`: Total items available for sale globally
- `global_demand`: Total items wanted for purchase globally
- Supply/demand ratio affects price

### Market Events

Random events that affect market prices for limited durations:

| Event           | Effect                  | Duration      |
| --------------- | ----------------------- | ------------- |
| Drought         | +50% grain prices       | 24 game hours |
| Festival        | +30% food prices        | 12 game hours |
| Trade caravan   | -20% material prices    | 6 game hours  |
| Pest outbreak   | -40% crop prices        | 12 game hours |
| Community feast | +100% ingredient demand | 8 game hours  |

### Contracts

**FR-MARKET-003**

Contracts are special market orders with requirements and rewards.

**Contract structure:**

```
{
  "id": "contract_001",
  "type": "DELIVERY",
  "requirements": {
    "items": [{"type": "maize", "quantity": 10, "quality_min": "normal"}],
    "deadline": "48 game hours"
  },
  "rewards": {
    "currency": 500,
    "reputation": 50,
    "items": [{"type": "rare_seed", "quantity": 1}]
  },
  "difficulty": "MEDIUM"
}
```

**Contract types:**

- `DELIVERY`: Deliver specified items by deadline
- `CULTIVATION`: Grow specific crops to specific quality
- `LIVESTOCK`: Produce animal products
- `EXPLORATION`: Find specific Bushveld resources
- `COMMUNITY`: Help Kgotla NPCs with tasks

---

## 15. Production System

**FR-PROD-001**

### Processing Chains

Production buildings process raw materials into refined goods.

**Mill:**

- Input: Grain (sorghum, maize, millet)
- Output: Flour
- Time: 30 minutes per batch
- Batch size: 5 grain → 15 flour

**Dairy:**

- Input: Milk (goat, cow)
- Output: Butter or Cheese
- Time: 45 minutes per batch
- Batch size: 5 milk → 10 butter OR 3 cheese

**Tannery:**

- Input: Hide
- Output: Leather
- Time: 60 minutes per batch
- Batch size: 3 hide → 2 leather

**Bakery:**

- Input: Flour + Water
- Output: Bread
- Time: 20 minutes per batch
- Batch size: 5 flour → 10 bread

### Production Queues

Each production building has a queue:

- Maximum queue length: 5 jobs
- Jobs process sequentially
- Player can cancel queued jobs (materials returned)
- Player can collect completed jobs at any time

### Production State

Each production job tracks:

- `input_items`: Materials consumed
- `output_items`: Materials to produce
- `start_time`: When production began
- `end_time`: When production will complete
- `progress`: 0.0 to 1.0

---

## 16. Kgotla System

**FR-KGOTLA-001**

### Kgotla Overview

The Kgotla is the community hub where the player interacts with NPCs, takes on quests, builds reputation, and participates in community events.

### NPCs (MVP)

| NPC         | Role             | Personality            | Quest Type          |
| ----------- | ---------------- | ---------------------- | ------------------- |
| Elder Neo   | Community leader | Wise, patient          | Community projects  |
| Mama Naledi | Market trader    | Shrewd, fair           | Trade quests        |
| Oupa Kabelo | Builder          | Hardworking, gruff     | Construction quests |
| Refilwe     | Herbalist        | Knowledgeable, kind    | Gathering quests    |
| Thabo       | Farmer           | Competitive, ambitious | Farming challenges  |

### Reputation

Each NPC has a reputation meter:

- Range: -100 to 100
- Starts at 0
- Increases through: completing quests, donating, helping
- Decreases through: breaking contracts, ignoring requests, negative choices
- Higher reputation unlocks: better contracts, exclusive items, discounts, story content

**Reputation tiers:**

| Tier         | Range      | Effects                             |
| ------------ | ---------- | ----------------------------------- |
| Stranger     | -100 to -1 | Basic interactions only             |
| Acquaintance | 0 to 24    | Standard market access              |
| Friend       | 25 to 49   | Better prices, minor quests         |
| Trusted      | 50 to 74   | Exclusive items, major quests       |
| Respected    | 75 to 100  | Premium contracts, community leader |

### Contracts (Kgotla)

Kgotla NPCs offer special contracts with community-oriented goals:

- Donate food for a community feast
- Help build a community structure
- Grow specific crops for an event
- Find rare items in the Bushveld
- Teach a new farmer (tutorial quest)

### Community Projects

Large-scale projects that benefit the whole community:

- Build a school
- Create a water reservoir
- Establish a community garden
- Host a festival
- Build a clinic

These require multiple contributions from the player and have significant rewards.

### Events

Periodic community events:

- Harvest festival (every 4 game weeks)
- Market day (every 2 game weeks)
- Community meeting (every game week)
- Seasonal celebrations (start of each season)

---

## 17. Bushveld System

**FR-BUSHVELD-001**

### Bushveld Overview

The Bushveld is the wild area surrounding the farm where players can explore, gather resources, and discover rare items.

### Zones

| Zone          | Difficulty | Resources                 | Discovery Chance | Unlock Level |
| ------------- | ---------- | ------------------------- | ---------------- | ------------ |
| Near Bush     | Easy       | Wood, Stone, Thatch       | 5%               | 2            |
| Deep Bush     | Medium     | Iron, Clay, Rare herbs    | 10%              | 5            |
| River Bank    | Medium     | Clay, Fish, Reeds         | 8%               | 4            |
| Rocky Outcrop | Hard       | Stone, Iron, Gems         | 15%              | 7            |
| Ancient Ruins | Very Hard  | Artifacts, Rare materials | 25%              | 9            |

### Resource Nodes

Each zone has resource nodes that regenerate over time.

**Node lifecycle:**

- `AVAILABLE` → Can be gathered
- `GATHERING` → Player is gathering (2-5 second action)
- `DEPLETED` → Node exhausted, regeneration timer starts
- `REGENERATING` → Timer counting down to AVAILABLE

**Regeneration time:** 30-120 game hours depending on zone and resource type

### Exploration

Exploration is a simple action:

1. Player selects a zone
2. Player spends energy (restores over time)
3. Exploration yields resources, discoveries, or nothing
4. Exploration time: 30 seconds to 2 minutes depending on zone

### Energy System

- Maximum energy: 100
- Exploration cost: 10-30 energy depending on zone
- Energy regenerates: 1 per game hour
- Energy does not regenerate faster offline

### Rare Discoveries

**FR-BUSHVELD-002**

Rare discoveries are special finds during exploration:

| Discovery       | Zone          | Chance | Value                |
| --------------- | ------------- | ------ | -------------------- |
| Ancient pottery | Ancient Ruins | 2%     | 500 currency         |
| Wild saffron    | Deep Bush     | 1%     | 1000 currency        |
| Fossil          | Rocky Outcrop | 3%     | 300 currency         |
| Hidden spring   | River Bank    | 2%     | +5 water capacity    |
| Seed cache      | Near Bush     | 5%     | 10 random seeds      |
| Artisan tool    | Ancient Ruins | 1%     | Permanent +10% yield |

---

## 18. Automation System

**FR-AUTO-001**

Automation unlocks through progression and reduces repetitive actions.

### Irrigation System

- **Unlock:** Farm level 7
- **Cost:** 1000 Pula, 30 stone, 10 iron
- **Capacity:** 8 plots
- **Function:** Automatically waters connected plots every 6 game hours
- **Water cost:** 2 units per game hour
- **Limitation:** Does not work during drought

### Auto Feeder

- **Unlock:** Farm level 8
- **Cost:** 1500 Pula, 20 wood, 15 iron
- **Capacity:** 2 animal buildings
- **Function:** Automatically feeds animals when hunger < 0.5
- **Feed cost:** Normal feed consumption

### Auto Collector

- **Unlock:** Farm level 9
- **Cost:** 2000 Pula, 30 iron, 10 rare materials
- **Capacity:** 3 animal buildings
- **Function:** Automatically collects animal products when ready
- **Limitation:** Still requires inventory space

### Production Automation

- **Unlock:** Farm level 10
- **Cost:** 3000 Pula, 50 iron, 20 rare materials
- **Capacity:** All production buildings
- **Function:** Automatically starts production when materials available
- **Limitation:** Requires configured recipe

### Automation Philosophy

Automation does not replace player decision-making. It replaces repetitive physical actions:

- The player still decides WHAT to plant
- The player still decides HOW MANY animals to keep
- The player still decides WHAT to produce
- Automation handles the mechanical "click to water" / "click to feed" actions

---

## 19. Requirement Traceability

Each major feature maps to implementation across documents:

| Requirement ID   | Feature      | Design | Simulation | Database | API | Rendering | UI/UX | Testing |
| ---------------- | ------------ | ------ | ---------- | -------- | --- | --------- | ----- | ------- |
| FR-GDS-001       | Game Fantasy | §1     | -          | -        | -   | §04       | §03   | -       |
| FR-GDS-002       | Core Loop    | §2     | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-FARM-001      | Farming      | §9     | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-LIVESTOCK-001 | Livestock    | §10    | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-BUILD-001     | Buildings    | §11    | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-MARKET-001    | Market       | §14    | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-PROD-001      | Production   | §15    | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-KGOTLA-001    | Kgotla       | §16    | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-BUSHVELD-001  | Bushveld     | §17    | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-AUTO-001      | Automation   | §18    | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-TIME-001      | Time         | §13    | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-RES-001       | Resources    | §12    | §09        | §07      | §08 | §04       | §03   | §16     |
| FR-GDS-006       | Progression  | §6     | §09        | §07      | §08 | §04       | §03   | §16     |
