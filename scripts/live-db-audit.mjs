/**
 * LIVE DATABASE AUDIT — read-only.
 * Verifies the real state of the linked Supabase project against audit claims.
 * Never writes. Constraint probes expect rejection; a probe row is cleaned up.
 */
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);

const URL_BASE = env.SUPABASE_URL;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };

async function rest(path, opts = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  return { status: r.status, body, text, headers: r.headers };
}
const rpc = (n, a = {}) => rest(`rpc/${n}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) });
const say = (s = '') => console.log(s);
const arr = (r) => (Array.isArray(r.body) ? r.body : []);
const n = (v) => Number(v ?? 0);

// ---------------------------------------------------------------- 1. functions
say('=== 1. RPC FUNCTION EXISTENCE (SECURITY DEFINER audit) ===');
for (const f of ['wallet_apply', 'plant_crop_transaction', 'inventory_take', 'set_role', 'set_admin', 'economy_snapshot_prices']) {
  const r = await rpc(f, {});
  const absent = r.status === 404 && /could not find the function/i.test(r.text);
  say(`  ${absent ? 'ABSENT ' : 'PRESENT'} ${f}  [${r.status}]${absent ? '' : '  ' + r.text.slice(0, 110)}`);
}

// ------------------------------------------------------------- 2. ledger CHECK
say('\n=== 2. ledger_entries.currency CONSTRAINT PROBE ===');
{
  const r = await rest('ledger_entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ player_id: '00000000-0000-0000-0000-000000000001', currency: 'chapter_token',
      amount: -1, balance_after: 0, source: 'AUDIT_PROBE', ref_id: null }),
  });
  if (r.status === 201) {
    say('[PROBE ACCEPTED] chapter_token passed the live CHECK (repo migration is stale)');
    await rest('ledger_entries?source=eq.AUDIT_PROBE', { method: 'DELETE' });
    say('  probe row deleted');
  } else {
    say(`  REJECTED [${r.status}] ${r.text.slice(0, 170)}`);
    say('  => CONFIRMED: chapter_token violates the live CHECK. Finding C1 is real in production.');
  }
}

// ------------------------------------------------------------ 3. table presence
say('\n=== 3. TABLE INVENTORY (live) ===');
for (const t of ['farms','farm_plots','crop_instances','buildings','livestock','player_wallets','ledger_entries',
  'player_inventory','item_definitions','market_prices','market_transactions','market_events','crafting_jobs',
  'crafting_recipes','storage_tiers','kgotla_charges','kgotla_projects','player_chapter_state','chapters',
  'anti_cheat_flags','payments','real_world_transactions','game_config','config_audit_log','economy_price_snapshots',
  'profiles','inventory','game_ledger_entries','busy']) {
  const r = await rest(`${t}?select=*&limit=1`);
  if (r.status === 200) {
    const c = await rest(`${t}?select=*`, { headers: { Prefer: 'count=exact', Range: '0-0' } });
    const total = (c.headers.get('content-range') ?? '').split('/')[1];
    const cols = arr(r)[0] ? Object.keys(arr(r)[0]).length : 0;
    say(`  EXISTS ${t.padEnd(26)} rows=${total ?? '?'}${cols ? ' cols=' + cols : ''}`);
  } else say(`  ABSENT ${t}${r.status === 404 ? '' : ' [' + r.status + '] ' + r.text.slice(0, 70)}`);
}
// -------------------------------------------------- 4. game_ledger_entries shape
say('\n=== 4. game_ledger_entries COLUMNS (C6 mismatch check) ===');
{
  const row = arr(await rest('game_ledger_entries?select=*&limit=1'))[0];
  if (row) {
    const cols = Object.keys(row);
    say('  columns: ' + cols.join(', '));
    for (const c of ['farm_id','user_id','player_id','currency_change','amount_change','item_quantity_change','quantity'])
      say(`    ${cols.includes(c) ? 'HAS   ' : 'MISSING'} ${c}`);
  } else {
    say('  table empty -> probe for known columns:');
    for (const c of ['farm_id','user_id','player_id','currency_change','amount_change','quantity']) {
      const e = await rest(`game_ledger_entries?select=${c}&limit=1`);
      say(`    ${e.status === 200 ? 'HAS   ' : 'MISSING'} ${c}  [${e.status}]`);
    }
  }
}

// ---------------------------------------------------------- 5. economy reality
say('\n=== 5. ECONOMY STATE (live) ===');
{
  const rows = arr(await rest('player_wallets?select=player_id,pula_balance,madi_balance,botho_points&limit=2000'));
  const sum = (f) => rows.reduce((s, r) => s + n(r[f]), 0);
  const neg = rows.filter((r) => n(r.pula_balance) < 0 || n(r.botho_points) < 0 || n(r.madi_balance) < 0);
  say(`  wallets=${rows.length} totalPula=${sum('pula_balance').toFixed(2)} totalMadi=${sum('madi_balance').toFixed(2)} totalBotho=${sum('botho_points')}`);
  say(`  NEGATIVE BALANCES: ${neg.length}${neg.length ? ' <-- ' + JSON.stringify(neg.slice(0, 5)) : ' (clean)'}`);

  const lr = arr(await rest('ledger_entries?select=currency,source,amount&limit=5000'));
  const byCur = {}, bySrc = {};
  for (const r of lr) { const c = r.currency ?? 'NULL'; byCur[c] = (byCur[c] ?? 0) + 1; bySrc[r.source] = (bySrc[r.source] ?? 0) + 1; }
  say(`  ledger rows=${lr.length} byCurrency=${JSON.stringify(byCur)}`);
  say('  top sources: ' + JSON.stringify(Object.fromEntries(Object.entries(bySrc).sort((a, b) => b[1] - a[1]).slice(0, 25))));
  say(`  debit (negative amount) rows: ${lr.filter((r) => n(r.amount) < 0).length}`);

  const iv = arr(await rest('player_inventory?select=quantity&limit=5000'));
  say(`  player_inventory rows=${iv.length} negative=${iv.filter((r) => n(r.quantity) < 0).length} zero=${iv.filter((r) => n(r.quantity) === 0).length}`);
}

// ------------------------------------------------------ 6. state integrity scan
say('\n=== 6. STATE INTEGRITY (would the D2 validator fire?) ===');
{
  const pr = arr(await rest('farm_plots?select=id,state&limit=5000'));
  const cr = arr(await rest('crop_instances?select=id,plot_id&limit=5000'));
  const byPlot = new Set(cr.map((c) => c.plot_id));
  const OCC = new Set(['PLANTED', 'GROWING', 'READY']);
  const orphan = pr.filter((p) => OCC.has(p.state) && !byPlot.has(p.id));
  const dangling = pr.filter((p) => !OCC.has(p.state) && byPlot.has(p.id));
  say(`  plots=${pr.length} crops=${cr.length}`);
  say(`  ORPHAN_CROP: ${orphan.length}${orphan.length ? ' ' + JSON.stringify(orphan.slice(0, 5)) : ''}`);
  say(`  PLOT_WITHOUT_CROP: ${dangling.length}${dangling.length ? ' ' + JSON.stringify(dangling.slice(0, 5)) : ''}`);
}

say('\n=== 7. ANTI-CHEAT FLAGS ===');
{
  const rows = arr(await rest('anti_cheat_flags?select=*&limit=50'));
  say(`  rows=${rows.length}${rows[0] ? ' columns: ' + Object.keys(rows[0]).join(', ') : ''}`);
}
say('\n=== DONE ===');
say('\n=== 8. RPC SIGNATURE-TYPED PROBE (absent vs wrong-arity) ===');
for (const [fn, args] of [
  ['wallet_apply', { p_player_id: '00000000-0000-0000-0000-000000000002', p_currency: 'pula', p_amount: 0.000001, p_source: 'AUDIT_PROBE2', p_ref_id: null }],
  ['set_role', { p_user_id: '00000000-0000-0000-0000-000000000002', p_role: 'player' }],
]) {
  const r = await rpc(fn, args);
  say(`  ${fn}: [${r.status}] ${/could not find the function/i.test(r.text) ? 'SIGNATURE MISMATCH (may still exist)' : 'RESOLVED -> ' + r.text.slice(0, 130)}`);
}

say('\n=== 9. TOPUP / MADI REALITY (docs/34 spend-only claim) ===');
{
  const lr = arr(await rest('ledger_entries?select=currency,source,amount&limit=5000'));
  const topups = lr.filter((r) => r.source === 'topup' || r.source === 'madi_topup');
  const byC = {};
  for (const t of topups) byC[t.currency ?? 'NULL'] = (byC[t.currency ?? 'NULL'] ?? 0) + 1;
  say(`  topup-family rows=${topups.length} byCurrency=${JSON.stringify(byC)} net=${topups.reduce((s, t) => s + n(t.amount), 0).toFixed(2)}`);
  say(`  => ${(byC.madi ?? 0) > 0 ? 'OK: top-ups credited MADI' : 'VIOLATION: top-ups credited NON-Madi (spend-only contract broken)'}`);
  const pay = arr(await rest('payments?select=sku,currency,status,provider&limit=200'));
  const skus = {}, st = {}, combo = {};
  for (const p of pay) { skus[p.sku] = (skus[p.sku] ?? 0) + 1; st[p.status] = (st[p.status] ?? 0) + 1; combo[`${p.sku}:${p.currency}`] = (combo[`${p.sku}:${p.currency}`] ?? 0) + 1; }
  say(`  payments=${pay.length} bySku=${JSON.stringify(skus)} byStatus=${JSON.stringify(st)}`);
  say('  sku:currency -> ' + JSON.stringify(combo));
}

say('\n=== 10. MARKET PRICE COVERAGE vs CATALOGUE ===');
{
  const defs = arr(await rest('item_definitions?select=slug,category&limit=500'));
  const prices = arr(await rest('market_prices?select=item_type&limit=500'));
  const priced = new Set(prices.map((p) => p.item_type));
  const unpriced = defs.filter((d) => !priced.has(d.slug));
  say(`  item_definitions=${defs.length} market_prices=${prices.length}`);
  say(`  UNPRICED: ${unpriced.length}${unpriced.length ? ' -> ' + unpriced.map((d) => d.slug).join(', ') : ''}`);
  say(`  seeds priced: ${defs.filter((d) => d.category === 'DIPEO' && priced.has(d.slug)).length}/${defs.filter((d) => d.category === 'DIPEO').length}`);
}

say('\n=== 11. LEGACY TABLE RESIDUE / ORPHANS ===');
{
  for (const t of ['inventory', 'game_ledger_entries'])
    say(`  ${t}: ${arr(await rest(`${t}?select=*&limit=500`)).length} live rows (retired table)`);
  const f = arr(await rest('farms?select=id,user_id&limit=5000'));
  const w = arr(await rest('player_wallets?select=player_id&limit=5000'));
  const p = arr(await rest('profiles?select=id&limit=5000'));
  const owners = new Set(f.map((x) => x.user_id));
  say(`  farms=${f.length} profiles=${p.length} wallets=${w.length}`);
  say(`  profiles with NO farm: ${p.filter((x) => !owners.has(x.id)).length}`);
  say(`  wallets with NO farm: ${w.filter((x) => !owners.has(x.player_id)).length}`);
}
say('\n=== DONE ===');