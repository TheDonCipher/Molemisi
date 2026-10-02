/**
 * Anti-cheat rules — PURE detection functions (13 §4, §9).
 *
 * Split from the service so every rule is unit-testable with fixture data and
 * no database. Two families (13 §9 "Abuse Prevention"):
 *
 *   PASSIVE  — flag impossible states. The account did not "cheat" so much as
 *              become corrupt: negative currency, orphan crops, items that
 *              appeared without a matching ledger row.
 *   ACTIVE   — flag suspicious *sequences*: rapid currency gains, cost bypasses,
 *              inventory manipulation, market manipulation, rule-violating
 *              orderings.
 *
 * Every rule returns an array of `Flag` (possibly empty) so callers can flatten
 * many rules without guarding for null.
 */

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type FlagKind =
  | 'negative_currency'
  | 'negative_inventory'
  | 'orphan_crop'
  | 'resource_without_source'
  | 'rapid_currency_gain'
  | 'inventory_manipulation'
  | 'cost_bypass'
  | 'market_manipulation'
  | 'sequence_violation';

export interface Flag {
  kind: FlagKind;
  severity: Severity;
  playerId: string | null;
  farmId: string | null;
  /** Machine-readable evidence for the audit trail. */
  evidence: Record<string, unknown>;
  detectedAt: string;
}

/* ------------------------------------------------------------------ shared */

export interface LedgerRow {
  playerId: string;
  currency: 'pula' | 'botho';
  amount: number;
  source: string;
  refId?: string | null;
  createdAt: string;
}

export interface WalletRow {
  playerId: string;
  pulaBalance: number;
  bothoPoints: number;
}

export interface InventoryRow {
  /**
   * C2 (security audit 2026-10-02) — the canonical store is `player_inventory`,
   * which is PLAYER-scoped, so a row may not resolve to a farm (a player whose
   * farm row is missing, or an item held before a farm existed). Nullable rather
   * than invented.
   */
  farmId: string | null;
  itemType: string;
  quantity: number;
}

function flag(
  kind: FlagKind,
  severity: Severity,
  playerId: string | null,
  farmId: string | null,
  evidence: Record<string, unknown>,
  detectedAt: string,
): Flag {
  return { kind, severity, playerId, farmId, evidence, detectedAt };
}

/* --------------------------------------------------------------- PASSIVE */

/** 13 §4 — a wallet that can go negative is a broken authority boundary. */
export function detectNegativeBalances(wallets: readonly WalletRow[], now: string): Flag[] {
  const out: Flag[] = [];
  for (const w of wallets) {
    if (w.pulaBalance < 0 || w.bothoPoints < 0) {
      out.push(
        flag(
          'negative_currency',
          'critical',
          w.playerId,
          null,
          { pulaBalance: w.pulaBalance, bothoPoints: w.bothoPoints },
          now,
        ),
      );
    }
  }
  return out;
}

/** Negative inventory means items left without a matching source transaction. */
export function detectNegativeInventory(rows: readonly InventoryRow[], now: string): Flag[] {
  const out: Flag[] = [];
  for (const r of rows) {
    if (r.quantity < 0) {
      out.push(
        flag(
          'negative_inventory',
          'high',
          null,
          r.farmId,
          { itemType: r.itemType, quantity: r.quantity },
          now,
        ),
      );
    }
  }
  return out;
}

/**
 * A plot in PLANTED/GROWING/READY with no crop row behind it (11 §5 "orphan
 * crop"), or a crop row pointing at an EMPTY plot.
 */
export function detectOrphanCrops(
  plots: ReadonlyArray<{ plotId: string; farmId: string; state: string; hasCrop: boolean }>,
  now: string,
): Flag[] {
  const out: Flag[] = [];
  for (const p of plots) {
    const occupied = p.state === 'PLANTED' || p.state === 'GROWING' || p.state === 'READY';
    if (occupied && !p.hasCrop) {
      out.push(
        flag(
          'orphan_crop',
          'high',
          null,
          p.farmId,
          { plotId: p.plotId, state: p.state, reason: 'occupied plot without a crop row' },
          now,
        ),
      );
    }
    if (!occupied && p.hasCrop) {
      out.push(
        flag(
          'orphan_crop',
          'medium',
          null,
          p.farmId,
          { plotId: p.plotId, state: p.state, reason: 'crop row on an EMPTY plot' },
          now,
        ),
      );
    }
  }
  return out;
}

/**
 * Inventory growth with no ledger movement behind it (13 §4 "ALWAYS record
 * economic transactions in ledger"). `credited` are the item inflows the ledger
 * accounts for; anything above that is unexplained.
 */
export function detectResourceWithoutSource(
  farmId: string,
  observed: ReadonlyArray<{ itemType: string; netGain: number }>,
  credited: ReadonlyArray<{ itemType: string; netGain: number }>,
  now: string,
): Flag[] {
  const creditedByItem = new Map(credited.map((c) => [c.itemType, c.netGain]));
  const out: Flag[] = [];
  for (const o of observed) {
    const known = creditedByItem.get(o.itemType) ?? 0;
    if (o.netGain > known) {
      out.push(
        flag(
          'resource_without_source',
          'high',
          null,
          farmId,
          { itemType: o.itemType, observedGain: o.netGain, creditedGain: known },
          now,
        ),
      );
    }
  }
  return out;
}

/* ---------------------------------------------------------------- ACTIVE */

export interface RapidGainThresholds {
  /** Rolling window for the sum. */
  windowHours: number;
  /** Credit sum within the window that triggers a flag. */
  maxCreditPula: number;
}

/**
 * 13 §9 "Economy manipulation → flag, review". Sum the player's Pula credits
 * over a window; above the threshold (a hand-tuned ceiling far above anything a
 * legal play session can earn) it is a flag, not a ban.
 */
export function detectRapidGains(
  ledger: readonly LedgerRow[],
  thresholds: RapidGainThresholds,
  now: string,
): Flag[] {
  const nowMs = Date.parse(now);
  const cutoff = nowMs - thresholds.windowHours * 3_600_000;
  const byPlayer = new Map<string, { total: number; count: number }>();

  for (const row of ledger) {
    if (row.currency !== 'pula' || row.amount <= 0) continue;
    const t = Date.parse(row.createdAt);
    if (!Number.isFinite(t) || t < cutoff || t > nowMs) continue;
    const acc = byPlayer.get(row.playerId) ?? { total: 0, count: 0 };
    acc.total += row.amount;
    acc.count += 1;
    byPlayer.set(row.playerId, acc);
  }

  const out: Flag[] = [];
  for (const [playerId, acc] of byPlayer) {
    if (acc.total > thresholds.maxCreditPula) {
      out.push(
        flag(
          'rapid_currency_gain',
          'high',
          playerId,
          null,
          { total: acc.total, count: acc.count, windowHours: thresholds.windowHours },
          now,
        ),
      );
    }
  }
  return out;
}

/**
 * Building / crafting must consume their cost. A completed build or craft whose
 * `refId` never appears on a debit row is a cost bypass (13 §4 "Buy item →
 * sufficient currency").
 */
export function detectCostBypass(
  events: ReadonlyArray<{
    kind: 'build' | 'craft' | 'upgrade';
    playerId: string;
    farmId: string;
    refId: string;
    expectedCost: number;
  }>,
  ledger: readonly LedgerRow[],
  now: string,
): Flag[] {
  const debitedRefs = new Set(
    ledger.filter((l) => l.amount < 0 && l.refId).map((l) => l.refId as string),
  );
  const out: Flag[] = [];
  for (const e of events) {
    if (!debitedRefs.has(e.refId)) {
      out.push(
        flag(
          'cost_bypass',
          'critical',
          e.playerId,
          e.farmId,
          { kind: e.kind, refId: e.refId, expectedCost: e.expectedCost },
          now,
        ),
      );
    }
  }
  return out;
}

export interface MarketTrade {
  playerId: string;
  farmId: string;
  itemType: string;
  side: 'buy' | 'sell';
  quantity: number;
  /**
   * Price expressed as a MULTIPLIER of the item's catalogue baseline
   * (02 §4.1 — the Co-op band lives at 0.5–2.0x, not in Pula). Callers with
   * absolute unit prices NORMALISE first (unit / base), because comparing a
   * P25 sale to the number 2.0 flags every legal trade.
   */
  price: number;
  createdAt: string;
}

/**
 * 13 §9 "Economy manipulation". Two heuristics, both deterministic:
 *   1. flip — the same item is bought and sold inside `minFlipSeconds`.
 *   2. out-of-band — a unit price outside the 0.5–2.0x band (02 §4.1).
 */
export function detectMarketManipulation(
  trades: readonly MarketTrade[],
  opts: { minFlipSeconds: number; bandMin: number; bandMax: number },
  now: string,
): Flag[] {
  const out: Flag[] = [];

  for (const t of trades) {
    if (t.price < opts.bandMin || t.price > opts.bandMax) {
      out.push(
        flag(
          'market_manipulation',
          'high',
          t.playerId,
          t.farmId,
          { reason: 'price outside the market band', itemType: t.itemType, price: t.price },
          now,
        ),
      );
    }
  }

  // Flip detection: for each (player, item), a sell close after a buy is a flip.
  const buysByKey = new Map<string, number[]>();
  const sorted = [...trades].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const t of sorted) {
    const key = `${t.playerId}|${t.itemType}`;
    if (t.side === 'sell') {
      const tMs = Date.parse(t.createdAt);
      const buys = buysByKey.get(key) ?? [];
      const isFlip = buys.some((bMs) => tMs - bMs <= opts.minFlipSeconds * 1000);
      if (isFlip) {
        out.push(
          flag(
            'market_manipulation',
            'medium',
            t.playerId,
            t.farmId,
            { reason: 'buy→sell flip inside the manipulation window', itemType: t.itemType },
            now,
          ),
        );
      }
    }
    if (t.side === 'buy') {
      const list = buysByKey.get(key) ?? [];
      list.push(Date.parse(t.createdAt));
      buysByKey.set(key, list);
    }
  }
  return out;
}

/**
 * Rule-ordering violations (13 §4 validation points): harvest before the crop
 * is READY, sell an item never produced, buy without funds. A rejected action
 * reaching here means the guard fired — recorded so a client hammering the
 * endpoint produces a visible trail.
 */
export function detectSequenceViolations(
  actions: ReadonlyArray<{
    playerId: string;
    farmId: string;
    action: string;
    refId?: string;
    ok: boolean;
    reason?: string;
  }>,
  now: string,
): Flag[] {
  const out: Flag[] = [];
  for (const a of actions) {
    if (a.ok) continue;
    out.push(
      flag(
        'sequence_violation',
        'medium',
        a.playerId,
        a.farmId,
        { action: a.action, refId: a.refId ?? null, reason: a.reason ?? 'rejected' },
        now,
      ),
    );
  }
  return out;
}

