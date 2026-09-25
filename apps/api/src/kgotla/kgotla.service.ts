import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { InventoryService } from '../inventory/inventory.service';
import { ChapterService } from '../chapters/chapter.service';
import {
  KGOTLA_DAILY_CONTRIBUTION_CAP,
  KGOTLA_DAILY_CHARGE_POOL,
  REGARD_PER_CHARGE,
  REGARD_DECAY,
} from '@molemisi/game-config';

/* ============================================================================
 * docs/Screens/Kgotla/SPEC.md — NORMATIVE.
 *
 * The governing rule (SPEC §1): the Kgotla must never pay the player for standing
 * still. Every reward it grants is traceable to an act performed OUTSIDE this
 * screen — a harvest, a gather, a sale, a build. The previous implementation paid
 * 50 Pula per tap with no objective, no cooldown and no cap: an unbounded faucet,
 * bounded only by the 60 req/min rate limit. That is why `completeQuest` is gone
 * and the loop is now offer → accept → objective (elsewhere) → turn in.
 * ========================================================================== */

export interface NPC {
  id: string;
  name: string;
  role: string;
  personality: string;
  greeting: string;
  questType: string;
}

/** How a charge's objective is measured. All three read state recorded elsewhere. */
export type ChargeKind = 'errand' | 'contribute' | 'sell';

export interface ChargeDef {
  npcId: string;
  questType: string;
  kind: ChargeKind;
  /** Errands only: the inventory slug consumed at turn-in. */
  itemSlug?: string;
  /**
   * Errands that name a different crop each day. Every crop is unlocked from the
   * start (D6), so any of these is always obtainable — the rotation is variety,
   * not a gate.
   */
  rotate?: string[];
  targetQty: number;
  pulaReward: number;
  bothoReward: number;
  chapterTokenReward: number;
}

export interface ChargeObjective {
  kind: ChargeKind;
  /** Null for `contribute` / `sell`, which are measured in Pula. */
  itemSlug: string | null;
  targetQty: number;
}

export interface ChargeView {
  status: 'none' | 'active' | 'claimed';
  objective: ChargeObjective;
  /** Derived at read time from inventory or the ledger — never stored (SPEC §5.3). */
  progress: number;
  ready: boolean;
  rewards: {
    pula: number;
    botho: number;
    chapterTokens: number;
    regard: number;
  };
}

export interface NpcView extends NPC {
  reputation: number;
  tier: string;
  /** Points to the next tier, or null when the elder is maxed. */
  toNext: number | null;
  nextTier: string | null;
  /** True when a decay period elapses within the warning window (SPEC §4.1). */
  decayWarning: boolean;
  charge: ChargeView;
}

export interface ChargeBoard {
  /** Botswana date the pool is counted against, `YYYY-MM-DD`. */
  date: string;
  poolTotal: number;
  poolUsed: number;
  poolRemaining: number;
  charges: Array<{ npcId: string; name: string } & ChargeView>;
}

export interface AcceptResult {
  charge: ChargeView;
  poolRemaining: number;
}

export interface TurnInResult {
  npcId: string;
  reputationGain: number;
  reputation: number;
  tier: string;
  pulaReward: number;
  bothoReward: number;
  chapterTokens: number;
  /** What the elder took off you, or null when the charge was a volume check. */
  consumed: { slug: string; qty: number } | null;
  poolRemaining: number;
}

export interface KgotlaProject {
  id: string;
  name: string;
  description: string;
  requiredContributions: number;
  currentContributions: number;
  reward: string;
  /** Chapter Tokens granted once, when the farm's own bar first fills (AC-04). */
  chapterTokenReward: number;
}

export interface DonationResult {
  newTotal: number;
  reward: string | null;
  bothoReward: number;
  chapterTokens: number;
  /** Pula contributed to community projects so far this Botswana day (02 §9). */
  contributedToday: number;
  dailyCap: number;
  remainingToday: number;
}

interface RepRow {
  id: string;
  npc_id: string;
  reputation: number;
  last_charge_at: string | null;
}

interface QuestRow {
  id: string;
  npc_id: string;
  quest_type: string;
  item_slug: string | null;
  target_qty: number;
  status: string;
  created_at: string;
}

@Injectable()
export class KgotlaService {
  // Tuning defaults. The spec fixes the 50/day Botho cap (I4) but does not state the
  // quantum per act. These are flagged for Princess Eugenia to confirm.
  private static readonly BOTHO_PER_PULA_DONATED = 1;

  private static readonly DAY_MS = 24 * 60 * 60 * 1000;

  /**
   * SPEC §5.2 — objectives and rewards.
   *
   * Every charge is settled by state recorded OUTSIDE the Kgotla: goods in the bag
   * (errand), Co-op sales since acceptance (sell), or project contributions since
   * acceptance (contribute). Nothing here can be satisfied by tapping (AC-01/03).
   *
   * DEVIATION FROM SPEC §5.2, flagged: the published spec asks Refilwe for
   * "4 wild herbs". There is no wild-herb item — `herbs` is a FARMED crop
   * (Ditlhare tsa Setso) and the bushveld yields wood, clay, palm fiber, thatch
   * and phane. Refilwe's errand is therefore **4 thatch (Lotlhaka)**: a riverbank
   * gather that is always in season (unlike phane), is the least economically
   * loaded bushveld material (thatch feeds roof upkeep, whereas palm fiber feeds
   * Thapo — the best craft margin in the game), and keeps the three errands spread
   * across three systems: craft (poleto) · bushveld (thatch) · farm (crop).
   */
  private static readonly CHARGES: ChargeDef[] = [
    {
      npcId: 'elder_neo',
      questType: 'community',
      kind: 'contribute',
      targetQty: 25,
      pulaReward: 0,
      bothoReward: 10,
      chapterTokenReward: 2,
    },
    {
      npcId: 'mama_naledi',
      questType: 'trade',
      kind: 'sell',
      targetQty: 60,
      pulaReward: 12,
      bothoReward: 10,
      chapterTokenReward: 0,
    },
    {
      npcId: 'oupa_kabelo',
      questType: 'construction',
      kind: 'errand',
      itemSlug: 'poleto',
      targetQty: 6,
      pulaReward: 12,
      bothoReward: 10,
      chapterTokenReward: 0,
    },
    {
      npcId: 'refilwe',
      questType: 'gathering',
      kind: 'errand',
      itemSlug: 'thatch',
      targetQty: 4,
      pulaReward: 8,
      bothoReward: 10,
      chapterTokenReward: 0,
    },
    {
      npcId: 'thabo',
      questType: 'farming',
      kind: 'errand',
      rotate: ['sorghum', 'maize', 'cowpeas', 'millet'],
      targetQty: 6,
      pulaReward: 8,
      bothoReward: 10,
      chapterTokenReward: 0,
    },
  ];

  // Pre-defined NPCs
  private readonly NPCS: NPC[] = [
    {
      id: 'elder_neo',
      name: 'Elder Neo',
      role: 'Community Leader',
      personality: 'Wise, patient',
      greeting:
        'Welcome, young farmer. The Kgotla is always open to those who serve the community.',
      questType: 'community',
    },
    {
      id: 'mama_naledi',
      name: 'Mama Naledi',
      role: 'Market Trader',
      personality: 'Shrewd, fair',
      greeting: 'Ah, a farmer! I always need fresh produce. Let us make a deal.',
      questType: 'trade',
    },
    {
      id: 'oupa_kabelo',
      name: 'Oupa Kabelo',
      role: 'Builder',
      personality: 'Hardworking, gruff',
      greeting: 'If you need something built, I am your man. But do not waste my time.',
      questType: 'construction',
    },
    {
      id: 'refilwe',
      name: 'Refilwe',
      role: 'Herbalist',
      personality: 'Knowledgeable, kind',
      greeting: 'The Bushveld holds many secrets. I can teach you to find them.',
      questType: 'gathering',
    },
    {
      id: 'thabo',
      name: 'Thabo',
      role: 'Farmer',
      personality: 'Competitive, ambitious',
      greeting: 'Another farmer? Show me what you can grow. I will be watching.',
      questType: 'farming',
    },
  ];

  /**
   * Community projects (SPEC §6 — honest per-farm rewards).
   *
   * `kgotla_projects` is UNIQUE(farm_id, project_id): the bar is the FARM's own,
   * so no reward may promise a village-wide effect (AC-04). The retired copy was
   * "All farmers gain +10% water efficiency" and friends — all three were fiction
   * over a solo bar, and none of the effects was ever wired. Rewards are now
   * Chapter Tokens, which ChapterService actually grants, named to the farmer.
   */
  private readonly PROJECTS: KgotlaProject[] = [
    {
      id: 'water_reservoir',
      name: 'Water Reservoir',
      description: 'Build a community water reservoir for all farmers.',
      requiredContributions: 100,
      currentContributions: 0,
      reward: 'You gain 5 Chapter Tokens to spend in this chapter.',
      chapterTokenReward: 5,
    },
    {
      id: 'school',
      name: 'Community School',
      description: 'Build a school to educate the next generation.',
      requiredContributions: 200,
      currentContributions: 0,
      reward: 'You gain 12 Chapter Tokens to spend in this chapter.',
      chapterTokenReward: 12,
    },
    {
      id: 'market_square',
      name: 'Market Square',
      description: 'Expand the market for better prices.',
      requiredContributions: 150,
      currentContributions: 0,
      reward: 'You gain 8 Chapter Tokens to spend in this chapter.',
      chapterTokenReward: 8,
    },
  ];

  constructor(
    private supabaseService: SupabaseService,
    private wallet: WalletService,
    private inventory: InventoryService,
    private chapters: ChapterService,
  ) {}

  /* ==========================================================================
   * The Council
   * ======================================================================== */

  /**
   * The five elders, with standing and today's charge state for each.
   *
   * Also where decay is applied (SPEC §4.1): lazy and idempotent, charged on this
   * read rather than by a cron job. A GET that writes is unusual, but the spec
   * rules that decay is applied "on any Kgotla read or write touching that NPC",
   * and doing it here means a returning player sees honest standing immediately.
   */
  async getNPCs(farmId: string, userId: string, now = new Date()): Promise<NpcView[]> {
    const adminClient = this.supabaseService.getAdminClient();
    const today = this.botswanaDate(now);

    // Two queries, not 5×N: reputation per elder, and today's charges per elder.
    const { data: repData } = await adminClient
      .from('npc_reputation')
      .select('id, npc_id, reputation, last_charge_at')
      .eq('farm_id', farmId);

    const repByNpc = new Map<string, RepRow>(
      ((repData ?? []) as RepRow[]).map((r) => [r.npc_id, r]),
    );

    const questRows = await this.questsForDay(farmId, today);
    const questByNpc = new Map<string, QuestRow>(questRows.map((q) => [q.npc_id, q]));

    // Decay is applied per elder and written back; collect then commit.
    const pending: Array<{ id: string; reputation: number; lastChargeAt: string }> = [];

    const views = await Promise.all(
      this.NPCS.map(async (npc) => {
        const row = repByNpc.get(npc.id);
        const hadClock = row != null && row.last_charge_at != null;
        const plan = this.decayPlan(row?.reputation ?? 0, row?.last_charge_at ?? null, now);

        if (row && (plan.periods > 0 || !hadClock)) {
          pending.push({
            id: row.id,
            reputation: plan.reputation,
            lastChargeAt: plan.lastChargeAt.toISOString(),
          });
        }

        const quest = questByNpc.get(npc.id);
        const def = this.chargeDef(npc.id);

        // Only in-flight charges are measured — at most KGOTLA_DAILY_CHARGE_POOL
        // of them, so this stays a bounded cost on a screen read.
        const progress =
          def && quest && quest.status !== 'claimed'
            ? await this.measureProgress(def, quest, userId)
            : 0;

        return {
          ...npc,
          reputation: plan.reputation,
          tier: this.getReputationTier(plan.reputation),
          toNext: this.pointsToNextTier(plan.reputation),
          nextTier: this.nextTierName(plan.reputation),
          decayWarning: this.isDecayImminent(plan, now),
          charge: this.chargeView(def, quest, progress, now),
        };
      }),
    );

    await Promise.all(
      pending.map((p) =>
        adminClient
          .from('npc_reputation')
          .update({
            reputation: p.reputation,
            last_charge_at: p.lastChargeAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', p.id),
      ),
    );

    return views;
  }

  async talkToNPC(
    farmId: string,
    userId: string,
    npcId: string,
    now = new Date(),
  ): Promise<{ npc: NPC; message: string; questAvailable: boolean }> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const npc = this.NPCS.find((n) => n.id === npcId);
    if (!npc) {
      throw new NotFoundException('NPC not found');
    }

    // Get reputation
    const { data: relation } = await adminClient
      .from('npc_reputation')
      .select('*')
      .eq('farm_id', farmId)
      .eq('npc_id', npcId)
      .single();

    const reputation = (relation?.reputation as number) || 0;
    const tier = this.getReputationTier(reputation);

    // Generate contextual greeting based on tier
    let message = npc.greeting;
    if (tier === 'Stranger') {
      message += '\n\nPerhaps you could help me with something to earn my trust.';
    } else if (tier === 'Friend') {
      message += '\n\nIt is good to see you again. I have something special for you.';
    } else if (tier === 'Trusted') {
      message += '\n\nYou have proven yourself. I have the best deals for you.';
    } else if (tier === 'Respected') {
      message += '\n\nYou are like family to me. The Kgotla is stronger because of you.';
    }

    // `questAvailable` once meant "reputation < 100" — which made it true forever
    // and is how the faucet stayed reachable. It now means what the button claims:
    // there is a pool slot free AND this elder has not been served today.
    const today = this.botswanaDate(now);
    const quests = await this.questsForDay(farmId, today);
    const questAvailable =
      quests.length < KGOTLA_DAILY_CHARGE_POOL && !quests.some((q) => q.npc_id === npcId);

    return { npc, message, questAvailable };
  }

  /* ==========================================================================
   * Charges — offer · accept · turn in
   * ======================================================================== */

  /** The board: today's shared pool and the state of every elder's charge. */
  async getChargeBoard(farmId: string, userId: string, now = new Date()): Promise<ChargeBoard> {
    const today = this.botswanaDate(now);
    const questRows = await this.questsForDay(farmId, today);

    const charges = await Promise.all(
      this.NPCS.map(async (npc) => {
        const def = this.chargeDef(npc.id);
        const row = questRows.find((q) => q.npc_id === npc.id);
        const progress =
          def && row && row.status !== 'claimed'
            ? await this.measureProgress(def, row, userId)
            : 0;
        return {
          npcId: npc.id,
          name: npc.name,
          ...this.chargeView(def, row, progress, now),
        };
      }),
    );

    return {
      date: today,
      poolTotal: KGOTLA_DAILY_CHARGE_POOL,
      poolUsed: questRows.length,
      poolRemaining: Math.max(0, KGOTLA_DAILY_CHARGE_POOL - questRows.length),
      charges,
    };
  }

  /**
   * Accept a charge from one elder. Consumes a slot from the SHARED pool
   * (SPEC §5.1) — three per farm per Botswana day across the whole council, so
   * five elders and three charges forces a choice about whom to serve.
   */
  async acceptCharge(
    farmId: string,
    userId: string,
    npcId: string,
    now = new Date(),
  ): Promise<AcceptResult> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const npc = this.NPCS.find((n) => n.id === npcId);
    if (!npc) {
      throw new NotFoundException('NPC not found');
    }
    const def = this.chargeDef(npcId);
    if (!def) {
      throw new NotFoundException(`No charge is offered by ${npcId}`);
    }

    const today = this.botswanaDate(now);
    const quests = await this.questsForDay(farmId, today);

    if (quests.length >= KGOTLA_DAILY_CHARGE_POOL) {
      throw new BadRequestException(
        `The council has already given you ${KGOTLA_DAILY_CHARGE_POOL} charges today. ` +
          `Finish one, or come back tomorrow.`,
      );
    }
    if (quests.some((q) => q.npc_id === npcId)) {
      throw new BadRequestException(
        `${npc.name} has already given you a charge today (SPEC §5.1)`,
      );
    }

    const itemSlug = this.resolveItemSlug(def, now);
    const acceptedAt = now.toISOString();

    // created_at is written explicitly rather than left to the column default:
    // it is the `since` instant every objective is measured from, and progress
    // must be a timestamp we actually know.
    const { data: insertedRows, error } = await adminClient
      .from('kgotla_quests')
      .insert({
        farm_id: farmId,
        user_id: userId,
        npc_id: npcId,
        quest_type: def.questType,
        item_slug: itemSlug,
        target_qty: def.targetQty,
        status: 'active',
        accepted_on: today,
        created_at: acceptedAt,
      })
      .select('id, npc_id, quest_type, item_slug, target_qty, status, created_at');

    const inserted = ((insertedRows ?? []) as QuestRow[])[0];

    if (error || !inserted) {
      // The UNIQUE(farm_id, npc_id, accepted_on) index is the real guard against a
      // double-accept; this is the message for when it fires under concurrency.
      throw new BadRequestException(
        error?.message ?? 'Could not accept a charge from this elder',
      );
    }

    // Progress is measured from the world, exactly as turn-in will measure it
    // (SPEC §5.3 — derived, never stored). Passing `reputation` here showed the
    // player's REGARD as objective progress and could mark a fresh charge
    // `ready` before a single item was delivered.
    const progress = await this.measureProgress(def, inserted, userId);
    return {
      charge: this.chargeView(def, inserted, progress, now),
      poolRemaining: Math.max(0, KGOTLA_DAILY_CHARGE_POOL - (quests.length + 1)),
    };
  }

  /**
   * Turn in a completed charge. The objective must be satisfied by state recorded
   * OUTSIDE the Kgotla (AC-03); errand goods are consumed here.
   */
  async turnInCharge(
    farmId: string,
    userId: string,
    npcId: string,
    now = new Date(),
  ): Promise<TurnInResult> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const npc = this.NPCS.find((n) => n.id === npcId);
    if (!npc) {
      throw new NotFoundException('NPC not found');
    }
    const def = this.chargeDef(npcId);
    if (!def) {
      throw new NotFoundException(`No charge is offered by ${npcId}`);
    }

    const today = this.botswanaDate(now);
    const quests = await this.questsForDay(farmId, today);
    const quest = quests.find((q) => q.npc_id === npcId);

    if (!quest) {
      throw new BadRequestException(
        `You have not accepted a charge from ${npc.name} today`,
      );
    }
    if (quest.status === 'claimed') {
      throw new BadRequestException(`${npc.name} has already received your charge`);
    }

    const targetQty = Number(quest.target_qty) || def.targetQty;
    const progress = await this.measureProgress(def, quest, userId);

    if (progress < targetQty) {
      throw new BadRequestException(
        this.shortfallMessage(def, quest, targetQty, progress),
      );
    }

    // Consume BEFORE crediting, deliberately. If the wallet call then fails the
    // player has lost goods, which an admin_adjustment can put right; if we
    // credited first and the consume failed, we would have minted currency out of
    // nothing, which cannot be put right. Fail towards the recoverable error.
    let consumed: { slug: string; qty: number } | null = null;
    if (def.kind === 'errand') {
      const slug = quest.item_slug ?? def.itemSlug ?? null;
      if (!slug) {
        throw new BadRequestException('This charge has no item to hand over');
      }
      await this.inventory.removeItem(userId, slug, targetQty);
      consumed = { slug, qty: targetQty };
    }

    let pulaReward = 0;
    if (def.pulaReward > 0) {
      pulaReward = def.pulaReward;
      await this.wallet.credit(userId, 'pula', pulaReward, 'quest_reward');
    }

    // Botho always goes through the capped path (I4). This is the ONLY sanctioned
    // credit for act-earned Botho, which is what keeps it a loyalty signal.
    const bothoReward = def.bothoReward > 0
      ? await this.wallet.creditBothoCapped(userId, def.bothoReward, 'quest_reward')
      : 0;

    // Chapter Tokens are not money: they live on player_chapter_state and expire to
    // zero at chapter end (02 §3.3), so they never touch the wallet.
    const chapterTokens = def.chapterTokenReward > 0
      ? await this.chapters.addTokens(userId, def.chapterTokenReward, now)
      : 0;

    const reputation = await this.bumpReputation(farmId, userId, npcId, now);

    await adminClient
      .from('kgotla_quests')
      .update({ status: 'claimed' })
      .eq('id', quest.id);

    return {
      npcId,
      reputationGain: REGARD_PER_CHARGE,
      reputation,
      tier: this.getReputationTier(reputation),
      pulaReward,
      bothoReward,
      // addTokens returns the new BALANCE, not the delta; report the grant.
      chapterTokens: def.chapterTokenReward,
      consumed,
      poolRemaining: Math.max(0, KGOTLA_DAILY_CHARGE_POOL - quests.length),
    };
  }

  /* ==========================================================================
   * Community projects
   * ======================================================================== */

  async donateToProject(
    farmId: string,
    userId: string,
    projectId: string,
    amount: number,
    now = new Date(),
  ): Promise<DonationResult> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    // `amount` arrives straight off the request body, so it is validated here
    // rather than trusted. spendPula() would now reject a negative too, but an
    // explicit check gives a message the player can act on and keeps the
    // contribution integral — half a Pula is not a thing you donate.
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Donation must be a whole number of Pula greater than zero');
    }

    const project = this.PROJECTS.find((p) => p.id === projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 02 §9 — contribution is capped per day so the thing the design pays best for
    // cannot be multiplied by grinding. A spreadsheet must not beat a loyal player.
    // Like creditBothoCapped, this is read-then-write: two simultaneous donations
    // could in principle overrun by a little, which is acceptable for a manually
    // triggered, non-financial cap. Fold it into the ledger if that ever changes.
    const contributed = await this.wallet.contributedToday(userId, now);
    const remaining = KGOTLA_DAILY_CONTRIBUTION_CAP - contributed;

    if (remaining <= 0) {
      throw new BadRequestException(
        `You have already contributed ${contributed} Pula today — the Kgotla accepts ` +
          `${KGOTLA_DAILY_CONTRIBUTION_CAP} Pula per day per farmer (02 §9)`,
      );
    }
    if (amount > remaining) {
      throw new BadRequestException(
        `You can contribute ${remaining} more Pula today ` +
          `(${contributed} of ${KGOTLA_DAILY_CONTRIBUTION_CAP} already given)`,
      );
    }

    // Spend the Pula through the wallet — this is the Letsema fund Pula sink
    // (F7/I4). wallet.spendPula throws if the player cannot afford it, so there is
    // no separate balance check to keep in sync.
    await this.wallet.spendPula(userId, amount, 'letsema_contribution');

    // Botho from donating is capped per day like every manual act (I4). The rate is
    // a tuning default (flagged): 1 Botho per Pula donated.
    const bothoRequested = Math.floor(amount * KgotlaService.BOTHO_PER_PULA_DONATED);
    const bothoReward = await this.wallet.creditBothoCapped(
      userId,
      bothoRequested,
      'letsema_contribution',
    );

    // Community progress (not a balance).
    const { data: existing } = await adminClient
      .from('kgotla_projects')
      .select('*')
      .eq('farm_id', farmId)
      .eq('project_id', projectId)
      .single();

    const newTotal = ((existing?.current_contributions as number) || 0) + amount;
    const wasComplete = newTotal - amount >= project.requiredContributions;
    const completed = newTotal >= project.requiredContributions;

    let chapterTokens = 0;
    const rewardClaimed = Boolean(existing?.reward_claimed_at);
    if (completed && !wasComplete && !rewardClaimed) {
      // The bar is the farm's own (UNIQUE farm_id, project_id), so the reward is
      // granted to THIS farmer, once (AC-04).
      await this.chapters.addTokens(userId, project.chapterTokenReward, now);
      chapterTokens = project.chapterTokenReward;
    }

    const patch: Record<string, unknown> = {
      current_contributions: newTotal,
      updated_at: new Date().toISOString(),
    };
    if (chapterTokens > 0) patch.reward_claimed_at = new Date().toISOString();

    if (existing) {
      await adminClient
        .from('kgotla_projects')
        .update(patch)
        .eq('id', existing.id);
    } else {
      await adminClient.from('kgotla_projects').insert({
        farm_id: farmId,
        project_id: projectId,
        current_contributions: newTotal,
        ...(chapterTokens > 0 ? { reward_claimed_at: patch.reward_claimed_at } : {}),
      });
    }

    return {
      newTotal,
      reward: completed ? project.reward : null,
      bothoReward,
      chapterTokens,
      // Reported after the donation lands, so the client can render "120 of 200
      // given today" without a second round trip.
      contributedToday: contributed + amount,
      dailyCap: KGOTLA_DAILY_CONTRIBUTION_CAP,
      remainingToday: remaining - amount,
    };
  }

  async getProjects(
    farmId: string,
  ): Promise<Array<KgotlaProject & { completed: boolean; rewardClaimed: boolean }>> {
    const adminClient = this.supabaseService.getAdminClient();

    return await Promise.all(
      this.PROJECTS.map(async (project) => {
        const { data: contribution } = await adminClient
          .from('kgotla_projects')
          .select('current_contributions, reward_claimed_at')
          .eq('farm_id', farmId)
          .eq('project_id', project.id)
          .single();

        const current = (contribution?.current_contributions as number) || 0;
        return {
          ...project,
          currentContributions: current,
          completed: current >= project.requiredContributions,
          rewardClaimed: Boolean(contribution?.reward_claimed_at),
        };
      }),
    );
  }

  /**
   * The projects read the screen actually needs (AC-07).
   *
   * `contributedToday` used to come back ONLY after a donation, so the 200/day
   * allowance was invisible until you had already spent into it — you could not
   * see what you had left before deciding. The allowance now ships with the
   * projects themselves.
   *
   * Deliberately NOT added to `/progression` (which SPEC §7 offers as the
   * alternative home): a second work stream is actively editing
   * progression.service.ts, and the Letsema allowance is Kgotla-scoped anyway.
   */
  async getProjectsView(
    farmId: string,
    userId: string,
    now = new Date(),
  ): Promise<{
    projects: Array<KgotlaProject & { completed: boolean; rewardClaimed: boolean }>;
    contribution: { contributedToday: number; dailyCap: number; remainingToday: number };
  }> {
    const [projects, contributedToday] = await Promise.all([
      this.getProjects(farmId),
      this.wallet.contributedToday(userId, now),
    ]);

    return {
      projects,
      contribution: {
        contributedToday,
        dailyCap: KGOTLA_DAILY_CONTRIBUTION_CAP,
        remainingToday: Math.max(0, KGOTLA_DAILY_CONTRIBUTION_CAP - contributedToday),
      },
    };
  }

  /* ==========================================================================
   * Charge internals
   * ======================================================================== */

  chargeDef(npcId: string): ChargeDef | undefined {
    return KgotlaService.CHARGES.find((c) => c.npcId === npcId);
  }

  /** All charge definitions — used by tests to assert every item slug is real. */
  static allCharges(): ChargeDef[] {
    return KgotlaService.CHARGES;
  }

  private async questsForDay(farmId: string, date: string): Promise<QuestRow[]> {
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('kgotla_quests')
      .select('id, npc_id, quest_type, item_slug, target_qty, status, created_at')
      .eq('farm_id', farmId)
      .eq('accepted_on', date);

    return (data ?? []) as QuestRow[];
  }

  /**
   * Progress is DERIVED, never stored (SPEC §5.3) — that is what makes it
   * impossible for it to drift out of sync with the world.
   */
  private async measureProgress(
    def: ChargeDef,
    quest: QuestRow,
    userId: string,
  ): Promise<number> {
    const since = new Date(quest.created_at);

    if (def.kind === 'errand') {
      const slug = quest.item_slug ?? def.itemSlug;
      if (!slug) return 0;
      return this.inventory.countOwned(userId, slug);
    }
    if (def.kind === 'contribute') {
      return this.wallet.contributedSince(userId, since);
    }
    // 'sell' — Co-op sales since acceptance. Credits only, so buying the goods
    // back cannot walk the objective backwards.
    return this.wallet.coopSalesSince(userId, since);
  }

  /** Today's crop for a rotating farming errand. Deterministic — same day, same crop. */
  private resolveItemSlug(def: ChargeDef, now: Date): string | null {
    if (def.kind !== 'errand') return null;
    if (def.itemSlug) return def.itemSlug;
    if (!def.rotate?.length) return null;
    return def.rotate[this.dayIndex(now) % def.rotate.length] ?? null;
  }

  /** Days since the Unix epoch, counted in Botswana time (UTC+2, no DST). */
  private dayIndex(now: Date): number {
    return Math.floor((now.getTime() + 2 * 60 * 60 * 1000) / KgotlaService.DAY_MS);
  }

  /** The Botswana calendar date, `YYYY-MM-DD`. The pool is counted against this. */
  private botswanaDate(now: Date): string {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  /**
   * `progress` is supplied by the caller, because measuring it means a ledger or
   * inventory read and is only worth doing for charges that are actually in flight.
   */
  private chargeView(
    def: ChargeDef | undefined,
    quest: QuestRow | undefined,
    progress = 0,
    now = new Date(),
  ): ChargeView {
    const status: ChargeView['status'] = !quest
      ? 'none'
      : quest.status === 'claimed'
        ? 'claimed'
        : 'active';

    if (!def) {
      return {
        status: 'none',
        objective: { kind: 'errand', itemSlug: null, targetQty: 0 },
        progress: 0,
        ready: false,
        rewards: { pula: 0, botho: 0, chapterTokens: 0, regard: 0 },
      };
    }

    const targetQty = quest ? Number(quest.target_qty) || def.targetQty : def.targetQty;

    return {
      status,
      objective: {
        kind: def.kind,
        // An accepted charge keeps the slug it was accepted with, so a rotating
        // farming errand cannot silently change crop under the player mid-charge.
        // An unaccepted one shows today's offer, so the pool is an informed choice.
        itemSlug: quest?.item_slug ?? this.resolveItemSlug(def, now),
        targetQty,
      },
      progress,
      ready: status === 'active' && progress >= targetQty,
      rewards: {
        pula: def.pulaReward,
        botho: def.bothoReward,
        chapterTokens: def.chapterTokenReward,
        regard: REGARD_PER_CHARGE,
      },
    };
  }

  private shortfallMessage(
    def: ChargeDef,
    quest: QuestRow,
    targetQty: number,
    progress: number,
  ): string {
    const short = targetQty - progress;
    if (def.kind === 'errand') {
      const what = quest.item_slug ?? def.itemSlug ?? 'goods';
      return `${quest.npc_id} asked for ${targetQty} ${what} — you have ${progress}. Bring ${short} more.`;
    }
    if (def.kind === 'contribute') {
      return `Contribute ${short} more Pula to a community project to finish this charge (${progress} of ${targetQty} given).`;
    }
    return `Sell ${short} more Pula of goods at the Co-op to finish this charge (${progress} of ${targetQty} sold).`;
  }

  /* ==========================================================================
   * Regard — reputation and decay
   * ======================================================================== */

  /**
   * SPEC §4.1 — −2 regard per elder per full 7-day period with no completed charge.
   * Floored at 0: falling to *Stranger* must require a deliberate negative act
   * (01 §16), and no such act exists in v1, so Stranger is unreachable.
   *
   * Idempotent because `lastChargeAt` advances by WHOLE periods — the same read
   * run twice charges the second time for zero periods.
   */
  private decayPlan(
    reputation: number,
    lastChargeAtRaw: string | null,
    now: Date,
  ): { reputation: number; periods: number; lastChargeAt: Date; nextDecayAt: Date } {
    const periodMs = REGARD_DECAY.periodDays * KgotlaService.DAY_MS;

    // No clock yet: start it now rather than punishing a player for the column
    // having been added after they last visited.
    if (!lastChargeAtRaw) {
      return {
        reputation,
        periods: 0,
        lastChargeAt: now,
        nextDecayAt: new Date(now.getTime() + periodMs),
      };
    }

    const lastChargeAt = new Date(lastChargeAtRaw);
    const elapsed = now.getTime() - lastChargeAt.getTime();
    const periods = elapsed >= periodMs ? Math.floor(elapsed / periodMs) : 0;

    const decayed = Math.max(0, reputation - REGARD_DECAY.points * periods);
    const advanced = new Date(lastChargeAt.getTime() + periods * periodMs);

    return {
      reputation: decayed,
      periods,
      lastChargeAt: advanced,
      nextDecayAt: new Date(advanced.getTime() + periodMs),
    };
  }

  /** True when the next period elapses within the warning window and it would bite. */
  private isDecayImminent(
    plan: { reputation: number; nextDecayAt: Date },
    now: Date,
  ): boolean {
    if (plan.reputation <= 0) return false;
    const lead = REGARD_DECAY.warningLeadHours * 60 * 60 * 1000;
    const until = plan.nextDecayAt.getTime() - now.getTime();
    return until >= 0 && until <= lead;
  }

  private async reputationFor(farmId: string, npcId: string): Promise<number> {
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('npc_reputation')
      .select('reputation')
      .eq('farm_id', farmId)
      .eq('npc_id', npcId)
      .single();
    return (data?.reputation as number) || 0;
  }

  /**
   * +REGARD_PER_CHARGE with an elder, and reset that elder's decay clock — a
   * completed charge is exactly what "not idle" means.
   */
  private async bumpReputation(
    farmId: string,
    userId: string,
    npcId: string,
    now: Date,
  ): Promise<number> {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: existing } = await adminClient
      .from('npc_reputation')
      .select('id, reputation')
      .eq('farm_id', farmId)
      .eq('npc_id', npcId)
      .single();

    const current = (existing?.reputation as number) || 0;
    const next = Math.min(100, current + REGARD_PER_CHARGE);

    if (existing) {
      await adminClient
        .from('npc_reputation')
        .update({
          reputation: next,
          last_charge_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await adminClient.from('npc_reputation').insert({
        farm_id: farmId,
        user_id: userId,
        npc_id: npcId,
        reputation: next,
        last_charge_at: now.toISOString(),
      });
    }

    return next;
  }

  /* ==========================================================================
   * Tiers
   * ======================================================================== */

  private getReputationTier(reputation: number): string {
    if (reputation >= 75) return 'Respected';
    if (reputation >= 50) return 'Trusted';
    if (reputation >= 25) return 'Friend';
    if (reputation >= 0) return 'Acquaintance';
    return 'Stranger';
  }

  /**
   * Points still needed to reach the next tier, or null when the elder is maxed
   * (SPEC §4 — "30 · 20 to Trusted"). Respected (75) is the TOP tier; the fifth
   * star at 100 is a rendering detail the client derives from `reputation`, not a
   * tier of its own, so there is deliberately no rung above 75.
   */
  private pointsToNextTier(reputation: number): number | null {
    for (const threshold of [25, 50, 75]) {
      if (reputation < threshold) return threshold - reputation;
    }
    return null;
  }

  private nextTierName(reputation: number): string | null {
    if (reputation < 25) return 'Friend';
    if (reputation < 50) return 'Trusted';
    if (reputation < 75) return 'Respected';
    return null;
  }

  private async verifyFarmOwnership(farmId: string, userId: string): Promise<void> {
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
  }

  /**
   * Doc 11 §4 — Nako ya Go Arogana (The Season of Sharing): the Village Feast.
   *
   * 20 Watermelons leave the bag; capped Botho and a permanent cosmetic come
   * back. The three rules that matter:
   *   - Crops leave through InventoryService.removeItem, which fails loudly
   *     BEFORE anything is granted — you cannot feast on an empty granary.
   *   - Botho flows ONLY through creditBothoCapped (I4): the request is 100,
   *     the legal daily cap still applies, so a feast can never bypass it.
   *   - Pula is never touched. Sharing is social, not economic.
   * Declining the feast is free — there is no penalty state (Doc 11 §4).
   */
  async donateVillageFeast(
    farmId: string,
    userId: string,
    cropType = 'watermelon',
    quantity = 20,
  ): Promise<{
    donated: number;
    cropType: string;
    bothoAwarded: number;
    cosmeticId: string;
    cosmeticGranted: boolean;
    pulaAwarded: 0;
    titleId: string;
  }> {
    // The Kgotla asks for one basket of exactly 20 Watermelons (Doc 11 §4).
    if (cropType !== 'watermelon' || quantity !== 20) {
      throw new BadRequestException('The feast asks for exactly 20 Watermelons.');
    }

    // Throws BadRequestException when the bag is short — nothing is granted first.
    await this.inventory.removeItem(userId, cropType, quantity);

    // Capped Botho: at most 100 requested, today's cap still governs (I4/R6).
    const bothoAwarded = await this.wallet.creditBothoCapped(userId, 100, 'village_feast');

    // Permanent cosmetic — idempotent: already owning it is a no-op, not an error.
    // player_cosmetics is UNIQUE (player_id, cosmetic_id). The build row reads
    // this table (GET .../kgotla/feast-status) and renders the golden fence.
    const cosmeticId = 'feast_fence';
    const admin = this.supabaseService.getAdminClient();
    const { data: owned } = await admin
      .from('player_cosmetics')
      .select('cosmetic_id')
      .eq('player_id', userId)
      .eq('cosmetic_id', cosmeticId)
      .maybeSingle();

    let cosmeticGranted = false;
    if (!owned) {
      const { data: inserted } = await admin
        .from('player_cosmetics')
        .insert({ player_id: userId, cosmetic_id: cosmeticId })
        .select('cosmetic_id')
        .maybeSingle();
      cosmeticGranted = Boolean(inserted);
    }

    // The Friend of the Feast honour: one dated lore row, first feast only.
    // Cosmetic-adjacent, never a currency — a title the Journal screen shows.
    await admin.from('lore_entries').upsert(
      {
        player_id: userId,
        kind: 'village_feast',
        slug: 'friend_of_the_feast',
        quote: 'Friend of the Feast — shared 20 watermelons with Sesana.',
        is_original: false,
      },
      { onConflict: 'player_id,slug' },
    );

    return {
      donated: quantity,
      cropType,
      bothoAwarded,
      cosmeticId,
      cosmeticGranted,
      pulaAwarded: 0,
      titleId: 'friend_of_the_feast',
    };
  }

  /**
   * Doc 11 §4 — feast standing for the Kgotla card and the Farm build row:
   * whether this player owns the feast fence (the visible cosmetic) and the
   * Friend of the Feast honour. Read-only; never mints anything.
   */
  async getFeastStatus(userId: string): Promise<{
    hasFeastFence: boolean;
    isFriendOfTheFeast: boolean;
  }> {
    const admin = this.supabaseService.getAdminClient();
    const { data: fence } = await admin
      .from('player_cosmetics')
      .select('cosmetic_id')
      .eq('player_id', userId)
      .eq('cosmetic_id', 'feast_fence')
      .maybeSingle();
    const { data: title } = await admin
      .from('lore_entries')
      .select('id')
      .eq('player_id', userId)
      .eq('kind', 'village_feast')
      .eq('slug', 'friend_of_the_feast')
      .maybeSingle();
    return { hasFeastFence: Boolean(fence), isFriendOfTheFeast: Boolean(title) };
  }
}
