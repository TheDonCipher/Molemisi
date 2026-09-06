# Document 06: Economy and Balancing Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target)
> Last Updated: 2026-09-02
> Implementation: 2026-09-06 — Crop/animal/building prices live in `packages/game-config`. Dynamic market tables from migration `20260902000003`. Live overrides via `game_config`.

---

## Table of Contents

1. [Currency System](#1-currency-system)
2. [Resource Economy](#2-resource-economy)
3. [Crop Economics](#3-crop-economics)
4. [Livestock Economics](#4-livestock-economics)
5. [Building Economics](#5-building-economics)
6. [Processing Economics](#6-processing-economics)
7. [Market Pricing](#7-market-pricing)
8. [Contract Economics](#8-contract-economics)
9. [Progression Costs](#9-progression-costs)
10. [Inflation Control](#10-inflation-control)
11. [Reward Curves](#11-reward-curves)
12. [Economy Simulation](#12-economy-simulation)
13. [Balance Formulas](#13-balance-formulas)

---

## 1. Currency System

**FR-ECON-001**

### Pula (P)

The primary currency is Pula. One Pula is the base unit.

**Currency properties:**

- No fractional units (integer only)
- Maximum display: 999,999 P (beyond this, show "999K+")
- No caps on accumulation
- Earned and spent through game actions only

### Currency Sources (Income)

| Source           | Amount                | Frequency         | Early Game | Late Game |
| ---------------- | --------------------- | ----------------- | ---------- | --------- |
| Crop sales       | 12-200 P per item     | Every 10-40 min   | Primary    | Secondary |
| Animal products  | 5-50 P per item       | Every 12-48 hours | Secondary  | Primary   |
| Contract rewards | 50-500 P per contract | As completed      | Moderate   | Major     |
| Bushveld finds   | 10-1000 P per find    | Random            | Minor      | Moderate  |
| Kgotla quests    | 25-200 P per quest    | As completed      | Minor      | Moderate  |

### Currency Sinks (Expenses)

| Sink                  | Amount              | Frequency         | Category     |
| --------------------- | ------------------- | ----------------- | ------------ |
| Seeds                 | 5-50 P per seed     | Every crop cycle  | Farming      |
| Feed                  | 2-10 P per unit     | Daily             | Livestock    |
| Fertilizer            | 10-60 P per use     | Per crop          | Farming      |
| Medicine              | 25-100 P per use    | As needed         | Livestock    |
| Building construction | 150-3000 P          | Once per building | Construction |
| Building upgrades     | 150-6000 P          | Once per upgrade  | Construction |
| Building maintenance  | 37-750 P per repair | Every 7+ days     | Maintenance  |
| Animal purchase       | 50-500 P per animal | Once per animal   | Livestock    |
| Market purchases      | Variable            | As needed         | Trading      |

### Net Currency Flow

The economy must maintain a **positive but controlled** net flow:

- Early game: Net positive (earning > spending)
- Mid game: Near zero (balanced earning and spending)
- Late game: Net negative (spending > earning, requires optimization)

---

## 2. Resource Economy

**FR-ECON-002**

### Resource Flow Diagram

```
                    SOURCES
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
  Farming          Market          Bushveld
    │                 │                 │
    ▼                 ▼                 ▼
┌───────────────────────────────────────────┐
│              INVENTORY                     │
│  Seeds, Feed, Materials, Products, etc.   │
└───────────────────────────────────────────┘
    │                 │                 │
    ▼                 ▼                 ▼
  Usage           Sales           Construction
    │                 │                 │
    ▼                 ▼                 ▼
  Crops           Currency          Buildings
  Animals                           Upgrades
  Processing
```

### Resource Categories

| Category     | Items                   | Primary Source       | Primary Sink       |
| ------------ | ----------------------- | -------------------- | ------------------ |
| Seeds        | Crop-specific seeds     | Market               | Planting           |
| Feed         | Grain, hay, mixed feed  | Market, Mill         | Animal feeding     |
| Fertilizer   | Compost, manure, super  | Market               | Crop speed boost   |
| Medicine     | Herbal remedy, vet kit  | Market, Kgotla       | Animal health      |
| Construction | Wood, stone, iron, clay | Market, Bushveld     | Building           |
| Products     | Crops, animal products  | Farm                 | Market, Processing |
| Processed    | Flour, butter, cheese   | Production buildings | Market, Contracts  |

---

## 3. Crop Economics

**FR-ECON-003**

### Crop Profitability Table

| Crop       | Seed Cost | Growth Time | Water Cost | Yield | Base Price | Expected Revenue | Expected Profit | ROI   | Profit/Hour |
| ---------- | --------- | ----------- | ---------- | ----- | ---------- | ---------------- | --------------- | ----- | ----------- |
| Sorghum    | 5 P       | 12 min      | 1 P        | 3-5   | 15 P       | 60 P             | 54 P            | 900%  | 270 P/hr    |
| Maize      | 8 P       | 20 min      | 2 P        | 4-6   | 20 P       | 100 P            | 90 P            | 1000% | 270 P/hr    |
| Millet     | 4 P       | 10 min      | 1 P        | 2-4   | 12 P       | 36 P             | 31 P            | 675%  | 186 P/hr    |
| Cowpeas    | 6 P       | 14 min      | 1 P        | 3-5   | 18 P       | 72 P             | 65 P            | 929%  | 279 P/hr    |
| Groundnuts | 10 P      | 25 min      | 2 P        | 4-7   | 25 P       | 137 P            | 125 P           | 1042% | 300 P/hr    |
| Sesame     | 15 P      | 16 min      | 1 P        | 2-3   | 35 P       | 87 P             | 71 P            | 407%  | 266 P/hr    |
| Watermelon | 20 P      | 30 min      | 3 P        | 2-4   | 40 P       | 120 P            | 97 P            | 400%  | 194 P/hr    |
| Tomatoes   | 12 P      | 15 min      | 2 P        | 5-8   | 22 P       | 143 P            | 129 P           | 921%  | 516 P/hr    |
| Pepper     | 25 P      | 16 min      | 1 P        | 3-5   | 45 P       | 180 P            | 154 P           | 513%  | 578 P/hr    |
| Herbs      | 40 P      | 18 min      | 1 P        | 1-3   | 80 P       | 160 P            | 119 P           | 238%  | 397 P/hr    |
| Saffron    | 80 P      | 40 min      | 1 P        | 1-2   | 200 P      | 300 P            | 219 P           | 183%  | 329 P/hr    |

### Crop Profitability Analysis

**Best early game:** Sorghum (high ROI, fast growth)
**Best mid game:** Tomatoes (high profit/hour)
**Best late game:** Pepper (highest profit/hour)
**Highest ROI:** Maize (1000% ROI)
**Highest absolute profit:** Saffron (219 P per harvest)

### Crop Risk Factors

| Crop       | Disease Risk | Pest Risk | Weather Risk | Net Risk |
| ---------- | ------------ | --------- | ------------ | -------- |
| Sorghum    | Low          | Low       | Low          | Low      |
| Maize      | Medium       | Medium    | Medium       | Medium   |
| Millet     | Low          | Low       | Low          | Low      |
| Cowpeas    | Low          | Low       | Low          | Low      |
| Groundnuts | Medium       | High      | Medium       | High     |
| Sesame     | Low          | Low       | Low          | Low      |
| Watermelon | High         | Medium    | High         | High     |
| Tomatoes   | High         | Medium    | Medium       | High     |
| Pepper     | Medium       | Low       | Low          | Medium   |
| Herbs      | Low          | Low       | Low          | Low      |
| Saffron    | Low          | Low       | Medium       | Medium   |

### Water Economics

**Water cost per crop cycle:**

| Crop       | Water Needed | Water Cost | Total Water Cost |
| ---------- | ------------ | ---------- | ---------------- |
| Sorghum    | 4 units      | 0 P (well) | 0 P              |
| Maize      | 10 units     | 0 P (well) | 0 P              |
| Millet     | 4 units      | 0 P (well) | 0 P              |
| Cowpeas    | 4 units      | 0 P (well) | 0 P              |
| Groundnuts | 10 units     | 0 P (well) | 0 P              |
| Sesame     | 4 units      | 0 P (well) | 0 P              |
| Watermelon | 18 units     | 0 P (well) | 0 P              |
| Tomatoes   | 10 units     | 0 P (well) | 0 P              |
| Pepper     | 4 units      | 0 P (well) | 0 P              |
| Herbs      | 3 units      | 0 P (well) | 0 P              |
| Saffron    | 5 units      | 0 P (well) | 0 P              |

Note: Well provides unlimited water at no cost. Water cost only matters for irrigation systems (water tank capacity).

---

## 4. Livestock Economics

**FR-ECON-004**

### Animal Profitability

| Animal  | Purchase Cost | Feed/Day | Product     | Product Price | Daily Revenue | Daily Profit | Payback Period |
| ------- | ------------- | -------- | ----------- | ------------- | ------------- | ------------ | -------------- |
| Chicken | 50 P          | 4 P      | Eggs (2)    | 5 P each      | 10 P          | 6 P          | 8.3 days       |
| Goat    | 150 P         | 8 P      | Milk (1)    | 15 P each     | 15 P          | 7 P          | 21.4 days      |
| Cow     | 400 P         | 16 P     | Milk (3)    | 15 P each     | 45 P          | 29 P         | 13.8 days      |
| Pig     | 300 P         | 12 P     | Truffle (1) | 50 P each     | 50 P          | 38 P         | 7.9 days       |

### Animal Capacity

| Animal  | Building | Building Cost | Capacity | Total Investment                 |
| ------- | -------- | ------------- | -------- | -------------------------------- |
| Chicken | Coop     | 150 P         | 10       | 150 P + 500 P (chickens) = 650 P |
| Goat    | Goat Pen | 300 P         | 5        | 300 P + 750 P (goats) = 1050 P   |
| Cow     | Paddock  | 800 P         | 3        | 800 P + 1200 P (cows) = 2000 P   |
| Pig     | Pig Pen  | 600 P         | 4        | 600 P + 1200 P (pigs) = 1800 P   |

### Animal Production Value

**Per building, per day:**

| Building           | Animals | Daily Revenue | Daily Feed Cost | Daily Profit | Annual Profit |
| ------------------ | ------- | ------------- | --------------- | ------------ | ------------- |
| Coop (10 chickens) | 10      | 100 P         | 40 P            | 60 P         | 21,900 P      |
| Goat Pen (5 goats) | 5       | 75 P          | 40 P            | 35 P         | 12,775 P      |
| Paddock (3 cows)   | 3       | 135 P         | 48 P            | 87 P         | 31,755 P      |
| Pig Pen (4 pigs)   | 4       | 200 P         | 48 P            | 152 P        | 55,480 P      |

### Animal Health Economics

**Sickness cost:**

- Lost production: 1-3 days of products
- Medicine cost: 25-100 P
- Recovery time: 12-24 hours

**Prevention cost:**

- Regular feeding: Normal feed cost
- No additional cost for prevention

---

## 5. Building Economics

**FR-ECON-005**

### Building Cost Summary

| Building   | Base Cost | Level 2 Cost | Level 3 Cost | Total Investment |
| ---------- | --------- | ------------ | ------------ | ---------------- |
| Well       | 200 P     | 400 P        | 800 P        | 1400 P           |
| Coop       | 150 P     | 300 P        | 600 P        | 1050 P           |
| Barn       | 500 P     | 1000 P       | 2000 P       | 3500 P           |
| Goat Pen   | 300 P     | 600 P        | 1200 P       | 2100 P           |
| Mill       | 400 P     | 800 P        | 1600 P       | 2800 P           |
| Paddock    | 800 P     | 1600 P       | 3200 P       | 5600 P           |
| Pig Pen    | 600 P     | 1200 P       | 2400 P       | 4200 P           |
| Irrigation | 1000 P    | 2000 P       | 4000 P       | 7000 P           |
| Warehouse  | 2000 P    | 4000 P       | 8000 P       | 14000 P          |

### Building Value Analysis

| Building   | Function         | Economic Value   | ROI Period |
| ---------- | ---------------- | ---------------- | ---------- |
| Well       | Water source     | Essential        | Immediate  |
| Coop       | Chicken housing  | 60 P/day profit  | 17.5 days  |
| Barn       | Storage          | Enables growth   | Immediate  |
| Goat Pen   | Goat housing     | 35 P/day profit  | 60 days    |
| Mill       | Grain processing | +50% grain value | 14 days    |
| Paddock    | Cow housing      | 87 P/day profit  | 64.4 days  |
| Pig Pen    | Pig housing      | 152 P/day profit | 27.6 days  |
| Irrigation | Auto-water       | Saves time       | 35 days    |
| Warehouse  | Large storage    | Enables growth   | Immediate  |

### Maintenance Costs

| Building   | Maintenance Cost | Maintenance Interval | Annual Cost |
| ---------- | ---------------- | -------------------- | ----------- |
| Well       | 50 P             | 14 days              | 1304 P      |
| Coop       | 37 P             | 14 days              | 962 P       |
| Barn       | 125 P            | 14 days              | 3259 P      |
| Goat Pen   | 75 P             | 14 days              | 1956 P      |
| Mill       | 100 P            | 14 days              | 2607 P      |
| Paddock    | 200 P            | 14 days              | 5214 P      |
| Pig Pen    | 150 P            | 14 days              | 3911 P      |
| Irrigation | 250 P            | 14 days              | 6518 P      |
| Warehouse  | 500 P            | 14 days              | 13036 P     |

---

## 6. Processing Economics

**FR-ECON-06**

### Processing Profitability

| Process                  | Input   | Input Cost | Output    | Output Value | Profit | Time   |
| ------------------------ | ------- | ---------- | --------- | ------------ | ------ | ------ |
| Mill (Grain → Flour)     | 5 grain | 25 P       | 15 flour  | 45 P         | 20 P   | 30 min |
| Dairy (Milk → Butter)    | 5 milk  | 0 P        | 10 butter | 50 P         | 50 P   | 45 min |
| Dairy (Milk → Cheese)    | 5 milk  | 0 P        | 3 cheese  | 60 P         | 60 P   | 45 min |
| Tannery (Hide → Leather) | 3 hide  | 0 P        | 2 leather | 40 P         | 40 P   | 60 min |
| Bakery (Flour → Bread)   | 5 flour | 15 P       | 10 bread  | 30 P         | 15 P   | 20 min |

### Processing Chain Value

**Grain → Flour → Bread:**

- Input: 5 grain (25 P)
- Output: 10 bread (30 P)
- Net profit: 5 P
- Processing time: 50 minutes

**Milk → Cheese:**

- Input: 5 milk (0 P, from cows)
- Output: 3 cheese (60 P)
- Net profit: 60 P
- Processing time: 45 minutes

### Processing Efficiency

| Chain          | Raw Value | Processed Value | Value Increase | Time   |
| -------------- | --------- | --------------- | -------------- | ------ |
| Grain → Flour  | 25 P      | 45 P            | +80%           | 30 min |
| Flour → Bread  | 45 P      | 30 P            | -33%           | 20 min |
| Milk → Butter  | 0 P       | 50 P            | +∞             | 45 min |
| Milk → Cheese  | 0 P       | 60 P            | +∞             | 45 min |
| Hide → Leather | 0 P       | 40 P            | +∞             | 60 min |

---

## 7. Market Pricing

**FR-ECON-007**

### Dynamic Pricing Formula

```
current_price = base_price * demand_multiplier * supply_multiplier * season_multiplier * event_multiplier
```

### Multiplier Ranges

| Multiplier | Min | Max | Update Frequency   |
| ---------- | --- | --- | ------------------ |
| Demand     | 0.8 | 1.5 | Every 6 game hours |
| Supply     | 0.5 | 1.2 | Every 6 game hours |
| Season     | 0.8 | 1.2 | Every season       |
| Event      | 0.5 | 2.0 | Per event          |

### Price Bounds

All prices are clamped:

```
final_price = clamp(current_price, base_price * 0.5, base_price * 2.0)
```

### Season Price Modifiers

| Season | Crops | Animals | Materials |
| ------ | ----- | ------- | --------- |
| Spring | 0.9   | 1.0     | 1.0       |
| Summer | 1.1   | 1.0     | 1.0       |
| Autumn | 1.2   | 1.0     | 0.9       |
| Winter | 0.8   | 1.1     | 1.1       |

### Market Events

| Event           | Effect                  | Duration | Frequency |
| --------------- | ----------------------- | -------- | --------- |
| Drought         | +50% grain prices       | 24 hours | Rare      |
| Festival        | +30% food prices        | 12 hours | Monthly   |
| Trade caravan   | -20% material prices    | 6 hours  | Bi-weekly |
| Pest outbreak   | -40% crop prices        | 12 hours | Rare      |
| Community feast | +100% ingredient demand | 8 hours  | Monthly   |

---

## 8. Contract Economics

**FR-ECON-008**

### Contract Rewards

| Difficulty | Currency Reward | Reputation | Items        | Requirements |
| ---------- | --------------- | ---------- | ------------ | ------------ |
| Easy       | 50-100 P        | 10-20      | 1-2 common   | 5-10 items   |
| Medium     | 100-300 P       | 20-40      | 2-3 uncommon | 10-25 items  |
| Hard       | 300-500 P       | 40-60      | 3-5 rare     | 25-50 items  |
| Elite      | 500-1000 P      | 60-100     | 5-10 rare    | 50-100 items |

### Contract Profitability

**Net profit per contract (after material cost):**

| Difficulty | Material Cost | Reward | Net Profit | Profit/Hour |
| ---------- | ------------- | ------ | ---------- | ----------- |
| Easy       | 25 P          | 75 P   | 50 P       | 100 P/hr    |
| Medium     | 75 P          | 200 P  | 125 P      | 125 P/hr    |
| Hard       | 200 P         | 400 P  | 200 P      | 133 P/hr    |
| Elite      | 500 P         | 750 P  | 250 P      | 125 P/hr    |

---

## 9. Progression Costs

**FR-ECON-009**

### Farm Level Requirements

| Level | XP Required | Cumulative XP | Unlocks                 |
| ----- | ----------- | ------------- | ----------------------- |
| 1     | 0           | 0             | Basic farm              |
| 2     | 100         | 100           | Millet, Goats           |
| 3     | 250         | 350           | Cowpeas, Contracts      |
| 4     | 500         | 850           | Groundnuts, Mill        |
| 5     | 1,000       | 1,850         | Cattle, Bulk trading    |
| 6     | 1,750       | 3,600         | Pigs, Premium market    |
| 7     | 3,000       | 6,600         | Tomatoes, Irrigation    |
| 8     | 5,000       | 11,600        | Pepper, Warehouse       |
| 9     | 8,000       | 19,600        | Herbs, Donkeys          |
| 10    | 12,000      | 31,600        | Saffron, Master trading |

### Skill Point Costs

| Skill Level | XP Required | Cumulative |
| ----------- | ----------- | ---------- |
| 1 → 2       | 50          | 50         |
| 2 → 3       | 100         | 150        |
| 3 → 4       | 200         | 350        |
| 4 → 5       | 350         | 700        |
| 5 → 6       | 500         | 1200       |
| 6 → 7       | 750         | 1950       |
| 7 → 8       | 1000        | 2950       |
| 8 → 9       | 1500        | 4450       |
| 9 → 10      | 2000        | 6450       |

### Unlock Costs

| Unlock          | Level Required | Additional Cost              |
| --------------- | -------------- | ---------------------------- |
| New crop type   | Varies         | Seed cost (first batch free) |
| New animal type | Varies         | Animal purchase cost         |
| New building    | Varies         | Construction cost            |
| New production  | Varies         | Building cost                |
| Automation      | 7-10           | Infrastructure cost          |

---

## 10. Inflation Control

**FR-ECON-010**

### Inflation Mechanisms

**Sinks (currency removal):**

- Building construction and upgrades
- Building maintenance
- Animal purchases
- Seed and feed purchases
- Market buy orders
- Contract requirements

**Anti-inflation measures:**

- Prices have maximum bounds (2x base)
- Building costs scale with level
- Maintenance costs increase with building level
- Market events periodically reduce prices
- Contract requirements consume resources

### Deflation Prevention

- Crop yields have minimum values
- Animal production has guaranteed minimums
- Contract rewards have minimum thresholds
- Market events periodically increase prices
- Rare items maintain minimum value

### Economy Health Indicators

| Indicator                 | Healthy Range | Warning    | Critical    |
| ------------------------- | ------------- | ---------- | ----------- |
| Avg farm wealth (Level 5) | 500-2000 P    | > 5000 P   | > 10000 P   |
| Currency velocity         | 2-5x daily    | > 8x daily | > 12x daily |
| Market price stability    | ±20% of base  | ±40%       | ±80%        |
| Resource availability     | > 50% stocked | < 30%      | < 10%       |

---

## 11. Reward Curves

**FR-ECON-011**

### Progression Reward Curve

The game uses a **diminishing returns** curve for repetitive actions:

```
XP_per_action = base_xp * (1 / (1 + 0.1 * action_count))
```

Where `action_count` is the number of times the player has performed this action today.

**Example:**

- Action 1: 10 XP
- Action 2: 9.1 XP
- Action 3: 8.3 XP
- Action 10: 4.8 XP
- Action 20: 3.3 XP

This encourages variety without punishing focused play.

### Milestone Rewards

| Milestone                  | Reward       |
| -------------------------- | ------------ |
| First crop harvested       | 25 P bonus   |
| First animal product       | 25 P bonus   |
| First building constructed | 50 P bonus   |
| First contract completed   | 100 P bonus  |
| Farm level 5               | 500 P bonus  |
| Farm level 10              | 2000 P bonus |

### Daily Bonus

| Day   | Bonus              |
| ----- | ------------------ |
| Day 1 | 10 P               |
| Day 2 | 15 P               |
| Day 3 | 20 P               |
| Day 4 | 25 P               |
| Day 5 | 30 P               |
| Day 6 | 40 P               |
| Day 7 | 50 P + random seed |

---

## 12. Economy Simulation

**FR-ECON-012**

### Simulation Methodology

To validate economy balance, run Monte Carlo simulations:

**Setup:**

- 1000 simulated farms
- Each farm runs for 30 simulated days
- Random player behavior profiles (casual, regular, hardcore)
- Random market events
- Random weather

**Metrics tracked:**

- Currency accumulation over time
- Resource availability
- Building unlock timing
- Market price stability
- Player progression rate
- Dead-end detection (players stuck with no options)

### Simulation Profiles

| Profile  | Sessions/Day | Session Length | Focus             |
| -------- | ------------ | -------------- | ----------------- |
| Casual   | 2            | 2 min          | Crops only        |
| Regular  | 3            | 5 min          | Crops + animals   |
| Hardcore | 5            | 10 min         | Full optimization |

### Simulation Outputs

**Expected outputs:**

1. Currency distribution over time
2. Average farm value at each level
3. Time to unlock each building
4. Market price history
5. Resource scarcity events
6. Player bankruptcy rate
7. Progression bottleneck identification

### Balance Targets

| Metric                  | Target   | Acceptable Range |
| ----------------------- | -------- | ---------------- |
| Time to Level 5         | 3 days   | 2-5 days         |
| Time to Level 10        | 10 days  | 7-14 days        |
| First animal purchase   | Day 2    | Day 1-3          |
| First building upgrade  | Day 3    | Day 2-5          |
| Max farm value (Day 30) | 10,000 P | 5,000-20,000 P   |
| Bankruptcy rate         | < 5%     | 0-10%            |

---

## 13. Balance Formulas

**FR-ECON-013**

### Core Economy Formulas

**Crop profit:**

```
crop_profit = (avg_yield * sell_price * quality_multiplier) - seed_cost - water_cost - fertilizer_cost
```

**Animal profit:**

```
animal_profit = (product_value * production_rate) - feed_cost - medicine_cost
```

**Building ROI:**

```
building_roi = (building_revenue - maintenance_cost) / construction_cost
```

**Market price:**

```
market_price = base_price * clamp(demand * supply * season * event, 0.5, 2.0)
```

**XP rate:**

```
xp_per_minute = total_xp_earned / total_play_time_minutes
```

**Currency velocity:**

```
currency_velocity = total_currency_spent / avg_currency_held
```

**Inflation rate:**

```
inflation_rate = (avg_price_period2 - avg_price_period1) / avg_price_period1
```

### Balance Check Functions

```typescript
function checkCropBalance(crop: CropConfig): BalanceReport {
  const revenue = crop.avgYield * crop.basePrice;
  const cost = crop.seedCost + crop.waterCost;
  const profit = revenue - cost;
  const profitPerHour = profit / (crop.growthTime / 60);
  const roi = (profit / cost) * 100;

  return {
    profit,
    profitPerHour,
    roi,
    isBalanced: profitPerHour > 50 && profitPerHour < 1000,
    recommendation:
      profitPerHour < 50 ? 'increase_yield' : profitPerHour > 1000 ? 'decrease_yield' : 'ok',
  };
}
```
