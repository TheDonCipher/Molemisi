import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export interface BushveldZone {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  energyCost: number;
  resources: Array<{ type: string; chance: number; minQuantity: number; maxQuantity: number }>;
  rareDiscoveries: Array<{ type: string; chance: number; value: number }>;
  unlockLevel: number;
}

export interface GatherResult {
  resources: Array<{ type: string; quantity: number }>;
  rareDiscovery: { type: string; value: number } | null;
  energyUsed: number;
  xpGained: number;
}

@Injectable()
export class BushveldService {
  constructor(private supabaseService: SupabaseService) {}

  // Pre-defined bushveld zones
  private readonly ZONES: BushveldZone[] = [
    {
      id: 'near_bush',
      name: 'Near Bush',
      description: 'Easy gathering near the farm. Safe and accessible.',
      difficulty: 'easy',
      energyCost: 10,
      resources: [
        { type: 'wood', chance: 0.8, minQuantity: 2, maxQuantity: 5 },
        { type: 'stone', chance: 0.4, minQuantity: 1, maxQuantity: 3 },
        { type: 'thatch', chance: 0.6, minQuantity: 1, maxQuantity: 4 },
      ],
      rareDiscoveries: [{ type: 'seed_cache', chance: 0.05, value: 100 }],
      unlockLevel: 1,
    },
    {
      id: 'deep_bush',
      name: 'Deep Bush',
      description: 'Rich resources but harder to navigate.',
      difficulty: 'medium',
      energyCost: 20,
      resources: [
        { type: 'wood', chance: 0.7, minQuantity: 3, maxQuantity: 8 },
        { type: 'iron', chance: 0.3, minQuantity: 1, maxQuantity: 2 },
        { type: 'clay', chance: 0.5, minQuantity: 2, maxQuantity: 4 },
        { type: 'herbs', chance: 0.2, minQuantity: 1, maxQuantity: 2 },
      ],
      rareDiscoveries: [
        { type: 'wild_saffron', chance: 0.02, value: 500 },
        { type: 'rare_herbs', chance: 0.05, value: 200 },
      ],
      unlockLevel: 3,
    },
    {
      id: 'river_bank',
      name: 'River Bank',
      description: 'Fertile area near the river. Good for clay and fish.',
      difficulty: 'medium',
      energyCost: 15,
      resources: [
        { type: 'clay', chance: 0.7, minQuantity: 3, maxQuantity: 6 },
        { type: 'fish', chance: 0.4, minQuantity: 1, maxQuantity: 3 },
        { type: 'reeds', chance: 0.5, minQuantity: 2, maxQuantity: 5 },
      ],
      rareDiscoveries: [{ type: 'hidden_spring', chance: 0.03, value: 300 }],
      unlockLevel: 2,
    },
    {
      id: 'rocky_outcrop',
      name: 'Rocky Outcrop',
      description: 'Dangerous terrain with valuable minerals.',
      difficulty: 'hard',
      energyCost: 25,
      resources: [
        { type: 'stone', chance: 0.8, minQuantity: 4, maxQuantity: 10 },
        { type: 'iron', chance: 0.5, minQuantity: 2, maxQuantity: 4 },
        { type: 'gems', chance: 0.1, minQuantity: 1, maxQuantity: 1 },
      ],
      rareDiscoveries: [
        { type: 'fossil', chance: 0.03, value: 400 },
        { type: 'gemstone', chance: 0.02, value: 800 },
      ],
      unlockLevel: 5,
    },
    {
      id: 'ancient_ruins',
      name: 'Ancient Ruins',
      description: 'Mysterious ruins with rare artifacts.',
      difficulty: 'very_hard',
      energyCost: 30,
      resources: [
        { type: 'stone', chance: 0.6, minQuantity: 2, maxQuantity: 5 },
        { type: 'clay', chance: 0.4, minQuantity: 1, maxQuantity: 3 },
      ],
      rareDiscoveries: [
        { type: 'ancient_pottery', chance: 0.02, value: 1000 },
        { type: 'artisan_tool', chance: 0.01, value: 2000 },
        { type: 'ancient_scroll', chance: 0.01, value: 1500 },
      ],
      unlockLevel: 7,
    },
  ];

  async getZones(farmId: string): Promise<Array<BushveldZone & { explored: number }>> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get farm level
    const { data: farm } = await adminClient
      .from('farms')
      .select('level')
      .eq('id', farmId)
      .single();

    const farmLevel = (farm?.level as number) || 1;

    // Get exploration counts
    const { data: explorations } = await adminClient
      .from('bushveld_explorations')
      .select('zone_id')
      .eq('farm_id', farmId);

    const explorationCounts = new Map<string, number>();
    (explorations ?? []).forEach((e: Record<string, unknown>) => {
      const zoneId = e.zone_id as string;
      explorationCounts.set(zoneId, (explorationCounts.get(zoneId) || 0) + 1);
    });

    return this.ZONES.filter((z) => z.unlockLevel <= farmLevel).map((z) => ({
      ...z,
      explored: explorationCounts.get(z.id) || 0,
    }));
  }

  async gatherResources(farmId: string, userId: string, zoneId: string): Promise<GatherResult> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const zone = this.ZONES.find((z) => z.id === zoneId);
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    // Check energy
    const { data: profile } = await adminClient
      .from('profiles')
      .select('energy')
      .eq('id', userId)
      .single();

    if (!profile || (profile.energy as number) < zone.energyCost) {
      throw new BadRequestException(
        `Insufficient energy. Need ${zone.energyCost}, have ${profile?.energy || 0}`,
      );
    }

    // Deduct energy
    await adminClient
      .from('profiles')
      .update({
        energy: (profile.energy as number) - zone.energyCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Gather resources
    const gatheredResources: Array<{ type: string; quantity: number }> = [];

    for (const resource of zone.resources) {
      if (Math.random() < resource.chance) {
        const quantity = Math.floor(
          Math.random() * (resource.maxQuantity - resource.minQuantity + 1) + resource.minQuantity,
        );
        gatheredResources.push({ type: resource.type, quantity });
      }
    }

    // Check for rare discovery
    let rareDiscovery: { type: string; value: number } | null = null;
    for (const rare of zone.rareDiscoveries) {
      if (Math.random() < rare.chance) {
        rareDiscovery = { type: rare.type, value: rare.value };
        break;
      }
    }

    // Add resources to inventory
    const now = new Date().toISOString();
    for (const resource of gatheredResources) {
      const { data: existing } = await adminClient
        .from('inventory')
        .select('*')
        .eq('farm_id', farmId)
        .eq('item_type', resource.type)
        .single();

      if (existing) {
        await adminClient
          .from('inventory')
          .update({
            quantity: (existing.quantity as number) + resource.quantity,
            updated_at: now,
          })
          .eq('id', existing.id);
      } else {
        await adminClient.from('inventory').insert({
          farm_id: farmId,
          item_type: resource.type,
          item_category: 'material',
          quantity: resource.quantity,
          quality: 'normal',
        });
      }
    }

    // Add rare discovery to inventory
    if (rareDiscovery) {
      const { data: existing } = await adminClient
        .from('inventory')
        .select('*')
        .eq('farm_id', farmId)
        .eq('item_type', rareDiscovery.type)
        .single();

      if (existing) {
        await adminClient
          .from('inventory')
          .update({
            quantity: (existing.quantity as number) + 1,
            updated_at: now,
          })
          .eq('id', existing.id);
      } else {
        await adminClient.from('inventory').insert({
          farm_id: farmId,
          item_type: rareDiscovery.type,
          item_category: 'rare',
          quantity: 1,
          quality: 'excellent',
        });
      }
    }

    // Record exploration
    await adminClient.from('bushveld_explorations').insert({
      farm_id: farmId,
      user_id: userId,
      zone_id: zoneId,
      resources_gathered: gatheredResources,
      rare_discovery: rareDiscovery?.type || null,
    });

    // XP gain
    const xpGained =
      zone.difficulty === 'easy'
        ? 5
        : zone.difficulty === 'medium'
          ? 10
          : zone.difficulty === 'hard'
            ? 15
            : 20;

    // Add XP
    const { data: currentProfile } = await adminClient
      .from('profiles')
      .select('xp, level')
      .eq('id', userId)
      .single();

    const currentXp = (currentProfile?.xp as number) || 0;
    const currentLevel = (currentProfile?.level as number) || 1;
    const newXp = currentXp + xpGained;
    const xpRequired = Math.ceil(100 * Math.pow(currentLevel + 1, 1.5));
    const newLevel = newXp >= xpRequired ? currentLevel + 1 : currentLevel;

    await adminClient
      .from('profiles')
      .update({
        xp: newXp,
        level: newLevel,
        updated_at: now,
      })
      .eq('id', userId);

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      farm_id: farmId,
      entry_type: 'BUSHVELD_GATHER',
      currency_change: 0,
      description: `Gathered resources from ${zone.name}`,
    });

    return {
      resources: gatheredResources,
      rareDiscovery,
      energyUsed: zone.energyCost,
      xpGained,
    };
  }

  async getGatheringHistory(farmId: string): Promise<
    Array<{
      zoneId: string;
      zoneName: string;
      resourcesGathered: Array<{ type: string; quantity: number }>;
      rareDiscovery: string | null;
      exploredAt: string;
    }>
  > {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: explorations } = await adminClient
      .from('bushveld_explorations')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })
      .limit(20);

    return (explorations ?? []).map((e: Record<string, unknown>) => {
      const zone = this.ZONES.find((z) => z.id === (e.zone_id as string));
      return {
        zoneId: e.zone_id as string,
        zoneName: zone?.name || (e.zone_id as string),
        resourcesGathered:
          (e.resources_gathered as Array<{ type: string; quantity: number }>) || [],
        rareDiscovery: e.rare_discovery as string | null,
        exploredAt: e.created_at as string,
      };
    });
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
