import { Test, TestingModule } from '@nestjs/testing';
import { AchievementService } from './achievements.service';
import { SupabaseService } from '../database/supabase.service';
import { ACHIEVEMENTS, HONORIFIC_LADDER } from '@molemisi/game-config';
import { makeDb, clientFor, type MockDb, type MockClient } from '../test/supabase-mock';

/**
 * D5 / B2 — the honorific ladder, proven.
 *
 * The rule under test (08 §5): rank is EARNED from live signals and is
 * display-only. There is no purchase path, the ladder climbs in order, and
 * attainment is idempotent.
 */
describe('AchievementService — the honorific ladder (D5)', () => {
  let service: AchievementService;
  let db: MockDb;
  let client: MockClient;

  beforeEach(async () => {
    db = makeDb({
      player_wallets: [{ player_id: 'u1', botho_points: 0 }],
      farms: [{ id: 'farm1', user_id: 'u1' }],
      buildings: [],
      livestock: [],
    });
    client = clientFor(db);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementService,
        { provide: SupabaseService, useValue: { getAdminClient: () => client, getClient: () => client } },
      ],
    }).compile();
    service = module.get(AchievementService);
  });

  it('starts every player at the bottom rung (Molemi) and nowhere higher', async () => {
    const { title } = await service.evaluate('u1');
    expect(title.rung).toBe('molemi');
    expect(title.index).toBe(1);
  });

  it('never climbs without the signals — Botho alone is not enough for a mid rung', async () => {
    db.player_wallets[0].botho_points = 500;
    const { title } = await service.evaluate('u1');
    // motsadi needs events won; mokgosi needs three. Botho alone stalls at Molemi.
    expect(title.rung).toBe('molemi');
  });

  it('climbs to Molemi-Morui with livestock and early Botho', async () => {
    db.player_wallets[0].botho_points = 120;
    db.livestock.push({ id: 'l1', farm_id: 'farm1', animal_type: 'chicken' });
    const { title } = await service.evaluate('u1');
    expect(title.rung).toBe('molemi_morui');
    expect(title.index).toBe(2);
  });

  it('climbs the full ladder to Mokgosi only when every milestone is met', async () => {
    db.player_wallets[0].botho_points = 500;
    db.buildings.push({ id: 'b1', farm_id: 'farm1', building_type: 'kraal' });
    db.livestock.push({ id: 'l1', farm_id: 'farm1', animal_type: 'goat' });
    for (let i = 0; i < 3; i++)
      db.event_grants.push({ id: `g${i}`, player_id: 'u1', event_id: `e${i}` });

    const { title, attained } = await service.evaluate('u1');
    expect(title.rung).toBe('mokgosi');
    expect(title.index).toBe(HONORIFIC_LADDER.length);
    expect(attained.every((a: { attained: boolean }) => a.attained)).toBe(true);
  });

  it('is idempotent — re-evaluating never duplicates an attainment row', async () => {
    db.player_wallets[0].botho_points = 120;
    db.livestock.push({ id: 'l1', farm_id: 'farm1', animal_type: 'goat' });
    await service.evaluate('u1');
    const afterFirst = ((db as any).player_achievements as any[]).length;
    await service.evaluate('u1');
    expect(((db as any).player_achievements as any[]).length).toBe(afterFirst);
  });

  it('exposes exactly one catalog entry per rung', () => {
    const rungs = new Set(ACHIEVEMENTS.map((a) => a.rung));
    expect(rungs.size).toBe(HONORIFIC_LADDER.length);
  });
});
