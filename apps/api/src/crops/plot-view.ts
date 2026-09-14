/**
 * Canonical Farm plot DTOs.
 *
 * Two read paths return plots — `GET /farms/:farmId/plots` (CropsService) and
 * `GET /farms/current` (FarmsService). They must never disagree about what a
 * plot is (03 §8: server-authoritative reads), so both shape their rows through
 * `toPlotViews` here.
 *
 * `growthHours` and `displayName` are resolved from @molemisi/game-config so the
 * web client never imports crop config just to draw the Farm grid.
 *
 * `state` is the plot's own: `EMPTY` (no crop) or `READY` (fully grown,
 * harvestable). A growing-but-not-ready crop is implied by `crop != null` while
 * state holds whatever the plant transaction set (e.g. `PLANTED`).
 */
import { getCropConfig } from '@molemisi/game-config';

export interface CropOnPlot {
  id: string;
  type: string;
  displayName: string;
  growthStage: number;
  growthProgressHours: number;
  growthHours: number;
  plantedAt: string;
  expectedReadyAt: string | null;
  /**
   * Growing, but not because of time — because the tank is dry. The water
   * engine records `hydration <= 0` on the tick it refused to advance a crop,
   * so this is a recorded fact rather than a client-side guess (same source
   * the Elder uses for its "thirsty plots" line).
   *
   * Exposed as a boolean, not as a hydration number: per-plot watering was
   * retired in P4, so the client must never be handed a per-plot water value
   * it could mistake for something the player can top up. The fix is the tank.
   */
  stalled: boolean;
}

export interface PlotView {
  id: string;
  slotIndex: number;
  state: string;
  crop: CropOnPlot | null;
}

/**
 * Shape raw `farm_plots` rows (with an embedded `crop_instances` relation) into
 * canonical PlotViews. Tolerates both array and single-object relations because
 * Supabase returns either depending on the join.
 *
 * P4 made growth hour-based (`growth_progress_hours` vs the crop's
 * `growthHours`), so progress is derived from those — never from
 * `growth_stage`, which is a cosmetic bucket.
 */
export function toPlotViews(rows: Array<Record<string, unknown>>): PlotView[] {
  return rows.map((row) => {
    const rawCrop = row.crop_instances;
    const cropRow = (Array.isArray(rawCrop) ? rawCrop[0] : rawCrop) as
      | Record<string, unknown>
      | undefined;

    let crop: CropOnPlot | null = null;
    if (cropRow) {
      const cropType = cropRow.crop_type as string;
      const config = getCropConfig(cropType);
      // Every plantable crop has a config (plantCrop rejects unknowns), so
      // these fallbacks are purely defensive.
      const growthHours = config?.growthHours ?? 0;
      const displayName = config?.name ?? cropType;
      const progressHours = Number(cropRow.growth_progress_hours ?? 0);
      const stalled =
        growthHours > 0 &&
        progressHours < growthHours &&
        Number(cropRow.hydration ?? 1) <= 0;
      crop = {
        id: cropRow.id as string,
        type: cropType,
        displayName,
        growthStage: cropRow.growth_stage as number,
        growthProgressHours: cropRow.growth_progress_hours as number,
        growthHours,
        plantedAt: cropRow.planted_at as string,
        expectedReadyAt: (cropRow.expected_ready_at as string) ?? null,
        stalled,
      };
    }

    return {
      id: row.id as string,
      slotIndex: row.slot_index as number,
      state: row.state as string,
      crop,
    };
  });
}
