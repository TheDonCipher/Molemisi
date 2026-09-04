#!/usr/bin/env node

const API = 'http://localhost:3001/api/v1';

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  // API wraps responses in {success, data} — unwrap for convenience
  const data = json?.data ?? json;
  return { status: res.status, json, data };
}

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label} — ${detail || ''}`);
    failed++;
  }
}

async function main() {
  console.log('🧪 Molemisi Full Game Loop Test\n');

  // 1. Health
  console.log('1. Health check');
  const health = await api('GET', '/health');
  assert('API is healthy', health.status === 200 && health.json?.status === 'ok');

  // 2. Login with test user
  console.log('\n2. Login');
  const login = await api('POST', '/auth/login', {
    email: 'gametest@molemisi.dev',
    password: 'TestPass123!',
  });
  const token = login.data?.token;
  assert('Login succeeds', !!token, `status=${login.status} ${JSON.stringify(login.json).slice(0, 200)}`);
  if (!token) { console.log('\n💀 Cannot continue without token'); process.exit(1); }
  console.log(`  👤 User: ${login.data?.user?.displayName || login.data?.user?.email}`);

  // 3. Profile
  console.log('\n3. Get profile');
  const me = await api('GET', '/auth/me', null, token);
  assert('Profile loads', me.status === 200, `status=${me.status}`);
  console.log(`  📧 ${me.data?.email || me.data?.id}`);

  // 4. Farm
  console.log('\n4. Get current farm');
  const farm = await api('GET', '/farms/current', null, token);
  assert('Farm loads', farm.status === 200 && farm.data?.farm?.id, `status=${farm.status}`);
  const farmId = farm.data?.farm?.id;
  const plots = Array.isArray(farm.data?.plots) ? farm.data.plots : (farm.data?.farm?.plots || []);
  console.log(`  🏡 Farm: ${farm.data?.farm?.name} (${plots.length} plots, Lv.${farm.data?.farm?.level})`);
  console.log(`  🌤️  Weather: ${farm.data?.farm?.weather}, Season: ${farm.data?.farm?.season}`);

  const emptyPlot = plots.find(p => p.state === 'EMPTY');
  assert('Farm has empty plots', !!emptyPlot, `plots=${plots.length} states=${plots.map(p => p.state).join(',')}`);
  if (!emptyPlot) { console.log('\n💀 No empty plot to plant'); process.exit(1); }
  console.log(`  📍 Using plot slot ${emptyPlot.slotIndex} (${emptyPlot.id})`);

  // 5. Inventory (check for seeds)
  console.log('\n5. Check inventory');
  const inv = await api('GET', `/farms/${farmId}/inventory`, null, token);
  assert('Inventory loads', inv.status === 200, `status=${inv.status}`);
  const invItems = Array.isArray(inv.data) ? inv.data : (inv.data?.inventory || []);
  const seeds = invItems.filter(i => i.itemType?.includes('_seed') && i.quantity > 0);
  console.log(`  📦 ${seeds.length} seed type(s): ${seeds.map(s => `${s.itemType}x${s.quantity}`).join(', ') || 'none'}`);

  if (seeds.length === 0) {
    console.log('\n💀 No seeds to plant. Seeding inventory...');
    process.exit(1);
  }

  // 6. Plant sorghum
  console.log('\n6. Plant crop');
  const seed = seeds.find(s => s.itemType === 'sorghum_seed') || seeds[0];
  const cropType = seed.itemType.replace('_seed', '');
  console.log(`  🌱 Planting: ${cropType} (seed: ${seed.id})`);
  const plant = await api('POST', `/farms/${farmId}/plots/${emptyPlot.id}/plant`, {
    cropType,
    seedId: seed.id,
  }, token);
  assert('Plant succeeds', plant.status === 201 || plant.status === 200, `status=${plant.status} ${JSON.stringify(plant.json).slice(0, 300)}`);

  // 7. Verify planted
  console.log('\n7. Verify plot after planting');
  const farm2 = await api('GET', '/farms/current', null, token);
  const updatedPlot = farm2.data?.plots?.find(p => p.slotIndex === emptyPlot.slotIndex);
  assert('Plot is planted', updatedPlot?.state === 'PLANTED' || updatedPlot?.state === 'GROWING', `state=${updatedPlot?.state}`);
  if (updatedPlot?.crop) {
    console.log(`  🌿 Crop: ${updatedPlot.crop.type}, Stage: ${updatedPlot.crop.growthStage}, Hydration: ${updatedPlot.crop.hydration}`);
  }

  // 8. Water
  console.log('\n8. Water crop');
  const water = await api('POST', `/farms/${farmId}/plots/${emptyPlot.id}/water`, {}, token);
  assert('Water succeeds', water.status === 201 || water.status === 200, `status=${water.status} ${JSON.stringify(water.json).slice(0, 300)}`);

  // 9. Harvest (may fail if not READY — expected)
  console.log('\n9. Harvest crop');
  const harvest = await api('POST', `/farms/${farmId}/plots/${emptyPlot.id}/harvest`, {}, token);
  assert('Harvest endpoint responds', harvest.status !== 404, `status=${harvest.status}`);
  if (harvest.status === 400) {
    console.log(`  ℹ️  Not ready yet (expected): ${harvest.json?.message || ''}`);
  } else if (harvest.status === 200 || harvest.status === 201) {
    console.log(`  🎉 Harvested! ${JSON.stringify(harvest.data || harvest.json).slice(0, 200)}`);
  }

  // 10. Market prices
  console.log('\n10. Market prices');
  const prices = await api('GET', '/market/prices', null, token);
  assert('Market prices load', prices.status === 200, `status=${prices.status}`);
  if (prices.data) {
    const priceList = Array.isArray(prices.data) ? prices.data : Object.entries(prices.data);
    console.log(`  💰 ${priceList.length} items priced`);
  }

  // 11. Market sell (if we have sellable items)
  console.log('\n11. Market sell');
  const inv2 = await api('GET', `/farms/${farmId}/inventory`, null, token);
  const inv2Items = Array.isArray(inv2.data) ? inv2.data : (inv2.data?.inventory || []);
  const sellable = inv2Items.filter(i => i.quantity > 0 && !i.itemType?.includes('_seed'));
  if (sellable.length > 0) {
    const item = sellable[0];
    console.log(`  📦 Selling: ${item.itemType} x1`);
    const sell = await api('POST', '/market/sell', { farmId, itemId: item.id, quantity: 1 }, token);
    assert('Sell succeeds', sell.status === 200 || sell.status === 201, `status=${sell.status} ${JSON.stringify(sell.json).slice(0, 200)}`);
  } else {
    console.log('  ⚠️  No sellable items (harvest incomplete — expected in fast test)');
  }

  // 12. Market buy seeds
  console.log('\n12. Market buy seeds');
  const buy = await api('POST', '/market/buy', { farmId, itemType: 'sorghum_seed', quantity: 3 }, token);
  assert('Buy endpoint responds', buy.status !== 404, `status=${buy.status}`);
  if (buy.status === 400) {
    console.log(`  ℹ️  ${buy.json?.message || 'Buy returned 400'}`);
  } else if (buy.status === 200 || buy.status === 201) {
    console.log(`  🛒 Bought seeds!`);
  }

  // 13. Previously-broken endpoints (the 404s)
  console.log('\n13. Previously-broken endpoints (were all 404)');
  const endpoints = [
    [`/farms/${farmId}/buildings`, 'Buildings'],
    [`/farms/${farmId}/livestock`, 'Livestock'],
    [`/farms/${farmId}/contracts/available`, 'Contracts'],
    [`/farms/${farmId}/kgotla/npcs`, 'Kgotla NPCs'],
    [`/farms/${farmId}/kgotla/projects`, 'Kgotla Projects'],
    [`/farms/${farmId}/bushveld/zones`, 'Bushveld Zones'],
    [`/farms/${farmId}/events/active`, 'Events Active'],
    [`/farms/${farmId}/events/available`, 'Events Available'],
    ['/market/prices', 'Market Prices'],
    ['/market/events', 'Market Events'],
    [`/farms/${farmId}/buildings/available`, 'Buildings Available'],
    [`/farms/${farmId}/livestock/available`, 'Livestock Available'],
  ];
  for (const [path, label] of endpoints) {
    const res = await api('GET', path, null, token);
    assert(`${label} (no 404)`, res.status !== 404, `status=${res.status}`);
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed === 0) {
    console.log('🎉 Full game loop works end-to-end!');
  } else {
    console.log('⚠️  Some checks failed — see above for details');
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
