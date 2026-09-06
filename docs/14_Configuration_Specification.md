# Document 14: Configuration Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target)
> Last Updated: 2026-09-02
> Implementation: 2026-09-06 — Copy `.env.example` to `.env.local`. Do not set `NODE_ENV`. Game values are TypeScript in `packages/game-config` plus table `game_config`, not `config/game.json`. Redis/Sentry/PostHog env vars are unused.

---

## 1. Environment Variables

**NFR-CFG-001**

### Required Variables

```bash
# Application
NODE_ENV=development|staging|production
PORT=3001
API_BASE_URL=http://localhost:3001

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=3600

# Payment Providers
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ORANGE_MONEY_API_KEY=...
MASCOM_API_KEY=...

# Analytics
POSTHOG_KEY=phc_...
POSTHOG_HOST=https://app.posthog.com

# Error Tracking
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=development

# Game Configuration
GAME_CONFIG_PATH=./config/game.json
ECONOMY_CONFIG_PATH=./config/economy.json
```

### Environment Files

```
.env.example          # Template (committed)
.env.local            # Local development (gitignored) — copy from .env.example
```

As-built: do not set `NODE_ENV` in env files. Redis, Sentry, PostHog, Stripe, and `GAME_CONFIG_PATH` JSON files are not used. Game config is `packages/game-config` plus the `game_config` table.

---

## 2. Game Configuration

**NFR-CFG-002**

### config/game.json

```json
{
  "version": "1.0.0",
  "simulation": {
    "maxOfflineHours": 24,
    "selfSustainingThresholdHours": 72,
    "tickIntervalMinutes": 5
  },
  "crops": {
    "sorghum": {
      "growthStages": 4,
      "timePerStage": 3,
      "waterDecayRate": 0.1,
      "diseaseChancePerStage": 0.05,
      "pestChancePerStage": 0.03,
      "yield": { "min": 3, "max": 5 },
      "seedCost": 5,
      "basePrice": 15,
      "unlockLevel": 1
    },
    "maize": {
      "growthStages": 5,
      "timePerStage": 4,
      "waterDecayRate": 0.15,
      "diseaseChancePerStage": 0.08,
      "pestChancePerStage": 0.06,
      "yield": { "min": 4, "max": 6 },
      "seedCost": 8,
      "basePrice": 20,
      "unlockLevel": 1
    }
  },
  "livestock": {
    "chicken": {
      "feedPerDay": 2,
      "productionCycleHours": 12,
      "productType": "egg",
      "productQuantity": 2,
      "basePrice": 5,
      "purchaseCost": 50,
      "unlockLevel": 1
    }
  },
  "buildings": {
    "well": {
      "baseCost": { "currency": 200, "stone": 10 },
      "constructionTime": 30,
      "capacity": -1,
      "wearPerHour": 0.005,
      "unlockLevel": 1
    }
  }
}
```

---

## 3. Economy Configuration

### config/economy.json

```json
{
  "currency": {
    "startingAmount": 100,
    "maxDisplay": 999999
  },
  "market": {
    "priceUpdateIntervalHours": 6,
    "minPriceMultiplier": 0.5,
    "maxPriceMultiplier": 2.0,
    "demandDecayRate": 0.1,
    "supplyDecayRate": 0.05
  },
  "weather": {
    "changeIntervalHours": 6,
    "seasons": {
      "spring": { "growthModifier": 1.1, "rainChance": 0.4 },
      "summer": { "growthModifier": 1.0, "rainChance": 0.15 },
      "autumn": { "growthModifier": 1.05, "rainChance": 0.3 },
      "winter": { "growthModifier": 0.8, "rainChance": 0.1 }
    }
  },
  "progression": {
    "levelFormula": "100 * (level ^ 1.5)",
    "dailyBonus": [10, 15, 20, 25, 30, 40, 50],
    "milestoneRewards": {
      "level5": 500,
      "level10": 2000
    }
  }
}
```

---

## 4. Feature Flags

**NFR-CFG-003**

```json
{
  "features": {
    "market_enabled": true,
    "kgotla_enabled": true,
    "bushveld_enabled": true,
    "payments_enabled": false,
    "season_pass_enabled": false,
    "pwa_notifications": true,
    "maintenance_mode": false
  }
}
```

### Feature Flag Rules

1. Flags are stored in database (admin-configurable)
2. Flags are cached in Redis (5-minute TTL)
3. Flags can be toggled without deployment
4. Default values in config file
