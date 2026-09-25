import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { WaterService } from '../water/water.service';
import { CraftingService } from '../crafting/crafting.service';
import {
  BOTHO_DAILY_CAP,
  BOTHO_THRESHOLDS,
  DAILY_TOP_UP_CAP_BWP,
  SCENES,
  chapterForDate,
  elderLine,
  findsForScene,
  getCropConfig,
  type ElderSnapshot,
} from '@molemisi/game-config';

/**
 * P5 — Kgotla and the Three Pillars (05 §P5; 02 §6.4 thresholds; 03 §7 Elder).
 *
 * The three pillars have **no levels and no XP** (D5/C12). Standing is one number —
 * Botho — and this service is the only place that reads it back to the player. If a
 * level or XP field ever appears in a response from here, that is a bug.
 */

export interface PulaView {
  balance: number;
  /** R4 — the daily top-up cap, in Botswana time. */
  topUpUsedToday: number;
  topUpCap: number;
  topUpRemaining: number;
}

export interface BothoThreshold {
  key: string;
  value: number;
  remaining: number;
}

export interface BothoView {
  current: number;
  thresholds: Record<string, number>;
  /** The next rung, or null when the player has passed all of them. */
  next: BothoThreshold | null;
  earnedToday: number;
  dailyCap: number;
  remainingToday: number;
}

export interface JournalView {
  pagesComplete: number;
  totalPages: number;
  /**
   * Doc 11 §3 — Water Whispers listened to. This is the Deep Time "+1 Journal
   * Progress": one row per listen in `lore_entries`, additive forever, never
   * spendable.
   */
  whispers: number;
  /**
   * Doc 11 §6 — Guardian of Sesana: Journal at 100% AND Botho >= 500. Written
   * once by the server (profiles.is_guardian_of_sesana) and never cleared —
   * honours have no downgrades. Gates the Heritage Tree.
   */
  isGuardianOfSesana: boolean;
}

export interface ProgressionView {
  pula: PulaView;
  botho: BothoView;
  journal: JournalView;
}

export interface SceneAccess {
  slug: string;
  name: string;
  setswana: string;
  blurb: string;
  bothoRequired: number;
  unlocked: boolean;
  /** Row exists but has no content yet — the client shows "coming soon". */
  comingSoon: boolean;
  /** False for a scene that ships with zero hotspots. */
  hasContent: boolean;
}

export interface ElderGuidance {
  id: string;
  setswana: string;
  english: string;
  snapshot: ElderSnapshot;
}

/** Botho's rungs, in the order a player meets them (02 §6.4). */
export const BOTHO_LADDER: Array<{ key: string; value: number }> = [
  { key: 'BUPI_RECIPE', value: BOTHO_THRESHOLDS.BUPI_RECIPE },
  { key: 'DEEP_BUSHVELD', value: BOTHO_THRESHOLDS.DEEP_BUSHVELD },
  { key: 'LETSEMA', value: BOTHO_THRESHOLDS.LETSEMA },
  { key: 'PRIZE_ELIGIBILITY', value: BOTHO_THRESHOLDS.PRIZE_ELIGIBILITY },
];

@Injectable()
export class ProgressionService {
  constructor(
    private supabase: SupabaseService,
    private wallet: WalletService,
    private water: WaterService,
    private crafting: CraftingService,
  ) {}

  /**
   * `GET /progression` — the whole standing read in one call.
   * Note the absence of level and XP: they do not exist any more (D5).
   */
  async getProgression(playerId: string, now = new Date()): Promise<ProgressionView> {
    const [wallet, topUpToday, bothoToday, journal] = await Promise.all([
      this.wallet.getWallet(playerId),
      this.wallet.topUpTotalToday(playerId, now),
      this.wallet.bothoEarnedToday(playerId, now),
      this.journalProgress(playerId),
    ]);

    const botho = wallet.botho_points;
    const next = BOTHO_LADDER.find((rung) => botho < rung.value) ?? null;

    return {
      pula: {
        balance: Number(wallet.pula_balance),
        topUpUsedToday: topUpToday,
        topUpCap: DAILY_TOP_UP_CAP_BWP,
        topUpRemaining: Math.max(0, DAILY_TOP_UP_CAP_BWP - topUpToday),
      },
      botho: {
        current: botho,
        thresholds: { ...BOTHO_THRESHOLDS },
        next: next ? { ...next, remaining: next.value - botho } : null,
        earnedToday: bothoToday,
        dailyCap: BOTHO_DAILY_CAP,
        // I4 — this is the legal control. A player who has hit the cap can do the
        // act; they simply stop accruing standing for it today.
        remainingToday: Math.max(0, BOTHO_DAILY_CAP - bothoToday),
      },
      journal,
    };
  }

  /**
   * A page is complete when every distinct find in the scene has been discovered
   * (04 §7). The reward is the restoration of the scene's art — there is no
   * numeric buff, by design (R5/C6).
   */
  async journalProgress(playerId: string): Promise<JournalView> {
    // Deep Bushveld ships with zero hotspots, so it is not counted as a page:
    // a scene with nothing to find would otherwise read as complete on day one.
    const pages = SCENES.filter((s) => findsForScene(s.slug).length > 0);

    const { data } = await this.supabase
      .getAdminClient()
      .from('field_journal_entries')
      .select('scene_id, discovery_slug')
      .eq('player_id', playerId);

    const byScene = new Map<string, Set<string>>();
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const scene = String(row.scene_id ?? '');
      const slug = String(row.discovery_slug ?? '');
      const set = byScene.get(scene) ?? new Set<string>();
      set.add(slug);
      byScene.set(scene, set);
    }

    let pagesComplete = 0;
    for (const scene of pages) {
      const found = byScene.get(scene.slug)?.size ?? 0;
      if (found >= findsForScene(scene.slug).length) pagesComplete++;
    }

    // Doc 11 §3 — Water Whispers listened to: the Deep Time "+1 Journal
    // Progress". One row per listen in `lore_entries`, counted here so the
    // Journal's quiet moments live beside its discoveries.
    const { data: whisperRows } = await this.supabase
      .getAdminClient()
      .from('lore_entries')
      .select('slug')
      .eq('player_id', playerId)
      .eq('kind', 'water_whisper');
    const whispers = (whisperRows ?? []).length;

    // Doc 11 §6 — Guardian of Sesana: Journal at 100% AND Botho >= 500. The
    // title is written to profiles ONCE and never cleared (honours have no
    // downgrades); until then the view reports what the title WOULD be, so the
    // client can show the Heritage Tree unlock coming. Purely positive: a
    // player who has earned it can never lose it.
    let isGuardianOfSesana = false;
    if (pages.length > 0 && pagesComplete >= pages.length) {
      const botho = await this.wallet.getBotho(playerId);
      if (botho >= 500) {
        const admin = this.supabase.getAdminClient();
        const { data: profile } = await admin
          .from('profiles')
          .select('is_guardian_of_sesana')
          .eq('id', playerId)
          .maybeSingle();
        const already =
          Boolean((profile as Record<string, unknown> | null)?.is_guardian_of_sesana) ?? false;
        isGuardianOfSesana = true;
        if (profile && !already) {
          await admin
            .from('profiles')
            .update({ is_guardian_of_sesana: true })
            .eq('id', playerId);
          // One dated lore row so the honour has a moment attached to it.
          await admin.from('lore_entries').insert({
            player_id: playerId,
            kind: 'guardian_of_sesana',
            slug: 'guardian_of_sesana',
            quote: 'Named Guardian of Sesana — keeper of the land and its memory.',
            is_original: false,
          });
        }
      }
    }

    return { pagesComplete, totalPages: pages.length, whispers, isGuardianOfSesana };
  }

  /**
   * 03 §7 — the Elder reads REAL state, not a dialogue tree. Every field of the
   * snapshot is queried live, so the line changes when the tank empties, when rain
   * comes in, or when a craft finishes. The rules themselves live in config
   * (`ELDER_RULES`), ordered, first match wins.
   */
  async getElderGuidance(farmId: string, now = new Date()): Promise<ElderGuidance> {
    const admin = this.supabase.getAdminClient();

    const { data: farm } = await admin
      .from('farms')
      .select('id, user_id, weather_state')
      .eq('id', farmId)
      .single();

    if (!farm) throw new NotFoundException('Farm not found');
    const row = farm as Record<string, unknown>;
    const playerId = row.user_id as string;

    const tank = await this.water.getTankStatus(farmId);
    const tankPct = tank.capacity > 0 ? (tank.waterLevel / tank.capacity) * 100 : 0;

    const { data: plots } = await admin
      .from('farm_plots')
      .select('state')
      .eq('farm_id', farmId);
    const readyPlots = (plots ?? []).filter(
      (p) => (p as Record<string, unknown>).state === 'READY',
    ).length;

    // "Thirsty" is a fact the water engine already recorded: a crop that grew
    // nothing on its last tick because the tank was dry. Not a guess.
    const { data: crops } = await admin
      .from('crop_instances')
      .select('crop_type, growth_progress_hours, hydration')
      .eq('farm_id', farmId);
    let thirstyPlots = 0;
    for (const c of (crops ?? []) as Array<Record<string, unknown>>) {
      const growthHours = getCropConfig(String(c.crop_type ?? ''))?.growthHours;
      if (growthHours == null) continue;
      const progress = Number(c.growth_progress_hours ?? 0);
      if (progress < growthHours && Number(c.hydration ?? 1) <= 0) thirstyPlots++;
    }

    const jobs = await this.crafting.listJobs(playerId);
    const uncollectedCrafts = jobs.filter(
      (j) => !j.collected && new Date(j.readyAt).getTime() <= now.getTime(),
    ).length;

    const snapshot: ElderSnapshot = {
      tankPct,
      weather: String(row.weather_state ?? 'clear'),
      botho: await this.wallet.getBotho(playerId),
      // The year is real (04 §9.1), so the season is whoever the calendar says it
      // is — not a per-farm clock. This is what makes the dry-season line fire.
      chapter: chapterForDate(now).slug,
      readyPlots,
      thirstyPlots,
      uncollectedCrafts,
      contributedToday: (await this.wallet.contributedToday(playerId, now)) > 0,
    };

    const line = elderLine(snapshot);
    return { id: line.id, setswana: line.setswana, english: line.english, snapshot };
  }

  /**
   * Scene access, gated on Botho rather than a retired level (C12/D6).
   *
   * A locked scene is reported, not refused: the client needs to show the row with
   * its requirement so the player can see what standing buys. Deep Bushveld is the
   * interesting case — unlocked at 300 but with zero hotspots, so it carries
   * `comingSoon` rather than a 403 (05 §P5).
   */
  async getSceneAccess(playerId: string): Promise<SceneAccess[]> {
    const botho = await this.wallet.getBotho(playerId);

    return SCENES.map((scene) => {
      const bothoRequired = scene.unlock?.bothoGte ?? 0;
      const unlocked = botho >= bothoRequired;
      const hasContent = findsForScene(scene.slug).length > 0;
      return {
        slug: scene.slug,
        name: scene.name,
        setswana: scene.setswana,
        blurb: scene.blurb,
        bothoRequired,
        unlocked,
        comingSoon: unlocked && !hasContent,
        hasContent,
      };
    });
  }
}
