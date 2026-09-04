# Document 08: API Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-02

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication](#2-authentication)
3. [Common Patterns](#3-common-patterns)
4. [Authentication Endpoints](#4-authentication-endpoints)
5. [Profile Endpoints](#5-profile-endpoints)
6. [Farm Endpoints](#6-farm-endpoints)
7. [Field/Plot Endpoints](#7-fieldplot-endpoints)
8. [Crop Endpoints](#8-crop-endpoints)
9. [Livestock Endpoints](#9-livestock-endpoints)
10. [Building Endpoints](#10-building-endpoints)
11. [Inventory Endpoints](#11-inventory-endpoints)
12. [Production Endpoints](#12-production-endpoints)
13. [Market Endpoints](#13-market-endpoints)
14. [Contract Endpoints](#14-contract-endpoints)
15. [Kgotla Endpoints](#15-kgotla-endpoints)
16. [Bushveld Endpoints](#16-bushveld-endpoints)
17. [Progression Endpoints](#17-progression-endpoints)
18. [Notification Endpoints](#18-notification-endpoints)
19. [Payment Endpoints](#19-payment-endpoints)
20. [Admin Endpoints](#20-admin-endpoints)

---

## 1. API Overview

**NFR-API-001**

### Base URL

```
Development: http://localhost:3001/api/v1
Staging:     https://api-staging.molemisi.com/api/v1
Production:  https://api.molemisi.com/api/v1
```

### API Version

Current version: `v1`

Version is included in the URL path. Breaking changes require a new version.

### Content Types

- Request: `application/json`
- Response: `application/json`
- File uploads: `multipart/form-data`

### Rate Limits

| Scope                 | Limit        | Window   |
| --------------------- | ------------ | -------- |
| Global per IP         | 100 requests | 1 minute |
| Per endpoint per user | 30 requests  | 1 minute |
| Auth endpoints        | 10 requests  | 1 minute |
| Payment endpoints     | 5 requests   | 1 minute |

### Pagination

For list endpoints:

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

Query parameters: `?page=1&limit=20`

---

## 2. Authentication

**NFR-API-002**

### JWT Authentication

All authenticated endpoints require a Bearer token:

```
Authorization: Bearer <jwt_token>
```

### Token Lifecycle

1. Player registers/logs in via Supabase Auth
2. Supabase returns JWT access token
3. Client includes token in API requests
4. API validates token with Supabase
5. Token expires after 1 hour
6. Client refreshes token via Supabase

### Service Role

Server-to-server communication uses the Supabase service role key:

```
apikey: <supabase_service_role_key>
```

---

## 3. Common Patterns

**NFR-API-003**

### Response Format

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "serverTime": "2026-09-02T10:00:00Z",
    "farmVersion": 42
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Not enough Pula. Required: 50, Available: 30",
    "details": {
      "required": 50,
      "available": 30,
      "shortfall": 20
    }
  }
}
```

### Error Codes

| Code                 | HTTP Status | Description                   |
| -------------------- | ----------- | ----------------------------- |
| UNAUTHORIZED         | 401         | Invalid or missing auth token |
| FORBIDDEN            | 403         | Insufficient permissions      |
| NOT_FOUND            | 404         | Resource not found            |
| VALIDATION_ERROR     | 400         | Invalid request data          |
| INSUFFICIENT_FUNDS   | 400         | Not enough currency           |
| INVENTORY_FULL       | 400         | Inventory at capacity         |
| PLOT_OCCUPIED        | 400         | Plot already has a crop       |
| CROP_NOT_READY       | 400         | Crop not ready for harvest    |
| BUILDING_UNAVAILABLE | 400         | Building not operational      |
| ANIMAL_SICK          | 400         | Animal needs treatment        |
| CONTRACT_EXPIRED     | 400         | Contract deadline passed      |
| RATE_LIMITED         | 429         | Too many requests             |
| SERVER_ERROR         | 500         | Internal server error         |

### Idempotency

For state-changing operations, clients can send an `Idempotency-Key` header:

```
Idempotency-Key: <uuid>
```

The server stores the response for 24 hours and returns the same response for duplicate requests.

---

## 4. Authentication Endpoints

### POST /auth/register

Register a new player.

**Request:**

```json
{
  "email": "player@example.com",
  "password": "securepassword123",
  "displayName": "Farmer John"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "player@example.com",
      "displayName": "Farmer John"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Side effects:**

- Creates Supabase Auth user
- Creates profile record
- Creates farm record with default plots
- Creates initial inventory
- Grants starting currency (100 P)

### POST /auth/login

Login existing player.

**Request:**

```json
{
  "email": "player@example.com",
  "password": "securepassword123"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "player@example.com",
      "displayName": "Farmer John"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### POST /auth/refresh

Refresh JWT token.

**Request:**

```json
{
  "refreshToken": "refresh_token"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "refreshToken": "new_refresh_token"
  }
}
```

### POST /auth/logout

Logout current session.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true
}
```

---

## 5. Profile Endpoints

### GET /profile

Get current player profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "displayName": "Farmer John",
    "avatarUrl": null,
    "farmName": "Sunny Acres",
    "farmLevel": 5,
    "farmXp": 1850,
    "farmingSkill": 3,
    "farmingSkillXp": 250,
    "husbandrySkill": 2,
    "husbandrySkillXp": 150,
    "tradingSkill": 2,
    "tradingSkillXp": 120,
    "currency": 1250,
    "energy": 85,
    "maxEnergy": 100,
    "lastActiveAt": "2026-09-02T10:00:00Z"
  }
}
```

### PATCH /profile

Update player profile.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "displayName": "Master Farmer",
  "farmName": "Golden Fields"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "displayName": "Master Farmer",
    "farmName": "Golden Fields"
  }
}
```

---

## 6. Farm Endpoints

### GET /farms/current

Get current farm state.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "farm": {
      "id": "uuid",
      "name": "Sunny Acres",
      "level": 5,
      "xp": 1850,
      "plotCount": 12,
      "maxPlots": 20,
      "weather": "clear",
      "season": "spring",
      "seasonDay": 14,
      "serverTime": "2026-09-02T10:00:00Z"
    },
    "plots": [...],
    "crops": [...],
    "buildings": [...],
    "livestock": [...]
  }
}
```

### POST /farms/sync

Sync farm state (called periodically by client).

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "lastSyncVersion": 42
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "farmVersion": 43,
    "changes": {
      "plots": [...],
      "crops": [...],
      "livestock": [...],
      "buildings": [...],
      "notifications": [...]
    }
  }
}
```

---

## 7. Field/Plot Endpoints

### GET /farms/{farmId}/plots

List all plots for a farm.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "plots": [
      {
        "id": "uuid",
        "slotIndex": 0,
        "state": "GROWING",
        "crop": {
          "id": "uuid",
          "type": "sorghum",
          "growthStage": 2,
          "maxStages": 4,
          "hydration": 0.7,
          "health": 0.9,
          "plantedAt": "2026-09-02T08:00:00Z",
          "expectedReadyAt": "2026-09-02T08:12:00Z"
        }
      },
      {
        "id": "uuid",
        "slotIndex": 1,
        "state": "EMPTY",
        "crop": null
      }
    ]
  }
}
```

---

## 8. Crop Endpoints

### POST /farms/{farmId}/plots/{plotId}/plant

Plant a crop on a plot.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "cropType": "sorghum",
  "seedId": "seed_sorghum_001"
}
```

**Server validates:**

1. Authenticated player
2. Farm ownership
3. Plot ownership
4. Plot is EMPTY
5. Player has required seed in inventory
6. Crop type is unlocked

**Response (201):**

```json
{
  "success": true,
  "data": {
    "plot": {
      "id": "uuid",
      "slotIndex": 0,
      "state": "PLANTED",
      "crop": {
        "id": "uuid",
        "type": "sorghum",
        "growthStage": 0,
        "maxStages": 4,
        "hydration": 0.5,
        "health": 1.0,
        "plantedAt": "2026-09-02T10:00:00Z",
        "expectedReadyAt": "2026-09-02T08:12:00Z"
      }
    },
    "inventoryDeduction": {
      "itemId": "seed_sorghum_001",
      "quantity": 1
    },
    "xpGained": 5
  }
}
```

**Side effects:**

- Removes 1 seed from inventory
- Creates crop instance
- Updates plot state
- Awards 5 XP
- Records ledger entry

**Idempotency:** Yes (same seedId + plotId = same result)

### POST /farms/{farmId}/plots/{plotId}/water

Water a crop on a plot.

**Headers:** `Authorization: Bearer <token>`

**Server validates:**

1. Authenticated player
2. Farm ownership
3. Plot ownership
4. Crop exists and is GROWING
5. Hydration < 1.0

**Response (200):**

```json
{
  "success": true,
  "data": {
    "plot": {
      "id": "uuid",
      "state": "GROWING",
      "crop": {
        "hydration": 0.8,
        "lastWateredAt": "2026-09-02T10:00:00Z"
      }
    },
    "waterUsed": 1,
    "xpGained": 2
  }
}
```

**Side effects:**

- Increases hydration by 0.3 (capped at 1.0)
- Consumes 1 water unit
- Awards 2 XP

### POST /farms/{farmId}/plots/{plotId}/fertilize

Fertilize a crop on a plot.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "fertilizerType": "compost"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "plot": {
      "crop": {
        "fertilizerActive": true,
        "fertilizerBonus": 0.1
      }
    },
    "inventoryDeduction": {
      "itemId": "fertilizer_compost",
      "quantity": 1
    }
  }
}
```

### POST /farms/{farmId}/plots/{plotId}/harvest

Harvest a crop from a plot.

**Headers:** `Authorization: Bearer <token>`

**Server validates:**

1. Authenticated player
2. Farm ownership
3. Plot ownership
4. Crop exists and is READY

**Response (200):**

```json
{
  "success": true,
  "data": {
    "plot": {
      "id": "uuid",
      "state": "EMPTY",
      "crop": null
    },
    "harvest": {
      "cropType": "sorghum",
      "yield": 4,
      "quality": "good",
      "qualityScore": 0.82,
      "xpGained": 10
    },
    "inventoryAddition": {
      "itemType": "sorghum",
      "quantity": 4,
      "quality": "good"
    }
  }
}
```

**Side effects:**

- Removes crop instance
- Updates plot state to EMPTY
- Adds harvested items to inventory
- Awards 10 XP
- Records ledger entry
- Checks for achievements

### POST /farms/{farmId}/plots/{plotId}/clear

Clear a withered crop from a plot.

**Headers:** `Authorization: Bearer <token>`

**Server validates:**

1. Authenticated player
2. Farm ownership
3. Plot ownership
4. Crop state is WITHERED

**Response (200):**

```json
{
  "success": true,
  "data": {
    "plot": {
      "id": "uuid",
      "state": "EMPTY",
      "crop": null
    }
  }
}
```

---

## 9. Livestock Endpoints

### GET /farms/{farmId}/livestock

List all animals on a farm.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "livestock": [
      {
        "id": "uuid",
        "animalType": "chicken",
        "name": "Clucky",
        "hunger": 0.7,
        "health": 0.9,
        "happiness": 0.8,
        "productReady": true,
        "isSick": false,
        "lastFedAt": "2026-09-02T06:00:00Z"
      }
    ]
  }
}
```

### POST /farms/{farmId}/livestock/buy

Buy a new animal.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "animalType": "chicken",
  "name": "Clucky"
}
```

**Server validates:**

1. Authenticated player
2. Farm ownership
3. Animal type is unlocked
4. Sufficient currency
5. Building capacity available

**Response (201):**

```json
{
  "success": true,
  "data": {
    "animal": {
      "id": "uuid",
      "animalType": "chicken",
      "name": "Clucky",
      "hunger": 0.8,
      "health": 1.0,
      "happiness": 0.7
    },
    "currencyDeduction": 50,
    "xpGained": 10
  }
}
```

### POST /farms/{farmId}/livestock/{animalId}/feed

Feed an animal.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "animal": {
      "hunger": 1.0,
      "lastFedAt": "2026-09-02T10:00:00Z"
    },
    "feedUsed": 2,
    "xpGained": 3
  }
}
```

### POST /farms/{farmId}/livestock/{animalId}/collect

Collect product from an animal.

**Headers:** `Authorization: Bearer <token>`

**Server validates:**

1. Authenticated player
2. Farm ownership
3. Animal ownership
4. Product is ready

**Response (200):**

```json
{
  "success": true,
  "data": {
    "animal": {
      "productReady": false,
      "productTimer": "2026-09-02T22:00:00Z"
    },
    "product": {
      "type": "egg",
      "quantity": 2,
      "quality": "normal"
    },
    "inventoryAddition": {
      "itemType": "egg",
      "quantity": 2,
      "quality": "normal"
    },
    "xpGained": 8
  }
}
```

### POST /farms/{farmId}/livestock/{animalId}/pet

Pet an animal to increase happiness.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "animal": {
      "happiness": 0.9,
      "lastPetAt": "2026-09-02T10:00:00Z"
    }
  }
}
```

### POST /farms/{farmId}/livestock/{animalId}/heal

Treat a sick animal.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "medicineType": "herbal_remedy"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "animal": {
      "isSick": false,
      "health": 0.5,
      "sickSince": null
    },
    "inventoryDeduction": {
      "itemId": "medicine_herbal_remedy",
      "quantity": 1
    }
  }
}
```

---

## 10. Building Endpoints

### GET /farms/{farmId}/buildings

List all buildings on a farm.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "buildings": [
      {
        "id": "uuid",
        "buildingType": "coop",
        "level": 1,
        "state": "ACTIVE",
        "capacity": 10,
        "wear": 0.15,
        "lastMaintainedAt": "2026-09-01T10:00:00Z"
      }
    ]
  }
}
```

### POST /farms/{farmId}/buildings/construct

Construct a new building.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "buildingType": "coop"
}
```

**Server validates:**

1. Authenticated player
2. Farm ownership
3. Building type is unlocked
4. Sufficient resources
5. Building not already constructed (if unique)

**Response (201):**

```json
{
  "success": true,
  "data": {
    "building": {
      "id": "uuid",
      "buildingType": "coop",
      "level": 1,
      "state": "CONSTRUCTION",
      "capacity": 10,
      "constructionEndsAt": "2026-09-02T10:20:00Z"
    },
    "resourcesDeduction": {
      "currency": 150,
      "wood": 5
    },
    "xpGained": 25
  }
}
```

### POST /farms/{farmId}/buildings/{buildingId}/upgrade

Upgrade a building.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "building": {
      "level": 2,
      "capacity": 15,
      "state": "CONSTRUCTION",
      "constructionEndsAt": "2026-09-02T11:00:00Z"
    },
    "resourcesDeduction": {
      "currency": 300,
      "wood": 10
    },
    "xpGained": 50
  }
}
```

### POST /farms/{farmId}/buildings/{buildingId}/maintain

Repair a building.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "building": {
      "state": "ACTIVE",
      "wear": 0,
      "lastMaintainedAt": "2026-09-02T10:00:00Z"
    },
    "resourcesDeduction": {
      "currency": 37
    }
  }
}
```

---

## 11. Inventory Endpoints

### GET /farms/{farmId}/inventory

List all items in inventory.

**Headers:** `Authorization: Bearer <token>`

**Query:** `?category=seed`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "id": "uuid",
        "itemType": "sorghum_seed",
        "itemCategory": "seed",
        "quantity": 15,
        "quality": "normal"
      },
      {
        "id": "uuid",
        "itemType": "maize_seed",
        "itemCategory": "seed",
        "quantity": 8,
        "quality": "normal"
      }
    ],
    "totalSlots": 50,
    "usedSlots": 12
  }
}
```

---

## 12. Production Endpoints

### GET /farms/{farmId}/buildings/{buildingId}/production

List production jobs in a building.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "recipeType": "grain_to_flour",
        "progress": 0.65,
        "startedAt": "2026-09-02T09:30:00Z",
        "endsAt": "2026-09-02T10:00:00Z",
        "inputItems": [{ "type": "sorghum", "quantity": 5 }],
        "outputItems": [{ "type": "flour", "quantity": 15 }]
      }
    ],
    "queueLength": 1,
    "maxQueue": 5
  }
}
```

### POST /farms/{farmId}/buildings/{buildingId}/production/start

Start a production job.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "recipeType": "grain_to_flour",
  "inputItems": [{ "type": "sorghum", "quantity": 5 }]
}
```

**Server validates:**

1. Authenticated player
2. Farm ownership
3. Building is ACTIVE
4. Building type supports recipe
5. Player has required input items
6. Queue not full

**Response (201):**

```json
{
  "success": true,
  "data": {
    "job": {
      "id": "uuid",
      "recipeType": "grain_to_flour",
      "progress": 0,
      "startedAt": "2026-09-02T10:00:00Z",
      "endsAt": "2026-09-02T10:30:00Z"
    },
    "inventoryDeduction": {
      "sorghum": 5
    }
  }
}
```

### POST /farms/{farmId}/buildings/{buildingId}/production/{jobId}/collect

Collect completed production output.

**Headers:** `Authorization: Bearer <token>`

**Server validates:**

1. Authenticated player
2. Farm ownership
3. Job exists and is complete (progress = 1.0)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "inventoryAddition": {
      "flour": 15
    },
    "xpGained": 10
  }
}
```

---

## 13. Market Endpoints

### GET /market/prices

Get current market prices.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "prices": [
      {
        "itemType": "sorghum",
        "basePrice": 15,
        "currentPrice": 17,
        "trend": "up",
        "seasonModifier": 1.1
      },
      {
        "itemType": "maize",
        "basePrice": 20,
        "currentPrice": 18,
        "trend": "down",
        "seasonModifier": 0.9
      }
    ],
    "lastUpdated": "2026-09-02T06:00:00Z"
  }
}
```

### POST /market/sell

Sell items on the market.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "itemType": "sorghum",
  "quantity": 10,
  "quality": "normal"
}
```

**Server validates:**

1. Authenticated player
2. Farm ownership
3. Player has items in inventory
4. Quantity available

**Response (200):**

```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "uuid",
      "itemType": "sorghum",
      "quantity": 10,
      "pricePerUnit": 17,
      "totalPrice": 170
    },
    "currencyAdded": 170,
    "newCurrencyBalance": 1420,
    "xpGained": 5
  }
}
```

### POST /market/buy

Buy items from the market.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "itemType": "sorghum_seed",
  "quantity": 5
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "uuid",
      "itemType": "sorghum_seed",
      "quantity": 5,
      "pricePerUnit": 5,
      "totalPrice": 25
    },
    "currencyDeducted": 25,
    "newCurrencyBalance": 1395,
    "inventoryAddition": {
      "sorghum_seed": 5
    }
  }
}
```

---

## 14. Contract Endpoints

### GET /contracts

List available and active contracts.

**Headers:** `Authorization: Bearer <token>`

**Query:** `?status=available|active|completed`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": "uuid",
        "contractType": "DELIVERY",
        "difficulty": "MEDIUM",
        "title": "Grain Delivery",
        "description": "Deliver 10 Sorghum to the market",
        "requirements": {
          "items": [{ "type": "sorghum", "quantity": 10 }]
        },
        "rewards": {
          "currency": 200,
          "reputation": 30
        },
        "status": "available",
        "deadlineAt": "2026-09-04T10:00:00Z"
      }
    ]
  }
}
```

### POST /contracts/{contractId}/accept

Accept a contract.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "contract": {
      "id": "uuid",
      "status": "active",
      "acceptedAt": "2026-09-02T10:00:00Z",
      "progress": {
        "sorghum": { "required": 10, "delivered": 0 }
      }
    }
  }
}
```

### POST /contracts/{contractId}/deliver

Deliver items for a contract.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "items": [{ "type": "sorghum", "quantity": 5 }]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "contract": {
      "progress": {
        "sorghum": { "required": 10, "delivered": 5 }
      },
      "status": "active"
    },
    "inventoryDeduction": {
      "sorghum": 5
    }
  }
}
```

---

## 15. Kgotla Endpoints

### GET /kgotla/npcs

List Kgotla NPCs.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "npcs": [
      {
        "id": "elder_neo",
        "name": "Elder Neo",
        "role": "Community Leader",
        "reputation": 25,
        "reputationTier": "Friend",
        "hasQuest": true,
        "availableContracts": 2
      }
    ]
  }
}
```

### POST /kgotla/npcs/{npcId}/interact

Interact with an NPC.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "dialogue": {
      "text": "Welcome, farmer! The community needs your help.",
      "options": [
        { "id": "quest_1", "text": "Tell me more", "type": "quest" },
        { "id": "donate", "text": "I'd like to donate", "type": "donate" },
        { "id": "leave", "text": "Goodbye", "type": "leave" }
      ]
    }
  }
}
```

### POST /kgotla/donate

Donate to the Kgotla.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "npcId": "elder_neo",
  "items": [{ "type": "sorghum", "quantity": 10 }]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "reputationChange": 15,
    "newReputation": 40,
    "newTier": "Friend"
  }
}
```

---

## 16. Bushveld Endpoints

### GET /bushveld/zones

List available Bushveld zones.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": "near_bush",
        "name": "Near Bush",
        "difficulty": "Easy",
        "energyCost": 10,
        "availableResources": ["wood", "stone", "thatch"],
        "unlockLevel": 2
      }
    ]
  }
}
```

### POST /bushveld/explore

Explore a Bushveld zone.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "zoneId": "near_bush"
}
```

**Server validates:**

1. Authenticated player
2. Farm level requirement met
3. Sufficient energy

**Response (200):**

```json
{
  "success": true,
  "data": {
    "exploration": {
      "zone": "near_bush",
      "resourcesFound": [
        { "type": "wood", "quantity": 3 },
        { "type": "stone", "quantity": 1 }
      ],
      "discovery": null,
      "energyUsed": 10,
      "energyRemaining": 75
    }
  }
}
```

---

## 17. Progression Endpoints

### GET /progression/levels

Get level requirements and rewards.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "currentLevel": 5,
    "currentXp": 1850,
    "nextLevelXp": 3600,
    "xpToNextLevel": 1750,
    "unlocks": {
      "nextLevel": {
        "crops": ["watermelon"],
        "buildings": ["irrigation_system"],
        "animals": []
      }
    }
  }
}
```

### GET /progression/skills

Get skill tree status.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "skills": {
      "farming": {
        "level": 3,
        "xp": 250,
        "nextLevelXp": 350,
        "bonuses": ["+10% growth speed", "Unlock cowpeas"]
      },
      "husbandry": {
        "level": 2,
        "xp": 150,
        "nextLevelXp": 200,
        "bonuses": ["+5% feed efficiency", "Unlock goats"]
      },
      "trading": {
        "level": 2,
        "xp": 120,
        "nextLevelXp": 200,
        "bonuses": ["+5% sell price", "Unlock buy contracts"]
      }
    }
  }
}
```

---

## 18. Notification Endpoints

### GET /notifications

List player notifications.

**Headers:** `Authorization: Bearer <token>`

**Query:** `?unread=true`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "CROP_READY",
        "title": "Crop Ready!",
        "message": "Your Sorghum is ready to harvest",
        "data": { "plotId": "uuid", "cropType": "sorghum" },
        "read": false,
        "createdAt": "2026-09-02T08:00:00Z"
      }
    ],
    "unreadCount": 3
  }
}
```

### PATCH /notifications/{notificationId}/read

Mark a notification as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true
}
```

### POST /notifications/read-all

Mark all notifications as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "markedCount": 5
  }
}
```

---

## 19. Payment Endpoints

### POST /payments/create

Create a payment session.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "provider": "mobile_money",
  "items": [{ "type": "premium_currency_pack", "quantity": 1 }],
  "currency": "BWP",
  "amount": 50,
  "phoneNumber": "+267XXXXXXXX"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "status": "pending",
    "providerTransactionId": "mp_xxxxx",
    "instructions": "Dial *123# to complete payment"
  }
}
```

### POST /payments/{paymentId}/webhook

Payment provider webhook callback.

**Headers:** `X-Webhook-Signature: <hmac_signature>`

**Request:**

```json
{
  "transactionId": "mp_xxxxx",
  "status": "completed",
  "amount": 50,
  "currency": "BWP"
}
```

**Server validates:**

1. Webhook signature
2. Transaction ID matches
3. Amount matches
4. Payment not already processed

**Side effects:**

- Updates payment status to completed
- Grants entitlements to player
- Records ledger entry

### GET /payments/history

Get payment history.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "provider": "mobile_money",
        "amount": 50,
        "currency": "BWP",
        "status": "completed",
        "itemsPurchased": [{ "type": "premium_currency_pack", "quantity": 1 }],
        "createdAt": "2026-09-02T10:00:00Z"
      }
    ]
  }
}
```

---

## 20. Admin Endpoints

**NFR-API-004**

All admin endpoints require admin role authentication.

### GET /admin/players

List all players.

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "players": [
      {
        "id": "uuid",
        "email": "player@example.com",
        "displayName": "Farmer John",
        "farmLevel": 5,
        "currency": 1250,
        "lastActiveAt": "2026-09-02T10:00:00Z",
        "createdAt": "2026-08-15T10:00:00Z"
      }
    ],
    "total": 150
  }
}
```

### GET /admin/players/{playerId}

Get detailed player information.

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "profile": { ... },
    "farm": { ... },
    "plots": [...],
    "inventory": [...],
    "buildings": [...],
    "livestock": [...],
    "recentTransactions": [...],
    "statistics": { ... }
  }
}
```

### GET /admin/economy

Get economy overview.

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalPlayers": 150,
    "totalCurrency": 500000,
    "averageFarmWealth": 3333,
    "topPlayers": [...],
    "recentTransactions": [...],
    "priceHistory": [...]
  }
}
```

### POST /admin/config

Update game configuration.

**Headers:** `Authorization: Bearer <admin_token>`

**Request:**

```json
{
  "category": "economy",
  "key": "crop_sorghum_base_price",
  "value": 18
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "updated": true,
    "previousValue": 15,
    "newValue": 18
  }
}
```
