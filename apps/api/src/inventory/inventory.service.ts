import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { getItemDef, intentGroup, type IntentGroup } from '@molemisi/game-config';

export interface InventoryItemView {
  slug: string;
  setswana: string;
  name: string;
  category: string;
  quantity: number;
  maxStack: number;
  baseValue: number;
  use: string;
  isTool: boolean;
  sprite: string;
  intent: IntentGroup;
}

export interface AddResult {
  added: number;
  /** Quantity that could not be stored (stack full, or slot full → 0 added). */
  overflow: number;
}

/**
 * The single canonical writer for `player_inventory` (P3 / 05 §P3). Every good in
 * the game — harvested crops, bought seeds, crafted output, bushveld materials —
 * eventually lands here. Reads and writes go through this service so the stack cap
 * and the storage slot cap are enforced in exactly one place.
 *
 * A "slot" is one distinct item type. The tier (Basket/Shed/Storehouse) sets how
 * many distinct types a player may hold at once; Guild +50% raises that number and
 * vanishes when the subscription lapses (R7/C8). Tools are equipment (F15) and do
 * NOT consume a slot.
 */
@Injectable()
export class InventoryService {
  constructor(
    private supabaseService: SupabaseService,
    private wallet: WalletService,
  ) {}

  private client() {
    return this.supabaseService.getAdminClient();
  }

  /** farm_id → player_id (auth.users). One farm per player. */
  async resolvePlayerId(farmId: string): Promise<string> {
    const { data, error } = await this.client()
      .from('farms')
      .select('user_id')
      .eq('id', farmId)
      .single();
    if (error || !data) throw new NotFoundException('Farm not found');
    return data.user_id as string;
  }

  async getInventory(
    playerId: string,
    farmId: string,
  ): Promise<{ items: InventoryItemView[]; usedSlots: number; slotCap: number }> {
    const { data, error } = await this.client()
      .from('player_inventory')
      .select(
        'quantity, item_definitions(slug, setswana, name, category, max_stack, base_value_pula, use_text, is_tool, sprite)',
      )
      .eq('player_id', playerId);

    if (error) throw new Error('Failed to fetch inventory');

    const items: InventoryItemView[] = (data ?? []).map((row: Record<string, unknown>) => {
      const d = row.item_definitions as Record<string, unknown>;
      const def = getItemDef(d.slug as string);
      return {
        slug: d.slug as string,
        setswana: d.setswana as string,
        name: d.name as string,
        category: d.category as string,
        quantity: row.quantity as number,
        maxStack: d.max_stack as number,
        baseValue: d.base_value_pula as number,
        use: (d.use_text as string) ?? '',
        isTool: d.is_tool as boolean,
        sprite: d.sprite as string,
        intent: intentGroup({ isTool: d.is_tool as boolean, category: d.category as never } as never),
      };
    });

    const usedSlots = items.filter((i) => !i.isTool).length;
    const slotCap = await this.getStorageCap(farmId);
    return { items, usedSlots, slotCap };
  }

  /** Effective slot cap from the storage building tier + Guild bonus (R7/C8). */
  async getStorageCap(farmId: string): Promise<number> {
    const admin = this.client();
    const { data: building } = await admin
      .from('buildings')
      .select('level')
      .eq('farm_id', farmId)
      .eq('building_type', 'storage')
      .single();

    // No storage building yet → tier 1 (Basket, 24 slots).
    const tier = (building?.level as number) || 1;

    const { data: walletRow } = await admin
      .from('player_wallets')
      .select('subscription_status')
      .eq('player_id', (
        await admin.from('farms').select('user_id').eq('id', farmId).single()
      ).data?.user_id)
      .single();

    const isGuild = (walletRow?.subscription_status as string) === 'guild';

    // 02 §6.5 tiers + R7 Guild +50%.
    const cap = [24, 48, 96][Math.min(tier, 3) - 1] ?? 24;
    return Math.floor(cap * (isGuild ? 1.5 : 1));
  }

  /** Count distinct non-tool item types currently held (the slots in use). */
  async getUsedSlots(playerId: string): Promise<number> {
    const { data, error } = await this.client()
      .from('player_inventory')
      .select('item_definitions!inner(is_tool)')
      .eq('player_id', playerId);
    if (error) return 0;
    return (data ?? []).filter(
      (r: Record<string, unknown>) => !(r.item_definitions as { is_tool: boolean }).is_tool,
    ).length;
  }

  /**
   * Add items, enforcing the stack cap (per type) and the storage slot cap
   * (distinct types). Tools are exempt from the slot cap. Returns what actually
   * fit; the caller surfaces `overflow` to the player rather than silently
   * dropping it (03 §2 — "explain overflow in words").
   */
  async addItem(
    playerId: string,
    farmId: string,
    slug: string,
    qty: number,
  ): Promise<AddResult> {
    if (qty <= 0) return { added: 0, overflow: 0 };
    const def = getItemDef(slug);
    if (!def) throw new BadRequestException(`Unknown item: ${slug}`);

    const itemDefId = await this.itemDefId(slug);

    // Tools: own once, never a slot, never stack.
    if (def.isTool) {
      await this.client()
        .from('player_inventory')
        .upsert(
          { player_id: playerId, item_def_id: itemDefId, quantity: 1, updated_at: new Date().toISOString() },
          { onConflict: 'player_id,item_def_id' },
        );
      return { added: 1, overflow: 0 };
    }

    const { data: existing } = await this.client()
      .from('player_inventory')
      .select('id, quantity')
      .eq('player_id', playerId)
      .eq('item_def_id', itemDefId)
      .single();

    const have = (existing?.quantity as number) ?? 0;
    const spaceInStack = def.maxStack - have;
    const toAdd = Math.min(qty, Math.max(0, spaceInStack));

    if (toAdd <= 0) {
      // Stack already full — nothing fits.
      return { added: 0, overflow: qty };
    }

    // A brand-new item type consumes a slot; reject if the cap is reached.
    if (!existing) {
      const used = await this.getUsedSlots(playerId);
      const cap = await this.getStorageCap(farmId);
      if (used >= cap) {
        throw new BadRequestException('Storage is full — upgrade your storage or free a slot.');
      }
    }

    if (existing) {
      await this.client()
        .from('player_inventory')
        .update({ quantity: have + toAdd, updated_at: new Date().toISOString() })
        .eq('id', existing.id as string);
    } else {
      await this.client()
        .from('player_inventory')
        .insert({
          player_id: playerId,
          item_def_id: itemDefId,
          quantity: toAdd,
          updated_at: new Date().toISOString(),
        });
    }

    return { added: toAdd, overflow: qty - toAdd };
  }

  /** Remove items; throws if the player does not hold enough. */
  async removeItem(playerId: string, slug: string, qty: number): Promise<void> {
    const itemDefId = await this.itemDefId(slug);
    const { data: existing } = await this.client()
      .from('player_inventory')
      .select('id, quantity')
      .eq('player_id', playerId)
      .eq('item_def_id', itemDefId)
      .single();

    const have = (existing?.quantity as number) ?? 0;
    if (!existing || have < qty) {
      throw new BadRequestException(`Not enough ${slug} (have ${have}, need ${qty})`);
    }

    const remaining = have - qty;
    if (remaining <= 0) {
      await this.client().from('player_inventory').delete().eq('id', existing.id as string);
    } else {
      await this.client()
        .from('player_inventory')
        .update({ quantity: remaining, updated_at: new Date().toISOString() })
        .eq('id', existing.id as string);
    }
  }

  async countOwned(playerId: string, slug: string): Promise<number> {
    const itemDefId = await this.itemDefId(slug);
    const { data } = await this.client()
      .from('player_inventory')
      .select('quantity')
      .eq('player_id', playerId)
      .eq('item_def_id', itemDefId)
      .single();
    return (data?.quantity as number) ?? 0;
  }

  /** slug → quantity for every held item (used by crafting's substitution UI). */
  async ownedMap(playerId: string): Promise<Record<string, number>> {
    const { data } = await this.client()
      .from('player_inventory')
      .select('quantity, item_definitions!inner(slug)')
      .eq('player_id', playerId);
    const out: Record<string, number> = {};
    for (const row of data ?? []) {
      const d = (row as Record<string, unknown>).item_definitions as Record<string, unknown>;
      out[d.slug as string] = (row as Record<string, unknown>).quantity as number;
    }
    return out;
  }

  /** True only if the player holds at least `qty` of every requirement. */
  async hasItems(playerId: string, requirements: { slug: string; qty: number }[]): Promise<boolean> {
    for (const r of requirements) {
      if ((await this.countOwned(playerId, r.slug)) < r.qty) return false;
    }
    return true;
  }

  private async itemDefId(slug: string): Promise<string> {
    const { data, error } = await this.client()
      .from('item_definitions')
      .select('id')
      .eq('slug', slug)
      .single();
    if (error || !data) throw new BadRequestException(`Unknown item: ${slug}`);
    return data.id as string;
  }
}
