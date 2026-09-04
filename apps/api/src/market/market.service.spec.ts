import { Test, TestingModule } from '@nestjs/testing';
import { MarketService } from './market.service';
import { SupabaseService } from '../database/supabase.service';

describe('MarketService', () => {
  let service: MarketService;

  const mockSupabaseService = {
    getAdminClient: jest.fn(),
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
      ],
    }).compile();

    service = module.get<MarketService>(MarketService);
  });

  describe('sellItem', () => {
    it('should reject sell if farm not found', async () => {
      const { chain, builder } = createMockClient();
      builder.single.mockResolvedValue({ data: null, error: null });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(
        service.sellItem('farm-1', 'user-1', 'sorghum', 5),
      ).rejects.toThrow('Farm not found');
    });

    it('should reject sell if user does not own farm', async () => {
      const { chain, builder } = createMockClient();
      builder.single
        .mockResolvedValueOnce({ data: { user_id: 'other-user' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(
        service.sellItem('farm-1', 'user-1', 'sorghum', 5),
      ).rejects.toThrow('Farm not found');
    });

    it('should reject sell if inventory insufficient', async () => {
      const { chain, builder } = createMockClient();
      builder.single
        .mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null }) // farm check
        .mockResolvedValueOnce({ data: { quantity: 2 }, error: null }) // inventory check
        .mockResolvedValueOnce({ data: { base_price: 15, supply: 0, demand: 0 }, error: null }) // price
        .mockResolvedValueOnce({ data: null, error: null }); // events
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(
        service.sellItem('farm-1', 'user-1', 'sorghum', 5),
      ).rejects.toThrow('Insufficient items');
    });
  });

  describe('buyItem', () => {
    it('should reject buy if farm not found', async () => {
      const { chain, builder } = createMockClient();
      builder.single.mockResolvedValue({ data: null, error: null });
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(
        service.buyItem('farm-1', 'user-1', 'sorghum_seed', 5),
      ).rejects.toThrow('Farm not found');
    });

    it('should reject buy if insufficient funds', async () => {
      const { chain, builder } = createMockClient();
      builder.single
        .mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null }) // farm check
        .mockResolvedValueOnce({ data: { base_price: 15, supply: 0, demand: 0 }, error: null }) // price
        .mockResolvedValueOnce({ data: { base_price: 15, supply: 0, demand: 0 }, error: null }) // price for event check
        .mockResolvedValueOnce({ data: null, error: null }) // events
        .mockResolvedValueOnce({ data: { currency: 10 }, error: null }); // profile with low currency
      mockSupabaseService.getAdminClient.mockReturnValue(chain);

      await expect(
        service.buyItem('farm-1', 'user-1', 'sorghum_seed', 10),
      ).rejects.toThrow('Insufficient funds');
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

  describe('quality multiplier', () => {
    // Quality multiplier is a private method, but we can test it indirectly
    // through sellItem behavior. For now, test that the service is defined.
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});
