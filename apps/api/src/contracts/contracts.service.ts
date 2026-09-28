import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { WalletService } from '../wallet/wallet.service';
import {
  CONTRACT_RULES,
  contractGoodsMarketValue,
  contractRewardCap,
} from '@molemisi/game-config';

export interface Contract {
  id: string;
  name: string;
  description: string;
  category: string;
  requirements: Array<{ itemType: string; quantity: number }>;
  rewards: { currency: number; botho?: number };
  marketValue: number;
  difficulty: string;
  timeLimitHours: number;
}

/**
 * The design-intent row: what the farmer wrote on the board. `marketValue` is
 * DERIVED at read time, so the six literals below never carry it by hand.
 */
export type ContractDef = Omit<Contract, 'marketValue'>;

export interface ActiveContract {
  id: string;
  contractId: string;
  name: string;
  description: string;
  category: string;
  requirements: Array<{ itemType: string; quantity: number; current: number }>;
  rewards: { currency: number; botho: number };
  /**
   * R3 — the board's reasoning, made visible: what the same goods would net at
   * the Co-op at a neutral price (see `marketValueFor`). An accepted contract
   * carries the same number it showed on the board; a refusal can point at it.
   */
  marketValue: number;
  acceptedAt: string;
  expiresAt: string;
  completed: boolean;
}

@Injectable()
export class ContractsService {
  constructor(
    private supabaseService: SupabaseService,
    private inventory: InventoryService,
    private wallet: WalletService,
  ) {}

  // Pre-defined contracts
  private readonly CONTRACTS: ContractDef[] = [
    {
      id: 'contract_sorghum_10',
      name: 'Sorghum Harvest',
      description: 'Deliver 10 sorghum to the community store.',
      category: 'local',
      requirements: [{ itemType: 'sorghum', quantity: 10 }],
      rewards: { currency: 150 },
      difficulty: 'easy',
      timeLimitHours: 48,
    },
    {
      id: 'contract_maize_15',
      name: 'Maize Delivery',
      description: 'Supply 15 maize for the village feast.',
      category: 'community',
      requirements: [{ itemType: 'maize', quantity: 15 }],
      rewards: { currency: 300 },
      difficulty: 'medium',
      timeLimitHours: 72,
    },
    {
      id: 'contract_eggs_10',
      name: 'Egg Collection',
      description: 'Gather 10 eggs from your chickens.',
      category: 'local',
      requirements: [{ itemType: 'eggs', quantity: 10 }],
      rewards: { currency: 80 },
      difficulty: 'easy',
      timeLimitHours: 36,
    },
    {
      id: 'contract_mixed_grain_20',
      name: 'Grain Reserve',
      description: 'Build a grain reserve by delivering 20 units of mixed grain.',
      category: 'commercial',
      requirements: [
        { itemType: 'sorghum', quantity: 8 },
        { itemType: 'maize', quantity: 7 },
        { itemType: 'millet', quantity: 5 },
      ],
      rewards: { currency: 500 },
      difficulty: 'hard',
      timeLimitHours: 96,
    },
    {
      id: 'contract_flour_5',
      name: 'Mill Order',
      description: 'Process and deliver 5 bupi (sorghum flour) to the market.',
      category: 'commercial',
      requirements: [{ itemType: 'bupi', quantity: 5 }],
      rewards: { currency: 200 },
      difficulty: 'medium',
      timeLimitHours: 48,
    },
    {
      id: 'contract_cowpeas_8',
      name: 'Legume Supply',
      description: 'Provide 8 cowpeas for the school nutrition program.',
      category: 'community',
      requirements: [{ itemType: 'cowpeas', quantity: 8 }],
      rewards: { currency: 180 },
      difficulty: 'easy',
      timeLimitHours: 48,
    },
  ];

  async getAvailableContracts(_farmId: string): Promise<Contract[]> {
    // D5/C12 — no level gating. Difficulty is a display label only; every
    // contract is available from the start. Returning them all here means the
    // client needs no farm level to reason about availability.
    //
    // R3 / docs-31 P0-2 — the board advertises the amount it will ACTUALLY pay.
    // `payoutFor` is the same function `completeContract` settles with, so the
    // number on the card can never overstate the number in the wallet (01 §4:
    // never surprise the player with a cost — or with a missing reward).
    //
    // Botho pillar — contracts fed only Pula before; the board now shows the
    // Botho reward too, so the social pillar is visible where the player commits.
    return this.CONTRACTS.map((c) => ({
      ...c,
      rewards: { currency: this.payoutFor(c), botho: this.bothoRewardFor(c) },
      // R3 — the board's reasoning is auditable: this is what the same goods
      // would net at the Co-op, so a P150 payout for P48 of goods reads as
      // generosity rather than as an arithmetic error in the UI.
      marketValue: this.marketValueFor(c),
    }));
  }

  /**
   * R3 — hours until each recently-completed contract may be accepted again,
   * keyed by contract id. The single reader behind the accept-time refusal AND
   * the board preview, so the two can never quote different numbers.
   *
   * Reads through the CALLER's `adminClient`, never its own — one client per
   * call keeps the query log ordered (see the cooldown spec's call-order comment),
   * and in production it is the same pooled client anyway. Test doubles hand it a
   * plain object with the same terminal methods (see createMockBuilder).
   *
   * PUBLIC — but only because the controller composes it into the board preview.
   * The two-argument form (caller's client) is the internal path; the
   * one-argument form fetches its own client for the controller's use.
   */
  async getCooldowns(
    adminClient: Pick<ReturnType<SupabaseService['getAdminClient']>, 'from'>,
    farmId: string,
  ): Promise<Record<string, number>>;
  async getCooldowns(farmId: string): Promise<Record<string, number>>;
  async getCooldowns(
    adminClientOrFarmId: Pick<ReturnType<SupabaseService['getAdminClient']>, 'from'> | string,
    farmId?: string,
  ): Promise<Record<string, number>> {
    const adminClient: Pick<ReturnType<SupabaseService['getAdminClient']>, 'from'> =
      typeof adminClientOrFarmId === 'string'
        ? this.supabaseService.getAdminClient()
        : adminClientOrFarmId;
    const farm = (farmId ?? adminClientOrFarmId) as string;

    const cooldownFrom = new Date(
      Date.now() - CONTRACT_RULES.repeatCooldownHours * 60 * 60 * 1000,
    ).toISOString();
    // The full chain in the supabase client's own type — no `as unknown`
    // anywhere, so a client upgrade that renames a link breaks the BUILD, not
    // a player in production.
    const { data: recent } = await adminClient
      .from('active_contracts')
      .select('contract_id, completed_at, farm_id')
      .eq('farm_id', farm)
      .eq('completed', true)
      .gte('completed_at', cooldownFrom)
      .order('completed_at', { ascending: false });

    const out: Record<string, number> = {};
    for (const row of ((recent as Array<Record<string, unknown>> | null) ?? [])) {
      // Belt and braces: the query is already farm-scoped, but a Shared
      // cooldown would be an economy bug AND a privacy leak, so the check is
      // explicit here where any future caller can see it.
      if (row.farm_id !== farm) continue;
      const cid = row.contract_id as string;
      if (!cid || out[cid] !== undefined) continue; // latest completion wins
      const readyAt =
        new Date(row.completed_at as string).getTime() +
        CONTRACT_RULES.repeatCooldownHours * 60 * 60 * 1000;
      out[cid] = Math.max(1, Math.ceil((readyAt - Date.now()) / (60 * 60 * 1000)));
    }
    return out;
  }

  /**
   * R3 / docs-31 P0-2 — the fair-price line for this contract: what the same
   * goods would net at the Co-op at a neutral price. Stated separately from the
   * payout so the board can tell the player the honest yardstick; 01 §4 ("never
   * surprise the player with a cost") cuts both ways — a player who completes a
   * P150 contract for P48 of goods deserves to know the deal was generous.
   */
  private marketValueFor(contract: ContractDef): number {
    return contractGoodsMarketValue(contract.requirements);
  }

  /**
   * R3 / docs-31 P0-2 — a contract pays its listed reward, capped at
   * `CONTRACT_RULES.rewardMarketMultiple` × what the same goods net at the Co-op.
   * One function, used by both the board and the settlement, so display and
   * payout cannot disagree.
   */
  private payoutFor(contract: ContractDef): number {
    return Math.min(contract.rewards.currency, contractRewardCap(contract.requirements));
  }

  /**
   * Botho reward for completing a contract — the social pillar (I4-capped at
   * settlement via `wallet.creditBothoCapped`). Contracts previously paid ONLY
   * Pula, leaving Botho unrepresented in the co-op loop; this scales a modest
   * Botho payout to the contract's Pula value so bigger deliveries earn more
   * standing, without ever printing money (Botho is social, not economic). The
   * daily Botho ceiling still governs the actual credit.
   */
  private bothoRewardFor(contract: ContractDef): number {
    return Math.max(2, Math.round(this.payoutFor(contract) / 10));
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

    // G4 — progress reads the canonical player_inventory store, not the legacy
    // farm-scoped `inventory` table (which post-cutover no longer receives
    // livestock products and never received anything else).
    const playerId = await this.inventory.resolvePlayerId(farmId);

    return await Promise.all(
      (active ?? []).map(async (a: Record<string, unknown>) => {
        const contract = this.CONTRACTS.find((c) => c.id === (a.contract_id as string));
        if (!contract) return null;

        // Check progress for each requirement
        const requirements = await Promise.all(
          contract.requirements.map(async (req) => ({
            itemType: req.itemType,
            quantity: req.quantity,
            current: await this.inventory.countOwned(playerId, req.itemType),
          })),
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
          rewards: { currency: this.payoutFor(contract), botho: this.bothoRewardFor(contract) },
          marketValue: this.marketValueFor(contract),
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

    // Check if already accepted — `getAdminClient()` is NOT re-fetched here:
    // `acceptContract` uses one instance per call (line 259), so every reader
    // shares the same object AND the same ordered call log. The contract tests
    // rely on this ordering (cooldown rows via .limit(), ownership/active rows
    // via .single()).
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

    // R3 / docs-31 P0-2 — REPEAT COOLDOWN. Completed rows stay in
    // `active_contracts` (completeContract stamps `completed_at`), so the last
    // payout of each contract to this farm is readable without a new table.
    // Without this the board was an infinite money loop: complete, re-accept,
    // complete again, ~P500 a minute for a farm with the goods to spare.
    //
    // The refusal carries its evidence with it (`{record, hoursLeft}`): the
    // client reads fair-price-vs-payout from the same payload instead of having
    // to ask again, because a cooling contract still OWES its numbers.
    const cooldowns = await this.getCooldowns(farmId);
    if (cooldowns[contractId] !== undefined) {
      const payout = this.payoutFor(contract);
      throw new BadRequestException({
        error: `${contract.name} was delivered recently. The co-op posts it again in ${cooldowns[contractId]}h.`,
        code: 'CONTRACT_COOLDOWN',
        record: {
          hoursLeft: cooldowns[contractId],
          contractId,
          payout,
          marketValue: this.marketValueFor(contract),
          repeatCooldownHours: CONTRACT_RULES.repeatCooldownHours,
        },
      });
    }

    // Accept contract
    const expiresAt = new Date(Date.now() + contract.timeLimitHours * 60 * 60 * 1000).toISOString();

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
  ): Promise<{ currencyReward: number; bothoReward: number }> {
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
    const contract = this.CONTRACTS.find((c) => c.id === (active.contract_id as string));
    if (!contract) {
      throw new BadRequestException('Contract definition not found');
    }

    // Check if all requirements met (G4: canonical store)
    const playerId = await this.inventory.resolvePlayerId(farmId);
    for (const req of contract.requirements) {
      const current = await this.inventory.countOwned(playerId, req.itemType);
      if (current < req.quantity) {
        throw new BadRequestException(
          `Insufficient ${req.itemType}: need ${req.quantity}, have ${current}`,
        );
      }
    }

    // Deduct required items
    for (const req of contract.requirements) {
      await this.inventory.removeItem(playerId, req.itemType, req.quantity);
    }

    // R3 / docs-31 P0-2 — settle with `payoutFor`, the capped number the board
    // advertised. `contract.rewards.currency` is the design intent; the cap is
    // what keeps that intent from outbidding the Co-op on identical goods.
    const payout = this.payoutFor(contract);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('currency')
      .eq('id', userId)
      .single();

    const currentCurrency = (profile?.currency as number) || 0;

    await adminClient
      .from('profiles')
      .update({
        currency: currentCurrency + payout,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Botho pillar — contracts fed only Pula before. Credited through the I4
    // daily-capped wallet path so it can never exceed the Botho ceiling; the
    // returned (awarded) amount is what the player actually received.
    const bothoReward = this.bothoRewardFor(contract);
    const awardedBotho = await this.wallet.creditBothoCapped(userId, bothoReward, 'contract_complete');

    // Mark contract as completed
    await adminClient
      .from('active_contracts')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', activeContractId);

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      farm_id: farmId,
      entry_type: 'CONTRACT_COMPLETE',
      currency_change: payout,
      currency_balance_after: currentCurrency + payout,
      description: `Completed contract: ${contract.name}`,
    });

    return {
      currencyReward: payout,
      bothoReward: awardedBotho,
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
