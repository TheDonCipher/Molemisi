import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { KGOTLA_DAILY_CONTRIBUTION_CAP } from '@molemisi/game-config';

export interface NPC {
  id: string;
  name: string;
  role: string;
  personality: string;
  greeting: string;
  questType: string;
}

export interface NPCRelation {
  npcId: string;
  reputation: number;
  tier: string;
}

export interface KgotlaProject {
  id: string;
  name: string;
  description: string;
  requiredContributions: number;
  currentContributions: number;
  reward: string;
}

export interface QuestResult {
  reputationGain: number;
  pulaReward: number;
  bothoReward: number;
}

export interface DonationResult {
  newTotal: number;
  reward: string | null;
  bothoReward: number;
  /** Pula contributed to community projects so far this Botswana day (02 §9). */
  contributedToday: number;
  dailyCap: number;
  remainingToday: number;
}

@Injectable()
export class KgotlaService {
  // Tuning defaults. The spec fixes the 50/day Botho cap (I4) but does not state the
  // quantum per act. These are flagged for Princess Eugenia to confirm.
  private static readonly BOTHO_PER_QUEST = 10;
  private static readonly BOTHO_PER_PULA_DONATED = 1;

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

  // Pre-defined community projects
  private readonly PROJECTS: KgotlaProject[] = [
    {
      id: 'water_reservoir',
      name: 'Water Reservoir',
      description: 'Build a community water reservoir for all farmers.',
      requiredContributions: 100,
      currentContributions: 0,
      reward: 'All farmers gain +10% water efficiency',
    },
    {
      id: 'school',
      name: 'Community School',
      description: 'Build a school to educate the next generation.',
      requiredContributions: 200,
      currentContributions: 0,
      reward: 'All farmers gain +5% XP from all actions',
    },
    {
      id: 'market_square',
      name: 'Market Square',
      description: 'Expand the market for better prices.',
      requiredContributions: 150,
      currentContributions: 0,
      reward: 'All farmers gain +5% sell prices',
    },
  ];

  constructor(
    private supabaseService: SupabaseService,
    private wallet: WalletService,
  ) {}

  async getNPCs(
    farmId: string,
  ): Promise<Array<NPC & { reputation: number; tier: string }>> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get or create reputation records for each NPC
    const results = await Promise.all(
      this.NPCS.map(async (npc) => {
        const { data: relation } = await adminClient
          .from('npc_reputation')
          .select('*')
          .eq('farm_id', farmId)
          .eq('npc_id', npc.id)
          .single();

        const reputation = (relation?.reputation as number) || 0;
        const tier = this.getReputationTier(reputation);

        return {
          ...npc,
          reputation,
          tier,
        };
      }),
    );

    return results;
  }

  async talkToNPC(
    farmId: string,
    userId: string,
    npcId: string,
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

    // Check if there is a quest available
    const questAvailable = reputation < 100; // Always offer quests until max rep

    return { npc, message, questAvailable };
  }

  async completeQuest(
    farmId: string,
    userId: string,
    npcId: string,
    _questType: string,
  ): Promise<QuestResult> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const npc = this.NPCS.find((n) => n.id === npcId);
    if (!npc) {
      throw new NotFoundException('NPC not found');
    }

    // Reputation gain based on quest type (per-NPC affinity — flavour, not the
    // canonical community standing, which is Botho).
    const reputationGain = 10;
    const pulaReward = 50; // legacy value; spec: quests give Pula + Botho (02 §6.7)
    const bothoRequested = KgotlaService.BOTHO_PER_QUEST;

    // Update or create the per-NPC reputation record.
    const { data: existing } = await adminClient
      .from('npc_reputation')
      .select('*')
      .eq('farm_id', farmId)
      .eq('npc_id', npcId)
      .single();

    if (existing) {
      const newRep = Math.min(100, (existing.reputation as number) + reputationGain);
      await adminClient
        .from('npc_reputation')
        .update({ reputation: newRep, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await adminClient.from('npc_reputation').insert({
        farm_id: farmId,
        user_id: userId,
        npc_id: npcId,
        reputation: reputationGain,
      });
    }

    // Rewards routed through the wallet (05 §P2):
    //  - Pula faucet (small, reputation-capped).
    //  - Botho, capped per day (I4). This is the ONLY path that credits Botho, so
    //    the Auto-Collector can never earn it.
    // No profiles.currency / xp / level writes: XP is retired (D5); Botho is the
    // single canonical standing (R6/C7/I10).
    await this.wallet.credit(userId, 'pula', pulaReward, 'quest_reward');
    const bothoReward = await this.wallet.creditBothoCapped(
      userId,
      bothoRequested,
      'quest_reward',
    );

    return { reputationGain, pulaReward, bothoReward };
  }

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

    if (existing) {
      await adminClient
        .from('kgotla_projects')
        .update({ current_contributions: newTotal, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await adminClient.from('kgotla_projects').insert({
        farm_id: farmId,
        project_id: projectId,
        current_contributions: newTotal,
      });
    }

    // Check if project completed
    const completed = newTotal >= project.requiredContributions;
    const reward = completed ? project.reward : null;

    return {
      newTotal,
      reward,
      bothoReward,
      // Reported after the donation lands, so the client can render "120 of 200
      // given today" without a second round trip.
      contributedToday: contributed + amount,
      dailyCap: KGOTLA_DAILY_CONTRIBUTION_CAP,
      remainingToday: remaining - amount,
    };
  }

  async getProjects(
    farmId: string,
  ): Promise<Array<KgotlaProject & { completed: boolean }>> {
    const adminClient = this.supabaseService.getAdminClient();

    return await Promise.all(
      this.PROJECTS.map(async (project) => {
        const { data: contribution } = await adminClient
          .from('kgotla_projects')
          .select('current_contributions')
          .eq('farm_id', farmId)
          .eq('project_id', project.id)
          .single();

        const current = (contribution?.current_contributions as number) || 0;
        return {
          ...project,
          currentContributions: current,
          completed: current >= project.requiredContributions,
        };
      }),
    );
  }

  private getReputationTier(reputation: number): string {
    if (reputation >= 75) return 'Respected';
    if (reputation >= 50) return 'Trusted';
    if (reputation >= 25) return 'Friend';
    if (reputation >= 0) return 'Acquaintance';
    return 'Stranger';
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
}
