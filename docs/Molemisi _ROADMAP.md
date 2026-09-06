# MOLEMISI

## Development Guide & Implementation Roadmap

**Document Type:** Development Guide  
**Project:** Molemisi  
**Version:** 1.0  
**Status:** Development Baseline  
**Implementation note (2026-09-06):** Milestones M0–M15 are largely done; M16 Alpha is in progress. This roadmap remains the planned sequence. Live checklist: `docs/DEVELOPMENT_STATE.md` and `docs/20_MVP_Implementation_Plan.md`.  
**Audience:** Lead Developer, Software Engineers, Game Developers, Technical Artists, QA, AI Coding Agents  
**Primary Objective:** Provide the authoritative sequence for transforming Molemisi from an empty repository into a production-ready web-based pixel farm simulator.

---

# 1. Purpose

This document defines the **development order, implementation priorities, milestones, dependencies, quality gates, and completion criteria** for Molemisi.

It is not a game design document and does not replace the individual technical specifications.

Instead, it answers:

> **What should be built, in what order, why, and how do we know it is finished?**

All implementation work should follow this roadmap unless an Architecture Decision Record explicitly authorizes a deviation.

---

# 2. Product Definition

Molemisi is a web-first, mobile-friendly cozy farm simulator focused on **farm management rather than character movement**.

The player interacts directly with a visually rich pixel-art world through clicking or tapping.

The primary experience is:

```text
OBSERVE
   ↓
SELECT
   ↓
ACT
   ↓
RECEIVE FEEDBACK
   ↓
PRODUCE
   ↓
SELL / COMPLETE CONTRACT
   ↓
EARN
   ↓
UPGRADE
   ↓
UNLOCK
   ↓
EXPAND
```

The game combines:

- accessible management mechanics
- persistent progression
- elapsed-time simulation
- pixel-art environments
- agricultural production
- livestock
- economic decision-making
- community interaction
- Kgotla progression
- Bushveld exploration
- seasonal and world events

The game should have a distinct Botswana-inspired identity rather than functioning as a clone of an existing farming game.

---

# 3. Development Philosophy

## 3.1 Build the Game Before Building the Empire

Development must prioritize the playable game loop.

The following priority applies:

```text
CORE GAME LOOP
      ↓
FARM SYSTEMS
      ↓
ECONOMY
      ↓
WORLD SYSTEMS
      ↓
SOCIAL SYSTEMS
      ↓
MONETIZATION
      ↓
LIVE OPERATIONS
```

Infrastructure should support gameplay, not delay it unnecessarily.

---

# 4. Core Development Principles

## 4.1 Server Authority

The client is never authoritative over economically meaningful state.

The server must determine:

- currency
- inventory
- crop maturity
- production completion
- ownership
- contracts
- rewards
- purchases
- payments
- progression

---

## 4.2 Data-Driven Content

Game content should be represented as configuration/data wherever practical.

Examples:

```text
Crops
Buildings
Animals
Items
Recipes
Contracts
Rewards
Events
Progression
```

Adding a new crop should not require rewriting the farming engine.

---

## 4.3 Modular Monolith First

The initial backend should be a modular NestJS application.

Do not introduce microservices merely because Molemisi may eventually become large.

The initial architecture should optimize for:

- development speed
- maintainability
- low operational complexity
- single-developer execution
- clear domain boundaries

---

## 4.4 Visual Feedback Is Gameplay

Every meaningful player action should have visible feedback.

Examples:

- selection highlights
- animations
- particles
- floating numbers
- progress indicators
- state changes
- notifications
- sound effects
- transitions

The game should communicate state visually rather than relying entirely on text.

---

## 4.5 Mobile Is a First-Class Target

The game should be designed for:

- desktop browsers
- mobile browsers
- PWA installation

Native packaging may be introduced later through Capacitor.

---

# 5. Technology Baseline

| System          | Technology                                |
| --------------- | ----------------------------------------- |
| Game Engine     | Phaser                                    |
| Game Language   | TypeScript                                |
| Web Application | Next.js                                   |
| UI              | React + Tailwind CSS                      |
| Backend         | NestJS                                    |
| Database        | Supabase PostgreSQL                       |
| Authentication  | Supabase Auth                             |
| File Storage    | Supabase Storage                          |
| Validation      | Shared TypeScript schemas                 |
| Package Manager | pnpm                                      |
| Architecture    | Monorepo                                  |
| Mobile          | PWA → Capacitor                           |
| Optional Cache  | Redis                                     |
| Optional Jobs   | BullMQ                                    |
| Deployment      | Cloud hosting appropriate to each service |
| CI/CD           | GitHub Actions                            |

---

# 6. System Boundaries

The implementation must preserve the following boundaries.

```text
┌─────────────────────────────────────┐
│              NEXT.JS                │
│                                     │
│ Auth / Account / Settings / PWA     │
│ Payments UI / Admin / Application UI│
└─────────────────┬───────────────────┘
                  │
                  │
┌─────────────────▼───────────────────┐
│               NESTJS                │
│                                     │
│ Authoritative Game Logic            │
│ Economy / Inventory / Simulation    │
│ Progression / Contracts / Payments  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│             SUPABASE                │
│                                     │
│ PostgreSQL / Auth / Storage         │
│ Realtime where justified            │
└─────────────────────────────────────┘

                  ▲
                  │
┌─────────────────┴───────────────────┐
│               PHASER                │
│                                     │
│ Rendering / Input / Animation       │
│ Visual State / Interaction          │
└─────────────────────────────────────┘
```

Phaser should not become the location where the game's economic rules are implemented.

---

# 7. Master Development Sequence

The project shall be developed through the following stages:

```text
M0  Product & Documentation Baseline
 ↓
M1  Repository & Development Infrastructure
 ↓
M2  Authentication & Persistent Data
 ↓
M3  Phaser Rendering Foundation
 ↓
M4  First Playable Vertical Slice
 ↓
M5  Time & Offline Simulation
 ↓
M6  Farm Management
 ↓
M7  Livestock & Production
 ↓
M8  Economy & Market
 ↓
M9  Contracts & Progression
 ↓
M10 Kgotla
 ↓
M11 Bushveld
 ↓
M12 Seasons & World Events
 ↓
M13 Mobile / PWA
 ↓
M14 Monetization & Payments
 ↓
M15 Security / Analytics / Administration
 ↓
M16 Alpha
 ↓
M17 Closed Beta
 ↓
M18 Soft Launch
 ↓
M19 Public Launch
 ↓
M20 Live Operations
```

Each milestone has a **quality gate**.

No milestone should be considered complete merely because code exists.

---

# 8. M0 — PRODUCT & DOCUMENTATION BASELINE

## Objective

Establish a stable product definition before significant implementation.

## Tasks

Finalize:

- Game Design Specification
- System Architecture Specification
- UI/UX Specification
- Rendering Specification
- Art Direction Specification
- Economy Specification
- Database Specification
- API Specification
- Simulation Specification
- Payment Specification
- Security Specification
- Testing Specification
- Deployment Specification
- Analytics Specification
- MVP Implementation Plan
- Agent Implementation Guide

Finalize relevant ADRs.

## Deliverables

```text
docs/
├── GAME_DESIGN.md
├── ARCHITECTURE.md
├── UI_UX.md
├── RENDERING.md
├── ART_DIRECTION.md
├── ECONOMY.md
├── DATABASE.md
├── API.md
├── SIMULATION.md
├── PAYMENTS.md
├── SECURITY.md
├── TESTING.md
├── DEPLOYMENT.md
├── ANALYTICS.md
├── IMPLEMENTATION_PLAN.md
└── AGENT_GUIDE.md
```

## Quality Gate

The team can answer:

- What is Molemisi?
- What is the MVP?
- What is explicitly out of scope?
- What is authoritative server state?
- What does the first playable loop look like?
- What is the visual identity?
- What is the development stack?

---

# 9. M1 — REPOSITORY & DEVELOPMENT INFRASTRUCTURE

## Objective

Create a working development environment.

## Tasks

Create:

```text
apps/
├── web/
├── game/
└── api/

packages/
├── shared/
├── game-types/
├── game-config/
├── validation/
└── ui/

supabase/
├── migrations/
└── seed/

assets/
docs/
scripts/
.github/
```

Implement:

- pnpm workspace
- TypeScript strict mode
- linting
- formatting
- environment configuration
- CI pipeline
- development scripts
- Supabase local configuration
- basic logging

## Quality Gate

The following commands work:

```text
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

---

# 10. M2 — AUTHENTICATION & PERSISTENT DATA

## Objective

Create the persistent player foundation.

## Initial entities

```text
profiles
farms
farm_plots
inventory
inventory_items
crop_instances
buildings
livestock
game_ledger_entries
```

## Tasks

Implement:

- registration
- login
- logout
- authenticated sessions
- player profile
- farm creation
- farm retrieval
- database migrations
- seed data
- row-level security
- ownership validation

## Quality Gate

A user can:

```text
Register
 ↓
Login
 ↓
Create Farm
 ↓
Close Browser
 ↓
Return
 ↓
Load Same Farm
```

---

# 11. M3 — PHASER RENDERING FOUNDATION

## Objective

Create the visual game environment.

## Scenes

```text
BootScene
   ↓
PreloadScene
   ↓
FarmScene
```

Future extension points:

```text
KgotlaScene
BushveldScene
```

## Implement

- game canvas
- camera
- scaling
- responsive viewport
- asset loading
- tile rendering
- farm layout
- interaction zones
- basic UI bridge
- input handling

## Initial farm

The farm should contain:

- farmhouse
- plots
- water source
- storage
- trees
- rocks
- basic decoration

Use placeholder art initially.

## Quality Gate

The player can open the farm and visually identify:

- where they are
- what they can interact with
- where crops belong
- where resources are stored

---

# 12. M4 — FIRST PLAYABLE VERTICAL SLICE

## Objective

Create the first complete game loop.

This is the **primary MVP development gate**.

## Required loop

```text
Enter Farm
 ↓
Select Plot
 ↓
Plant Crop
 ↓
Wait
 ↓
Crop Grows
 ↓
Harvest
 ↓
Inventory
 ↓
Sell
 ↓
Receive Currency
 ↓
Buy Seed
 ↓
Plant Again
```

## Required systems

- one farm
- 1–2 crops
- planting
- crop growth
- harvesting
- inventory
- currency
- market/selling
- seed purchasing
- persistence
- visual feedback

## Quality Gate

A new player can complete the entire loop without developer intervention.

The loop must be:

- functional
- understandable
- responsive
- visually satisfying
- persistent

If the loop is not enjoyable, stop feature expansion and improve it.

---

# 13. M5 — TIME & OFFLINE SIMULATION

## Objective

Allow the world to progress while the player is away.

## Model

The server calculates state using elapsed time.

```text
Last State
+
Current Time
+
Game Rules
=
Current State
```

## Implement

- timestamps
- crop progression
- production timers
- offline progression
- daily progression
- simulation reconciliation
- clock validation
- idempotent state updates

## Quality Gate

A player can leave the game and return later to find correctly progressed crops and production.

The client clock must not be trusted for economically meaningful progression.

---

# 14. M6 — FARM MANAGEMENT

## Objective

Turn the prototype into a management game.

## Farming

Implement:

- multiple crops
- growth stages
- watering
- harvest yields
- crop seasons
- optional soil mechanics
- fertilizer foundation

## Buildings

Initial buildings:

```text
Farmhouse
Storage
Water Source
Granary
Workshop
Market Stall
```

## Upgrades

Implement:

- storage capacity
- production speed
- plot capacity
- farm expansion
- building upgrades

## Quality Gate

The player has meaningful choices about how to develop the farm.

---

# 15. M7 — LIVESTOCK & PRODUCTION

## Objective

Introduce secondary production chains.

## Animals

Initial:

```text
Chicken
Goat
Cattle
```

## Animal systems

- feeding
- happiness
- health
- production
- lifecycle
- collection

## Production chains

Example:

```text
Goat
 ↓
Milk
 ↓
Processing
 ↓
Product
 ↓
Market
```

## Quality Gate

Livestock and production create meaningful economic choices rather than simply increasing the number of buttons.

---

# 16. M8 — ECONOMY & MARKET

## Objective

Establish Molemisi's economic engine.

## Currency

Primary currency:

**Pula**

## Economy systems

Implement:

- buying
- selling
- production costs
- item prices
- currency sinks
- currency faucets
- market demand
- transaction ledger

## Economy monitoring

Track:

```text
Currency Created
Currency Destroyed
Items Created
Items Destroyed
Average Player Wealth
```

## Quality Gate

The economy remains viable over long simulations.

No obvious infinite-money loops should exist.

---

# 17. M9 — CONTRACTS & PROGRESSION

## Objective

Create structured goals and long-term progression.

## Contracts

Categories:

- local
- community
- commercial
- seasonal
- special

Example:

```text
Contract
20 Sorghum
10 Eggs
5 Milk

Reward:
Pula
XP
Reputation
```

## Progression

Implement:

- player level
- farm level
- building progression
- unlocks
- reputation
- achievements

## Quality Gate

Players always have understandable short-, medium-, and long-term goals.

---

# 18. M10 — KGOTLA

## Objective

Create the first major world-level management system.

The Kgotla is a persistent community environment.

## Functions

Potential services:

- community contracts
- announcements
- permits
- reputation
- special markets
- community projects
- NPC relationships
- seasonal activities
- events

## Evolution

The Kgotla should change based on player progression and community activity.

```text
Basic Kgotla
 ↓
Player Contributions
 ↓
Infrastructure Improvements
 ↓
New Services
 ↓
New Opportunities
```

## Quality Gate

The Kgotla provides gameplay that cannot simply be replaced by another menu.

---

# 19. M11 — BUSHVELD

## Objective

Create the exploration/resource layer.

The Bushveld should complement farming rather than turn Molemisi into an RPG.

## Activities

- gathering
- resource discovery
- rare materials
- seeds
- plants
- wood
- stone
- environmental discoveries
- special contracts

## Procedural generation

Generate Bushveld regions from controlled parameters:

```text
Seed
Terrain
Resource distribution
Landmarks
Environmental features
```

Generation must remain deterministic where required.

## Quality Gate

Bushveld exploration provides useful resources and decisions without undermining the farm-management identity.

---

# 20. M12 — SEASONS & WORLD EVENTS

## Objective

Make Molemisi feel alive over time.

## Systems

Implement:

- seasons
- weather
- seasonal crops
- seasonal production
- temporary market changes
- festivals
- community events

Examples:

```text
Rain Season
Harvest Festival
Cattle Fair
Community Day
Special Kgotla Event
```

## Quality Gate

Returning players encounter meaningful changes without feeling forced to play continuously.

---

# 21. M13 — MOBILE & PWA

## Objective

Make the game excellent on mobile browsers.

## Requirements

- touch controls
- responsive canvas
- responsive menus
- large interaction targets
- mobile inventory
- mobile navigation
- PWA manifest
- install support
- asset caching
- reconnect handling

## Later

Package using Capacitor when the web version is stable.

## Quality Gate

The complete farming loop is comfortable on a phone.

---

# 22. M14 — MONETIZATION & PAYMENTS

## Objective

Introduce commercial functionality without compromising game integrity.

## Payment architecture

Use an abstraction:

```text
PaymentProvider
├── createPayment()
├── verifyPayment()
├── handleWebhook()
└── refundPayment()
```

Provider-specific implementation should remain isolated.

## Rules

Payment completion must be verified server-side.

Never trust:

```text
client → "payment successful"
```

Instead:

```text
Payment Provider
 ↓
Webhook
 ↓
Verification
 ↓
Transaction
 ↓
Entitlement
```

## Monetization priorities

Prefer:

1. cosmetics
2. optional premium content
3. expansions
4. carefully designed convenience

Avoid pay-to-win systems.

## Quality Gate

Every paid transaction is:

- verifiable
- idempotent
- auditable
- reversible where appropriate

---

# 23. M15 — SECURITY, ANALYTICS & ADMINISTRATION

## Security

Implement:

- authorization
- ownership checks
- rate limiting
- input validation
- audit logging
- secure secrets
- payment verification
- economy validation
- abuse detection

## Analytics

Track:

### Gameplay

- farms created
- crops planted
- crops harvested
- contracts completed
- buildings constructed
- sessions
- progression

### Product

- DAU
- retention
- session duration
- onboarding completion
- churn points

### Economy

- currency creation
- currency destruction
- resource creation
- resource destruction

## Admin

Build:

- player lookup
- farm inspection
- inventory inspection
- ledger inspection
- content management
- event management
- announcements
- moderation tools

## Quality Gate

Operators can diagnose major player/account/economy problems without direct database manipulation.

---

# 24. M16 — ALPHA

## Objective

Produce the first complete internal version.

## Required

- farming
- livestock
- production
- inventory
- market
- contracts
- progression
- Kgotla
- Bushveld
- persistence
- offline simulation
- mobile UI
- basic monetization infrastructure
- analytics
- admin tools

## Alpha Test

Answer:

> Can someone play Molemisi for 1–2 hours without the experience breaking?

---

# 25. M17 — CLOSED BETA

## Objective

Validate Molemisi with real players.

## Test

Observe:

- onboarding
- first crop
- first harvest
- first sale
- first upgrade
- contract completion
- progression
- economy
- mobile usability

Do not rely exclusively on player surveys.

Observe where players hesitate.

## Quality Gate

Players should be able to understand the basic game without developer explanation.

---

# 26. M18 — ECONOMY & SCALE TEST

## Objective

Stress-test the simulation and economy.

Simulate:

```text
100 players
1,000 players
10,000 players
```

Where practical.

Test:

- database load
- API load
- concurrent transactions
- economic inflation
- production bottlenecks
- exploits
- runaway strategies
- resource shortages

## Quality Gate

No known economy-breaking exploit or major scalability failure remains unresolved.

---

# 27. M19 — SOFT LAUNCH

## Objective

Release Molemisi to a controlled audience.

Recommended sequence:

```text
Internal
 ↓
Small Test Group
 ↓
Botswana Beta
 ↓
Regional Beta
 ↓
Public
```

Monitor:

- retention
- errors
- payments
- economy
- performance
- server costs
- player feedback

---

# 28. M20 — PUBLIC LAUNCH

## Launch Requirements

### Gameplay

- farming
- livestock
- production
- economy
- contracts
- progression

### World

- farm
- Kgotla
- Bushveld
- seasons/events

### Platform

- authentication
- persistence
- mobile support
- PWA
- payments
- analytics
- administration

### Quality

- polished art
- sound
- music
- onboarding
- tutorials
- responsive UI
- stable performance
- recovery from network failures

---

# 29. POST-LAUNCH DEVELOPMENT

After launch, Molemisi becomes a live product.

## Content cadence

Potential monthly cycle:

```text
Week 1
Bug fixes + balancing

Week 2
New content

Week 3
Event

Week 4
Analytics + optimization
```

Potential expansions:

- new crops
- new animals
- new buildings
- new Kgotlas
- new Bushveld regions
- new production chains
- festivals
- NPC storylines
- community projects

---

# 30. DEVELOPMENT PRIORITY MODEL

Every feature must be assigned a priority.

## P0 — Critical

Required for the game to function.

Examples:

- authentication
- farm state
- planting
- harvesting
- inventory
- economy
- persistence

## P1 — Core

Required for a compelling MVP.

Examples:

- production
- livestock
- contracts
- progression
- Kgotla
- Bushveld

## P2 — Enhancement

Improves quality but does not define the core game.

Examples:

- advanced weather
- achievements
- cosmetics
- expanded NPC systems
- advanced analytics

## P3 — Future

Do not build during MVP.

Examples:

- multiplayer
- complex combat
- blockchain
- NFTs
- massive procedural worlds
- advanced AI NPCs

---

# 31. FEATURE DEVELOPMENT LOOP

Every feature should follow:

```text
1. Define
   ↓
2. Design
   ↓
3. Model data
   ↓
4. Define API/domain command
   ↓
5. Implement server logic
   ↓
6. Implement client interaction
   ↓
7. Implement visual feedback
   ↓
8. Test
   ↓
9. Playtest
   ↓
10. Document
```

A feature is not complete when the backend works.

It is complete when the **player experience works**.

---

# 32. GAME COMMAND PATTERN

Major player actions should follow explicit commands.

Examples:

```text
PlantCrop
WaterPlot
HarvestCrop

FeedLivestock
CollectProduction

BuildStructure
UpgradeBuilding

BuyItem
SellItem

AcceptContract
CompleteContract

ExploreBushveld
CollectResource
```

The general flow:

```text
Player Input
     ↓
Game Command
     ↓
Authentication
     ↓
Authorization
     ↓
Domain Validation
     ↓
Database Transaction
     ↓
State Change
     ↓
Response
     ↓
Visual Feedback
```

---

# 33. DEFINITION OF DONE

A feature is **DONE** only when:

- requirements are implemented
- server rules are implemented
- database changes exist
- authorization exists
- validation exists
- API is functional
- client interaction works
- visual feedback exists
- errors are handled
- tests exist
- mobile interaction is considered
- documentation is updated

"Code compiles" is not Definition of Done.

---

# 34. MILESTONE EXIT CRITERIA

Every milestone must produce evidence.

Examples:

### M1

```text
Repository runs
CI passes
Applications start
```

### M2

```text
User registers
Farm persists
RLS works
```

### M4

```text
Plant → Grow → Harvest → Sell → Buy
```

### M8

```text
Economy survives simulated play
```

### M13

```text
Game works comfortably on mobile
```

### M16

```text
Complete Alpha build
```

### M19

```text
Real players successfully complete the game loop
```

---

# 35. DEVELOPMENT AGENT RULES

AI coding agents working on Molemisi must follow these rules.

## Rule 1

Read the relevant specification before modifying architecture.

## Rule 2

Do not invent new technologies without justification.

## Rule 3

Do not create microservices unless an ADR requires them.

## Rule 4

Do not put business logic inside Phaser.

## Rule 5

Do not trust client-provided economic state.

## Rule 6

Do not expose Supabase service credentials to the client.

## Rule 7

Do not duplicate game constants across applications.

## Rule 8

Do not implement future features merely because extension points exist.

## Rule 9

Do not replace working systems with abstractions that provide no current value.

## Rule 10

Every substantial architectural change requires documentation.

---

# 36. ART DEVELOPMENT SHOULD RUN IN PARALLEL

Programming and art should not be strictly sequential.

Recommended pipeline:

```text
Prototype
   ↓
Placeholder Art
   ↓
Gameplay Validation
   ↓
Final Art
   ↓
Animation
   ↓
Polish
```

Do not create hundreds of final assets before gameplay has been validated.

---

# 37. MVP SCOPE

The first public MVP should be deliberately constrained.

## Required

```text
Player
Farm
Plots
Crops
Inventory
Currency
Market
Buildings
Basic production
Basic progression
Persistence
Offline simulation
Mobile interface
```

## Strongly preferred

```text
Livestock
Contracts
Kgotla
Basic Bushveld
Seasons
```

## Deferred

```text
Multiplayer
Advanced NPC AI
Combat
Blockchain
NFTs
Complex trading
Large-scale social systems
```

---

# 38. THE FIRST 30 DEVELOPMENT DAYS

The first month should look approximately like this.

## Week 1

```text
Repository
Architecture
Supabase
Next.js
NestJS
Phaser
CI
Environment configuration
```

## Week 2

```text
Authentication
Player profile
Farm database
Farm API
Farm creation
Farm retrieval
```

## Week 3

```text
Phaser farm
Plots
Interaction
Crop data
Planting
Basic crop rendering
```

## Week 4

```text
Growth
Harvest
Inventory
Currency
Selling
Buying
Persistence
```

### Day 30 target

The player should be able to play:

```text
LOGIN
 ↓
ENTER FARM
 ↓
PLANT
 ↓
WAIT
 ↓
HARVEST
 ↓
SELL
 ↓
BUY
 ↓
PLANT AGAIN
```

That is the first true Molemisi milestone.

---

# 39. FIRST 90-DAY TARGET

By approximately the end of the initial major development cycle, the target should be:

```text
                    MOLEMISI ALPHA CORE

                       ┌──────────┐
                       │   FARM   │
                       └────┬─────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
          CROPS         LIVESTOCK       BUILDINGS
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                        PRODUCTION
                            │
                            ▼
                         MARKET
                            │
                            ▼
                         ECONOMY
                            │
                     ┌──────┴──────┐
                     ▼             ▼
                 CONTRACTS      PROGRESSION
                     │             │
                     └──────┬──────┘
                            ▼
                         KGOTLA
                            │
                            ▼
                        BUSHVELD
```

The exact calendar duration may change. **Milestone completion, not arbitrary dates, is the authoritative measure.**

---

# 40. FINAL DEVELOPMENT LOOP

The entire project can ultimately be understood as four nested loops.

## Loop 1: Player Action

```text
Click
 ↓
Action
 ↓
Feedback
```

## Loop 2: Farm

```text
Produce
 ↓
Sell
 ↓
Earn
 ↓
Upgrade
 ↓
Produce More
```

## Loop 3: Progression

```text
Farm
 ↓
Unlock
 ↓
Expand
 ↓
New Systems
 ↓
New Decisions
```

## Loop 4: World

```text
Farm
 ↓
Kgotla
 ↓
Bushveld
 ↓
Community
 ↓
Events
 ↓
Return to Farm
```

These loops should reinforce one another.

---

# 41. FINAL SUCCESS CRITERIA

Molemisi is successful as a game when a new player naturally thinks:

> "I'll just harvest these crops."

Then:

> "I should upgrade my storage."

Then:

> "I need more sorghum."

Then:

> "There's a Kgotla contract for that."

Then:

> "I need a resource from the Bushveld."

Then:

> "When I get back, I'll expand the farm."

That chain of decisions is the heart of Molemisi.

The technology exists to make that loop reliable.

The art exists to make it pleasurable.

The economy exists to make decisions meaningful.

The world exists to make progression interesting.

**The roadmap therefore prioritizes the game loop first, then builds the world around it.**

---

# 42. MASTER DEFINITION OF MOLEMISI

The development team should use the following as the final guiding statement:

> **Molemisi is a persistent, cozy farm-management game in which the player grows a small homestead into a thriving agricultural enterprise through farming, production, trade, community participation, and exploration. The game emphasizes direct point-and-click management, rich pixel-art environments, meaningful economic decisions, persistent progression, and a distinctly Southern African world identity.**
