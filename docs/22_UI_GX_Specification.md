# Document 22: UI/GX Specification — Visual Polish & Game Experience

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-03
> Complements: Document 03 (UI/UX Specification), Document 05 (Art Direction)

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Pixel Art UI System](#2-pixel-art-ui-system)
3. [Background Scenes](#3-background-scenes)
4. [Farm Activity Animations](#4-farm-activity-animations)
5. [Player Progress Visualization](#5-player-progress-visualization)
6. [Micro-Interactions & Delight](#6-micro-interactions--delight)
7. [Onboarding for Non-Gamers](#7-onboarding-for-non-gamers)
8. [Seasonal Visual System](#8-seasonal-visual-system)
9. [Loading & Transition Screens](#9-loading--transition-screens)
10. [Sound Design Direction](#10-sound-design-direction)
11. [Panel & Menu Specifications](#11-panel--menu-specifications)
12. [Notification & Feedback System](#12-notification--feedback-system)
13. [Responsive Visual Behavior](#13-responsive-visual-behavior)
14. [Implementation Priority](#14-implementation-priority)

---

## 1. Design Philosophy

### 1.1 Core Visual Goal

> **A player should open Molemisi and feel like they've stepped into a warm, living pixel-art postcard of rural Botswana.**

Every screen, panel, and interaction must communicate:

- **Warmth** — Golden-hour lighting, earth tones, inviting atmosphere
- **Life** — Subtle animations on everything: crops sway, animals breathe, water ripples
- **Craft** — Pixel art that feels hand-made and intentional, not generated
- **Clarity** — Every element is immediately understandable without text
- **Delight** — Small moments that reward attention and make players smile

### 1.2 Non-Gamer Accessibility

Molemisi must be playable by someone who has **never played a video game**.

| Principle                  | Implementation                                       |
| -------------------------- | ---------------------------------------------------- |
| **No jargon**              | "Water your crop" not "Irrigate tile"                |
| **No hidden mechanics**    | Every action shows its result immediately            |
| **No time pressure**       | Crops grow offline, nothing punishes absence         |
| **No failure states**      | Crops can wither but never destroy progress          |
| **Guided discovery**       | Tutorial teaches through doing, not reading          |
| **Visual language**        | Icons and colors communicate status without words    |
| **Forgiving interactions** | Undo available, confirmations on destructive actions |

### 1.3 Visual Hierarchy Rules

```
LAYER 7: Floating notifications (top)
LAYER 6: Modal overlays
LAYER 5: HUD elements (currency, weather, menu buttons)
LAYER 4: Context menus and tooltips
LAYER 3: Interactive objects (plots, buildings, animals)
LAYER 2: Farm decorations (trees, rocks, flowers)
LAYER 1: Ground tiles (grass, dirt, paths)
LAYER 0: Background sky and horizon
```

Every layer uses consistent depth, z-ordering, and parallax to create a sense of space.

---

## 2. Pixel Art UI System

### 2.1 Panel Design

All UI panels use pixel-art styling with the warm brown/cream palette.

**Standard Panel:**

```
┌══════════════════════════════┐
║  ┌────────────────────────┐  ║
║  │     PANEL TITLE        │  ║
║  ├────────────────────────┤  ║
║  │                        │  ║
║  │    Panel content...    │  ║
║  │                        │  ║
║  └────────────────────────┘  ║
╚══════════════════════════════╝
```

**Panel Specifications:**

| Property        | Value                            |
| --------------- | -------------------------------- |
| Border          | 2px solid #5D4037 (inner)        |
| Outer border    | 1px solid #3E2723                |
| Corner radius   | 4px pixel-art (stepped corners)  |
| Background      | #3E2723 with 95% opacity         |
| Title bar       | #2C1810 background, #F5E6D3 text |
| Padding         | 12px content area                |
| Shadow          | 2px 2px 0px rgba(0,0,0,0.3)      |
| Entry animation | Slide up + fade in (200ms)       |
| Exit animation  | Fade out (150ms)                 |

**Panel Types:**

| Type        | Size                | Usage                        |
| ----------- | ------------------- | ---------------------------- |
| Full-screen | 100% viewport       | Market, Settings, Inventory  |
| Half-sheet  | 50% viewport height | Context menus, Quick actions |
| Mini-panel  | 200x150px           | Crop info, Animal status     |
| Tooltip     | Auto-sized          | Hover info, Item details     |
| Dialog      | 300x200px           | Confirmations, Errors        |

### 2.2 Button Design

**Primary Button:**

```
┌════════════════════┐
║   🌱 Plant Crop    ║
╚════════════════════╝
```

| State    | Background        | Text    | Border  |
| -------- | ----------------- | ------- | ------- |
| Normal   | #FF8F00           | #2C1810 | #E65100 |
| Hover    | #FFA040           | #2C1810 | #FF8F00 |
| Pressed  | #E65100           | #F5E6D3 | #BF360C |
| Disabled | #5D4037           | #BCAAA4 | #3E2723 |
| Loading  | #FF8F00 (pulsing) | "..."   | #E65100 |

**Secondary Button:**

| State   | Background | Text    | Border  |
| ------- | ---------- | ------- | ------- |
| Normal  | #3E2723    | #F5E6D3 | #5D4037 |
| Hover   | #4E342E    | #FF8F00 | #5D4037 |
| Pressed | #2C1810    | #FF8F00 | #3E2723 |

**Danger Button:**

| State   | Background | Text    | Border  |
| ------- | ---------- | ------- | ------- |
| Normal  | #C62828    | #F5E6D3 | #B71C1C |
| Hover   | #D32F2F    | #F5E6D3 | #C62828 |
| Pressed | #B71C1C    | #FFCDD2 | #8B0000 |

**Button Animation:**

- Hover: 100ms ease-in color transition
- Press: Scale down to 95% (50ms), then back (50ms)
- Disabled: 50% opacity, no pointer events

### 2.3 Icon System

All icons are 16x16 pixel art, single-color with optional accent.

**Required Icon Set:**

| Category   | Icons                                           |
| ---------- | ----------------------------------------------- |
| Farming    | plant, water, harvest, fertilize, weed, soil    |
| Animals    | feed, collect, pet, heal, shelter               |
| Buildings  | construct, upgrade, repair, demolish            |
| Market     | buy, sell, price, contract, trade               |
| Inventory  | bag, sort, use, drop, stack                     |
| Navigation | farm, kgotla, bushveld, market, settings        |
| Status     | healthy, hungry, thirsty, sick, ready, withered |
| Weather    | sun, cloud, rain, storm, drought, wind          |
| Currency   | pula, gem, token                                |
| Social     | npc, quest, gift, reputation                    |

**Icon Rendering Rules:**

- Render at 1:1 pixel ratio (no scaling artifacts)
- Use consistent 1px outline for readability
- Always on transparent background
- Minimum 4px padding within icon bounds

### 2.4 Progress Bars

**Standard Progress Bar:**

```
┌────────────────────────────────────┐
│ ████████████████░░░░░░░░░░░░░░░░░ │
└────────────────────────────────────┘
```

| Property       | Value                           |
| -------------- | ------------------------------- |
| Height         | 8px                             |
| Border         | 1px #3E2723                     |
| Background     | #1a0f0a (dark)                  |
| Fill animation | Smooth width transition (300ms) |
| Glow           | Subtle glow on fill edge        |

**Color Coding:**

| Type      | Fill Color        | Usage                |
| --------- | ----------------- | -------------------- |
| Hydration | #2196F3           | Water level          |
| Growth    | #4CAF50           | Crop growth progress |
| Health    | #F44336 → #4CAF50 | Animal health        |
| XP        | #FFD700           | Experience points    |
| Hunger    | #FF9800           | Animal hunger        |
| Timer     | #9C27B0           | Production timer     |

**XP Bar (Header):**

```
┌─────────────────────────────────────────────┐
│ Lv.5  ████████████████░░░░  2,450 / 3,000  │
└─────────────────────────────────────────────┘
```

- Always visible in the top HUD
- Pulses gold when XP is gained
- Number animates counting up

### 2.5 Toggle & Slider

**Toggle Switch:**

```
OFF: [○━━━━━]
ON:  [━●━━━━]
```

- Pixel-art rounded rectangle
- Smooth slide animation (150ms)
- Color: #5D4037 (off) → #4CAF50 (on)

**Slider:**

```
[━━━━━━━●────────────]
      50%
```

- Pixel-art thumb (8x8 circle)
- Track: #3E2723, Fill: #FF8F00
- Snap to integer values
- Haptic feedback at boundaries (mobile)

---

## 3. Background Scenes

### 3.1 Farm Background

The farm background is a multi-layer parallax scene that creates depth and atmosphere.

**Layer Stack (back to front):**

| Layer | Content                 | Parallax Speed | Y Position   |
| ----- | ----------------------- | -------------- | ------------ |
| 0     | Sky gradient            | 0.1x           | Top          |
| 1     | Distant mountains/hills | 0.2x           | Below sky    |
| 2     | Cloud layer             | 0.3x           | In sky       |
| 3     | Mid-ground trees        | 0.5x           | Above ground |
| 4     | Ground tiles            | 1.0x           | Center       |
| 5     | Farm objects            | 1.0x           | On ground    |
| 6     | Foreground grass        | 1.2x           | Bottom       |

**Sky System:**

| Time of Day        | Sky Colors        | Usage                |
| ------------------ | ----------------- | -------------------- |
| Dawn (6:00)        | #FFB74D → #87CEEB | Warm orange to blue  |
| Day (8:00–16:00)   | #87CEEB → #4A7FB5 | Clear blue           |
| Sunset (17:00)     | #E8945A → #D4654A | Warm sunset          |
| Dusk (19:00)       | #4A3060 → #1a0f0a | Purple to dark       |
| Night (20:00–5:00) | #0a0a2e → #1a1a4a | Deep blue with stars |

**Cloud System:**

- 3–5 cloud sprites drifting across the sky
- Speed: 10–30 pixels per minute (varies by weather)
- Clouds change color with time of day
- Storm clouds: darker, faster, with occasional lightning flash

**Ground Layers:**

| Tile          | Visual                    | Variants                   |
| ------------- | ------------------------- | -------------------------- |
| Healthy grass | Bright green with texture | 4 variations + transitions |
| Dry grass     | Yellow-brown              | Seasonal (dry season)      |
| Tilled soil   | Dark brown, furrowed      | Prepared for planting      |
| Path          | Light brown stone         | Connects farm areas        |
| Water edge    | Blue with ripple          | Around water sources       |

### 3.2 Kgotla Background

The Kgotla is a community gathering space with a distinct visual identity.

**Scene Composition:**

```
┌─────────────────────────────────────┐
│           SKY (same as farm)        │
│                                     │
│    ┌──────┐         ┌──────┐       │
│    │ Tree │         │ Tree │       │
│    └──────┘         └──────┘       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      KGOTLA CIRCLE         │   │
│  │   ┌─────┐     ┌─────┐     │   │
│  │   │ NPC │     │ NPC │     │   │
│  │   └─────┘     └─────┘     │   │
│  │         ┌─────┐           │   │
│  │         │ NPC │           │   │
│  │         └─────┘           │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────┐    ┌──────┐    ┌──────┐  │
│  │Board │    │Market│    │Quest │  │
│  └──────┘    └──────┘    └──────┘  │
└─────────────────────────────────────┘
```

**Kgotla Visual Elements:**

| Element        | Size       | Description                        |
| -------------- | ---------- | ---------------------------------- |
| Kgotla circle  | Full width | Circular arrangement of NPCs       |
| Elder's seat   | 32x32      | Raised platform with carved chair  |
| Quest board    | 32x32      | Wooden board with pinned papers    |
| Market stall   | 48x32      | Canopy with goods display          |
| Community fire | 16x16      | Animated fire with smoke particles |
| Acacia trees   | 32x48      | Flat-topped shade trees            |
| Stone benches  | 16x16      | Scattered seating                  |
| Herb garden    | 32x16      | Colorful plants near Refilwe       |

**Kgotla Animations:**

- Fire flickers continuously (smoke particles rise)
- NPCs have idle animations (shifting weight, gesturing)
- Quest board papers flutter in wind
- Market stall canopy sways slightly
- Butterflies fly between herb plants

### 3.3 Bushveld Background

The Bushveld is an exploration zone with wilder, untamed visuals.

**Zone Types:**

| Zone          | Dominant Colors  | Features                       |
| ------------- | ---------------- | ------------------------------ |
| Savanna       | #E8D5A3, #5A8F3C | Tall grass, scattered trees    |
| Riverbank     | #87CEEB, #3D6B2E | Water, reeds, fish             |
| Rocky outcrop | #B0B0B0, #8B5E3C | Stones, caves, minerals        |
| Dense bush    | #3D6B2E, #558B2F | Thick vegetation, hidden paths |
| Baobab grove  | #8B6914, #5A8F3C | Large trees, fruit             |

**Bushveld Parallax:**

| Layer | Content           | Speed |
| ----- | ----------------- | ----- |
| 0     | Distant landscape | 0.1x  |
| 1     | Mid-ground bush   | 0.4x  |
| 2     | Main ground       | 1.0x  |
| 3     | Foreground plants | 1.3x  |

**Bushveld Animations:**

- Grass sways in wind (gentle sine wave)
- Birds fly across occasionally
- Insects buzz near water
- Leaves fall from trees (autumn)
- Heat shimmer in dry zones (summer)

### 3.4 Market Background

The market is a bustling trading space.

**Scene Layout:**

```
┌─────────────────────────────────────┐
│           CANOPY TOP               │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  │
│  │Stall│  │Stall│  │Stall│  │Stall│  │
│  │ 🌾 │  │ 🥩 │  │ 🔧 │  │ 💎 │  │
│  └────┘  └────┘  └────┘  └────┘  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      MARKET SQUARE         │   │
│  │   NPC vendors walking      │   │
│  │   Price boards changing    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  │
│  │Buy │  │Sell │  │Contr│  │Info│  │
│  └────┘  └────┘  └────┘  └────┘  │
└─────────────────────────────────────┘
```

**Market Animations:**

- Canopy fabric sways
- NPC vendors gesture and move between stalls
- Price boards update with ticker animation
- Goods on display have idle animations
- Smoke from food stalls

---

## 4. Farm Activity Animations

### 4.1 Planting Animation

**Sequence (1.5 seconds total):**

| Time   | Visual                        | Audio          |
| ------ | ----------------------------- | -------------- |
| 0ms    | Plot selected, glow appears   | Soft click     |
| 200ms  | Soil darkens (tilled)         | Soil crunch    |
| 400ms  | Seed drops into soil (arc)    | Planting sound |
| 600ms  | Small dirt particle burst     | —              |
| 800ms  | Tiny green sprout appears     | Growth chime   |
| 1000ms | Sprout bounces slightly       | —              |
| 1200ms | "+5 XP" floats up             | —              |
| 1500ms | Plot settles to PLANTED state | —              |

**Visual Details:**

- Seed falls in a parabolic arc from above
- Soil particles scatter outward on impact
- Sprout grows from ground with a "push up" animation
- Sprout does a small bounce (elastic ease)
- XP text fades in from below and floats upward

### 4.2 Watering Animation

**Sequence (1.0 second):**

| Time   | Visual                            | Audio            |
| ------ | --------------------------------- | ---------------- |
| 0ms    | Water can icon appears above plot | Water pour start |
| 200ms  | Water droplets fall from can      | Splash sounds    |
| 400ms  | Water hits soil, splash particles | —                |
| 600ms  | Soil darkens (wet)                | —                |
| 800ms  | Hydration bar fills smoothly      | —                |
| 1000ms | "+2 XP" floats up                 | —                |

**Water Droplet Particles:**

- Color: #87CEEB (sky blue)
- Shape: 2x4px vertical lines
- Gravity: Falling downward
- Splash: 3–5 droplets on impact
- Spread: ±15px from center

### 4.3 Harvesting Animation

**Sequence (1.2 seconds):**

| Time   | Visual                                   | Audio              |
| ------ | ---------------------------------------- | ------------------ |
| 0ms    | Plot glows gold (ready state)            | Anticipation chime |
| 200ms  | Scythe/sickle icon sweeps across         | Harvest whoosh     |
| 400ms  | Crop items fly upward in arc             | Collection sound   |
| 600ms  | Items land in inventory (top-right)      | —                  |
| 800ms  | Plot returns to EMPTY state              | —                  |
| 1000ms | "+10 XP" floats up                       | —                  |
| 1200ms | Currency earned animation (if auto-sold) | —                  |

**Harvest Particles:**

- Crop-specific colored particles burst outward
- Sorghum: golden grains
- Maize: yellow kernels
- Tomatoes: red splashes
- Each particle has a slight gravity arc

### 4.4 Crop Growth Animation

**Idle Growth Animation:**

- Crops sway gently (2° rotation, 2s cycle)
- Growth stage transitions have a "stretch" animation
- Ready crops have golden sparkle particles (every 3s)
- Withered crops droop and lose color gradually

**Stage Transition:**

```
Stage 0 (Seed) → Stage 1 (Sprout):
  - Seed cracks open
  - Green shoot pushes up from soil
  - Small particle burst (soil crumbs)

Stage 1 (Sprout) → Stage 2 (Young):
  - Sprout stretches upward
  - First leaves unfurl
  - Color shifts from pale to vibrant green

Stage 2 (Young) → Stage 3 (Growing):
  - Plant grows taller
  - More leaves appear
  - Stem thickens

Stage 3 (Growing) → Stage 4 (Ready):
  - Full plant with product visible
  - Golden sparkle particles begin
  - Gentle pulse animation
```

### 4.5 Animal Animations

**Idle Behaviors:**

| Animal  | Idle Animation          | Duration |
| ------- | ----------------------- | -------- |
| Chicken | Peck at ground, look up | 3s cycle |
| Goat    | Chew cud, flick ears    | 4s cycle |
| Cow     | Tail swish, blink       | 5s cycle |
| Pig     | Snort, root around      | 3s cycle |

**Fed Animation:**

- Animal bounces happily
- Hearts appear above (2–3 floating hearts)
- Eating animation (head down, chewing)
- Satisfaction sound

**Product Ready Animation:**

- Product icon bounces above animal
- Gentle pulse glow
- "Collect" prompt appears on hover

**Sick Animation:**

- Animal droops, color desaturated
- Green swirl particles above head
- Slow movement
- Concerned expression

### 4.6 Building Animations

| Building     | Idle Animation            | Active Animation         |
| ------------ | ------------------------- | ------------------------ |
| Well         | Water ripple, bucket sway | Water particle fountain  |
| Coop         | Chicken movement          | Eggs appearing           |
| Barn         | Door creak                | Animals entering/exiting |
| Mill         | Wheel turning             | Grain flowing            |
| Market stall | Canopy sway               | Goods appearing          |

**Construction Animation:**

- Scaffolding appears
- Hammer particles (sparks)
- Progress bar fills
- Scaffolding dissolves to reveal building
- Building does a "settle" bounce
- "+XP" and fanfare

**Upgrade Animation:**

- Building glows
- New elements materialize with sparkle
- Old elements morph to new
- Celebration particles

---

## 5. Player Progress Visualization

### 5.1 Farm Level Display

**Location:** Top-left of HUD, always visible

**Visual:**

```
┌──────────────────────┐
│ ★ Lv.5 Farm          │
│ ████████░░ 2,450 XP  │
└──────────────────────┘
```

**Level-Up Animation (2.0 seconds):**

| Time   | Visual                                |
| ------ | ------------------------------------- |
| 0ms    | XP bar fills to 100%                  |
| 200ms  | Bar pulses gold                       |
| 400ms  | Level number spins and increments     |
| 600ms  | Screen flash (subtle, 100ms)          |
| 800ms  | "Level Up!" banner slides in from top |
| 1000ms | New unlock icons appear below banner  |
| 1500ms | Banner fades, confetti particles      |
| 2000ms | Everything settles                    |

### 5.2 Farm Expansion Progress

**Visual indicator of farm growth over time:**

| Level | Plots | Visual Change              |
| ----- | ----- | -------------------------- |
| 1     | 6     | Small plot, basic well     |
| 2     | 8     | Fence appears around farm  |
| 3     | 10    | Path connects to market    |
| 4     | 12    | Trees appear on edges      |
| 5     | 14    | Barn becomes visible       |
| 6     | 16    | Kgotla path opens          |
| 7     | 18    | Bushveld trail appears     |
| 8     | 20    | Full farm with decorations |

**Each level-up adds visible elements to the farm scene.**

### 5.3 Achievement Badges

**Display:** Shown in profile panel and on farm screen

**Badge Design:**

```
┌─────────┐
│  🏆     │
│ Master  │
│ Farmer  │
└─────────┘
```

**Badge Types:**

| Category    | Example Badges                                |
| ----------- | --------------------------------------------- |
| Farming     | First Harvest, 100 Crops, Master Grower       |
| Economy     | First Sale, 10K Pula, Market Mogul            |
| Livestock   | First Animal, Full Barn, Animal Whisperer     |
| Community   | First Contract, Kgotla Friend, Quest Master   |
| Exploration | First Discovery, Bushveld Explorer, Rare Find |
| Social      | First Day, 7-Day Streak, 30-Day Farmer        |

**Badge Animation:**

- Appears with a spin and glow
- Settles with a bounce
- Rare badges have particle effects

### 5.4 Statistics Dashboard

**Visual representation of player statistics:**

```
┌─────────────────────────────────────┐
│         YOUR FARM AT A GLANCE       │
├─────────────────────────────────────┤
│                                     │
│  🌾 Crops Harvested    ███████ 847  │
│  💰 Total Earned      ████████ 12.4K│
│  🐄 Animals Raised     ████░░░  23  │
│  🏗️ Buildings Built    ███░░░░  12  │
│  📋 Contracts Done     █████░░  56  │
│  🌿 Discoveries        ██░░░░░   8  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     FARM GROWTH TIMELINE    │   │
│  │  ░░░░░░░░░░██████████████░  │   │
│  │  Day 1              Day 42  │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

## 6. Micro-Interactions & Delight

### 6.1 Daily Welcome

**When player logs in each day:**

| Time   | Visual                                   |
| ------ | ---------------------------------------- |
| 0ms    | Screen fades in from dark                |
| 200ms  | Farm appears with morning light          |
| 400ms  | "Good morning, [Name]!" banner           |
| 600ms  | Weather and season display               |
| 800ms  | Crop ready indicators pulse              |
| 1000ms | Daily bonus notification (if applicable) |

**Time-of-Day Greeting:**

- 5:00–11:00: "Good morning!"
- 11:00–17:00: "Good afternoon!"
- 17:00–21:00: "Good evening!"
- 21:00–5:00: "Working late!"

### 6.2 Crop Ready Celebration

**When a crop reaches READY state:**

| Visual                   | Effect                        |
| ------------------------ | ----------------------------- |
| Golden sparkle particles | Emanate from crop every 3s    |
| Gentle pulse             | Crop icon scales 1.0→1.05→1.0 |
| Ready banner             | Small "Ready!" tag above crop |
| Navigation badge         | Farm nav shows harvest count  |

### 6.3 Coin Earned Animation

**When currency is earned:**

```
  +25 💰
   ↑
  (floats up from source, fades out)
```

- Gold coin particles scatter
- Number counts up from 0 to final value
- Subtle "cha-ching" sound

### 6.4 Contract Completed

**When a contract is delivered:**

| Time   | Visual                      |
| ------ | --------------------------- |
| 0ms    | Contract stamp animation    |
| 200ms  | Checkmark draws in          |
| 400ms  | Reward items fly out        |
| 600ms  | XP bar fills                |
| 800ms  | Reputation badge pulses     |
| 1000ms | "Contract Complete!" banner |

### 6.5 Season Change

**When a new season begins:**

| Time   | Visual                                  |
| ------ | --------------------------------------- |
| 0ms    | Screen dims slightly                    |
| 200ms  | Old season icon fades out               |
| 400ms  | Color palette shifts to new season      |
| 600ms  | New season icon appears with glow       |
| 800ms  | "Spring has arrived!" banner            |
| 1000ms | Farm visuals update (leaf colors, etc.) |

### 6.6 Weather Change

**When weather changes:**

| Change        | Visual                              |
| ------------- | ----------------------------------- |
| Clear → Rain  | Clouds gather, rain particles begin |
| Rain → Clear  | Clouds part, sun rays appear        |
| Clear → Storm | Dark overlay, lightning flash       |
| Any → Drought | Heat shimmer, warm color overlay    |

### 6.7 Achievement Unlock

**When an achievement is earned:**

| Time   | Visual                                 |
| ------ | -------------------------------------- |
| 0ms    | Achievement icon appears center-screen |
| 200ms  | Icon spins and glows                   |
| 400ms  | Banner expands with achievement name   |
| 600ms  | Description text fades in              |
| 800ms  | Confetti particles                     |
| 1500ms | Banner slides to notification area     |

---

## 7. Onboarding for Non-Gamers

### 7.1 Welcome Screen

**First-time player experience:**

```
┌─────────────────────────────────────┐
│                                     │
│         🌾 MOLEMISI 🌾             │
│                                     │
│    Welcome to your new farm!        │
│                                     │
│    This is where you'll grow        │
│    crops, raise animals, and        │
│    build a thriving farm.           │
│                                     │
│    ┌─────────────────────────┐     │
│    │    Let's Get Started    │     │
│    └─────────────────────────┘     │
│                                     │
│    Already know how to play?        │
│    [Skip Tutorial]                  │
│                                     │
└─────────────────────────────────────┘
```

### 7.2 Guided Tutorial Steps

**Step 1: Meet Your Farm**

- Camera zooms out to show full farm
- Highlight border pulses around farm area
- "This is your farm. You'll manage everything here."
- Arrow points to empty plots

**Step 2: Plant Your First Crop**

- Plot 1 glows with invitation pulse
- "Tap this empty plot to plant your first crop."
- When tapped, seed picker opens with only Sorghum available
- "Sorghum is a great starter crop. Select it."

**Step 3: Water Your Crop**

- Water droplet icon bounces above planted plot
- "Your crop needs water to grow. Tap the water button."
- Water animation plays

**Step 4: Watch It Grow**

- Time-lapse: crop grows through all stages in 3 seconds
- "Your crop grows over time. Come back later to see progress!"
- Growth bar fills visually

**Step 5: Harvest**

- Crop glows gold with "Ready!" tag
- "Your sorghum is ready! Tap to harvest."
- Harvest animation plays with celebration

**Step 6: Your First Sale**

- Arrow points to Market button
- "Visit the Market to sell your harvest."
- Market panel opens with sell highlighted
- "Tap sell to earn Pula!"

**Step 7: Buy More Seeds**

- Market buy panel shown
- "Use your Pula to buy more seeds."
- Buy sorghum seeds transaction

**Step 8: Freedom**

- Tutorial arrow disappears
- "Your farm is yours. Grow, build, and explore!"
- All UI elements become interactive

### 7.3 Tutorial Visual Language

| Element            | Visual                              |
| ------------------ | ----------------------------------- |
| Tutorial highlight | Gold pulsing border around target   |
| Tutorial arrow     | Pixel-art arrow pointing to element |
| Tutorial text      | Speech bubble with warm background  |
| Tutorial step      | Progress dots at bottom             |
| Tutorial skip      | "Skip" button in top-right          |

### 7.4 Contextual Help

**After tutorial, help appears contextually:**

| Situation                    | Help                                      |
| ---------------------------- | ----------------------------------------- |
| First time opening market    | "Buy seeds here, sell crops there"        |
| First time viewing inventory | "Your harvested items appear here"        |
| First time visiting Kgotla   | "Talk to NPCs for quests and rewards"     |
| First time entering Bushveld | "Gather resources from the wild"          |
| First time building          | "Construct buildings to expand your farm" |

---

## 8. Seasonal Visual System

### 8.1 Season Transitions

**Each season changes the farm's visual appearance:**

| Season | Sky              | Ground       | Trees             | Crops        | Particles             |
| ------ | ---------------- | ------------ | ----------------- | ------------ | --------------------- |
| Spring | #87CEEB (bright) | Fresh green  | Budding leaves    | Bright green | Flower petals         |
| Summer | #6BB3E0 (hot)    | Dry green    | Full dark green   | Vibrant      | Heat shimmer          |
| Autumn | #E8945A (warm)   | Yellow-brown | Orange/red leaves | Golden       | Falling leaves        |
| Winter | #B0C4DE (cool)   | Pale/brown   | Bare branches     | Dormant      | Snow flurries (light) |

### 8.2 Season Color Palettes

**Spring Palette:**

- Sky: #87CEEB
- Grass: #7CB342
- Flowers: #E91E63, #FF9800, #FFD700
- Accent: #4CAF50

**Summer Palette:**

- Sky: #6BB3E0
- Grass: #558B2F
- Accent: #F44336 (heat)
- Shadows: Deeper, more contrast

**Autumn Palette:**

- Sky: #E8945A
- Grass: #C4A882
- Leaves: #D4654A, #FF8F00, #FFD700
- Accent: #8B6914

**Winter Palette:**

- Sky: #B0C4DE
- Grass: #A0A0A0
- Trees: #8B6914 (bare)
- Accent: #87CEEB (frost)

### 8.3 Seasonal Animation Variations

| Season | Animation Change                                    |
| ------ | --------------------------------------------------- |
| Spring | Flowers bloom, birds return, rain particles         |
| Summer | Heat shimmer, longer shadows, insect particles      |
| Autumn | Leaves fall, wind stronger, golden light            |
| Winter | Snow flurries (light), shorter days, frost on crops |

---

## 9. Loading & Transition Screens

### 9.1 Initial Load Screen

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         🌾 MOLEMISI 🌾             │
│                                     │
│    ┌─────────────────────────┐     │
│    │  ████████░░░░░░░░ 60%  │     │
│    └─────────────────────────┘     │
│                                     │
│    Loading your farm...             │
│                                     │
│    💡 Tip: Water your crops         │
│       regularly for best yields!    │
│                                     │
└─────────────────────────────────────┘
```

**Loading Tips (rotate every 3 seconds):**

| Tip                                                 |
| --------------------------------------------------- |
| "Water your crops regularly for best yields!"       |
| "Visit the Kgotla for community contracts."         |
| "The Bushveld has rare resources waiting!"          |
| "Animals produce more when they're happy."          |
| "Check the market for price fluctuations."          |
| "Upgrade your storage to hold more items."          |
| "Different crops grow better in different seasons." |
| "Complete contracts for bonus reputation!"          |

### 9.2 Context Transition

**When switching between Farm/Kgotla/Bushveld:**

| Phase    | Duration | Visual                       |
| -------- | -------- | ---------------------------- |
| Fade out | 200ms    | Current scene fades to black |
| Loading  | 0–500ms  | Scene-specific loading icon  |
| Fade in  | 200ms    | New scene fades from black   |
| Settle   | 100ms    | HUD updates, elements appear |

**Transition Icons:**

| From → To       | Icon                   |
| --------------- | ---------------------- |
| Farm → Kgotla   | Walking path animation |
| Farm → Bushveld | Compass/map animation  |
| Farm → Market   | Cart animation         |
| Any → Inventory | Bag opening animation  |

### 9.3 Error Recovery Screen

```
┌─────────────────────────────────────┐
│                                     │
│         ⚠️ CONNECTION LOST         │
│                                     │
│    We couldn't reach the server.    │
│    Your farm is safe!               │
│                                     │
│    ┌─────────────────────────┐     │
│    │      Try Again          │     │
│    └─────────────────────────┘     │
│                                     │
│    Auto-retry in 5 seconds...       │
│                                     │
└─────────────────────────────────────┘
```

---

## 10. Sound Design Direction

### 10.1 Music

| Scene        | Mood              | Instruments                       |
| ------------ | ----------------- | --------------------------------- |
| Farm (day)   | Warm, peaceful    | Acoustic guitar, light percussion |
| Farm (night) | Calm, cozy        | Soft piano, crickets              |
| Kgotla       | Community, lively | Drums, marimba, voices            |
| Bushveld     | Adventure, wild   | Flute, nature sounds              |
| Market       | Busy, trading     | Upbeat rhythm, chatter            |
| Menu         | Welcoming         | Main theme (acoustic)             |

### 10.2 Sound Effects

| Action       | Sound                      | Duration |
| ------------ | -------------------------- | -------- |
| Plant seed   | Soft soil crunch           | 0.3s     |
| Water crop   | Water pour + splash        | 0.5s     |
| Harvest      | Scythe whoosh + collection | 0.5s     |
| Buy item     | Coin clink                 | 0.3s     |
| Sell item    | Cash register              | 0.3s     |
| Level up     | Fanfare chime              | 1.0s     |
| Achievement  | Triumphant sting           | 0.8s     |
| Notification | Soft bell                  | 0.2s     |
| Error        | Soft buzz                  | 0.2s     |
| Button click | Subtle tap                 | 0.1s     |
| Panel open   | Slide whoosh               | 0.2s     |
| Panel close  | Soft close                 | 0.15s    |

### 10.3 Ambient Sounds

| Environment  | Ambience                              |
| ------------ | ------------------------------------- |
| Farm (day)   | Birds chirping, wind, distant animals |
| Farm (night) | Crickets, owl, gentle wind            |
| Rain         | Rain on leaves, distant thunder       |
| Kgotla       | Community chatter, fire crackling     |
| Bushveld     | Insects, birds, wind through grass    |
| Market       | Vendor calls, animal sounds, bustling |

---

## 11. Panel & Menu Specifications

### 11.1 Market Panel

**Full-screen overlay with pixel-art market stalls:**

```
┌══════════════════════════════════════════════┐
║  🏪 MARKET                    💰 1,234 P     ║
╠══════════════════════════════════════════════╣
║  [Buy] [Sell] [Contracts] [Prices]          ║
╠══════════════════════════════════════════════╣
║                                              ║
║  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      ║
║  │ 🌾   │ │ 🌽   │ │ 🫘   │ │ 🥜   │      ║
║  │Sorghum│ │Maize │ │Cowpea│ │Ground│      ║
║  │ 15 P  │ │ 12 P │ │ 18 P │ │ 20 P │      ║
║  │ [Buy] │ │ [Buy]│ │ [Buy]│ │ [Buy]│      ║
║  └──────┘ └──────┘ └──────┘ └──────┘      ║
║                                              ║
║  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      ║
║  │ 🍅   │ │ 🌶️   │ │ 🌿   │ │ 🌸   │      ║
║  │Tomato│ │Pepper│ │Herbs │ │Saffron│      ║
║  │ 25 P │ │ 30 P │ │ 35 P │ │ 50 P │      ║
║  │ [Buy]│ │ [Buy]│ │ [Buy]│ │ [Buy]│      ║
║  └──────┘ └──────┘ └──────┘ └──────┘      ║
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │ Today's Prices: Sorghum ↑12% Maize ↓5%│ ║
║  └────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════╝
```

### 11.2 Inventory Panel

**Grid-based inventory with item details:**

```
┌══════════════════════════════════════════════┐
║  📦 INVENTORY                               ║
╠══════════════════════════════════════════════╣
║                                              ║
║  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       ║
║  │ 🌾 │ │ 🌽 │ │ 🫘 │ │ 🥜 │ │ 🍅 │       ║
║  │ x24│ │ x12│ │ x8 │ │ x15│ │ x5 │       ║
║  └────┘ └────┘ └────┘ └────┘ └────┘       ║
║  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       ║
║  │ 🌶️ │ │ 🌿 │ │ 🥛 │ │ 🥚 │ │ 🪵 │       ║
║  │ x3 │ │ x7 │ │ x4 │ │ x12│ │ x20│       ║
║  └────┘ └────┘ └────┘ └────┘ └────┘       ║
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │ Sorghum x24                            │ ║
║  │ Harvested grain. Can be sold or used.  │ ║
║  │                                        │ ║
║  │ Value: 10P each  │  Total: 240P       │ ║
║  │                                        │ ║
║  │ [Sell All] [Use]                       │ ║
║  └────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════╝
```

### 11.3 Build Panel

**Building construction with prerequisites:**

```
┌══════════════════════════════════════════════┐
║  🏗️ BUILD                                   ║
╠══════════════════════════════════════════════╣
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │ 🏠 Chicken Coop                        │ ║
║  │ Houses up to 6 chickens                │ ║
║  │                                        │ ║
║  │ Cost: 200P + 20 Wood + 10 Stone       │ ║
║  │                                        │ ║
║  │ You have: 150P, 25 Wood, 12 Stone     │ ║
║  │                                        │ ║
║  │ ████████░░░░░░░░░░░░  (Insufficient)  │ ║
║  │                                        │ ║
║  │ [Build] (disabled)                     │ ║
║  └────────────────────────────────────────┘ ║
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │ 🔧 Workshop                            │ ║
║  │ Process raw materials into goods       │ ║
║  │                                        │ ║
║  │ Cost: 500P + 40 Wood + 20 Stone       │ ║
║  │ Requires: Farm Level 3                 │ ║
║  │                                        │ ║
║  │ 🔒 Locked (Level 3 required)           │ ║
║  └────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════╝
```

### 11.4 Kgotla Panel

**Community hub with NPC interactions:**

```
┌══════════════════════════════════════════════┐
║  🏛️ KGOTLA                   Rep: ★★★☆☆     ║
╠══════════════════════════════════════════════╣
║  [NPCs] [Quests] [Projects] [Shop]          ║
╠══════════════════════════════════════════════╣
║                                              ║
║  ┌──────┐  Elder Neo                        ║
║  │ 👴   │  "Welcome, young farmer.          ║
║  │      │   The community needs your help."  ║
║  └──────┘                                   ║
║  [Talk] [Quest]                             ║
║                                              ║
║  ┌──────┐  Mama Naledi                      ║
║  │ 👩   │  "I have fresh produce for        ║
║  │      │   trade. Come see!"               ║
║  └──────┘                                   ║
║  [Talk] [Trade]                             ║
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │ 📋 Available Quests: 3                 │ ║
║  │ • Deliver 20 Sorghum (Reward: 100P)   │ ║
║  │ • Build a Chicken Coop (Reward: 200P)  │ ║
║  │ • Explore Riverbank (Reward: Rare Seed)│ ║
║  └────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════╝
```

### 11.5 Settings Panel

**Pixel-art settings with clear categories:**

```
┌══════════════════════════════════════════════┐
║  ⚙️ SETTINGS                                ║
╠══════════════════════════════════════════════╣
║                                              ║
║  🔊 AUDIO                                   ║
║  Master   [━━━━━━━●━━━━] 70%                ║
║  Music    [━━━━━━━━●━━━] 80%                ║
║  SFX      [━━━━●━━━━━━━] 40%                ║
║                                              ║
║  🎨 GRAPHICS                                ║
║  Particles    [━━●━━] ON                    ║
║  Screen Shake [●━━━━] ON                    ║
║  Pixel Perfect[━━●━━] ON                    ║
║                                              ║
║  🎮 GAMEPLAY                                ║
║  Auto-collect  [━━━━●] OFF                  ║
║  Confirmations [●━━━━] ON                   ║
║  Hints         [●━━━━] ON                   ║
║                                              ║
║  📱 NOTIFICATIONS                           ║
║  Push          [●━━━━] ON                   ║
║  Crop Ready    [●━━━━] ON                   ║
║  Animal Hungry [●━━━━] ON                   ║
║                                              ║
║  ┌────────────────────────────────────────┐ ║
║  │ [Logout]              v1.0.0-alpha    │ ║
║  └────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════╝
```

---

## 12. Notification & Feedback System

### 12.1 Toast Notifications

**Visual Design:**

```
┌──────────────────────────────────┐
│  🌾 Your Sorghum is ready!       │
│  Harvest it before it withers.   │
└──────────────────────────────────┘
```

**Toast Types:**

| Type        | Icon | Border Color | Auto-dismiss        |
| ----------- | ---- | ------------ | ------------------- |
| Success     | ✅   | #4CAF50      | 3s                  |
| Info        | ℹ️   | #2196F3      | 3s                  |
| Warning     | ⚠️   | #FFC107      | 5s                  |
| Error       | ❌   | #F44336      | 5s (manual dismiss) |
| Achievement | 🏆   | #FFD700      | 4s                  |

**Toast Animation:**

- Slide in from right (200ms)
- Stay visible
- Slide out to right (200ms)
- Stack from top (max 3 visible)

### 12.2 Floating Text

**When actions produce results:**

| Action   | Text           | Color   | Position          |
| -------- | -------------- | ------- | ----------------- |
| Plant    | "+5 XP"        | #4CAF50 | Above plot        |
| Water    | "+2 XP"        | #2196F3 | Above plot        |
| Harvest  | "+10 XP"       | #FF8F00 | Above plot        |
| Sell     | "+{amount} 💰" | #FFD700 | Above market icon |
| Buy      | "-{amount} 💰" | #F44336 | Above market icon |
| Level Up | "Level {n}!"   | #FFD700 | Center screen     |

**Floating Text Animation:**

- Start at source position
- Float upward 40px
- Fade out over 1.5s
- Slight horizontal drift (±10px)

### 12.3 Progress Indicators

**Circular Progress (for timed actions):**

```
    ╭──────╮
   ╱  45%  ╲
  │  ⏰     │
   ╲       ╱
    ╰──────╯
```

**Linear Progress (for collections):**

```
Harvesting... ████████░░ 80%
```

### 12.4 Confirmation Dialogs

**Standard Confirmation:**

```
┌─────────────────────────────┐
│  Harvest Sorghum?           │
│                             │
│  You will receive:          │
│  • 4x Sorghum (Normal)     │
│  • 10 XP                   │
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │  Cancel   │ │ Harvest  │ │
│  └──────────┘ └──────────┘ │
└─────────────────────────────┘
```

**Destructive Action Confirmation:**

```
┌─────────────────────────────┐
│  ⚠️ Sell All Sorghum?       │
│                             │
│  This will sell 24 Sorghum  │
│  for 240 Pula.              │
│                             │
│  This cannot be undone.     │
│                             │
│  ┌──────────┐ ┌──────────┐ │
│  │  Cancel   │ │ Sell All │ │
│  └──────────┘ └──────────┘ │
└─────────────────────────────┘
```

---

## 13. Responsive Visual Behavior

### 13.1 Mobile (Portrait, < 768px)

| Element      | Behavior                           |
| ------------ | ---------------------------------- |
| Farm scene   | Scrollable, pinch-to-zoom optional |
| Panels       | Bottom sheet (50% or 85% height)   |
| Context menu | Bottom sheet with actions          |
| HUD          | Compact, icons only                |
| Bottom nav   | Large touch targets (48px)         |
| Tooltips     | Long-press to show                 |

### 13.2 Tablet (768px–1024px)

| Element      | Behavior                           |
| ------------ | ---------------------------------- |
| Farm scene   | Full width, no scroll              |
| Panels       | Side panel (300px) or bottom sheet |
| Context menu | Inline below selected element      |
| HUD          | Full labels                        |
| Bottom nav   | Full labels with icons             |
| Tooltips     | Hover to show                      |

### 13.3 Desktop (> 1024px)

| Element      | Behavior                            |
| ------------ | ----------------------------------- |
| Farm scene   | Centered, fixed size, zoom controls |
| Panels       | Side panel (400px)                  |
| Context menu | Inline popup                        |
| HUD          | Full labels with stats              |
| Navigation   | Top bar or side nav                 |
| Tooltips     | Hover to show                       |
| Keyboard     | Full shortcut support               |

### 13.4 Scale Breakpoints

```
Mobile:    320px – 767px   (1x scale)
Tablet:    768px – 1023px  (1.5x scale)
Desktop:   1024px – 1440px (2x scale)
Large:     1441px+         (2x scale, centered)
```

---

## 14. Implementation Priority

### Phase 1: Visual Foundation (Week 1-2)

| Task                                        | Priority | Effort |
| ------------------------------------------- | -------- | ------ |
| Replace emoji icons with pixel-art sprites  | P0       | High   |
| Create pixel-art UI panels and buttons      | P0       | High   |
| Add farm background layers (sky, ground)    | P0       | Medium |
| Add crop growth animations                  | P0       | Medium |
| Add planting/watering/harvesting animations | P0       | Medium |

### Phase 2: Polish (Week 3-4)

| Task                               | Priority | Effort |
| ---------------------------------- | -------- | ------ |
| Add parallax to farm scene         | P1       | Medium |
| Add weather visual effects         | P1       | Medium |
| Add seasonal color palette changes | P1       | Medium |
| Add floating text animations       | P1       | Low    |
| Add toast notification system      | P1       | Low    |
| Add loading screen with tips       | P1       | Low    |

### Phase 3: Delight (Week 5-6)

| Task                              | Priority | Effort |
| --------------------------------- | -------- | ------ |
| Add Kgotla background scene       | P2       | Medium |
| Add Bushveld background scene     | P2       | Medium |
| Add animal idle animations        | P2       | Medium |
| Add building animations           | P2       | Medium |
| Add achievement unlock animations | P2       | Low    |
| Add level-up celebration          | P2       | Low    |

### Phase 4: Sound (Week 7-8)

| Task                           | Priority | Effort |
| ------------------------------ | -------- | ------ |
| Add ambient sound system       | P2       | Medium |
| Add action sound effects       | P2       | Medium |
| Add background music per scene | P2       | Medium |
| Add weather sounds             | P3       | Low    |

---

## Appendix A: Animation Timing Reference

| Animation     | Duration | Easing      | Notes                   |
| ------------- | -------- | ----------- | ----------------------- |
| Button press  | 100ms    | Ease-out    | Scale 1.0→0.95→1.0      |
| Panel open    | 200ms    | Ease-out    | Slide up + fade         |
| Panel close   | 150ms    | Ease-in     | Fade out                |
| Tooltip show  | 100ms    | Ease-out    | Fade in                 |
| Crop sway     | 2000ms   | Sine        | ±2° rotation loop       |
| Water drop    | 300ms    | Gravity     | Parabolic fall          |
| Harvest sweep | 400ms    | Ease-in-out | Horizontal wipe         |
| XP float      | 1500ms   | Ease-out    | Float up + fade         |
| Level up      | 2000ms   | Multi-phase | See section 5.1         |
| Season change | 1000ms   | Cross-fade  | Color palette shift     |
| Loading pulse | 1000ms   | Sine        | Logo scale 1.0→1.05→1.0 |

## Appendix B: Color Reference Quick Guide

| Usage          | Color        | Hex     |
| -------------- | ------------ | ------- |
| Primary action | Amber        | #FF8F00 |
| Success        | Green        | #4CAF50 |
| Warning        | Yellow       | #FFC107 |
| Error          | Red          | #F44336 |
| Info           | Blue         | #2196F3 |
| Panel bg       | Dark brown   | #3E2723 |
| Panel border   | Medium brown | #5D4037 |
| Text primary   | Cream        | #F5E6D3 |
| Text secondary | Muted        | #BCAAA4 |
| Ground         | Earth red    | #C05C3C |
| Grass          | Green        | #5A8F3C |
| Water          | Sky blue     | #87CEEB |
| Currency       | Gold         | #FFD700 |
