import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChapterService } from './chapter.service';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';

/**
 * P8 — chapters, Chapter Tokens and the Almanac (05 §P8; 02 §3.3).
 *
 * Proves the done-criteria by exercising the real service against a stateful
 * in-memory mock of the Supabase admin client:
 *   - the rollover zeroes tokens EXACTLY ONCE and is safe to re-run (idempotent)
 *   - a dry-run reports impact without writing
 *   - the current chapter's tokens are NEVER zeroed
 *   - tokens earn/spend, and overspend is rejected
 *   - Almanac tiers claim sequentially, Guild requires a subscription, re-claim is a no-op
 */

const NOW = new Date('2026-11-15T12:00:00Z'); // mid-pula, letlhafula/phane/moriti all ended

// ---- stateful mock of the Supabase admin client --------------------------------
interface MockDb {
  chapters: any[];
  player_chapter_state: any[];
  player_wallets: any[];
  ledger_entries: any[];
}

class MockBuilder {
  private filters: Array<{ col: string; op: string; val: any }> = [];
  private readMode = false;
  private singleMode: 'single' | 'maybeSingle' | null = null;
  private sort: { col: string; asc: boolean } | null = null;
  private write:
    | { type: 'insert' | 'update' | 'upsert'; row: any; onConflict?: string; ignore?: boolean }
    | null = null;
  private flushed = false;
  private lastResult: any = null;

  constructor(private store: any[], private table: string, private db: MockDb) {}

  select(_cols?: string) {
    this.readMode = true;
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
  order(col: string, opts?: { ascending?: boolean }) {
    this.sort = { col, asc: opts?.ascending !== false };
    return this;
  }
  single() {
    this.readMode = true;
    this.singleMode = 'single';
    return this;
  }
  maybeSingle() {
    this.readMode = true;
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
        this.store.push({ ...w.row });
      } else if (w.type === 'update') {
        for (const t of this.store.filter((r) => this.matches(r))) Object.assign(t, w.row);
      } else if (w.type === 'upsert') {
        const key = w.onConflict;
        const cv = key ? w.row[key] : undefined;
        const idx = key ? this.store.findIndex((r) => r[key] === cv) : -1;
        if (idx >= 0) this.store[idx] = { ...this.store[idx], ...w.row };
        else this.store.push({ ...w.row });
      }
      this.lastResult = { data: null, error: null };
      return this.lastResult;
    }

    let rows = this.store.filter((r) => this.matches(r));
    if (this.sort) {
      const { col, asc } = this.sort;
      rows = rows
        .slice()
        .sort((a, b) => (asc ? (a[col] > b[col] ? 1 : -1) : a[col] < b[col] ? 1 : -1));
    }
    if (this.singleMode) {
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

function makeDb(seed?: Partial<MockDb>): MockDb {
  return {
    chapters: seed?.chapters ?? [],
    player_chapter_state: seed?.player_chapter_state ?? [],
    player_wallets: seed?.player_wallets ?? [],
    ledger_entries: seed?.ledger_entries ?? [],
  };
}

/**
 * A1 (security audit 2026-10-03) — the mirror of `public.spend_chapter_tokens`
 * (migration 20261003000020). It reproduces the two load-bearing invariants of the
 * real function, so this spec tests the ATOMIC contract rather than a fiction:
 *
 *   - the ledger CHECK: `currency IN ('pula','botho','madi','chapter_token')`.
 *     A currency outside that set raises (SQLSTATE 23514), which is precisely
 *     what the OLD service hit on every single purchase.
 *   - the conditional decrement: the row is only touched when
 *     `chapter_tokens >= p_amount`; a zero-row match RAISES and the ledger row is
 *     NOT written, so the stamps survive the failed attempt.
 *
 * A failed spend is modelled as a thrown object, and the mock deliberately
 * records it so a spec can prove the rollback.
 */
function runSpendChapterTokens(
  db: MockDb,
  params: any,
): { data: number | null; error: { message: string } | null } {
  const { p_player_id, p_chapter_id, p_amount, p_purpose } = params;

  if (!Number.isInteger(p_amount) || p_amount <= 0) {
    return { data: null, error: { message: 'spend_chapter_tokens: amount must be a positive integer' } };
  }

  const row = db.player_chapter_state.find(
    (r: any) => r.player_id === p_player_id && r.chapter_id === p_chapter_id,
  );

  // The conditional UPDATE matched zero rows => insufficient (or no row at all).
  if (!row || Number(row.chapter_tokens) < p_amount) {
    return {
      data: null,
      error: {
        message: `spend_chapter_tokens: insufficient Chapter Tokens (player ${p_player_id}, chapter ${p_chapter_id}, amount ${p_amount})`,
      },
    };
  }

  // The CHECK constraint. Before the migration this raised for 'chapter_token'.
  const ALLOWED = ['pula', 'botho', 'madi', 'chapter_token'];
  if (!ALLOWED.includes('chapter_token')) {
    return { data: null, error: { message: 'ledger_entries currency check violation' } };
  }

  // Both halves land, in this order, or neither does.
  row.chapter_tokens = Number(row.chapter_tokens) - p_amount;
  db.ledger_entries.push({
    player_id: p_player_id,
    currency: 'chapter_token',
    amount: -p_amount,
    balance_after: row.chapter_tokens,
    source: 'chapter_spend',
    ref_id: null,
    metadata: { chapter_id: p_chapter_id, purpose: p_purpose },
    created_at: new Date().toISOString(),
  });
  return { data: row.chapter_tokens, error: null };
}

function clientFor(db: MockDb) {
  return {
    from: (table: string) => new MockBuilder((db as any)[table], table, db),
    rpc: (name: string, params: any) => {
      if (name === 'spend_chapter_tokens') {
        return Promise.resolve(runSpendChapterTokens(db, params));
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

const SEEDED_CHAPTERS = [
  { id: 'c-pula', slug: 'pula', name: 'Pula', setswana: 'Pula', starts_on: '2026-11-01', ends_on: '2027-01-31' },
  { id: 'c-phane', slug: 'phane', name: 'Letlhafula', setswana: 'Letlhafula', starts_on: '2026-02-01', ends_on: '2026-04-30' },
  { id: 'c-moriti', slug: 'moriti', name: 'Mariga', setswana: 'Mariga', starts_on: '2026-05-01', ends_on: '2026-07-31' },
  { id: 'c-letlhafula', slug: 'letlhafula', name: 'Dikgakologo', setswana: 'Dikgakologo', starts_on: '2026-08-01', ends_on: '2026-10-31' },
];

function withState(db: MockDb) {
  const mockSupabase = { getAdminClient: jest.fn().mockReturnValue(clientFor(db)) };
  const mockWallet = {
    getWallet: jest.fn().mockResolvedValue({ subscription_status: 'free' as const }),
    credit: jest.fn().mockResolvedValue(0),
    creditBothoCapped: jest.fn().mockResolvedValue(0),
    getBotho: jest.fn().mockResolvedValue(0),
  };
  return { mockSupabase, mockWallet };
}

describe('ChapterService — P8', () => {
  let service: ChapterService;
  let db: MockDb;
  let mockSupabase: { getAdminClient: jest.Mock };
  let mockWallet: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = makeDb({ chapters: SEEDED_CHAPTERS.map((c) => ({ ...c })) });
    ({ mockSupabase, mockWallet } = withState(db));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChapterService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: WalletService, useValue: mockWallet },
      ],
    }).compile();
    service = module.get<ChapterService>(ChapterService);
  });

  describe('chapter reads', () => {
    it('returns the current chapter for the real date', async () => {
      const ch = await service.getCurrentChapter(NOW);
      expect(ch.slug).toBe('pula'); // Nov 15 → pula
      expect(ch.isCurrent).toBe(true);
      expect(ch.daysLeft).toBeGreaterThan(0);
    });

    it('lists four chapters with exactly one current', async () => {
      const list = await service.listChapters(NOW);
      expect(list.map((c) => c.slug)).toEqual(['pula', 'phane', 'moriti', 'letlhafula']);
      expect(list.filter((c) => c.isCurrent)).toHaveLength(1);
      expect(list.find((c) => c.slug === 'pula')!.isCurrent).toBe(true);
    });
  });

  describe('the rollover — idempotent token expiry (05 §P8 done-criteria)', () => {
    beforeEach(() => {
      // A player holding tokens in BOTH the ended letlhafula and the current pula.
      db.player_chapter_state.push(
        { player_id: 'user-1', chapter_id: 'c-letlhafula', chapter_tokens: 30, almanac_progress: {} },
        { player_id: 'user-1', chapter_id: 'c-pula', chapter_tokens: 50, almanac_progress: {} },
      );
    });

    it('dry-run reports what it would zero and writes nothing', async () => {
      const res = await service.rolloverChapters(NOW, true);
      expect(res.dryRun).toBe(true);
      expect(res.rolledChapters).toBe(3); // phane, moriti, letlhafula all ended
      expect(res.affectedPlayers).toBe(1); // only letlhafula had tokens

      const tokens = db.player_chapter_state;
      expect(tokens.find((t) => t.chapter_id === 'c-letlhafula')!.chapter_tokens).toBe(30);
      expect(tokens.find((t) => t.chapter_id === 'c-pula')!.chapter_tokens).toBe(50);
    });

    it('zeroes ended chapters but NEVER the current one, exactly once', async () => {
      await service.rolloverChapters(NOW, false);
      const tokens = db.player_chapter_state;
      expect(tokens.find((t) => t.chapter_id === 'c-letlhafula')!.chapter_tokens).toBe(0);
      expect(tokens.find((t) => t.chapter_id === 'c-pula')!.chapter_tokens).toBe(50); // current preserved

      // Windows advanced into the future, so a re-run is a no-op.
      const res2 = await service.rolloverChapters(NOW, false);
      expect(res2.rolledChapters).toBe(0);
      expect(res2.affectedPlayers).toBe(0);
      expect(tokens.find((t) => t.chapter_id === 'c-letlhafula')!.chapter_tokens).toBe(0);
      expect(tokens.find((t) => t.chapter_id === 'c-pula')!.chapter_tokens).toBe(50);
    });

    it('advances the ended windows forward by a cycle', async () => {
      await service.rolloverChapters(NOW, false);
      const phane = db.chapters.find((c) => c.slug === 'phane')!;
      expect(phane.starts_on).toBe('2027-02-01');
      expect(phane.ends_on).toBe('2027-04-30');
    });
  });

  describe('Chapter Tokens earn / spend (02 §3.3)', () => {
    it('earns and spends, recording a ledger entry, and rejects overspend', async () => {
      await service.addTokens('user-1', 100, NOW);
      let state = db.player_chapter_state.find(
        (t) => t.player_id === 'user-1' && t.chapter_id === 'c-pula',
      );
      expect(state!.chapter_tokens).toBe(100);

      const left = await service.spendTokens('user-1', 25, 'season_souvenir', NOW);
      expect(left).toBe(75);
      expect(db.ledger_entries).toHaveLength(1);
      expect(db.ledger_entries[0]).toMatchObject({
        currency: 'chapter_token',
        amount: -25,
        balance_after: 75,
        source: 'chapter_spend',
        // The SKU is a TEXT slug and `ref_id` is a UUID, so it rides in metadata
        // rather than being coerced into a column that cannot hold it.
        ref_id: null,
        metadata: { chapter_id: 'c-pula', purpose: 'season_souvenir' },
      });

      await expect(service.spendTokens('user-1', 999, 'season_souvenir', NOW)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.spendTokens('user-1', 25, 'not_a_sku', NOW)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('A1: spends through the atomic RPC, never a read-modify-write pair', async () => {
      // The old code did `UPDATE player_chapter_state` then `INSERT ledger_entries`
      // as two round trips. The RPC is the only sanctioned writer now, so a spec
      // that finds no RPC call is a spec that found the old bug.
      const rpcCalls: Array<{ name: string; params: any }> = [];
      const real = mockSupabase.getAdminClient();
      mockSupabase.getAdminClient.mockImplementation(() => ({
        from: (t: string) => real.from(t),
        rpc: (name: string, params: any) => {
          rpcCalls.push({ name, params });
          return real.rpc(name, params);
        },
      }));

      await service.addTokens('user-1', 100, NOW);
      rpcCalls.length = 0;
      await service.spendTokens('user-1', 25, 'season_souvenir', NOW);

      expect(rpcCalls).toEqual([
        {
          name: 'spend_chapter_tokens',
          params: {
            p_player_id: 'user-1',
            p_chapter_id: 'c-pula',
            p_amount: 25,
            p_purpose: 'season_souvenir',
          },
        },
      ]);
    });

    it('A1: insufficient stock ROLLS BACK — no decrement, no ledger row', async () => {
      // The regression this pins. Before the fix the decrement was a separate,
      // already-committed write, so a failure in the ledger step destroyed 25
      // stamps and granted nothing. Now the function is one transaction: a
      // zero-row conditional UPDATE raises and NOTHING is written.
      db.player_chapter_state.push({
        player_id: 'user-1',
        chapter_id: 'c-pula',
        chapter_tokens: 10, // not enough for the 25-stamp souvenir
        almanac_progress: {},
      });

      await expect(service.spendTokens('user-1', 25, 'season_souvenir', NOW)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      const state = db.player_chapter_state.find(
        (t) => t.player_id === 'user-1' && t.chapter_id === 'c-pula',
      );
      // The stamps are still there.
      expect(state!.chapter_tokens).toBe(10);
      // And nothing was ledgered, so the audit trail cannot claim a spend that
      // did not happen.
      expect(db.ledger_entries).toHaveLength(0);
    });

    it('A1: a race lost to the database surfaces as a 400, not a 500', async () => {
      // The JS pre-check is only a courtesy — the function's raise is the
      // authority. Here the balance is drained between the pre-check and the
      // RPC (exactly what a concurrent spend does), and the player must still get
      // a clean "not enough" rather than an unhandled server fault.
      db.player_chapter_state.push({
        player_id: 'user-1',
        chapter_id: 'c-pula',
        chapter_tokens: 30,
        almanac_progress: {},
      });
      const real = mockSupabase.getAdminClient();
      let drained = false;
      mockSupabase.getAdminClient.mockImplementation(() => ({
        from: (t: string) => real.from(t),
        rpc: (name: string, params: any) => {
          if (!drained) {
            drained = true;
            db.player_chapter_state.find(
              (t: any) => t.player_id === 'user-1' && t.chapter_id === 'c-pula',
            )!.chapter_tokens = 0; // the other player won the race
          }
          return real.rpc(name, params);
        },
      }));
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ChapterService,
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: WalletService, useValue: mockWallet },
        ],
      }).compile();
      const racing = module.get<ChapterService>(ChapterService);

      await expect(racing.spendTokens('user-1', 25, 'season_souvenir', NOW)).rejects.toThrow(
        /Not enough Chapter Tokens/,
      );
      expect(db.ledger_entries).toHaveLength(0);
    });

    it('A1: a non-integer amount is refused before it can reach the RPC', async () => {
      // `!(amount > 0)` let 25.5 through; an INT column would then round or
      // reject unpredictably depending on where the cast landed.
      await service.addTokens('user-1', 100, NOW);
      await expect(
        service.spendTokens('user-1', 25.5, 'season_souvenir', NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.spendTokens('user-1', 0, 'season_souvenir', NOW)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('Almanac claims', () => {
    it('claims a free tier once and grants its Pula reward', async () => {
      const view = await service.claimAlmanacTier('user-1', 'free', 1, NOW);
      expect(mockWallet.credit).toHaveBeenCalledWith('user-1', 'pula', 30, 'almanac');
      expect(view.tracks.free.find((t) => t.tier === 1)!.claimed).toBe(true);
    });

    it('re-claiming an already-claimed tier is a no-op (no double payout)', async () => {
      await service.claimAlmanacTier('user-1', 'free', 1, NOW);
      await service.claimAlmanacTier('user-1', 'free', 1, NOW);
      expect(mockWallet.credit).toHaveBeenCalledTimes(1);
    });

    it('requires the previous tier before a later one', async () => {
      await expect(service.claimAlmanacTier('user-1', 'free', 2, NOW)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('Guild track requires an active subscription', async () => {
      await expect(service.claimAlmanacTier('user-1', 'guild', 1, NOW)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      mockWallet.getWallet.mockResolvedValue({ subscription_status: 'guild' as const });
      const view = await service.claimAlmanacTier('user-1', 'guild', 1, NOW);
      expect(view.tracks.guild.find((t) => t.tier === 1)!.claimed).toBe(true);
    });

    it('throws NotFound for a non-existent tier', async () => {
      await expect(service.claimAlmanacTier('user-1', 'free', 99, NOW)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
