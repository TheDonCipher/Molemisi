# Document 19: Analytics and Product Metrics Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-02

---

## 1. Engagement Metrics

**NFR-ANA-001**

### Core Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| DAU | Unique players active in 24h | 100+ (launch) |
| WAU | Unique players active in 7d | 300+ |
| MAU | Unique players active in 30d | 1000+ |
| Retention D1 | % return after 1 day | 40% |
| Retention D7 | % return after 7 days | 20% |
| Retention D30 | % return after 30 days | 10% |
| Session Duration | Average session length | 5 min |
| Sessions/Player | Sessions per day | 3 |

### Tracking Events

```typescript
analytics.track('session_started', {
  userId,
  platform, // 'web' | 'mobile'
  device, // 'desktop' | 'tablet' | 'mobile'
});

analytics.track('session_ended', {
  userId,
  duration, // seconds
  actions, // number of actions performed
});
```

---

## 2. Gameplay Metrics

**NFR-ANA-002**

### Feature Usage

| Event | Properties |
|-------|------------|
| crop_planted | cropType, plotIndex, farmLevel |
| crop_watered | cropType, hydration |
| crop_harvested | cropType, yield, quality, farmLevel |
| crop_withered | cropType, hoursSinceWater |
| livestock_fed | animalType, hunger |
| livestock_product | animalType, productType |
| building_constructed | buildingType, farmLevel |
| building_upgraded | buildingType, level |
| contract_accepted | contractType, difficulty |
| contract_completed | contractType, reward |
| kgotla_interaction | npcId, actionType |
| bushveld_explored | zone, resourcesFound |

### Conversion Funnels

**New Player Funnel:**
1. Register → 100%
2. Complete onboarding → 80%
3. Plant first crop → 70%
4. Harvest first crop → 60%
5. Sell at market → 40%
6. Return next day → 30%

---

## 3. Economy Metrics

**NFR-ANA-003**

### Economy Health

| Metric | Definition | Healthy Range |
|--------|-----------|---------------|
| Currency Supply | Total P in circulation | 100K-1M |
| Currency Velocity | Times currency changes hands/day | 2-5x |
| Inflation Rate | Price increase over 30 days | < 10% |
| Avg Farm Wealth | Average currency per farm | 500-5000 P |
| Gini Coefficient | Wealth inequality | < 0.5 |

### Transaction Tracking

```typescript
analytics.track('market_sale', {
  userId,
  itemType,
  quantity,
  pricePerUnit,
  totalPrice,
  farmLevel,
});

analytics.track('market_purchase', {
  userId,
  itemType,
  quantity,
  pricePerUnit,
  totalPrice,
  farmLevel,
});
```

---

## 4. Monetization Metrics

**NFR-ANA-004**

### Conversion Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Conversion Rate | % who make purchase | 2% |
| ARPU | Average revenue per user | $0.50 |
| ARPPU | Revenue per paying user | $5.00 |
| LTV | Lifetime value | $2.00 |
| Repeat Purchase Rate | % who buy again | 30% |

### Payment Tracking

```typescript
analytics.track('payment_started', {
  userId,
  provider,
  amount,
  currency,
  items,
});

analytics.track('payment_completed', {
  userId,
  provider,
  amount,
  currency,
  items,
  paymentId,
});

analytics.track('payment_failed', {
  userId,
  provider,
  amount,
  reason,
});
```

---

## 5. Dashboards

### Product Dashboard (PostHog)

- DAU/WAU/MAU trends
- Retention curves
- Feature adoption rates
- Funnel conversion
- Session recordings

### Economy Dashboard

- Currency supply over time
- Transaction volume
- Price trends
- Resource availability
- Inflation indicators

### Revenue Dashboard

- Daily revenue
- Conversion rates
- ARPU/ARPPU
- Payment success rates
- Refund rates
