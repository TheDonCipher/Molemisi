import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Get player overview — profile, farm stats, recent activity.
   */
  async getPlayerOverview(playerId: string) {
    const [profile, farm, payments, recentLedger] = await Promise.all([
      this.supabase.getClient().from('profiles').select('*').eq('id', playerId).single(),
      this.supabase.getClient().from('farms').select('*').eq('player_id', playerId).single(),
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
    const [totalPlayers, totalCurrency, recentPayments, totalCrops] = await Promise.all([
      this.supabase.getClient().from('profiles').select('id', { count: 'exact', head: true }),
      this.supabase.getClient().from('profiles').select('currency'),
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
      currencies.length > 0 ? currencies.reduce((a, b) => a + b, 0) / currencies.length : 0;
    const totalWealth = currencies.reduce((a, b) => a + b, 0);

    return {
      totalPlayers: totalPlayers.count || 0,
      totalCurrencyInCirculation: totalWealth,
      averagePlayerWealth: Math.round(avgCurrency),
      totalCompletedPayments: (recentPayments.data || []).length,
      totalRevenue: (recentPayments.data || []).reduce((sum, p) => sum + (p.amount || 0), 0) / 100,
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
   * Get player currency history from ledger entries.
   * Returns chronological entries with running balance for charting.
   */
  async getPlayerCurrencyHistory(playerId: string, limit = 200) {
    // Get the player's current currency
    const { data: profile } = await this.supabase
      .getClient()
      .from('profiles')
      .select('currency')
      .eq('id', playerId)
      .single();

    // Get all ledger entries for this player, oldest first
    const { data: entries } = await this.supabase
      .getClient()
      .from('game_ledger_entries')
      .select('entry_type, amount_change, description, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (!entries || entries.length === 0) {
      return { currentBalance: profile?.currency || 0, entries: [] };
    }

    // Calculate running balance from the end
    // We know the current balance. Walk backwards to compute historical balances.
    const currentBalance = profile?.currency || 0;
    let running = currentBalance;
    const withBalance = entries.reverse().map((e) => {
      const before = running - e.amount_change;
      running = before;
      return {
        ...e,
        balance_before: before,
        balance_after: before + e.amount_change,
      };
    });

    // Return oldest-first for charting
    return {
      currentBalance,
      entries: withBalance.reverse(),
    };
  }

  /**
   * Ban a player. Sets is_banned=true and logs the action.
   */
  async banPlayer(playerId: string, reason: string) {
    // Verify player exists
    const { data: profile, error: fetchErr } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id, display_name, is_banned')
      .eq('id', playerId)
      .single();

    if (fetchErr || !profile) {
      throw new Error(`Player ${playerId} not found`);
    }
    if (profile.is_banned) {
      throw new Error(`Player ${profile.display_name} is already banned`);
    }

    // Ban the player
    const { error } = await this.supabase
      .getClient()
      .from('profiles')
      .update({
        is_banned: true,
        ban_reason: reason,
        banned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', playerId);

    if (error) throw new Error(`Ban failed: ${error.message}`);

    // Log to ledger
    await this.supabase
      .getClient()
      .from('game_ledger_entries')
      .insert({
        player_id: playerId,
        entry_type: 'ADMIN_BAN',
        amount_change: 0,
        description: `Banned by admin: ${reason}`,
        reference_type: 'admin_action',
      });

    // Send notification to player
    await this.notifications.notifyBan(playerId, reason);

    this.logger.warn(`Admin banned player ${profile.display_name}: ${reason}`);
    return { success: true, player: profile.display_name, action: 'banned' };
  }

  /**
   * Unban a player.
   */
  async unbanPlayer(playerId: string) {
    const { error } = await this.supabase
      .getClient()
      .from('profiles')
      .update({
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', playerId);

    if (error) throw new Error(`Unban failed: ${error.message}`);

    await this.supabase.getClient().from('game_ledger_entries').insert({
      player_id: playerId,
      entry_type: 'ADMIN_UNBAN',
      amount_change: 0,
      description: 'Player unbanned by admin',
      reference_type: 'admin_action',
    });

    return { success: true, action: 'unbanned' };
  }

  /**
   * Send a warning to a player. Increments warning_count.
   */
  async warnPlayer(playerId: string, message: string) {
    const { data: profile, error: fetchErr } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id, display_name, warning_count')
      .eq('id', playerId)
      .single();

    if (fetchErr || !profile) {
      throw new Error(`Player ${playerId} not found`);
    }

    const newCount = (profile.warning_count || 0) + 1;
    const { error } = await this.supabase
      .getClient()
      .from('profiles')
      .update({
        warning_count: newCount,
        last_warning_at: new Date().toISOString(),
        last_warning_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', playerId);

    if (error) throw new Error(`Warning failed: ${error.message}`);

    // Log to ledger
    await this.supabase
      .getClient()
      .from('game_ledger_entries')
      .insert({
        player_id: playerId,
        entry_type: 'ADMIN_WARNING',
        amount_change: 0,
        description: `Warning #${newCount}: ${message}`,
        reference_type: 'admin_action',
      });

    // Send notification to player
    await this.notifications.notifyWarning(playerId, message, newCount);

    this.logger.warn(`Admin warned player ${profile.display_name} (#${newCount}): ${message}`);
    return {
      success: true,
      player: profile.display_name,
      warningCount: newCount,
      message,
    };
  }

  /**
   * Reset a player's farm to starting state.
   * Deletes crops, livestock, buildings, inventory, and resets farm values.
   */
  async resetFarm(playerId: string, reason?: string) {
    // Get farm
    const { data: farm, error: farmErr } = await this.supabase
      .getClient()
      .from('farms')
      .select('id, name')
      .eq('user_id', playerId)
      .single();

    if (farmErr || !farm) {
      throw new Error(`Farm for player ${playerId} not found`);
    }

    const farmId = farm.id;

    // Delete all farm data (CASCADE handles plots → crops)
    const deleteResults = await Promise.allSettled([
      this.supabase.getClient().from('crop_instances').delete().eq('farm_id', farmId),
      this.supabase.getClient().from('livestock').delete().eq('farm_id', farmId),
      this.supabase.getClient().from('buildings').delete().eq('farm_id', farmId),
      this.supabase.getClient().from('inventory').delete().eq('farm_id', farmId),
      this.supabase.getClient().from('farm_plots').delete().eq('farm_id', farmId),
    ]);

    const failures = deleteResults.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error(`Farm reset partial failure: ${failures.length} tables failed`);
    }

    // Reset farm to defaults
    const { error: farmResetErr } = await this.supabase
      .getClient()
      .from('farms')
      .update({
        level: 1,
        xp: 0,
        plot_count: 4,
        weather_state: 'clear',
        season: 'spring',
        season_day: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', farmId);

    if (farmResetErr) throw new Error(`Farm reset failed: ${farmResetErr.message}`);

    // Reset profile currency and XP
    await this.supabase
      .getClient()
      .from('profiles')
      .update({
        currency: 100,
        farm_xp: 0,
        farm_level: 1,
        energy: 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', playerId);

    // Recreate starting plots
    const plots = Array.from({ length: 4 }, (_, i) => ({
      farm_id: farmId,
      slot_index: i,
      state: 'EMPTY',
    }));
    await this.supabase.getClient().from('farm_plots').insert(plots);

    // Log to ledger
    await this.supabase
      .getClient()
      .from('game_ledger_entries')
      .insert({
        player_id: playerId,
        entry_type: 'ADMIN_RESET',
        amount_change: 0,
        description: `Farm reset by admin${reason ? `: ${reason}` : ''}`,
        reference_type: 'admin_action',
      });

    // Send notification to player
    await this.notifications.notifyFarmReset(playerId, reason);

    this.logger.warn(`Admin reset farm for ${farm.name} (player ${playerId})`);
    return {
      success: true,
      farmName: farm.name,
      action: 'reset',
      deletedTables: ['crop_instances', 'livestock', 'buildings', 'inventory', 'farm_plots'],
    };
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
