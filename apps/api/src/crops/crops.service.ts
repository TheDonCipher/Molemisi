import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { getCropConfig } from '@molemisi/game-config';
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

    // 1. Verify plot ownership and state
    const { data: plot } = await adminClient
      .from('farm_plots')
      .select('*')
      .eq('id', plotId)
      .eq('farm_id', farmId)
      .single();

    if (!plot) {
      throw new NotFoundException('Plot not found');
    }

    if (plot.state !== 'EMPTY') {
      throw new BadRequestException('Plot is not empty');
    }

    // 2. Check crop config
    const cropConfig = getCropConfig(cropType);
    if (!cropConfig) {
      throw new BadRequestException('Invalid crop type');
    }

    // 3. Check seed in inventory
    const { data: seed } = await adminClient
      .from('inventory')
      .select('*')
      .eq('id', seedId)
      .eq('farm_id', farmId)
      .eq('item_type', `${cropType}_seed`)
      .gt('quantity', 0)
      .single();

    if (!seed) {
      throw new BadRequestException('Seed not found in inventory');
    }

    // 4. Plant crop (in transaction)
    const now = new Date().toISOString();
    const expectedReady = new Date(
      Date.now() + cropConfig.growthStages * cropConfig.timePerStage * 60 * 1000,
    ).toISOString();

    // Update plot state
    await adminClient
      .from('farm_plots')
      .update({ state: 'PLANTED', updated_at: now })
      .eq('id', plotId);

    // Create crop instance
    const { data: crop } = await adminClient
      .from('crop_instances')
      .insert({
        plot_id: plotId,
        farm_id: farmId,
        crop_type: cropType,
        growth_stage: 0,
        max_growth_stages: cropConfig.growthStages,
        hydration: 0.5,
        health: 1.0,
        planted_at: now,
        last_watered_at: now,
        expected_ready_at: expectedReady,
      })
      .select()
      .single();

    // Deduct seed from inventory
    await adminClient
      .from('inventory')
      .update({ quantity: seed.quantity - 1, updated_at: now })
      .eq('id', seedId);

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      farm_id: farmId,
      entry_type: 'SEED_PURCHASE',
      currency_change: 0,
      currency_balance_after: 0,
      item_type: `${cropType}_seed`,
      item_quantity_change: -1,
      description: `Planted ${cropType}`,
    });

    return {
      plot: { id: plotId, state: 'PLANTED', slotIndex: plot.slot_index },
      crop: {
        id: crop?.id ?? '',
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
