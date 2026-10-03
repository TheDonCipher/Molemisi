import { BadRequestException, NotFoundException } from '@nestjs/common';
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

function buildService(sequence: FakeResult[], rpcResult?: FakeResult) {
  const { client, from, rpc } = makeFakeSupabase(sequence, rpcResult);
  const supabaseService = { getAdminClient: () => client } as unknown as SupabaseService;
  const wallet = {} as WalletService; // InventoryService reads wallets via SQL, not the service
  const service = new InventoryService(supabaseService, wallet);
  return { service, from, rpc };
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

describe('InventoryService.addItems — one combined slot check (G1/G4)', () => {
  it('refuses BOTH grants before any write when the new types together exceed the cap', async () => {
    // Pre-check: wood and stone both missing -> 2 fresh types; 23 used + 2 > 24.
    const usedFull: FakeResult = {
      data: Array.from({ length: 23 }, () => ({ item_definitions: { is_tool: false } })),
      error: null,
    };
    const { service } = buildService([
      DEF, // wood itemDefId (pre-check)
      NO_ROW, // wood not held
      DEF, // stone itemDefId
      NO_ROW, // stone not held
      usedFull, // getUsedSlots -> 23
      { data: { level: 1 }, error: null }, // storage tier 1 -> cap 24
      { data: { user_id: 'u1' }, error: null }, // farms (cap lookup)
      { data: { subscription_status: null }, error: null }, // wallet (Guild check)
    ]);

    await expect(
      service.addItems('p1', 'f1', [
        { slug: 'wood', qty: 2 },
        { slug: 'stone', qty: 2 },
      ]),
    ).rejects.toThrow('Storage is full');
  });

  it('grants every entry when the combined types fit', async () => {
    const fiveUsed: FakeResult = {
      data: Array.from({ length: 5 }, () => ({ item_definitions: { is_tool: false } })),
      error: null,
    };
    const level1: FakeResult = { data: { level: 1 }, error: null };
    const farm: FakeResult = { data: { user_id: 'u1' }, error: null };
    const wallet: FakeResult = { data: { subscription_status: null }, error: null };
    const write: FakeResult = { data: null, error: null };
    const { service } = buildService([
      // addItems pre-check: sorghum held, wood missing -> 1 fresh type.
      DEF,
      { data: { id: 'r1' }, error: null }, // sorghum row exists
      DEF,
      NO_ROW, // wood missing
      fiveUsed,
      level1,
      farm,
      wallet,
      // addItem(sorghum): itemDefId -> existing -> update
      DEF,
      { data: { id: 'r1', quantity: 5 }, error: null },
      write,
      // addItem(wood): itemDefId -> existing -> slot re-check -> insert
      DEF,
      NO_ROW,
      fiveUsed,
      level1,
      farm,
      wallet,
      write,
    ]);

    const res = await service.addItems('p1', 'f1', [
      { slug: 'sorghum', qty: 10 },
      { slug: 'wood', qty: 2 },
    ]);

    expect(res).toEqual([
      { added: 10, overflow: 0 },
      { added: 2, overflow: 0 },
    ]);
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

describe('InventoryService — removal is atomic (C3, security audit 2026-10-02)', () => {
  it('throws when the atomic decrement reports insufficient stock', async () => {
    // itemDefId -> DEF; then inventory_take raises (zero rows matched).
    const { service } = buildService(
      [DEF],
      { data: null, error: { message: 'inventory_take: insufficient stock' } },
    );
    await expect(service.removeItem('p1', 'sorghum', 5)).rejects.toThrow('Not enough');
  });

  it('decrements via the inventory_take RPC, not a read-modify-write', async () => {
    // The whole point of C3: removal is a single conditional SQL statement, so the
    // two concurrent calls in the market TOCTOU can no longer both succeed. This
    // asserts the call shape; the atomicity itself is Postgres's job.
    const { service, rpc } = buildService([DEF]);
    await expect(service.removeItem('p1', 'sorghum', 3)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('inventory_take', {
      p_player_id: 'p1',
      p_item_def_id: 'def-id',
      p_qty: 3,
    });
  });

  it('rejects a non-positive or fractional quantity before any DB round-trip', async () => {
    // A negative qty would ADD stock (quantity - (-n)); a fractional qty is
    // meaningless against an INT column. Both must fail before the RPC.
    const { service, from, rpc } = buildService([]);
    await expect(service.removeItem('p1', 'sorghum', 0)).rejects.toThrow(BadRequestException);
    await expect(service.removeItem('p1', 'sorghum', -3)).rejects.toThrow(BadRequestException);
    await expect(service.removeItem('p1', 'sorghum', 1.5)).rejects.toThrow(BadRequestException);
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reports the held count via countOwned', async () => {
    const { service } = buildService([
      DEF,
      { data: { quantity: 7 }, error: null },
    ]);
    expect(await service.countOwned('p1', 'sorghum')).toBe(7);
  });
});

/**
 * A2 (security audit 2026-10-03) — `resolvePlayerId` is no longer a lookup.
 *
 * The signature used to be `resolvePlayerId(farmId)`, which made it a
 * farm→player LOOKUP with no authorisation in it at all. `CraftingController`
 * then resolved the JWT identity and threw it away (`void userId;`), so any
 * authenticated player could point `:farmId` at somebody else's farm and spend
 * their inputs and their Pula fee. The `expectedUserId` parameter is required
 * and the resolution is refused unless the farm actually belongs to it.
 */
describe('InventoryService — resolvePlayerId is a CHECKED lookup (A2)', () => {
  it('returns the player id when the farm is the caller’s own', async () => {
    const { service } = buildService([{ data: { user_id: 'owner-1' }, error: null }]);
    await expect(service.resolvePlayerId('farm-1', 'owner-1')).resolves.toBe('owner-1');
  });

  it('refuses to resolve a farm owned by somebody else', async () => {
    // THE IDOR. Before A2 this returned 'victim' for any caller, and every
    // caller used it to read or spend the VICTIM's inventory.
    const { service } = buildService([{ data: { user_id: 'victim' }, error: null }]);
    await expect(service.resolvePlayerId('farm-1', 'attacker')).rejects.toThrow(NotFoundException);
  });

  it('answers 404, not 403, so a probe cannot enumerate other players’ farms', async () => {
    // A 403 would confirm "this farm exists, it just isn't yours", which is
    // itself a leak. Matching `verifyFarmOwnership`, a stranger's farm is
    // indistinguishable from a farm that does not exist.
    const { service } = buildService([{ data: { user_id: 'victim' }, error: null }]);
    await expect(service.resolvePlayerId('farm-1', 'attacker')).rejects.toThrow('Farm not found');
  });

  it('refuses when no identity is offered at all, rather than resolving anything', async () => {
    // Reaching this means a call site was written against the pre-A2 signature.
    // Failing loudly here is the point: a permissive default is how the IDOR
    // comes back. Asserted for both the empty string and `undefined`, since a
    // controller that forgot to decorate the handler yields the latter.
    const { service, from } = buildService([]);
    await expect(
      service.resolvePlayerId('farm-1', '' as unknown as string),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.resolvePlayerId('farm-1', undefined as unknown as string),
    ).rejects.toThrow(BadRequestException);
    // It fails BEFORE the lookup, so there is no round trip at all.
    expect(from).not.toHaveBeenCalled();
  });

  it('is the only sanctioned farm→player resolution', () => {
    // A structural guard, in the spirit of the static-scan tests in
    // launch-readiness.spec.ts: the parameter is not optional in the type, so a
    // call site cannot compile without passing one.
    const arity = InventoryService.prototype.resolvePlayerId.length;
    expect(arity).toBe(2);
  });
});

describe('InventoryService — Storage tier 3 stack cap ×2 (31 §6.2)', () => {
  it('lets a tier-3 Storehouse hold double the authored stack', async () => {
    // sorghum maxStack 50; 60 already held (only reachable at tier 3) -> cap 100.
    const { service } = buildService([
      DEF,
      { data: { id: 'row-1', quantity: 60 }, error: null },
      { data: { level: 3 }, error: null }, // storage tier 3
      { data: null, error: null }, // update
    ]);
    const res = await service.addItem('p1', 'f1', 'sorghum', 60);
    expect(res).toEqual({ added: 40, overflow: 20 }); // 100 - 60 = 40
  });

  it('leaves the authored cap alone at tier 1 (a full stack still overflows)', async () => {
    const { service } = buildService([
      DEF,
      { data: { id: 'row-1', quantity: 60 }, error: null },
      { data: { level: 1 }, error: null }, // tier 1 -> cap stays 50
    ]);
    const res = await service.addItem('p1', 'f1', 'sorghum', 60);
    expect(res).toEqual({ added: 0, overflow: 60 });
  });
});
