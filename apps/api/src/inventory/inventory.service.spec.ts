import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { makeFakeSupabase, type FakeResult } from '../test/fake-supabase';

/**
 * P3's done-criterion for inventory (05 §P3, 03 §2). The `player_inventory` table is
 * the single canonical store, and `InventoryService` is its only writer. These tests
 * pin the two invariants that, if they ever silently break, ruin the game: the per-type
 * stack cap and the storage slot cap. Both are enforced in exactly one place — here.
 */

function buildService(sequence: FakeResult[]) {
  const { client, from } = makeFakeSupabase(sequence);
  const supabaseService = { getAdminClient: () => client } as unknown as SupabaseService;
  const wallet = {} as WalletService; // InventoryService reads wallets via SQL, not the service
  const service = new InventoryService(supabaseService, wallet);
  return { service, from };
}

const DEF = { data: { id: 'def-id' }, error: null };
const NO_ROW = { data: null, error: null };

describe('InventoryService — stack cap & overflow (03 §2)', () => {
  it('rejects an unknown item slug before any DB write', async () => {
    const { service } = buildService([]);
    await expect(service.addItem('p1', 'f1', 'not_a_real_item', 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('overflows when the existing stack is already full', async () => {
    // itemDefId -> existing(quantity 50, maxStack 50) -> spaceInStack 0 -> nothing fits.
    const { service } = buildService([
      DEF,
      { data: { id: 'row-1', quantity: 50 }, error: null },
    ]);
    const res = await service.addItem('p1', 'f1', 'sorghum', 10);
    expect(res).toEqual({ added: 0, overflow: 10 });
  });

  it('adds up to the remaining stack space and reports no overflow', async () => {
    // itemDefId -> existing(quantity 5) -> update.
    const { service } = buildService([
      DEF,
      { data: { id: 'row-1', quantity: 5 }, error: null },
      { data: { id: 'row-1', quantity: 15 }, error: null },
    ]);
    const res = await service.addItem('p1', 'f1', 'sorghum', 10);
    expect(res).toEqual({ added: 10, overflow: 0 });
  });
});

describe('InventoryService — storage slot cap (02 §6.5, R7)', () => {
  it('accepts a brand-new item type when the storage is not full', async () => {
    // itemDefId -> existing(null) -> getUsedSlots({data:[]}) -> buildings(level1)
    //   -> farms(user_id) -> wallets(free) -> insert.
    const usedEmpty: FakeResult = { data: [], error: null };
    const { service } = buildService([
      DEF,
      NO_ROW,
      usedEmpty,
      { data: { level: 1 }, error: null },
      { data: { user_id: 'p1' }, error: null },
      { data: { subscription_status: 'free' }, error: null },
      { data: null, error: null },
    ]);
    const res = await service.addItem('p1', 'f1', 'sorghum', 10);
    expect(res).toEqual({ added: 10, overflow: 0 });
  });

  it('throws when the storage cap is reached (Basket = 24 distinct types)', async () => {
    // 24 distinct non-tool rows already held -> used == 24 == cap -> reject.
    const usedFull: FakeResult = {
      data: Array.from({ length: 24 }, () => ({ item_definitions: { is_tool: false } })),
      error: null,
    };
    const { service } = buildService([
      DEF,
      NO_ROW,
      usedFull,
      { data: { level: 1 }, error: null },
      { data: { user_id: 'p1' }, error: null },
      { data: { subscription_status: 'free' }, error: null },
    ]);
    await expect(service.addItem('p1', 'f1', 'sorghum', 1)).rejects.toThrow(
      'Storage is full',
    );
  });

  it('applies the Guild +50% bonus to the slot cap (R7 / C8)', async () => {
    // level 2 -> base 48; guild -> 72.
    const { service } = buildService([
      { data: { level: 2 }, error: null },
      { data: { user_id: 'p1' }, error: null },
      { data: { subscription_status: 'guild' }, error: null },
    ]);
    const cap = await service.getStorageCap('f1');
    expect(cap).toBe(72);
  });
});

describe('InventoryService — tools are equipment, not storage (F15)', () => {
  it('owns a tool once and never consumes a storage slot', async () => {
    const { service, from } = buildService([
      { data: { id: 'tool-id' }, error: null }, // itemDefId
      { data: null, error: null }, // upsert
    ]);
    const res = await service.addItem('p1', 'f1', 'mogoma', 1);
    expect(res).toEqual({ added: 1, overflow: 0 });
    // Critical: no storage-cap query is ever issued for a tool.
    expect(from).not.toHaveBeenCalledWith('buildings');
    expect(from).not.toHaveBeenCalledWith('player_wallets');
  });
});

describe('InventoryService — removal', () => {
  it('throws when the player does not hold enough', async () => {
    const { service } = buildService([
      DEF,
      NO_ROW, // no existing row
    ]);
    await expect(service.removeItem('p1', 'sorghum', 5)).rejects.toThrow('Not enough');
  });

  it('decrements without erroring when enough is held', async () => {
    const { service } = buildService([
      DEF,
      { data: { id: 'row-1', quantity: 5 }, error: null },
      { data: null, error: null }, // update
    ]);
    await expect(service.removeItem('p1', 'sorghum', 3)).resolves.toBeUndefined();
  });

  it('reports the held count via countOwned', async () => {
    const { service } = buildService([
      DEF,
      { data: { quantity: 7 }, error: null },
    ]);
    expect(await service.countOwned('p1', 'sorghum')).toBe(7);
  });
});
