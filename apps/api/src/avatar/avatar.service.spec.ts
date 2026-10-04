import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AvatarService } from './avatar.service';
import { SupabaseService } from '../database/supabase.service';
import { AVATAR_HAT, AVATAR_LAYERS } from '@molemisi/game-config';
import { makeDb, clientFor, type MockDb, type MockClient } from '../test/supabase-mock';

/**
 * D10 / B4 — the 3-layer avatar, proven.
 *
 * The rules under test (08 §10): the base is chosen ONCE, the store swaps the
 * OUTFIT layer only, and the Farmer's Hat is always present and never a SKU.
 */
describe('AvatarService — the 3-layer avatar (D10)', () => {
  let service: AvatarService;
  let db: MockDb;
  let client: MockClient;

  beforeEach(async () => {
    db = makeDb({ player_cosmetics: [] });
    client = clientFor(db);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvatarService,
        { provide: SupabaseService, useValue: { getAdminClient: () => client, getClient: () => client } },
      ],
    }).compile();
    service = module.get(AvatarService);
  });

  it('always wears the Farmer’s Hat, even before creation', async () => {
    const view = await service.getAvatar('u1');
    expect(view.created).toBe(false);
    expect(view.hat.key).toBe(AVATAR_HAT.key);
    expect(view.layers).toEqual(AVATAR_LAYERS);
  });

  it('chooses the base once and refuses a second choice', async () => {
    await service.createAvatar('u1', 'base_kgale');
    await expect(service.createAvatar('u1', 'base_phane')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an unknown base key', async () => {
    await expect(service.createAvatar('u1', 'not_a_base')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('equips an OWNED outfit cosmetic, and only that layer changes', async () => {
    await service.createAvatar('u1', 'base_sesana');
    db.player_cosmetics.push({ id: 'pc1', player_id: 'u1', cosmetic_id: 'mogolo_hat' });

    const view = await service.equipOutfit('u1', 'mogolo_hat');
    expect(view.outfitKey).toBe('mogolo_hat');
    // Base and hat are untouched by the store swap.
    expect(view.baseKey).toBe('base_sesana');
    expect(view.hat.key).toBe(AVATAR_HAT.key);
  });

  it('refuses to equip an outfit the player does not own', async () => {
    await service.createAvatar('u1', 'base_sesana');
    await expect(service.equipOutfit('u1', 'mogolo_hat')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses a cosmetic that is not an outfit', async () => {
    await service.createAvatar('u1', 'base_sesana');
    db.player_cosmetics.push({ id: 'pc1', player_id: 'u1', cosmetic_id: 'market_frame_bush' });
    await expect(service.equipOutfit('u1', 'market_frame_bush')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows the outfit layer to be cleared (base + hat remain)', async () => {
    await service.createAvatar('u1', 'base_sesana');
    db.player_cosmetics.push({ id: 'pc1', player_id: 'u1', cosmetic_id: 'mogolo_hat' });
    await service.equipOutfit('u1', 'mogolo_hat');
    const cleared = await service.equipOutfit('u1', null);
    expect(cleared.outfitKey).toBeNull();
    expect(cleared.hat.key).toBe(AVATAR_HAT.key);
  });
});
