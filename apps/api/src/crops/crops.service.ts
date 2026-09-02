import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { XP_REWARDS } from '@molemisi/game-config';

interface PlantResult {
  plot: { id: string; state: string; slotIndex: number };
  crop: { id: string; type: string; growthStage: number; hydration: number };
  xpGained: number;
}

interface WaterResult {
  plot: { id: string; state: string };
  crop: { hydration: number; lastWateredAt: string };
  waterUsed: number;
  xpGained: number;
}

interface HarvestResult {
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

@Injectable()
export class CropsService {
  constructor(private supabaseService: SupabaseService) {}

  async plantCrop(
    farmId: string,
    plotId: string,
    userId: string,
    cropType: string,
    seedId: string,
  ): Promise<PlantResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // Use database transaction via RPC
    const { data: result, error } = await adminClient.rpc('plant_crop_transaction', {
      p_farm_id: farmId,
      p_plot_id: plotId,
      p_crop_type: cropType,
      p_seed_id: seedId,
      p_user_id: userId,
    });

    if (error) {
      throw new BadRequestException(error.message || 'Failed to plant crop');
    }

    if (!result?.success) {
      throw new BadRequestException('Failed to plant crop');
    }

    // Fetch updated plot data
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
      xpGained: XP_REWARDS.PLANT_CROP,
    };
  }

  async waterCrop(farmId: string, plotId: string): Promise<WaterResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get crop instance
    const { data: plot } = await adminClient
      .from('farm_plots')
      .select('*, crop_instances(*)')
      .eq('id', plotId)
      .eq('farm_id', farmId)
      .single();

    if (!plot || !plot.crop_instances || plot.crop_instances.length === 0) {
      throw new NotFoundException('No crop on this plot');
    }

    const crop = Array.isArray(plot.crop_instances) ? plot.crop_instances[0] : plot.crop_instances;
    const newHydration = Math.min(1.0, (crop.hydration as number) + 0.3);
    const now = new Date().toISOString();

    await adminClient
      .from('crop_instances')
      .update({
        hydration: newHydration,
        last_watered_at: now,
        updated_at: now,
      })
      .eq('id', crop.id);

    return {
      plot: { id: plotId, state: plot.state as string },
      crop: {
        hydration: newHydration,
        lastWateredAt: now,
      },
      waterUsed: 1,
      xpGained: XP_REWARDS.WATER_CROP,
    };
  }

  async harvestCrop(farmId: string, plotId: string): Promise<HarvestResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get plot and crop
    const { data: plot } = await adminClient
      .from('farm_plots')
      .select('*, crop_instances(*)')
      .eq('id', plotId)
      .eq('farm_id', farmId)
      .single();

    if (!plot) {
      throw new NotFoundException('Plot not found');
    }

    if (plot.state !== 'READY') {
      throw new BadRequestException('Crop is not ready for harvest');
    }

    const crop = Array.isArray(plot.crop_instances) ? plot.crop_instances[0] : plot.crop_instances;
    const cropConfig = getCropConfig(crop.crop_type as string);

    // Calculate yield
    const yieldAmount =
      Math.floor(Math.random() * ((cropConfig?.yield.max ?? 5) - (cropConfig?.yield.min ?? 3) + 1)) +
      (cropConfig?.yield.min ?? 3);

    // Calculate quality based on hydration consistency and health
    const health = crop.health as number;
    const qualityScore = health;
    let quality = 'normal';
    if (qualityScore >= 0.9) quality = 'excellent';
    else if (qualityScore >= 0.7) quality = 'good';
    else if (qualityScore < 0.3) quality = 'poor';

    const now = new Date().toISOString();

    // Clear plot
    await adminClient
      .from('farm_plots')
      .update({ state: 'EMPTY', updated_at: now })
      .eq('id', plotId);

    // Delete crop instance
    await adminClient.from('crop_instances').delete().eq('id', crop.id);

    // Add to inventory (upsert)
    const { data: existingItem } = await adminClient
      .from('inventory')
      .select('*')
      .eq('farm_id', farmId)
      .eq('item_type', crop.crop_type as string)
      .eq('quality', quality)
      .single();

    if (existingItem) {
      await adminClient
        .from('inventory')
        .update({ quantity: existingItem.quantity + yieldAmount, updated_at: now })
        .eq('id', existingItem.id);
    } else {
      await adminClient.from('inventory').insert({
        farm_id: farmId,
        item_type: crop.crop_type as string,
        item_category: 'product',
        quantity: yieldAmount,
        quality,
      });
    }

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      farm_id: farmId,
      entry_type: 'CROP_SALE',
      currency_change: 0,
      currency_balance_after: 0,
      item_type: crop.crop_type as string,
      item_quantity_change: yieldAmount,
      item_quality: quality,
      description: `Harvested ${yieldAmount} ${crop.crop_type}`,
    });

    return {
      plot: { id: plotId, state: 'EMPTY' },
      harvest: {
        cropType: crop.crop_type as string,
        yield: yieldAmount,
        quality,
        qualityScore,
        xpGained: XP_REWARDS.HARVEST_CROP,
      },
      inventoryAddition: {
        itemType: crop.crop_type as string,
        quantity: yieldAmount,
        quality,
      },
    };
  }
}
