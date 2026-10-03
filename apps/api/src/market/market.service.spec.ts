import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MarketService } from './market.service';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  isSeedInSeason,
  chapterForDate,
  CHAPTER_MARKET_EVENTS,
  type CropId,
} from '@molemisi/game-config';

/**
 * R3a regression cover. The seed calendar is REAL (04 §9.1) — a spec written
 * against 'sorghum_seed' would pass in September and fail in March, because the
 * calendar is the machine's actual clock. The in-season and out-of-season seeds
 * are therefore DISCOVERED, not assumed. Every chapter stocks exactly six of
 * these eleven crops, so both directions of the buy gate always have a witness,
 * in every month of the year.
 */
const SEED_CANDIDATES = [
  'sorghum',
  'maize',
  'tomatoes',
  'cowpeas',
  'groundnuts',
  'millet',
  'watermelon',
  'sesame',
  'pepper',
  'herbs',
  'morula',
] as const;
const IN_SEASON_SEED = `${SEED_CANDIDATES.find((c) => isSeedInSeason(c as CropId)) ?? 'sorghum'}_seed`;
const OUT_OF_SEASON_SEED = `${SEED_CANDIDATES.find((c) => !isSeedInSeason(c as CropId)) ?? 'maize'}_seed`;

describe('MarketService', () => {
  let service: MarketService;

  const mockSupabaseService = {
    getAdminClient: jest.fn(),
  };

  // P3 cutover: the market reads/writes the canonical player_inventory store through
  // InventoryService. Stub it so the specs don't need the DB.
  const mockInventoryService = {
    countOwned: jest.fn().mockResolvedValue(999),
    removeItem: jest.fn().mockResolvedValue(undefined),
    addItem: jest.fn().mockResolvedValue({ added: 1, overflow: 0 }),
  };

  /**
   * The wallet is the only thing that may move a balance (05 §P2), so the market
   * no longer checks or writes balances itself — it delegates. These tests
   * therefore assert that the market calls the wallet correctly and propagates
   * its refusals, rather than that the market does the arithmetic itself.
   */
  const mockWalletService = {
    credit: jest.fn().mockResolvedValue(1000),
    debit: jest.fn().mockResolvedValue(1000),
    spendPula: jest.fn().mockResolvedValue(1000),
    getWallet: jest.fn().mockResolvedValue({
      pula_balance: 1000,
      botho_points: 0,
      subscription_status: 'free',
      subscription_expires_at: null,
    }),
    getPula: jest.fn().mockResolvedValue(1000),
    canAffordPula: jest.fn().mockResolvedValue(true),
  };

  // Helper to create a mock Supabase chainable client
  function createMockClient(overrides: Record<string, unknown> = {}) {
    const chain: Record<string, jest.Mock> = {};

    const builder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      gt: jest.fn().mockReturnThis(),
      ...overrides,
    };

    chain.from = jest.fn().mockReturnValue(builder);

    return { chain, builder };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: InventoryService, useValue: mockInventoryService },
      ],
    }).compile();

    service = module.get<MarketService>(MarketService);
  });

  describe('sellItem', () => {
    it('should reject sell if farm not found', async () => {
      const { chain, builder } = createMockClient();
      builder.single.mockResolvedValue({ data: null, error: null });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(service.sellItem('farm-1', 'user-1', 'sorghum', 5)).rejects.toThrow(
        'Farm not found',
      );
    });

    it('should reject sell if user does not own farm', async () => {
      const { chain, builder } = createMockClient();
      builder.single
        .mockResolvedValueOnce({ data: { user_id: 'other-user' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(service.sellItem('farm-1', 'user-1', 'sorghum', 5)).rejects.toThrow(
        'Farm not found',
      );
    });

    it('should reject sell if inventory insufficient', async () => {
      const { chain, builder } = createMockClient();
      builder.single
        .mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null }) // farm check
        .mockResolvedValueOnce({ data: { base_price: 15, supply: 0, demand: 0 }, error: null }) // price
        .mockResolvedValueOnce({ data: null, error: null }); // events
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      // P3: the held count comes from the canonical InventoryService, not a DB column.
      mockInventoryService.countOwned.mockResolvedValueOnce(2); // want 5, have 2

      await expect(service.sellItem('farm-1', 'user-1', 'sorghum', 5)).rejects.toThrow(
        'Insufficient items',
      );
    });
  });

  describe('buyItem', () => {
    it('should reject buy if farm not found', async () => {
      const { chain, builder } = createMockClient();
      builder.single.mockResolvedValue({ data: null, error: null });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(service.buyItem('farm-1', 'user-1', IN_SEASON_SEED, 5)).rejects.toThrow(
        'Farm not found',
      );
    });

    it('should reject buy if insufficient funds', async () => {
      const { chain, builder } = createMockClient();
      builder.single
        .mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null }) // farm check
        .mockResolvedValueOnce({ data: { base_price: 15, supply: 0, demand: 0 }, error: null }) // price
        .mockResolvedValueOnce({ data: { base_price: 15, supply: 0, demand: 0 }, error: null }) // price for event check
        .mockResolvedValueOnce({ data: null, error: null }); // events
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      // The wallet owns the balance check now, so it is the wallet that refuses.
      mockWalletService.spendPula.mockRejectedValueOnce(
        new BadRequestException('Insufficient funds'),
      );

      await expect(service.buyItem('farm-1', 'user-1', IN_SEASON_SEED, 10)).rejects.toThrow(
        'Insufficient funds',
      );
      // ...and the refusal must happen before anything is put in the inventory.
      expect(chain.from).not.toHaveBeenCalledWith('inventory');
    });

    it('rejects buying produce outright — the Co-op sells SEED, not harvest (R3a/31 P0-1)', async () => {
      const { chain, builder } = createMockClient();
      builder.single.mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(service.buyItem('farm-1', 'user-1', 'sorghum', 1)).rejects.toThrow(
        'only sells seed',
      );
    });

    it('rejects out-of-season seed with the chapter it returns in (R3a/31 P0-1)', async () => {
      const { chain, builder } = createMockClient();
      builder.single.mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      // OUT_OF_SEASON_SEED is discovered from the chapter clock, so it is
      // guaranteed out of season whenever this test runs. No catalogue rows,
      // no wallet calls — the gate must fire before either.
      await expect(service.buyItem('farm-1', 'user-1', OUT_OF_SEASON_SEED, 1)).rejects.toThrow(
        'out of season',
      );
    });
  });

  /**
   * A5 (security audit 2026-10-03) — quantity is validated, and validated
   * BEFORE anything is read or written.
   *
   * `@Body()` hands the service whatever JSON the client sent, so `quantity` used
   * to be able to be 0, negative, fractional, or a non-number. The negative case
   * was a money printer in BOTH directions:
   *
   *   - sell -5: the only gate was `owned < quantity`, and `0 < -5` is FALSE, so
   *     it passed. Then `removeItem(player, item, -5)` ADDED five units and
   *     `wallet.credit(..., netProceeds)` PAID for them.
   *   - buy -5: `totalPrice = price * -5` is negative, so `wallet.spendPula` was
   *     asked to debit a negative amount — which credits — while
   *     `inventory.addItem(..., -5)` removed units.
   */
  describe('A5 — quantity must be a positive whole number', () => {
    it('refuses a negative SALE before it can credit Pula and duplicate stock', async () => {
      const { chain } = createMockClient();
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(service.sellItem('farm-1', 'user-1', 'sorghum', -5)).rejects.toThrow(
        'quantity must be a positive whole number',
      );
      // Nothing was read and, above all, nothing was written.
      expect(mockInventoryService.removeItem).not.toHaveBeenCalled();
      expect(mockWalletService.credit).not.toHaveBeenCalled();
    });

    it('refuses a negative BUY before it can invert the wallet debit', async () => {
      const { chain } = createMockClient();
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(service.buyItem('farm-1', 'user-1', IN_SEASON_SEED, -5)).rejects.toThrow(
        'quantity must be a positive whole number',
      );
      // The seed gate below it would also refuse, but the point is that the
      // wallet is never asked to spend a negative amount.
      expect(mockWalletService.spendPula).not.toHaveBeenCalled();
      expect(mockInventoryService.addItem).not.toHaveBeenCalled();
    });

    it('refuses zero, fractional and non-numeric quantities', async () => {
      const { chain } = createMockClient();
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        await expect(
          service.sellItem('farm-1', 'user-1', 'sorghum', bad),
        ).rejects.toThrow('quantity must be a positive whole number');
        await expect(
          service.buyItem('farm-1', 'user-1', IN_SEASON_SEED, bad),
        ).rejects.toThrow('quantity must be a positive whole number');
      }
    });

    it('still accepts an ordinary whole quantity', async () => {
      // The guard must not be a blanket refusal: a legal sale has to go through,
      // or the fix would have "secured" the endpoint by breaking it.
      const { chain, builder } = createMockClient();
      builder.single
        .mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null })
        .mockResolvedValueOnce({ data: { base_price: 15, supply: 0, demand: 0 }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);
      mockInventoryService.countOwned.mockResolvedValueOnce(20);

      await expect(
        service.sellItem('farm-1', 'user-1', 'sorghum', 5),
      ).resolves.toMatchObject({ currencyAdded: expect.any(Number) });
    });
  });

  describe('getPrices', () => {
    it('should return empty array if no prices in DB', async () => {
      const { chain, builder } = createMockClient();
      builder.select.mockResolvedValue({ data: [], error: null });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      const result = await service.getPrices();
      expect(result).toEqual([]);
    });
  });

  describe('quoteSale (07 §7.5 — the fee is shown before the button)', () => {
    /**
     * Price 100, no supply/demand pressure, no live events. `getEventModifier`
     * terminates on `.gt()`, not `.single()`, so that has to resolve to `{data: []}`
     * or the loop over `events` blows up.
     */
    function mockPricedMarket(overrides: Record<string, unknown> = {}) {
      const { chain, builder } = createMockClient({
        gt: jest.fn().mockResolvedValue({ data: [], error: null }),
        ...overrides,
      });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);
      return { chain, builder };
    }

    it('quotes price, gross, 5% tax and net for a raw good', async () => {
      const { builder } = mockPricedMarket();
      builder.single.mockResolvedValue({
        data: { base_price: 100, supply: 0, demand: 0 },
        error: null,
      });

      const q = await service.quoteSale('sorghum', 3);
      expect(q.pricePerUnit).toBe(100);
      expect(q.gross).toBe(300);
      expect(q.tax).toBe(15); // 5% of 300
      expect(q.netProceeds).toBe(285);
      expect(q.taxRate).toBe(0.05);
      expect(q.band).toBe('wide');
    });

    it('reports crafted goods as the narrow band (C14)', async () => {
      const { builder } = mockPricedMarket();
      builder.single.mockResolvedValue({
        data: { base_price: 100, supply: 0, demand: 0 },
        error: null,
      });

      const q = await service.quoteSale('setena', 2);
      expect(q.band).toBe('crafted');
    });

    it('rejects a non-positive quantity', async () => {
      mockPricedMarket();
      // A5 — the message now says "whole number" because the validator is
      // stricter: a fractional sale used to be quoted happily here and then
      // refused by the real sale, so the confirm sheet could describe a
      // transaction that could not happen.
      await expect(service.quoteSale('sorghum', 0)).rejects.toThrow(
        'quantity must be a positive whole number',
      );
    });

    /**
     * A5 — the fractional case the old `<= 0` guard let through. A quote for
     * 1.5 units is worse than no quote at all: it showed the player a number the
     * sale would then refuse, and fractional quantities are unrepresentable in
     * the whole-number stack caps behind every item.
     */
    it('rejects a fractional quantity, so a quote can never describe an impossible sale', async () => {
      mockPricedMarket();
      await expect(service.quoteSale('sorghum', 1.5)).rejects.toThrow(
        'quantity must be a positive whole number',
      );
      await expect(service.quoteSale('sorghum', Number.NaN)).rejects.toThrow(
        'quantity must be a positive whole number',
      );
    });

    it('rejects an item with no market value', async () => {
      const { builder } = mockPricedMarket();
      builder.single.mockResolvedValue({ data: null, error: null });
      await expect(service.quoteSale('unknown_item', 1)).rejects.toThrow('no market value');
    });

    /**
     * The entire point of the quote: it must equal the sale. If these ever diverge,
     * the confirm sheet lies about the fee — precisely the bug 07 §7.5 exists to
     * prevent. Same item, same quantity, same mocked price: one write-free call and
     * one real one, then compare.
     */
    it('agrees with sellItem to the cent (so the sheet cannot lie)', async () => {
      const { builder } = mockPricedMarket();
      const priceRow = { data: { base_price: 7, supply: 0, demand: 0 }, error: null };
      builder.single.mockResolvedValue(priceRow); // default, for updateSupplyDemand
      builder.single
        .mockResolvedValueOnce(priceRow) // quoteSale → getDynamicPrice
        .mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null }) // sellItem → farm
        .mockResolvedValueOnce(priceRow); // sellItem → getDynamicPrice

      const quote = await service.quoteSale('sorghum', 7);
      const sale = await service.sellItem('farm-1', 'user-1', 'sorghum', 7);

      expect(sale.transaction.pricePerUnit).toBe(quote.pricePerUnit);
      expect(sale.transaction.totalPrice).toBe(quote.gross);
      expect(sale.transaction.tax).toBe(quote.tax);
      expect(sale.transaction.netProceeds).toBe(quote.netProceeds);
    });
  });

  describe('3.3 — chapter-scoped event seeding (fresh install always has one)', () => {
    it('seeds the CURRENT chapter event when none is active', async () => {
      const { chain, builder } = createMockClient({
        gt: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await service.getActiveEvents();

      const chapter = chapterForDate(new Date());
      const expected = CHAPTER_MARKET_EVENTS[chapter.slug];
      expect(builder.insert).toHaveBeenCalledTimes(1);
      const inserted = builder.insert.mock.calls[0][0] as { name: string; effect: string };
      expect(inserted.name).toBe(expected.name);
      expect(inserted.effect).toBe(expected.effect);
    });

    it('does NOT re-seed when the current chapter event is already active', async () => {
      const chapter = chapterForDate(new Date());
      const expected = CHAPTER_MARKET_EVENTS[chapter.slug];
      const { chain, builder } = createMockClient({
        gt: jest.fn().mockResolvedValue({
          data: [{ id: 'e1', name: expected.name }],
          error: null,
        }),
      });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await service.getActiveEvents();
      expect(builder.insert).not.toHaveBeenCalled();
    });
  });

  describe('quality multiplier', () => {
    // Quality multiplier is a private method, but we can test it indirectly
    // through sellItem behavior. For now, test that the service is defined.
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});
