import { Test, TestingModule } from '@nestjs/testing';
import { FarmsService } from './farms.service';
import { SupabaseService } from '../database/supabase.service';
import { SimulationService } from '../simulation/simulation.service';
import { WalletService } from '../wallet/wallet.service';
import { makeDb, clientFor, type MockDb } from '../test/supabase-mock';
import { BOTHO_DAILY_CAP } from '@molemisi/game-config';

/**
 * FarmsService — the welcome-back tick.
 *
 * `getFarmForUser` had NO test at all before this file, which is how a
 * `Math.floor(awayMinutes / 1440)` sat in the Botho catch-up (03 §9.4)
 * systematically under-crediting returning players and nothing noticed.
 *
 * The rule being pinned (L5): a missed day credits 25% of the daily cap, at
 * most 3 days, and always through `creditBothoCapped` so the legal daily cap
 * (I4) is never bypassed.
 */
describe('FarmsService — Botho catch-up on return (03 §9.4, L5)', () => {
  let service: FarmsService;
  let db: MockDb;
  const creditBothoCapped = jest.fn().mockResolvedValue(0);

  const simResult = (appliedHours: number) => ({
    cropsSimulated: 0,
    cropsAdvanced: 0,
    cropsWithered: 0,
    cropsReady: 0,
    cropsStalled: 0,
    livestockSimulated: 0,
    livestockFed: 0,
    livestockProducts: 0,
    buildingsSimulated: 0,
    buildingsCompleted: 0,
    buildingsMaintenance: 0,
    weather: null,
    seasonChanged: false,
    newSeason: null,
    awayHours: appliedHours,
    appliedHours: Math.min(appliedHours, 24),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    creditBothoCapped.mockResolvedValue(0);

    db = makeDb({ farms: [], farm_plots: [], buildings: [] });
    const client = clientFor(db);
    const supabase = { getAdminClient: () => client, getClient: () => client };
    const simulation = {
      simulateFarm: jest.fn(async (_farmId: string, now?: Date) => {
        const farm = db.farms[0] as { last_simulated_at?: string } | undefined;
        const last = farm?.last_simulated_at ? new Date(farm.last_simulated_at).getTime() : Date.now();
        const hours = Math.max(0, ((now ?? new Date()).getTime() - last) / 3600_000);
        return simResult(hours) as never;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmsService,
        { provide: SupabaseService, useValue: supabase },
        { provide: SimulationService, useValue: simulation },
        { provide: WalletService, useValue: { creditBothoCapped } },
      ],
    }).compile();

    service = module.get<FarmsService>(FarmsService);
  });

  /** Seed a farm that was last simulated `awayHours` ago, then read it back. */
  const readAfterAwayHours = async (awayHours: number) => {
    db.farms = [
      {
        id: 'farm-1',
        user_id: 'user-1',
        name: 'Test Farm',
        plot_count: 4,
        weather_state: 'clear',
        weather_temperature: 25,
        weather_humidity: 40,
        season: 'pula',
        current_day: 1,
        last_simulated_at: new Date(Date.now() - awayHours * 3600_000).toISOString(),
      },
    ];
    db.farm_plots = [];
    db.buildings = [];
    return service.getFarmForUser('user-1');
  };

  /** The Botho amount the wallet was asked to credit for a given absence. */
  const credited = () => creditBothoCapped.mock.calls[0]?.[1] ?? 0;

  const oneDay = Math.round(BOTHO_DAILY_CAP * 0.25);

  it('credits nothing for a short absence', async () => {
    await readAfterAwayHours(2);
    expect(creditBothoCapped).not.toHaveBeenCalled();
  });

  it('credits exactly one day at 24h', async () => {
    await readAfterAwayHours(24);
    expect(credited()).toBe(oneDay);
  });

  /**
   * THE REGRESSION. 47h away spans two calendar days of absence and must credit
   * two days. The old `Math.floor(awayMinutes / 1440)` computed floor(1.958) = 1
   * and silently threw half the catch-up away — for essentially every real
   * return, which is the population the feature exists for.
   */
  it('credits two days at 47h (Math.floor lost one)', async () => {
    await readAfterAwayHours(47);
    expect(credited()).toBe(Math.round(BOTHO_DAILY_CAP * 0.5));
  });

  it('credits two days at 36h', async () => {
    await readAfterAwayHours(36);
    expect(credited()).toBe(Math.round(BOTHO_DAILY_CAP * 0.5));
  });

  it('never credits more than three days, however long the absence', async () => {
    await readAfterAwayHours(72);
    expect(credited()).toBe(Math.round(BOTHO_DAILY_CAP * 0.75));

    creditBothoCapped.mockClear();
    await readAfterAwayHours(24 * 30);
    expect(credited()).toBe(Math.round(BOTHO_DAILY_CAP * 0.75));
  });

  it('goes through the capped path so today’s legal cap still governs', async () => {
    await readAfterAwayHours(72);
    expect(creditBothoCapped).toHaveBeenCalledTimes(1);
    expect(creditBothoCapped.mock.calls[0]?.[2]).toBe('botho_catchup');
  });

  it('never asks for a negative credit when the clock reads backwards', async () => {
    db.farms = [
      {
        id: 'farm-1',
        user_id: 'user-1',
        name: 'Test Farm',
        plot_count: 4,
        // last_simulated_at in the FUTURE => awayMinutes goes negative.
        last_simulated_at: new Date(Date.now() + 5 * 3600_000).toISOString(),
      },
    ];
    db.farm_plots = [];
    db.buildings = [];
    await service.getFarmForUser('user-1');
    expect(creditBothoCapped).not.toHaveBeenCalled();
  });

  it('reports the credit it just paid in the welcome-back summary', async () => {
    creditBothoCapped.mockResolvedValueOnce(oneDay);
    const result = await readAfterAwayHours(25);
    // The sheet must never under-report what it just credited.
    expect(result.simulation?.bothoCatchUp).toBe(oneDay);
  });
});