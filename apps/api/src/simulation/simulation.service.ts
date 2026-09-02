import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { getCropConfig } from '@molemisi/game-config';
import { MAX_OFFLINE_HOURS } from '@molemisi/game-config';

interface CropInstanceRow {
  id: string;
  plot_id: string;
  farm_id: string;
  crop_type: string;
  growth_stage: number;
  max_growth_stages: number;
  hydration: number;
  health: number;
  fertilizer_active: boolean;
  fertilizer_bonus: number;
  disease_events: number;
  pest_events: number;
  planted_at: string;
  last_watered_at: string;
  expected_ready_at: string | null;
}

interface PlotRow {
  id: string;
  state: string;
}

interface SimulationResult {
  cropsSimulated: number;
  cropsAdvanced: number;
  cropsWithered: number;
  cropsReady: number;
  hydrationDecayed: number;
}

@Injectable()
export class SimulationService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Run the elapsed-time simulation for a farm.
   * Called whenever farm state is read (GET /farms/current).
   *
   * Algorithm:
   *   elapsed = now - last_simulated_at
   *   capped = min(elapsed, MAX_OFFLINE_HOURS)
   *   for each crop on the farm:
   *     advance_growth(crop, capped)
   *     decay_hydration(crop, capped)
   *   update last_simulated_at = now
   */
  async simulateFarm(farmId: string): Promise<SimulationResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get farm to find last_simulated_at
    const { data: farm } = await adminClient
      .from('farms')
      .select('last_simulated_at')
      .eq('id', farmId)
      .single();

    if (!farm) {
      return { cropsSimulated: 0, cropsAdvanced: 0, cropsWithered: 0, cropsReady: 0, hydrationDecayed: 0 };
    }

    const lastSimulated = new Date(farm.last_simulated_at as string).getTime();
    const now = Date.now();
    const elapsedMs = now - lastSimulated;
    const elapsedHours = elapsedMs / (1000 * 60 * 60); // ms → hours

    // Cap simulation at MAX_OFFLINE_HOURS
    const cappedHours = Math.min(elapsedHours, MAX_OFFLINE_HOURS);

    // If less than 1 minute has passed, skip simulation
    if (cappedHours < 1 / 60) {
      return { cropsSimulated: 0, cropsAdvanced: 0, cropsWithered: 0, cropsReady: 0, hydrationDecayed: 0 };
    }

    // Get all active crops on this farm
    const { data: crops } = await adminClient
      .from('crop_instances')
      .select('*')
      .eq('farm_id', farmId);

    if (!crops || crops.length === 0) {
      // Still update timestamp even if no crops
      await adminClient
        .from('farms')
        .update({ last_simulated_at: new Date(now).toISOString() })
        .eq('id', farmId);
      return { cropsSimulated: 0, cropsAdvanced: 0, cropsWithered: 0, cropsReady: 0, hydrationDecayed: 0 };
    }

    const result: SimulationResult = {
      cropsSimulated: crops.length,
      cropsAdvanced: 0,
      cropsWithered: 0,
      cropsReady: 0,
      hydrationDecayed: 0,
    };

    // Process each crop
    for (const rawCrop of crops) {
      const crop = rawCrop as unknown as CropInstanceRow;
      const cropConfig = getCropConfig(crop.crop_type);
      if (!cropConfig) continue;

      // Calculate new hydration (decays over time)
      let newHydration = crop.hydration;
      const decayAmount = cropConfig.waterDecayRate * cappedHours;
      newHydration = Math.max(0, newHydration - decayAmount);

      if (newHydration < crop.hydration) {
        result.hydrationDecayed++;
      }

      // Calculate growth
      let newStage = crop.growth_stage;
      const alreadyReady = crop.growth_stage >= crop.max_growth_stages;

      if (!alreadyReady && newHydration > 0) {
        // Growth multiplier: scales with hydration (0.2-1.0)
        const hydrationMultiplier = Math.max(0.2, newHydration);

        // Effective growth hours = real hours * hydration multiplier
        const effectiveGrowthHours = cappedHours * hydrationMultiplier;

        // Each stage takes `timePerStage` minutes = timePerStage/60 hours
        const hoursPerStage = cropConfig.timePerStage / 60;

        // How many stages can we advance?
        const stagesAdvanced = Math.floor(effectiveGrowthHours / hoursPerStage);

        if (stagesAdvanced > 0) {
          newStage = Math.min(crop.max_growth_stages, crop.growth_stage + stagesAdvanced);
          result.cropsAdvanced++;
        }
      }

      // Check for withering: if hydration is 0 for extended time
      let newState = 'GROWING';
      if (newHydration === 0 && elapsedHours > 6) {
        // Withered after 6 hours dry
        newState = 'WITHERED';
        result.cropsWithered++;
      } else if (newStage >= crop.max_growth_stages) {
        newState = 'READY';
        if (!alreadyReady) {
          result.cropsReady++;
        }
      } else if (newStage > 0) {
        newState = 'GROWING';
      } else {
        newState = 'PLANTED';
      }

      // Update crop in database
      await adminClient
        .from('crop_instances')
        .update({
          growth_stage: newStage,
          hydration: newHydration,
          updated_at: new Date(now).toISOString(),
        })
        .eq('id', crop.id);

      // Update plot state to match crop state
      await adminClient
        .from('farm_plots')
        .update({ state: newState, updated_at: new Date(now).toISOString() })
        .eq('id', crop.plot_id);
    }

    // Update farm's last_simulated_at
    await adminClient
      .from('farms')
      .update({ last_simulated_at: new Date(now).toISOString() })
      .eq('id', farmId);

    return result;
  }
}
