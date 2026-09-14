import { Test, TestingModule } from '@nestjs/testing';
import { MonetisationService } from './monetisation.service';
import { WalletService } from '../wallet/wallet.service';
import { SupabaseService } from '../database/supabase.service';
import { makeDb, clientFor, type MockDb, type MockClient } from '../test/supabase-mock';

/**
 * P9 — the two monetisation jobs (05 §P9 "Jobs").
 *
 * Proves:
 *   - flipLapsedSubscriptions flips ONLY lapsed Guild subscribers, and re-running is a no-op
 *   - grantWeeklyPulaStones grants one stone per subscriber per week, idempotent within a week,
 *     and grants again the following week
 *   - the weekly key is a Botswana-time Monday (so "this week" is the player's week)
 */

const NOW = new Date('2026-09-10T09:00:00Z'); // a Thursday; UTC+2 week starts Mon 2026-09-07
const NEXT_WEEK = new Date('2026-09-18T09:00:00Z'); // following Thursday; week starts Mon 2026-09-14

describe('MonetisationService — P9 jobs', () => {
  let service: MonetisationService;
  let db: MockDb;
  let client: MockClient;

  beforeEach(async () => {
    // onModuleInit (boot catch-up) runs against an empty db here, so it flips nothing.
    db = makeDb();
    client = clientFor(db);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonetisationService,
        WalletService,
        { provide: SupabaseService, useValue: { getAdminClient: () => client, getClient: () => client } },
      ],
    }).compile();
    service = module.get(MonetisationService);
  });

  describe('flipLapsedSubscriptions (daily)', () => {
    it('flips only lapsed Guild subscribers and is idempotent', async () => {
      db.player_wallets = [
        { player_id: 'u1', subscription_status: 'guild', subscription_expires_at: '2026-01-01T00:00:00Z' },
        { player_id: 'u2', subscription_status: 'guild', subscription_expires_at: '2099-01-01T00:00:00Z' },
        { player_id: 'u3', subscription_status: 'free' },
        { player_id: 'u4', subscription_status: 'guild', subscription_expires_at: '2026-01-01T00:00:00Z' },
      ];

      const res = await service.flipLapsedSubscriptions(NOW);
      expect(res.flipped).toBe(2); // u1 + u4

      expect(db.player_wallets.find((w) => w.player_id === 'u1')!.subscription_status).toBe('free');
      expect(db.player_wallets.find((w) => w.player_id === 'u1')!.subscription_expires_at).toBeNull();
      // Active subscriber untouched — auto-collect + storage bonus stay on.
      expect(db.player_wallets.find((w) => w.player_id === 'u2')!.subscription_status).toBe('guild');
      expect(db.player_wallets.find((w) => w.player_id === 'u3')!.subscription_status).toBe('free');

      // Re-run is a no-op.
      const res2 = await service.flipLapsedSubscriptions(NOW);
      expect(res2.flipped).toBe(0);
    });
  });

  describe('grantWeeklyPulaStones (weekly)', () => {
    function seedSubscribers() {
      db.player_wallets = [
        { player_id: 'u1', subscription_status: 'guild', subscription_expires_at: '2099-01-01T00:00:00Z' },
        { player_id: 'u2', subscription_status: 'guild', subscription_expires_at: '2099-01-01T00:00:00Z' },
        { player_id: 'u3', subscription_status: 'free' },
      ];
    }

    it('grants one stone per Guild subscriber this week, and not to free players', async () => {
      seedSubscribers();
      const res = await service.grantWeeklyPulaStones(NOW);
      expect(res.granted).toBe(2);

      const stones = db.player_boosts.filter((b) => b.slug === 'pula_stone' && b.source === 'guild_weekly');
      expect(stones).toHaveLength(2);
      expect(stones.every((s) => s.week_start === '2026-09-07')).toBe(true);
      // Free player got nothing.
      expect(db.player_boosts.filter((b) => b.player_id === 'u3')).toHaveLength(0);
    });

    it('is idempotent within a week but grants again the next week', async () => {
      seedSubscribers();
      await service.grantWeeklyPulaStones(NOW);
      const weekA = db.player_boosts[0]!.week_start;

      // Same week, re-run: no new stones.
      const res2 = await service.grantWeeklyPulaStones(NOW);
      expect(res2.granted).toBe(0);
      expect(db.player_boosts.filter((b) => b.slug === 'pula_stone')).toHaveLength(2);

      // Following week: granted again, under a new week key.
      const res3 = await service.grantWeeklyPulaStones(NEXT_WEEK);
      expect(res3.granted).toBe(2);
      expect(db.player_boosts.filter((b) => b.slug === 'pula_stone')).toHaveLength(4);
      expect(db.player_boosts.filter((b) => b.week_start !== weekA)).toHaveLength(2);
    });
  });
});
