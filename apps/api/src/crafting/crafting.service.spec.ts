import { BadRequestException } from '@nestjs/common';
import { CraftingService } from './crafting.service';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { WalletService } from '../wallet/wallet.service';
import { makeFakeSupabase, type FakeResult } from '../test/fake-supabase';
import { batchFee, RECIPES, RECIPE_SLUGS } from '@molemisi/game-config';

/**
 * P3's done-criterion for crafting (05 §P3, 03 §3). The crucial invariants:
 *   - substitution is a VISIBLE choice (Setena: any two of clay/stone, mixed allowed)
 *   - Botho gates Bupi/Borotho at >= 100 (02 §6.4)
 *   - a rejected craft never deducts inputs OR fee (no partial deduction)
 *   - concurrent slots are capped by the Workshop tier
 *   - variance only ever surprises the player upward (bonus, never loss)
 */

function buildService(sequence: FakeResult[]) {
  const { client, from } = makeFakeSupabase(sequence);
  const supabaseService = { getAdminClient: () => client } as unknown as SupabaseService;
  const inventory = {
    ownedMap: jest.fn().mockResolvedValue({}),
    hasItems: jest.fn().mockResolvedValue(true),
    removeItem: jest.fn().mockResolvedValue(undefined),
    addItem: jest.fn().mockResolvedValue({ added: 1, overflow: 0 }),
    resolvePlayerId: jest.fn().mockResolvedValue('p1'),
  } as unknown as InventoryService;
  const wallet = {
    getBotho: jest.fn().mockResolvedValue(0),
    canAffordPula: jest.fn().mockResolvedValue(true),
    spendPula: jest.fn().mockResolvedValue(1000),
    credit: jest.fn().mockResolvedValue(1000),
  } as unknown as WalletService;
  const service = new CraftingService(supabaseService, inventory, wallet);
  return { service, inventory, wallet, from };
}

describe('batchFee — sub-linear batch pricing (03 §3.2)', () => {
  it('scales 1x / 2.5x / 4x with the batch, rounded', () => {
    expect(batchFee(RECIPES.poleto, 1)).toBe(1); // 1 * 1
    expect(batchFee(RECIPES.poleto, 3)).toBe(3); // round(1 * 2.5) = 3
    expect(batchFee(RECIPES.poleto, 6)).toBe(4); // 1 * 4
    expect(batchFee(RECIPES.setena, 6)).toBe(8); // 2 * 4
  });
});

describe('CraftingService — validation & gates', () => {
  it('rejects a batch size not in {1,3,6}', async () => {
    const { service } = buildService([]);
    await expect(service.startCraft('p1', 'f1', 'poleto', 2)).rejects.toThrow(
      'Batch size must be 1, 3 or 6',
    );
  });

  it('gates Bupi behind Botho >= 100', async () => {
    const { service, wallet } = buildService([]);
    wallet.getBotho = jest.fn().mockResolvedValue(50);
    await expect(service.startCraft('p1', 'f1', 'bupi', 1)).rejects.toThrow(
      'Requires Botho 100 to unlock',
    );
    expect(wallet.getBotho).toHaveBeenCalledWith('p1');
  });
});

describe('CraftingService — no partial deduction (05 §P3)', () => {
  it('does not consume inputs or charge a fee when the player cannot afford it', async () => {
    const { service, inventory, wallet } = buildService([]);
    inventory.ownedMap = jest.fn().mockResolvedValue({ wood: 10 });
    inventory.hasItems = jest.fn().mockResolvedValue(true);
    wallet.canAffordPula = jest.fn().mockResolvedValue(false);

    await expect(service.startCraft('p1', 'f1', 'poleto', 1)).rejects.toThrow(
      'Insufficient Pula for the crafting fee',
    );
    expect(inventory.removeItem).not.toHaveBeenCalled();
    expect(wallet.spendPula).not.toHaveBeenCalled();
  });
});

describe('CraftingService — concurrent slot cap (C22)', () => {
  it('rejects a third job when only two slots are unlocked and both busy', async () => {
    const { service, inventory, wallet, from } = buildService([
      { data: { level: 2 }, error: null }, // Workshop tier 2 -> 2 slots
      { data: [{ slot_index: 0 }, { slot_index: 1 }], error: null }, // both occupied
    ]);
    inventory.ownedMap = jest.fn().mockResolvedValue({ wood: 10 });
    inventory.hasItems = jest.fn().mockResolvedValue(true);
    wallet.canAffordPula = jest.fn().mockResolvedValue(true);

    await expect(service.startCraft('p1', 'f1', 'poleto', 1)).rejects.toThrow(
      'All crafting slots are busy',
    );
    expect(inventory.removeItem).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith('buildings');
    expect(from).toHaveBeenCalledWith('crafting_jobs');
  });
});

describe('CraftingService — substitution (03 §3.3)', () => {
  it('consumes a mixed clay + stone pair for Setena', async () => {
    // buildings(1 slot) -> crafting_jobs(empty) -> crafting_recipes(id) -> job insert.
    const { service, inventory, wallet } = buildService([
      { data: { level: 1 }, error: null },
      { data: [], error: null },
      { data: { id: 'r-setena' }, error: null },
      { data: { id: 'job-1', started_at: '2024-01-01T00:00:00Z' }, error: null },
    ]);
    inventory.ownedMap = jest.fn().mockResolvedValue({ clay: 5, stone: 5 });
    inventory.hasItems = jest.fn().mockResolvedValue(true);
    wallet.canAffordPula = jest.fn().mockResolvedValue(true);

    const res = await service.startCraft('p1', 'f1', 'setena', 1, { clay: 1, stone: 1 });
    expect(res.jobId).toBe('job-1');
    expect(inventory.removeItem).toHaveBeenCalledWith('p1', 'clay', 1);
    expect(inventory.removeItem).toHaveBeenCalledWith('p1', 'stone', 1);
    expect(wallet.spendPula).toHaveBeenCalledWith('p1', 2, 'crafting_fee'); // setena feePula 2 *1
  });

  it('charges the 6x batch fee (setena qty 6 -> fee 8)', async () => {
    const { service, inventory, wallet } = buildService([
      { data: { level: 1 }, error: null },
      { data: [], error: null },
      { data: { id: 'r-setena' }, error: null },
      { data: { id: 'job-1', started_at: '2024-01-01T00:00:00Z' }, error: null },
    ]);
    inventory.ownedMap = jest.fn().mockResolvedValue({ clay: 99, stone: 99 });
    inventory.hasItems = jest.fn().mockResolvedValue(true);
    wallet.canAffordPula = jest.fn().mockResolvedValue(true);

    await service.startCraft('p1', 'f1', 'setena', 6);
    expect(wallet.canAffordPula).toHaveBeenCalledWith('p1', 8);
  });

  it('scales INPUTS with the batch — 6x output must cost 6x materials', async () => {
    // Regression guard. Collect pays out `outputQty * qty`, but startCraft used to
    // consume `defaultInputsFor()` verbatim, which is PER UNIT — so a batch of 6
    // minted six bricks from two clay. The old test only asserted the FEE scaled,
    // and `hasItems` was mocked true, so nothing caught it.
    const startBatch = async (qty: number) => {
      const { service, inventory } = buildService([
        { data: { level: 1 }, error: null }, // buildings -> 1 slot
        { data: [], error: null }, // crafting_jobs -> none occupied
        { data: { id: 'r-setena' }, error: null },
        { data: { id: 'job-1', started_at: '2024-01-01T00:00:00Z' }, error: null },
      ]);
      inventory.ownedMap = jest.fn().mockResolvedValue({ clay: 999, stone: 999 });
      // `chosenInputs` is per unit: 2 clay per brick.
      await service.startCraft('p1', 'f1', 'setena', qty, { clay: 2 });
      return inventory.removeItem as unknown as jest.Mock;
    };

    expect(await startBatch(1)).toHaveBeenCalledWith('p1', 'clay', 2); // 2 * 1
    expect(await startBatch(3)).toHaveBeenCalledWith('p1', 'clay', 6); // 2 * 3
    expect(await startBatch(6)).toHaveBeenCalledWith('p1', 'clay', 12); // 2 * 6
  });

  it('rejects a chosenInputs total that does not match the batch', async () => {
    const { service, inventory } = buildService([
      { data: { level: 1 }, error: null },
      { data: [], error: null },
      { data: { id: 'r-setena' }, error: null },
      { data: { id: 'job-1', started_at: '2024-01-01T00:00:00Z' }, error: null },
    ]);
    inventory.ownedMap = jest.fn().mockResolvedValue({ clay: 999, stone: 999 });
    // Batch of 3 needs 6 clay in total; 4 is neither per-unit nor scaled.
    await expect(service.startCraft('p1', 'f1', 'setena', 3, { clay: 4 })).rejects.toThrow(
      'Recipe needs 6 of [clay / stone]',
    );
  });
});

describe('CraftingService — collect & variance (03 §3.4)', () => {
  it('never fails; a roll under the bonus chance yields +1', async () => {
    const rand = jest.spyOn(Math, 'random').mockReturnValue(0); // 0 < 0.12 -> bonus
    try {
      const { service } = buildService([
        {
          data: {
            id: 'job-1',
            player_id: 'p1',
            recipe_id: 'r-setena',
            qty: 1,
            started_at: '2020-01-01T00:00:00Z',
            collected_at: null,
          },
          error: null,
        },
        { data: { slug: 'setena', duration_minutes: 180 }, error: null },
        { data: null, error: null }, // job update
      ]);
      const res = await service.collectCraft('p1', 'f1', 'job-1');
      expect(res.bonus).toBe(true);
      expect(res.quantity).toBe(2); // outputQty 1 * qty 1 + bonus 1
    } finally {
      rand.mockRestore();
    }
  });

  it('refuses collection before the timer elapses', async () => {
    const startedAt = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    const { service } = buildService([
      {
        data: {
          id: 'job-1',
          player_id: 'p1',
          recipe_id: 'r-setena',
          qty: 1,
          started_at: startedAt,
          collected_at: null,
        },
        error: null,
      },
      { data: { slug: 'setena', duration_minutes: 180 }, error: null }, // readyAt = +180 min
    ]);
    await expect(service.collectCraft('p1', 'f1', 'job-1')).rejects.toThrow(
      'Craft is not ready yet',
    );
  });
});

describe('CraftingService — recipe catalogue', () => {
  it('returns one view per recipe with correct Botho unlocks', async () => {
    const { service, wallet } = buildService([]);
    wallet.getBotho = jest.fn().mockResolvedValue(0);
    const recipes = await service.getRecipes('p1');
    expect(recipes.length).toBe(RECIPE_SLUGS.length);
    const bupi = recipes.find((r) => r.slug === 'bupi');
    expect(bupi?.isUnlocked).toBe(false);
    const poleto = recipes.find((r) => r.slug === 'poleto');
    expect(poleto?.isUnlocked).toBe(true);
  });

  it('reports unlocked slot count from the Workshop tier', async () => {
    const { service } = buildService([{ data: { level: 3 }, error: null }]);
    expect(await service.unlockedSlots('f1')).toBe(3);
  });
});
