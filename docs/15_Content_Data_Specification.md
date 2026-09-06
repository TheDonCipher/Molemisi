# Document 15: Content Data Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target)
> Last Updated: 2026-09-02
> Implementation: 2026-09-06 — Crops (11), buildings (7), livestock (4), store (13), weather in `packages/game-config`. Contracts, NPCs, bushveld zones, world events remain hardcoded in API services.

---

## 1. Content Architecture

**FR-CON-001**

All game content is data-driven. New content can be added by updating configuration files without modifying core game logic.

### Content Schema

```typescript
interface ContentDefinition {
  id: string;
  type:
    | 'crop'
    | 'animal'
    | 'building'
    | 'item'
    | 'recipe'
    | 'contract'
    | 'npc'
    | 'event'
    | 'achievement';
  name: string;
  description: string;
  unlockLevel: number;
  data: any; // Type-specific data
}
```

---

## 2. Crop Definitions

```json
{
  "type": "crop",
  "id": "sorghum",
  "name": "Sorghum",
  "description": "A hardy grain crop, staple of Botswana agriculture.",
  "unlockLevel": 1,
  "data": {
    "growthStages": 4,
    "timePerStage": 3,
    "waterDecayRate": 0.1,
    "waterPerAction": 1,
    "diseaseChancePerStage": 0.05,
    "pestChancePerStage": 0.03,
    "yield": { "min": 3, "max": 5 },
    "qualityTiers": {
      "poor": { "range": [0, 0.3], "multiplier": 0.5 },
      "normal": { "range": [0.3, 0.7], "multiplier": 1.0 },
      "good": { "range": [0.7, 0.9], "multiplier": 1.5 },
      "excellent": { "range": [0.9, 1.0], "multiplier": 2.0 }
    },
    "seedCost": 5,
    "basePrice": 15,
    "spriteSheet": "crop_sorghum_stages.png",
    "animationFrames": 4,
    "frameRate": 1
  }
}
```

---

## 3. Animal Definitions

```json
{
  "type": "animal",
  "id": "chicken",
  "name": "Chicken",
  "description": "A friendly chicken that lays eggs daily.",
  "unlockLevel": 1,
  "data": {
    "feedPerDay": 2,
    "feedType": "grain",
    "productionCycleHours": 12,
    "productType": "egg",
    "productQuantity": 2,
    "baseProductPrice": 5,
    "purchaseCost": 50,
    "hungerDecayRate": 0.15,
    "healthDecayRate": 0.1,
    "happinessDecayRate": 0.05,
    "buildingRequired": "coop",
    "spriteSheet": "animal_chicken.png",
    "animations": {
      "idle": { "frames": 4, "frameRate": 2, "loop": true },
      "eating": { "frames": 3, "frameRate": 3, "loop": false },
      "sleeping": { "frames": 2, "frameRate": 1, "loop": true }
    }
  }
}
```

---

## 4. Building Definitions

```json
{
  "type": "building",
  "id": "coop",
  "name": "Chicken Coop",
  "description": "A cozy shelter for chickens.",
  "unlockLevel": 1,
  "data": {
    "capacity": 10,
    "capacityType": "chicken",
    "baseCost": {
      "currency": 150,
      "wood": 5
    },
    "upgradeCosts": [
      { "currency": 300, "wood": 10 },
      { "currency": 600, "wood": 20 }
    ],
    "constructionTime": 20,
    "upgradeTimes": [30, 45],
    "wearPerHour": 0.005,
    "maintenanceCost": 37,
    "maintenanceIntervalDays": 14,
    "spriteSheet": "building_coop.png",
    "levels": {
      "1": { "capacity": 10, "sprite": "coop_level1.png" },
      "2": { "capacity": 15, "sprite": "coop_level2.png" },
      "3": { "capacity": 20, "sprite": "coop_level3.png" }
    }
  }
}
```

---

## 5. Item Definitions

```json
{
  "type": "item",
  "id": "sorghum_seed",
  "name": "Sorghum Seed",
  "description": "Seeds for planting sorghum.",
  "unlockLevel": 1,
  "data": {
    "category": "seed",
    "cropType": "sorghum",
    "stackable": true,
    "maxStack": 100,
    "buyPrice": 5,
    "sellPrice": 2,
    "sprite": "item_sorghum_seed.png"
  }
}
```

---

## 6. Recipe Definitions

```json
{
  "type": "recipe",
  "id": "grain_to_flour",
  "name": "Mill Grain",
  "description": "Process grain into flour.",
  "data": {
    "buildingType": "mill",
    "inputItems": [
      { "type": "sorghum", "quantity": 5 },
      { "type": "maize", "quantity": 5 }
    ],
    "outputItems": [{ "type": "flour", "quantity": 15 }],
    "processingTimeMinutes": 30,
    "xpGained": 10
  }
}
```

---

## 7. Contract Templates

```json
{
  "type": "contract",
  "id": "grain_delivery_easy",
  "name": "Grain Delivery",
  "description": "Deliver sorghum to the market.",
  "data": {
    "contractType": "DELIVERY",
    "difficulty": "EASY",
    "requirements": {
      "items": [{ "type": "sorghum", "quantity": 10, "qualityMin": "normal" }]
    },
    "rewards": {
      "currency": 200,
      "reputation": 20,
      "xp": 30
    },
    "deadlineHours": 48,
    "refreshIntervalHours": 24
  }
}
```

---

## 8. NPC Definitions

```json
{
  "type": "npc",
  "id": "elder_neo",
  "name": "Elder Neo",
  "role": "Community Leader",
  "data": {
    "personality": "wise",
    "greeting": "Welcome, young farmer. The community needs your help.",
    "spriteSheet": "npc_elder_neo.png",
    "animations": {
      "idle": { "frames": 4, "frameRate": 2 },
      "talking": { "frames": 2, "frameRate": 3 }
    },
    "reputationTiers": {
      "stranger": { "min": -100, "max": -1 },
      "acquaintance": { "min": 0, "max": 24 },
      "friend": { "min": 25, "max": 49 },
      "trusted": { "min": 50, "max": 74 },
      "respected": { "min": 75, "max": 100 }
    }
  }
}
```

---

## 9. Achievement Definitions

```json
{
  "type": "achievement",
  "id": "first_harvest",
  "name": "First Harvest",
  "description": "Harvest your first crop.",
  "data": {
    "condition": {
      "type": "counter",
      "event": "crop_harvested",
      "target": 1
    },
    "reward": {
      "currency": 25,
      "xp": 10
    },
    "sprite": "achievement_first_harvest.png"
  }
}
```

---

## 10. Content Loading

### Loading Strategy

1. **Boot:** Load critical config (game.json, economy.json)
2. **Preload:** Load all content definitions
3. **Runtime:** Content available via content service

### Content Service

```typescript
class ContentService {
  private crops: Map<string, CropDefinition>;
  private animals: Map<string, AnimalDefinition>;
  private buildings: Map<string, BuildingDefinition>;
  // ...

  getCrop(id: string): CropDefinition {
    return this.crops.get(id);
  }

  getUnlockedCrops(level: number): CropDefinition[] {
    return Array.from(this.crops.values()).filter((c) => c.unlockLevel <= level);
  }
}
```
