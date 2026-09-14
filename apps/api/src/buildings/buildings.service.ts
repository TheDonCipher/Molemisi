import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { InventoryService } from '../inventory/inventory.service';
import { getBuildingConfig } from '@molemisi/game-config';

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

/** One stack of crafted material a maintenance cycle consumes (03 §3.5). */
export interface MaterialNeed {
  slug: string;
  qty: number;
}

@Injectable()
export class BuildingsService {
  constructor(
    private supabaseService: SupabaseService,
    private wallet: WalletService,
    private inventory: InventoryService,
  ) {}

  async listBuildings(farmId: string): Promise<
    Array<{
      id: string;
      buildingType: string;
      level: number;
      state: string;
      capacity: number;
      wear: number;
      constructionEndsAt: string | null;
    }>
  > {
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

    // Spend through the wallet — the only sanctioned way to move Pula (05 §P2).
    // This checks the balance and writes the ledger row in one atomic call, so
    // there is no window where two concurrent builds both pass an affordability
    // check that only one of them can actually satisfy.
    const cost = config.baseCost.currency;
    await this.wallet.spendPula(userId, cost, 'building_construction');

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
      // The debit has already happened. Money must never be wrong, so give it
      // back rather than charge for a building that does not exist. The ledger
      // keeps both rows, which is what we want: it shows the attempt.
      await this.wallet.credit(userId, 'pula', cost, 'refund');
      throw new Error('Failed to create building');
    }

    // Ledger row is written by wallet_apply(); game_ledger_entries is retired.

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

    // Spend through the wallet (05 §P2). Atomic check-and-debit.
    const upgradeCostPula = upgradeCost.currency;
    await this.wallet.spendPula(userId, upgradeCostPula, 'storage_upgrade');

    // Update building
    const upgradeTime = config.upgradeTimes[buildingRow.level - 1] ?? 0;
    const constructionEndsAt = new Date(Date.now() + upgradeTime * 60 * 1000).toISOString();

    await adminClient
      .from('buildings')
      .update({
        level: buildingRow.level + 1,
        state: 'CONSTRUCTION',
        construction_ends_at: constructionEndsAt,
      })
      .eq('id', buildingId);

    // Ledger row is written by wallet_apply().

    return {
      id: buildingId,
      newLevel: buildingRow.level + 1,
      state: 'CONSTRUCTION',
    };
  }

  /**
   * What one maintenance cycle costs in Pula and in crafted material.
   *
   * Pula comes from `maintenanceCost` in config — the authoritative economic
   * number (02 §6) — with `maintenanceMaterials.currency` added on top, and
   * doubled for a building allowed to rot all the way into DISABLED.
   *
   * The materials are the whole point of the system (03 §3.5): Poleto, Thapo
   * and Setena exist mainly as building inputs, and without a recurring sink
   * they are dead content within weeks.
   */
  private maintenanceQuote(
    config: NonNullable<ReturnType<typeof getBuildingConfig>>,
    state: string,
  ): { pula: number; needs: MaterialNeed[] } {
    // Cast so `currency` and the material slugs read uniformly: BuildCost is a
    // fixed-shape type, but maintenanceMaterials is open-ended by design.
    const materials = (config.maintenanceMaterials ?? {}) as Record<string, number | undefined>;
    const needs: MaterialNeed[] = Object.entries(materials)
      .filter(([slug, qty]) => slug !== 'currency' && typeof qty === 'number' && qty > 0)
      .map(([slug, qty]) => ({ slug, qty: qty as number }));

    const base =
      (config.maintenanceCost ?? Math.floor(config.baseCost.currency * 0.25)) +
      (materials.currency ?? 0);
    const pula = state === 'DISABLED' ? base * 2 : base;

    return { pula, needs };
  }

  /**
   * Consume crafted materials all-or-nothing. If the third stack cannot be
   * removed we put the first two back — a half-charged maintenance is worse
   * than a refused one (03 §3.4: never a partial loss).
   */
  private async consumeMaterials(
    playerId: string,
    farmId: string,
    needs: MaterialNeed[],
  ): Promise<void> {
    const taken: MaterialNeed[] = [];
    try {
      for (const need of needs) {
        await this.inventory.removeItem(playerId, need.slug, need.qty);
        taken.push(need);
      }
    } catch (err) {
      for (const need of taken) {
        await this.inventory.addItem(playerId, farmId, need.slug, need.qty);
      }
      throw err;
    }
  }

  async maintainBuilding(
    farmId: string,
    userId: string,
    buildingId: string,
  ): Promise<{
    id: string;
    state: string;
    wear: number;
    pulaSpent: number;
    materialsConsumed: MaterialNeed[];
  }> {
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

    const { pula, needs } = this.maintenanceQuote(config, buildingRow.state);

    // Check the crafted materials *before* a single thebe moves. Maintenance is
    // meant to be a crafting demand, not a Pula tax, so a player who is short
    // of Setena gets told to go and make some — not charged and then shrugged at.
    let playerId: string | null = null;
    if (needs.length > 0) {
      playerId = await this.inventory.resolvePlayerId(farmId);
      const has = await this.inventory.hasItems(playerId, needs);
      if (!has) {
        const missing = needs.map((n) => `${n.qty} × ${n.slug}`).join(', ');
        throw new BadRequestException(
          `Maintenance needs ${missing} — craft them before repairing`,
        );
      }
    }

    // Spend through the wallet (05 §P2). Atomic check-and-debit.
    await this.wallet.spendPula(userId, pula, 'building_maintenance');

    // Then consume the materials. If the inventory write fails we hand the Pula
    // back rather than charge for a repair that never happened.
    if (playerId && needs.length > 0) {
      try {
        await this.consumeMaterials(playerId, farmId, needs);
      } catch (err) {
        await this.wallet.credit(userId, 'pula', pula, 'refund');
        throw err;
      }
    }

    // Repair building
    await adminClient
      .from('buildings')
      .update({
        state: 'ACTIVE',
        wear: 0,
        last_maintained_at: new Date().toISOString(),
      })
      .eq('id', buildingId);

    // Ledger row is written by wallet_apply().

    return {
      id: buildingId,
      state: 'ACTIVE',
      wear: 0,
      pulaSpent: pula,
      materialsConsumed: needs,
    };
  }

  async getAvailableBuildings(farmId: string): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      cost: { currency: number; wood?: number; stone?: number; iron?: number };
      constructionTime: number;
      capacity: number;
      owned: boolean;
    }>
  > {
    const adminClient = this.supabaseService.getAdminClient();

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

  /**
   * P3 storage upgrade — `POST /farms/:farmId/storage/upgrade`. Locates the
   * Storage building and promotes it one tier, which raises the enforced slot cap
   * (Basket 24 → Shed 48 → Storehouse 96; +50% for Guild, vanishing on lapse).
   * Reuses the same spend-then-upgrade logic as a normal building upgrade.
   */
  async upgradeStorage(
    farmId: string,
    userId: string,
  ): Promise<{ id: string; newLevel: number; state: string }> {
    const adminClient = this.supabaseService.getAdminClient();
    await this.verifyFarmOwnership(farmId, userId);

    const { data: building } = await adminClient
      .from('buildings')
      .select('*')
      .eq('farm_id', farmId)
      .eq('building_type', 'storage')
      .single();

    if (!building) {
      throw new BadRequestException('No Storage building — construct one before upgrading');
    }

    return this.applyUpgrade(building as unknown as BuildingRow, userId);
  }

  private async applyUpgrade(buildingRow: BuildingRow, userId: string): Promise<{ id: string; newLevel: number; state: string }> {
    const adminClient = this.supabaseService.getAdminClient();
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

    const upgradeCostPula = upgradeCost.currency;
    await this.wallet.spendPula(userId, upgradeCostPula, 'storage_upgrade');

    const upgradeTime = config.upgradeTimes[buildingRow.level - 1] ?? 0;
    const constructionEndsAt = new Date(Date.now() + upgradeTime * 60 * 1000).toISOString();

    await adminClient
      .from('buildings')
      .update({
        level: buildingRow.level + 1,
        state: 'CONSTRUCTION',
        construction_ends_at: constructionEndsAt,
      })
      .eq('id', buildingRow.id);

    return { id: buildingRow.id, newLevel: buildingRow.level + 1, state: 'CONSTRUCTION' };
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
