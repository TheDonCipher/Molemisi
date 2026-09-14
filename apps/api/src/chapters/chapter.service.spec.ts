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

function clientFor(db: MockDb) {
  return {
    from: (table: string) => new MockBuilder((db as any)[table], table, db),
  };
}

const SEEDED_CHAPTERS = [
  { id: 'c-pula', slug: 'pula', name: 'Season of Rain', setswana: 'Sekala sa Pula', starts_on: '2026-11-01', ends_on: '2027-01-31' },
  { id: 'c-phane', slug: 'phane', name: 'Season of Mophane', setswana: 'Sekala sa Phane', starts_on: '2026-02-01', ends_on: '2026-04-30' },
  { id: 'c-moriti', slug: 'moriti', name: 'Season of Shade', setswana: 'Sekala sa Moriti', starts_on: '2026-05-01', ends_on: '2026-07-31' },
  { id: 'c-letlhafula', slug: 'letlhafula', name: 'Season of Harvest', setswana: 'Sekala sa Letlhafula', starts_on: '2026-08-01', ends_on: '2026-10-31' },
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

      const left = await service.spendTokens('user-1', 40, 'cosmetic', NOW);
      expect(left).toBe(60);
      expect(db.ledger_entries).toHaveLength(1);
      expect(db.ledger_entries[0]).toMatchObject({
        currency: 'chapter_token',
        amount: -40,
        balance_after: 60,
        source: 'chapter_spend',
      });

      await expect(service.spendTokens('user-1', 999, 'cosmetic', NOW)).rejects.toBeInstanceOf(
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
