import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export interface SellResult {
  transaction: {
    itemType: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  };
  currencyAdded: number;
  newCurrencyBalance: number;
}

export interface BuyResult {
  transaction: {
    itemType: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  };
  currencyDeducted: number;
  newCurrencyBalance: number;
}

export interface MarketPrice {
  itemType: string;
  basePrice: number;
  currentPrice: number;
  trend: 'up' | 'down' | 'stable';
  supply: number;
  demand: number;
}

export interface MarketEvent {
  id: string;
  name: string;
  description: string;
  effect: string;
  multiplier: number;
  endsAt: string;
}

@Injectable()
export class MarketService {
  constructor(private supabaseService: SupabaseService) {}

  // Price multiplier bounds
  private readonly MIN_PRICE_MULT = 0.5;
  private readonly MAX_PRICE_MULT = 2.0;
  private readonly SUPPLY_IMPACT = 0.002; // per unit sold
  private readonly DEMAND_IMPACT = 0.001; // per unit bought
  private readonly PRICE_DECAY = 0.02; // price moves toward base per update

  async sellItem(
    farmId: string,
    userId: string,
    itemType: string,
    quantity: number,
    quality: string = 'normal',
  ): Promise<SellResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // 1. Verify farm ownership
    const { data: farm } = await adminClient
      .from('farms')
      .select('user_id')
      .eq('id', farmId)
      .single();

    if (!farm || farm.user_id !== userId) {
      throw new NotFoundException('Farm not found');
    }

    // 2. Check inventory has the item
    const { data: item } = await adminClient
      .from('inventory')
      .select('*')
      .eq('farm_id', farmId)
      .eq('item_type', itemType)
      .eq('quality', quality)
      .single();

    if (!item || (item.quantity as number) < quantity) {
      throw new BadRequestException('Insufficient items in inventory');
    }

    // 3. Get dynamic market price
    const pricePerUnit = await this.getDynamicPrice(itemType);
    if (pricePerUnit <= 0) {
      throw new BadRequestException('Item has no market value');
    }

    // Apply quality multiplier
    const qualityMult = this.getQualityMultiplier(quality);
    const totalPrice = Math.round(pricePerUnit * qualityMult * quantity);

    const now = new Date().toISOString();

    // 4. Deduct from inventory
    const newQuantity = (item.quantity as number) - quantity;
    if (newQuantity <= 0) {
      await adminClient.from('inventory').delete().eq('id', item.id);
    } else {
      await adminClient
        .from('inventory')
        .update({ quantity: newQuantity, updated_at: now })
        .eq('id', item.id);
    }

    // 5. Add currency to profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('currency')
      .eq('id', userId)
      .single();

    const currentCurrency = (profile?.currency as number) ?? 0;
    const newCurrency = currentCurrency + totalPrice;

    await adminClient
      .from('profiles')
      .update({ currency: newCurrency, updated_at: now })
      .eq('id', userId);

    // 6. Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      farm_id: farmId,
      entry_type: 'CROP_SALE',
      currency_change: totalPrice,
      currency_balance_after: newCurrency,
      item_type: itemType,
      item_quantity_change: -quantity,
      item_quality: quality,
      description: `Sold ${quantity} ${itemType} for ${totalPrice} Pula`,
    });

    // 7. Record market transaction
    await adminClient.from('market_transactions').insert({
      farm_id: farmId,
      transaction_type: 'SELL',
      item_type: itemType,
      quantity,
      price_per_unit: Math.round(pricePerUnit * qualityMult),
      total_price: totalPrice,
      quality,
    });

    // 8. Update supply/demand (selling increases supply, lowers price)
    await this.updateSupplyDemand(itemType, quantity, 0);

    return {
      transaction: {
        itemType,
        quantity,
        pricePerUnit: Math.round(pricePerUnit * qualityMult),
        totalPrice,
      },
      currencyAdded: totalPrice,
      newCurrencyBalance: newCurrency,
    };
  }

  async buyItem(
    farmId: string,
    userId: string,
    itemType: string,
    quantity: number,
  ): Promise<BuyResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // 1. Verify farm ownership
    const { data: farm } = await adminClient
      .from('farms')
      .select('user_id')
      .eq('id', farmId)
      .single();

    if (!farm || farm.user_id !== userId) {
      throw new NotFoundException('Farm not found');
    }

    // 2. Get dynamic market price
    const pricePerUnit = await this.getDynamicPrice(itemType);
    if (pricePerUnit <= 0) {
      throw new BadRequestException('Item not available for purchase');
    }

    const totalPrice = pricePerUnit * quantity;

    // 3. Check currency
    const { data: profile } = await adminClient
      .from('profiles')
      .select('currency')
      .eq('id', userId)
      .single();

    const currentCurrency = (profile?.currency as number) ?? 0;
    if (currentCurrency < totalPrice) {
      throw new BadRequestException(
        `Insufficient funds. Required: ${totalPrice}, Available: ${currentCurrency}`,
      );
    }

    const now = new Date().toISOString();

    // 4. Deduct currency
    const newCurrency = currentCurrency - totalPrice;
    await adminClient
      .from('profiles')
      .update({ currency: newCurrency, updated_at: now })
      .eq('id', userId);

    // 5. Add to inventory (upsert)
    const category = itemType.includes('_seed') ? 'seed' : 'material';

    const { data: existingItem } = await adminClient
      .from('inventory')
      .select('*')
      .eq('farm_id', farmId)
      .eq('item_type', itemType)
      .eq('quality', 'normal')
      .single();

    if (existingItem) {
      await adminClient
        .from('inventory')
        .update({
          quantity: (existingItem.quantity as number) + quantity,
          updated_at: now,
        })
        .eq('id', existingItem.id);
    } else {
      await adminClient.from('inventory').insert({
        farm_id: farmId,
        item_type: itemType,
        item_category: category,
        quantity,
        quality: 'normal',
      });
    }

    // 6. Record ledger entry
    await adminClient.from('game_ledger_entries').insert({
      farm_id: farmId,
      entry_type: 'SEED_PURCHASE',
      currency_change: -totalPrice,
      currency_balance_after: newCurrency,
      item_type: itemType,
      item_quantity_change: quantity,
      description: `Bought ${quantity} ${itemType} for ${totalPrice} Pula`,
    });

    // 7. Record market transaction
    await adminClient.from('market_transactions').insert({
      farm_id: farmId,
      transaction_type: 'BUY',
      item_type: itemType,
      quantity,
      price_per_unit: pricePerUnit,
      total_price: totalPrice,
      quality: 'normal',
    });

    // 8. Update supply/demand (buying increases demand, raises price)
    await this.updateSupplyDemand(itemType, 0, quantity);

    return {
      transaction: {
        itemType,
        quantity,
        pricePerUnit,
        totalPrice,
      },
      currencyDeducted: totalPrice,
      newCurrencyBalance: newCurrency,
    };
  }

  async getPrices(): Promise<MarketPrice[]> {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: prices } = await adminClient.from('market_prices').select('*');

    if (!prices) return [];

    return await Promise.all(
      (prices ?? []).map(async (p: Record<string, unknown>) => {
        const itemType = p.item_type as string;
        const basePrice = p.base_price as number;
        const currentPrice = await this.getDynamicPrice(itemType);
        const supply = (p.supply as number) || 0;
        const demand = (p.demand as number) || 0;
        const trend =
          currentPrice > basePrice ? 'up' : currentPrice < basePrice ? 'down' : 'stable';

        return {
          itemType,
          basePrice,
          currentPrice,
          trend,
          supply,
          demand,
        };
      }),
    );
  }

  async getActiveEvents(): Promise<MarketEvent[]> {
    const adminClient = this.supabaseService.getAdminClient();

    const now = new Date().toISOString();

    const { data: events } = await adminClient.from('market_events').select('*').gt('ends_at', now);

    return (events ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      name: e.name as string,
      description: e.description as string,
      effect: e.effect as string,
      multiplier: e.multiplier as number,
      endsAt: e.ends_at as string,
    }));
  }

  /**
   * Calculate dynamic price based on supply/demand and active events.
   */
  private async getDynamicPrice(itemType: string): Promise<number> {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: priceData } = await adminClient
      .from('market_prices')
      .select('base_price, supply, demand')
      .eq('item_type', itemType)
      .single();

    if (!priceData) return 0;

    const basePrice = priceData.base_price as number;
    const supply = (priceData.supply as number) || 0;
    const demand = (priceData.demand as number) || 0;

    // Supply/demand modifier
    const supplyDemandRatio = supply > 0 ? demand / supply : 1;
    const supplyDemandModifier = Math.max(-0.3, Math.min(0.3, (supplyDemandRatio - 1) * 0.3));

    // Check for active market events
    const eventModifier = await this.getEventModifier(itemType);

    // Calculate final price
    const priceMultiplier = 1 + supplyDemandModifier + eventModifier;
    const finalPrice = Math.round(
      basePrice * Math.max(this.MIN_PRICE_MULT, Math.min(this.MAX_PRICE_MULT, priceMultiplier)),
    );

    return finalPrice;
  }

  /**
   * Get event-based price modifier for an item type.
   */
  private async getEventModifier(itemType: string): Promise<number> {
    const adminClient = this.supabaseService.getAdminClient();
    const now = new Date().toISOString();

    const { data: events } = await adminClient
      .from('market_events')
      .select('effect, multiplier')
      .gt('ends_at', now);

    if (!events || events.length === 0) return 0;

    let modifier = 0;
    for (const event of events) {
      const effect = event.effect as string;
      const multiplier = event.multiplier as number;

      // Check if this event affects this item type
      if (
        effect === 'all' ||
        (effect === 'grain' && ['sorghum', 'maize', 'millet'].includes(itemType)) ||
        (effect === 'food' && !itemType.includes('_seed')) ||
        (effect === 'materials' && ['wood', 'stone', 'iron'].includes(itemType)) ||
        effect === itemType
      ) {
        modifier += multiplier - 1;
      }
    }

    return modifier;
  }

  /**
   * Update supply/demand counters after a transaction.
   */
  private async updateSupplyDemand(
    itemType: string,
    supplyIncrease: number,
    demandIncrease: number,
  ): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get current values
    const { data: current } = await adminClient
      .from('market_prices')
      .select('supply, demand')
      .eq('item_type', itemType)
      .single();

    if (!current) return;

    const currentSupply = (current.supply as number) || 0;
    const currentDemand = (current.demand as number) || 0;

    // Update with decay (supply/demand naturally decay over time)
    const decayedSupply = Math.max(0, currentSupply * (1 - this.PRICE_DECAY) + supplyIncrease);
    const decayedDemand = Math.max(0, currentDemand * (1 - this.PRICE_DECAY) + demandIncrease);

    await adminClient
      .from('market_prices')
      .update({
        supply: Math.round(decayedSupply),
        demand: Math.round(decayedDemand),
      })
      .eq('item_type', itemType);
  }

  private getQualityMultiplier(quality: string): number {
    switch (quality) {
      case 'excellent':
        return 2.0;
      case 'good':
        return 1.5;
      case 'poor':
        return 0.5;
      default:
        return 1.0;
    }
  }
}
