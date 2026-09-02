# Document 12: Observability Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-02

---

## 1. Logging

**NFR-OBS-001**

### Log Levels

| Level | Usage | Examples |
|-------|-------|---------|
| ERROR | System errors | Database failure, payment error |
| WARN | Unexpected but handled | Rate limit hit, retry needed |
| INFO | Normal operations | Player login, crop harvested |
| DEBUG | Development details | API request/response |

### Structured Logging

```typescript
logger.info('crop_harvested', {
  farmId,
  plotId,
  cropType,
  yield,
  quality,
  xpGained,
  timestamp: new Date().toISOString(),
});
```

### Log Events

| Event | Level | Properties |
|-------|-------|------------|
| server_start | INFO | port, environment |
| player_login | INFO | userId, method |
| player_logout | INFO | userId, duration |
| crop_planted | INFO | farmId, plotId, cropType |
| crop_watered | INFO | farmId, plotId |
| crop_harvested | INFO | farmId, plotId, yield, quality |
| livestock_fed | INFO | farmId, animalId |
| livestock_product | INFO | farmId, animalId, productType |
| building_constructed | INFO | farmId, buildingType |
| building_upgraded | INFO | farmId, buildingType, level |
| market_sale | INFO | farmId, itemType, quantity, price |
| market_purchase | INFO | farmId, itemType, quantity, price |
| contract_accepted | INFO | farmId, contractId |
| contract_completed | INFO | farmId, contractId, reward |
| payment_started | INFO | farmId, provider, amount |
| payment_completed | INFO | farmId, paymentId, amount |
| payment_failed | INFO | farmId, paymentId, reason |
| simulation_run | INFO | farmId, elapsed, result |
| error_occurred | ERROR | error, stack, context |

---

## 2. Metrics

**NFR-OBS-002**

### Application Metrics

| Metric | Type | Description |
|--------|------|-------------|
| http_requests_total | Counter | Total HTTP requests |
| http_request_duration | Histogram | Request duration |
| game_actions_total | Counter | Total game actions |
| active_sessions | Gauge | Active user sessions |
| simulation_duration | Histogram | Simulation execution time |
| payment_transactions | Counter | Payment attempts |
| database_query_duration | Histogram | DB query time |

### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| dau | Gauge | Daily active users |
| crops_planted_daily | Counter | Crops planted today |
| crops_harvested_daily | Counter | Crops harvested today |
| market_volume | Counter | Market transactions |
| currency_circulating | Gauge | Total currency in economy |

---

## 3. Analytics Events

**NFR-OBS-003**

### Event Schema

```typescript
interface AnalyticsEvent {
  event: string;
  userId?: string;
  properties: Record<string, any>;
  timestamp: string;
  sessionId: string;
}
```

### Tracked Events

| Event | Properties |
|-------|------------|
| game_started | platform, device |
| farm_loaded | farmLevel, plotCount |
| crop_planted | cropType, plotIndex |
| crop_watered | cropType, hydration |
| crop_harvested | cropType, yield, quality |
| livestock_fed | animalType |
| item_sold | itemType, quantity, price |
| item_bought | itemType, quantity, price |
| building_constructed | buildingType |
| building_upgraded | buildingType, level |
| contract_accepted | contractType, difficulty |
| contract_completed | contractType, reward |
| kgotla_opened | npcId |
| bushveld_explored | zone, resources |
| payment_started | provider, amount |
| payment_completed | provider, amount |
| payment_failed | provider, reason |
| session_ended | duration, actions |

---

## 4. Dashboards

### Operational Dashboard

- Server health (CPU, memory, connections)
- API response times
- Error rates
- Active sessions
- Database connections

### Business Dashboard

- DAU/WAU/MAU
- Retention curves
- Session duration
- Feature usage
- Economy health

### Economy Dashboard

- Currency supply
- Transaction volume
- Price trends
- Resource availability
- Inflation indicators
