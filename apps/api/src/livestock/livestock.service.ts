import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { getAnimalConfig } from '@molemisi/game-config';

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
}

@Injectable()
export class LivestockService {
  constructor(private supabaseService: SupabaseService) {}

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

    // Check farm level requirement
    const { data: farm } = await adminClient
      .from('farms')
      .select('level')
      .eq('id', farmId)
      .single();

    if (farm && (farm.level as number) < config.unlockLevel) {
      throw new BadRequestException(`Farm level ${config.unlockLevel} required for ${config.name}`);
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

    // Check building capacity
    const { count } = await adminClient
      .from('livestock')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('animal_type', animalType);

    if (count && count >= (building.capacity as number)) {
      throw new BadRequestException(
        `${config.buildingRequired.replace(/_/g, ' ')} is full (${building.capacity} capacity)`,
      );
    }

    // Check currency
    const { data: profile } = await adminClient
      .from('profiles')
      .select('currency')
      .eq('id', userId)
      .single();

    if (!profile || (profile.currency as number) < config.purchaseCost) {
      throw new BadRequestException(`Insufficient currency. Need ${config.purchaseCost} P`);
    }

    // Deduct currency
    await adminClient
      .from('profiles')
      .update({ currency: (profile.currency as number) - config.purchaseCost })
      .eq('id', userId);

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

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      user_id: userId,
      entry_type: 'PURCHASE',
      item_type: animalType,
      quantity: 1,
      currency_change: -config.purchaseCost,
      description: `Purchased ${config.name}${name ? ` "${name}"` : ''}`,
    });

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
  ): Promise<{ hunger: number; xpGained: number }> {
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

    if (animalRow.hunger >= 1.0) {
      throw new BadRequestException('Animal is already full');
    }

    if (animalRow.is_sick) {
      throw new BadRequestException('Animal is sick and needs medicine');
    }

    // Increase hunger
    const newHunger = Math.min(1.0, animalRow.hunger + 0.3);

    await adminClient
      .from('livestock')
      .update({
        hunger: newHunger,
        last_fed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', animalId);

    return { hunger: newHunger, xpGained: 3 };
  }

  async collectProduct(
    farmId: string,
    userId: string,
    animalId: string,
  ): Promise<{ productType: string; quantity: number; xpGained: number }> {
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

    // Add product to inventory
    const { data: existingItem } = await adminClient
      .from('inventory')
      .select('*')
      .eq('farm_id', farmId)
      .eq('item_type', config.productType)
      .single();

    if (existingItem) {
      await adminClient
        .from('inventory')
        .update({
          quantity: existingItem.quantity + config.productQuantity,
          updated_at: now,
        })
        .eq('id', existingItem.id);
    } else {
      await adminClient.from('inventory').insert({
        farm_id: farmId,
        item_type: config.productType,
        item_category: 'product',
        quantity: config.productQuantity,
        quality: 'normal',
      });
    }

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

    // Get farm level
    const { data: farm } = await adminClient
      .from('farms')
      .select('level')
      .eq('id', farmId)
      .single();

    const farmLevel = (farm?.level as number) || 1;

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
      .filter((a) => a.unlockLevel <= farmLevel)
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
