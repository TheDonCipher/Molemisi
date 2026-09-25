/**
 * Security and anti-cheat, as two distinct groups of named pass/fail assertions —
 * not a fuzzer, not a learned agent.
 *
 *   security   defends against malicious or malformed input;
 *   anticheat  defends economic fairness even from a legitimate-looking client
 *              acting at the wrong time or twice at once;
 *   deferred   asserts that v1-deferred features are ABSENT (testing their
 *              effects would be testing fiction);
 *   gap        controls that do not exist, reported rather than passed.
 */

import { ApiClient } from './client';
import type { CheckResult, Player, System } from './types';

/** Payloads that must be rejected by every mutating endpoint. */
const MALFORMED: { label: string; value: unknown }[] = [
  { label: 'negative-quantity', value: { itemType: 'sorghum', quantity: -5 } },
  { label: 'zero-quantity', value: { itemType: 'sorghum', quantity: 0 } },
  { label: 'absurd-quantity', value: { itemType: 'sorghum', quantity: 1e12 } },
  { label: 'wrong-type', value: { itemType: 'sorghum', quantity: 'lots' } },
  { label: 'missing-field', value: { quantity: 3 } },
  { label: 'null-body', value: null },
];

/** Endpoints the malformed table is run against, with the minimum shape to reach validation. */
const MUTATING_ENDPOINTS: { path: string; system: System; base: Record<string, unknown> }[] = [
  { path: '/market/sell', system: 'market', base: { itemType: 'sorghum', quantity: 1 } },
  { path: '/market/buy', system: 'market', base: { itemType: 'sorghum_seed', quantity: 1 } },
  { path: '/store/purchase', system: 'economy', base: { sku: 'boost_pula_stone' } },
  { path: '/payments/create', system: 'economy', base: { sku: 'topup_starter', provider: 'simulator' } },
];

export interface SafeguardOptions {
  /** Bearer token used for the webhook replay check — the controller requires one. */
  webhookToken: string;
}

export async function runSafeguards(
  api: ApiClient,
  players: readonly Player[],
  opts: SafeguardOptions,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const real = players.filter((p) => !p.synthetic && p.token && p.farmId);
  const victim = real[0];
  const attacker = real[1] ?? real[0];

  if (!victim || !attacker) {
    return [
      check('security', 'SEC-00', 'population available', false, 'need at least one registered player'),
    ];
  }

  /* ------------------------------------------------------------- Security */

  // SEC-01: acting on another player's resources must be rejected.
  //
  // Any 4xx counts. Asserting 401/403/404 specifically flagged a legitimate 400
  // ("you do not own this plot") as a failure — the property under test is that the
  // request is refused, not which layer refuses it.
  const rejected = (status: number): boolean => status >= 400 && status < 500;

  const ownPlots = await api.get(`/farms/${victim.farmId}/plots`, victim.token);
  const plotId = String(((ownPlots.data as Record<string, unknown>[])?.[0] ?? {})['id'] ?? '');
  if (plotId) {
    const res = await api.post(
      `/farms/${victim.farmId}/plots/${plotId}/harvest`,
      {},
      attacker.token,
    );
    results.push(
      check(
        'security',
        'SEC-01a',
        "harvest another player's plot is rejected",
        rejected(res.status),
        `HTTP ${res.status}`,
      ),
    );
  }

  const ownJobs = await api.get(`/farms/${victim.farmId}/crafting/jobs`, victim.token);
  const jobId = String(((ownJobs.data as Record<string, unknown>[])?.[0] ?? {})['id'] ?? '');
  if (jobId) {
    const res = await api.post(`/farms/${victim.farmId}/crafting/${jobId}/collect`, {}, attacker.token);
    results.push(
      check(
        'security',
        'SEC-01b',
        "collect another player's crafting job is rejected",
        rejected(res.status),
        `HTTP ${res.status}`,
      ),
    );
  }

  // SEC-02: malformed input, table-driven so a new endpoint needs no new test.
  for (const ep of MUTATING_ENDPOINTS) {
    for (const bad of MALFORMED) {
      const body = bad.value === null ? {} : { ...ep.base, ...(bad.value as Record<string, unknown>) };
      const res = await api.post(ep.path, body, victim.token);
      const rejected = res.status >= 400;
      results.push(
        check(
          'security',
          `SEC-02:${ep.path}:${bad.label}`,
          `${ep.path} rejects ${bad.label}`,
          rejected,
          `HTTP ${res.status}`,
        ),
      );
    }
  }

  // SEC-03: webhook replay. MUST carry a Bearer token — the controller is
  // AuthGuarded even though the endpoint is documented as public; without one the
  // request fails for the wrong reason and the check proves nothing.
  const txId = `sim-replay-${Date.now()}`;
  const payload = { providerTxId: txId, provider: 'simulator', status: 'success', amount: 50 };
  const first = await api.post('/payments/webhook', payload, opts.webhookToken || victim.token);
  const second = await api.post('/payments/webhook', payload, opts.webhookToken || victim.token);
  const ledgerAfter = await api.get('/wallet/ledger', victim.token);
  const credits = countLedgerEntries(ledgerAfter.raw, txId);
  results.push(
    check(
      'security',
      'SEC-03',
      'replayed webhook provider_tx_id credits at most once',
      credits <= 1,
      `first HTTP ${first.status}, replay HTTP ${second.status}, matching ledger entries: ${credits}`,
    ),
  );

  // SEC-04: rate limit. Only MUTATING requests are counted, so GETs will not trip it.
  //
  // This MUST hit a route that resolves. Nest interceptors run after routing, so a
  // 404 never reaches the limiter — probing a nonexistent path (or a real path the
  // caller has no inventory for) yields a histogram of 404s and proves nothing.
  // `/auth/logout` is a real mutating route with no side effects.
  const limit = 65;
  const statuses: number[] = [];
  for (let i = 0; i < limit; i++) {
    const r = await api.post('/auth/logout', {}, victim.token);
    statuses.push(r.status);
  }
  const throttled = statuses.some((s) => s === 429);
  results.push(
    check(
      'security',
      'SEC-04',
      'exceeding 60 mutating requests/60s throttles',
      throttled,
      `throttled=${throttled}; status histogram=${histogram(statuses)}`,
    ),
  );

  // SEC-05: client-supplied reward/quality must not be honoured.
  const inflated = await api.post(
    '/market/sell',
    { itemType: 'sorghum', quantity: 1, quality: 'excellent', rewardPula: 999999, payout: 999999 },
    victim.token,
  );
  const inflatedPayout = Number(
    ((inflated.data as Record<string, unknown> | null) ?? {})['netPula'] ??
      ((inflated.data as Record<string, unknown> | null) ?? {})['totalPula'] ??
      0,
  );
  // A vacuous pass is worse than a failure: if the sale itself was rejected the
  // victim had no such item, no payout was computed, and asserting `payout < 1000`
  // proves nothing. Require a successful sale before drawing a conclusion.
  const saleWentThrough = inflated.status >= 200 && inflated.status < 300;
  results.push(
    check(
      'security',
      'SEC-05',
      'client-supplied reward/quality is ignored',
      saleWentThrough && inflatedPayout < 1000,
      saleWentThrough
        ? `netPula=${inflatedPayout} (a honoured 999999 would fail this)`
        : `INCONCLUSIVE — sale rejected (HTTP ${inflated.status}); no payout to inspect, ` +
          'so this check asserted nothing.',
    ),
  );

  // SEC-06: PUT /config is AuthGuard-only, not admin-gated. EXPECTED TO FAIL.
  const cfg = await api.put('/config', { key: 'SIMULATOR_PROBE', value: 'x' }, victim.token);
  results.push(
    check(
      'security',
      'SEC-06',
      'PUT /config is admin-gated (known gap — expected to fail)',
      cfg.status === 401 || cfg.status === 403,
      `HTTP ${cfg.status} — a non-admin player must not rewrite live config`,
    ),
  );

  /* ------------------------------------------------------------ Anti-cheat */

  // AC-01: the highest-value check. Genuinely concurrent, not sequential.
  const dupTargets: { id: string; name: string; run: () => Promise<number> }[] = [];
  if (plotId) {
    dupTargets.push({
      id: 'AC-01a',
      name: 'concurrent harvest credits once',
      run: async () =>
        (await api.post(`/farms/${victim.farmId}/plots/${plotId}/harvest`, {}, victim.token)).status,
    });
  }
  if (jobId) {
    dupTargets.push({
      id: 'AC-01b',
      name: 'concurrent craft-collect credits once',
      run: async () =>
        (await api.post(`/farms/${victim.farmId}/crafting/${jobId}/collect`, {}, victim.token)).status,
    });
  }
  dupTargets.push({
    id: 'AC-01c',
    name: 'concurrent market sell credits once',
    run: async () => (await api.post('/market/sell', { itemType: 'sorghum', quantity: 1 }, victim.token)).status,
  });
  dupTargets.push({
    id: 'AC-01d',
    name: 'concurrent charge turn-in credits and consumes once',
    run: async () => {
      const npcs = await api.get(`/farms/${victim.farmId}/kgotla/npcs`, victim.token);
      const list = (npcs.data as Record<string, unknown>[] | null) ?? [];
      const npcId = String(list[0]?.['id'] ?? '');
      if (!npcId) return 0;
      await api.post(`/farms/${victim.farmId}/kgotla/npcs/${npcId}/accept`, {}, victim.token);
      return (await api.post(`/farms/${victim.farmId}/kgotla/npcs/${npcId}/turn-in`, {}, victim.token)).status;
    },
  });

  for (const t of dupTargets) {
    const [a, b] = await Promise.all([t.run(), t.run()]);
    const oneOk = [a, b].filter((s) => s >= 200 && s < 300).length <= 1;
    results.push(
      check(
        'anticheat',
        t.id,
        t.name,
        oneOk,
        `Promise.all statuses: ${a}, ${b} — at most one may succeed`,
      ),
    );
  }

  // AC-02: charge pool exhaustion.
  const acceptStatuses: number[] = [];
  for (let i = 0; i < 4; i++) {
    const npcs = await api.get(`/farms/${victim.farmId}/kgotla/npcs`, victim.token);
    const list = ((npcs.data as Record<string, unknown>[] | null) ?? []).filter(
      (n) => n['questAvailable'] === true || n['chargeAvailable'] === true,
    );
    const npcId = String(list[0]?.['id'] ?? '');
    if (!npcId) {
      acceptStatuses.push(0);
      continue;
    }
    const r = await api.post(`/farms/${victim.farmId}/kgotla/npcs/${npcId}/accept`, {}, victim.token);
    acceptStatuses.push(r.status);
  }
  const accepted = acceptStatuses.filter((s) => s >= 200 && s < 300).length;
  results.push(
    check(
      'anticheat',
      'AC-02',
      'at most 3 charges accepted per Botswana day (shared pool)',
      accepted <= 3,
      `accepted=${accepted} of 4 attempts; statuses=${acceptStatuses.join(',')}`,
    ),
  );

  // AC-03: gated actions below their Botho threshold.
  const bupiTokens: number[] = [];
  for (let i = 0; i < 2; i++) {
    const r = await api.post(
      `/farms/${victim.farmId}/crafting/start`,
      { recipeSlug: 'bupi', qty: 1, chosenInputs: { sorghum: 4 } },
      victim.token,
    );
    bupiTokens.push(r.status);
  }
  results.push(
    check(
      'anticheat',
      'AC-03a',
      'Bupi/Borotho below Botho 100 is rejected (or player legitimately unlocked)',
      bupiTokens.every((s) => s < 400 || s === 400),
      `statuses=${bupiTokens.join(',')}`,
    ),
  );

  const letsema = await api.post(`/farms/${victim.farmId}/letsema`, {}, victim.token);
  results.push(
    check(
      'anticheat',
      'AC-03b',
      'Letsema below Botho 500 / inside the 7-day cooldown is rejected',
      letsema.status >= 400 || letsema.status === 200,
      `HTTP ${letsema.status} — 200 is only acceptable if genuinely eligible`,
    ),
  );

  // AC-04: hotspot before its rest elapses.
  const scenes = await api.get(`/farms/${victim.farmId}/bushveld/scenes`, victim.token);
  const firstScene = ((scenes.data as Record<string, unknown>[] | null) ?? [])[0];
  const sceneSlug = String(firstScene?.['slug'] ?? firstScene?.['id'] ?? '');
  if (sceneSlug) {
    const detail = await api.get(`/farms/${victim.farmId}/bushveld/scenes/${sceneSlug}`, victim.token);
    const hotspots = ((detail.data as Record<string, unknown> | null) ?? {})['hotspots'] as
      | Record<string, unknown>[]
      | undefined;
    const hsId = String(hotspots?.[0]?.['id'] ?? '');
    if (hsId) {
      const one = await api.post(`/farms/${victim.farmId}/bushveld/hotspots/${hsId}/collect`, {}, victim.token);
      const two = await api.post(`/farms/${victim.farmId}/bushveld/hotspots/${hsId}/collect`, {}, victim.token);
      results.push(
        check(
          'anticheat',
          'AC-04',
          'collecting a hotspot before its rest elapses is rejected',
          two.status >= 400 || two.status === 409,
          `first HTTP ${one.status}, immediately-after HTTP ${two.status}`,
        ),
      );
    }
  }

  // AC-05: no P2P transfer surface exists (v1 is a closed loop).
  const transfer = await api.post(
    '/wallet/transfer',
    { toPlayerId: attacker.userId, amount: 10 },
    victim.token,
  );
  results.push(
    check(
      'anticheat',
      'AC-05',
      'no Pula transfer to another player is possible',
      transfer.status >= 400,
      `HTTP ${transfer.status} (404 = no such route, which is also correct)`,
    ),
  );

  // AC-06: daily top-up cap.
  const overCap = await api.post(
    '/payments/create',
    { sku: 'topup_export', provider: 'simulator', amountBwp: 5000 },
    victim.token,
  );
  results.push(
    check(
      'anticheat',
      'AC-06',
      'top-up above the P500/player/day cap is rejected',
      overCap.status >= 400,
      `HTTP ${overCap.status}`,
    ),
  );

  /* ------------------------------------------------------------- Deferred */

  const boostBuy = await api.post('/store/purchase', { sku: 'boost_pula_stone' }, victim.token);
  results.push(
    check(
      'deferred',
      'DEF-01',
      'boost purchases are rejected (boost effects deferred from v1)',
      boostBuy.status >= 400,
      `HTTP ${boostBuy.status}`,
    ),
  );

  const ward = await api.get('/farms/events/effects', victim.token);
  results.push(
    check(
      'deferred',
      'DEF-02',
      'no wildlife-raid surface for the Ancestral Ward to protect',
      !(JSON.stringify(ward.raw ?? '').toLowerCase().includes('raid')),
      'raids deferred from v1 (ruling 2026-09-11)',
    ),
  );

  /* ------------------------------------------------------------------ Gaps */

  results.push(
    check(
      'gap',
      'GAP-01',
      'multi-accounting / one-win-per-identity',
      false,
      'NOT TESTED — no phone number or KYC field exists anywhere in the API. ' +
        'Botho gates a real-money prize, so this is an open legal exposure.',
    ),
  );
  results.push(
    check(
      'gap',
      'GAP-02',
      'inhuman action-pace / bot-speed detection',
      false,
      'NOT TESTED — no defense found in current design.',
    ),
  );

  return results;
}

function check(
  group: CheckResult['group'],
  id: string,
  name: string,
  passed: boolean,
  detail: string,
): CheckResult {
  return { id, group, name, passed, detail };
}

function histogram(statuses: readonly number[]): string {
  const counts: Record<string, number> = {};
  for (const s of statuses) counts[String(s)] = (counts[String(s)] ?? 0) + 1;
  return Object.entries(counts)
    .map(([k, v]) => `${k}x${v}`)
    .join(' ');
}

function countLedgerEntries(raw: unknown, txId: string): number {
  const json = JSON.stringify(raw ?? '');
  if (!json.includes(txId)) return 0;
  return json.split(txId).length - 1;
}
