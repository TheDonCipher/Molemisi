import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { SimulationService } from '../simulation/simulation.service';
import { WalletService } from '../wallet/wallet.service';
import { PlotView, toPlotViews } from '../crops/plot-view';
import { BOTHO_DAILY_CAP, nextLandTier, type LandTier } from '@molemisi/game-config';

/**
 * GET /farms/current payload.
 *
 * `plots` is the canonical PlotView — the same shape `GET /farms/:farmId/plots`
 * returns — so the two read paths cannot disagree about what a plot is.
 *
 * P4 changed what a plot *is*: growth is hour-based (readiness =
 * `crop.growthProgressHours >= crop.growthHours`) and there is no per-plot
 * `hydration` for the client to act on, because water now lives in one shared
 * Jojo tank for the whole farm (see `GET /water`). The old `crop.hydration`
 * field was a leftover of the retired per-plot watering action.
 */
/** Welcome-back summary (09 §9): what the offline simulation did while away. */
export interface SimulationSummary {
  awayMinutes: number;
  cropsReady: number;
  livestockProducts: number;
  buildingsCompleted: number;
  buildingsMaintenance: number;
  seasonChanged: boolean;
  newSeason: string | null;
  weather: string | null;
  /** Botho credited for missed days (03 §9.4 catch-up) — 0 when none. */
  bothoCatchUp: number;
}

export interface FarmWithPlots {
  farm: {
    id: string;
    name: string;
    plotCount: number;
    weather: string;
    weatherTemperature: number;
    weatherHumidity: number;
    season: string;
    currentDay: number;
    lastSimulatedAt: string;
  };
  plots: PlotView[];
  /** Non-null only when the player was away ≥30 min AND the sim has news to report. */
  simulation: SimulationSummary | null;
  /** The next land-ladder rung (C15), or null when the farm is at 20 plots. */
  nextLand: { plots: number; costPula: number } | null;
}

@Injectable()
export class FarmsService {
  constructor(
    private supabaseService: SupabaseService,
    private simulationService: SimulationService,
    private wallet: WalletService,
  ) {}

  async getFarmForUser(userId: string): Promise<FarmWithPlots> {
    const adminClient = this.supabaseService.getAdminClient();

    // Run simulation to advance time-dependent systems
    const { data: farmForSim } = await adminClient
      .from('farms')
      .select('id, last_simulated_at')
      .eq('user_id', userId)
      .single();

    // Away-time is measured BEFORE the simulation stamps last_simulated_at.
    // The summary (09 §9 welcome-back) is only surfaced when the player was
    // gone ≥30 min AND something reportable happened — a 30-second relog or
    // a quiet night must not pop a sheet.
    let simulation: SimulationSummary | null = null;
    if (farmForSim) {
      const lastSim = farmForSim.last_simulated_at
        ? new Date(farmForSim.last_simulated_at as string).getTime()
        : Date.now();
      const awayMinutes = (Date.now() - lastSim) / 60000;
      const sim = await this.simulationService.simulateFarm(farmForSim.id);

      // 03 §9.4 — Botho catch-up (ruled 2026-09-22): the daily cap governs
      // *earning*, so absence shouldn't erase community standing. Missed days
      // credit 25% of the daily cap each, at most 3 days, still through
      // creditBothoCapped so today's legal cap (I4) is never bypassed.
      let bothoCatchUp = 0;
      const missedDays = Math.min(3, Math.floor(awayMinutes / 1440));
      if (missedDays > 0) {
        bothoCatchUp = await this.wallet.creditBothoCapped(
          userId,
          Math.round(BOTHO_DAILY_CAP * 0.25 * missedDays),
          'botho_catchup',
        );
      }

      const hasNews =
        sim.cropsReady + sim.livestockProducts + sim.buildingsCompleted + sim.buildingsMaintenance >
          0 ||
        sim.seasonChanged ||
        bothoCatchUp > 0;
      if (awayMinutes >= 30 && hasNews) {
        simulation = {
          awayMinutes: Math.round(awayMinutes),
          cropsReady: sim.cropsReady,
          livestockProducts: sim.livestockProducts,
          buildingsCompleted: sim.buildingsCompleted,
          buildingsMaintenance: sim.buildingsMaintenance,
          seasonChanged: sim.seasonChanged,
          newSeason: sim.newSeason,
          weather: sim.weather?.type ?? null,
          bothoCatchUp,
        };
      }
    }

    // Get farm (fresh read after simulation)
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

    // C15 — the next land-ladder rung, quoted from the fresh farm read.
    const nextLandTierInfo: LandTier | null = nextLandTier(farm.plot_count as number);

    return {
      farm: {
        id: farm.id,
        name: farm.name,
        plotCount: farm.plot_count,
        weather: farm.weather_state,
        weatherTemperature: farm.weather_temperature,
        weatherHumidity: farm.weather_humidity,
        season: farm.season,
        currentDay: farm.current_day,
        lastSimulatedAt: farm.last_simulated_at || new Date().toISOString(),
      },
      plots: toPlotViews((plots ?? []) as Array<Record<string, unknown>>),
      simulation,
      nextLand: nextLandTierInfo
        ? { plots: nextLandTierInfo.plots, costPula: nextLandTierInfo.costPula ?? 0 }
        : null,
    };
  }

  /**
   * C15 — the land ladder. A rung is bought as a BATCH from the F17-raised
   * tiers in game-config (4→8: P1,200 · 8→12: P6,000 · 12→20: P30,000), so the
   * shipped build and the balance model share one copy of the numbers.
   *
   * Each purchased plot is a real `farm_plots` row, exactly like registration
   * creates them; `farms.plot_count` stays the capacity truth.
   */
  async purchasePlot(userId: string): Promise<{
    plotCount: number;
    tierCost: number;
    nextLand: { plots: number; costPula: number } | null;
  }> {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: farm } = await adminClient
      .from('farms')
      .select('id, user_id, plot_count')
      .eq('user_id', userId)
      .single();

    if (!farm) {
      throw new NotFoundException('Farm not found');
    }
    if ((farm.user_id as string) !== userId) {
      throw new ForbiddenException('You do not own this farm');
    }

    const currentPlots = farm.plot_count as number;
    const tier = nextLandTier(currentPlots);
    if (!tier || tier.costPula == null) {
      throw new NotFoundException('The farm is already at its maximum of 20 plots');
    }

    // Atomic check-and-debit (05 §P2) — the only sanctioned Pula movement.
    await this.wallet.spendPula(userId, tier.costPula, 'land_purchase');

    const newPlots = Array.from({ length: tier.plots - currentPlots }, (_, i) => ({
      farm_id: farm.id as string,
      slot_index: currentPlots + i,
      state: 'EMPTY' as const,
    }));
    const { error: plotsError } = await adminClient.from('farm_plots').insert(newPlots);

    if (plotsError) {
      // Nothing exists to keep the money for — refund and surface the failure.
      await this.wallet.credit(userId, 'pula', tier.costPula, 'refund');
      throw new Error('Failed to create the new plots');
    }

    const { error: updateError } = await adminClient
      .from('farms')
      .update({ plot_count: tier.plots })
      .eq('id', farm.id as string);

    if (updateError) {
      // Roll the whole rung back — plots AND money — rather than leave a farm
      // whose count disagrees with its rows.
      await adminClient
        .from('farm_plots')
        .delete()
        .eq('farm_id', farm.id as string)
        .gte('slot_index', currentPlots);
      await this.wallet.credit(userId, 'pula', tier.costPula, 'refund');
      throw new Error('Failed to update the farm');
    }

    const next = nextLandTier(tier.plots);
    return {
      plotCount: tier.plots,
      tierCost: tier.costPula ?? 0,
      nextLand: next ? { plots: next.plots, costPula: next.costPula ?? 0 } : null,
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
