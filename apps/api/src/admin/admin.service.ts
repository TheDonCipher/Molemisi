import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Get player overview — profile, farm stats, recent activity.
   */
  async getPlayerOverview(playerId: string) {
    const [profile, farm, payments, recentLedger] = await Promise.all([
      this.supabase
        .getClient()
        .from('profiles')
        .select('*')
        .eq('id', playerId)
        .single(),
      this.supabase
        .getClient()
        .from('farms')
        .select('*')
        .eq('player_id', playerId)
        .single(),
      this.supabase
        .getClient()
        .from('payments')
        .select('status, amount, sku, created_at')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(10),
      this.supabase
        .getClient()
        .from('game_ledger_entries')
        .select('entry_type, amount_change, description, created_at')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return {
      profile: profile.data,
      farm: farm.data,
      recentPayments: payments.data || [],
      recentActivity: recentLedger.data || [],
    };
  }

  /**
   * Get economy overview — total currency, items, transactions.
   */
  async getEconomyOverview() {
    const [totalPlayers, totalCurrency, recentPayments, totalCrops] =
      await Promise.all([
        this.supabase
          .getClient()
          .from('profiles')
          .select('id', { count: 'exact', head: true }),
        this.supabase
          .getClient()
          .from('profiles')
          .select('currency'),
        this.supabase
          .getClient()
          .from('payments')
          .select('status, amount, created_at')
          .eq('status', 'COMPLETED')
          .order('created_at', { ascending: false })
          .limit(50),
        this.supabase
          .getClient()
          .from('crop_instances')
          .select('state', { count: 'exact', head: true }),
      ]);

    const currencies = (totalCurrency.data || []).map((p) => p.currency);
    const avgCurrency =
      currencies.length > 0
        ? currencies.reduce((a, b) => a + b, 0) / currencies.length
        : 0;
    const totalWealth = currencies.reduce((a, b) => a + b, 0);

    return {
      totalPlayers: totalPlayers.count || 0,
      totalCurrencyInCirculation: totalWealth,
      averagePlayerWealth: Math.round(avgCurrency),
      totalCompletedPayments: (recentPayments.data || []).length,
      totalRevenue:
        (recentPayments.data || []).reduce((sum, p) => sum + (p.amount || 0), 0) /
        100,
      activeCrops: totalCrops.count || 0,
    };
  }

  /**
   * Search players by display name or email.
   */
  async searchPlayers(query: string, limit = 20) {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id, display_name, currency, farm_level, created_at')
      .or(`display_name.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      this.logger.error(`Player search failed: ${error.message}`);
      return [];
    }

    return data || [];
  }

  /**
   * Get recent game ledger entries for economy monitoring.
   */
  async getRecentLedger(limit = 100) {
    const { data, error } = await this.supabase
      .getClient()
      .from('game_ledger_entries')
      .select('player_id, entry_type, reference_type, amount_change, description, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error(`Ledger query failed: ${error.message}`);
      return [];
    }

    return data || [];
  }
}
