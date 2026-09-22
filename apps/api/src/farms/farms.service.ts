import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { SimulationService } from '../simulation/simulation.service';
import { PlotView, toPlotViews } from '../crops/plot-view';

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
}

@Injectable()
export class FarmsService {
  constructor(
    private supabaseService: SupabaseService,
    private simulationService: SimulationService,
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
      const hasNews =
        sim.cropsReady + sim.livestockProducts + sim.buildingsCompleted + sim.buildingsMaintenance >
          0 || sim.seasonChanged;
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
