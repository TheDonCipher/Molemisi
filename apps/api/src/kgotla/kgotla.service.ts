import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

interface NPC {
  id: string;
  name: string;
  role: string;
  personality: string;
  greeting: string;
  questType: string;
}

interface NPCRelation {
  npcId: string;
  reputation: number;
  tier: string;
}

interface KgotlaProject {
  id: string;
  name: string;
  description: string;
  requiredContributions: number;
  currentContributions: number;
  reward: string;
}

@Injectable()
export class KgotlaService {
  constructor(private supabaseService: SupabaseService) {}

  // Pre-defined NPCs
  private readonly NPCS: NPC[] = [
    {
      id: 'elder_neo',
      name: 'Elder Neo',
      role: 'Community Leader',
      personality: 'Wise, patient',
      greeting: 'Welcome, young farmer. The Kgotla is always open to those who serve the community.',
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

  async getNPCs(farmId: string): Promise<Array<NPC & { reputation: number; tier: string }>> {
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
    questType: string,
  ): Promise<{ reputationGain: number; xpReward: number; currencyReward: number }> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const npc = this.NPCS.find((n) => n.id === npcId);
    if (!npc) {
      throw new NotFoundException('NPC not found');
    }

    // Reputation gain based on quest type
    const reputationGain = 10;
    const xpReward = 20;
    const currencyReward = 50;

    // Update or create reputation record
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

    // Add XP and currency
    const { data: profile } = await adminClient
      .from('profiles')
      .select('currency, xp, level')
      .eq('id', userId)
      .single();

    const currentCurrency = (profile?.currency as number) || 0;
    const currentXp = (profile?.xp as number) || 0;
    const currentLevel = (profile?.level as number) || 1;

    const newXp = currentXp + xpReward;
    const xpRequired = Math.ceil(100 * Math.pow(currentLevel + 1, 1.5));
    const newLevel = newXp >= xpRequired ? currentLevel + 1 : currentLevel;

    await adminClient
      .from('profiles')
      .update({
        currency: currentCurrency + currencyReward,
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      farm_id: farmId,
      entry_type: 'QUEST_COMPLETE',
      currency_change: currencyReward,
      currency_balance_after: currentCurrency + currencyReward,
      description: `Completed quest for ${npc.name}`,
    });

    return { reputationGain, xpReward, currencyReward };
  }

  async donateToProject(
    farmId: string,
    userId: string,
    projectId: string,
    amount: number,
  ): Promise<{ newTotal: number; reward: string | null }> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const project = this.PROJECTS.find((p) => p.id === projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check currency
    const { data: profile } = await adminClient
      .from('profiles')
      .select('currency')
      .eq('id', userId)
      .single();

    if (!profile || (profile.currency as number) < amount) {
      throw new BadRequestException('Insufficient currency');
    }

    // Deduct currency
    await adminClient
      .from('profiles')
      .update({
        currency: (profile.currency as number) - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Update project contributions
    const { data: existing } = await adminClient
      .from('kgotla_projects')
      .select('*')
      .eq('farm_id', farmId)
      .eq('project_id', projectId)
      .single();

    const newTotal = (existing?.current_contributions as number || 0) + amount;

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

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      farm_id: farmId,
      entry_type: 'DONATION',
      currency_change: -amount,
      currency_balance_after: (profile.currency as number) - amount,
      description: `Donated ${amount} Pula to ${project.name}`,
    });

    return { newTotal, reward };
  }

  async getProjects(farmId: string): Promise<Array<KgotlaProject & { completed: boolean }>> {
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
