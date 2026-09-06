# Document 04: Game Rendering and Phaser Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target)
> Last Updated: 2026-09-02
> Implementation: 2026-09-06 — `apps/game` is Vite + Phaser 3 on port 3002. Only Boot, Preload, and FarmScene are registered. Pixel assets load from `generated-assets.ts`. This spec's full scene/object tree is **not** the running game.

---

## Table of Contents

1. [Phaser Architecture](#1-phaser-architecture)
2. [Scene System](#2-scene-system)
3. [Game Objects](#3-game-objects)
4. [Sprites and Assets](#4-sprites-and-assets)
5. [Tilemaps](#5-tilemaps)
6. [Camera System](#6-camera-system)
7. [Input System](#7-input-system)
8. [Interaction System](#8-interaction-system)
9. [Animation System](#9-animation-system)
10. [Particle System](#10-particle-system)
11. [Lighting](#11-lighting)
12. [Transitions](#12-transitions)
13. [Asset Pipeline](#13-asset-pipeline)
14. [State Separation](#14-state-separation)
15. [API Communication](#15-api-communication)
16. [Performance](#16-performance)
17. [Responsive Rendering](#17-responsive-rendering)

---

## 1. Phaser Architecture

**NFR-PHASER-001**

### Technology

- **Engine:** Phaser 3 (latest stable)
- **Language:** TypeScript
- **Build:** Vite (separate from Next.js)
- **Canvas:** WebGL primary, Canvas fallback

### Module Structure

```
apps/game/src/
├── main.ts                    # Phaser game initialization
├── config/
│   ├── game.config.ts         # Phaser configuration
│   ├── scene.config.ts        # Scene registry
│   └── physics.config.ts      # Physics configuration (if needed)
├── scenes/
│   ├── BootScene.ts           # Boot/preload scene
│   ├── PreloadScene.ts        # Asset loading scene
│   ├── FarmScene.ts           # Farm world scene
│   ├── KgotlaScene.ts         # Kgotla community scene
│   ├── BushveldScene.ts       # Bushveld exploration scene
│   ├── MarketScene.ts         # Market trading scene
│   └── UIScene.ts             # Overlay UI scene
├── objects/
│   ├── Plot.ts                # Farm plot game object
│   ├── Crop.ts                # Crop game object
│   ├── Animal.ts              # Animal game object
│   ├── Building.ts            # Building game object
│   ├── NPC.ts                 # NPC game object
│   ├── ResourceNode.ts        # Bushveld resource node
│   └── ParticleEmitter.ts     # Particle system wrapper
├── systems/
│   ├── RenderSystem.ts        # Rendering management
│   ├── InputSystem.ts         # Input handling
│   ├── AnimationSystem.ts     # Animation management
│   ├── CameraSystem.ts        # Camera management
│   ├── ParticleSystem.ts      # Particle management
│   └── UISystem.ts            # UI overlay management
├── services/
│   ├── ApiClient.ts           # HTTP API client
│   ├── AuthService.ts         # Authentication
│   ├── GameStateService.ts    # Game state management
│   └── EventBus.ts            # Internal event bus
├── utils/
│   ├── SpriteUtils.ts         # Sprite helpers
│   ├── MathUtils.ts           # Math helpers
│   ├── ColorUtils.ts          # Color helpers
│   └── Pool.ts                # Object pooling
└── types/
    ├── game.types.ts          # Game type definitions
    ├── api.types.ts           # API response types
    └── events.types.ts        # Event type definitions
```

### Game Configuration

```typescript
// game.config.ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  width: 800,
  height: 600,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, FarmScene, KgotlaScene, BushveldScene, MarketScene, UIScene],
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
};
```

---

## 2. Scene System

**NFR-PHASER-002**

### Scene Registry

| Scene         | Key        | Purpose                         | Active By Default   |
| ------------- | ---------- | ------------------------------- | ------------------- |
| BootScene     | `boot`     | Initialize systems, load config | Yes (first)         |
| PreloadScene  | `preload`  | Load all assets                 | After boot          |
| FarmScene     | `farm`     | Farm world rendering            | Yes (after preload) |
| KgotlaScene   | `kgotla`   | Kgotla community                | No (on demand)      |
| BushveldScene | `bushveld` | Bushveld exploration            | No (on demand)      |
| MarketScene   | `market`   | Market trading                  | No (on demand)      |
| UIScene       | `ui`       | Overlay HUD elements            | Yes (parallel)      |

### Scene Lifecycle

```
BootScene
  → initialize systems
  → preload critical assets
  → start PreloadScene

PreloadScene
  → load all game assets
  → show loading progress
  → start FarmScene + UIScene

FarmScene
  → create farm world
  → render farm state
  → handle farm interactions
  → (switch to other scenes on navigation)
```

### Scene Transitions

```typescript
// Scene transition with fade
this.scene.start('KgotlaScene', {
  fade: true,
  fadeDuration: 200,
  fadeColor: 0x000000,
});
```

**Transition sequence:**

1. Fade out current scene (200ms)
2. Stop current scene
3. Start new scene
4. Fade in new scene (200ms)

### Scene Communication

Scenes communicate through the EventBus service:

```typescript
// Emit event
EventBus.emit('scene:transition', { target: 'kgotla' });

// Listen for event
EventBus.on('scene:transition', (data) => {
  this.scene.start(data.target);
});
```

---

## 3. Game Objects

**NFR-PHASER-003**

### Base Game Object

All game objects extend a common base:

```typescript
abstract class BaseGameObject extends Phaser.GameObjects.Sprite {
  protected entityId: string;
  protected entityType: EntityType;
  protected isInteractable: boolean;
  protected isSelected: boolean;

  abstract updateFromState(state: any): void;
  abstract getInteractionActions(): InteractionAction[];
}
```

### Plot Object

```typescript
class PlotObject extends BaseGameObject {
  private state: PlotState;
  private cropObject: CropObject | null;
  private highlight: Phaser.GameObjects.Rectangle;

  // States: EMPTY, PLANTED, GROWING, READY, WITHERED
  // Visual: Different sprite/animation per state
  // Interaction: Show context menu on click
}
```

### Crop Object

```typescript
class CropObject extends BaseGameObject {
  private cropType: string;
  private growthStage: number;
  private maxStages: number;
  private hydration: number;

  // Visual: Sprite sheet with growth stages
  // Animation: Growth stage transitions
  // Effects: Water droplets, sparkle on ready
}
```

### Animal Object

```typescript
class AnimalObject extends BaseGameObject {
  private animalType: string;
  private hunger: number;
  private health: number;
  private happiness: number;
  private productReady: boolean;

  // Visual: Animated sprite with idle/moving states
  // Animation: Idle loop, eating, sleeping
  // Effects: Product icon when ready
}
```

### Building Object

```typescript
class BuildingObject extends BaseGameObject {
  private buildingType: string;
  private level: number;
  private state: BuildingState;

  // Visual: Sprite with level variation
  // States: CONSTRUCTION, ACTIVE, MAINTENANCE, DISABLED
  // Effects: Smoke from chimney, construction animation
}
```

### NPC Object

```typescript
class NPCObject extends BaseGameObject {
  private npcId: string;
  private name: string;
  private hasQuest: boolean;
  private reputationLevel: number;

  // Visual: Animated character sprite
  // Animation: Idle, talking, gesturing
  // Effects: Speech bubble when quest available
}
```

### Object Pooling

Objects that are frequently created/destroyed use object pooling:

```typescript
class ObjectPool<T extends BaseGameObject> {
  private pool: T[] = [];
  private factory: () => T;

  get(): T {
    return this.pool.pop() || this.factory();
  }

  release(obj: T): void {
    obj.setActive(false).setVisible(false);
    this.pool.push(obj);
  }
}
```

---

## 4. Sprites and Assets

**NFR-PHASER-004**

### Sprite Sheet Format

All sprites use texture atlases generated by TexturePacker or similar.

**Naming convention:**

```
{category}_{name}_{variant}.png
```

**Examples:**

```
crop_sorghum_stages.png       # Growth stages sprite sheet
animal_chicken_idle.png       # Chicken idle animation
building_coop_level1.png      # Coop level 1 sprite
ui_button_primary.png         # Primary button sprite
particle_water.png            # Water particle
```

### Sprite Sheet Layout

```
┌────┬────┬────┬────┐
│ S0 │ S1 │ S2 │ S3 │  ← Growth stages (horizontal strip)
└────┴────┴────┴────┘

S0 = Seed
S1 = Sprout
S2 = Growing
S3 = Mature/Ready
```

### Atlas Format (JSON Hash)

```json
{
  "frames": {
    "crop_sorghum_0": {
      "frame": { "x": 0, "y": 0, "w": 16, "h": 16 },
      "spriteSourceSize": { "x": 0, "y": 0, "w": 16, "h": 16 },
      "sourceSize": { "w": 16, "h": 16 }
    },
    "crop_sorghum_1": {
      "frame": { "x": 16, "y": 0, "w": 16, "h": 16 }
    }
  }
}
```

### Sprite Dimensions

| Category    | Size (px)      | Notes             |
| ----------- | -------------- | ----------------- |
| Tile        | 16x16          | Base tile size    |
| Crop stages | 16x16 each     | Per growth stage  |
| Animals     | 16x16 to 24x24 | Varies by type    |
| Buildings   | 32x32 to 48x48 | Varies by size    |
| NPCs        | 16x24          | Character sprites |
| UI elements | Variable       | Per element       |
| Particles   | 4x4 to 8x8     | Small sprites     |

---

## 5. Tilemaps

**NFR-PHASER-005**

### Farm Tilemap

The farm uses a tilemap for the ground layer and object layer for interactive elements.

**Tilemap layers:**

1. **Ground layer:** Grass, dirt, paths, water
2. **Object layer:** Plots, buildings, decorations
3. **Overlay layer:** Weather effects, lighting

### Tilemap Format

Using Tiled JSON export format:

```json
{
  "width": 20,
  "height": 15,
  "tileWidth": 16,
  "tileHeight": 16,
  "layers": [
    {
      "name": "ground",
      "type": "tilelayer",
      "data": [1, 1, 1, 2, 2, ...]
    },
    {
      "name": "objects",
      "type": "objectgroup",
      "objects": [
        {
          "name": "plot_1",
          "type": "plot",
          "x": 32,
          "y": 32,
          "width": 16,
          "height": 16
        }
      ]
    }
  ]
}
```

### Tile Types

| Tile ID | Type  | Description |
| ------- | ----- | ----------- |
| 0       | Empty | No tile     |
| 1       | Grass | Green grass |
| 2       | Dirt  | Brown dirt  |
| 3       | Path  | Stone path  |
| 4       | Water | Water tile  |
| 5       | Sand  | Sandy soil  |

---

## 6. Camera System

**NFR-PHASER-006**

### Camera Configuration

```typescript
// Farm camera setup
const camera = this.cameras.main;
camera.setBounds(0, 0, mapWidth, mapHeight);
camera.setZoom(1);
camera.centerOn(mapWidth / 2, mapHeight / 2);
```

### Camera Behaviors

**Mobile:**

- Pan: Drag to move
- Zoom: Pinch to zoom (optional, disabled by default)
- Bounds: Constrained to map edges
- Dead zone: Center 50% of screen

**Desktop:**

- Pan: Drag or arrow keys
- Zoom: Scroll wheel
- Bounds: Constrained to map edges
- Smooth follow: Enabled

### Camera Transitions

```typescript
// Smooth pan to target
this.cameras.main.pan(targetX, targetY, 500, 'Sine.easeInOut');

// Smooth zoom
this.cameras.main.zoomTo(1.5, 500, 'Sine.easeInOut');
```

### Camera Limits

| Parameter | Value    | Notes                 |
| --------- | -------- | --------------------- |
| Min zoom  | 0.5      | Overview mode         |
| Max zoom  | 2.0      | Close-up mode         |
| Pan speed | 500ms    | Transition duration   |
| Bounds    | Map size | Cannot pan beyond map |

---

## 7. Input System

**NFR-PHASER-007**

### Input Handling

```typescript
class InputSystem {
  // Pointer events
  this.input.on('pointerdown', this.handlePointerDown, this);
  this.input.on('pointerup', this.handlePointerUp, this);
  this.input.on('pointermove', this.handlePointerMove, this);

  // Keyboard events (desktop only)
  this.input.keyboard?.on('keydown-SPACE', this.handleSpace, this);
  this.input.keyboard?.on('keydown-M', this.handleMarket, this);
}
```

### Input Modes

| Mode   | Trigger             | Behavior                    |
| ------ | ------------------- | --------------------------- |
| Select | Tap/click on object | Select object, show context |
| Action | Tap action button   | Execute selected action     |
| Pan    | Drag on empty space | Move camera                 |
| Zoom   | Scroll/pinch        | Change zoom level           |

### Touch Input

```typescript
// Mobile touch handling
const pointer = this.input.activePointer;

if (pointer.isDown) {
  const worldPoint = pointer.positionToCamera(this.cameras.main);
  // Handle touch at worldPoint
}
```

### Input Priority

1. UI overlay (handled by React/Next.js)
2. Context menu (Phaser UI scene)
3. Game objects (Phaser game scene)
4. Camera controls (background)

---

## 8. Interaction System

**NFR-PHASER-008**

### Interaction Model

All interactions follow: **Tap → Select → Choose Action**

```
Player taps object
  → Object selected (highlight)
  → Context menu appears
  → Player chooses action
  → Action request sent to API
  → API responds
  → Object state updated
  → Visual feedback shown
```

### Selection System

```typescript
class SelectionSystem {
  private selectedObject: BaseGameObject | null;

  select(object: BaseGameObject): void {
    // Deselect previous
    if (this.selectedObject) {
      this.selectedObject.deselect();
    }

    // Select new
    this.selectedObject = object;
    object.select();

    // Show context menu
    this.showContextMenu(object);
  }

  deselect(): void {
    if (this.selectedObject) {
      this.selectedObject.deselect();
      this.selectedObject = null;
      this.hideContextMenu();
    }
  }
}
```

### Context Menu

```typescript
// Context menu appears as Phaser UI element
class ContextMenu {
  private actions: InteractionAction[];
  private buttons: Phaser.GameObjects.Container[];

  show(object: BaseGameObject, position: Vector2): void {
    this.actions = object.getInteractionActions();
    this.render(position);
  }

  hide(): void {
    this.buttons.forEach((b) => b.destroy());
    this.buttons = [];
  }
}
```

---

## 9. Animation System

**NFR-PHASER-009**

### Animation Types

**Sprite animations:**

- Idle loops (animals, NPCs)
- Growth transitions (crops)
- Action animations (harvesting, building)
- Weather effects (rain, wind)

**Tween animations:**

- Object movement (smooth position changes)
- Scale effects (selection highlight)
- Alpha transitions (fade in/out)
- Color tinting (status indicators)

### Animation Configuration

```typescript
// Define animations in preload
this.anims.create({
  key: 'chicken_idle',
  frames: this.anims.generateFrameNumbers('chicken', { start: 0, end: 3 }),
  frameRate: 4,
  repeat: -1, // Loop
});

this.anims.create({
  key: 'crop_grow',
  frames: this.anims.generateFrameNumbers('sorghum', { start: 0, end: 3 }),
  frameRate: 1,
  repeat: 0, // Play once
});
```

### Animation Triggers

| Event              | Animation               | Duration |
| ------------------ | ----------------------- | -------- |
| Crop planted       | Seed drop + soil darken | 0.5s     |
| Crop grows         | Stage transition        | 0.3s     |
| Crop ready         | Sparkle effect          | 1s loop  |
| Crop harvested     | Pull up + fade          | 0.5s     |
| Animal fed         | Eating animation        | 1s       |
| Animal produces    | Product pop             | 0.5s     |
| Building construct | Building rise           | 2s       |
| Building upgrade   | Sparkle + scale         | 1s       |

---

## 10. Particle System

**NFR-PHASER-010**

### Particle Types

| Particle   | Texture   | Behavior      | Usage            |
| ---------- | --------- | ------------- | ---------------- |
| Water drop | 4x4 blue  | Fall + splash | Watering crops   |
| Sparkle    | 4x4 gold  | Float + fade  | Crop ready       |
| Dust       | 4x4 brown | Drift         | Harvesting       |
| Leaf       | 6x6 green | Float down    | Autumn weather   |
| Rain       | 2x6 blue  | Fall fast     | Rain weather     |
| Snow       | 4x4 white | Float down    | Winter weather   |
| Smoke      | 6x6 grey  | Rise + fade   | Building chimney |
| Star       | 4x4 gold  | Pulse         | Level up         |

### Particle Configuration

```typescript
// Water particles
const waterEmitter = this.add.particles(0, 0, 'particle_water', {
  speed: { min: 50, max: 100 },
  angle: { min: 80, max: 100 },
  scale: { start: 1, end: 0 },
  lifespan: 500,
  gravityY: 200,
  quantity: 5,
  frequency: 100,
});
```

### Particle Limits

| Context        | Max Particles | Notes                  |
| -------------- | ------------- | ---------------------- |
| Mobile         | 50            | Performance constraint |
| Desktop        | 100           | Higher budget          |
| Rain event     | 30            | Weather overlay        |
| Harvest effect | 10            | Burst effect           |

---

## 11. Lighting

**NFR-PHASER-011**

### Lighting Model

Molemisi uses a simplified lighting system based on time of day and weather.

**Time-based tinting:**

| Time         | Tint        | Description |
| ------------ | ----------- | ----------- |
| Dawn (6-8)   | Warm orange | Sunrise     |
| Day (8-16)   | Neutral     | Normal      |
| Dusk (16-18) | Warm red    | Sunset      |
| Night (18-6) | Cool blue   | Night       |

### Implementation

```typescript
// Apply time-of-day tint
const hour = gameHour; // 0-24
let tint = 0xffffff; // Default

if (hour >= 6 && hour < 8) {
  // Dawn: warm orange
  tint = Phaser.Display.Color.GetColor(255, 220, 180);
} else if (hour >= 16 && hour < 18) {
  // Dusk: warm red
  tint = Phaser.Display.Color.GetColor(255, 180, 150);
} else if (hour >= 18 || hour < 6) {
  // Night: cool blue
  tint = Phaser.Display.Color.GetColor(150, 180, 255);
}

// Apply to scene
this.cameras.main.setTint(tint);
```

### Weather Lighting

| Weather | Modifier                   |
| ------- | -------------------------- |
| Clear   | No change                  |
| Cloudy  | -10% brightness            |
| Rain    | -20% brightness, blue tint |
| Storm   | -30% brightness, dark tint |
| Drought | +10% brightness, warm tint |

---

## 12. Transitions

**NFR-PHASER-012**

### Scene Transitions

**Fade transition (default):**

```
Current scene fade out (200ms)
  → Black screen (50ms)
  → New scene fade in (200ms)
```

**Wipe transition (optional):**

```
Current scene wipe left (300ms)
  → New scene wipe in from right (300ms)
```

**Instant transition (loading):**

```
Current scene stop
  → New scene start
  → Fade in (100ms)
```

### In-Scene Transitions

**Zoom to element:**

```typescript
this.cameras.main.pan(element.x, element.y, 300);
this.cameras.main.zoomTo(1.5, 300);
```

**Panel slide:**

```typescript
// Slide panel from bottom
this.tweens.add({
  targets: panel,
  y: targetY,
  duration: 200,
  ease: 'Back.easeOut',
});
```

---

## 13. Asset Pipeline

**NFR-PHASER-013**

### Asset Loading Order

```
1. Boot assets (minimal for loading screen)
   → Loading bar sprites
   → Font files

2. Core assets (needed for farm scene)
   → Tilemap JSON
   → Ground tiles
   → Plot sprites
   → Crop sprites (all types)
   → Building sprites (all types)
   → Animal sprites (all types)
   → UI sprites

3. Secondary assets (loaded on demand)
   → Kgotla assets
   → Bushveld assets
   → Market assets
   → NPC sprites
   → Particle textures
```

### Asset Manifest

```json
{
  "boot": {
    "images": ["loading_bar", "loading_fill"],
    "fonts": ["pixel_font"]
  },
  "farm": {
    "tilemaps": ["farm_map"],
    "images": ["ground_tiles", "plot_sprites", "crop_atlas", "building_atlas", "animal_atlas"],
    "audio": ["ambient_nature", "ui_click", "ui_success"]
  },
  "kgotla": {
    "images": ["kgotla_map", "npc_atlas", "ui_kgotla"],
    "audio": ["ambient_community"]
  },
  "bushveld": {
    "images": ["bushveld_map", "resource_nodes", "ui_bushveld"],
    "audio": ["ambient_bush"]
  }
}
```

### Asset Loading Strategy

```typescript
// PreloadScene
preload() {
  // Load boot assets first
  this.load.image('loading_bar', 'assets/ui/loading_bar.png');
  this.load.image('loading_fill', 'assets/ui/loading_fill.png');

  // Show loading bar
  const progressBar = this.add.graphics();
  const progressBox = this.add.graphics();

  this.load.on('progress', (value: number) => {
    progressBar.clear();
    progressBar.fillStyle(0x8B4513, 1);
    progressBar.fillRect(250, 280, 300 * value, 30);
  });

  // Load farm assets
  this.load.image('ground_tiles', 'assets/tiles/ground.png');
  this.load.atlas('crops', 'assets/sprites/crops.png', 'assets/sprites/crops.json');
  this.load.atlas('animals', 'assets/sprites/animals.png', 'assets/sprites/animals.json');
  this.load.atlas('buildings', 'assets/sprites/buildings.png', 'assets/sprites/buildings.json');
  this.load.tilemapTiledJSON('farm_map', 'assets/maps/farm.json');
}
```

### Caching Strategy

- All assets cached in Phaser cache after loading
- No re-fetching during gameplay
- Secondary assets loaded during scene transitions
- Cache eviction: LRU for secondary assets

---

## 14. State Separation

**NFR-PHASER-014**

### State Categories

```
┌─────────────────────────────────────────────────┐
│                  STATE LAYERS                     │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  RENDERING STATE                            │ │
│  │  • Sprite positions                         │ │
│  │  • Animation frames                         │ │
│  │  • Particle positions                       │ │
│  │  • Camera position/zoom                     │ │
│  │  • Visual effects                           │ │
│  │  Purpose: What the player SEES              │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  GAME STATE (Client)                        │ │
│  │  • Selected object                          │ │
│  │  • Context menu state                       │ │
│  │  • UI overlay state                         │ │
│  │  • Animation queues                         │ │
│  │  Purpose: Client-only temporary state       │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  SERVER STATE                               │ │
│  │  • Farm plots                               │ │
│  │  • Crop states                              │ │
│  │  • Animal states                            │ │
│  │  • Building states                          │ │
│  │  • Inventory                                │ │
│  │  • Currency                                 │ │
│  │  Purpose: Authoritative game data           │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  UI STATE (React)                           │ │
│  │  • Modal visibility                         │ │
│  │  • Form inputs                              │ │
│  │  • Navigation state                         │ │
│  │  • Settings                                 │ │
│  │  Purpose: Application UI state              │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### State Flow

```
Server State (PostgreSQL)
  → API Response
  → GameStateService (Client)
  → Game Objects (Phaser)
  → Rendering State (Display)
```

**Rules:**

1. Server state is the source of truth
2. Client game state is a local cache of server state
3. Rendering state is derived from game state
4. UI state is independent of game state
5. Client never modifies server state directly

---

## 15. API Communication

**NFR-PHASER-015**

### API Client

```typescript
class GameApiClient {
  private baseUrl: string;
  private authToken: string;

  async request<T>(method: string, path: string, body?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }
}
```

### Request/Response Pattern

```typescript
// Plant crop
const result = await apiClient.request('POST', `/farms/${farmId}/plots/${plotId}/plant`, {
  cropType: 'sorghum',
});

// Update local state
gameStateService.updatePlot(plotId, result.data.plot);

// Update visual
plotObject.updateFromState(result.data.plot);
```

### Optimistic Updates

For common actions, the client applies optimistic updates:

```typescript
// Optimistic: immediately show watering effect
plotObject.showWateringEffect();

// Send request
try {
  const result = await apiClient.request('POST', `/farms/${farmId}/plots/${plotId}/water`);
  gameStateService.updatePlot(plotId, result.data.plot);
} catch (error) {
  // Revert optimistic update
  plotObject.revertState();
  showError('Failed to water crop');
}
```

### Sync Strategy

- **Full sync on load:** Fetch complete farm state
- **Delta sync on action:** Only affected objects updated
- **Polling:** Not used (wasteful)
- **Realtime:** Supabase Realtime for critical updates (optional)

---

## 16. Performance

**NFR-PHASER-016**

### Performance Targets

| Metric         | Mobile        | Desktop       |
| -------------- | ------------- | ------------- |
| FPS            | 30fps minimum | 60fps target  |
| Draw calls     | < 50          | < 100         |
| Sprite count   | < 200 visible | < 400 visible |
| Particle count | < 50          | < 100         |
| Texture memory | < 50MB        | < 100MB       |
| Load time      | < 3s          | < 2s          |

### Optimization Techniques

**Object pooling:**

- Reuse destroyed game objects
- Pre-allocate common objects
- Reduce garbage collection

**Sprite batching:**

- Use texture atlases
- Minimize texture swaps
- Use sprite sheets for animations

**Culling:**

- Only render visible objects
- Use camera bounds for culling
- Off-screen objects set inactive

**Level of detail:**

- Reduce animation frames at distance
- Simplify particles at low FPS
- Disable effects below threshold

### Performance Monitoring

```typescript
// Phaser debug info
if (config.debug) {
  this.game.loop.callbackPreAdd(() => {
    console.log('FPS:', this.game.loop.actualFps);
    console.log('Draw calls:', this.renderer.snapshot_pixels);
  });
}
```

---

## 17. Responsive Rendering

**NFR-PHASER-017**

### Screen Sizes

| Device           | Width       | Height      | Scale Mode |
| ---------------- | ----------- | ----------- | ---------- |
| Mobile portrait  | 375-430px   | 667-932px   | FIT        |
| Mobile landscape | 667-932px   | 375-430px   | FIT        |
| Tablet portrait  | 768-834px   | 1024-1194px | FIT        |
| Tablet landscape | 1024-1194px | 768-834px   | FIT        |
| Desktop          | 1280px+     | 720px+      | FIT        |

### Scale Strategy

```typescript
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 800,
  height: 600,
}
```

- Base resolution: 800x600
- Phaser scales to fit container
- Maintains pixel-perfect rendering
- Letterboxing on extreme ratios

### Responsive UI

UI elements adapt to screen size:

```typescript
class ResponsiveUI {
  getLayout(): LayoutConfig {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const isMobile = width < 768;

    return {
      bottomNavHeight: isMobile ? 60 : 50,
      headerHeight: isMobile ? 48 : 40,
      contextMenuPosition: isMobile ? 'bottom' : 'inline',
      fontSize: isMobile ? 12 : 14,
    };
  }
}
```
