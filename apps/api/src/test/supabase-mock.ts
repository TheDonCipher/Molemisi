/**
 * Shared in-memory Supabase mock for API service specs.
 *
 * Mirrors the stateful builder pattern from chapter.service.spec, but adds the
 * `rpc('wallet_apply', â€¦)` path so specs can exercise the REAL WalletService (and
 * therefore prove actual balance movements) against the same mock DB. The `wallet_apply`
 * implementation here matches the Postgres function's two load-bearing invariants:
 *   - a negative resulting balance is rejected (Pula and Botho)
 *   - every movement writes a ledger_entries row
 *
 * Usage:
 *   const db = makeDb({ player_wallets: [{ player_id: 'u1', pula_balance: 500 }] });
 *   const client = clientFor(db);
 *   const supabase = { getAdminClient: () => client, getClient: () => client };
 */

export interface MockDb {
  player_wallets: any[];
  ledger_entries: any[];
  player_boosts: any[];
  player_cosmetics: any[];
  lore_entries: unknown[];
  payments: any[];
  real_world_transactions: any[];
  chapters: any[];
  player_chapter_state: any[];
  farms: any[];
  plots: any[];
  water: any[];
  buildings: any[];
  livestock: any[];
  farm_plots: any[];
  crop_instances: any[];
  inventory: any[];
  /** C2 — the canonical player-scoped store, and the defs that name its items. */
  player_inventory: any[];
  item_definitions: any[];
  game_ledger_entries: any[];
  market_prices: any[];
  market_transactions: any[];
  economy_price_snapshots: any[];
  anti_cheat_flags: any[];
  /** D5/B2 — the achievement catalog + per-player attainment. */
  achievements: any[];
  player_achievements: any[];
  /** D10/B4 — the 3-layer avatar. */
  player_avatar: any[];
  /** D6/B3 — chapter Events + per-player grants. */
  events: any[];
  event_grants: any[];
  /** D5/B1 — global Kgotla chat. No moderation tables: ruled out 2026-10-04. */
  kgotla_messages: any[];
  /** The identity row: display_name is the Kgotla identity (D4). */
  profiles: any[];
}

const PLAYER_WALLET_DEFAULT = (r: any) => ({
  pula_balance: 0,
  // docs/34 Â§2.1 â€” added by 20261001000003_add_madi_balance.sql. The mock mirrors
  // the real schema so a spec that exercises spendMadi tests real behaviour
  // rather than passing against a fiction.
  madi_balance: 0,
  botho_points: 0,
  subscription_status: 'free',
  subscription_expires_at: null,
  updated_at: new Date().toISOString(),
  ...r,
});

const TABLE_DEFAULTS: Record<string, (row: any) => any> = {
  player_wallets: PLAYER_WALLET_DEFAULT,
  // Column defaults Postgres would apply. Without these a spec asserting a
  // default (e.g. `status: 'open'`) or a timestamp (the chat rate limit reads
  // `created_at`) would test the service's behaviour against a fiction.
  kgotla_messages: (r) => ({
    language: 'en',
    deleted_at: null,
    created_at: new Date().toISOString(),
    ...r,
  }),
  player_achievements: (r) => ({ attained_at: new Date().toISOString(), ...r }),
  event_grants: (r) => ({ quantity: 0, chapter_tokens: 0, claimed_at: new Date().toISOString(), ...r }),
  player_avatar: (r) => ({
    equipped_outfit: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...r,
  }),
};

export function makeDb(seed: Partial<MockDb> = {}): MockDb {
  return {
    player_wallets: seed.player_wallets ?? [],
    ledger_entries: seed.ledger_entries ?? [],
    player_boosts: seed.player_boosts ?? [],
    player_cosmetics: seed.player_cosmetics ?? [],
    lore_entries: seed.lore_entries ?? [],
    payments: seed.payments ?? [],
    real_world_transactions: seed.real_world_transactions ?? [],
    chapters: seed.chapters ?? [],
    player_chapter_state: seed.player_chapter_state ?? [],
    farms: seed.farms ?? [],
    plots: seed.plots ?? [],
    water: seed.water ?? [],
    buildings: seed.buildings ?? [],
    livestock: seed.livestock ?? [],
    farm_plots: seed.farm_plots ?? [],
    crop_instances: seed.crop_instances ?? [],
    inventory: seed.inventory ?? [],
    player_inventory: seed.player_inventory ?? [],
    item_definitions: seed.item_definitions ?? [],
    game_ledger_entries: seed.game_ledger_entries ?? [],
    market_prices: seed.market_prices ?? [],
    market_transactions: seed.market_transactions ?? [],
    economy_price_snapshots: seed.economy_price_snapshots ?? [],
    anti_cheat_flags: seed.anti_cheat_flags ?? [],
    achievements: seed.achievements ?? [],
    player_achievements: seed.player_achievements ?? [],
    player_avatar: seed.player_avatar ?? [],
    events: seed.events ?? [],
    event_grants: seed.event_grants ?? [],
    kgotla_messages: seed.kgotla_messages ?? [],
    profiles: seed.profiles ?? [],
  };
}

class MockBuilder {
  private filters: Array<{ col: string; op: string; val: any }> = [];
  private readMode = false;
  private selectCalled = false;
  private singleMode: 'single' | 'maybeSingle' | null = null;
  private sort: { col: string; asc: boolean } | null = null;
  private write:
    | { type: 'insert' | 'update' | 'upsert' | 'delete'; row: any; onConflict?: string; ignore?: boolean }
    | null = null;
  private flushed = false;
  private lastResult: any = null;

  constructor(private store: any[], private table: string) {}

  select(_cols?: string) {
    this.readMode = true;
    this.selectCalled = true;
    return this;
  }
  eq(col: string, val: any) {
    this.filters.push({ col, op: 'eq', val });
    return this;
  }
  gt(col: string, val: any) {
    this.filters.push({ col, op: 'gt', val });
    return this;
  }
  lt(col: string, val: any) {
    this.filters.push({ col, op: 'lt', val });
    return this;
  }
  neq(col: string, val: any) {
    this.filters.push({ col, op: 'neq', val });
    return this;
  }
  gte(col: string, val: any) {
    this.filters.push({ col, op: 'gte', val });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.sort = { col, asc: opts?.ascending !== false };
    return this;
  }
  limit(_n: number) {
    return this;
  }
  single() {
    this.readMode = true;
    this.selectCalled = true;
    this.singleMode = 'single';
    return this;
  }
  maybeSingle() {
    this.readMode = true;
    this.selectCalled = true;
    this.singleMode = 'maybeSingle';
    return this;
  }
  insert(row: any) {
    this.write = { type: 'insert', row };
    return this;
  }
  update(row: any) {
    this.write = { type: 'update', row };
    return this;
  }
  upsert(row: Record<string, unknown>, opts?: { onConflict?: string }) {
    this.write = { type: 'upsert', row, onConflict: opts?.onConflict };
    return this;
  }
  delete() {
    this.write = { type: 'delete', row: null };
    return this;
  }
  onConflict(col: string) {
    if (this.write) this.write.onConflict = col;
    return this;
  }
  ignore() {
    if (this.write) this.write.ignore = true;
    return this.flush();
  }

  private matches(row: any): boolean {
    return this.filters.every((f) => {
      const v = row[f.col];
      // ISO-8601 timestamps compare correctly as strings; pulling the guard
      // out keeps helper tests from falling back to `(v ?? 0) >= val`, which
      // coerces a string timestamp to NaN and drops every row.
      if (typeof v === 'string' || typeof f.val === 'string') {
        switch (f.op) {
          case 'eq':
            return v === f.val;
          case 'neq':
            return v !== f.val;
          case 'gt':
            return String(v ?? '') > String(f.val);
          case 'lt':
            return String(v ?? '') < String(f.val);
          case 'gte':
            return String(v ?? '') >= String(f.val);
        }
      }
      switch (f.op) {
        case 'eq':
          return v === f.val;
        case 'gt':
          return (v ?? 0) > f.val;
        case 'lt':
          return (v ?? 0) < f.val;
        case 'neq':
          return v !== f.val;
        case 'gte':
          return (v ?? 0) >= f.val;
      }
      return true;
    });
  }

  private flush() {
    if (this.flushed) return this.lastResult;
    this.flushed = true;

    if (this.write) {
      const w = this.write;
      if (w.type === 'insert') {
        if (w.ignore && w.onConflict) {
          const cv = w.row[w.onConflict];
          const exists = this.store.some((r) => r[w.onConflict!] === cv);
          if (exists) {
            this.lastResult = { data: null, error: null };
            return this.lastResult;
          }
        }
        // Supabase `insert` accepts a single row or an array of rows; support
        // both so batched writes (e.g. anti-cheat flags) can be asserted on.
        const items: any[] = Array.isArray(w.row) ? w.row : [w.row];
        const dflt = TABLE_DEFAULTS[this.table];
        const inserted = items.map((item) => (dflt ? dflt(item) : { ...item }));
        for (const row of inserted) this.store.push(row);
        this.lastResult = this.selectCalled
          ? { data: inserted, error: null }
          : { data: null, error: null };
      } else if (w.type === 'update') {
        const matched = this.store.filter((r) => this.matches(r));
        for (const t of matched) Object.assign(t, w.row);
        this.lastResult = this.selectCalled ? { data: matched, error: null } : { data: null, error: null };
      } else if (w.type === 'delete') {
        // Delete the rows the accumulated filters match, in place, so the array
        // reference held by the MockDb stays valid for later assertions.
        const remaining = this.store.filter((r) => !this.matches(r));
        this.store.length = 0;
        this.store.push(...remaining);
        this.lastResult = { data: null, error: null };
      } else {
        // Upsert: match on every column of the (possibly composite) conflict
        // key, like Postgres ON CONFLICT (col, ...) â€” not on a literal key name.
        const cols = w.onConflict ? w.onConflict.split(',').map((c) => c.trim()) : [];
        const idx = cols.length
          ? this.store.findIndex((r) => cols.every((c) => r[c] === w.row[c]))
          : -1;
        if (idx >= 0) this.store[idx] = { ...this.store[idx], ...w.row };
        else {
          const dflt = TABLE_DEFAULTS[this.table];
          this.store.push(dflt ? dflt(w.row) : { ...w.row });
        }
        this.lastResult = { data: null, error: null };
      }
      return this.lastResult;
    }

    let rows = this.store.filter((r) => this.matches(r));
    if (this.sort) {
      const { col, asc } = this.sort;
      rows = rows
        .slice()
        .sort((a, b) => (asc ? (a[col] > b[col] ? 1 : -1) : a[col] < b[col] ? 1 : -1));
    }
    if (this.singleMode === 'single') {
      this.lastResult = { data: rows[0] ?? null, error: null };
    } else if (this.singleMode === 'maybeSingle') {
      this.lastResult = { data: rows[0] ?? null, error: null };
    } else {
      this.lastResult = { data: rows, error: null };
    }
    return this.lastResult;
  }

  then(resolve: (v: any) => void, _reject?: (e: any) => void) {
    if (!this.flushed) this.flush();
    resolve(this.lastResult);
    return undefined as any;
  }
}

function runWalletApply(db: MockDb, params: any): { data: number | null; error: any } {
  const { p_player_id, p_currency, p_amount, p_source, p_ref_id } = params;
  let w = db.player_wallets.find((r) => r.player_id === p_player_id);
  if (!w) {
    w = PLAYER_WALLET_DEFAULT({ player_id: p_player_id });
    db.player_wallets.push(w);
  }
  const amount = Number(p_amount);
  if (p_currency === 'pula') {
    const next = Number(w.pula_balance) + amount;
    if (next < 0) return { data: null, error: { message: 'wallet_apply: pula would go negative' } };
    w.pula_balance = next;
    db.ledger_entries.push({
      player_id: p_player_id,
      currency: 'pula',
      amount,
      balance_after: next,
      source: p_source,
      ref_id: p_ref_id ?? null,
      created_at: new Date().toISOString(),
    });
    return { data: next, error: null };
  }
  // docs/34 §2.1 — the third currency. Mirrors the wallet_apply branch in
  // 20261001000003_add_madi_balance.sql, including the floor.
  if (p_currency === 'madi') {
    const next = Number(w.madi_balance) + amount;
    if (next < 0) {
      return { data: null, error: { message: 'wallet_apply: insufficient Madi' } };
    }
    w.madi_balance = next;
    db.ledger_entries.push({
      player_id: p_player_id,
      currency: 'madi',
      amount,
      balance_after: next,
      source: p_source,
      ref_id: p_ref_id ?? null,
      created_at: new Date().toISOString(),
    });
    return { data: next, error: null };
  }
  const next = Number(w.botho_points) + amount;
  if (next < 0) return { data: null, error: { message: 'wallet_apply: botho would go negative' } };
  w.botho_points = next;
  db.ledger_entries.push({
    player_id: p_player_id,
    currency: 'botho',
    amount,
    balance_after: next,
    source: p_source,
    ref_id: p_ref_id ?? null,
    created_at: new Date().toISOString(),
  });
  return { data: next, error: null };
}

/**
 * H1 — mirror of `botho_credit_capped` (migration 20261002000003).
 *
 * The whole point of moving the cap into Postgres was that the old
 * read-then-credit could be raced. The mock has to reproduce the SAME contract
 * or the specs would prove nothing: sum the day's positive Botho, award
 * `min(requested, cap - earned)`, and return the award (possibly 0) rather than
 * erroring. `wallet.service.spec.ts` asserts exactly that shape.
 *
 * Day boundary is compared on the ISO string the service passes as
 * `p_day_start`, matching the SQL's `created_at >= p_day_start` filter.
 */
function runBothoCreditCapped(db: MockDb, params: any): { data: number | null; error: any } {
  const { p_player_id, p_requested, p_source, p_ref_id, p_day_start, p_cap } = params;
  const requested = Math.floor(Number(p_requested));
  const cap = Number(p_cap);
  if (!(requested > 0)) return { data: 0, error: null };

  let w = db.player_wallets.find((r) => r.player_id === p_player_id);
  if (!w) {
    w = PLAYER_WALLET_DEFAULT({ player_id: p_player_id });
    db.player_wallets.push(w);
  }

  const since = String(p_day_start ?? '');
  const earned = db.ledger_entries
    .filter(
      (r) =>
        r.player_id === p_player_id &&
        r.currency === 'botho' &&
        Number(r.amount) > 0 &&
        String(r.created_at ?? '') >= since,
    )
    .reduce((sum, r) => sum + Math.abs(Number(r.amount)), 0);

  const award = Math.min(requested, Math.floor(cap - earned));
  if (award <= 0) return { data: 0, error: null };

  w.botho_points = Number(w.botho_points) + award;
  db.ledger_entries.push({
    player_id: p_player_id,
    currency: 'botho',
    amount: award,
    balance_after: w.botho_points,
    source: p_source,
    ref_id: p_ref_id ?? null,
    created_at: new Date().toISOString(),
  });
  return { data: award, error: null };
}

export interface MockClient {
  from: (table: string) => MockBuilder;
  rpc: (name: string, params: any) => Promise<{ data: any; error: any }>;
  /** Every rpc invocation captured here, so specs can assert what was (not) called. */
  rpcLog: Array<{ name: string; params: any }>;
}

export function clientFor(db: MockDb): MockClient {
  const rpcLog: Array<{ name: string; params: any }> = [];
  return {
    rpcLog,
    rpc: (name: string, params: any) => {
      rpcLog.push({ name, params });
      if (name === 'wallet_apply') {
        const res = runWalletApply(db, params);
        return Promise.resolve(res);
      }
      if (name === 'botho_credit_capped') {
        return Promise.resolve(runBothoCreditCapped(db, params));
      }
      return Promise.resolve({ data: null, error: null });
    },
    from: (table: string) => {
    const rec = db as unknown as Record<string, any[]>;
    const arr = rec[table] ?? (rec[table] = []);
    return new MockBuilder(arr, table);
  },
  };
}
