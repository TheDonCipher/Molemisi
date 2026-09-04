import { Test, TestingModule } from '@nestjs/testing';
import { CropsService } from './crops.service';
import { SupabaseService } from '../database/supabase.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CropsService', () => {
  let service: CropsService;

  const mockSupabaseService = {
    getAdminClient: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CropsService, { provide: SupabaseService, useValue: mockSupabaseService }],
    }).compile();

    service = module.get<CropsService>(CropsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================
  // plantCrop
  // ========================================
  describe('plantCrop', () => {
    it('should throw BadRequestException if RPC returns error', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Plot not found' },
        }),
      });

      await expect(
        service.plantCrop('farm-1', 'plot-1', 'user-1', 'sorghum', 'seed-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if RPC returns success=false', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        rpc: jest.fn().mockResolvedValue({
          data: { success: false },
          error: null,
        }),
      });

      await expect(
        service.plantCrop('farm-1', 'plot-1', 'user-1', 'sorghum', 'seed-1'),
      ).rejects.toThrow('Failed to plant crop');
    });

    it('should succeed and return plant result', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: { success: true, crop_id: 'crop-123' },
        error: null,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { slot_index: 0 },
            error: null,
          }),
        }),
      });

      mockSupabaseService.getAdminClient.mockReturnValue({
        rpc: mockRpc,
        from: jest.fn().mockReturnValue({
          select: mockSelect,
        }),
      });

      const result = await service.plantCrop('farm-1', 'plot-1', 'user-1', 'sorghum', 'seed-1');

      expect(result.plot.state).toBe('PLANTED');
      expect(result.crop.type).toBe('sorghum');
      expect(result.crop.growthStage).toBe(0);
      expect(result.xpGained).toBe(5);
      expect(mockRpc).toHaveBeenCalledWith('plant_crop_transaction', {
        p_farm_id: 'farm-1',
        p_plot_id: 'plot-1',
        p_crop_type: 'sorghum',
        p_seed_id: 'seed-1',
        p_user_id: 'user-1',
      });
    });
  });

  // ========================================
  // waterCrop
  // ========================================
  describe('waterCrop', () => {
    it('should throw NotFoundException if no crop on plot', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { crop_instances: [] },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.waterCrop('farm-1', 'plot-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if plot not found', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.waterCrop('farm-1', 'plot-1')).rejects.toThrow(NotFoundException);
    });

    it('should successfully water a crop', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    state: 'PLANTED',
                    crop_instances: [{ id: 'crop-1', hydration: 0.5 }],
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: mockUpdate,
          }),
        }),
      });

      const result = await service.waterCrop('farm-1', 'plot-1');
      expect(result.crop.hydration).toBe(0.8); // 0.5 + 0.3
      expect(result.waterUsed).toBe(1);
      expect(result.xpGained).toBe(2);
    });

    it('should cap hydration at 1.0', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    state: 'PLANTED',
                    crop_instances: [{ id: 'crop-1', hydration: 0.85 }],
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const result = await service.waterCrop('farm-1', 'plot-1');
      expect(result.crop.hydration).toBe(1.0); // Capped at 1.0
    });
  });

  // ========================================
  // harvestCrop
  // ========================================
  describe('harvestCrop', () => {
    it('should throw NotFoundException if plot not found', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.harvestCrop('farm-1', 'plot-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if crop is not READY', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    state: 'GROWING',
                    crop_instances: [{ id: 'crop-1', crop_type: 'sorghum', health: 1.0 }],
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.harvestCrop('farm-1', 'plot-1')).rejects.toThrow(
        'Crop is not ready for harvest',
      );
    });

    it('should reject harvest on EMPTY plot (no crop_instances)', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    state: 'EMPTY',
                    crop_instances: [],
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      await expect(service.harvestCrop('farm-1', 'plot-1')).rejects.toThrow();
    });

    it('should successfully harvest a READY crop', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      const mockDelete = jest.fn().mockResolvedValue({ error: null });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });

      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn((table: string) => {
          if (table === 'farm_plots') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        state: 'READY',
                        crop_instances: [{ id: 'crop-1', crop_type: 'sorghum', health: 1.0 }],
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({ eq: mockUpdate }),
            };
          }
          if (table === 'crop_instances') {
            return { delete: jest.fn().mockReturnValue({ eq: mockDelete }) };
          }
          if (table === 'inventory') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: mockSingle,
                    }),
                  }),
                }),
              }),
              update: jest
                .fn()
                .mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
              insert: mockInsert,
            };
          }
          if (table === 'game_ledger_entries') {
            return { insert: mockInsert };
          }
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
        }),
      });

      const result = await service.harvestCrop('farm-1', 'plot-1');
      expect(result.plot.state).toBe('EMPTY');
      expect(result.harvest.cropType).toBe('sorghum');
      expect(result.harvest.xpGained).toBe(10);
      expect(result.harvest.yield).toBeGreaterThanOrEqual(3);
      expect(result.harvest.yield).toBeLessThanOrEqual(5);
    });
  });

  // ========================================
  // Quality Calculation
  // ========================================
  describe('Quality Calculation', () => {
    it('health 1.0 → excellent quality', async () => {
      // We can verify this by testing the harvest result quality
      // when health is 1.0
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      const mockDelete = jest.fn().mockResolvedValue({ error: null });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn((table: string) => {
          if (table === 'farm_plots') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        state: 'READY',
                        crop_instances: [{ id: 'c1', crop_type: 'sorghum', health: 1.0 }],
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({ eq: mockUpdate }),
            };
          }
          if (table === 'crop_instances')
            return { delete: jest.fn().mockReturnValue({ eq: mockDelete }) };
          if (table === 'inventory') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
              update: jest
                .fn()
                .mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
              insert: mockInsert,
            };
          }
          if (table === 'game_ledger_entries') return { insert: mockInsert };
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
        }),
      });

      const result = await service.harvestCrop('farm-1', 'plot-1');
      expect(result.harvest.quality).toBe('excellent');
    });

    it('health 0.2 → poor quality', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      const mockDelete = jest.fn().mockResolvedValue({ error: null });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn((table: string) => {
          if (table === 'farm_plots') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        state: 'READY',
                        crop_instances: [{ id: 'c1', crop_type: 'sorghum', health: 0.2 }],
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({ eq: mockUpdate }),
            };
          }
          if (table === 'crop_instances')
            return { delete: jest.fn().mockReturnValue({ eq: mockDelete }) };
          if (table === 'inventory') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
              update: jest
                .fn()
                .mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
              insert: mockInsert,
            };
          }
          if (table === 'game_ledger_entries') return { insert: mockInsert };
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
        }),
      });

      const result = await service.harvestCrop('farm-1', 'plot-1');
      expect(result.harvest.quality).toBe('poor');
    });
  });
});
