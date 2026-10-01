import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  getAnimalConfig,
  PRODUCT_ITEM,
  MANURE_PER_COLLECT,
  SICK_FEED_GAIN,
  TREATMENT_ITEM,
  TREATMENT_HEALTH,
} from '@molemisi/game-config';

interface LivestockRow {
  id: string;
  farm_id: string;
  animal_type: string;
  name: string | null;
  hunger: number;
  health: number;
  happiness: number;
  product_ready: boolean;
  product_timer_hours: number;
  is_sick: boolean;
  last_fed_at: string;
  last_pet_at: string | null;
  /** R1/30-1.4 — when hunger last hit 0; null when the animal is fed. */
  hunger_zero_since?: string | null;
}

@Injectable()
export class LivestockService {
  constructor(
    private supabaseService: SupabaseService,
    private wallet: WalletService,
    private inventory: InventoryService,
  ) {}

  async listLivestock(farmId: string): Promise<
    Array<{
      id: string;
      animalType: string;
      name: string | null;
      hunger: number;
      health: number;
      happiness: number;
      productReady: boolean;
      productTimerHours: number;
      isSick: boolean;
      lastFedAt: string;
      lastPetAt: string | null;
    }>
  > {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: animals, error } = await adminClient
      .from('livestock')
      .select('*')
      .eq('farm_id', farmId);

    if (error) {
      throw new Error('Failed to fetch livestock');
    }

    return (animals ?? []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      animalType: a.animal_type as string,
      name: a.name as string | null,
      hunger: a.hunger as number,
      health: a.health as number,
      happiness: a.happiness as number,
      productReady: a.product_ready as boolean,
      productTimerHours: a.product_timer_hours as number,
      isSick: a.is_sick as boolean,
      lastFedAt: a.last_fed_at as string,
      lastPetAt: a.last_pet_at as string | null,
    }));
  }

  async purchaseAnimal(
    farmId: string,
    userId: string,
    animalType: string,
    name?: string,
  ): Promise<{ id: string; animalType: string; name: string | null }> {
    const adminClient = this.supabaseService.getAdminClient();

    // Verify ownership
    await this.verifyFarmOwnership(farmId, userId);

    // Get animal config
    const config = getAnimalConfig(animalType);
    if (!config) {
      throw new BadRequestException(`Unknown animal type: ${animalType}`);
    }

    // Check if player has the required building
    const { data: building } = await adminClient
      .from('buildings')
      .select('id, capacity, state')
      .eq('farm_id', farmId)
      .eq('building_type', config.buildingRequired)
      .eq('state', 'ACTIVE')
      .single();

    if (!building) {
      throw new BadRequestException(
        `You need a ${config.buildingRequired.replace(/_/g, ' ')} to house ${config.name}s`,
      );
    }

    // Check building capacity. D8 has ONE livestock building (kraal), so every
    // animal shares it — occupancy is the TOTAL livestock on the farm, not a
    // per-type count. The old per-type count let a 4-slot kraal hold 4 chickens
    // AND 4 goats AND 4 cows AND 4 guinea fowl (4x capacity): a silent overflow.
    const { count } = await adminClient
      .from('livestock')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId);

    if (count !== null && count >= (building.capacity as number)) {
      throw new BadRequestException(
        `${config.buildingRequired.replace(/_/g, ' ')} is full (${building.capacity} capacity)`,
      );
    }

    // Spend through the wallet (05 §P2). Atomic check-and-debit.
    await this.wallet.spendPula(userId, config.purchaseCost, 'seed_purchase');

    // Create animal
    const { data: animal, error } = await adminClient
      .from('livestock')
      .insert({
        farm_id: farmId,
        animal_type: animalType,
        name: name || null,
        hunger: 0.8,
        health: 1.0,
        happiness: 0.7,
        product_ready: false,
        product_timer_hours: 0,
        is_sick: false,
        last_fed_at: new Date().toISOString(),
        last_pet_at: null,
      })
      .select()
      .single();

    if (error || !animal) {
      throw new Error('Failed to create animal');
    }

    // Ledger row is written by wallet_apply(); game_ledger_entries is retired.

    return {
      id: (animal as Record<string, unknown>).id as string,
      animalType,
      name: name || null,
    };
  }

  async feedAnimal(
    farmId: string,
    userId: string,
    animalId: string,
  ): Promise<{ hunger: number; xpGained: number; sick: boolean; feed: { slug: string; qty: number } }> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const { data: animal } = await adminClient
      .from('livestock')
      .select('*')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single();

    if (!animal) {
      throw new NotFoundException('Animal not found');
    }

    const animalRow = animal as unknown as LivestockRow;
    const config = getAnimalConfig(animalRow.animal_type);
    if (!config) {
      throw new BadRequestException('Unknown animal type');
    }

    // 400s are reserved for ownership (above), a full animal, and an empty
    // larder — never for sickness (docs/30 task 1.2: cozy games degrade, they
    // do not lock; a sick animal may still be fed).
    if (animalRow.hunger >= 1.0) {
      throw new BadRequestException('Animal is already full');
    }

    // R2/30-1.3 — CHARGE THE RATION. The audit's P0-2: `feedPerDay`/`feedType`
    // were declared but read by nothing, so feeding was a free faucet while the
    // client rendered "2 sorghum" on the button. The debit happens BEFORE the
    // hunger write: if the larder is short the whole feed fails with a clear
    // 4xx and hunger is untouched (no free partial feeds on retry).
    const playerId = await this.inventory.resolvePlayerId(farmId);
    const owned = await this.inventory.countOwned(playerId, config.feedType);
    if (owned < config.feedPerDay) {
      throw new BadRequestException(
        `Not enough ${config.feedType}: need ${config.feedPerDay}, have ${owned}`,
      );
    }
    await this.inventory.removeItem(playerId, config.feedType, config.feedPerDay);

    // R1/30-1.2 — sick animals still eat, at a reduced gain, and never 400.
    // Healthy: a full day's ration tops hunger to 1.0, which is what makes the
    // 24 h feed cycle (decay 0.02/h) hold hunger ≥ 0.5 for a whole day
    // (docs/30 task 1.6 acceptance).
    const sick = animalRow.is_sick;
    const newHunger = sick ? Math.min(1.0, animalRow.hunger + SICK_FEED_GAIN) : 1.0;

    await adminClient
      .from('livestock')
      .update({
        hunger: newHunger,
        last_fed_at: new Date().toISOString(),
        // Fed animals are not starving — reset the starvation window (1.4).
        hunger_zero_since: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', animalId);

    return {
      hunger: newHunger,
      xpGained: 3,
      sick,
      feed: { slug: config.feedType, qty: config.feedPerDay },
    };
  }

  /**
   * R1/30-1.1 — the recovery path. Consumes `TREATMENT_ITEM` (herbs, whose own
   * lore already promises exactly this) and lifts the animal to
   * `TREATMENT_HEALTH` with `is_sick = false`, so the herbalist identity
   * becomes mechanical instead of decorative. Without this endpoint a single
   * overnight gap permanently destroyed the livestock pillar (P0-1).
   */
  async treatAnimal(
    farmId: string,
    userId: string,
    animalId: string,
  ): Promise<{ isSick: boolean; health: number; treatedWith: string }> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const { data: animal } = await adminClient
      .from('livestock')
      .select('*')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single();

    if (!animal) {
      throw new NotFoundException('Animal not found');
    }

    const animalRow = animal as unknown as LivestockRow;
    if (!animalRow.is_sick) {
      throw new BadRequestException('Animal is not sick');
    }

    // Consume the treatment BEFORE the cure lands (G1/G4 pattern): a missing
    // herb fails here and the animal stays sick, so nothing is ever cured free.
    const playerId = await this.inventory.resolvePlayerId(farmId);
    const owned = await this.inventory.countOwned(playerId, TREATMENT_ITEM);
    if (owned < 1) {
      throw new BadRequestException(
        `Treatment needs 1 ${TREATMENT_ITEM} — gather in the bushveld or buy at the Co-op`,
      );
    }
    await this.inventory.removeItem(playerId, TREATMENT_ITEM, 1);

    await adminClient
      .from('livestock')
      .update({
        is_sick: false,
        health: TREATMENT_HEALTH,
        hunger_zero_since: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', animalId);

    return { isSick: false, health: TREATMENT_HEALTH, treatedWith: TREATMENT_ITEM };
  }

  /**
   * R2/30-1.7 — per-kraal feeding: ONE action feeds every feedable animal in
   * the farm's kraal, consuming each animal's summed `feedPerDay` ration.
   * Stock-checked per slug BEFORE any debit, so a shortfall fails the WHOLE
   * feed (nothing partially eaten). Full animals are skipped and not charged.
   * Per-animal `feedAnimal` remains the fallback.
   */
  async feedKraal(
    farmId: string,
    userId: string,
  ): Promise<{
    fed: number;
    skippedFull: number;
    sick: number;
    cost: Array<{ slug: string; qty: number }>;
  }> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const { data: animals } = await adminClient
      .from('livestock')
      .select('*')
      .eq('farm_id', farmId);

    const all = (animals ?? []) as unknown as LivestockRow[];
    const rows = all.filter((a) => a.hunger < 1.0);
    const skippedFull = all.length - rows.length;

    if (rows.length === 0) {
      throw new BadRequestException('Every animal in the kraal is full');
    }

    // Sum the rations per feed slug, then stock-check every slug up front.
    const cost = new Map<string, number>();
    for (const row of rows) {
      const config = getAnimalConfig(row.animal_type);
      if (!config) continue;
      cost.set(config.feedType, (cost.get(config.feedType) ?? 0) + config.feedPerDay);
    }

    const playerId = await this.inventory.resolvePlayerId(farmId);
    for (const [slug, qty] of cost) {
      const owned = await this.inventory.countOwned(playerId, slug);
      if (owned < qty) {
        throw new BadRequestException(
          `Kraal feed needs ${qty} ${slug} — have ${owned}. Feed fewer animals or restock.`,
        );
      }
    }

    for (const [slug, qty] of cost) {
      await this.inventory.removeItem(playerId, slug, qty);
    }

    const now = new Date().toISOString();
    let fed = 0;
    let sick = 0;
    for (const row of rows) {
      const config = getAnimalConfig(row.animal_type);
      if (!config) continue;
      const isSick = row.is_sick;
      const newHunger = isSick ? Math.min(1.0, row.hunger + SICK_FEED_GAIN) : 1.0;
      if (isSick) sick++;
      fed++;
      await adminClient
        .from('livestock')
        .update({
          hunger: newHunger,
          last_fed_at: now,
          hunger_zero_since: null,
          updated_at: now,
        })
        .eq('id', row.id);
    }

    return {
      fed,
      skippedFull,
      sick,
      cost: [...cost].map(([slug, qty]) => ({ slug, qty })),
    };
  }

  async collectProduct(
    farmId: string,
    userId: string,
    animalId: string,
  ): Promise<{ productType: string; quantity: number; xpGained: number; byproduct: { slug: string; quantity: number } }> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const { data: animal } = await adminClient
      .from('livestock')
      .select('*')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single();

    if (!animal) {
      throw new NotFoundException('Animal not found');
    }

    const animalRow = animal as unknown as LivestockRow;
    const config = getAnimalConfig(animalRow.animal_type);

    if (!config) {
      throw new BadRequestException('Unknown animal type');
    }

    if (!animalRow.product_ready) {
      throw new BadRequestException('No product ready to collect');
    }

    // G4 — grant FIRST, through the canonical player_inventory store (stack and
    // storage slot caps enforced in one place). If storage is full this throws
    // and the animal stays product_ready, so the player can free a slot and
    // collect again; nothing is silently dropped.
    const itemSlug = PRODUCT_ITEM[config.productType];
    if (!itemSlug) {
      throw new BadRequestException(`No inventory item for product '${config.productType}'`);
    }
    const playerId = await this.inventory.resolvePlayerId(farmId);
    // G1 — the muck-out: every collect also brings manure (03 §5). Product and
    // byproduct are granted in ONE combined slot check, so a store that cannot
    // take both fails the whole collect (nothing duplicated on retry, nothing
    // dropped — G4's invariant, extended to the byproduct).
    await this.inventory.addItems(playerId, farmId, [
      { slug: itemSlug, qty: config.productQuantity },
      { slug: 'manure', qty: MANURE_PER_COLLECT },
    ]);

    const now = new Date().toISOString();

    // Reset product timer
    await adminClient
      .from('livestock')
      .update({
        product_ready: false,
        product_timer_hours: 0,
        updated_at: now,
      })
      .eq('id', animalId);

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      user_id: userId,
      entry_type: 'COLLECT',
      item_type: config.productType,
      quantity: config.productQuantity,
      currency_change: 0,
      description: `Collected ${config.productQuantity} ${config.productType} from ${config.name}`,
    });

    return {
      productType: config.productType,
      quantity: config.productQuantity,
      xpGained: 8,
      byproduct: { slug: 'manure', quantity: MANURE_PER_COLLECT },
    };
  }

  async petAnimal(
    farmId: string,
    userId: string,
    animalId: string,
  ): Promise<{ happiness: number; xpGained: number }> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const { data: animal } = await adminClient
      .from('livestock')
      .select('*')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single();

    if (!animal) {
      throw new NotFoundException('Animal not found');
    }

    const animalRow = animal as unknown as LivestockRow;
    const newHappiness = Math.min(1.0, animalRow.happiness + 0.2);

    await adminClient
      .from('livestock')
      .update({
        happiness: newHappiness,
        last_pet_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', animalId);

    return { happiness: newHappiness, xpGained: 1 };
  }

  async getAvailableAnimals(farmId: string): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      purchaseCost: number;
      productType: string;
      productQuantity: number;
      productionCycleHours: number;
      buildingRequired: string;
      owned: boolean;
      count: number;
    }>
  > {
    const adminClient = this.supabaseService.getAdminClient();

    // Get owned animal counts
    const { data: ownedAnimals } = await adminClient.from('livestock').select('animal_type');

    const counts = new Map<string, number>();
    (ownedAnimals ?? []).forEach((a: Record<string, unknown>) => {
      const type = a.animal_type as string;
      counts.set(type, (counts.get(type) || 0) + 1);
    });

    // Return all available animals
    const { ANIMALS } = await import('@molemisi/game-config');
    return Object.values(ANIMALS)
      .map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        purchaseCost: a.purchaseCost,
        productType: a.productType,
        productQuantity: a.productQuantity,
        productionCycleHours: a.productionCycleHours,
        buildingRequired: a.buildingRequired,
        owned: counts.has(a.id),
        count: counts.get(a.id) || 0,
      }));
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
