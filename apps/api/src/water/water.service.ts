import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import {
  getCropConfig,
  getBuildingConfig,
  adjacentPlotSlots,
  WATER,
  WATER_WHISPERS,
  WATER_WHISPER_CHANCE,
  MAX_OFFLINE_HOURS,
} from '@molemisi/game-config';

export interface TankStatus {
  hasTank: boolean;
  waterLevel: number;
  capacity: number;
  state: string;
}

export interface RefillResult {
  added: number;
  cost: number;
  waterLevel: number;
  capacity: number;
  /**
   * Doc 11 §3 — present on ~10% of refills that ADD water: a Water Whisper for
   * the client to fade in above the tank bar. Listening is worth +1 Journal
   * progress, recorded server-side in `lore_entries` (never client-trusted).
   */
  water_whisper?: string | null;
}

export interface GrowthAdvanceResult {
  cropsAdvanced: number;
  cropsReady: number;
  cropsStalled: number;
  waterConsumed: number;
}

/**
 * The Jojo-tank water gate and the authoritative crop-growth engine (03 §1.1, §1.2;
 * 05 §P4). Growth is hour-based and only advances while the shared tank holds water.
 * An empty tank stops the clock without killing the crop; refilling resumes from the
 * stored progress. `advanceFarmGrowth` is recomputed on read (via the farm simulation)
 * and before harvest, so the client is never trusted to decide readiness.
 */
@Injectable()
export class WaterService {
  constructor(
    private supabaseService: SupabaseService,
    private wallet: WalletService,
  ) {}

  /**
   * Advance every growing crop on the farm by the elapsed wall-clock time, gated by
   * the Jojo tank. Caller-supplied `now` keeps the read path and the harvest path in
   * lock-step (deterministic, no clock skew between the two).
   */
  async advanceFarmGrowth(farmId: string, now: Date = new Date()): Promise<GrowthAdvanceResult> {
    const admin = this.supabaseService.getAdminClient();
    const nowMs = now.getTime();

    // Farm weather + last simulation, for rain crediting and the elapsed cap.
    const { data: farm } = await admin
      .from('farms')
      .select('weather_state, last_simulated_at')
      .eq('id', farmId)
      .single();
    if (!farm) return { cropsAdvanced: 0, cropsReady: 0, cropsStalled: 0, waterConsumed: 0 };

    const lastSim = farm.last_simulated_at ? new Date(farm.last_simulated_at).getTime() : nowMs;
    const elapsedHours = Math.min((nowMs - lastSim) / 3_600_000, MAX_OFFLINE_HOURS);
    // Sub-second ticks (e.g. back-to-back reads) do nothing — avoids churn.
    if (elapsedHours < 1 / 3600) {
      return { cropsAdvanced: 0, cropsReady: 0, cropsStalled: 0, waterConsumed: 0 };
    }

    // Farm buildings in ONE read (Doc 11): the Jojo tank gates growth, and an
    // ACTIVE Heritage Tree planted on the grid blesses its neighbours — same
    // table, same single query, so the growth engine's read ORDER (and every
    // spec sequence built on it) is unchanged. Array in production; some tests
    // hand back a single legacy row without building_type, so accept both.
    const { data: tankData } = await admin
      .from('buildings')
      .select('id, building_type, water_level, capacity, state, slot_index')
      .eq('farm_id', farmId);
    const buildingRows = (
      Array.isArray(tankData) ? tankData : tankData ? [tankData] : []
    ) as Array<Record<string, unknown>>;

    let tankId: string | null = null;
    // Annotated: WATER is `as const`, so bare inference would pin this to the
    // literal 60 and reject a tank whose capacity was set at build time.
    let capacity: number = WATER.tankCapacity;
    let waterLevel = 0;
    // Prefer the typed tank; fall back to a type-less legacy/test row (never a tree).
    const tank =
      buildingRows.find((b) => b.building_type === 'water_source') ??
      buildingRows.find((b) => b.building_type == null) ??
      null;
    if (tank) {
      tankId = tank.id as string;
      capacity = (tank.capacity as number) ?? WATER.tankCapacity;
      // A tank that is not ACTIVE (under construction / disabled) cannot supply water.
      waterLevel = tank.state === 'ACTIVE' ? Number(tank.water_level ?? 0) : 0;
    }

    // Doc 11 §6 — Water Memory: the Heritage Tree, if planted on the grid and
    // ACTIVE. Read from the same row set; its `slot_index` is NULL off-grid.
    const tree =
      buildingRows.find(
        (b) =>
          b.building_type === 'setlhare_sa_boswa' &&
          b.state === 'ACTIVE' &&
          b.slot_index != null,
      ) ?? null;

    // Rain is free water (03 §1.2). Credited before the demand calc so a storm can
    // rescue a dry farm, capped at capacity.
    const weather = (farm.weather_state as string) ?? 'clear';
    const raining = weather === 'rain' || weather === 'storm';
    if (raining) {
      const rate = weather === 'storm' ? WATER.stormRatePerHour : WATER.rainRatePerHour;
      waterLevel = Math.min(capacity, waterLevel + rate * elapsedHours);
    }

    // Growing crops: progress not yet complete.
    const { data: crops } = await admin
      .from('crop_instances')
      .select('*')
      .eq('farm_id', farmId);
    const growing = (crops ?? []).filter((c) => {
      const row = c as Record<string, unknown>;
      const cfg = getCropConfig(row.crop_type as string);
      if (!cfg) return false;
      // Readiness lives in the progress counter, not a flag: crop_instances has
      // no `state` column, and the plot only ever reflects what progress says
      // (03 §8 — one source of truth, recomputed on read).
      return Number(row.growth_progress_hours ?? 0) < cfg.growthHours;
    });

    let waterConsumed = 0;
    let cropsAdvanced = 0;
    let cropsReady = 0;
    let cropsStalled = 0;

    if (growing.length > 0) {
      // Doc 11 §6 — Water Memory (Setlhare sa Boswa). The plots immediately
      // around the tree's slot satisfy only `adjacency.waterDemandMultiplier`
      // (0.8) of their normal water demand — an endless saving, never a
      // penalty. No tree means zero extra reads and every plot pays full price.
      let heritageMultiplier = 1;
      const blessedPlotIds = new Set<string>();
      if (tree && tree.slot_index != null) {
        const adjacency = getBuildingConfig('setlhare_sa_boswa')?.adjacency;
        const gridColumns = adjacency?.gridColumns ?? 4;
        heritageMultiplier = adjacency?.waterDemandMultiplier ?? 0.8;

        const { data: plots } = await admin
          .from('farm_plots')
          .select('id, slot_index')
          .eq('farm_id', farmId);
        const plotRows = (plots ?? []) as Array<Record<string, unknown>>;
        const treeSlot = Number(tree.slot_index);
        // Same helper the client uses for the golden-mist overlay — the glow and
        // the saving can never disagree about which plots are blessed.
        const blessedSlots = new Set(adjacentPlotSlots(treeSlot, gridColumns, plotRows.length));
        for (const p of plotRows) {
          if (blessedSlots.has(Number(p.slot_index))) blessedPlotIds.add(p.id as string);
        }
        if (blessedPlotIds.size === 0) heritageMultiplier = 1;
      }

      // Shared tank: each crop's water demand over the interval vs the water on hand.
      const demands = growing.map((c) => {
        const row = c as Record<string, unknown>;
        const cfg = getCropConfig(row.crop_type as string)!;
        const tickBase = row.last_growth_tick_at ?? row.planted_at;
        const cropElapsed = Math.min(
          (nowMs - new Date(tickBase as string).getTime()) / 3_600_000,
          MAX_OFFLINE_HOURS,
        );
        const plotId = row.plot_id as string;
        return {
          id: row.id as string,
          plotId,
          cfg,
          cropElapsed,
          demand:
            (blessedPlotIds.has(plotId) ? heritageMultiplier : 1) *
            cfg.waterPerHour *
            cropElapsed,
          prevProgress: Number(row.growth_progress_hours ?? 0),
          // G1 — fertilizer state rides along from the same SELECT (*).
          fertilizerActive: row.fertilizer_active === true,
          fertilizerBonus: Number(row.fertilizer_bonus ?? 0),
          fertilizedUntilStage:
            row.fertilized_until_stage == null ? null : Number(row.fertilized_until_stage),
        };
      });
      const totalDemand = demands.reduce((s, d) => s + d.demand, 0);

      // factor = fraction of each crop's demand the tank can satisfy.
      //   tank empty        -> 0  (growth halts; dry interval discarded below)
      //   demand <= tank    -> 1  (everyone grows fully)
      //   demand  > tank    -> tank/totalDemand (rationed proportionally, tank empties)
      let factor = 0;
      if (waterLevel > 0) {
        factor = totalDemand <= waterLevel ? 1 : waterLevel / totalDemand;
      }
      waterConsumed = Math.min(waterLevel, totalDemand * factor);
      waterLevel = Math.max(0, waterLevel - waterConsumed);

      for (const d of demands) {
        const advancedHours = factor * d.cropElapsed;

        // G1 (01 §Fertilization) — an active dose adds `bonus` to the progress it
        // is eligible for, only inside its stage window. The window was computed
        // at apply time: `fertilized_until_stage` = the stage the dose was applied
        // in + stages − 1, expressed as bands of growthHours / 3. The dose retires
        // the moment an interval runs past its window.
        let bonusHours = 0;
        let fertilizerSpent = false;
        if (d.fertilizerActive) {
          const until = d.fertilizedUntilStage;
          const stageBefore = Math.min(
            3,
            Math.floor((d.prevProgress / d.cfg.growthHours) * 3 + 1e-9),
          );
          if (until == null || stageBefore > until) {
            fertilizerSpent = true; // window already closed — retire the flag lazily
          } else {
            const windowEnd = ((until + 1) / 3) * d.cfg.growthHours;
            const eligible = Math.min(advancedHours, Math.max(0, windowEnd - d.prevProgress));
            bonusHours = d.fertilizerBonus * eligible;
            fertilizerSpent = advancedHours > eligible + 1e-9; // ran past the window
          }
        }

        const newProgress = d.prevProgress + advancedHours + bonusHours;
        const ready = newProgress >= d.cfg.growthHours;
        const stage = Math.min(3, Math.floor((newProgress / d.cfg.growthHours) * 3 + 1e-9));
        const newState = ready ? 'READY' : newProgress > 0 ? 'GROWING' : 'PLANTED';
        if (advancedHours > 1e-9) cropsAdvanced++;
        // Telemetry for the Moriti water-squeeze playtest (ruled 2026-09-22):
        // a crop that wanted to grow but drank nothing is a stall, whether the
        // tank was fully dry or just rationed thin.
        if (!ready && d.cropElapsed > 1e-9 && advancedHours <= 1e-9) cropsStalled++;

        await admin
          .from('crop_instances')
          .update({
            growth_progress_hours: newProgress,
            growth_stage: stage,
            last_growth_tick_at: now.toISOString(),
            // hydration is display-only now: 1.0 if it drank this tick, 0 if the tank
            // was dry. It no longer gates growth.
            hydration: factor > 0 ? 1.0 : 0.0,
            ...(d.fertilizerActive ? { fertilizer_active: !fertilizerSpent } : {}),
            updated_at: now.toISOString(),
          })
          .eq('id', d.id);

        await admin
          .from('farm_plots')
          .update({ state: newState, updated_at: now.toISOString() })
          .eq('id', d.plotId);

        if (ready) cropsReady++;
      }
    }

    // Persist the tank only if something happened to it (demand drew from it, or rain
    // filled it). Guard avoids a needless write on a no-op tick.
    if (tankId && (waterConsumed > 0 || raining)) {
      await admin
        .from('buildings')
        .update({ water_level: waterLevel, updated_at: now.toISOString() })
        .eq('id', tankId);
    }

    return { cropsAdvanced, cropsReady, cropsStalled, waterConsumed };
  }

  /** Read the tank's current level/capacity/state for the UI. */
  async getTankStatus(farmId: string): Promise<TankStatus> {
    const admin = this.supabaseService.getAdminClient();
    const { data } = await admin
      .from('buildings')
      .select('water_level, capacity, state')
      .eq('farm_id', farmId)
      .eq('building_type', 'water_source')
      .maybeSingle();

    if (!data) {
      return { hasTank: false, waterLevel: 0, capacity: WATER.tankCapacity, state: 'NONE' };
    }
    const row = data as Record<string, unknown>;
    return {
      hasTank: true,
      waterLevel: Number(row.water_level ?? 0),
      capacity: (row.capacity as number) ?? WATER.tankCapacity,
      state: (row.state as string) ?? 'ACTIVE',
    };
  }

  /**
   * Fill the Jojo tank from the water truck. Cost = units added x unit price (Pula),
   * charged through the wallet so the ledger row is written atomically. Free if the
   * tank is already full.
   */
  async refillTank(farmId: string, userId: string): Promise<RefillResult> {
    const admin = this.supabaseService.getAdminClient();
    const { data: tank } = await admin
      .from('buildings')
      .select('id, water_level, capacity, state')
      .eq('farm_id', farmId)
      .eq('building_type', 'water_source')
      .maybeSingle();

    if (!tank) {
      throw new NotFoundException('This farm has no Jojo Tank to refill');
    }
    const row = tank as Record<string, unknown>;
    if (row.state !== 'ACTIVE') {
      throw new BadRequestException(
        'The Jojo Tank is not active yet — let construction or maintenance finish first.',
      );
    }

    const capacity = (row.capacity as number) ?? WATER.tankCapacity;
    const current = Number(row.water_level ?? 0);
    const toAdd = Math.max(0, capacity - current);
    if (toAdd <= 0) {
      return { added: 0, cost: 0, waterLevel: current, capacity };
    }

    const cost = Math.ceil(toAdd * WATER.unitPricePula);
    // spendPula is the only sanctioned path (05 §P2) — atomic check-and-debit + ledger.
    await this.wallet.spendPula(userId, cost, 'water_refill');

    const { error } = await admin
      .from('buildings')
      .update({ water_level: capacity, updated_at: new Date().toISOString() })
      .eq('id', row.id as string);
    if (error) {
      // Money must never be wrong. The debit has happened, so hand it back and
      // let the ledger keep both rows — a failure the player can retry is a
      // failure, but paying for water they never received is theft.
      await this.wallet.credit(userId, 'pula', cost, 'refund');
      throw new BadRequestException('Failed to refill the Jojo Tank');
    }

    // Doc 11 §3 — the Water Whisper (Metsi a a Gopola). The tank has just filled
    // and, on a refill that actually added water, there is a small chance it
    // "speaks": the memory of old rains rising up the pipes at the moment of
    // plenty. The roll lives here for the same reason the tank does — a client
    // that "rolled" could simply decide to hear a whisper every time. A listen
    // is recorded server-side in `lore_entries` (one row per quote, `is_original`
    // marking the first), and the line is handed back only so the UI has
    // something to display. Purely positive: +1 Journal progress, nothing spent.
    let waterWhisper: string | null = null;
    if (WATER_WHISPERS.length > 0 && Math.random() < WATER_WHISPER_CHANCE) {
      const whisper = WATER_WHISPERS[Math.floor(Math.random() * WATER_WHISPERS.length)];
      if (whisper) {
        waterWhisper = whisper.text;
        const base = {
          player_id: userId,
          kind: 'water_whisper',
          slug: whisper.slug,
          quote: whisper.text,
        };
        // No pre-read: the partial unique index on (player_id, slug) is the
        // source of truth, so a repeat listen answers itself.
        const { error: whisperError } = await admin.from('lore_entries').insert({
          ...base,
          is_original: true,
        });
        if (whisperError) {
          const duplicate =
            (whisperError as { code?: string }).code === '23505' ||
            /duplicate key|unique constraint/i.test(whisperError.message ?? '');
          if (duplicate) {
            // The same memory rising again — recorded, never a second original.
            await admin
              .from('lore_entries')
              .upsert({ ...base, is_original: false }, { onConflict: 'player_id,slug' });
          }
          // Any other logging failure is swallowed on purpose. The water is
          // already paid for and in the tank, and a whisper is a gift rather
          // than a receipt: the player keeps the line, only the row is lost.
        }
      }
    }

    return { added: toAdd, cost, waterLevel: capacity, capacity, water_whisper: waterWhisper };
  }
}
