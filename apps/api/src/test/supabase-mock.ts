/**
 * Shared in-memory Supabase mock for API service specs.
 *
 * Mirrors the stateful builder pattern from chapter.service.spec, but adds the
 * `rpc('wallet_apply', …)` path so specs can exercise the REAL WalletService (and
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
  payments: any[];
  real_world_transactions: any[];
  chapters: any[];
  player_chapter_state: any[];
  farms: any[];
  plots: any[];
  water: any[];
  buildings: any[];
  livestock: any[];
}

const PLAYER_WALLET_DEFAULT = (r: any) => ({
  pula_balance: 0,
  botho_points: 0,
  subscription_status: 'free',
  subscription_expires_at: null,
  updated_at: new Date().toISOString(),
  ...r,
});

const TABLE_DEFAULTS: Record<string, (row: any) => any> = {
  player_wallets: PLAYER_WALLET_DEFAULT,
};

export function makeDb(seed: Partial<MockDb> = {}): MockDb {
  return {
    player_wallets: seed.player_wallets ?? [],
    ledger_entries: seed.ledger_entries ?? [],
    player_boosts: seed.player_boosts ?? [],
    player_cosmetics: seed.player_cosmetics ?? [],
    payments: seed.payments ?? [],
    real_world_transactions: seed.real_world_transactions ?? [],
    chapters: seed.chapters ?? [],
    player_chapter_state: seed.player_chapter_state ?? [],
    farms: seed.farms ?? [],
    plots: seed.plots ?? [],
    water: seed.water ?? [],
    buildings: seed.buildings ?? [],
    livestock: seed.livestock ?? [],
  };
}

class MockBuilder {
  private filters: Array<{ col: string; op: string; val: any }> = [];
  private readMode = false;
  private selectCalled = false;
  private singleMode: 'single' | 'maybeSingle' | null = null;
  private sort: { col: string; asc: boolean } | null = null;
  private write:
    | { type: 'insert' | 'update' | 'upsert'; row: any; onConflict?: string; ignore?: boolean }
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
  upsert(row: any) {
    this.write = { type: 'upsert', row };
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
        const dflt = TABLE_DEFAULTS[this.table];
        const filled = dflt ? dflt(w.row) : { ...w.row };
        this.store.push(filled);
        this.lastResult = this.selectCalled ? { data: [filled], error: null } : { data: null, error: null };
      } else if (w.type === 'update') {
        const matched = this.store.filter((r) => this.matches(r));
        for (const t of matched) Object.assign(t, w.row);
        this.lastResult = this.selectCalled ? { data: matched, error: null } : { data: null, error: null };
      } else {
        const key = w.onConflict;
        const cv = key ? w.row[key] : undefined;
        const idx = key ? this.store.findIndex((r) => r[key] === cv) : -1;
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
      return Promise.resolve({ data: null, error: null });
    },
    from: (table: string) => {
    const rec = db as unknown as Record<string, any[]>;
    const arr = rec[table] ?? (rec[table] = []);
    return new MockBuilder(arr, table);
  },
  };
}
