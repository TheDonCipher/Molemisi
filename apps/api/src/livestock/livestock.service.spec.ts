import { LivestockService } from './livestock.service';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { InventoryService } from '../inventory/inventory.service';
import { makeFakeSupabase, type FakeResult } from '../test/fake-supabase';
import { BadRequestException } from '@nestjs/common';

/**
 * G4/G1 — the collect path is where the livestock economy actually pays out, so
 * the two invariants it must never break are pinned here:
 *   1. product AND manure are granted in ONE combined slot check (no window in
 *      which the product landed and the byproduct did not — that would duplicate
 *      the product on retry);
 *   2. when the store cannot take both, nothing is granted and the animal stays
 *      product_ready.
 */
describe('LivestockService.collectProduct', () => {
  const animalRow = {
    id: 'a1',
    farm_id: 'f1',
    animal_type: 'chicken',
    name: null,
    hunger: 0.6,
    health: 1,
    happiness: 0.7,
    product_ready: true,
    product_timer_hours: 12,
    is_sick: false,
    last_fed_at: '2026-09-23T10:00:00.000Z',
    last_pet_at: null,
  };

  function makeService(inventory: Partial<Record<string, unknown>> = {}) {
    const sequence: FakeResult[] = [
      { data: { user_id: 'u1' }, error: null }, // verifyFarmOwnership
      { data: animalRow, error: null },
    ];
    const { client, calls } = makeFakeSupabase(sequence);
    const inv = {
      resolvePlayerId: jest.fn().mockResolvedValue('p1'),
      addItems: jest.fn().mockResolvedValue([{ added: 2, overflow: 0 }, { added: 1, overflow: 0 }]),
      addItem: jest.fn().mockResolvedValue({ added: 1, overflow: 0 }),
      ...inventory,
    };
    const svc = new LivestockService(
      { getAdminClient: () => client } as unknown as SupabaseService,
      {} as unknown as WalletService,
      inv as unknown as InventoryService,
    );
    return { svc, calls, inv };
  }

  it('G1: grants the product AND manure in one combined addItems call', async () => {
    const { svc, inv } = makeService();

    const res = await svc.collectProduct('f1', 'u1', 'a1');

    expect(inv.addItems).toHaveBeenCalledTimes(1);
    expect(inv.addItems).toHaveBeenCalledWith('p1', 'f1', [
      { slug: 'eggs', qty: 2 },
      { slug: 'manure', qty: 1 },
    ]);
    expect(res).toEqual({
      productType: 'egg',
      quantity: 2,
      xpGained: 8,
      byproduct: { slug: 'manure', quantity: 1 },
    });
  });

  it('G4/G1: a store that cannot take both fails the whole collect — nothing written', async () => {
    const { svc, calls, inv } = makeService({
      addItems: jest
        .fn()
        .mockRejectedValue(new BadRequestException('Storage is full — upgrade your storage or free a slot.')),
    });

    await expect(svc.collectProduct('f1', 'u1', 'a1')).rejects.toThrow(BadRequestException);

    // The product timer is untouched: the animal stays product_ready and the
    // player can free a slot and collect again without anything duplicating.
    expect(calls.filter((c) => c.table === 'livestock' && c.method === 'update')).toHaveLength(0);
    expect(inv.addItems).toHaveBeenCalledTimes(1);
  });
});