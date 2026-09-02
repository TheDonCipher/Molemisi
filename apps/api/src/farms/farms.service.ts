import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

interface FarmWithPlots {
  farm: {
    id: string;
    name: string;
    level: number;
    plotCount: number;
    weather: string;
    season: string;
  };
  plots: Array<{
    id: string;
    slotIndex: number;
    state: string;
    crop?: {
      type: string;
      growthStage: number;
      hydration: number;
    };
  }>;
}

@Injectable()
export class FarmsService {
  constructor(private supabaseService: SupabaseService) {}

  async getFarmForUser(userId: string): Promise<FarmWithPlots> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get farm
    const { data: farm, error: farmError } = await adminClient
      .from('farms')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (farmError || !farm) {
      throw new NotFoundException('Farm not found');
    }

    // Get plots with crops
    const { data: plots, error: plotsError } = await adminClient
      .from('farm_plots')
      .select('*, crop_instances(*)')
      .eq('farm_id', farm.id)
      .order('slot_index');

    if (plotsError) {
      throw new Error('Failed to fetch plots');
    }

    return {
      farm: {
        id: farm.id,
        name: farm.name,
        level: farm.level,
        plotCount: farm.plot_count,
        weather: farm.weather_state,
        season: farm.season,
      },
      plots: (plots ?? []).map((plot: Record<string, unknown>) => ({
        id: plot.id as string,
        slotIndex: plot.slot_index as number,
        state: plot.state as string,
        crop: Array.isArray(plot.crop_instances) && plot.crop_instances.length > 0
          ? {
              type: (plot.crop_instances[0] as Record<string, unknown>).crop_type as string,
              growthStage: (plot.crop_instances[0] as Record<string, unknown>).growth_stage as number,
              hydration: (plot.crop_instances[0] as Record<string, unknown>).hydration as number,
            }
          : undefined,
      })),
    };
  }

  async verifyFarmOwnership(farmId: string, userId: string): Promise<boolean> {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: farm } = await adminClient
      .from('farms')
      .select('user_id')
      .eq('id', farmId)
      .single();

    if (!farm) {
      throw new NotFoundException('Farm not found');
    }

    if (farm.user_id !== userId) {
      throw new ForbiddenException('You do not own this farm');
    }

    return true;
  }
}
