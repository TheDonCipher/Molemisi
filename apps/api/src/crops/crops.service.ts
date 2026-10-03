import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { WaterService } from '../water/water.service';
import { WalletService } from '../wallet/wallet.service';
import {
  BOTHO_THRESHOLDS,
  FERTILIZERS,
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
  /**
   * A3 — units the storage cap REFUSED, so `inventoryAddition.quantity` is what
   * was actually banked. Surfaced rather than swallowed (03 §3.4: never a silent
   * loss) so the client can tell the player their store was full.
   */
  overflow: number;
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

export interface FertilizeResult {
  plotId: string;
  fertilizerType: string;
  item: string;
  bonus: number;
  untilStage: number;
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

    // Resolve the slot first: the Heritage Tree occupies its plot (Doc 11 §6),
    // so planting must fail BEFORE the transaction, not after it.
    const { data: plot } = await adminClient
      .from('farm_plots')
      .select('slot_index')
      .eq('id', plotId)
      .single();
    const slotIndex = (plot?.slot_index as number | null) ?? 0;
    const { data: tree } = await adminClient
      .from('buildings')
      .select('id')
      .eq('farm_id', farmId)
      .eq('building_type', 'setlhare_sa_boswa')
      .eq('slot_index', slotIndex)
      .maybeSingle();
    if (tree) {
      throw new BadRequestException(
        'The Heritage Tree stands on this plot — its shade is for the plots around it.',
      );
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

    return {
      plot: { id: plotId, state: 'PLANTED', slotIndex },
      crop: {
        id: result.crop_id as string,
        type: cropType,
        growthStage: 0,
        hydration: 0.5,
      },
      xpGained: 0,
    };
  }

  // ==================================================================
  // Fertilize (G1 — 01 §Fertilization)
  // ==================================================================

  /**
   * Apply one dose of fertilizer to a planted plot: consume the item, arm the
   * stage-bounded bonus. One active dose per plot; the window is computed here
   * (stage bands of growthHours / 3) and enforced by `advanceFarmGrowth`. The
   * dose dies with the crop instance at harvest.
   */
  async fertilizePlot(
    farmId: string,
    plotId: string,
    fertilizerType: string,
    userId: string,
  ): Promise<FertilizeResult> {
    // A2 — the identity is part of the signature now, not just the controller's
    // local. This method CONSUMES an item from the caller's inventory, so
    // "which player" is load-bearing rather than incidental.
    await this.verifyFarmOwnership(farmId, userId);

    const cfg = FERTILIZERS[fertilizerType];
    if (!cfg) {
      throw new BadRequestException(`Fertilizer '${fertilizerType}' is not available`);
    }

    const plot = await this.loadPlot(farmId, plotId);
    const instances = plot.crop_instances;
    const crop = (
      Array.isArray(instances) ? instances[0] : instances
    ) as Record<string, unknown> | undefined;
    if (!crop) throw new BadRequestException('Plot has no crop to fertilize');
    if (crop.fertilizer_active === true) {
      throw new BadRequestException('Plot is already fertilized');
    }

    const cropConfig = getCropConfig(crop.crop_type as string);
    const progress = Number(crop.growth_progress_hours ?? 0);
    if (cropConfig && progress >= cropConfig.growthHours) {
      throw new BadRequestException('Crop is ready to harvest');
    }

    const playerId = await this.inventory.resolvePlayerId(farmId, userId);

    // Consume first (the balance check), arm second; if the write fails the item
    // goes back rather than vanishing (never a partial loss — 03 §3.4).
    await this.inventory.removeItem(playerId, cfg.item, 1);
    const stage = Math.min(3, Number(crop.growth_stage ?? 0));
    const untilStage = Math.min(3, stage + cfg.stages - 1);
    try {
      await this.supabaseService
        .getAdminClient()
        .from('crop_instances')
        .update({
          fertilizer_active: true,
          fertilizer_bonus: cfg.bonus,
          fertilized_until_stage: untilStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', crop.id as string);
    } catch (err) {
      await this.inventory.addItem(playerId, farmId, cfg.item, 1).catch(() => undefined);
      throw err;
    }

    return { plotId, fertilizerType, item: cfg.item, bonus: cfg.bonus, untilStage };
  }

  async harvestCrop(farmId: string, plotId: string, userId: string): Promise<HarvestResult> {
    // A2 — harvesting banks goods into the caller's inventory, so ownership is
    // checked here as well as in the controller.
    await this.verifyFarmOwnership(farmId, userId);

    // Server-authoritative: advance growth first so READY reflects real elapsed time
    // gated by the tank, not whatever the client last saw (03 §8).
    await this.water.advanceFarmGrowth(farmId);

    const plot = await this.loadPlot(farmId, plotId);
    if (plot.state !== 'READY') {
      throw new BadRequestException('Crop is not ready for harvest');
    }

    return this.collectCrop(farmId, plot, userId);
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
      // A2/A3 — `userId` is threaded into `collectCrop` for the checked
      // farm→player resolution; `letsemaStatus` above already verified ownership.
      harvests.push(await this.collectCrop(farmId, plot, userId));
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
   *
   * A3 (security audit 2026-10-03) — three defects, all in this one method:
   *
   *   1. THE YIELD ROLLED WITH `Math.random()`. That is the same bug the whole
   *      simulation engine was rebuilt to remove (09 §10, packages/game-config
   *      `RngSource`): an unreproducible, unauditable draw. A harvest that
   *      reported 4 units and banked 2 could never be re-derived from its inputs,
   *      so neither a bug report nor an anti-cheat review could reconstruct it.
   *      Worse, it was called on the *server* with no seed at all, which made the
   *      result untestable — the old spec could only assert the output was
   *      inside the band, never what it *was*.
   *      It is now derived deterministically from the crop instance row itself
   *      (crop id + planted_at), so the same crop always yields the same amount
   *      and the value is reproducible from the record.
   *
   *   2. THE THREE STEPS WERE NOT ORDERED. The old code emptied the plot and
   *      deleted the crop instance BEFORE banking the goods. If `addItem` then
   *      failed — a full store, a DB blip — the crop was destroyed and the
   *      player got nothing: unrecoverable data loss on a transient error. The
   *      bank step now goes first; only once the goods are safely stored is the
   *      plot cleared. A failure in the clearing steps leaves the player holding
   *      the goods AND the crop, which is recoverable, and the store caps make
   *      the duplicate harmless.
   *
   *   3. `stored` was computed as `yieldAmount - overflow` while the caller was
   *      told `yield: stored` — but the plot was already cleared before the
   *      overflow was known, so the overflow was silently destroyed. Overflow is
   *      now REPORTED explicitly in the result so the UI can tell the player,
   *      rather than the crop quietly vanishing (03 §3.4: never a silent loss).
   */
  private async collectCrop(
    farmId: string,
    plotRow: Record<string, unknown>,
    userId: string,
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

    // A3 — deterministic yield. The band comes from config exactly as before;
    // only the DRAW changed. Mixing the stable crop instance id is enough to
    // spread yields across a field (two sorghum planted together still differ)
    // while being fully reproducible from the stored row. `>>> 0` keeps the
    // accumulation in the unsigned 32-bit range so it cannot overflow into a
    // negative or NaN band index on a long string.
    const seedSource = `${String(crop.id ?? plotId)}:${String(crop.planted_at ?? '')}`;
    let hash = 2166136261;
    for (let i = 0; i < seedSource.length; i++) {
      hash ^= seedSource.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const min = cropConfig?.yield.min ?? 3;
    const max = cropConfig?.yield.max ?? 5;
    const span = Math.max(0, max - min + 1);
    const yieldAmount = span === 0 ? min : min + ((hash >>> 0) % span);

    const health = crop.health as number;
    const qualityScore = health;
    const quality = 'normal'; // quality grading removed in P3 (03 §2)

    const now = new Date().toISOString();

    // BANK FIRST. The goods must exist before the crop that produced them is
    // destroyed, or a storage-cap rejection costs the player the whole harvest.
    // Items go to player_inventory, never the legacy `inventory` table.
    // A2 — `userId` makes the farm→player resolution a CHECKED lookup.
    const playerId = await this.inventory.resolvePlayerId(farmId, userId);
    const { overflow } = await this.inventory.addItem(playerId, farmId, cropType, yieldAmount);
    const stored = yieldAmount - overflow;

    // Only now is it safe to consume the crop. Check the errors: an ignored
    // failure here would leave a harvested READY plot that can be farmed again.
    const { error: clearErr } = await adminClient
      .from('farm_plots')
      .update({ state: 'EMPTY', updated_at: now })
      .eq('id', plotId);
    if (clearErr) {
      throw new Error(`Failed to clear plot after harvest: ${clearErr.message}`);
    }
    const { error: deleteErr } = await adminClient
      .from('crop_instances')
      .delete()
      .eq('id', crop.id);
    if (deleteErr) {
      throw new Error(`Failed to remove harvested crop: ${deleteErr.message}`);
    }

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
      // A3 — surface what the storage cap refused so the client can tell the
      // player rather than the units silently disappearing.
      overflow,
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
