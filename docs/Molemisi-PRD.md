# MOLEMISI

## Product Requirements Document

**Product:** Molemisi  
**Product Type:** Pixel-Art Farm Management Simulator  
**Platform:** Web-first, Mobile-first  
**Genre:** Cozy Farm Management / Agricultural Simulation / Casual Strategy  
**Perspective:** Fixed 2D pixel-art environments  
**Player Movement:** None  
**Primary Interaction:** Point-and-click / tap / contextual menus  
**Business Model:** Free-to-play with optional purchases  
**Primary Currency:** Botswana Pula (P)  
**Target Market:** Botswana initially, with potential regional/global expansion  
**Document Status:** Product Master Specification  
**Implementation note (2026-09-06):** This PRD is product intent. As-built status is `docs/DEVELOPMENT_STATE.md`. The live player client is React at `/game`; Phaser is a standalone Vite app. Payments are stubbed.  
**Version:** 1.0  
**Date:** September 2026

---

# 1. Executive Summary

**Molemisi** is a web-based, mobile-first pixel-art farm management simulator in which the player manages a living agricultural homestead rather than directly controlling a character.

The player does not walk around the world.

Instead, the player observes, interacts with, and manages a persistent farm through a combination of:

- interactive pixel-art environments;
- contextual point-and-click/tap interactions;
- management panels;
- resource systems;
- crop production;
- livestock;
- construction;
- processing;
- market trading;
- contracts;
- weather;
- seasonal conditions;
- village/community systems;
- exploration/resource gathering;
- progression;
- and eventually automation.

The central design philosophy is:

> **The farm is the player's character.**

The farm visually communicates its own condition, development, prosperity and problems.

A player should be able to open Molemisi and immediately understand:

- what is happening;
- what requires attention;
- what opportunities exist;
- what resources are available;
- what decisions can be made;
- and how today's decisions affect tomorrow's farm.

The game combines the **accessible management loop of games such as Sunflower Land** with the **cozy pixel-art atmosphere associated with games such as Stardew Valley**, while deliberately removing character movement and traditional RPG traversal.

Molemisi's identity is further differentiated through a Botswana-inspired world containing:

- home farms;
- Kgotla;
- Bushveld;
- livestock;
- local agricultural systems;
- water management;
- local economic conditions;
- Setswana-inspired terminology;
- community relationships;
- and an agricultural economy grounded in the Southern African environment.

---

# 2. Product Vision

## 2.1 Vision Statement

> **Molemisi will turn a small digital homestead into a living agricultural enterprise through simple interactions, meaningful management decisions and rich pixel-art feedback.**

The player begins with a modest farm.

Over time, that farm becomes:

```text
Small Homestead
      ↓
Productive Farm
      ↓
Commercial Farm
      ↓
Agricultural Enterprise
      ↓
Processing Operation
      ↓
Regional Agricultural Business
```

The player should feel that they built the operation themselves.

---

# 3. Product Philosophy

Molemisi is governed by ten principles.

## P1. The Farm Is the Character

There is no player avatar that needs to be walked around.

The farm itself represents the player's progression.

Its:

- crops;
- animals;
- buildings;
- decorations;
- infrastructure;
- storage;
- machinery;
- water systems;
- and surrounding environment

should visibly evolve.

---

## P2. The World Is the Dashboard

The primary interface is not a spreadsheet.

The farm itself communicates information.

A dry field should look dry.

A healthy crop should look healthy.

A full chicken coop should look active.

A damaged building should look damaged.

A ready harvest should attract attention.

---

## P3. Every Meaningful Action Produces Feedback

If the player plants a seed:

- soil changes;
- seed appears;
- planting animation occurs;
- inventory decreases;
- feedback appears.

If the player harvests:

- crop disappears;
- harvest animation occurs;
- particles appear;
- inventory increases;
- sound plays;
- statistics update.

---

## P4. Management Creates Trade-offs

The player should constantly make decisions.

Examples:

- Water crops or save water?
- Sell produce now or wait?
- Upgrade storage or irrigation?
- Plant safe crops or high-risk/high-value crops?
- Expand livestock or agriculture?
- Process goods or sell raw materials?
- Invest in automation or increase production capacity?

---

## P5. Complexity Is Earned

The first few minutes should be extremely simple.

Complex systems become available progressively.

```text
Crops
 ↓
Livestock
 ↓
Buildings
 ↓
Market
 ↓
Contracts
 ↓
Processing
 ↓
Automation
 ↓
Advanced management
```

---

## P6. The Farm Continues Without the Player

Molemisi uses persistent time and offline progression.

When the player leaves:

- crops continue growing;
- livestock produces;
- production jobs continue;
- market conditions may change;
- weather can affect the farm;
- events can occur.

The player should return to a farm that has changed.

---

## P7. Mobile Is a First-Class Platform

Molemisi is designed around touch interaction.

Desktop receives a larger presentation of the same game.

Mobile is not a shrunken desktop interface.

---

## P8. Botswana Is an Identity, Not a Skin

Botswana-inspired content should influence:

- environment;
- economy;
- agriculture;
- architecture;
- livestock;
- weather;
- community;
- terminology;
- progression;
- and worldbuilding.

The game should not simply put African decorations onto a generic farming game.

---

## P9. The Economy Is Server-Authoritative

All important economic actions are calculated and validated by the server.

The client cannot decide:

- how much money the player has;
- how many items they own;
- whether a crop is ready;
- whether a purchase is valid;
- or whether a payment succeeded.

---

## P10. Cozy Does Not Mean Shallow

Molemisi should be relaxing to play but deep enough to reward planning.

The ideal player experience is:

> **Simple to understand, difficult to optimize.**

---

# 4. Target Audience

## Primary Audience

Casual and mid-core players who enjoy:

- farming games;
- simulation;
- management;
- cozy games;
- pixel art;
- progression;
- collection;
- optimization;
- asynchronous games;
- mobile games.

## Secondary Audience

Players interested in:

- Botswana;
- African game development;
- agricultural simulations;
- economy games;
- casual strategy;
- relaxing games.

---

# 5. Platform Strategy

## Primary

### Web

Supported environments:

- desktop browsers;
- mobile browsers;
- tablets.

The game should be installable as a PWA where practical.

## Secondary

### Android / iOS

The web application should be capable of being packaged using Capacitor.

Capacitor is specifically designed to wrap modern web applications into native iOS/Android applications while retaining access to native device capabilities.

## Future

Potential:

- desktop wrapper;
- social platforms;
- messaging-platform game integrations.

These are explicitly outside MVP scope.

---

# 6. Core Game Fantasy

The player's fantasy is:

> **"This is my farm, and I am responsible for making it thrive."**

The player should experience:

### Ownership

"This belongs to me."

### Responsibility

"I need to take care of this."

### Discovery

"What happens if I try this?"

### Progression

"My farm is becoming something."

### Optimization

"I could make this more efficient."

### Attachment

"I remember when this was just an empty field."

---

# 7. Core Gameplay Loop

The primary loop is:

```text
OBSERVE
   ↓
IDENTIFY OPPORTUNITY / PROBLEM
   ↓
MAKE DECISION
   ↓
TAKE ACTION
   ↓
RECEIVE VISUAL/AUDIO FEEDBACK
   ↓
WAIT / SIMULATE
   ↓
HARVEST / PRODUCE / SELL
   ↓
EARN RESOURCES
   ↓
INVEST
   ↓
UPGRADE FARM
   ↓
UNLOCK NEW OPTIONS
   ↓
OBSERVE AGAIN
```

---

# 8. Core Player Session

A typical session should look like:

```text
Open Molemisi
     ↓
Farm loads
     ↓
Visual attention indicators appear
     ↓
Player inspects farm
     ↓
Harvests ready crops
     ↓
Checks livestock
     ↓
Reviews water
     ↓
Checks market
     ↓
Makes sales/purchases
     ↓
Starts production
     ↓
Constructs/upgrades
     ↓
Checks Kgotla
     ↓
Accepts contract
     ↓
Checks Bushveld
     ↓
Leaves game
```

The entire session should work comfortably in approximately:

**3-15 minutes**

while allowing longer sessions for players who want to optimize their farm.

---

# 9. World Structure

Molemisi consists of several major locations.

## 9.1 Home Farm

The player's permanent management environment.

Contains:

- house;
- fields;
- livestock;
- storage;
- water infrastructure;
- production buildings;
- decorations;
- resource structures.

The farm is persistent.

---

# 9.2 Kgotla

The Kgotla is the game's social and economic hub.

It is not merely another map.

It represents the player's connection to the surrounding community.

Potential functions:

- contracts;
- agricultural advice;
- market information;
- community projects;
- reputation;
- traders;
- licenses;
- events;
- NPC interactions;
- special opportunities.

---

# 9.3 Bushveld

The Bushveld functions as a resource/exploration system.

There is no character traversal.

Instead, the player interacts with a visual Bushveld scene.

Possible discoveries:

- wood;
- stone;
- wild herbs;
- berries;
- mushrooms;
- honey;
- rare materials;
- medicinal plants;
- wildlife encounters;
- special resources.

Bushveld content can be procedurally distributed.

---

# 9.4 Market

The market is a dynamic economic interface.

It provides:

- buying;
- selling;
- market prices;
- contracts;
- demand information;
- special traders;
- market events.

---

# 10. Player Interaction Model

Molemisi intentionally has **no conventional player movement**.

There is:

- no WASD movement;
- no virtual joystick;
- no character traversal;
- no collision-based exploration;
- no platforming;
- no traditional RPG navigation.

Instead:

### Desktop

- mouse click;
- hover;
- drag where appropriate.

### Mobile

- tap;
- long press where appropriate;
- swipe panels;
- contextual sheets.

---

# 11. Interaction Hierarchy

The primary interaction hierarchy is:

```text
WORLD
 ↓
OBJECT
 ↓
OBJECT STATE
 ↓
CONTEXTUAL INFORMATION
 ↓
AVAILABLE ACTIONS
 ↓
RESULT
```

Example:

```text
Click tomato field
       ↓
Field opens
       ↓
Shows growth state
       ↓
Shows water level
       ↓
Shows health
       ↓
Shows expected yield
       ↓
Actions:
Water
Fertilize
Harvest
```

---

# 12. Visual Feedback System

Visual feedback is a core gameplay system.

## Crop States

Minimum states:

```text
SEED
SPROUT
YOUNG
GROWING
MATURE
READY
HARVESTED
```

Environmental states:

```text
HEALTHY
DRY
OVERWATERED
DISEASED
PEST-INFESTED
DAMAGED
```

---

# 13. Living Pixel System

The farm should never feel completely static.

Ambient animations should include:

- crop movement;
- chickens pecking;
- livestock idle animations;
- birds;
- insects;
- butterflies;
- water movement;
- smoke;
- wind;
- clouds;
- environmental particles;
- subtle lighting changes.

These animations primarily exist to communicate:

> **The farm is alive.**

---

# 14. Attention System

Every important farm object has an attention state.

```text
NORMAL
NOTICE
IMPORTANT
CRITICAL
```

Example:

```text
Tomato Field → READY
Water Tank → IMPORTANT
Chicken Coop → NORMAL
Broken Pump → CRITICAL
```

The player should receive an optional summary:

> **3 things need your attention.**

Selecting the summary navigates directly to the relevant objects.

---

# 15. Crop System

Each crop has:

- seed cost;
- growth duration;
- water requirements;
- soil requirements;
- yield;
- sell value;
- quality;
- seasonal suitability;
- risk;
- potential processing uses.

Example:

| Crop       | Growth |  Water |  Yield |     Value |   Risk |
| ---------- | -----: | -----: | -----: | --------: | -----: |
| Maize      | Medium | Medium |   High |    Medium |    Low |
| Tomato     |   Fast |   High | Medium |      High | Medium |
| Beans      | Medium |    Low | Medium |    Medium |    Low |
| Watermelon |   Slow |   High |   High | Very High | Medium |

Numbers are placeholders and must be balanced through simulation.

---

# 16. Farming Actions

Players can:

- prepare soil;
- plant;
- water;
- fertilize;
- treat disease;
- remove pests;
- harvest;
- remove crops;
- upgrade fields;
- install irrigation.

---

# 17. Water System

Water is a major strategic resource.

Possible sources:

- rain;
- water tank;
- well;
- borehole;
- water delivery;
- collection systems.

Water consumption comes from:

- crops;
- livestock;
- processing;
- infrastructure.

Example:

```text
WATER TANK

Capacity: 5,000 L
Current: 3,420 L

Daily Consumption:
Crops       800 L
Animals     250 L
Processing  100 L
```

Water scarcity should be a meaningful strategic problem without becoming frustrating.

---

# 18. Weather System

Weather affects both visuals and simulation.

Initial weather types:

- sunny;
- cloudy;
- rain;
- storm;
- heatwave.

Potential effects:

### Rain

- increases water;
- improves certain crops;
- reduces irrigation requirements.

### Heatwave

- increases water consumption;
- increases crop stress;
- affects livestock.

### Storm

- potential damage;
- increased water;
- environmental effects.

---

# 19. Time System

Molemisi uses persistent game time.

Every farm action should be associated with timestamps.

Important timestamps include:

- plantedAt;
- harvestReadyAt;
- productionStartedAt;
- productionCompletedAt;
- lastSimulationAt;
- lastLoginAt.

The server calculates elapsed time.

The system should **not** simulate every second.

Instead:

```text
Current Time
-
Last Simulation Time
=
Elapsed Time

Elapsed Time
×
Game Rules
=
New Farm State
```

---

# 20. Offline Progression

When the player leaves:

- crops grow;
- livestock produces;
- production continues;
- time-based events progress;
- market state changes;
- selected environmental effects continue.

When the player returns:

```text
Last Known State
       ↓
Elapsed Time
       ↓
Simulation Engine
       ↓
Updated State
       ↓
Player Sees Results
```

The return experience should explicitly summarize what happened.

Example:

> **While you were away**
>
> 🌽 42 maize harvested  
> 🥚 12 eggs produced  
> 💰 P420 earned  
> 🌧 Rain filled your water tank by 18%  
> 📦 Storage is now 82% full

---

# 21. Livestock System

MVP livestock:

**Chicken**

Future:

- goats;
- cattle;
- sheep;
- other locally appropriate animals.

Animals have:

- hunger;
- health;
- happiness;
- production;
- capacity;
- maintenance.

Chicken example:

```text
Chicken
Health:   ████████░░
Hunger:   ██████░░░░
Happiness:████████░░

Production:
Egg → Every X hours
```

---

# 22. Livestock Buildings

MVP:

### Chicken Coop

Properties:

- capacity;
- feed capacity;
- production rate;
- health bonus;
- upgrade level.

Future:

- goat pen;
- cattle kraal;
- barn;
- dairy;
- poultry house.

---

# 23. Inventory

Inventory contains:

### Agricultural resources

- seeds;
- crops;
- produce.

### Livestock products

- eggs;
- milk;
- meat.

### Construction resources

- wood;
- stone;
- clay;
- metal.

### Processed products

- flour;
- bread;
- cheese;
- jam;
- sauces.

Inventory should display:

```text
Item
Quantity
Storage Capacity
Quality
Sell Value
Uses
```

---

# 24. Storage

Storage capacity is limited.

This creates a strategic decision:

> Sell now, process now, or expand storage?

Buildings:

- basic storage;
- shed;
- warehouse;
- cold storage;
- advanced warehouse.

---

# 25. Market System

The market supports:

- buying;
- selling;
- dynamic pricing;
- demand;
- contracts;
- special offers.

Market prices should not be completely random.

They should be generated from controlled economic rules.

Potential inputs:

```text
Base Price
+
Season
+
Demand
+
Supply
+
Events
+
Player Market Activity
```

---

# 26. Production System

Production transforms resources.

Example:

```text
WHEAT
 ↓
MILL
 ↓
FLOUR
 ↓
BAKERY
 ↓
BREAD
 ↓
MARKET
```

Another:

```text
MILK
 ↓
DAIRY
 ├── CHEESE
 ├── BUTTER
 └── YOGURT
```

Production creates strategic depth.

---

# 27. Contracts

Contracts provide objectives beyond normal market selling.

Example:

```text
COMMUNITY CONTRACT

Required:
50 kg Maize

Deadline:
3 Days

Reward:
P850

Bonus:
+5 Reputation
```

Contracts may originate from:

- Kgotla;
- schools;
- shops;
- restaurants;
- traders;
- community organizations;
- larger agricultural buyers.

---

# 28. Building System

Buildings require:

- currency;
- construction resources;
- land;
- prerequisite buildings where applicable.

Buildings should provide gameplay benefits.

Example:

### Water Tank II

- +2,000L capacity.

### Chicken Coop II

- +10 chickens;
- improved production.

### Warehouse

- +200 inventory capacity.

### Irrigation System

- reduces manual watering;
- reduces water waste.

---

# 29. Farm Expansion

The farm begins small.

Expansion unlocks:

- additional land;
- more fields;
- larger buildings;
- more livestock;
- infrastructure.

Expansion should be visually obvious.

The player should look back at their original farm and recognize its transformation.

---

# 30. Farm Customization

Players can customize:

### Structures

- house;
- barns;
- coops;
- storage;
- workshops.

### Environment

- trees;
- flowers;
- paths;
- fences;
- rocks;
- decorations.

### Layout

Players decide where major farm elements are positioned.

Customization should have both:

- cosmetic;
- functional

elements.

---

# 31. Progression

Progression should have multiple dimensions.

## Farm Level

Measures overall development.

## Agriculture

Unlocks:

- crops;
- fertilizer;
- irrigation;
- advanced farming.

## Livestock

Unlocks:

- animals;
- buildings;
- animal products.

## Production

Unlocks:

- processing;
- factories;
- value-added products.

## Commerce

Unlocks:

- contracts;
- traders;
- advanced markets.

## Infrastructure

Unlocks:

- water;
- storage;
- automation.

## Reputation

Controls access to:

- Kgotla opportunities;
- community projects;
- special contracts;
- rare traders.

---

# 32. Automation

Automation is a late-game progression system.

Examples:

```text
Manual Watering
       ↓
Irrigation
       ↓
Automated Irrigation
```

```text
Manual Feeding
       ↓
Feed Station
       ↓
Automated Feeding
```

Automation should increase:

- efficiency;
- throughput;
- capacity.

But may also increase:

- maintenance;
- energy consumption;
- capital requirements.

Automation should change the player's role from:

> operator

to:

> manager.

---

# 33. Kgotla Systems

The Kgotla should contain several functional NPCs.

Initial NPC roles:

### Chief / Elder

- community reputation;
- community projects;
- major decisions.

### Agricultural Advisor

- weather;
- crop advice;
- farming information.

### Trader

- market;
- contracts;
- buying/selling.

### Builder

- buildings;
- infrastructure.

### Livestock Dealer

- animals;
- livestock upgrades.

---

# 34. Community Reputation

The player can gain reputation by:

- fulfilling contracts;
- helping community projects;
- supplying goods;
- participating in events.

Reputation unlocks:

- better contracts;
- special traders;
- community improvements;
- rare resources;
- advanced opportunities.

---

# 35. Bushveld System

The Bushveld is a resource discovery system.

The scene contains resource nodes.

Possible nodes:

- trees;
- rocks;
- herbs;
- berries;
- honey;
- rare plants;
- water;
- special discoveries.

Each visit may generate a new configuration.

The player does not walk through it.

Instead:

```text
Bushveld
 ↓
Observe Nodes
 ↓
Select Resource
 ↓
Gather
 ↓
Consume/Wait
 ↓
Nodes Regenerate
```

---

# 36. Procedural Generation

Procedural generation should be used selectively.

## Hand-authored

- Home Farm;
- Kgotla;
- important landmarks;
- major NPCs;
- tutorial environments.

## Procedural

- Bushveld resource distribution;
- random events;
- market fluctuations;
- wildlife encounters;
- resource regeneration;
- seasonal variations.

This maintains artistic control while providing replayability.

---

# 37. Events

Events provide variability.

### Positive

- favorable rainfall;
- high crop demand;
- visiting trader;
- agricultural fair;
- rare seed opportunity.

### Negative

- drought;
- pest outbreak;
- storm;
- disease;
- market crash.

### Rare

- rare resource;
- special contract;
- wildlife encounter;
- unique trader;
- community celebration.

---

# 38. Daily / Weekly / Seasonal Systems

## Daily

- crop growth;
- livestock production;
- weather;
- market conditions.

## Weekly

- contracts;
- community events;
- market trends;
- special opportunities.

## Seasonal

- crop suitability;
- weather;
- demand;
- festivals;
- special resources.

MVP may initially use only a simplified rainy/dry cycle.

---

# 39. Notification System

Notifications should identify meaningful changes.

Examples:

> 🌽 Your maize is ready.

> 💧 Water is running low.

> 🥚 Your chickens produced 6 eggs.

> 📈 Tomato prices increased.

> 🏘 A new Kgotla contract is available.

Notifications should be categorized:

```text
INFO
OPPORTUNITY
WARNING
CRITICAL
REWARD
```

---

# 40. User Interface

The UI consists of:

## Global HUD

Displays:

- currency;
- day/time;
- weather;
- notifications;
- farm attention indicator.

## Main Farm View

The visual game world.

## Bottom Navigation

Primary mobile navigation:

```text
Farm
Market
Livestock
Build
```

Secondary:

```text
Storage
Management
Kgotla
Bushveld
Settings
```

---

# 41. Contextual Interaction Panel

When an object is selected:

```text
┌────────────────────────────┐
│ TOMATO FIELD               │
│                            │
│ Growth       ████████░ 82% │
│ Water        ██████░░░ 61% │
│ Health       ████████░ 87% │
│                            │
│ Expected Yield: 18         │
│ Ready: 1h 20m              │
│                            │
│ [ WATER ] [ FERTILIZE ]    │
│ [ HARVEST ]                │
└────────────────────────────┘
```

The player should never need to navigate through several menus to perform a common farm action.

---

# 42. Mobile UX Requirements

Minimum touch target:

**44×44 CSS pixels**

Prefer:

**48×48+**

Mobile UI must support:

- portrait orientation;
- touch;
- scrolling;
- bottom sheets;
- large buttons;
- contextual menus;
- minimal typing.

Landscape may be supported for the farm view where beneficial.

---

# 43. Desktop UX

Desktop may use:

- larger farm view;
- side panels;
- hover tooltips;
- keyboard shortcuts;
- expanded management dashboards.

The underlying game state must remain identical.

---

# 44. Visual Style

Molemisi uses:

### Pixel-art

- crisp edges;
- deliberate pixel clusters;
- controlled palette;
- limited gradients;
- readable silhouettes.

### Perspective

Recommended:

**2D top-down / slightly elevated orthographic pixel-art view.**

### Visual inspiration

The target quality should combine:

- cozy farm readability;
- strong pixel-art environments;
- clear object silhouettes;
- warm environmental animation;
- restrained UI.

Molemisi must not directly copy the art style, assets, characters or intellectual property of existing games.

---

# 45. Art Specification

The project must establish an art bible before large-scale production.

It must define:

- base tile size;
- sprite resolution;
- pixel scale;
- palette;
- outlines;
- shadow direction;
- lighting;
- texture density;
- environmental scale;
- building proportions;
- animal proportions;
- animation conventions.

Recommended starting point:

**16×16 logical tile grid**

with rendering scaled cleanly for modern displays.

---

# 46. Asset Categories

```text
/assets
  /tiles
  /terrain
  /crops
  /animals
  /buildings
  /characters
  /environment
  /resources
  /effects
  /ui
  /icons
  /audio
```

---

# 47. Animation Requirements

Animations should be short and purposeful.

Examples:

### Chicken

4-6 frame idle/peck cycle.

### Crop

2-4 frame subtle movement.

### Water

3-6 frame animation.

### Harvest

2-5 frame action + particles.

### Buildings

Optional animated elements:

- smoke;
- lights;
- machinery;
- doors;
- water;
- processing.

---

# 48. Juice System

Important actions should have:

- animation;
- particles;
- sound;
- UI response;
- state change.

Harvest:

```text
CLICK
 ↓
Crop animation
 ↓
Crop disappears
 ↓
Particle burst
 ↓
"+18 Tomatoes"
 ↓
Inventory count increases
 ↓
Coin/resource sound
```

This should feel satisfying even when the underlying operation is simply a database update.

---

# 49. Audio

## Ambient

- birds;
- wind;
- insects;
- livestock;
- rain.

## UI

- click;
- select;
- confirm;
- purchase;
- upgrade;
- warning.

## Gameplay

- planting;
- watering;
- harvesting;
- animal production;
- construction;
- rare discovery.

Music should vary by location and time.

---

# 50. Economy

The economy uses:

## Primary Currency

**Botswana Pula (P)**

## Resource Categories

### Agricultural

- seeds;
- crops;
- fertilizer;
- water.

### Construction

- wood;
- stone;
- clay;
- metal.

### Livestock

- animals;
- feed;
- animal products.

### Processed

- flour;
- bread;
- cheese;
- jam;
- sauces.

---

# 51. Economy Rules

The economy must prevent dominant strategies.

For every major item calculate:

```text
Acquisition Cost
+
Time Cost
+
Water Cost
+
Labor/Automation Cost
+
Risk
=
True Cost
```

Then compare:

```text
True Cost
vs
Market Value
```

Economy balancing must be performed through simulation rather than intuition alone.

---

# 52. Currency Sinks

The game must continuously provide reasons to spend currency.

Examples:

- seeds;
- animals;
- buildings;
- expansion;
- infrastructure;
- processing;
- maintenance;
- decorations;
- special opportunities.

Without sufficient sinks, inflation will destroy the economy.

---

# 53. Monetization

Molemisi should avoid aggressive pay-to-win design.

Preferred monetization:

### Cosmetics

- decorations;
- building skins;
- farm themes;
- seasonal packs.

### Convenience

- additional farm slots;
- convenience features;
- optional automation assistance.

### Premium Content

- cosmetic packs;
- themed environments;
- special decorative collections.

Real-money purchases should not directly destroy the importance of management.

---

# 54. Payment Architecture

Payments are a separate domain.

```text
Player
 ↓
Payment UI
 ↓
Payment Service
 ↓
Payment Provider / Gateway
 ↓
Provider Confirmation
 ↓
Webhook
 ↓
Payment Verification
 ↓
Transaction Ledger
 ↓
Entitlement / Purchase
 ↓
Game Economy
```

The client must never directly award purchased currency.

---

# 55. Mobile Money

Molemisi must support an abstraction layer for mobile-money providers.

The game should expose a common interface:

```text
createPayment()
verifyPayment()
handleWebhook()
refundPayment()
getPaymentStatus()
```

Provider-specific implementations remain isolated.

This allows future support for:

- Botswana mobile-money services;
- regional payment gateways;
- card payments;
- international payment methods.

Specific provider integration should be selected during implementation based on current commercial API availability, licensing, settlement requirements and Botswana market access.

---

# 56. Payment Security

Every payment must have:

- unique transaction ID;
- player ID;
- provider reference;
- amount;
- currency;
- status;
- timestamps;
- verification state.

Payment webhooks must be:

- authenticated;
- verified;
- idempotent;
- logged.

Duplicate webhook:

```text
Webhook #1 → award entitlement
Webhook #2 → detect existing transaction → do nothing
```

---

# 57. Server Authority

The server owns:

- currency;
- inventory;
- crops;
- livestock;
- buildings;
- production;
- contracts;
- progression;
- payments.

The client only requests actions.

Example:

```text
CLIENT:
"Harvest Field 17"

SERVER:
"Is Field 17 ready?"

"Does player own it?"

"Is it harvestable?"

"Calculate yield."

"Update inventory."

"Update field."

"Record transaction."

"Return result."
```

---

# 58. Anti-Cheat

The system must protect against:

- modified clients;
- duplicated requests;
- replay attacks;
- timestamp manipulation;
- inventory duplication;
- currency duplication;
- fake payment callbacks;
- impossible action sequences.

Important operations should be transactional.

---

# 59. Account System

Players should eventually be able to use:

- email;
- phone number;
- social authentication.

MVP should minimize onboarding friction.

Potential flow:

```text
Open Molemisi
 ↓
Play / Continue
 ↓
Create account when needed
 ↓
Farm saved to cloud
```

Guest mode may be considered for initial onboarding.

---

# 60. Save System

Persistent server-side state must include:

- farm;
- buildings;
- crops;
- livestock;
- inventory;
- currency;
- progression;
- contracts;
- reputation;
- achievements;
- settings.

Client-only state:

- animation frame;
- particles;
- UI panel;
- camera;
- visual effects.

---

# 61. Technical Architecture

## Recommended Stack

### Game Client

**Phaser + TypeScript**

Phaser is specifically designed for HTML5 2D games, supports WebGL/Canvas rendering, mobile browsers and TypeScript.

### Application Shell

**Next.js + React + TypeScript**

Next.js provides the web application layer for:

- authentication;
- account management;
- landing pages;
- dashboards;
- settings;
- payment UI;
- administrative UI.

Next.js is a React framework intended for full-stack web applications and supports the modern App Router.

### Backend

**NestJS + TypeScript**

NestJS provides a structured server architecture appropriate for:

- game APIs;
- domain services;
- authentication;
- economy;
- payments;
- scheduled jobs;
- administration.

NestJS is built for scalable Node.js server-side applications and has first-class TypeScript support.

### Database

**PostgreSQL**

Primary persistent database.

### ORM

**Prisma**

Used for:

- schema;
- migrations;
- typed database access.

### Cache / Jobs

**Redis**

Used for:

- caching;
- rate limiting;
- short-lived state;
- job coordination;
- scheduled simulation work where appropriate.

### Background Jobs

**BullMQ + Redis**

Used for:

- notifications;
- scheduled events;
- payment reconciliation;
- analytics aggregation;
- maintenance tasks.

### Mobile

**Capacitor**

Used to package the web application/game for Android and iOS if native distribution becomes desirable.

### Hosting

Recommended initial architecture:

```text
Cloudflare
    ↓
Next.js
    ↓
NestJS API
    ↓
PostgreSQL
    ↓
Redis
```

Assets should be served through object storage/CDN.

### Object Storage

Use an S3-compatible object store for:

- game assets;
- audio;
- user-generated assets if introduced;
- backups.

---

# 62. Why Not Build Everything in React?

React should not be responsible for rendering the entire farm world.

The recommended separation is:

```text
Next.js / React
        │
        ├── Menus
        ├── Account
        ├── Payments
        ├── Settings
        └── Application UI
                │
                ↓
            Phaser Game
                │
                ├── Farm
                ├── Kgotla
                ├── Bushveld
                ├── Animations
                ├── Particles
                └── World interaction
```

This avoids turning the farm into a giant collection of React components.

Phaser can be embedded into modern web applications and officially documents integration approaches involving frameworks such as React and Next.js.

---

# 63. Why Not Use Unity?

Unity is unnecessarily heavy for the initial target.

Molemisi needs:

- 2D;
- browser;
- mobile web;
- low download size;
- fast iteration;
- TypeScript/web integration;
- simple point-and-click interaction.

Phaser is a better fit.

---

# 64. Why Not Use Godot?

Godot is excellent for games, but the primary product requirement is **web-first accessibility and direct browser distribution**.

Phaser's architecture is specifically centered around browser-based 2D games.

Godot could become attractive if Molemisi eventually requires a much more traditional standalone game architecture.

For the current product:

**Phaser wins.**

---

# 65. Monorepo Structure

Recommended:

```text
molemisi/
│
├── apps/
│   ├── web/
│   │   └── Next.js
│   │
│   ├── api/
│   │   └── NestJS
│   │
│   └── mobile/
│       └── Capacitor
│
├── packages/
│   ├── game/
│   │   └── Phaser
│   │
│   ├── game-rules/
│   │   └── shared simulation rules
│   │
│   ├── database/
│   │   └── Prisma
│   │
│   ├── contracts/
│   │   └── shared DTO/types
│   │
│   ├── ui/
│   │   └── shared React UI
│   │
│   └── config/
│
├── assets/
│
├── docs/
│
└── tooling/
```

Recommended package manager:

**pnpm**

Recommended build orchestration:

**Turborepo**

---

# 66. Domain Architecture

The backend should be modular rather than immediately split into microservices.

Recommended modules:

```text
Auth
Users
Farms
Crops
Livestock
Inventory
Buildings
Production
Economy
Market
Contracts
Kgotla
Bushveld
Weather
Events
Progression
Notifications
Payments
Analytics
Administration
```

Do **not** create independent microservices for all of these during MVP.

Start as a **modular monolith**.

Extract services only when scale or operational requirements justify it.

---

# 67. Game Simulation Engine

The simulation engine is a critical subsystem.

Conceptually:

```text
Farm State
+
Elapsed Time
+
World State
+
Rules
=
New Farm State
```

Simulation must be:

- deterministic;
- testable;
- server-authoritative;
- idempotent where possible;
- independent from UI;
- independent from rendering.

This allows the same game rules to be used in:

- API;
- background jobs;
- tests;
- economy simulation;
- administration tools.

---

# 68. Simulation Example

For a crop:

```text
Crop
 ├── plantedAt
 ├── growthDuration
 ├── waterRequirement
 ├── health
 ├── fertilizer
 └── environmentalModifiers
```

At simulation:

```text
elapsed = now - lastSimulatedAt

growth =
baseGrowthRate
× elapsed
× waterModifier
× healthModifier
× weatherModifier
```

Result:

```text
growthProgress = min(100%, calculatedGrowth)
```

No per-second database updates are required.

---

# 69. API Architecture

API style:

**REST + WebSocket/SSE where useful**

REST handles:

- commands;
- queries;
- account management;
- purchases;
- farm operations.

Real-time transport is optional and should only be used for:

- server events;
- notifications;
- live multiplayer features if introduced later.

MVP does not require persistent WebSocket connectivity.

---

# 70. Example API

```text
GET /farms/:id

POST /farms/:id/fields/:fieldId/plant

POST /farms/:id/fields/:fieldId/water

POST /farms/:id/fields/:fieldId/harvest

GET /farms/:id/inventory

GET /market

POST /market/sell

POST /buildings

POST /buildings/:id/upgrade

GET /contracts

POST /contracts/:id/accept

POST /payments

POST /payments/webhooks/:provider
```

---

# 71. Database Core Entities

Initial schema should contain:

```text
User
Farm
FarmPlot
CropInstance
Livestock
Building
Inventory
InventoryItem
ProductionJob
MarketPrice
MarketTransaction
Contract
WorldEvent
ResourceNode
Reputation
Achievement
Notification
Payment
PaymentTransaction
GameLedgerEntry
FarmStatistic
```

---

# 72. Economic Ledger

Currency changes must be recorded.

Example:

```text
GameLedgerEntry

id
farmId
type
amount
balanceBefore
balanceAfter
referenceType
referenceId
createdAt
```

Examples:

```text
HARVEST_REWARD
MARKET_SALE
BUILDING_PURCHASE
SEED_PURCHASE
CONTRACT_REWARD
PAYMENT_REWARD
```

This makes the economy auditable.

---

# 73. Observability

The backend must monitor:

### Gameplay

- sessions;
- farm actions;
- progression;
- retention.

### Economy

- currency creation;
- currency destruction;
- item supply;
- item demand;
- market prices.

### Payments

- payment initiation;
- success;
- failure;
- webhook failures;
- reconciliation.

### Infrastructure

- API latency;
- errors;
- database latency;
- queue failures;
- uptime.

---

# 74. Analytics Events

Track:

```text
game_started
farm_loaded
crop_planted
crop_watered
crop_harvested
animal_fed
animal_product_collected
item_sold
item_bought
building_constructed
building_upgraded
contract_accepted
contract_completed
kgotla_opened
bushveld_explored
resource_collected
notification_opened
payment_started
payment_completed
payment_failed
session_ended
```

---

# 75. Performance Requirements

Target:

### Desktop

60 FPS where hardware allows.

### Mobile

Stable:

**30-60 FPS**

depending on device capability.

The game must remain playable on modest Android hardware.

Initial performance priorities:

1. fast startup;
2. low memory usage;
3. low asset download size;
4. stable rendering;
5. minimal battery consumption.

---

# 76. Network Requirements

The game should tolerate:

- slow networks;
- intermittent connectivity;
- mobile data;
- temporary API failures.

The client should:

- cache static assets;
- retry safe requests;
- show connection state;
- prevent duplicate actions;
- gracefully handle failed requests.

---

# 77. Offline Strategy

Full offline gameplay is not required for MVP because the authoritative state exists server-side.

However:

### Offline-capable

- cached shell;
- cached assets;
- previously viewed farm visuals;
- UI navigation.

### Online required

- authoritative farm actions;
- payments;
- market transactions;
- account synchronization.

Future versions may support more offline actions through a command queue.

---

# 78. PWA

Molemisi should be installable from supported browsers.

PWA requirements:

- manifest;
- icons;
- splash screen;
- cached application shell;
- service worker;
- update strategy;
- responsive design.

---

# 79. Notifications

Browser/mobile notifications may eventually communicate:

- crop readiness;
- contract expiration;
- important farm problems;
- special events.

Notifications must be opt-in.

---

# 80. Accessibility

Molemisi must provide:

- readable typography;
- strong contrast;
- large touch targets;
- non-color-only state indicators;
- adjustable audio;
- optional reduced animation;
- clear feedback.

---

# 81. Security

Security requirements include:

- secure authentication;
- HTTPS;
- server-side authorization;
- rate limiting;
- input validation;
- CSRF protection where applicable;
- secure cookies/tokens;
- database access controls;
- payment webhook validation;
- audit logging;
- secret management.

---

# 82. Administrative System

An admin dashboard should eventually allow authorized operators to:

- inspect farms;
- inspect transactions;
- inspect economy;
- modify game configuration;
- create events;
- adjust market parameters;
- inspect payment states;
- suspend abusive accounts;
- review logs.

Admin operations must be audited.

---

# 83. Game Configuration

Game values should not be hardcoded throughout the application.

Configuration should include:

```text
crop growth durations
crop prices
water consumption
animal production
building costs
upgrade costs
market modifiers
event probabilities
reward values
```

This enables live balancing without redeploying the entire game.

Configuration changes should be versioned.

---

# 84. Content Management

Game content should be data-driven.

Example:

```json
{
  "id": "tomato",
  "seedCost": 12,
  "growthDuration": 86400,
  "waterRequirement": 80,
  "baseYield": 18,
  "baseSellPrice": 25
}
```

This makes adding new crops significantly easier.

---

# 85. Testing Strategy

## Unit Tests

Test:

- crop growth;
- water consumption;
- harvest;
- market pricing;
- production;
- progression;
- payment calculations.

## Integration Tests

Test:

- farm actions;
- inventory;
- database;
- payments;
- webhooks.

## Economy Simulation

Run thousands of simulated farms over hundreds of game days.

Detect:

- inflation;
- dominant crops;
- impossible progression;
- broken production chains;
- runaway wealth.

## End-to-End

Test:

```text
Register
 ↓
Create Farm
 ↓
Plant
 ↓
Wait
 ↓
Harvest
 ↓
Sell
 ↓
Build
 ↓
Upgrade
```

---

# 86. MVP Definition

Molemisi MVP must include:

## Farm

- 1 farm;
- fixed layout;
- interactive objects.

## Crops

4 crops.

## Livestock

Chicken.

## Buildings

- house;
- field;
- chicken coop;
- storage;
- water tank.

## Resources

- Pula;
- seeds;
- crops;
- eggs;
- water;
- wood;
- stone.

## Gameplay

- planting;
- watering;
- growth;
- harvesting;
- livestock production;
- inventory;
- selling;
- buying;
- construction;
- upgrades;
- time progression;
- offline progression.

## World

- Farm;
- Kgotla;
- basic Bushveld.

## Social

3-5 functional NPCs.

## Economy

- market;
- basic dynamic prices;
- contracts.

## Technical

- accounts;
- cloud saves;
- server-authoritative game state;
- responsive mobile UI;
- PWA;
- analytics.

---

# 87. Explicitly Out of MVP

The following should NOT delay MVP:

- multiplayer;
- PvP;
- complex character customization;
- combat;
- elaborate story;
- dozens of NPCs;
- dozens of animals;
- dozens of crops;
- fully simulated wildlife;
- complex AI;
- blockchain;
- NFTs;
- cryptocurrency;
- land trading;
- player-to-player marketplace;
- native mobile app;
- advanced automation;
- complex social networks.

Molemisi needs to prove its **core farm loop** before becoming a giant agricultural civilization simulator.

---

# 88. MVP Success Criteria

The MVP is successful if a new player can:

1. Start a farm.
2. Understand the farm without a long tutorial.
3. Plant crops.
4. Observe visible growth.
5. Harvest crops.
6. Sell produce.
7. Purchase an upgrade.
8. Return later and see the farm changed.
9. Understand what requires attention.
10. Want to improve the farm again.

The most important metric is not:

> "How many systems exist?"

It is:

> **"Does the player want to check their farm again?"**

---

# 89. Development Phases

## Phase 0: Design Foundation

Deliver:

- PRD;
- game design document;
- economy spreadsheet;
- art bible;
- technical architecture;
- UX specification.

---

## Phase 1: Visual Prototype

Build:

- farm;
- pixel environment;
- clickable objects;
- basic animations;
- responsive canvas.

Goal:

> Prove the visual experience.

---

## Phase 2: Core Farming

Build:

- crops;
- planting;
- growth;
- water;
- harvest;
- inventory.

Goal:

> Prove the core game loop.

---

## Phase 3: Economy

Build:

- market;
- selling;
- buying;
- currency;
- storage;
- basic upgrades.

Goal:

> Prove management.

---

## Phase 4: Living Farm

Build:

- chickens;
- livestock production;
- weather;
- ambient animation;
- events;
- offline progression.

Goal:

> Make the farm feel alive.

---

## Phase 5: World

Build:

- Kgotla;
- NPCs;
- contracts;
- Bushveld;
- resource discovery.

Goal:

> Expand the game beyond the farm.

---

## Phase 6: Platform

Build:

- accounts;
- PWA;
- mobile optimization;
- notifications;
- analytics;
- administration.

Goal:

> Make Molemisi a real service.

---

## Phase 7: Monetization

Build:

- payment abstraction;
- mobile money;
- transaction ledger;
- purchases;
- cosmetics;
- payment reconciliation.

Goal:

> Enable sustainable commercialization.

---

# 90. Release Strategy

## Alpha

Internal testing.

Focus:

- game loop;
- bugs;
- economy;
- performance.

## Closed Beta

Small invited group.

Focus:

- retention;
- usability;
- mobile performance;
- economy balance.

## Open Beta

Public access.

Focus:

- scalability;
- monetization;
- player behavior;
- content demand.

## Version 1.0

Stable:

- farm;
- market;
- Kgotla;
- Bushveld;
- livestock;
- progression;
- payments;
- mobile/PWA.

---

# 91. Key Product Metrics

## Engagement

- Day 1 retention;
- Day 7 retention;
- Day 30 retention;
- average sessions/day;
- average session duration;
- return frequency.

## Gameplay

- crops planted/player;
- crops harvested/player;
- buildings upgraded;
- contracts completed;
- Bushveld interactions.

## Economy

- average farm wealth;
- currency earned;
- currency spent;
- inventory turnover;
- market participation.

## Monetization

- payer conversion;
- payment success rate;
- average purchase value;
- repeat purchase rate.

---

# 92. Product Risks

## Risk 1: The Game Becomes a Spreadsheet

Mitigation:

- visual information;
- contextual menus;
- animations;
- limited raw statistics.

---

## Risk 2: Too Much Complexity

Mitigation:

- staged progression;
- progressive unlocks;
- tutorial through gameplay.

---

## Risk 3: Economy Becomes Broken

Mitigation:

- economy simulator;
- controlled price ranges;
- transaction ledger;
- continuous balancing.

---

## Risk 4: Mobile Performance

Mitigation:

- small assets;
- sprite sheets;
- limited particles;
- performance budgets;
- low-end Android testing.

---

## Risk 5: Asset Production Becomes Impossible

Mitigation:

- strict art bible;
- reusable tiles;
- modular buildings;
- standardized sprites;
- data-driven content.

---

## Risk 6: Monetization Damages Gameplay

Mitigation:

- cosmetics first;
- convenience second;
- avoid aggressive pay-to-win.

---

## Risk 7: Payment Failures

Mitigation:

- payment abstraction;
- transaction ledger;
- webhook verification;
- reconciliation;
- idempotency.

---

# 93. Design North Star

Every feature should answer:

### Question 1

**Does this make the farm feel more alive?**

### Question 2

**Does this create an interesting management decision?**

### Question 3

**Does the player receive clear feedback?**

### Question 4

**Does this strengthen progression?**

### Question 5

**Does this fit the Molemisi world?**

If the answer is "no" to all five, the feature probably does not belong.

---

# 94. The Molemisi Experience

The intended experience can be summarized as:

```text
                 MOLEMISI
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
       COZY                     DEEP
          │                     │
      Pixel Art             Management
          │                     │
          └──────────┬──────────┘
                     ↓
                LIVING FARM
                     │
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
    Farming       Commerce       Community
       │             │             │
       ↓             ↓             ↓
     Crops         Market        Kgotla
    Livestock     Contracts      Reputation
       │             │             │
       └─────────────┼─────────────┘
                     ↓
                 PROGRESSION
                     │
                     ↓
                 EXPANSION
                     │
                     ↓
               AGRICULTURAL
                 ENTERPRISE
```

---

# 95. Final Product Definition

**Molemisi is a persistent pixel-art agricultural management game in which the player builds and operates a living Botswana-inspired farm through simple point-and-click interactions, contextual management interfaces and visually rich feedback.**

It deliberately removes:

- character movement;
- combat;
- complex traversal;
- unnecessary menus.

It emphasizes:

- observation;
- decision-making;
- resource management;
- farming;
- livestock;
- production;
- commerce;
- community;
- expansion;
- automation;
- and long-term progression.

The game should feel like:

> **opening a tiny digital homestead and discovering that it has quietly become an entire agricultural world.**

---

# 96. Technology Decision Summary

| Layer           | Technology                                | Purpose                       |
| --------------- | ----------------------------------------- | ----------------------------- |
| Game Renderer   | **Phaser + TypeScript**                   | 2D pixel game                 |
| Web Application | **Next.js + React + TypeScript**          | Shell, UI, accounts, payments |
| Backend         | **NestJS + TypeScript**                   | Authoritative game API        |
| Database        | **PostgreSQL**                            | Persistent game state         |
| ORM             | **Prisma**                                | Typed DB access               |
| Cache           | **Redis**                                 | Caching/rate limiting         |
| Jobs            | **BullMQ**                                | Background processing         |
| Mobile          | **Capacitor**                             | Android/iOS packaging         |
| Assets          | **S3-compatible object storage + CDN**    | Game assets                   |
| Deployment      | **Docker + managed cloud infrastructure** | Reproducible deployment       |
| Testing         | **Vitest/Jest + Playwright**              | Unit/integration/E2E          |
| API Docs        | **OpenAPI/Swagger**                       | API contract                  |
| Monitoring      | **OpenTelemetry-compatible stack**        | Observability                 |
| Source Control  | **Git + GitHub**                          | Version control               |
| Monorepo        | **pnpm + Turborepo**                      | Shared packages/builds        |

Phaser is the key decision here: it is explicitly designed for 2D browser games, works across desktop/mobile browsers, supports WebGL/Canvas and TypeScript, and can sit inside a broader React/Next.js application.

---

# 97. Recommended Architectural Principle

The final architecture should be:

```text
                         MOLEMISI
                            │
          ┌─────────────────┴──────────────────┐
          │                                    │
     APPLICATION                            GAME
          │                                    │
      Next.js                              Phaser
          │                                    │
   ┌──────┼──────┐                    ┌────────┼────────┐
   │      │      │                    │        │        │
 Account Payments Settings          Farm    Kgotla  Bushveld
   │      │      │                    │        │        │
   └──────┴──────┘                    └────────┼────────┘
                                                │
                                                ↓
                                         NestJS API
                                                │
                     ┌──────────────────────────┼────────────────────────┐
                     │                          │                        │
                 Game Engine                 Economy                 Payments
                     │                          │                        │
                     └──────────────────────────┼────────────────────────┘
                                                │
                                      ┌─────────┴─────────┐
                                      │                   │
                                  PostgreSQL             Redis
                                      │                   │
                                      └─────────┬─────────┘
                                                │
                                           Background
                                              Jobs
```

This gives Molemisi a very important property:

> **The game client can evolve independently from the simulation and economy.**

That means you can completely redesign the farm's graphics without rewriting the economic engine, or change the market system without rewriting the pixel renderer.

---

# 98. Ultimate Product Principle

Molemisi should never feel like:

> **"A website pretending to be a game."**

It should feel like:

> **"A tiny living world that happens to run in a browser."**

The technology exists to support that illusion.

The pixel art creates the **world**.

The simulation creates **life**.

The economy creates **decisions**.

The UI creates **clarity**.

The progression creates **attachment**.

And mobile money eventually turns the game from a little farm into a potentially viable **local digital entertainment business**.

**That is the product.**
