import { Test, TestingModule } from '@nestjs/testing';
import { MonetisationService } from './monetisation.service';
import { WalletService } from '../wallet/wallet.service';
import { SupabaseService } from '../database/supabase.service';
import { makeDb, clientFor, type MockDb, type MockClient } from '../test/supabase-mock';


/**
 * P9 - the subscription-expiry job (05 P9 "Jobs").
 *
 * Proves:
 *   - flipLapsedSubscriptions flips ONLY lapsed subscribers; re-running is a no-op
 *   - docs/34 3.3: NO JOB GRANTS A BOOST. The weekly Pula Stone grant was deleted
 *     on 2026-10-01; the assertion at the end is what stops one creeping back.
 */

const NOW = new Date('2026-09-10T09:00:00Z'); // a Thursday; UTC+2 week starts Mon 2026-09-07

describe('MonetisationService - P9 jobs', () => {
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
      // Active subscriber untouched  -- -" -a- -- -a¬-&¡ -a-¬ -- --š-¬ -a- auto-collect + storage bonus stay on.
      // Active subscriber untouched - the helper and storage bonus stay on.
      expect(db.player_wallets.find((w) => w.player_id === 'u2')!.subscription_status).toBe('guild');
      expect(db.player_wallets.find((w) => w.player_id === 'u3')!.subscription_status).toBe('free');

      // Re-run is a no-op.
      const res2 = await service.flipLapsedSubscriptions(NOW);
      expect(res2.flipped).toBe(0);
    });
  });

  // docs/34 3.3 (2026-10-01): the weekly Pula Stone grant and its
  // admin/grant-weekly route are deleted. Boosts were cut, so no job may write
  // a player_boosts row - a subscription paying a broken item on a timer is
  // worse than paying nothing.
  it('writes no boost rows, now that the weekly grant job is gone', async () => {
    db.player_wallets = [
      { player_id: 'u1', subscription_status: 'guild', subscription_expires_at: '2099-01-01T00:00:00Z' },
    ];
    await service.flipLapsedSubscriptions(NOW);
    expect(db.player_boosts).toHaveLength(0);
    expect((service as unknown as Record<string, unknown>).grantWeeklyPulaStones).toBeUndefined();
  });
});
