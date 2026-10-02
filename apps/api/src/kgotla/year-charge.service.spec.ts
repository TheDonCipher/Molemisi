import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { YearChargeService } from './year-charge.service';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { InventoryService } from '../inventory/inventory.service';
import { ChapterService } from '../chapters/chapter.service';
import { makeDb, clientFor, type MockDb } from '../test/supabase-mock';

/**
 * YearChargeService — docs/37/38 I-2 (the Kgotla Year layer).
 *
 * The REAL WalletService runs against the shared mock DB, so Pula and Botho are
 * proven to move (or not) rather than asserted on a spy. Inventory and Chapter
 * are mocked, so the spec pins the consume/grant contract.
 *
 * Two fixed instants exercise both a single-ask Charge (month 11, straight_rows:
 * 10 sorghum → P40 / Botho 10 / stamp 1) and a multi-ask Charge (month 3,
 * kraal_gate: 4 plank + 2 rope → P70 / Botho 10 / stamp 1) — the case the old
 * kgotla_quests board could not represent.
 */
describe('YearChargeService — the Kgotla Year layer (I-2)', () => {
  let service: YearChargeService;
  let db: any;

  // 2026-11-01 10:00 UTC → Botswana 2026-11-01 → month 11 → 'straight_rows'.
  const NOW_NOV = new Date('2026-11-01T10:00:00.000Z');
  // 2027-03-01 10:00 UTC → Botswana 2027-03-01 → month 3 → 'kraal_gate'.
  const NOW_MAR = new Date('2027-03-01T10:00:00.000Z');

  const inventory = {
    countOwned: jest.fn().mockResolvedValue(0),
    removeItem: jest.fn().mockResolvedValue(undefined),
  };
  const chapters = {
    addTokens: jest.fn().mockResolvedValue(5),
    recordQuests: jest.fn().mockResolvedValue(1),
  };

  const walletRow = () => db.player_wallets.find((r: any) => r.player_id === 'user-1');
  const pula = () => Number(walletRow()?.pula_balance ?? 0);
  const botho = () => Number(walletRow()?.botho_points ?? 0);

  beforeEach(async () => {
    jest.clearAllMocks();
    inventory.countOwned.mockResolvedValue(0);
    inventory.removeItem.mockResolvedValue(undefined);
    chapters.addTokens.mockResolvedValue(5);
    chapters.recordQuests.mockResolvedValue(1);

    db = makeDb({ farms: [{ id: 'farm-1', user_id: 'user-1' }] });
    db.kgotla_charges = [];
    db.player_chapter_state = [];

    const client = clientFor(db as MockDb);
    const supabase = { getAdminClient: () => client, getClient: () => client };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YearChargeService,
        { provide: SupabaseService, useValue: supabase },
        WalletService,
        { provide: InventoryService, useValue: inventory },
        { provide: ChapterService, useValue: chapters },
      ],
    }).compile();

    service = module.get<YearChargeService>(YearChargeService);
  });

  it('reveals the month-appropriate Charge with zero derived progress before accept', async () => {
    const view = await service.getYearCharge('farm-1', 'user-1', NOW_NOV);
    expect(view.chargeId).toBe('straight_rows');
    expect(view.month).toBe(11);
    expect(view.cycle).toBe('2026/27');
    expect(view.status).toBe('none');
    expect(view.asks.map((a) => a.item)).toEqual(['sorghum']);
    expect(view.asks[0]?.met).toBe(false);
    expect(view.ready).toBe(false);
    expect(view.rewards).toEqual({
      pula: 40,
      botho: 10,
      chapterTokens: 1,
      almanacQuests: 1,
    });
  });

  it('accepts, then reveals as active (one claim row per cycle)', async () => {
    const accepted = await service.acceptYearCharge('farm-1', 'user-1', NOW_NOV);
    expect(accepted.status).toBe('active');
    expect(db.kgotla_charges.length).toBe(1);
    expect(db.kgotla_charges[0].charge_id).toBe('straight_rows');
    expect(db.kgotla_charges[0].cycle).toBe('2026/27');
    expect(db.kgotla_charges[0].status).toBe('active');

    const view = await service.getYearCharge('farm-1', 'user-1', NOW_NOV);
    expect(view.status).toBe('active');

    // Re-accept is idempotent: still one row.
    await service.acceptYearCharge('farm-1', 'user-1', NOW_NOV);
    expect(db.kgotla_charges.length).toBe(1);
  });

  it('rejects turn-in when the asks are not satisfied', async () => {
    await service.acceptYearCharge('farm-1', 'user-1', NOW_NOV);
    inventory.countOwned.mockResolvedValue(3); // need 10
    await expect(service.turnInYearCharge('farm-1', 'user-1', NOW_NOV)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.kgotla_charges[0].status).toBe('active');
    expect(inventory.removeItem).not.toHaveBeenCalled();
  });

  it('turns in a single-ask Charge: consumes goods, grants Pula + Botho + tokens + almanac, marks claimed', async () => {
    await service.acceptYearCharge('farm-1', 'user-1', NOW_NOV);
    inventory.countOwned.mockResolvedValue(10);
    const result = await service.turnInYearCharge('farm-1', 'user-1', NOW_NOV);

    expect(result.status).toBe('claimed');
    expect(result.pulaReward).toBe(40);
    expect(result.bothoReward).toBe(10);
    expect(result.chapterTokens).toBe(5); // addTokens mock returns 5
    expect(result.almanacQuests).toBe(1);
    expect(result.consumed).toEqual([{ item: 'sorghum', qty: 10 }]);

    expect(inventory.removeItem).toHaveBeenCalledWith('user-1', 'sorghum', 10);
    expect(pula()).toBe(40);
    expect(botho()).toBe(10);
    expect(chapters.addTokens).toHaveBeenCalledWith('user-1', 1, NOW_NOV);
    expect(chapters.recordQuests).toHaveBeenCalledWith('user-1', 1, NOW_NOV);
    expect(db.kgotla_charges[0].status).toBe('claimed');
  });

  it('enforces atomic deduction: a second turn-in in the same cycle is rejected', async () => {
    await service.acceptYearCharge('farm-1', 'user-1', NOW_NOV);
    inventory.countOwned.mockResolvedValue(10);
    await service.turnInYearCharge('farm-1', 'user-1', NOW_NOV);
    await expect(service.turnInYearCharge('farm-1', 'user-1', NOW_NOV)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    // Goods were consumed exactly once.
    expect(inventory.removeItem).toHaveBeenCalledTimes(1);
  });

  it('rejects turn-in before accepting', async () => {
    inventory.countOwned.mockResolvedValue(10);
    await expect(service.turnInYearCharge('farm-1', 'user-1', NOW_NOV)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('turns in a multi-ask Charge (kraal_gate), consuming each ask once', async () => {
    await service.acceptYearCharge('farm-1', 'user-1', NOW_MAR);
    inventory.countOwned.mockImplementation(
      async (_u: string, slug: string) => (slug === 'plank' ? 4 : slug === 'rope' ? 2 : 0),
    );
    const view = await service.getYearCharge('farm-1', 'user-1', NOW_MAR);
    expect(view.chargeId).toBe('kraal_gate');
    expect(view.asks.map((a) => a.item).sort()).toEqual(['plank', 'rope']);
    expect(view.ready).toBe(true);

    const result = await service.turnInYearCharge('farm-1', 'user-1', NOW_MAR);
    expect(result.pulaReward).toBe(70); // 4·7·1.1 + 2·18·1.1 = 70.4 → nearest P5 = 70
    expect(result.consumed).toEqual([
      { item: 'plank', qty: 4 },
      { item: 'rope', qty: 2 },
    ]);
    expect(inventory.removeItem).toHaveBeenCalledWith('user-1', 'plank', 4);
    expect(inventory.removeItem).toHaveBeenCalledWith('user-1', 'rope', 2);
  });
});
