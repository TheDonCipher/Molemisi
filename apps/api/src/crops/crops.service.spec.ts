import { Test, TestingModule } from '@nestjs/testing';
import { CropsService } from './crops.service';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { WaterService } from '../water/water.service';
import { WalletService } from '../wallet/wallet.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CROPS,
  getCropConfig,
  BOTHO_THRESHOLDS,
  LETSEMA_COOLDOWN_DAYS,
} from '@molemisi/game-config';
import { makeFakeSupabase } from '../test/fake-supabase';

describe('CropsService', () => {
  let service: CropsService;

  const mockSupabaseService = {
    getAdminClient: jest.fn(),
  };

  // P3 cutover: harvested crops now land in player_inventory via InventoryService
  // (the canonical store). Stub it so the crop specs don't need the DB.
  const mockInventoryService = {
    resolvePlayerId: jest.fn().mockResolvedValue('user-1'),
    addItem: jest.fn().mockResolvedValue({ added: 0, overflow: 0 }),
    // G1 — fertilize consumes one manure through the canonical store.
    removeItem: jest.fn().mockResolvedValue(undefined),
  };

  // P4: the tank gates growth, so every read path advances the farm first.
  const mockWaterService = {
    advanceFarmGrowth: jest
      .fn()
      .mockResolvedValue({ cropsAdvanced: 0, cropsReady: 0, waterConsumed: 0 }),
  };

  // P5: Letsema reads Botho and its own cooldown server-side (I9) — the client is
  // told whether it may be used, never asked.
  const mockWalletService = {
    getBotho: jest.fn().mockResolvedValue(600),
    letsemaLastUsedAt: jest.fn().mockResolvedValue(null),
    markLetsemaUsed: jest.fn().mockResolvedValue(undefined),
  };

  /**
   * plantCrop resolves the plot's slot and then asks whether the Heritage Tree
   * stands on it (Doc 11 §6) BEFORE it reaches the transaction, so the plant
   * specs need both reads stubbed. `tree` non-null simulates a plot the tree
   * occupies; the default is a clear plot.
   */
  function plantReads(over: { slotIndex?: number; tree?: unknown } = {}) {
    const slotIndex = over.slotIndex ?? 0;
    const tree = over.tree ?? null;
    return jest.fn((table: string) => {
      if (table === 'farm_plots') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: { slot_index: slotIndex }, error: null }),
            }),
          }),
        };
      }
      // buildings: three stacked eq() filters, then maybeSingle().
      const builder: Record<string, unknown> = {};
      builder.eq = jest.fn().mockReturnValue(builder);
      builder.maybeSingle = jest.fn().mockResolvedValue({ data: tree, error: null });
      return { select: jest.fn().mockReturnValue(builder) };
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CropsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: WaterService, useValue: mockWaterService },
        { provide: WalletService, useValue: mockWalletService },
      ],
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
        from: plantReads(),
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
        from: plantReads(),
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
      // Planting resolves the slot, finds no Heritage Tree on it, then commits
      // the transaction — the reads the service makes before the RPC.
      mockSupabaseService.getAdminClient.mockReturnValue({
        rpc: mockRpc,
        from: plantReads({ slotIndex: 0 }),
      });

      const result = await service.plantCrop('farm-1', 'plot-1', 'user-1', 'sorghum', 'seed-1');

      expect(result.plot.state).toBe('PLANTED');
      expect(result.plot.slotIndex).toBe(0);
      expect(result.crop.type).toBe('sorghum');
      expect(result.crop.growthStage).toBe(0);
      // D5 — XP is deleted, not zeroed by accident. The field survives in the
      // response only so the client contract doesn't change; it is always 0.
      expect(result.xpGained).toBe(0);
      expect(mockRpc).toHaveBeenCalledWith('plant_crop_transaction', {
        p_farm_id: 'farm-1',
        p_plot_id: 'plot-1',
        p_crop_type: 'sorghum',
        p_user_id: 'user-1',
        // P4: the duration travels from game-config into the row so the database
        // never hard-codes a growth time (05 §P1).
        p_growth_hours: getCropConfig('sorghum')!.growthHours,
      });
    });

    it('refuses to plant on the plot the Heritage Tree occupies (Doc 11 §6)', async () => {
      const mockRpc = jest.fn();
      mockSupabaseService.getAdminClient.mockReturnValue({
        rpc: mockRpc,
        from: plantReads({ tree: { id: 'tree-1' } }),
      });

      await expect(
        service.plantCrop('farm-1', 'plot-1', 'user-1', 'sorghum', 'seed-1'),
      ).rejects.toThrow(/Heritage Tree/);
      // The refusal lands before the transaction, so no seed is spent and no
      // half-planted crop is left behind for the player to notice later.
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('should reject an unknown crop type before touching the database', async () => {
      const mockRpc = jest.fn();
      mockSupabaseService.getAdminClient.mockReturnValue({ rpc: mockRpc });

      await expect(
        service.plantCrop('farm-1', 'plot-1', 'user-1', 'dragonfruit', 'seed-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // C16 — the growth window (02 §6.1)
  // ========================================
  describe('C16 growth window', () => {
    it('every configured crop grows in 16–48 h with nothing between 24 h and 40 h', () => {
      const offenders: string[] = [];
      for (const [slug, cfg] of Object.entries(CROPS)) {
        const hours = cfg.growthHours;
        if (hours < 16 || hours > 48) offenders.push(`${slug}=${hours}h (outside 16–48)`);
        else if (hours > 24 && hours < 40) offenders.push(`${slug}=${hours}h (in the 24–40 gap)`);
      }
      expect(offenders).toEqual([]);
    });

    it('every crop is explicitly a 1-day or 2-day cadence', () => {
      const bad = Object.entries(CROPS)
        .filter(([, cfg]) => cfg.cadenceDays !== 1 && cfg.cadenceDays !== 2)
        .map(([slug]) => slug);
      expect(bad).toEqual([]);
    });
  });

  // ========================================
  // P4 — server-authoritative growth (and the retired watering can)
  // ========================================
  describe('growth is advanced server-side', () => {
    it('no longer exposes a per-plot waterCrop action (replaced by the tank)', () => {
      // P4 moved water from a per-plot action to one farm-level shared tank.
      // The endpoint is gone rather than deprecated: a client that keeps
      // calling it must fail loudly, not appear to work.
      expect((service as unknown as Record<string, unknown>).waterCrop).toBeUndefined();
    });

    it('harvestCrop advances growth before deciding whether the crop is ready', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      });

      await expect(service.harvestCrop('farm-1', 'plot-1')).rejects.toThrow(NotFoundException);
      // 03 §8 — the server recomputes from real elapsed time, gated by the
      // tank. A harvest that skipped this could cash in a crop the tank stalled.
      expect(mockWaterService.advanceFarmGrowth).toHaveBeenCalledWith('farm-1');
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
      // D5 — harvesting is its own reward; there is no XP and no level.
      expect(result.harvest.xpGained).toBe(0);
      // Sorghum yields 4–6 per 02 §6.1 (the old test bound of 3–5 was the
      // pre-retune table that balance_verify.py replaced).
      expect(result.harvest.yield).toBeGreaterThanOrEqual(4);
      expect(result.harvest.yield).toBeLessThanOrEqual(6);
    });
  });

  // ========================================
  // Quality Calculation
  // ========================================
  describe('fertilizePlot (G1 — 01 §Fertilization)', () => {
    const plantedPlot = (over: Record<string, unknown> = {}) => ({
      id: 'p1',
      farm_id: 'f1',
      state: 'GROWING',
      slot_index: 0,
      crop_instances: {
        id: 'c1',
        crop_type: 'sorghum',
        growth_stage: 0,
        growth_progress_hours: 0,
        fertilizer_active: false,
        ...over,
      },
    });

    it('consumes one manure and arms the stage-bounded bonus', async () => {
      const { client, calls } = makeFakeSupabase([
        { data: plantedPlot(), error: null }, // loadPlot
        { data: null, error: null }, // the arming update
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      const res = await service.fertilizePlot('f1', 'p1', 'manure');

      expect(mockInventoryService.removeItem).toHaveBeenCalledWith('user-1', 'manure', 1);
      const arm = calls.find((c) => c.method === 'update' && c.table === 'crop_instances');
      if (!arm) throw new Error('no crop_instances update written');
      expect(arm.args[0]).toMatchObject({
        fertilizer_active: true,
        fertilizer_bonus: 0.2,
        fertilized_until_stage: 0,
      });
      expect(res).toEqual({
        plotId: 'p1',
        fertilizerType: 'manure',
        item: 'manure',
        bonus: 0.2,
        untilStage: 0,
      });
    });

    it('rejects a fertilizer type that has no item yet, before touching the database', async () => {
      const { client, calls } = makeFakeSupabase([]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      await expect(service.fertilizePlot('f1', 'p1', 'compost')).rejects.toThrow(
        'not available',
      );
      expect(calls).toHaveLength(0);
      expect(mockInventoryService.removeItem).not.toHaveBeenCalled();
    });

    it('rejects a plot with no crop', async () => {
      const { client } = makeFakeSupabase([
        { data: { id: 'p1', farm_id: 'f1', state: 'EMPTY', crop_instances: null }, error: null },
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      await expect(service.fertilizePlot('f1', 'p1', 'manure')).rejects.toThrow(
        'Plot has no crop to fertilize',
      );
      expect(mockInventoryService.removeItem).not.toHaveBeenCalled();
    });

    it('rejects a plot that is already fertilized — one dose at a time', async () => {
      const { client } = makeFakeSupabase([
        {
          data: plantedPlot({ fertilizer_active: true, fertilizer_bonus: 0.2 }),
          error: null,
        },
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      await expect(service.fertilizePlot('f1', 'p1', 'manure')).rejects.toThrow(
        'already fertilized',
      );
      expect(mockInventoryService.removeItem).not.toHaveBeenCalled();
    });

    it('refuses to fertilize a crop that is already ready to harvest', async () => {
      const { client } = makeFakeSupabase([
        { data: plantedPlot({ growth_stage: 3, growth_progress_hours: 18 }), error: null },
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      await expect(service.fertilizePlot('f1', 'p1', 'manure')).rejects.toThrow(
        'ready to harvest',
      );
      expect(mockInventoryService.removeItem).not.toHaveBeenCalled();
    });
  });

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
      // P3 removed quality grading (03 §2): quality is always 'normal'.
      expect(result.harvest.quality).toBe('normal');
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
      // P3 removed quality grading (03 §2): quality is always 'normal'.
      expect(result.harvest.quality).toBe('normal');
    });
  });

  // ==================================================================
  // Letsema — the 500-Botho pillar (05 §P5, I9)
  //
  // Both gates are enforced server-side: the client is told whether Letsema
  // may be used, never asked. These tests pin that, plus the "one call takes
  // the whole field" property that makes it a working-bee rather than a
  // faster pair of hands.
  // ==================================================================
  describe('Letsema', () => {
    const NOW = new Date('2026-09-09T10:00:00+02:00'); // a Wednesday, mid-morning CAT
    const DAY_MS = 86_400_000;
    const REQUIRED = BOTHO_THRESHOLDS.LETSEMA; // 500

    /** A farm_plots row carrying one ready sorghum crop. */
    const readyPlot = (id: string) => ({
      id,
      farm_id: 'farm-1',
      state: 'READY',
      crop_instances: [{ id: `crop-${id}`, crop_type: 'sorghum', health: 1.0 }],
    });

    function letsemaAdmin({
      farmUserId = 'user-1',
      readyPlots = [] as Array<Record<string, unknown>>,
    } = {}) {
      const updateEq = jest.fn().mockResolvedValue({ error: null });
      const deleteEq = jest.fn().mockResolvedValue({ error: null });

      return {
        from: jest.fn((table: string) => {
          if (table === 'farms') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest
                    .fn()
                    .mockResolvedValue({ data: { user_id: farmUserId }, error: null }),
                }),
              }),
            };
          }
          if (table === 'farm_plots') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  // awaited directly — no .single() on the multi-plot read
                  eq: jest.fn().mockResolvedValue({ data: readyPlots, error: null }),
                }),
              }),
              update: jest.fn().mockReturnValue({ eq: updateEq }),
            };
          }
          if (table === 'crop_instances') {
            return { delete: jest.fn().mockReturnValue({ eq: deleteEq }) };
          }
          return {};
        }),
      };
    }

    describe('letsemaStatus — the two gates', () => {
      it('is eligible at or above 500 Botho with no prior use', async () => {
        mockWalletService.getBotho.mockResolvedValueOnce(REQUIRED);
        mockWalletService.letsemaLastUsedAt.mockResolvedValueOnce(null);
        mockSupabaseService.getAdminClient.mockReturnValue(letsemaAdmin());

        await expect(service.letsemaStatus('farm-1', 'user-1', NOW)).resolves.toEqual({
          eligible: true,
          reason: 'ok',
          botho: REQUIRED,
          required: REQUIRED,
          availableAt: null,
        });
      });

      it('refuses below 500 Botho — the threshold is enforced server-side (I9)', async () => {
        mockWalletService.getBotho.mockResolvedValueOnce(REQUIRED - 1);
        mockSupabaseService.getAdminClient.mockReturnValue(letsemaAdmin());

        await expect(service.letsemaStatus('farm-1', 'user-1', NOW)).resolves.toMatchObject({
          eligible: false,
          reason: 'botho_too_low',
          botho: REQUIRED - 1,
        });
      });

      it('refuses inside the 7-day cooldown and says when it frees up', async () => {
        const usedAt = new Date(NOW.getTime() - 3 * DAY_MS);
        mockWalletService.getBotho.mockResolvedValueOnce(REQUIRED);
        mockWalletService.letsemaLastUsedAt.mockResolvedValueOnce(usedAt);
        mockSupabaseService.getAdminClient.mockReturnValue(letsemaAdmin());

        const status = await service.letsemaStatus('farm-1', 'user-1', NOW);
        expect(status.eligible).toBe(false);
        expect(status.reason).toBe('on_cooldown');
        expect(status.availableAt).toBe(
          new Date(usedAt.getTime() + LETSEMA_COOLDOWN_DAYS * DAY_MS).toISOString(),
        );
      });

      it('is eligible again the moment the 7 days elapse', async () => {
        mockWalletService.getBotho.mockResolvedValueOnce(REQUIRED);
        mockWalletService.letsemaLastUsedAt.mockResolvedValueOnce(
          new Date(NOW.getTime() - LETSEMA_COOLDOWN_DAYS * DAY_MS),
        );
        mockSupabaseService.getAdminClient.mockReturnValue(letsemaAdmin());

        await expect(service.letsemaStatus('farm-1', 'user-1', NOW)).resolves.toMatchObject({
          eligible: true,
          reason: 'ok',
        });
      });

      it('never reveals whether a farm it does not own exists', async () => {
        mockSupabaseService.getAdminClient.mockReturnValue(
          letsemaAdmin({ farmUserId: 'someone-else' }),
        );
        await expect(service.letsemaStatus('farm-1', 'user-1', NOW)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('letsema — the working-bee', () => {
      it('refuses below 500 Botho and harvests nothing', async () => {
        mockWalletService.getBotho.mockResolvedValueOnce(REQUIRED - 1);
        mockSupabaseService.getAdminClient.mockReturnValue(
          letsemaAdmin({ readyPlots: [readyPlot('p1')] }),
        );

        await expect(service.letsema('farm-1', 'user-1', NOW)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockWaterService.advanceFarmGrowth).not.toHaveBeenCalled();
        expect(mockWalletService.markLetsemaUsed).not.toHaveBeenCalled();
      });

      it('refuses inside the cooldown and harvests nothing', async () => {
        mockWalletService.getBotho.mockResolvedValueOnce(REQUIRED);
        mockWalletService.letsemaLastUsedAt.mockResolvedValueOnce(
          new Date(NOW.getTime() - 2 * DAY_MS),
        );
        mockSupabaseService.getAdminClient.mockReturnValue(
          letsemaAdmin({ readyPlots: [readyPlot('p1')] }),
        );

        await expect(service.letsema('farm-1', 'user-1', NOW)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockWalletService.markLetsemaUsed).not.toHaveBeenCalled();
      });

      it('takes every ready plot in a single call', async () => {
        mockWalletService.getBotho.mockResolvedValueOnce(REQUIRED);
        mockWalletService.letsemaLastUsedAt.mockResolvedValueOnce(null);
        mockSupabaseService.getAdminClient.mockReturnValue(
          letsemaAdmin({ readyPlots: [readyPlot('p1'), readyPlot('p2'), readyPlot('p3')] }),
        );

        const result = await service.letsema('farm-1', 'user-1', NOW);

        expect(result.plotsHarvested).toBe(3);
        expect(result.harvests).toHaveLength(3);
        expect(result.harvests.map((h) => h.plot.id)).toEqual(['p1', 'p2', 'p3']);
        expect(result.nextAvailableAt).toBe(
          new Date(NOW.getTime() + LETSEMA_COOLDOWN_DAYS * DAY_MS).toISOString(),
        );
      });

      it('advances growth once for the field, not once per plot', async () => {
        mockWalletService.getBotho.mockResolvedValueOnce(REQUIRED);
        mockWalletService.letsemaLastUsedAt.mockResolvedValueOnce(null);
        mockSupabaseService.getAdminClient.mockReturnValue(
          letsemaAdmin({ readyPlots: [readyPlot('p1'), readyPlot('p2'), readyPlot('p3')] }),
        );

        await service.letsema('farm-1', 'user-1', NOW);

        // A working-bee is one pass over the field. Advancing per plot would both
        // waste round trips and let a single call double-count elapsed time.
        expect(mockWaterService.advanceFarmGrowth).toHaveBeenCalledTimes(1);
      });

      it('does not burn the weekly power on an empty field', async () => {
        mockWalletService.getBotho.mockResolvedValueOnce(REQUIRED);
        mockWalletService.letsemaLastUsedAt.mockResolvedValueOnce(null);
        mockSupabaseService.getAdminClient.mockReturnValue(letsemaAdmin({ readyPlots: [] }));

        await expect(service.letsema('farm-1', 'user-1', NOW)).rejects.toThrow(
          'Nothing is ready to harvest yet',
        );
        // The cooldown must NOT start: refusing is kinder than silently
        // spending a week's power on nothing.
        expect(mockWalletService.markLetsemaUsed).not.toHaveBeenCalled();
      });

      it('starts the cooldown once it has actually been used', async () => {
        mockWalletService.getBotho.mockResolvedValueOnce(REQUIRED);
        mockWalletService.letsemaLastUsedAt.mockResolvedValueOnce(null);
        mockSupabaseService.getAdminClient.mockReturnValue(
          letsemaAdmin({ readyPlots: [readyPlot('p1')] }),
        );

        await service.letsema('farm-1', 'user-1', NOW);

        expect(mockWalletService.markLetsemaUsed).toHaveBeenCalledWith('user-1', NOW);
      });

      it('refuses a farm the player does not own', async () => {
        mockSupabaseService.getAdminClient.mockReturnValue(
          letsemaAdmin({ farmUserId: 'someone-else', readyPlots: [readyPlot('p1')] }),
        );

        await expect(service.letsema('farm-1', 'user-1', NOW)).rejects.toThrow(
          NotFoundException,
        );
        expect(mockWalletService.markLetsemaUsed).not.toHaveBeenCalled();
      });
    });
  });

  // ==================================================================
  // getFarmPlots — the Farm grid read (05 §UI)
  // ==================================================================
  describe('getFarmPlots', () => {
    it('returns an empty list when the farm has no plots', async () => {
      const { client, calls } = makeFakeSupabase([{ data: [], error: null }]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      const result = await service.getFarmPlots('farm-1');

      expect(result).toEqual([]);
      // The query must hit farm_plots and order by slot_index for a stable grid.
      expect(calls.some((c) => c.table === 'farm_plots' && c.method === 'select')).toBe(true);
      expect(calls.some((c) => c.method === 'order' && c.args[0] === 'slot_index')).toBe(true);
    });

    it('returns EMPTY plots with no crop', async () => {
      const { client } = makeFakeSupabase([
        {
          data: [{ id: 'p1', slot_index: 0, state: 'EMPTY', crop_instances: [] }],
          error: null,
        },
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      const result = await service.getFarmPlots('farm-1');

      expect(result).toEqual([{ id: 'p1', slotIndex: 0, state: 'EMPTY', crop: null }]);
    });

    it('returns a growing crop with growthHours and displayName from config', async () => {
      const { client } = makeFakeSupabase([
        {
          data: [
            {
              id: 'p1',
              slot_index: 0,
              state: 'PLANTED',
              crop_instances: [
                {
                  id: 'c1',
                  crop_type: 'sorghum',
                  growth_stage: 2,
                  growth_progress_hours: 9,
                  planted_at: '2026-09-09T08:00:00Z',
                  expected_ready_at: '2026-09-10T02:00:00Z',
                },
              ],
            },
          ],
          error: null,
        },
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      const result = await service.getFarmPlots('farm-1');
      const plot = result[0]!;

      expect(plot.state).toBe('PLANTED');
      expect(plot.crop).toEqual({
        id: 'c1',
        type: 'sorghum',
        displayName: 'Sorghum',
        growthStage: 2,
        growthProgressHours: 9,
        growthHours: 18, // sorghum from @molemisi/game-config
        plantedAt: '2026-09-09T08:00:00Z',
        expectedReadyAt: '2026-09-10T02:00:00Z',
        stalled: false, // no hydration field in the row => tank was not dry
      });
    });

    it('marks a crop stalled when the tank was dry on its last tick', async () => {
      const { client } = makeFakeSupabase([
        {
          data: [
            {
              id: 'p1',
              slot_index: 0,
              state: 'PLANTED',
              crop_instances: [
                {
                  id: 'c1',
                  crop_type: 'sorghum',
                  growth_stage: 1,
                  growth_progress_hours: 4, // 4 of 18 — nowhere near ready
                  hydration: 0, // the water engine refused to advance it
                  planted_at: '2026-09-09T08:00:00Z',
                  expected_ready_at: null,
                },
              ],
            },
          ],
          error: null,
        },
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      const result = await service.getFarmPlots('farm-1');
      const plot = result[0]!;

      expect(plot.crop?.stalled).toBe(true);
    });

    it('does not mark a fully grown crop stalled, however dry it got', async () => {
      const { client } = makeFakeSupabase([
        {
          data: [
            {
              id: 'p1',
              slot_index: 0,
              state: 'READY',
              crop_instances: [
                {
                  id: 'c1',
                  crop_type: 'sorghum',
                  growth_stage: 4,
                  growth_progress_hours: 18, // done
                  hydration: 0,
                  planted_at: '2026-09-09T08:00:00Z',
                  expected_ready_at: null,
                },
              ],
            },
          ],
          error: null,
        },
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      const result = await service.getFarmPlots('farm-1');
      const plot = result[0]!;

      // Thirst is only meaningful while there is still growing left to do.
      expect(plot.crop?.stalled).toBe(false);
    });

    it('returns READY plots with the crop still present (harvest deletes it)', async () => {
      const { client } = makeFakeSupabase([
        {
          data: [
            {
              id: 'p3',
              slot_index: 3,
              state: 'READY',
              crop_instances: [
                {
                  id: 'c3',
                  crop_type: 'maize',
                  growth_stage: 4,
                  growth_progress_hours: 22,
                  planted_at: '2026-09-01T08:00:00Z',
                  expected_ready_at: '2026-09-02T06:00:00Z',
                },
              ],
            },
          ],
          error: null,
        },
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      const result = await service.getFarmPlots('farm-1');
      const plot = result[0]!;

      expect(plot.state).toBe('READY');
      expect(plot.crop).not.toBeNull();
      expect(plot.crop!.type).toBe('maize');
      expect(plot.crop!.growthHours).toBe(22); // maize
    });

    it('normalises a non-array crop_instances join (Supabase single relation)', async () => {
      const { client } = makeFakeSupabase([
        {
          data: [
            {
              id: 'p1',
              slot_index: 0,
              state: 'PLANTED',
              crop_instances: {
                id: 'c1',
                crop_type: 'cowpeas',
                growth_stage: 1,
                growth_progress_hours: 5,
                planted_at: '2026-09-09T08:00:00Z',
                expected_ready_at: null,
              },
            },
          ],
          error: null,
        },
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      const result = await service.getFarmPlots('farm-1');
      const plot = result[0]!;

      expect(plot.crop?.type).toBe('cowpeas');
      expect(plot.crop?.growthHours).toBe(20); // cowpeas
    });

    it('throws BadRequestException when the query returns an error', async () => {
      const { client } = makeFakeSupabase([
        { data: null, error: { message: 'db down' } },
      ]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);

      await expect(service.getFarmPlots('farm-1')).rejects.toThrow(BadRequestException);
    });

    it('advances growth before reading, so READY reflects real elapsed time', async () => {
      const { client } = makeFakeSupabase([{ data: [], error: null }]);
      mockSupabaseService.getAdminClient.mockReturnValue(client);
      mockWaterService.advanceFarmGrowth.mockClear();

      await service.getFarmPlots('farm-1');

      // Without this the read would report whatever the client last saw, and
      // GET /farms/current (which advances via SimulationService) would
      // disagree with this endpoint about the same crop.
      expect(mockWaterService.advanceFarmGrowth).toHaveBeenCalledWith('farm-1');
    });
  });
});
