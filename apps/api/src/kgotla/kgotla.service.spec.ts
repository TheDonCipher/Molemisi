import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { KgotlaService } from './kgotla.service';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { KGOTLA_DAILY_CONTRIBUTION_CAP } from '@molemisi/game-config';

/**
 * Kgotla is spec-sensitive: its rewards must flow through the wallet (05 §P2) and
 * the Botho they earn must be the daily-capped variety (I4/R6/C7/I10). These tests
 * pin that wiring: no direct profiles.currency / xp writes, Pula + capped Botho via
 * the wallet, and the Pula spent on donations goes through spendPula.
 */
describe('KgotlaService — wallet cutover (05 §P2, I4)', () => {
  let service: KgotlaService;

  const mockSupabaseService = { getAdminClient: jest.fn() };

  const mockWallet = {
    credit: jest.fn().mockResolvedValue(1050),
    debit: jest.fn().mockResolvedValue(950),
    spendPula: jest.fn().mockResolvedValue(950),
    // Mirror the wallet's cap: award at most the request, capped at 50/day.
    creditBothoCapped: jest
      .fn()
      .mockImplementation(async (_pid: string, req: number) => Math.min(req, 50)),
    canAffordPula: jest.fn().mockResolvedValue(true),
    getWallet: jest.fn(),
    // Pula given to community projects so far this Botswana day (02 §9).
    contributedToday: jest.fn().mockResolvedValue(0),
  };

  function makeAdmin(userId: string) {
    return {
      from: jest.fn((table: string) => {
        const singleForTable = () => {
          if (table === 'farms') return Promise.resolve({ data: { user_id: userId }, error: null });
          if (table === 'npc_reputation') return Promise.resolve({ data: { reputation: 0 }, error: null });
          if (table === 'kgotla_projects') return Promise.resolve({ data: { current_contributions: 0 }, error: null });
          return Promise.resolve({ data: null, error: null });
        };
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(singleForTable),
        };
      }),
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseService.getAdminClient.mockReturnValue(makeAdmin('user-1'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KgotlaService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: WalletService, useValue: mockWallet },
      ],
    }).compile();

    service = module.get<KgotlaService>(KgotlaService);
  });

  describe('completeQuest', () => {
    it('routes the reward through the wallet as Pula + capped Botho, never profiles.currency/xp', async () => {
      const result = await service.completeQuest('farm-1', 'user-1', 'elder_neo', 'community');

      // Pula faucet + Botho (capped) — both via the wallet, by source 'quest_reward'.
      expect(mockWallet.credit).toHaveBeenCalledWith('user-1', 'pula', 50, 'quest_reward');
      expect(mockWallet.creditBothoCapped).toHaveBeenCalledWith('user-1', 10, 'quest_reward');
      expect(result).toEqual({ reputationGain: 10, pulaReward: 50, bothoReward: 10 });

      // The canonical standing is Botho; legacy profiles.currency / xp must not move.
      const from = mockSupabaseService.getAdminClient().from;
      expect(from).not.toHaveBeenCalledWith('profiles');
    });

    it('throws NotFoundException for an unknown NPC and touches no balance', async () => {
      await expect(
        service.completeQuest('farm-1', 'user-1', 'no-such-npc', 'community'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockWallet.credit).not.toHaveBeenCalled();
      expect(mockWallet.creditBothoCapped).not.toHaveBeenCalled();
    });
  });

  describe('donateToProject', () => {
    it('spends Pula via the wallet and earns capped Botho (the Letsema sink)', async () => {
      const result = await service.donateToProject('farm-1', 'user-1', 'water_reservoir', 30);

      expect(mockWallet.spendPula).toHaveBeenCalledWith('user-1', 30, 'letsema_contribution');
      expect(mockWallet.creditBothoCapped).toHaveBeenCalledWith('user-1', 30, 'letsema_contribution');
      expect(result.bothoReward).toBe(30);
      // Community progress is still recorded.
      expect(mockSupabaseService.getAdminClient().from).toHaveBeenCalledWith('kgotla_projects');
    });

    it('throws NotFoundException for an unknown project and spends nothing', async () => {
      await expect(
        service.donateToProject('farm-1', 'user-1', 'no-such-project', 10),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockWallet.spendPula).not.toHaveBeenCalled();
      expect(mockWallet.creditBothoCapped).not.toHaveBeenCalled();
    });

    // ------------------------------------------------------------------
    // 02 §9 — contribution is capped per day, deliberately, so the thing the
    // design pays best for cannot be multiplied by grinding.
    // ------------------------------------------------------------------
    describe('daily contribution cap (02 §9, 05 §P5)', () => {
      it('reports the allowance it consumed', async () => {
        const result = await service.donateToProject(
          'farm-1', 'user-1', 'water_reservoir', 30,
        );
        expect(result.contributedToday).toBe(30);
        expect(result.dailyCap).toBe(KGOTLA_DAILY_CONTRIBUTION_CAP);
        expect(result.remainingToday).toBe(KGOTLA_DAILY_CONTRIBUTION_CAP - 30);
      });

      it('allows a donation that lands exactly on the cap', async () => {
        mockWallet.contributedToday.mockResolvedValueOnce(0);
        await expect(
          service.donateToProject(
            'farm-1', 'user-1', 'water_reservoir', KGOTLA_DAILY_CONTRIBUTION_CAP,
          ),
        ).resolves.toMatchObject({ remainingToday: 0 });
      });

      it('rejects a donation that would exceed the cap, and spends nothing', async () => {
        mockWallet.contributedToday.mockResolvedValueOnce(
          KGOTLA_DAILY_CONTRIBUTION_CAP - 20,
        );
        await expect(
          service.donateToProject('farm-1', 'user-1', 'water_reservoir', 50),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockWallet.spendPula).not.toHaveBeenCalled();
        expect(mockWallet.creditBothoCapped).not.toHaveBeenCalled();
      });

      it('rejects once the day is used up — the project cannot be ground out', async () => {
        mockWallet.contributedToday.mockResolvedValueOnce(
          KGOTLA_DAILY_CONTRIBUTION_CAP,
        );
        await expect(
          service.donateToProject('farm-1', 'user-1', 'water_reservoir', 1),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockWallet.spendPula).not.toHaveBeenCalled();
      });

      it('counts prior contributions into the allowance', async () => {
        mockWallet.contributedToday.mockResolvedValueOnce(120);
        const result = await service.donateToProject(
          'farm-1', 'user-1', 'water_reservoir', 30,
        );
        expect(result.contributedToday).toBe(150);
        expect(result.remainingToday).toBe(KGOTLA_DAILY_CONTRIBUTION_CAP - 150);
      });
    });

    // ------------------------------------------------------------------
    // The amount comes straight off the request body. A negative would be
    // negated into a positive delta at the wallet and MINT Pula.
    // ------------------------------------------------------------------
    describe('amount validation (I4)', () => {
      it.each([
        ['negative (would mint Pula)', -100],
        ['zero', 0],
        ['fractional', 12.5],
        ['NaN', NaN],
        ['Infinity', Infinity],
        ['a string', '50' as unknown as number],
      ])('rejects %s and never touches the wallet', async (_label, amount) => {
        await expect(
          service.donateToProject('farm-1', 'user-1', 'water_reservoir', amount),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockWallet.spendPula).not.toHaveBeenCalled();
        expect(mockWallet.creditBothoCapped).not.toHaveBeenCalled();
      });
    });
  });
});
