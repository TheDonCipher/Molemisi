import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { getBuildingConfig, type BuildingConfig } from '@molemisi/game-config';

interface BuildingRow {
  id: string;
  farm_id: string;
  building_type: string;
  level: number;
  state: string;
  capacity: number;
  wear: number;
  construction_started_at: string | null;
  construction_ends_at: string | null;
  last_maintained_at: string;
}

@Injectable()
export class BuildingsService {
  constructor(private supabaseService: SupabaseService) {}

  async listBuildings(farmId: string): Promise<Array<{
    id: string;
    buildingType: string;
    level: number;
    state: string;
    capacity: number;
    wear: number;
    constructionEndsAt: string | null;
  }>> {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: buildings, error } = await adminClient
      .from('buildings')
      .select('*')
      .eq('farm_id', farmId);

    if (error) {
      throw new Error('Failed to fetch buildings');
    }

    return (buildings ?? []).map((b: Record<string, unknown>) => ({
      id: b.id as string,
      buildingType: b.building_type as string,
      level: b.level as number,
      state: b.state as string,
      capacity: b.capacity as number,
      wear: b.wear as number,
      constructionEndsAt: b.construction_ends_at as string | null,
    }));
  }

  async constructBuilding(
    farmId: string,
    userId: string,
    buildingType: string,
  ): Promise<{ id: string; buildingType: string; state: string; constructionEndsAt: string }> {
    const adminClient = this.supabaseService.getAdminClient();

    // Verify ownership
    await this.verifyFarmOwnership(farmId, userId);

    // Get building config
    const config = getBuildingConfig(buildingType);
    if (!config) {
      throw new BadRequestException(`Unknown building type: ${buildingType}`);
    }

    // Check if player already has this building
    const { data: existing } = await adminClient
      .from('buildings')
      .select('id')
      .eq('farm_id', farmId)
      .eq('building_type', buildingType)
      .single();

    if (existing) {
      throw new BadRequestException(`You already have a ${config.name}`);
    }

    // Check farm level requirement
    const { data: farm } = await adminClient
      .from('farms')
      .select('level')
      .eq('id', farmId)
      .single();

    if (farm && (farm.level as number) < config.unlockLevel) {
      throw new BadRequestException(
        `Farm level ${config.unlockLevel} required to build ${config.name}`,
      );
    }

    // Check currency
    const { data: profile } = await adminClient
      .from('profiles')
      .select('currency')
      .eq('id', userId)
      .single();

    if (!profile || (profile.currency as number) < config.baseCost.currency) {
      throw new BadRequestException(
        `Insufficient currency. Need ${config.baseCost.currency} P`,
      );
    }

    // Deduct currency
    await adminClient
      .from('profiles')
      .update({ currency: (profile.currency as number) - config.baseCost.currency })
      .eq('id', userId);

    // Create building
    const constructionEndsAt = new Date(
      Date.now() + config.constructionTime * 60 * 1000,
    ).toISOString();

    const { data: building, error } = await adminClient
      .from('buildings')
      .insert({
        farm_id: farmId,
        building_type: buildingType,
        level: 1,
        state: 'CONSTRUCTION',
        capacity: config.capacity,
        wear: 0,
        construction_started_at: new Date().toISOString(),
        construction_ends_at: constructionEndsAt,
        last_maintained_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !building) {
      throw new Error('Failed to create building');
    }

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      user_id: userId,
      entry_type: 'BUILD',
      item_type: buildingType,
      quantity: 1,
      currency_change: -config.baseCost.currency,
      description: `Built ${config.name}`,
    });

    return {
      id: (building as Record<string, unknown>).id as string,
      buildingType,
      state: 'CONSTRUCTION',
      constructionEndsAt,
    };
  }

  async upgradeBuilding(
    farmId: string,
    userId: string,
    buildingId: string,
  ): Promise<{ id: string; newLevel: number; state: string }> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const { data: building } = await adminClient
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .eq('farm_id', farmId)
      .single();

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const buildingRow = building as unknown as BuildingRow;
    const config = getBuildingConfig(buildingRow.building_type);
    if (!config) {
      throw new BadRequestException('Unknown building type');
    }

    if (buildingRow.level >= 3) {
      throw new BadRequestException('Building is already max level');
    }

    if (buildingRow.state !== 'ACTIVE') {
      throw new BadRequestException('Building must be active to upgrade');
    }

    const upgradeCost = config.upgradeCosts[buildingRow.level - 1];
    if (!upgradeCost) {
      throw new BadRequestException('No upgrade available');
    }

    // Check currency
    const { data: profile } = await adminClient
      .from('profiles')
      .select('currency')
      .eq('id', userId)
      .single();

    if (!profile || (profile.currency as number) < upgradeCost.currency) {
      throw new BadRequestException(
        `Insufficient currency. Need ${upgradeCost.currency} P`,
      );
    }

    // Deduct currency
    await adminClient
      .from('profiles')
      .update({ currency: (profile.currency as number) - upgradeCost.currency })
      .eq('id', userId);

    // Update building
    const upgradeTime = config.upgradeTimes[buildingRow.level - 1];
    const constructionEndsAt = new Date(
      Date.now() + upgradeTime * 60 * 1000,
    ).toISOString();

    await adminClient
      .from('buildings')
      .update({
        level: buildingRow.level + 1,
        state: 'CONSTRUCTION',
        construction_ends_at: constructionEndsAt,
      })
      .eq('id', buildingId);

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      user_id: userId,
      entry_type: 'UPGRADE',
      item_type: buildingRow.building_type,
      quantity: 1,
      currency_change: -upgradeCost.currency,
      description: `Upgraded ${config.name} to level ${buildingRow.level + 1}`,
    });

    return {
      id: buildingId,
      newLevel: buildingRow.level + 1,
      state: 'CONSTRUCTION',
    };
  }

  async maintainBuilding(
    farmId: string,
    userId: string,
    buildingId: string,
  ): Promise<{ id: string; state: string; wear: number }> {
    const adminClient = this.supabaseService.getAdminClient();

    await this.verifyFarmOwnership(farmId, userId);

    const { data: building } = await adminClient
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .eq('farm_id', farmId)
      .single();

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const buildingRow = building as unknown as BuildingRow;
    const config = getBuildingConfig(buildingRow.building_type);
    if (!config) {
      throw new BadRequestException('Unknown building type');
    }

    if (buildingRow.state !== 'MAINTENANCE_NEEDED' && buildingRow.state !== 'DISABLED') {
      throw new BadRequestException('Building does not need maintenance');
    }

    // Calculate maintenance cost
    const maintenanceCost =
      buildingRow.state === 'DISABLED'
        ? Math.floor(config.baseCost.currency * 0.5)
        : Math.floor(config.baseCost.currency * 0.25);

    // Check currency
    const { data: profile } = await adminClient
      .from('profiles')
      .select('currency')
      .eq('id', userId)
      .single();

    if (!profile || (profile.currency as number) < maintenanceCost) {
      throw new BadRequestException(
        `Insufficient currency. Need ${maintenanceCost} P`,
      );
    }

    // Deduct currency
    await adminClient
      .from('profiles')
      .update({ currency: (profile.currency as number) - maintenanceCost })
      .eq('id', userId);

    // Repair building
    await adminClient
      .from('buildings')
      .update({
        state: 'ACTIVE',
        wear: 0,
        last_maintained_at: new Date().toISOString(),
      })
      .eq('id', buildingId);

    // Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      user_id: userId,
      entry_type: 'MAINTENANCE',
      item_type: buildingRow.building_type,
      quantity: 1,
      currency_change: -maintenanceCost,
      description: `Maintained ${config.name}`,
    });

    return {
      id: buildingId,
      state: 'ACTIVE',
      wear: 0,
    };
  }

  async getAvailableBuildings(farmId: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    cost: { currency: number; wood?: number; stone?: number; iron?: number };
    constructionTime: number;
    capacity: number;
    owned: boolean;
  }>> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get farm level
    const { data: farm } = await adminClient
      .from('farms')
      .select('level')
      .eq('id', farmId)
      .single();

    const farmLevel = (farm?.level as number) || 1;

    // Get owned buildings
    const { data: ownedBuildings } = await adminClient
      .from('buildings')
      .select('building_type')
      .eq('farm_id', farmId);

    const ownedTypes = new Set(
      (ownedBuildings ?? []).map((b: Record<string, unknown>) => b.building_type as string),
    );

    // Return all available buildings with unlock status
    const { BUILDINGS } = await import('@molemisi/game-config');
    return Object.values(BUILDINGS)
      .filter((b) => b.unlockLevel <= farmLevel)
      .map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        cost: b.baseCost,
        constructionTime: b.constructionTime,
        capacity: b.capacity,
        owned: ownedTypes.has(b.id),
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
