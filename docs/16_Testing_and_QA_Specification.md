# Document 16: Testing and QA Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-02

---

## 1. Testing Strategy

**NFR-TST-001**

### Testing Pyramid

```
        ┌───────────┐
        │   E2E     │  5% of tests
        │  (Playwright) │
        ├───────────┤
        │Integration│  15% of tests
        │  (Supertest) │
        ├───────────┤
        │   Unit    │  80% of tests
        │  (Jest)   │
        └───────────┘
```

### Testing Tools

| Type | Tool | Purpose |
|------|------|---------|
| Unit | Jest | Individual function testing |
| Integration | Supertest | API endpoint testing |
| Database | Jest + Supabase | Schema and query testing |
| E2E | Playwright | Full user flow testing |
| Visual | Percy | Visual regression |
| Performance | k6 | Load testing |

---

## 2. Unit Tests

**NFR-TST-002**

### Test Coverage Targets

| Module | Target | Minimum |
|--------|--------|---------|
| Game Simulation | 95% | 90% |
| Economy | 95% | 90% |
| Crop Logic | 90% | 85% |
| Livestock Logic | 90% | 85% |
| Building Logic | 85% | 80% |
| Market Logic | 90% | 85% |
| Payment Logic | 95% | 90% |
| API Controllers | 80% | 75% |

### Example Unit Tests

```typescript
describe('Crop Simulation', () => {
  it('should advance growth stage when fully watered', () => {
    const crop = createTestCrop({ hydration: 1.0, growthStage: 0 });
    const result = simulateCrop(crop, 4); // 4 hours
    expect(result.growthStage).toBe(1);
  });

  it('should not advance growth when dry', () => {
    const crop = createTestCrop({ hydration: 0.0, growthStage: 0 });
    const result = simulateCrop(crop, 4);
    expect(result.growthStage).toBe(0);
  });

  it('should wither after 6 hours dry', () => {
    const crop = createTestCrop({ hydration: 0.0, growthStage: 1 });
    const result = simulateCrop(crop, 7);
    expect(result.state).toBe('WITHERED');
  });
});
```

---

## 3. Integration Tests

**NFR-TST-003**

### API Endpoint Tests

```typescript
describe('POST /farms/:farmId/plots/:plotId/plant', () => {
  it('should plant a crop successfully', async () => {
    const response = await request(app)
      .post(`/farms/${farmId}/plots/${plotId}/plant`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cropType: 'sorghum', seedId: 'seed_001' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.plot.state).toBe('PLANTED');
  });

  it('should reject planting on occupied plot', async () => {
    // First plant
    await plantCrop(farmId, plotId, 'sorghum');
    
    // Try to plant again
    const response = await request(app)
      .post(`/farms/${farmId}/plots/${plotId}/plant`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cropType: 'maize', seedId: 'seed_002' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PLOT_OCCUPIED');
  });
});
```

---

## 4. Database Tests

**NFR-TST-004**

```typescript
describe('Database Schema', () => {
  it('should enforce foreign key constraints', async () => {
    await expect(
      db.query('INSERT INTO farm_plots (farm_id, slot_index) VALUES ($1, 0)', ['nonexistent'])
    ).rejects.toThrow();
  });

  it('should enforce unique farm per user', async () => {
    await db.query('INSERT INTO farms (user_id, name) VALUES ($1, 'Farm 1')', [userId]);
    await expect(
      db.query('INSERT INTO farms (user_id, name) VALUES ($1, 'Farm 2')', [userId])
    ).rejects.toThrow();
  });
});
```

---

## 5. Simulation Tests

**NFR-TST-005**

```typescript
describe('Farm Simulation', () => {
  it('should simulate 24 hours offline correctly', async () => {
    const farm = await createTestFarm();
    await plantCrops(farm.id, ['sorghum', 'maize']);
    await feedAnimals(farm.id, ['chicken']);

    const result = await simulateFarm(farm.id, 24);

    expect(result.crops).toHaveLength(2);
    expect(result.livestock).toHaveLength(1);
    expect(result.weather).toBeDefined();
  });
});
```

---

## 6. Economy Tests

**NFR-TST-006**

```typescript
describe('Economy Balance', () => {
  it('should maintain positive net flow for new players', () => {
    const result = simulateNewPlayer(7); // 7 days
    expect(result.currency).toBeGreaterThan(100); // Starting amount
  });

  it('should prevent currency duplication', async () => {
    const balance1 = await getCurrency(farmId);
    await performAction(farmId, 'sell', { itemType: 'sorghum', quantity: 5 });
    const balance2 = await getCurrency(farmId);
    
    expect(balance2).toBeGreaterThan(balance1);
    expect(balance2 - balance1).toBeLessThanOrEqual(100); // Reasonable amount
  });
});
```

---

## 7. E2E Tests

**NFR-TST-007**

```typescript
describe('New Player Flow', () => {
  it('should complete onboarding and plant first crop', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Start Farming")');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Register")');
    
    // Complete onboarding
    await page.click('text=Tap this plot');
    await page.click('text=Sorghum');
    await page.click('text=Water');
    
    // Verify crop is planted
    await expect(page.locator('.plot-0')).toHaveClass(/planted/);
  });
});
```

---

## 8. Performance Tests

**NFR-TST-008**

```javascript
// k6 load test
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '1m', target: 0 },    // Ramp down
  ],
};

export default function () {
  const res = http.get('http://localhost:3001/api/v1/farms/current', {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res, { 'status was 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Performance Targets

| Metric | Target |
|--------|--------|
| API response time (p95) | < 200ms |
| API response time (p99) | < 500ms |
| Database query time (p95) | < 50ms |
| Simulation time (per farm) | < 100ms |
| Concurrent users | 100+ |
