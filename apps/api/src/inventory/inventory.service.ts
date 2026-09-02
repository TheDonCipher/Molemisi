import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export interface InventoryItem {
  id: string;
  itemType: string;
  itemCategory: string;
  quantity: number;
  quality: string;
}

@Injectable()
export class InventoryService {
  constructor(private supabaseService: SupabaseService) {}

  async getInventory(farmId: string): Promise<InventoryItem[]> {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: items, error } = await adminClient
      .from('inventory')
      .select('*')
      .eq('farm_id', farmId)
      .gt('quantity', 0)
      .order('item_category')
      .order('item_type');

    if (error) {
      throw new Error('Failed to fetch inventory');
    }

    return (items ?? []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      itemType: item.item_type as string,
      itemCategory: item.item_category as string,
      quantity: item.quantity as number,
      quality: item.quality as string,
    }));
  }
}
