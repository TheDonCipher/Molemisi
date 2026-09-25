/**
 * Per-simulated-day player behaviour.
 *
 * Every action is a real HTTP call, and every one is recorded — success or
 * failure — because the reports are aggregations over that log. Nothing here
 * hardcodes an economic number: thresholds and costs are imported from
 * `@molemisi/game-config`.
 */

import {
  CHAPTERS,
  RECIPES,
  RECIPE_SLUGS,
  STARTING_PULA,
  BOTHO_THRESHOLDS,
  KGOTLA_DAILY_CONTRIBUTION_CAP,
  KGOTLA_DAILY_CHARGE_POOL,
  WATER,
  LAND_LADDER,
  type RecipeDef,
} from '@molemisi/game-config';
import { ApiClient } from './client';
import type { EventLog } from './events';
import type { Rng } from './rng';
import type { Player, ProfileName, System } from './types';

export interface DayContext {
  api: ApiClient;
  log: EventLog;
  rng: Rng;
  player: Player;
  day: number;
  realDate: string;
  month: number;
}

type Json = Record<string, unknown>;

function arr(v: unknown): Json[] {
  if (Array.isArray(v)) return v as Json[];
  if (v && typeof v === 'object') {
    const o = v as Json;
    for (const key of ['plots', 'items', 'jobs', 'scenes', 'hotspots', 'npcs', 'data', 'results']) {
      if (Array.isArray(o[key])) return o[key] as Json[];
    }
  }
  return [];
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function rec(v: unknown): Json {
  return v && typeof v === 'object' ? (v as Json) : {};
}

/** Seeds the current chapter stocks — planting out of season is not possible. */
export function chapterSeedsForMonth(month: number): string[] {
  const chapter = CHAPTERS.find((c) => c.months.includes(month)) ?? CHAPTERS[0]!;
  return [...chapter.seeds];
}

/** One simulated day for one player. */
export async function runPlayerDay(ctx: DayContext): Promise<void> {
  const { api, player, rng } = ctx;
  const farmId = player.farmId;
  if (!farmId || !player.token) return;

  await doWater(ctx);
  await doFarm(ctx);
  await doCrafting(ctx);
  await doLivestock(ctx);
  await doBushveld(ctx);
  await doMarket(ctx);
  await doKgotla(ctx);
  await doStorage(ctx);
  await doLand(ctx);
  await doProgression(ctx);

  if (isPayerProfile(player.profile)) {
    await doSpend(ctx);
  }

  // Idle actions keep the population from looking mechanised; they also exercise
  // the notification endpoints that real clients poll.
  if (rng.chance(0.3)) {
    await api.get('/notifications/unread-count', player.token);
  }
}

function isPayerProfile(p: ProfileName): boolean {
  return p === 'payer' || p === 'subscriber' || p === 'whale';
}

/* ------------------------------------------------------------------ Water */

async function doWater(ctx: DayContext): Promise<void> {
  const { api, player, rng } = ctx;
  const water = await api.get(`/farms/${player.farmId}/water`, player.token);
  const state = rec(water.data);
  const level = num(state['tankLevel'] ?? state['level'] ?? state['units'], -1);

  // Refill below a third of the tank. An empty tank HALTS growth — the central
  // tension the run must actually exercise, not skip past.
  const threshold = WATER.tankCapacity / 3;
  const unknown = level < 0;
  if (unknown || level < threshold) {
    if (!unknown && rng.chance(0.15)) {
      // Deliberately let it run dry sometimes: growth-halt events are a report metric.
      ctx.log.record({
        ...ev(ctx, 'water'),
        action: 'skip-refill',
        result: 'success',
        metadata: { tankLevel: level, note: 'allowed to run low on purpose' },
      });
      return;
    }
    const res = await api.post(`/farms/${player.farmId}/water/refill`, {}, player.token);
    ctx.log.record({
      ...ev(ctx, 'water'),
      action: 'refill',
      result: res.ok ? 'success' : 'rejected',
      metadata: { tankLevel: level, status: res.status, costPula: WATER.fullRefillPula },
    });
  }
}

/* ------------------------------------------------------------------- Farm */

async function doFarm(ctx: DayContext): Promise<void> {
  const { api, player, rng } = ctx;
  const plotsRes = await api.get(`/farms/${player.farmId}/plots`, player.token);
  const plots = arr(plotsRes.data);
  const seeds = chapterSeedsForMonth(ctx.month);

  for (const plot of plots) {
    const plotId = str(plot['id'] ?? plot['plotId']);
    if (!plotId) continue;

    if (isReady(plot)) {
      const res = await api.post(`/farms/${player.farmId}/plots/${plotId}/harvest`, {}, player.token);
      ctx.log.record({
        ...ev(ctx, 'farming'),
        action: 'harvest',
        result: res.ok ? 'success' : 'rejected',
        metadata: { plotId, status: res.status, crop: str(plot['cropType'] ?? plot['crop']) },
      });
      continue;
    }

    if (isEmpty(plot)) {
      const crop = rng.pick(seeds);
      const res = await api.post(
        `/farms/${player.farmId}/plots/${plotId}/plant`,
        { cropType: crop, seedId: `seed_${crop}_001` },
        player.token,
      );
      ctx.log.record({
        ...ev(ctx, 'farming'),
        action: 'plant',
        result: res.ok ? 'success' : 'rejected',
        metadata: { plotId, crop, status: res.status, month: ctx.month },
      });
    } else if (!isReady(plot) && rng.chance(0.2)) {
      // Fertilize only a standing (planted, not-yet-ready) crop. The Farm-screen
      // button that exposes this is still to ship, so a rejection here is expected
      // and the log records which — but the payload is now well-formed.
      const f = await api.post(
        `/farms/${player.farmId}/plots/${plotId}/fertilize`,
        { fertilizerType: 'manure' },
        player.token,
      );
      ctx.log.record({
        ...ev(ctx, 'farming'),
        action: 'fertilize',
        result: f.ok ? 'success' : 'rejected',
        metadata: { plotId, status: f.status },
      });
    }
  }
}

function isReady(plot: Json): boolean {
  const state = str(plot['state'] ?? plot['cropState'] ?? plot['status']).toLowerCase();
  if (state === 'ready' || state === 'ripe' || state === 'harvestable') return true;
  return num(plot['growthProgress'], 0) >= 1;
}

function isEmpty(plot: Json): boolean {
  const state = str(plot['state'] ?? plot['cropState'] ?? plot['status']).toLowerCase();
  if (state === 'empty' || state === 'fallow') return true;
  return !plot['cropType'] && !plot['crop'] && num(plot['growthProgress'], -1) < 0;
}

/* --------------------------------------------------------------- Crafting */

async function doCrafting(ctx: DayContext): Promise<void> {
  const { api, player, rng } = ctx;

  const jobs = await api.get(`/farms/${player.farmId}/crafting/jobs`, player.token);
  for (const job of arr(jobs.data)) {
    if (num(job['ready'], 0) === 1 || str(job['status']) === 'ready') {
      const jobId = str(job['id'] ?? job['jobId']);
      const res = await api.post(`/farms/${player.farmId}/crafting/${jobId}/collect`, {}, player.token);
      ctx.log.record({
        ...ev(ctx, 'crafting'),
        action: 'collect',
        result: res.ok ? 'success' : 'rejected',
        metadata: { jobId, recipe: str(job['recipeSlug'] ?? job['recipe_id']), status: res.status },
      });
    }
  }

  const recipes = await api.get(`/farms/${player.farmId}/crafting`, player.token);
  const unlocked = arr(recipes.data).filter((r) => num(r['locked'], 0) === 0 && str(r['slug']));
  for (const r of unlocked) {
    const slug = str(r['slug']);
    const def: RecipeDef | undefined = RECIPES[slug as RecipeDef['slug']];
    if (!def) continue;
    if (!rng.chance(0.5)) continue;
    const qty = rng.pick([1, 3, 6] as const);
    const res = await api.post(
      `/farms/${player.farmId}/crafting/start`,
      { recipeSlug: slug, qty },
      player.token,
    );
    ctx.log.record({
      ...ev(ctx, 'crafting'),
      action: 'start',
      result: res.ok ? 'success' : 'rejected',
      metadata: { recipe: slug, qty, status: res.status, durationMinutes: def.durationMinutes },
    });
  }
}

/* -------------------------------------------------------------- Livestock */

async function doLivestock(ctx: DayContext): Promise<void> {
  const { api, player, rng } = ctx;
  const list = await api.get(`/farms/${player.farmId}/livestock`, player.token);
  const animals = arr(list.data);

  for (const a of animals) {
    const id = str(a['id'] ?? a['animalId']);
    if (!id) continue;
    const collect = await api.post(`/farms/${player.farmId}/livestock/${id}/collect`, {}, player.token);
    ctx.log.record({
      ...ev(ctx, 'livestock'),
      action: 'collect',
      result: collect.ok ? 'success' : 'rejected',
      metadata: { animalId: id, type: str(a['animalType'] ?? a['type']), status: collect.status },
    });
    if (num(a['hunger'], 100) < 60) {
      await api.post(`/farms/${player.farmId}/livestock/${id}/feed`, {}, player.token);
      ctx.log.record({ ...ev(ctx, 'livestock'), action: 'feed', result: 'success', metadata: { animalId: id } });
    }
    if (rng.chance(0.2)) {
      await api.post(`/farms/${player.farmId}/livestock/${id}/pet`, {}, player.token);
    }
  }

  if (animals.length === 0 && rng.chance(0.25)) {
    const available = await api.get(`/farms/${player.farmId}/livestock/available`, player.token);
    const options = arr(available.data);
    if (options.length > 0) {
      const choice = rng.pick(options);
      const type = str(choice['id'] ?? choice['animalType'] ?? choice['type']);
      const res = await api.post(
        `/farms/${player.farmId}/livestock/purchase`,
        { animalType: type },
        player.token,
      );
      ctx.log.record({
        ...ev(ctx, 'livestock'),
        action: 'purchase',
        result: res.ok ? 'success' : 'rejected',
        metadata: { type, status: res.status },
      });
    }
  }
}

/* --------------------------------------------------------------- Bushveld */

async function doBushveld(ctx: DayContext): Promise<void> {
  const { api, player, rng } = ctx;
  const scenes = await api.get(`/farms/${player.farmId}/bushveld/scenes`, player.token);

  for (const scene of arr(scenes.data)) {
    const sceneId = str(scene['slug'] ?? scene['id']);
    if (!sceneId || num(scene['unlocked'], 1) === 0) {
      ctx.log.record({
        ...ev(ctx, 'bushveld'),
        action: 'scene-locked',
        result: 'rejected',
        metadata: { scene: sceneId },
      });
      continue;
    }
    const detail = await api.get(`/farms/${player.farmId}/bushveld/scenes/${sceneId}`, player.token);
    const body = rec(detail.data);
    const kagiso = num(body['kagiso'], 0);

    // Kagiso is the gate: rarity scales with it, so the log records the value at
    // collection time or the rarity report measures nothing.
    //
    // This gate sits OUTSIDE the hotspot loop deliberately. Inside it, an exhausted
    // pool logged one "rejected" event per hotspot per scene per player per day —
    // 192 of 309 events in the first live run. That is harness noise, not an API
    // refusal: the harness is declining to attempt, so it is recorded as a skip.
    if (kagiso < 2) {
      ctx.log.record({
        ...ev(ctx, 'bushveld'),
        action: 'skip-low-kagiso',
        result: 'success',
        metadata: { scene: sceneId, kagiso },
      });
      continue;
    }

    for (const hs of arr(body['hotspots'])) {
      const id = str(hs['id'] ?? hs['hotspotId']);
      if (!id) continue;
      if (!rng.chance(0.7)) continue;
      const res = await api.post(
        `/farms/${player.farmId}/bushveld/hotspots/${id}/collect`,
        {},
        player.token,
      );
      const loot = rec(res.data);
      ctx.log.record({
        ...ev(ctx, 'bushveld'),
        action: 'collect',
        result: res.ok ? 'success' : 'rejected',
        metadata: {
          scene: sceneId,
          hotspot: id,
          kagiso,
          month: ctx.month,
          item: str(loot['item'] ?? loot['itemType']),
          rarity: str(loot['rarity']),
          qty: num(loot['quantity'] ?? loot['qty']),
          status: res.status,
        },
      });
    }
  }
}

/* ----------------------------------------------------------------- Market */

async function doMarket(ctx: DayContext): Promise<void> {
  const { api, player, rng } = ctx;
  const inv = await api.get(`/farms/${player.farmId}/inventory`, player.token);
  const items = arr(inv.data);

  // Sell produce, never seeds (26 §11.1), and never everything — the point of
  // the market report is realistic volume, not maximal churn.
  for (const item of items) {
    const slug = str(item['itemSlug'] ?? item['itemType'] ?? item['slug']);
    const qty = num(item['quantity'] ?? item['qty'], 0);
    if (!slug || slug.endsWith('_seed') || qty < 2) continue;
    if (!rng.chance(0.5)) continue;
    const sellQty = Math.max(1, Math.floor(qty * 0.5));
    const quote = await api.get(`/market/quote?itemType=${encodeURIComponent(slug)}&quantity=${sellQty}`, player.token);
    const res = await api.post(
      '/market/sell',
      { farmId: player.farmId, itemType: slug, quantity: sellQty, quality: 'normal' },
      player.token,
    );
    ctx.log.record({
      ...ev(ctx, 'market'),
      action: 'sell',
      result: res.ok ? 'success' : 'rejected',
      metadata: {
        item: slug,
        quantity: sellQty,
        unitPrice: num(rec(quote.data)['pricePerUnit'] ?? rec(quote.data)['unitPrice']),
        gross: num(rec(res.data)['gross'] ?? rec(res.data)['totalPula']),
        tax: num(rec(res.data)['tax']),
        status: res.status,
      },
    });
  }

  // Buy seeds the Co-op actually stocks. `buyItem` looks the slug up in
  // `market_prices`; a slug absent there 400s, so we read the live price table and
  // pick a `_seed` row that is guaranteed to exist rather than guessing.
  if (rng.chance(0.6)) {
    const prices = await api.get('/market/prices', player.token);
    const seedSlugs = arr(prices.data)
      .map((p) => str(p['itemType']))
      .filter((s) => s.endsWith('_seed'));
    const pick = seedSlugs.length > 0 ? rng.pick(seedSlugs) : null;
    if (pick) {
      const res = await api.post(
        '/market/buy',
        { farmId: player.farmId, itemType: pick, quantity: 2 },
        player.token,
      );
      ctx.log.record({
        ...ev(ctx, 'market'),
        action: 'buy',
        result: res.ok ? 'success' : 'rejected',
        metadata: { item: pick, quantity: 2, status: res.status },
      });
    }
  }
}

/* ----------------------------------------------------------------- Kgotla */

async function doKgotla(ctx: DayContext): Promise<void> {
  const { api, player, rng } = ctx;

  // 1. Accept charges FIRST (spends pool slots). The loop is accept → objective
  //    (elsewhere / later) → turn-in, so turn-in can only succeed for a charge we
  //    have accepted. Note: `getNPCs` returns NpcView, which does NOT carry a
  //    `questAvailable` flag (that lives on `talkToNPC`), so we accept from the
  //    full NPC list and let the API enforce the per-day pool. Picking distinct
  //    elders avoids a self-inflicted "already served today" rejection.
  const attempts = KGOTLA_DAILY_CHARGE_POOL + 1;
  const accepted = new Set<string>();
  for (let i = 0; i < attempts; i++) {
    const npcs = await api.get(`/farms/${player.farmId}/kgotla/npcs`, player.token);
    const list = arr(npcs.data).filter((n) => !accepted.has(str(n['id'] ?? n['npcId'])));
    if (list.length === 0) break;
    const npc = rng.pick(list);
    const npcId = str(npc['id'] ?? npc['npcId']);
    const res = await api.post(`/farms/${player.farmId}/kgotla/npcs/${npcId}/accept`, {}, player.token);
    ctx.log.record({
      ...ev(ctx, 'kgotla'),
      action: 'accept',
      result: res.ok ? 'success' : 'rejected',
      metadata: { npcId, attempt: i + 1, status: res.status, pool: KGOTLA_DAILY_CHARGE_POOL },
    });
    if (!res.ok) break;
    accepted.add(npcId);
  }

  // 2. Donate to a community project. This also satisfies Elder Neo's "contribute"
  //    charge objective (measured from acceptance), so a later turn-in can pay out.
  if (rng.chance(0.4)) {
    const projects = await api.get(`/farms/${player.farmId}/kgotla/projects`, player.token);
    const list = arr(projects.data);
    if (list.length > 0) {
      const p = rng.pick(list);
      const amount = Math.min(25, KGOTLA_DAILY_CONTRIBUTION_CAP);
      const res = await api.post(
        `/farms/${player.farmId}/kgotla/projects/${str(p['id'] ?? p['projectId'])}/donate`,
        { amount },
        player.token,
      );
      ctx.log.record({
        ...ev(ctx, 'kgotla'),
        action: 'donate',
        result: res.ok ? 'success' : 'rejected',
        metadata: { project: str(p['id'] ?? p['projectId']), amount, status: res.status },
      });
    }
  }

  // 3. Turn in accepted charges. Most reject (objective unmet: errands need goods,
  //    Mama Naledi needs a co-op sale AFTER acceptance) — honest game state. Elder
  //    Neo's contribute charge can succeed when we donated above.
  const board = await api.get(`/farms/${player.farmId}/kgotla/charges`, player.token);
  for (const c of arr(rec(board.data)['charges'] ?? board.data)) {
    if (str(c['status']) !== 'active') continue;
    const npcId = str(c['npcId'] ?? c['npc_id'] ?? c['id']);
    if (!npcId) continue;
    const res = await api.post(`/farms/${player.farmId}/kgotla/npcs/${npcId}/turn-in`, {}, player.token);
    const obj = c['objective'] as Json | undefined;
    ctx.log.record({
      ...ev(ctx, 'kgotla'),
      action: 'turn-in',
      result: res.ok ? 'success' : 'rejected',
      metadata: { npcId, kind: str(c['kind'] ?? obj?.['kind']), status: res.status },
    });
  }

  if (rng.chance(0.15)) {
    const l = await api.get(`/farms/${player.farmId}/letsema`, player.token);
    if (num(rec(l.data)['eligible'], 0) === 1 || rec(l.data)['available'] === true) {
      const res = await api.post(`/farms/${player.farmId}/letsema`, {}, player.token);
      ctx.log.record({
        ...ev(ctx, 'kgotla'),
        action: 'letsema',
        result: res.ok ? 'success' : 'rejected',
        metadata: { status: res.status, bothoGate: BOTHO_THRESHOLDS.LETSEMA },
      });
    }
  }
}

/* ---------------------------------------------------------------- Storage */

async function doStorage(ctx: DayContext): Promise<void> {
  const { api, player } = ctx;
  const inv = await api.get(`/farms/${player.farmId}/inventory`, player.token);
  const body = rec(inv.data);
  const used = num(body['usedSlots'] ?? body['used'], 0);
  const cap = num(body['slotCap'] ?? body['capacity'], 0);
  if (cap > 0 && used / cap > 0.9) {
    const res = await api.post(`/farms/${player.farmId}/storage/upgrade`, {}, player.token);
    ctx.log.record({
      ...ev(ctx, 'storage'),
      action: 'upgrade',
      result: res.ok ? 'success' : 'rejected',
      metadata: { used, cap, status: res.status },
    });
  }
}

/* ------------------------------------------------------------------- Land */

async function doLand(ctx: DayContext): Promise<void> {
  const { api, player } = ctx;
  const farm = await api.get('/farms/current', player.token);
  const body = rec(farm.data);
  const plots = num(body['plotCount'] ?? body['plots'], 0);
  const pula = num(body['pula'], 0);

  const next = LAND_LADDER.find((t) => t.plots > plots);
  // Keep a buffer: buying land the player cannot then plant is a false signal.
  if (next?.costPula && pula > next.costPula + STARTING_PULA / 2) {
    const res = await api.post('/farms/current/plots/purchase', {}, player.token);
    ctx.log.record({
      ...ev(ctx, 'land'),
      action: 'purchase-plot',
      result: res.ok ? 'success' : 'rejected',
      metadata: { from: plots, target: next.plots, cost: next.costPula, status: res.status },
    });
  }
}

/* ------------------------------------------------------------- Progression */

async function doProgression(ctx: DayContext): Promise<void> {
  const { api, player, rng } = ctx;

  const available = await api.get(`/farms/${player.farmId}/contracts/available`, player.token);
  for (const c of arr(available.data)) {
    const id = str(c['id'] ?? c['contractId']);
    if (!id || !rng.chance(0.5)) continue;
    const res = await api.post(`/farms/${player.farmId}/contracts/accept`, { contractId: id }, player.token);
    ctx.log.record({
      ...ev(ctx, 'progression'),
      action: 'contract-accept',
      result: res.ok ? 'success' : 'rejected',
      metadata: { contractId: id, status: res.status },
    });
  }

  const active = await api.get(`/farms/${player.farmId}/contracts/active`, player.token);
  for (const c of arr(active.data)) {
    const id = str(c['id'] ?? c['activeContractId']);
    if (!id) continue;
    const res = await api.post(`/farms/${player.farmId}/contracts/${id}/complete`, {}, player.token);
    ctx.log.record({
      ...ev(ctx, 'progression'),
      action: 'contract-complete',
      result: res.ok ? 'success' : 'rejected',
      metadata: { contractId: id, status: res.status },
    });
  }

  if (rng.chance(0.2)) {
    // Almanac free track: claim tier 1, then 2, then 3 if sequentially unlocked.
    // The endpoint requires { track, tier }; an empty body makes getAlmanacTier
    // throw NotFound (404), which is why this used to 404.
    for (const tier of [1, 2, 3]) {
      const res = await api.post('/chapters/current/claim', { track: 'free', tier }, player.token);
      ctx.log.record({
        ...ev(ctx, 'progression'),
        action: 'chapter-claim',
        result: res.ok ? 'success' : 'rejected',
        metadata: { track: 'free', tier, status: res.status },
      });
      if (!res.ok) break; // sequential: a miss means the next tier is not yet unlocked
    }
  }

  const elder = await api.get(`/progression/farm/${player.farmId}/elder`, player.token);
  ctx.log.record({
    ...ev(ctx, 'progression'),
    action: 'elder-guidance',
    result: elder.ok ? 'success' : 'rejected',
    metadata: { tip: str(rec(elder.data)['tip'] ?? rec(elder.data)['guidance']) },
  });
}

/* ------------------------------------------------------------------ Spend */

async function doSpend(ctx: DayContext): Promise<void> {
  const { api, player, rng } = ctx;

  const store = await api.get('/payments/store', player.token);
  const goods = arr(store.raw).length > 0 ? arr(store.raw) : arr(store.data);

  // Boosts are `available: false` — withdrawn from v1. Assert they are absent
  // from the storefront rather than working around it.
  const boosts = goods.filter((g) => str(g['category']) === 'boost');
  ctx.log.record({
    ...ev(ctx, 'economy'),
    action: 'boost-availability',
    result: boosts.length === 0 ? 'success' : 'rejected',
    metadata: { listed: boosts.length, note: 'boosts withdrawn from v1 (ruling 2026-09-11)' },
  });

  const topUps = goods.filter((g) => str(g['category']) === 'currency' && g['available'] !== false);
  if (topUps.length > 0 && rng.chance(0.3)) {
    const sku = str(rng.pick(topUps)['sku']);
    const res = await api.post('/payments/create', { sku, provider: 'simulator' }, player.token);
    ctx.log.record({
      ...ev(ctx, 'economy'),
      action: 'top-up',
      result: res.ok ? 'success' : 'rejected',
      metadata: { sku, status: res.status },
    });
  }

  if (player.profile === 'whale' && rng.chance(0.2)) {
    const catalogue = await api.get('/store', player.token);
    const cosmetics = arr(catalogue.data).filter((c) => str(c['category']) === 'cosmetic');
    if (cosmetics.length > 0) {
      const sku = str(rng.pick(cosmetics)['sku']);
      const res = await api.post('/store/purchase', { sku }, player.token);
      ctx.log.record({
        ...ev(ctx, 'economy'),
        action: 'cosmetic-purchase',
        result: res.ok ? 'success' : 'rejected',
        metadata: { sku, status: res.status },
      });
    }
  }
}

/* ------------------------------------------------------------------ Utils */

function ev(ctx: DayContext, system: System) {
  return {
    simulatedDay: ctx.day,
    realDate: ctx.realDate,
    playerId: ctx.player.userId || ctx.player.email,
    profile: ctx.player.profile,
    system,
  };
}

export const RECIPE_COUNT = RECIPE_SLUGS.length;
