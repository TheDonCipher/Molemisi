import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { ClockService, isLiveProjectUrl } from '../common/clock.service';
import { ChapterService } from '../chapters/chapter.service';
import { InventoryService } from '../inventory/inventory.service';
import { WalletService } from '../wallet/wallet.service';
import {
  REGARD_PER_CHARGE,
  chapterForDate,
  daysUntilChapterEnd,
} from '@molemisi/game-config';
import {
  describeIssues,
  planRecovery,
  validateGameState,
  type GameStateSnapshot,
} from '../simulation/state-validation';

/**
 * D9 / W10 — the in-game dev affordances, server side.
 *
 * Every method here is a TOOL, not a game mechanic, and all of them sit behind
 * `DevGuard`. Two rules are enforced in this service rather than trusted to the
 * client:
 *
 *  1. **Never the live project** (`09 §7` hazard 2). These affordances create real
 *     rows. A hosted `SUPABASE_URL` is refused unless an operator explicitly sets
 *     `DEV_TOOLS_ALLOW_LIVE=true`, so "silently pointed at production" is not a
 *     state the dev overlay can reach by accident.
 *  2. **Nothing bypasses a sanctioned writer.** Spawning stock goes through
 *     `InventoryService.addItem` — the inverse `inventory_take` is paired with —
 *     and the clock only moves time; it never writes a balance directly.
 */
@Injectable()
export class DevService {
  private readonly logger = new Logger(DevService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly clock: ClockService,
    private readonly chapters: ChapterService,
    private readonly inventory: InventoryService,
    private readonly wallet: WalletService,
  ) {}

  /** Is this process attached to the hosted (production) project? */
  isLive(): boolean {
    return isLiveProjectUrl(process.env.SUPABASE_URL);
  }

  /** The guard. Throws unless we are on a throwaway stack (or explicitly forced). */
  assertThrowaway(): void {
    if (!this.isLive()) return;
    if (process.env.DEV_TOOLS_ALLOW_LIVE === 'true') {
      this.logger.warn('DEV TOOLS ALLOWED ON LIVE — an operator set DEV_TOOLS_ALLOW_LIVE=true');
      return;
    }
    throw new ForbiddenException(
      'Dev tools refuse to run against the live project. Point SUPABASE_URL at a throwaway ' +
        'stack, or set DEV_TOOLS_ALLOW_LIVE=true if you truly mean it.',
    );
  }

  /**
   * W10.1 — jump the calendar and immediately re-derive everything downstream.
   *
   * The important half is the rollover call: jumping past a chapter boundary must
   * zero Chapter Tokens **exactly once**, which is invariant I13 and otherwise
   * takes a season to observe. Repeating the same jump is a no-op, because
   * `rolloverChapters` only touches chapters whose window has ended.
   */
  async dateJump(target: Date) {
    this.assertThrowaway();
    if (Number.isNaN(target.getTime())) throw new BadRequestException('Invalid target date.');
    this.clock.set(target);
    const now = this.clock.now();

    const rollover = await this.chapters.rolloverChapters(now, false);
    const chapter = chapterForDate(now);

    return {
      now: now.toISOString(),
      offsetMs: this.clock.offset,
      chapter: {
        slug: chapter.slug,
        name: chapter.name,
        months: chapter.months,
        daysLeft: daysUntilChapterEnd(now),
      },
      rollover,
    };
  }

  resetClock() {
    this.clock.reset();
    return { now: this.clock.now().toISOString(), offsetMs: 0 };
  }
/**
   * W10.5 — the seven corruption classes (`09 §11`), each with its named
   * corrective action from `planRecovery`. Read-only: this reports, it never
   * repairs, so a dev can look before deciding what to do.
   */
  async state(playerId: string) {
    this.assertThrowaway();
    const admin = this.supabase.getAdminClient();

    const [{ data: wallet }, { data: farm }] = await Promise.all([
      admin
        .from('player_wallets')
        .select('pula_balance, botho_points')
        .eq('player_id', playerId)
        .maybeSingle(),
      admin.from('farms').select('id').eq('user_id', playerId).maybeSingle(),
    ]);

    const farmId = (farm as { id?: string } | null)?.id ?? undefined;
    const plots = farmId
      ? ((await admin.from('farm_plots').select('id, state').eq('farm_id', farmId)).data ?? [])
      : [];
    const crops = farmId
      ? ((await admin.from('crop_instances').select('id, plot_id').eq('farm_id', farmId)).data ?? [])
      : [];
    const cropByPlot = new Map<string, string>(
      (crops as Array<{ id: string; plot_id: string }>).map((c) => [c.plot_id, c.id]),
    );

    const owned = await this.inventory.ownedMap(playerId);
    const snapshot: GameStateSnapshot = {
      playerId,
      farmId,
      currency: Number((wallet as { pula_balance?: number } | null)?.pula_balance ?? 0),
      botho: Number((wallet as { botho_points?: number } | null)?.botho_points ?? 0),
      plots: (plots as Array<{ id: string; state: string }>).map((p) => ({
        id: p.id,
        state: p.state,
        cropId: cropByPlot.get(p.id) ?? null,
      })),
      inventory: Object.entries(owned).map(([itemType, quantity]) => ({ itemType, quantity })),
      lastSimulatedAt: null,
    };

    const result = validateGameState(snapshot, this.clock.now());
    return {
      valid: result.valid,
      issues: result.issues,
      summary: describeIssues(result),
      recovery: planRecovery(result),
    };
  }

  /**
   * W10.2 — spawn items. This deliberately calls `InventoryService.addItem`, the
   * sanctioned inverse of `inventory_take`, so the storage slot cap and the
   * per-type stack cap still apply and no second writer is invented.
   */
  async grant(playerId: string, slug: string, qty: number) {
    this.assertThrowaway();
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException(`grant needs a positive whole quantity (got ${qty}).`);
    }
    const farmId = await this.farmIdFor(playerId);
    if (!farmId) throw new BadRequestException('No farm found for this player.');
    const result = await this.inventory.addItem(playerId, farmId, slug, qty);
    return { slug, requested: qty, ...result };
  }

  /**
   * W10.3 — force a Kgotla Charge to its claimed state so the post-claim UI can
   * be reached without performing the objective. It marks the quest and pays the
   * per-charge Botho (capped, so it cannot become a faucet); it deliberately does
   * NOT re-run the whole reward matrix, because the goal is to test the claimed
   * state, not to print money.
   */
  async forceCompleteCharge(playerId: string) {
    this.assertThrowaway();
    const admin = this.supabase.getAdminClient();
    const farmId = await this.farmIdFor(playerId);
    if (!farmId) throw new BadRequestException('No farm found for this player.');

    const { data: quest } = await admin
      .from('kgotla_quests')
      .select('id, npc_id, status')
      .eq('user_id', playerId)
      .eq('status', 'active')
      .order('accepted_on', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!quest) {
      throw new BadRequestException('No active Charge to complete. Accept one first.');
    }

    const { error } = await admin
      .from('kgotla_quests')
      .update({ status: 'claimed' })
      .eq('id', (quest as { id: string }).id);
    if (error) throw new BadRequestException(`Failed to complete charge: ${error.message}`);

    const botho = await this.wallet.creditBothoCapped(playerId, REGARD_PER_CHARGE, 'quest_reward');

    return {
      questId: (quest as { id: string }).id,
      npcId: (quest as { npc_id: string }).npc_id,
      status: 'claimed',
      bothoAwarded: botho,
      regard: REGARD_PER_CHARGE,
    };
  }

  private async farmIdFor(playerId: string): Promise<string | null> {
    const { data } = await this.supabase
      .getAdminClient()
      .from('farms')
      .select('id')
      .eq('user_id', playerId)
      .maybeSingle();
    return (data as { id?: string } | null)?.id ?? null;
  }
}