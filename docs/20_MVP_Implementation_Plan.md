# Document 20: MVP Implementation Plan

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-02

---

## 1. Implementation Overview

**NFR-PLAN-001**

### Phases

| Phase | Name                        | Duration | Dependencies |
| ----- | --------------------------- | -------- | ------------ |
| 0     | Foundation                  | 2 weeks  | None         |
| 1     | Visual Farm Prototype       | 2 weeks  | Phase 0      |
| 2     | Core Farming                | 3 weeks  | Phase 1      |
| 3     | Economy                     | 2 weeks  | Phase 2      |
| 4     | Livestock + Living Farm     | 2 weeks  | Phase 3      |
| 5     | Kgotla + Bushveld           | 2 weeks  | Phase 4      |
| 6     | Accounts + PWA + Production | 3 weeks  | Phase 5      |
| 7     | Payments + Monetization     | 2 weeks  | Phase 6      |

**Total MVP: 18 weeks (4.5 months)**

---

## 2. Phase 0: Foundation (Weeks 1-2)

### Objectives

- Set up monorepo structure
- Initialize all technology stacks
- Configure development environment
- Set up CI/CD pipeline

### Features

- [x] Monorepo with Turborepo
- [x] Next.js app shell
- [x] NestJS API skeleton
- [x] Supabase project setup
- [x] Database migrations (core tables)
- [x] Authentication (register/login)
- [x] Basic API endpoints (profile, farm)
- [x] Phaser game initialization
- [x] CI/CD pipeline
- [x] Development environment scripts

### Deliverables

- Working monorepo with all packages
- Authenticated API endpoints
- Database with core schema
- CI/CD running tests

### Acceptance Criteria

- `npm run dev` starts all services
- Player can register and login
- API returns authenticated responses
- Database migrations apply cleanly
- CI runs lint, typecheck, and tests

### Technical Risks

- Supabase local development setup complexity
- Phaser integration with Next.js

---

## 3. Phase 1: Visual Farm Prototype (Weeks 3-4)

### Objectives

- Create playable farm scene in Phaser
- Display farm plots
- Implement basic interactions

### Features

- [ ] Farm tilemap (16x16 tiles)
- [ ] Farm plot rendering (empty, planted, growing, ready)
- [ ] Tap/click to select plot
- [ ] Context menu (plant, water, harvest)
- [ ] Basic crop sprites (sorghum, maize)
- [ ] Planting animation
- [ ] Watering animation
- [ ] Harvesting animation
- [ ] HUD (currency, day counter)
- [ ] Bottom navigation bar
- [ ] Scene transitions

### Deliverables

- Playable farm prototype
- Visual feedback for all actions
- Mobile-responsive layout

### Acceptance Criteria

- Player can see farm plots
- Player can tap plot to see context menu
- Player can plant a crop (visual only)
- Player can water a crop (visual only)
- Player can harvest a crop (visual only)
- Responsive on mobile and desktop

### Technical Risks

- Pixel-perfect rendering across devices
- Performance on low-end mobile devices

---

## 4. Phase 2: Core Farming (Weeks 5-7)

### Objectives

- Implement complete farming system
- Connect to backend API
- Add inventory system

### Features

- [ ] Crop growth simulation
- [ ] Water management
- [ ] Crop quality system
- [ ] Disease and pest system
- [ ] Inventory system
- [ ] Seed purchase from market
- [ ] Crop sale at market
- [ ] Dynamic market prices
- [ ] Basic notifications
- [ ] Offline progression (crops)

### Deliverables

- Full farming loop (plant → grow → harvest → sell)
- Working economy (basic)
- Inventory management

### Acceptance Criteria

- Crops grow over time
- Crops need watering
- Crops can wither if neglected
- Harvested items go to inventory
- Items can be sold at market
- Currency is earned and spent
- Offline progression works

### Technical Risks

- Simulation accuracy across time zones
- Market price balancing

---

## 5. Phase 3: Economy (Weeks 8-9)

### Objectives

- Balance economy
- Add all crop types
- Implement contracts

### Features

- [ ] All 11 crop types
- [ ] Crop quality system (4 tiers)
- [ ] Fertilizer system
- [ ] Contract system (delivery, cultivation)
- [ ] Market events
- [ ] Seasonal price modifiers
- [ ] Skill progression (farming)
- [ ] Farm leveling

### Deliverables

- Complete crop economy
- Contract system
- Progression system

### Acceptance Criteria

- All crops have correct growth times
- Economy is balanced (positive flow for new players)
- Contracts provide meaningful goals
- Progression unlocks feel rewarding

### Technical Risks

- Economy balance requires iteration
- Too many crops may overwhelm new players

---

## 6. Phase 4: Livestock + Living Farm (Weeks 10-11)

### Objectives

- Add animal system
- Add building system
- Create a "living" farm feel

### Features

- [ ] Chicken and coop
- [ ] Goat and pen
- [ ] Animal feeding
- [ ] Animal products
- [ ] Animal health/happiness
- [ ] Building construction
- [ ] Building upgrades
- [ ] Building maintenance
- [ ] Weather system
- [ ] Seasonal effects
- [ ] Visual farm life (animations, particles)

### Deliverables

- Working livestock system
- Building system
- Dynamic weather

### Acceptance Criteria

- Animals can be bought and fed
- Animals produce items
- Buildings can be constructed
- Buildings affect farm capacity
- Weather changes visually
- Farm feels alive

### Technical Risks

- Animal AI pathfinding complexity
- Building sprite variety

---

## 7. Phase 5: Kgotla + Bushveld (Weeks 12-13)

### Objectives

- Add community hub
- Add exploration area
- Deepen progression

### Features

- [ ] Kgotla scene
- [ ] NPC interactions
- [ ] Reputation system
- [ ] Community quests
- [ ] Bushveld exploration
- [ ] Resource gathering
- [ ] Rare discoveries
- [ ] Energy system
- [ ] Kgotla quests
- [ ] Community projects

### Deliverables

- Kgotla social hub
- Bushveld exploration
- Extended progression

### Acceptance Criteria

- Player can visit Kgotla
- Player can interact with NPCs
- Player can accept and complete quests
- Player can explore Bushveld
- Player can gather resources
- Reputation affects interactions

### Technical Risks

- NPC dialogue system complexity
- Bushveld content variety

---

## 8. Phase 6: Accounts + PWA + Production (Weeks 14-16)

### Objectives

- Polish account system
- Convert to PWA
- Production infrastructure

### Features

- [ ] PWA service worker
- [ ] Offline support
- [ ] Push notifications
- [ ] Settings page
- [ ] Profile management
- [ ] Achievement system
- [ ] Daily bonuses
- [ ] Production chains (mill, dairy, bakery)
- [ ] Automation (irrigation, auto-feeder)
- [ ] Error handling polish
- [ ] Performance optimization

### Deliverables

- Installable PWA
- Offline play support
- Push notifications
- Complete production system

### Acceptance Criteria

- App can be installed on mobile
- Game works offline (limited)
- Push notifications for crop ready
- All production chains work
- Performance targets met

### Technical Risks

- PWA caching strategy
- Service worker complexity

---

## 9. Phase 7: Payments + Monetization (Weeks 17-18)

### Objectives

- Add payment system
- Add cosmetic shop
- Final polish

### Features

- [ ] Payment provider integration (Orange Money, Mascom)
- [ ] Stripe integration (cards)
- [ ] Premium currency (Gems)
- [ ] Cosmetic shop
- [ ] Season pass
- [ ] Extra storage purchase
- [ ] Payment reconciliation
- [ ] Admin dashboard
- [ ] Final QA
- [ ] Launch preparation

### Deliverables

- Working payment system
- Cosmetic shop
- Admin tools

### Acceptance Criteria

- Players can make purchases
- Purchases are verified server-side
- Entitlements are granted correctly
- Admin can manage players
- No security vulnerabilities

### Technical Risks

- Payment provider reliability
- Webhook verification
- Refund handling

---

## 10. Post-MVP Roadmap

### Phase 8: Social Features

- Friend system
- Farm visits
- Gift system
- Chat (basic)

### Phase 9: Advanced Content

- More crop types
- More animal types
- More buildings
- Special events

### Phase 10: Native App

- Capacitor packaging
- App Store submission
- Play Store submission
