import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export interface Contract {
  id: string;
  name: string;
  description: string;
  category: string;
  requirements: Array<{ itemType: string; quantity: number }>;
  rewards: { currency: number; xp: number };
  difficulty: string;
  timeLimitHours: number;
}

export interface ActiveContract {
  id: string;
  contractId: string;
  name: string;
  description: string;
  category: string;
  requirements: Array<{ itemType: string; quantity: number; current: number }>;
  rewards: { currency: number; xp: number };
  acceptedAt: string;
  expiresAt: string;
  completed: boolean;
}

@Injectable()
export class ContractsService {
  constructor(private supabaseService: SupabaseService) {}

  // Pre-defined contracts
  private readonly CONTRACTS: Contract[] = [
    {
      id: 'contract_sorghum_10',
      name: 'Sorghum Harvest',
      description: 'Deliver 10 sorghum to the community store.',
      category: 'local',
      requirements: [{ itemType: 'sorghum', quantity: 10 }],
      rewards: { currency: 150, xp: 30 },
      difficulty: 'easy',
      timeLimitHours: 48,
    },
    {
      id: 'contract_maize_15',
      name: 'Maize Delivery',
      description: 'Supply 15 maize for the village feast.',
      category: 'community',
      requirements: [{ itemType: 'maize', quantity: 15 }],
      rewards: { currency: 300, xp: 50 },
      difficulty: 'medium',
      timeLimitHours: 72,
    },
    {
      id: 'contract_eggs_10',
      name: 'Egg Collection',
      description: 'Gather 10 eggs from your chickens.',
      category: 'local',
      requirements: [{ itemType: 'egg', quantity: 10 }],
      rewards: { currency: 80, xp: 20 },
      difficulty: 'easy',
      timeLimitHours: 36,
    },
    {
      id: 'contract_mixed_grain_20',
      name: 'Grain Reserve',
      description: 'Build a grain储备 by delivering 20 units of mixed grain.',
      category: 'commercial',
      requirements: [
        { itemType: 'sorghum', quantity: 8 },
        { itemType: 'maize', quantity: 7 },
        { itemType: 'millet', quantity: 5 },
      ],
      rewards: { currency: 500, xp: 80 },
      difficulty: 'hard',
      timeLimitHours: 96,
    },
    {
      id: 'contract_flour_5',
      name: 'Mill Order',
      description: 'Process and deliver 5 flour to the market.',
      category: 'commercial',
      requirements: [{ itemType: 'flour', quantity: 5 }],
      rewards: { currency: 200, xp: 40 },
      difficulty: 'medium',
      timeLimitHours: 48,
    },
    {
      id: 'contract_cowpeas_8',
      name: 'Legume Supply',
      description: 'Provide 8 cowpeas for the school nutrition program.',
      category: 'community',
      requirements: [{ itemType: 'cowpeas', quantity: 8 }],
      rewards: { currency: 180, xp: 35 },
      difficulty: 'easy',
      timeLimitHours: 48,
    },
  ];

  async getAvailableContracts(farmId: string): Promise<Contract[]> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get farm level to filter difficulty
    const { data: farm } = await adminClient
      .from('farms')
      .select('level')
      .eq('id', farmId)
      .single();

    const farmLevel = (farm?.level as number) || 1;

    // Filter contracts by difficulty/level
    return this.CONTRACTS.filter((c) => {
      if (c.difficulty === 'easy') return farmLevel >= 1;
      if (c.difficulty === 'medium') return farmLevel >= 3;
      if (c.difficulty === 'hard') return farmLevel >= 5;
      return true;
    });
  }

  async getActiveContracts(farmId: string): Promise<ActiveContract[]> {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: active } = await adminClient
      .from('active_contracts')
      .select('*')
      .eq('farm_id', farmId)
      .eq('completed', false)
      .order('accepted_at', { ascending: false });

    if (!active) return [];

    return await Promise.all(
      (active ?? []).map(async (a: Record<string, unknown>) => {
        const contract = this.CONTRACTS.find((c) => c.id === a.contract_id as string);
        if (!contract) return null;

        // Check progress for each requirement
        const requirements = await Promise.all(
          contract.requirements.map(async (req) => {
            const { data: item } = await adminClient
              .from('inventory')
              .select('quantity')
              .eq('farm_id', farmId)
              .eq('item_type', req.itemType)
              .single();

            return {
              itemType: req.itemType,
              quantity: req.quantity,
              current: (item?.quantity as number) || 0,
            };
          }),
        );

        // Check if expired
        const expiresAt = a.expires_at as string;
        const isExpired = new Date(expiresAt) < new Date();

        return {
          id: a.id as string,
          contractId: a.contract_id as string,
          name: contract.name,
          description: contract.description,
          category: contract.category,
          requirements,
          rewards: contract.rewards,
          acceptedAt: a.accepted_at as string,
          expiresAt,
          completed: isExpired ? false : requirements.every((r) => r.current >= r.quantity),
        };
      }),
    ).then((contracts) => contracts.filter((c): c is ActiveContract => c !== null));
  }

  async acceptContract(
    farmId: string,
    userId: string,
    contractId: string,
  ): Promise<{ id: string; contractId: string; expiresAt: string }> {
    const adminClient = this.supabaseService.getAdminClient();

    // Verify ownership
    await this.verifyFarmOwnership(farmId, userId);

    // Check if contract exists
    const contract = this.CONTRACTS.find((c) => c.id === contractId);
    if (!contract) {
      throw new BadRequestException('Contract not found');
    }

    // Check if already accepted
    const { data: existing } = await adminClient
      .from('active_contracts')
      .select('id')
      .eq('farm_id', farmId)
      .eq('contract_id', contractId)
      .eq('completed', false)
      .single();

    if (existing) {
      throw new BadRequestException('Contract already active');
    }

    // Accept contract
    const expiresAt = new Date(
      Date.now() + contract.timeLimitHours * 60 * 60 * 1000,
    ).toISOString();

    const { data: active, error } = await adminClient
      .from('active_contracts')
      .insert({
        farm_id: farmId,
        user_id: userId,
        contract_id: contractId,
        completed: false,
        accepted_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error || !active) {
      throw new Error('Failed to accept contract');
    }

    return {
      id: (active as Record<string, unknown>).id as string,
      contractId,
      expiresAt,
    };
  }

  async completeContract(
    farmId: string,
    userId: string,
    activeContractId: string,
  ): Promise<{ currencyReward: number; xpReward: number }> {
    const adminClient = this.supabaseService.getAdminClient();

    // Verify ownership
    await this.verifyFarmOwnership(farmId, userId);

    // Get active contract
    const { data: active } = await adminClient
      .from('active_contracts')
      .select('*')
      .eq('id', activeContractId)
      .eq('farm_id', farmId)
      .single();

    if (!active) {
      throw new NotFoundException('Active contract not found');
    }

    if (active.completed as boolean) {
      throw new BadRequestException('Contract already completed');
    }

    // Check if expired
    if (new Date(active.expires_at as string) < new Date()) {
      throw new BadRequestException('Contract has expired');
    }

    // Get contract definition
    const contract = this.CONTRACTS.find((c) => c.id === active.contract_id as string);
    if (!contract) {
      throw new BadRequestException('Contract definition not found');
    }

    // Check if all requirements met
    for (const req of contract.requirements) {
      const { data: item } = await adminClient
        .from('inventory')
        .select('quantity')
        .eq('farm_id', farmId)
        .eq('item_type', req.itemType)
        .single();

      const current = (item?.quantity as number) || 0;
      if (current < req.quantity) {
        throw new BadRequestException(
          `Insufficient ${req.itemType}: need ${req.quantity}, have ${current}`,
        );
      }
    }

    // Deduct required items
    for (const req of contract.requirements) {
      const { data: item } = await adminClient
        .from('inventory')
        .select('*')
        .eq('farm_id', farmId)
        .eq('item_type', req.itemType)
        .single();

      if (item) {
        const newQty = (item.quantity as number) - req.quantity;
        if (newQty <= 0) {
          await adminClient.from('inventory').delete().eq('id', item.id);
        } else {
          await adminClient
            .from('inventory')
            .update({ quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', item.id);
        }
      }
    }

    // Add rewards
    const { data: profile } = await adminClient
      .from('profiles')
      .select('currency, xp, level')
      .eq('id', userId)
      .single();

    const currentCurrency = (profile?.currency as number) || 0;
    const currentXp = (profile?.xp as number) || 0;
    const currentLevel = (profile?.level as number) || 1;

    const newXp = currentXp + contract.rewards.xp;

    // Check for level up
    const xpRequired = Math.ceil(100 * Math.pow(currentLevel + 1, 1.5));
    const newLevel = newXp >= xpRequired ? currentLevel + 1 : currentLevel;

    await adminClient
      .from('profiles')
      .update({
        currency: currentCurrency + contract.rewards.currency,
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Mark contract as completed
    await adminClient
      .from('active_contracts')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', activeContractId);

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      farm_id: farmId,
      entry_type: 'CONTRACT_COMPLETE',
      currency_change: contract.rewards.currency,
      currency_balance_after: currentCurrency + contract.rewards.currency,
      description: `Completed contract: ${contract.name}`,
    });

    return {
      currencyReward: contract.rewards.currency,
      xpReward: contract.rewards.xp,
    };
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
