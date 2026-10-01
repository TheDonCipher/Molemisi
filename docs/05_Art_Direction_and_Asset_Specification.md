# Document 05: Art Direction and Asset Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target)
> Last Updated: 2026-09-02
> Implementation: 2026-09-06 — `assets/` + `assets/manifest.json` (209 entries), synced by `scripts/sync-assets.mjs`. PixelLab generator: `scripts/generate-pixellab-assets.mjs`.

---

## Table of Contents

1. [Art Philosophy](#1-art-philosophy)
2. [Pixel Resolution](#2-pixel-resolution)
3. [Color Palette](#3-color-palette)
4. [Tile and Sprite Standards](#4-tile-and-sprite-standards)
5. [Building Art](#5-building-art)
6. [Crop Art](#6-crop-art)
7. [Animal Art](#7-animal-art)
8. [NPC Art](#8-npc-art)
9. [Environment Art](#9-environment-art)
10. [UI Assets](#10-ui-assets)
11. [Particle and Effect Art](#11-particle-and-effect-art)
12. [Animation Standards](#12-animation-standards)
13. [Naming Conventions](#13-naming-conventions)
14. [Asset Directory Structure](#14-asset-directory-structure)
15. [Sprite Sheet Conventions](#15-sprite-sheet-conventions)
16. [Asset Acceptance Criteria](#16-asset-acceptance-criteria)
17. [AI-Generated Assets](#17-ai-generated-assets)
18. [Art Bible Summary](#18-art-bible-summary)

---

## 1. Art Philosophy

**NFR-ART-001**

Molemisi's art style is **warm, cozy, detailed pixel art** inspired by the Botswana landscape and culture.

### Visual Identity Principles

1. **Warmth over realism:** Colors should feel sun-baked and inviting, not photographic.
2. **Character over detail:** Each sprite should read clearly at small sizes.
3. **Life over stillness:** Everything should feel alive through subtle animation.
4. **Cohesion over variety:** All assets must feel like they belong in the same world.
5. **Cultural respect:** Botswana-inspired elements should be recognizable and authentic, not caricatured.

### Mood Board Keywords

- Golden hour lighting
- Red earth and green vegetation
- Clear blue skies
- Warm wood and stone textures
- Soft shadows
- Lush crops
- Healthy animals
- Welcoming community spaces

### What Molemisi is NOT

- Not gritty or dark
- Not overly cute or chibi
- Not 3D or pre-rendered
- Not realistic or photographic
- Not generic fantasy

---

## 2. Pixel Resolution

**NFR-ART-002**

### Base Resolution

| Property      | Value               | Notes              |
| ------------- | ------------------- | ------------------ |
| Tile size     | 16x16 pixels        | Base unit          |
| Pixel density | 1x (no sub-pixels)  | Clean pixel art    |
| Art style     | 16-bit era inspired | SNES/GBA quality   |
| Anti-aliasing | None                | Pixel-perfect      |
| Color depth   | 32-bit (RGBA)       | Full alpha support |

### Sprite Size Guidelines

| Category         | Minimum | Typical | Maximum |
| ---------------- | ------- | ------- | ------- |
| Tile             | 16x16   | 16x16   | 16x16   |
| Small crop       | 16x16   | 16x16   | 16x16   |
| Medium crop      | 16x16   | 16x24   | 16x32   |
| Animal (small)   | 16x16   | 16x16   | 16x16   |
| Animal (large)   | 24x24   | 32x24   | 48x32   |
| Building (small) | 32x32   | 32x32   | 48x48   |
| Building (large) | 48x48   | 64x48   | 96x64   |
| NPC              | 16x24   | 16x24   | 16x32   |
| UI icon          | 16x16   | 16x16   | 32x32   |
| UI button        | 32x16   | 48x16   | 64x16   |
| Particle         | 4x4     | 4x4     | 8x8     |

### Display Scaling

> **Corrected 2026-10-02.** This section said the game renders at **800×600** logical pixels.
> That number came from the deleted Phaser prototype. The scene backgrounds in
> `assets/backgrounds/` are **800×480** (`docs/23`), and the shipped React client does not use a
> fixed logical resolution at all — screens are CSS/Tailwind and scale fluidly, with pixel art
> held at 1:1 via `image-rendering: pixelated`. If you are sizing new art, the numbers that matter
> are the sprite sizes in the table above and the 800×480 background canvas, not a logical
> resolution.

---

## 3. Color Palette

**NFR-ART-003**

### Primary Palette (Botswana Landscape)

| Name          | Hex     | RGB           | Usage                    |
| ------------- | ------- | ------------- | ------------------------ |
| Earth Red     | #C05C3C | 192, 92, 60   | Ground, paths, dry earth |
| Earth Brown   | #8B5E3C | 139, 94, 60   | Dirt, soil, wood         |
| Sand          | #E8D5A3 | 232, 213, 163 | Sandy areas, dry grass   |
| Grass Green   | #5A8F3C | 90, 143, 60   | Healthy grass, leaves    |
| Dark Green    | #3D6B2E | 61, 107, 46   | Dense vegetation         |
| Sky Blue      | #87CEEB | 135, 206, 235 | Sky, water               |
| Deep Blue     | #4A7FB5 | 74, 127, 181  | Deep water, night sky    |
| Warm White    | #F5E6D3 | 245, 230, 211 | Highlights, text         |
| Sunset Orange | #E8945A | 232, 148, 90  | Sunset, warm lighting    |
| Sunset Red    | #D4654A | 212, 101, 74  | Sunset sky               |

### Secondary Palette (Crops and Plants)

| Name          | Hex     | RGB           | Usage            |
| ------------- | ------- | ------------- | ---------------- |
| Sorghum Gold  | #D4A520 | 212, 165, 32  | Sorghum grain    |
| Maize Yellow  | #F0C040 | 240, 192, 64  | Maize kernels    |
| Millet Tan    | #C4A882 | 196, 168, 130 | Millet grain     |
| Leaf Green    | #7CB342 | 124, 179, 66  | Plant leaves     |
| Stem Green    | #558B2F | 85, 139, 47   | Plant stems      |
| Flower Purple | #9C27B0 | 156, 39, 176  | Flowers          |
| Fruit Red     | #E53935 | 229, 57, 53   | Fruits, tomatoes |
| Pepper Red    | #C62828 | 198, 40, 40   | Peppers          |

### Tertiary Palette (Animals and Buildings)

| Name          | Hex     | RGB           | Usage            |
| ------------- | ------- | ------------- | ---------------- |
| Chicken White | #F5F5DC | 245, 245, 220 | Chicken feathers |
| Chicken Brown | #A0522D | 160, 82, 45   | Brown chicken    |
| Goat Brown    | #8B7355 | 139, 115, 85  | Goat fur         |
| Cow Black     | #2C2C2C | 44, 44, 44    | Cow spots        |
| Cow White     | #FAFAFA | 250, 250, 250 | Cow body         |
| Pig Pink      | #FFB6C1 | 255, 182, 193 | Pig skin         |
| Wood Light    | #DEB887 | 222, 184, 135 | Light wood       |
| Wood Dark     | #8B6914 | 139, 105, 20  | Dark wood        |
| Stone Light   | #B0B0B0 | 176, 176, 176 | Light stone      |
| Stone Dark    | #696969 | 105, 105, 105 | Dark stone       |
| Thatch        | #C4A265 | 196, 162, 101 | Roof thatch      |
| Iron          | #708090 | 112, 128, 144 | Metal, iron      |

### UI Palette

| Name              | Hex     | RGB           | Usage               |
| ----------------- | ------- | ------------- | ------------------- |
| UI Background     | #2C1810 | 44, 24, 16    | Dark panels         |
| UI Panel          | #3E2723 | 62, 39, 35    | Panel backgrounds   |
| UI Border         | #5D4037 | 93, 64, 55    | Panel borders       |
| UI Text Primary   | #F5E6D3 | 245, 230, 211 | Main text           |
| UI Text Secondary | #BCAAA4 | 188, 170, 164 | Secondary text      |
| UI Accent         | #FF8F00 | 255, 143, 0   | Buttons, highlights |
| UI Success        | #4CAF50 | 76, 175, 80   | Success states      |
| UI Warning        | #FFC107 | 255, 193, 7   | Warning states      |
| UI Error          | #F44336 | 244, 67, 54   | Error states        |
| UI Info           | #2196F3 | 33, 150, 243  | Info states         |

### Palette Rules

1. **Maximum 64 colors** per sprite sheet (practical limit for pixel art)
2. **No gradients** in pixel art (use dithering instead)
3. **Consistent light source:** Top-left (standard pixel art convention)
4. **Outline:** 1px black outline for characters, optional for environment
5. **Dithering:** Use for smooth transitions between 2 colors

---

## 4. Tile and Sprite Standards

**NFR-ART-004**

### Ground Tiles

| Tile  | Size  | Description              | Variants                 |
| ----- | ----- | ------------------------ | ------------------------ |
| Grass | 16x16 | Green grass with texture | 4 variations             |
| Dirt  | 16x16 | Brown soil               | 4 variations             |
| Path  | 16x16 | Stone/dirt path          | 3 variations             |
| Water | 16x16 | Water surface            | 2 variations + animation |
| Sand  | 16x16 | Sandy ground             | 3 variations             |

### Tile Design Rules

- Tiles must tile seamlessly (no visible edges)
- Use auto-tiling rules for edge/corner pieces
- Subtle variation prevents visual repetition
- No hard edges between tile types (use transition tiles)

### Object Sprites

| Object       | Size           | Description             |
| ------------ | -------------- | ----------------------- |
| Empty plot   | 16x16          | Tilled soil circle      |
| Planted plot | 16x16          | Soil with seed          |
| Growing crop | 16x16 to 16x24 | Varies by stage         |
| Ready crop   | 16x24 to 16x32 | Full plant with product |
| Well         | 32x32          | Stone well with bucket  |
| Coop         | 32x32          | Wooden chicken coop     |
| Barn         | 48x48          | Large wooden barn       |
| Animal       | 16x16 to 24x24 | Animated sprite         |

---

## 5. Building Art

**NFR-ART-005**

### Building Design Principles

- Buildings should look Botswana-inspired (thatch roofs, stone walls, wooden frames)
- Each building should be instantly recognizable at 32x32
- Building levels should show clear visual progression
- Construction state should show scaffolding/frame
- Maintenance state should show damage/wear

### Building Variants

| Building | Level 1             | Level 2              | Level 3                  |
| -------- | ------------------- | -------------------- | ------------------------ |
| Well     | Simple stone circle | Stone with roof      | Stone with pulley system |
| Coop     | Small wooden box    | Wooden coop with run | Large coop with fence    |
| Barn     | Small shed          | Medium barn          | Large barn with silo     |
| Mill     | Simple hand mill    | Water mill           | Wind mill                |
| Paddock  | Wooden fence        | Fence with shelter   | Full paddock with barn   |

### Construction Visual States

```
CONSTRUCTION: Wooden scaffolding, frame visible
ACTIVE: Complete building, animations (smoke, movement)
MAINTENANCE: Visible cracks, missing pieces
DISABLED: Darkened, no animations, boarded up
```

---

## 6. Crop Art

**NFR-ART-006**

### Crop Growth Stages

Each crop has 4-6 growth stages represented as sprite frames:

```
Stage 0: Seed (small dot in soil)
Stage 1: Sprout (small green shoot)
Stage 2: Young plant (small plant with leaves)
Stage 3: Growing (taller plant, buds forming)
Stage 4: Mature (full plant, product visible)
Stage 5: Ready (plant with harvestable product, sparkle effect)
```

### Crop Art Style

- Each crop should be distinguishable from others at any stage
- Color progression: brown (seed) → green (growth) → crop-specific color (mature)
- Leaves should have clear vein detail at larger stages
- Products (grain, fruit) should be visible at mature stages

### Crop Sprite Sheet Layout

```
┌────┬────┬────┬────┬────┬────┐
│ S0 │ S1 │ S2 │ S3 │ S4 │ S5 │  ← Horizontal strip
└────┴────┴────┴────┴────┴────┘

S0 = Seed
S1 = Sprout
S2 = Young
S3 = Growing
S4 = Mature
S5 = Ready (optional variant)
```

---

## 7. Animal Art

**NFR-ART-007**

### Animal Animation Frames

Each animal has these animation states:

| State     | Frames   | Loop | Speed |
| --------- | -------- | ---- | ----- |
| Idle      | 4 frames | Yes  | 2 fps |
| Walking   | 4 frames | Yes  | 4 fps |
| Eating    | 3 frames | No   | 3 fps |
| Sleeping  | 2 frames | Yes  | 1 fps |
| Producing | 3 frames | No   | 3 fps |
| Sick      | 2 frames | Yes  | 1 fps |

### Animal Art Style

- Animals should be cute but not cartoonish
- Recognizable at 16x16 pixels
- Clear color distinction between types
- Subtle idle animation (breathing, blinking)
- Expressive states (happy = bouncing, sick = drooping)

### Animal Direction

Animals face right by default. Left-facing variants are created by flipping (unless asymmetric).

---

## 8. NPC Art

**NFR-ART-008**

### NPC Design

- NPCs are 16x24 pixels (taller than animals)
- Each NPC has a unique color scheme and silhouette
- Clothing should reflect Botswana-inspired attire
- NPCs have 4-frame idle animations
- Talking NPCs have 2-frame mouth animation

### NPC Variants

| NPC         | Hair       | Clothing       | Distinguishing Feature |
| ----------- | ---------- | -------------- | ---------------------- |
| Elder Neo   | Grey       | Brown robe     | Walking stick          |
| Mama Naledi | Black wrap | Colorful dress | Market basket          |
| Oupa Kabelo | Bald       | Work apron     | Hammer                 |
| Refilwe     | Braids     | Green dress    | Herb pouch             |
| Thabo       | Short hair | Farm clothes   | Hat                    |

---

## 9. Environment Art

**NFR-ART-009**

### Environment Elements

| Element       | Size           | Description             |
| ------------- | -------------- | ----------------------- |
| Tree (acacia) | 32x48          | Flat-topped acacia tree |
| Tree (baobab) | 48x64          | Thick trunk baobab      |
| Bush          | 16x16          | Small bush              |
| Rock          | 16x16 to 32x16 | Stone formations        |
| Fence         | 16x16          | Wooden fence segment    |
| Water hole    | 32x32          | Small water pool        |
| Flower patch  | 16x16          | Colorful flowers        |

### Weather Visuals

| Weather | Visual Effect                         |
| ------- | ------------------------------------- |
| Clear   | Normal lighting, no particles         |
| Cloudy  | Darker overlay, moving clouds         |
| Rain    | Rain particle overlay, splash effects |
| Storm   | Dark overlay, lightning flashes, rain |
| Drought | Warm overlay, heat shimmer effect     |

---

## 10. UI Assets

**NFR-ART-010**

### UI Design Principles

- UI uses the warm brown/cream palette
- Pixel-art borders and panels
- Rounded corners where possible (pixel-art rounded)
- Consistent icon style (16x16, single color)
- Clear visual hierarchy

### UI Components

| Component          | Size        | States                           |
| ------------------ | ----------- | -------------------------------- |
| Button (primary)   | 48x16       | Normal, hover, pressed, disabled |
| Button (secondary) | 48x16       | Normal, hover, pressed, disabled |
| Panel              | Variable    | Normal, highlighted              |
| Icon               | 16x16       | Normal, active                   |
| Progress bar       | 64x8        | Empty to full                    |
| Slider             | 64x8        | Min to max                       |
| Toggle             | 16x8        | On, off                          |
| Tooltip            | Variable    | Visible                          |
| Modal              | 200x150 min | Open, closing                    |

### Icon Set

| Icon         | Usage                    |
| ------------ | ------------------------ |
| 🌾 Crop      | Crop-related actions     |
| 🐾 Animal    | Animal-related actions   |
| 🏠 Building  | Building-related actions |
| 💰 Currency  | Money-related            |
| 💧 Water     | Watering actions         |
| 🌡️ Weather   | Weather display          |
| ⏰ Time      | Time-related             |
| ⭐ Star      | Quality/rating           |
| 📦 Box       | Inventory                |
| 🔧 Tool      | Tool-related             |
| 📋 Contract  | Contract-related         |
| 🏘️ Community | Kgotla-related           |

---

## 11. Particle and Effect Art

**NFR-ART-011**

### Particle Textures

| Particle   | Size | Color           | Shape           |
| ---------- | ---- | --------------- | --------------- |
| Water drop | 4x4  | Blue (#87CEEB)  | Circle          |
| Sparkle    | 4x4  | Gold (#FFD700)  | Star            |
| Dust       | 4x4  | Brown (#8B7355) | Circle          |
| Leaf       | 6x6  | Green (#7CB342) | Leaf shape      |
| Rain       | 2x6  | Blue (#87CEEB)  | Line            |
| Snow       | 4x4  | White (#FFFFFF) | Circle          |
| Smoke      | 6x6  | Grey (#B0B0B0)  | Circle (fading) |
| Star       | 4x4  | Gold (#FFD700)  | Star (pulsing)  |

### Effect Animations

| Effect            | Duration  | Particles | Usage          |
| ----------------- | --------- | --------- | -------------- |
| Water splash      | 0.5s      | 10        | Watering crops |
| Harvest burst     | 0.5s      | 15        | Harvesting     |
| Sparkle           | 1.0s loop | 5         | Crop ready     |
| Smoke             | 2.0s loop | 3         | Chimney        |
| Construction dust | 1.0s      | 8         | Building       |
| Level up          | 1.5s      | 20        | Level up       |

---

## 12. Animation Standards

**NFR-ART-012**

### Frame Rates

| Animation Type    | Frame Rate | Loop |
| ----------------- | ---------- | ---- |
| Idle (animal)     | 2 fps      | Yes  |
| Walking           | 4 fps      | Yes  |
| Eating            | 3 fps      | No   |
| Growth transition | 1 fps      | No   |
| Harvest action    | 4 fps      | No   |
| UI button         | 6 fps      | No   |
| Particle          | N/A        | N/A  |

### Animation Duration Targets

| Animation   | Duration    | Notes             |
| ----------- | ----------- | ----------------- |
| Crop growth | Stage-based | Server-controlled |
| Animal idle | 2s loop     | Continuous        |
| Harvest     | 0.5s        | One-shot          |
| Plant       | 0.5s        | One-shot          |
| Water       | 0.5s        | One-shot          |
| Build       | 2.0s        | One-shot          |
| Upgrade     | 1.0s        | One-shot          |

### Sprite Sheet Frame Order

```
Frame 0 → Frame 1 → Frame 2 → Frame 3 (loop)
   ↓
  Left facing (mirror of right)
```

---

## 13. Naming Conventions

**NFR-ART-013**

### File Naming

```
{category}_{name}_{variant}.{ext}
```

**Categories:**

- `tile` — Ground tiles
- `crop` — Crop sprites
- `animal` — Animal sprites
- `building` — Building sprites
- `npc` — NPC sprites
- `ui` — UI elements
- `particle` — Particle textures
- `env` — Environment objects
- `icon` — Icons

**Examples:**

```
tile_grass_01.png
crop_sorghum_stages.png
animal_chicken_idle.png
building_coop_level1.png
npc_elder_neo_idle.png
ui_button_primary.png
particle_water.png
env_tree_acacia.png
icon_water.png
```

### Atlas Naming

```
{category}_{name}_atlas.json
{category}_{name}_atlas.png
```

**Examples:**

```
crop_crops_atlas.json
crop_crops_atlas.png
animal_animals_atlas.json
animal_animals_atlas.png
```

---

## 14. Asset Directory Structure

**NFR-ART-014**

> **Corrected 2026-10-02.** Earlier revisions of this section showed an `apps/game/public/assets/`
> tree full of Phaser texture atlases, Tiled maps and an `audio/` folder. **None of that
> existed at deletion and none of it exists now.** The standalone Phaser client `apps/game` was
> removed on 2026-09-11 (ADR-001). What is real is below.

### The one real tree

`assets/` is the **source**. `pnpm assets:sync` (`scripts/sync-assets.mjs`) copies it into
`apps/web/public/assets/` and regenerates the manifest
(`apps/web/public/assets/manifest.json`, **282 entries**). There is no second destination and no
atlas build.

```
assets/
├── manifest.json                  # the typed index (282 entries) — generated, never hand-edited
├── _archive/                      # WITHDRAWN art — excluded from sync (19 files)
├── branding/                      # logo.png, wordmark lockups, OG card
├── particles/                     # dust_puff, smoke_puff, sparkle_gold, rain_cloud, …
├── weather/                       # cloud_storm, sun_glow, lightning, wind_swirl, rain_cloud
├── sprites/
│   ├── animals/<species>/         # idle.png, happy.png, sick.png, product.png
│   ├── buildings/kraal/           # lvl1.png  ← the only building set left
│   ├── crops/<crop>/              # stage_0..stage_N.png, seed_<crop>.png, product_<crop>.png
│   ├── hotspots/<scene>/          # open_bush_stage_0..3, riverbank_stage_0..3, rocky_outcrop_…
│   ├── npcs/                      # <npc>.png + <npc>_head.png (dialog portraits)
│   └── scene-props/               # acacia_tree, baobab_tree, bush, fence, reeds, sandstone_rock,
│                                  #   grass_tuft, flower_patch, marula_tree, setlhare_sa_boswa
├── tiles/
│   ├── decorations/               # the scene-props listed above + kgotla_portrait, market_portrait
│   ├── sky/                       # ⭐ THE BACKGROUNDS live here (see note below)
│   └── ground/                    # grass_base.png, plot_soil.png, plot_empty.png
│       ├── grass_dirt/            #   0.png, 15.png
│       ├── grass_dry/              #   0.png, 15.png
│       ├── grass_path/             #   0.png, 15.png
│       └── grass_water/            #   0.png, 15.png
│       └── *.json                  #   one index per transition set, listing the variants
└── ui/
    ├── items/                     # <slug>.png for every catalogue item, incl. building_*
    ├── icons/                     # action + status + weather + currency icons
    ├── panels/  buttons/          # panel_dialog, panel_sheet, panel_titlebar, button_*
    └── tools/                     # hoe, watering_can, sickle, pickaxe, basket, canteen, …
```

### ⚠️ Backgrounds are in `tiles/sky/`, not `backgrounds/`

There is **no `assets/backgrounds/` directory**, despite the manifest *group* being called
`backgrounds`. The four scene backgrounds — plus three time-of-day variants — are files under
`assets/tiles/sky/`:

| Manifest key | Actual path |
| --- | --- |
| `farm_day` | `assets/tiles/sky/farm_day.png` |
| `farm_sunset` | `assets/tiles/sky/farm_sunset.png` |
| `farm_night` | `assets/tiles/sky/farm_night.png` |
| `kgotla` | `assets/tiles/sky/kgotla.png` |
| `market` | `assets/tiles/sky/market.png` |
| `bushveld_savanna` | `assets/tiles/sky/bushveld_savanna.png` |
| `bushveld_riverbank` | `assets/tiles/sky/bushveld_riverbank.png` |

The `group` field in the manifest is a **label, not a path** — always resolve through the
manifest's `file` field, never by reconstructing a path from the group name. Bushveld hotspot
stages are elsewhere again, in `assets/sprites/hotspots/<scene>/stage_0..3.png`.

The farm also has **three time-of-day backgrounds** (`farm_day` / `farm_sunset` / `farm_night`),
which the four-scene model in `docs/23` does not mention.

### Three things that changed and will bite you

1. **No atlases.** Phaser is gone, so `*_atlas.json` / `*_atlas.png` do not exist and nothing
   consumes them. Sprites are individual PNGs referenced by manifest key. If you are porting an
   old example from a design doc, that example is describing the deleted prototype.
2. **No `maps/`, no `audio/`.** There are no Tiled maps (the farm is a CSS grid plus a background
   image) and no audio at all — no music, no SFX, no audio assets anywhere in the repo.
3. **Ground autotiles are `0.png` and `15.png`.** They used to be UUID filenames
   (`3d6d8c50-…png`). `scripts/normalize-ground-tiles.mjs` renamed them to the two endpoints each
   transition needs, with the variant list in the sibling `<set>.json`. The client reads that
   index via `apps/web/src/lib/groundTiles.ts`. If you add a ground tile set, follow the
   `0`/`15` convention or `groundTiles.ts` will not find it.

### Withdrawn art is archived, not deleted

`assets/_archive/` (19 files) holds art that was paid for and then ruled out. It is **excluded
from `assets:sync`**, so these paths resolve to nothing at runtime and do not appear in the
manifest:

| Archived | Why |
| --- | --- |
| `sprites/animals/pig/*` | Pig removed from the roster (`docs/32` R5) — `pig` + `truffle` were ruled culturally off |
| `sprites/crops/saffron/*` | Saffron replaced by **Morula** as the top-of-ladder crop (resolved 2026-09-07) |
| `sprites/buildings/{barn,coop,goat_pen,mill,paddock,pig_pen,well}/lvl1.png` | Superseded by `sprites/buildings/kraal/lvl1.png` |
| `ui/items/building_borehole.png`, `building_greenhouse.png` | Buildings that were cut |
| `ui/items/material_marula.png`, `material_salt.png`, `product_saffron.png`, `product_wool.png` | Superseded item slugs |
| `particles/snowflake.png` | No snow in a Botswana game |

See `assets/_archive/README.md` for the rationale on each. **The pattern matters:** art is moved
to the archive rather than `git rm`'d, because a reinstatement ruling should not require
re-generating a paid PixelLab batch.

---

## 15. Sprite Sheet Conventions

**NFR-ART-015**

> **Corrected 2026-10-02 — this section is now historical.** Texture atlases were a Phaser
> concept. With `apps/game` deleted there is **no atlas packer, no `*_atlas.json` and no
> `*_atlas.png`** in the repo, and nothing in `apps/web` would read one. The JSON Hash example
> below is retained only to document what the deleted prototype used.

### How sprites are actually addressed now

Individual PNGs, keyed through the generated manifest:

```ts
// apps/web/src/lib/pixelIcons.ts — resolves a catalogue item slug to its icon URL.
import { resolveItemIcon, pixelItemIcon } from '@/lib/pixelIcons';

resolveItemIcon('sorghum');   // => '/assets/ui/items/...png' | null
pixelItemIcon('sorghum');     // => the same, with a fallback icon when the slug is unknown
```

`resolveItemIcon()` returns `null` for a slug with no art, so a missing icon is a visible,
debuggable `null` rather than a 404 — which is what the reachability audit in `docs/30` §4 used
to find the unreachable-asset problem in the first place.

Conventions that replaced the atlas rules:

- **One PNG per frame**, named `{subject}_{state}[_{index}].png` — e.g. `sorghum_stage_0..4`,
  `chicken_idle`, `fire_pit_f1..f3`
- **Stage ranges come from config, not from filenames.** `CropSprite` is driven by each crop's
  `spriteStages` array, so a crop with 5 stages needs 5 files and a crop with 3 needs 3 — the
  renderer does not hardcode a stage count
- **CSS keeps the pixels crisp**: `image-rendering: pixelated` (see `PixelSprite.tsx`)
- **The manifest is generated, never hand-edited** — run `pnpm assets:sync`

### Packing Rules (historical, Phaser-era)

- Maximum atlas size: 2048x2048
- Padding between sprites: 2px
- Power-of-two dimensions preferred
- Group related sprites in same atlas
- Separate atlases for different categories

If atlases are ever reintroduced (a future native build, say), these rules still hold — but they
are not how the current client loads art.

---

## 16. Asset Acceptance Criteria

**NFR-ART-016**

### Visual Quality

- [ ] Sprite is pixel-perfect at 1:1 scale
- [ ] Sprite is recognizable at 50% scale
- [ ] Sprite uses palette colors only
- [ ] Sprite has consistent lighting (top-left source)
- [ ] Sprite has no stray pixels or anti-aliasing
- [ ] Sprite tiles correctly (if applicable)
- [ ] Sprite animates smoothly (if applicable)

### Technical Quality

- [ ] File is correct format (PNG for sprites, JSON for atlases)
- [ ] File size is reasonable (< 100KB per sprite, < 1MB per atlas)
- [ ] Dimensions are correct (matches specification)
- [ ] Naming follows conventions
- [ ] Sprite sheet frames are evenly spaced
- [ ] No transparency issues

### Consistency

- [ ] Uses approved palette colors
- [ ] Matches art style of existing assets
- [ ] Scale is consistent with other assets
- [ ] Level of detail is consistent
- [ ] Cultural elements are authentic

---

## 17. AI-Generated Assets

**NFR-ART-017**

### AI Asset Policy

AI-generated assets may be used for:

- Initial concept exploration
- Placeholder sprites during development
- Texture generation for backgrounds
- Pattern generation for tiles

AI-generated assets must NOT be used for:

- Final game sprites without human review
- Character/NPC designs without cultural review
- UI elements without accessibility review

### AI Asset Workflow

1. **Generate:** Use AI tool to create initial concept
2. **Review:** Human artist reviews for quality and consistency
3. **Refine:** Manual pixel-art adjustments to match style
4. **Validate:** Check against acceptance criteria
5. **Integrate:** Add to asset pipeline

### AI Asset Quality Rules

- All AI assets must be manually reviewed before use
- AI assets must be adjusted to match pixel-art style
- AI assets must use approved palette colors
- AI assets must not contain copyrighted material
- AI assets must be culturally appropriate

---

## 18. Art Bible Summary

**NFR-ART-018**

### Quick Reference

| Property       | Value                           |
| -------------- | ------------------------------- |
| Style          | 16-bit pixel art                |
| Tile size      | 16x16                           |
| Palette        | 64 colors max                   |
| Light source   | Top-left                        |
| Outline        | 1px black (characters)          |
| Animation      | 2-4 fps typical                 |
| Atlas format   | JSON Hash                       |
| Max atlas size | 2048x2048                       |
| File format    | PNG (sprites), JSON (atlases)   |
| Naming         | {category}_{name}_{variant}.png |

### Color Mood

- **Dominant:** Warm earth tones (reds, browns, golds)
- **Accent:** Fresh greens, sky blues
- **UI:** Dark brown backgrounds, cream text
- **Highlight:** Gold/amber for important elements

### Cultural Authenticity

- Buildings reference Botswana architectural styles
- Clothing reflects traditional Botswana attire
- Landscape includes acacia trees, baobab trees, red earth
- Colors inspired by Botswana sunsets and savanna
- Animals include species found in Botswana
