import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { WalletService } from '../wallet/wallet.service';
import {
  CONTRACT_RULES,
  contractGoodsMarketValue,
  contractRewardCap,
} from '@molemisi/game-config';
import { makeFakeSupabase } from '../test/fake-supabase';

/**
 * R3 / docs-31 P0-2 — contracts paid more than the Co-op for identical goods and
 * re-accepted instantly, a printable-money loop. This spec pins the two guards:
 * a payout ceiling (1.25x Co-op net value) shared by board and settlement, and a
 * 24 h per-farm repeat cooldown. It also pins the Botho pillar fix: contracts
 * previously paid Pula only, leaving Botho unrepresented in the co-op loop.
 */
describe('ContractsService (R3 economy guards + Botho)', () => {
  const mockSupabaseService = { getAdminClient: jest.fn() };
  const mockInventoryService = {
    resolvePlayerId: jest.fn().mockResolvedValue('user-1'),
    countOwned: jest.fn().mockResolvedValue(999),
    removeItem: jest.fn().mockResolvedValue(undefined),
  };
  const mockWalletService = {
    getBotho: jest.fn().mockResolvedValue(0),
    creditBothoCapped: jest.fn().mockResolvedValue(4),
  };

  let service: ContractsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile();
    service = module.get<ContractsService>(ContractsService);
  });

  it('caps payouts at CONTRACT_RULES.rewardMarketMultiple of the Co-op net value', async () => {
    const { client } = makeFakeSupabase([]);
    mockSupabaseService.getAdminClient.mockReturnValue(client);

    const board = await service.getAvailableContracts('farm-1');

    // Catalogue math (baseValue, net of the 5% Co-op tax):
    //   sorghum(3) x10 -> P28.50 net -> cap P36 (was 150)
    //   eggs(5)     x10 -> P47.50 net -> cap P59 (was 80)
    //   bupi(20)     x5 -> P95.00 net -> cap P119 (was 200)
    const sorghum = board.find((c) => c.id === 'contract_sorghum_10')!;
    expect(sorghum.rewards.currency).toBeLessThan(150);
    expect(sorghum.rewards.currency).toBe(
      contractRewardCap([{ itemType: 'sorghum', quantity: 10 }]),
    );

    const eggs = board.find((c) => c.id === 'contract_eggs_10')!;
    expect(eggs.rewards.currency).toBe(
      contractRewardCap([{ itemType: 'eggs', quantity: 10 }]),
    );

    // Every listed contract still publishes its marketValue — the board's
    // reasoning is visible, so a payout never reads as an arithmetic error.
    for (const c of board) {
      const mv: number = (c as { marketValue: number }).marketValue;
      expect(mv).toBe(contractGoodsMarketValue(c.requirements));
      expect(c.rewards.currency).toBeLessThanOrEqual(Math.ceil(mv * CONTRACT_RULES.rewardMarketMultiple));
    }
  });

  it('surfaces a Botho reward on every available contract (pillar coverage)', async () => {
    const { client } = makeFakeSupabase([]);
    mockSupabaseService.getAdminClient.mockReturnValue(client);

    const board = await service.getAvailableContracts('farm-1');
    expect(board.length).toBeGreaterThan(0);
    for (const c of board) {
      expect(c.rewards.botho).toBeDefined();
      expect(c.rewards.botho!).toBeGreaterThan(0);
    }
  });

  it('refuses re-accept inside the cooldown with a payload that carries the numbers', async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    // Query sequence for acceptContract tripping cooldown:
    // 1. verifyFarmOwnership: .single() -> farm row
    // 2. duplicate check: .single() -> null
    // 3. getCooldowns: -> cooldown row
    const { client } = makeFakeSupabase([
      { data: { user_id: 'user-1' }, error: null },
      { data: null, error: null },
      {
        data: [{ contract_id: 'contract_sorghum_10', completed_at: oneHourAgo, farm_id: 'farm-1' }],
        error: null,
      },
    ]);
    mockSupabaseService.getAdminClient.mockReturnValue(client);

    const err: unknown = await service
      .acceptContract('farm-1', 'user-1', 'contract_sorghum_10')
      .then(
        () => 'ACCEPTED-AND-SHOULD-NOT-HAVE-BEEN',
        (e: unknown) => e,
      );
    expect(err).toBeInstanceOf(BadRequestException);
    const body = (err as BadRequestException).getResponse() as {
      code: string;
      record: { hoursLeft: number; contractId: string; payout: number; marketValue: number };
    };
    expect(body.code).toBe('CONTRACT_COOLDOWN');
    expect(body.record.contractId).toBe('contract_sorghum_10');
    expect(body.record.hoursLeft).toBeGreaterThan(0);
    expect(body.record.hoursLeft).toBeLessThanOrEqual(CONTRACT_RULES.repeatCooldownHours);
    expect(body.record.marketValue).toBe(
      contractGoodsMarketValue([{ itemType: 'sorghum', quantity: 10 }]),
    );
  });

  it('accepts the same contract after the cooldown has fully elapsed', async () => {
    // Query sequence for clean acceptContract:
    // 1. verifyFarmOwnership: .single() -> farm row
    // 2. duplicate check: .single() -> null
    // 3. getCooldowns: -> empty []
    // 4. insert active contract: .insert().select().single() -> new active contract
    const { client } = makeFakeSupabase([
      { data: { user_id: 'user-1' }, error: null },
      { data: null, error: null },
      { data: [], error: null },
      {
        data: { id: 'active-1', contract_id: 'contract_sorghum_10' },
        error: null,
      },
    ]);
    mockSupabaseService.getAdminClient.mockReturnValue(client);

    const res = await service.acceptContract('farm-1', 'user-1', 'contract_sorghum_10');
    expect(res.contractId).toBe('contract_sorghum_10');
  });

  it('completeContract credits Botho through the I4-capped wallet path', async () => {
    // completeContract await order (contract_sorghum_10, 1 requirement):
    // 1. verifyFarmOwnership: farms .single()
    // 2. active_contracts: .select('*').single()
    // 3. profiles: .select('currency').single()
    // 4. profiles: .update()
    // 5. active_contracts: .update()
    // 6. game_ledger_entries: .insert()
    // (inventory countOwned/removeItem and creditBothoCapped are mocks, no sequence)
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { client } = makeFakeSupabase([
      { data: { user_id: 'user-1' }, error: null },
      { data: { id: 'active-1', contract_id: 'contract_sorghum_10', completed: false, expires_at: expiry, farm_id: 'farm-1' }, error: null },
      { data: { currency: 100 }, error: null },
      { data: { currency: 136 }, error: null },
      { data: { completed: true }, error: null },
      { data: null, error: null },
    ]);
    mockSupabaseService.getAdminClient.mockReturnValue(client);
    mockInventoryService.countOwned.mockResolvedValue(999);
    mockInventoryService.removeItem.mockResolvedValue(undefined);
    mockWalletService.creditBothoCapped.mockResolvedValue(4);

    const res = await service.completeContract('farm-1', 'user-1', 'active-1');

    const expectedPayout = contractRewardCap([{ itemType: 'sorghum', quantity: 10 }]);
    expect(res.currencyReward).toBe(expectedPayout);
    expect(res.bothoReward).toBe(4);
    expect(mockWalletService.creditBothoCapped).toHaveBeenCalledTimes(1);
    const call = mockWalletService.creditBothoCapped.mock.calls[0];
    expect(call[0]).toBe('user-1'); // playerId
    expect(call[2]).toBe('contract_complete'); // source
    expect(call[1]).toBeGreaterThan(0); // requested Botho
  });
});
