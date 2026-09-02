import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

interface SellResult {
  transaction: {
    itemType: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  };
  currencyAdded: number;
  newCurrencyBalance: number;
}

interface BuyResult {
  transaction: {
    itemType: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  };
  currencyDeducted: number;
  newCurrencyBalance: number;
}

@Injectable()
export class MarketService {
  constructor(private supabaseService: SupabaseService) {}

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

    // 3. Get current market price
    const { data: priceData } = await adminClient
      .from('market_prices')
      .select('current_price')
      .eq('item_type', itemType)
      .single();

    const pricePerUnit = priceData?.current_price ?? 0;
    if (pricePerUnit <= 0) {
      throw new BadRequestException('Item has no market value');
    }

    const totalPrice = pricePerUnit * quality === 'excellent'
      ? pricePerUnit * 2 * quantity
      : quality === 'good'
        ? Math.round(pricePerUnit * 1.5) * quantity
        : quality === 'poor'
          ? Math.round(pricePerUnit * 0.5) * quantity
          : pricePerUnit * quantity;

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
      price_per_unit: pricePerUnit,
      total_price: totalPrice,
      quality,
    });

    return {
      transaction: {
        itemType,
        quantity,
        pricePerUnit,
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

    // 2. Get market price
    const { data: priceData } = await adminClient
      .from('market_prices')
      .select('current_price')
      .eq('item_type', itemType)
      .single();

    const pricePerUnit = priceData?.current_price ?? 0;
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

  async getPrices(): Promise<Array<{ itemType: string; currentPrice: number }>> {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: prices } = await adminClient
      .from('market_prices')
      .select('item_type, current_price');

    return (prices ?? []).map((p: Record<string, unknown>) => ({
      itemType: p.item_type as string,
      currentPrice: p.current_price as number,
    }));
  }
}
