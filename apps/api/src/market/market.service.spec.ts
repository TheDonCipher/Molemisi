import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MarketService } from './market.service';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { InventoryService } from '../inventory/inventory.service';

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

      await expect(service.buyItem('farm-1', 'user-1', 'sorghum_seed', 5)).rejects.toThrow(
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

      await expect(service.buyItem('farm-1', 'user-1', 'sorghum_seed', 10)).rejects.toThrow(
        'Insufficient funds',
      );
      // ...and the refusal must happen before anything is put in the inventory.
      expect(chain.from).not.toHaveBeenCalledWith('inventory');
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
      await expect(service.quoteSale('sorghum', 0)).rejects.toThrow(
        'quantity must be a positive number',
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

  describe('quality multiplier', () => {
    // Quality multiplier is a private method, but we can test it indirectly
    // through sellItem behavior. For now, test that the service is defined.
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});
