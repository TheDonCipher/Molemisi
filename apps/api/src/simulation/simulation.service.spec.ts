import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { WaterService } from '../water/water.service';
import { SupabaseService } from '../database/supabase.service';
import { makeDb, clientFor, type MockDb, type MockClient } from '../test/supabase-mock';

/**
 * P9 / I4 — the Auto-Collector must be PROVABLY incapable of earning Botho (05 §P9;
 * 02 §6.4 legal control). The Auto-Collector lives inside the offline-elapsed-time
 * pass on farm load, i.e. SimulationService.simulateFarm (which delegates crop growth
 * to WaterService.advanceFarmGrowth). If that pass ever credited Botho, it would do so
 * through the wallet_apply RPC with currency 'botho'. So this test runs a full farm
 * simulation for a Guild subscriber and asserts that RPC is never called with Botho.
 *
 * The WaterService is faked (it is not under test here) — the assertion is about the
 * host pass simulateFarm itself, plus the static fact (grep) that advanceFarmGrowth
 * likewise never touches Botho. Together that covers the entire Auto-Collector path.
 */

describe('SimulationService — I4 Auto-Collector never earns Botho', () => {
  let service: SimulationService;
  let db: MockDb;
  let client: MockClient;

  beforeEach(async () => {
    db = makeDb({
      player_wallets: [
        { player_id: 'u1', subscription_status: 'guild', subscription_expires_at: '2099-01-01T00:00:00Z' },
      ],
      farms: [
        {
          id: 'farm-1',
          last_simulated_at: '2026-09-01T00:00:00Z',
          season: 'spring',
          weather_state: 'clear',
          weather_temperature: 25,
          weather_humidity: 0.3,
          current_day: 1,
        },
      ],
    });
    client = clientFor(db);
    const fakeWater = {
      advanceFarmGrowth: jest.fn().mockResolvedValue({ cropsAdvanced: 2, cropsReady: 1 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        { provide: SupabaseService, useValue: { getAdminClient: () => client, getClient: () => client } },
        { provide: WaterService, useValue: fakeWater },
      ],
    }).compile();
    service = module.get(SimulationService);
  });

  it('runs the farm-load pass for a Guild subscriber without ever crediting Botho', async () => {
    const result = await service.simulateFarm('farm-1');

    // The pass actually did work (so the test is not vacuously passing on an early return).
    expect(result.cropsSimulated).toBe(2);
    expect(db.farms[0].last_simulated_at).not.toBe('2026-09-01T00:00:00Z');

    // No wallet movement ever happened for Botho during the Auto-Collector pass.
    const bothoMoves = client.rpcLog.filter(
      (c) => c.name === 'wallet_apply' && c.params.p_currency === 'botho',
    );
    expect(bothoMoves).toHaveLength(0);
  });
});
