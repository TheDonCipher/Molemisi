import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { WaterService } from '../water/water.service';
import { WalletService } from '../wallet/wallet.service';
import {
  BOTHO_THRESHOLDS,
  LETSEMA_COOLDOWN_DAYS,
  getCropConfig,
} from '@molemisi/game-config';
// Canonical plot DTOs + row shaping. Shared with FarmsService (GET /farms/current)
// so the two read paths can never disagree about what a plot is.
import { PlotView, toPlotViews } from './plot-view';

export interface PlantResult {
  plot: { id: string; state: string; slotIndex: number };
  crop: { id: string; type: string; growthStage: number; hydration: number };
  xpGained: number;
}

export interface HarvestResult {
  plot: { id: string; state: string };
  harvest: {
    cropType: string;
    yield: number;
    quality: string;
    qualityScore: number;
    xpGained: number;
  };
  inventoryAddition: {
    itemType: string;
    quantity: number;
    quality: string;
  };
}

export interface LetsemaStatus {
  eligible: boolean;
  reason: 'ok' | 'botho_too_low' | 'on_cooldown';
  botho: number;
  required: number;
  availableAt: string | null;
}

export interface LetsemaResult {
  plotsHarvested: number;
  harvests: HarvestResult[];
  nextAvailableAt: string;
}

// (PlotView / CropOnPlot are declared in ./plot-view, alongside toPlotViews.)

@Injectable()
export class CropsService {
  constructor(
    private supabaseService: SupabaseService,
    private inventory: InventoryService,
    private water: WaterService,
    private wallet: WalletService,
  ) {}

  async plantCrop(
    farmId: string,
    plotId: string,
    userId: string,
    cropType: string,
    _seedId: string,
  ): Promise<PlantResult> {
    const adminClient = this.supabaseService.getAdminClient();

    const cropConfig = getCropConfig(cropType);
    if (!cropConfig) {
      throw new BadRequestException(`Unknown crop type: ${cropType}`);
    }

    // The seed is identified inside the transaction by slug (crop_type || '_seed'),
    // resolved against player_inventory (see migration 00020). p_seed_id is no longer
    // used by the function but is kept in the signature for caller compatibility.
    // p_growth_hours carries the crop's canonical growth time from game-config so the
    // database never hard-codes a duration (05 §P1).
    const { data: result, error } = await adminClient.rpc('plant_crop_transaction', {
      p_farm_id: farmId,
      p_plot_id: plotId,
      p_crop_type: cropType,
      p_user_id: userId,
      p_growth_hours: cropConfig.growthHours,
    });

    if (error) {
      throw new BadRequestException(error.message || 'Failed to plant crop');
    }
    if (!result?.success) {
      throw new BadRequestException('Failed to plant crop');
    }

    const { data: plot } = await adminClient
      .from('farm_plots')
      .select('slot_index')
      .eq('id', plotId)
      .single();

    return {
      plot: { id: plotId, state: 'PLANTED', slotIndex: plot?.slot_index ?? 0 },
      crop: {
        id: result.crop_id as string,
        type: cropType,
        growthStage: 0,
        hydration: 0.5,
      },
      xpGained: 0,
    };
  }

  async harvestCrop(farmId: string, plotId: string): Promise<HarvestResult> {
    // Server-authoritative: advance growth first so READY reflects real elapsed time
    // gated by the tank, not whatever the client last saw (03 §8).
    await this.water.advanceFarmGrowth(farmId);

    const plot = await this.loadPlot(farmId, plotId);
    if (plot.state !== 'READY') {
      throw new BadRequestException('Crop is not ready for harvest');
    }

    return this.collectCrop(farmId, plot);
  }

  // ==================================================================
  // Farm plots — read (GET /farms/:farmId/plots)
  // ==================================================================

  /**
   * Every plot on the farm, with the currently planted crop (if any). Ordered
   * by `slot_index` so the web client can render a stable grid.
   *
   * `growthHours` and `displayName` come from `getCropConfig` so the Farm
   * screen never needs to import game-config to compute progress or label a
   * crop. The client computes `stageProgress` from `growthProgressHours /
   * growthHours` and `canHarvest` from `state === 'READY'`.
   */
  async getFarmPlots(farmId: string): Promise<PlotView[]> {
    const adminClient = this.supabaseService.getAdminClient();

    // Server-authoritative read: advance first so `READY` reflects real elapsed
    // time, not whatever the client last saw (03 §8). GET /farms/current does
    // the same via SimulationService — without this, the two plot read paths
    // would report different harvestability for the same crop.
    await this.water.advanceFarmGrowth(farmId);

    const { data: rows, error } = await adminClient
      .from('farm_plots')
      .select('id, slot_index, state, crop_instances(*)')
      .eq('farm_id', farmId)
      .order('slot_index', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message || 'Failed to load farm plots');
    }

    const plots = (rows ?? []) as Array<Record<string, unknown>>;
    return toPlotViews(plots);
  }

  // ==================================================================
  // Letsema — the 500-Botho pillar (02 §6.4; 05 §P5)
  // ==================================================================

  /**
   * Whether Letsema may be used right now, and why not if it may not. Both gates
   * are read server-side: the client is told the answer, never asked for it.
   */
  async letsemaStatus(farmId: string, userId: string, now = new Date()): Promise<LetsemaStatus> {
    await this.verifyFarmOwnership(farmId, userId);

    const botho = await this.wallet.getBotho(userId);
    const required = BOTHO_THRESHOLDS.LETSEMA;

    if (botho < required) {
      return { eligible: false, reason: 'botho_too_low', botho, required, availableAt: null };
    }

    const last = await this.wallet.letsemaLastUsedAt(userId);
    if (last) {
      const readyAt = last.getTime() + LETSEMA_COOLDOWN_DAYS * 86_400_000;
      if (now.getTime() < readyAt) {
        return {
          eligible: false,
          reason: 'on_cooldown',
          botho,
          required,
          availableAt: new Date(readyAt).toISOString(),
        };
      }
    }

    return { eligible: true, reason: 'ok', botho, required, availableAt: null };
  }

  /**
   * One free full harvest, once every LETSEMA_COOLDOWN_DAYS, at Botho >= 500.
   *
   * Advance growth ONCE and then take every ready plot in a single call — the point
   * of Letsema is that it is a community working-bee, not a faster pair of hands.
   */
  async letsema(farmId: string, userId: string, now = new Date()): Promise<LetsemaResult> {
    const adminClient = this.supabaseService.getAdminClient();

    const status = await this.letsemaStatus(farmId, userId, now);
    if (!status.eligible) {
      throw new BadRequestException(
        status.reason === 'botho_too_low'
          ? `Letsema needs ${status.required} Botho — you have ${status.botho}`
          : `Letsema is used for one harvest every ${LETSEMA_COOLDOWN_DAYS} days — available ${status.availableAt}`,
      );
    }

    await this.water.advanceFarmGrowth(farmId, now);

    const { data: plots } = await adminClient
      .from('farm_plots')
      .select('*, crop_instances(*)')
      .eq('farm_id', farmId)
      .eq('state', 'READY');

    const ready = (plots ?? []) as Array<Record<string, unknown>>;
    if (ready.length === 0) {
      // Do not burn a weekly power on an empty field. Refusing is kinder than
      // quietly starting the cooldown for nothing.
      throw new BadRequestException('Nothing is ready to harvest yet');
    }

    const harvests: HarvestResult[] = [];
    for (const plot of ready) {
      harvests.push(await this.collectCrop(farmId, plot));
    }

    await this.wallet.markLetsemaUsed(userId, now);

    return {
      plotsHarvested: harvests.length,
      harvests,
      nextAvailableAt: new Date(
        now.getTime() + LETSEMA_COOLDOWN_DAYS * 86_400_000,
      ).toISOString(),
    };
  }

  // ==================================================================
  // internals
  // ==================================================================

  private async loadPlot(farmId: string, plotId: string): Promise<Record<string, unknown>> {
    const adminClient = this.supabaseService.getAdminClient();
    const { data: plot } = await adminClient
      .from('farm_plots')
      .select('*, crop_instances(*)')
      .eq('id', plotId)
      .eq('farm_id', farmId)
      .single();

    if (!plot) {
      throw new NotFoundException('Plot not found');
    }
    return plot as Record<string, unknown>;
  }

  /**
   * Roll the yield, clear the plot, bank the crop. Shared by a single harvest and
   * by Letsema so the two can never disagree about what a harvest is worth.
   */
  private async collectCrop(
    farmId: string,
    plotRow: Record<string, unknown>,
  ): Promise<HarvestResult> {
    const adminClient = this.supabaseService.getAdminClient();
    const plotId = plotRow.id as string;

    const instances = plotRow.crop_instances;
    const crop = (
      Array.isArray(instances) ? instances[0] : instances
    ) as Record<string, unknown> | undefined;
    if (!crop) {
      throw new BadRequestException('Plot has no crop to harvest');
    }

    const cropType = crop.crop_type as string;
    const cropConfig = getCropConfig(cropType);

    const yieldAmount =
      Math.floor(
        Math.random() * ((cropConfig?.yield.max ?? 5) - (cropConfig?.yield.min ?? 3) + 1),
      ) + (cropConfig?.yield.min ?? 3);

    const health = crop.health as number;
    const qualityScore = health;
    const quality = 'normal'; // quality grading removed in P3 (03 §2)

    const now = new Date().toISOString();

    // Clear plot
    await adminClient.from('farm_plots').update({ state: 'EMPTY', updated_at: now }).eq('id', plotId);
    // Delete crop instance
    await adminClient.from('crop_instances').delete().eq('id', crop.id);

    // Add to the canonical inventory store (handles stack + slot caps). Items go to
    // player_inventory, never the legacy `inventory` table.
    const playerId = await this.inventory.resolvePlayerId(farmId);
    const { overflow } = await this.inventory.addItem(playerId, farmId, cropType, yieldAmount);
    const stored = yieldAmount - overflow;

    return {
      plot: { id: plotId, state: 'EMPTY' },
      harvest: {
        cropType,
        yield: stored,
        quality,
        qualityScore,
        xpGained: 0,
      },
      inventoryAddition: {
        itemType: cropType,
        quantity: stored,
        quality,
      },
    };
  }

  private async verifyFarmOwnership(farmId: string, userId: string): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();
    const { data: farm } = await adminClient
      .from('farms')
      .select('user_id')
      .eq('id', farmId)
      .single();

    if (!farm) throw new NotFoundException('Farm not found');
    if ((farm as Record<string, unknown>).user_id !== userId) {
      throw new NotFoundException('Farm not found');
    }
  }
}
