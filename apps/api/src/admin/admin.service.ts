import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService } from '../wallet/wallet.service';
import { STARTING_PULA } from '@molemisi/game-config';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly wallet: WalletService,
  ) {}

  /**
   * The one place an admin action is written to the legacy `game_ledger_entries`
   * audit trail.
   *
   * A4 (security audit 2026-10-03) — all four admin writes were writing COLUMNS
   * THAT DO NOT EXIST. The live shape of `game_ledger_entries`
   * (20260902000000) is:
   *
   *   id, farm_id, entry_type, reference_type, reference_id,
   *   currency_change, currency_balance_after, item_type,
   *   item_quantity_change, item_quality, description, metadata, created_at
   *
   * The old code passed `player_id` and `amount_change`. Neither exists, so
   * PostgREST rejected every one of these INSERTs with PGRST204 ("Could not find
   * the column") and the moderation trail — ban, unban, warn, reset — was written
   * to nowhere. A player-support question ("was I banned and then unbanned?")
   * had no answer in the database at all.
   *
   * The subtle part, and the reason this is a helper rather than four inline
   * fixes: the table has NO player column. `farm_id` is NOT NULL and REFERENCES
   * `farms(id)`, so a player id cannot simply be swapped in — it has to be
   * RESOLVED to the player's farm first. Every call site below passes the
   * `farmId` it already has when it happens to be in scope, and falls back to
   * resolving it here, because a moderation action must still be auditable for a
   * player whose farm lookup is the only thing that failed.
   *
   * `currency_balance_after` is NOT NULL as well. None of these four actions
   * move Pula through the wallet (the reset's balance movement is already
   * ledgered by `wallet.resetPula`, which is the authoritative row), so 0 paired
   * with `currency_change: 0` is the honest pair: the column stays sum-able and
   * this row never double-counts a balance the wallet already recorded.
   *
   * Audit-logging is deliberately best-effort: a failed insert must NOT roll
   * back a ban that has already been applied. The error is logged loudly and the
   * action returns normally — losing the audit line is bad, silently un-banning
   * a cheater because the log was down is worse.
   */
  private async logAdminAction(
    playerId: string,
    entryType: string,
    description: string,
    knownFarmId?: string,
  ): Promise<void> {
    let farmId = knownFarmId;

    if (!farmId) {
      const { data: farm } = await this.supabase
        .getClient()
        .from('farms')
        .select('id')
        .eq('user_id', playerId)
        .maybeSingle();
      farmId = (farm as { id?: string } | null)?.id;
    }

    // A farm is REQUIRED by the FK. If the player genuinely has none there is
    // nothing to attach the row to, and inventing a farm id would corrupt the
    // trail more than omitting it does. Log loudly and move on.
    if (!farmId) {
      this.logger.error(
        `A4: cannot write ${entryType} audit row for player ${playerId} — no farm found`,
      );
      return;
    }

    const { error } = await this.supabase.getClient().from('game_ledger_entries').insert({
      farm_id: farmId,
      entry_type: entryType,
      reference_type: 'admin_action',
      currency_change: 0,
      currency_balance_after: 0,
      description,
      // The acting player is not the subject of the row, and there is no
      // column for it — the audit trail for admin actions is the Nest logger
      // (see the `logger.warn` calls below), which names the admin.
      metadata: { subject_player_id: playerId },
    });

    if (error) {
      this.logger.error(`A4: ${entryType} audit insert failed for ${playerId}: ${error.message}`);
    }
  }

  /**
   * Get player overview — profile, farm stats, recent activity.
   */
  async getPlayerOverview(playerId: string) {
    // A4 — the farm is resolved FIRST, on its own, for two reasons:
    //   1. `game_ledger_entries` is FARM-scoped (`farm_id` NOT NULL REFERENCES
    //      farms), and the old query filtered it by a `player_id` column that
    //      does not exist on either table. `select` fails with PGRST204 exactly
    //      as `insert` does, so this overview was quietly returning an empty
    //      activity list for every player.
    //   2. `farms` has `user_id`, not `player_id` — so the farm lookup itself
    //      was broken too, and the farm panel was always empty as well.
    // Sequencing the farm read first (rather than inside the Promise.all) is
    // what lets the ledger query be scoped by the id it actually needs; a
    // parallel fan-out cannot see a sibling's result.
    const { data: farmRow } = await this.supabase
      .getClient()
      .from('farms')
      .select('*')
      .eq('user_id', playerId)
      .maybeSingle();
    const farm = farmRow as Record<string, unknown> | null;
    const farmId = (farm?.id as string) ?? '';

    const [profile, payments, recentLedger] = await Promise.all([
      this.supabase.getClient().from('profiles').select('*').eq('id', playerId).single(),
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
        // A4 — the live columns. `amount_change` -> `currency_change`, and the
        // item columns are `item_type` / `item_quantity_change`.
        .select('farm_id, entry_type, currency_change, item_type, description, created_at')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return {
      profile: profile.data,
      farm,
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
      .select('id, display_name, currency, created_at')
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

    // A4 — `game_ledger_entries` is FARM-scoped; there is no player_id column,
    // so the old `.eq('player_id', playerId)` select could not have resolved.
    // The farm id comes from the same query the overview uses.
    const { data: farmRow } = await this.supabase
      .getClient()
      .from('farms')
      .select('id')
      .eq('user_id', playerId)
      .maybeSingle();
    const farmId = (farmRow as { id?: string } | null)?.id ?? '';

    // Get all ledger entries for this player, oldest first
    const { data: entries } = await this.supabase
      .getClient()
      .from('game_ledger_entries')
      .select('entry_type, currency_change, description, created_at')
      .eq('farm_id', farmId)
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
      // A4 — `amount_change` is not a column; the live name is
      // `currency_change`. It is declared NOT NULL, so it is always a number.
      const change = Number(e.currency_change ?? 0);
      const before = running - change;
      running = before;
      return {
        ...e,
        balance_before: before,
        balance_after: before + change,
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

    // Log to ledger (A4 — via the shared helper; see its comment for why these
    // rows cannot carry a player_id).
    await this.logAdminAction(playerId, 'ADMIN_BAN', `Banned by admin: ${reason}`);

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

    await this.logAdminAction(playerId, 'ADMIN_UNBAN', 'Player unbanned by admin');

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

    // Log to ledger (A4 — shared helper).
    await this.logAdminAction(playerId, 'ADMIN_WARNING', `Warning #${newCount}: ${message}`);

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
        plot_count: 4,
        weather_state: 'clear',
        season: 'spring',
        season_day: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', farmId);

    if (farmResetErr) throw new Error(`Farm reset failed: ${farmResetErr.message}`);

    // Reset the wallet through WalletService (C1/H5). `profiles.currency` is a
    // read-only MIRROR of player_wallets.pula_balance, so the old direct write was
    // rejected at runtime by trg_profiles_guard_currency — the reset would
    // half-apply. resetPula() moves the balance through wallet_apply, so the mirror
    // follows via its trigger and the change is ledgered.
    //
    // Value: STARTING_PULA (250), not the stale literal 100 that dated from the
    // initial schema's column default. "Reset to starting state" should mean the
    // same starting state a new player gets.
    await this.wallet.resetPula(playerId, STARTING_PULA);

    // Energy is not currency and has no mirror — it stays a direct profile write.
    await this.supabase
      .getClient()
      .from('profiles')
      .update({
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

    // Log to ledger (A4 — shared helper). `farmId` is already in scope here, so
    // no farm lookup is needed; and the Pula movement the reset performed is
    // deliberately NOT restated in this row: `wallet.resetPula` already wrote the
    // authoritative `ledger_entries` row, and echoing it here would double-count.
    await this.logAdminAction(
      playerId,
      'ADMIN_RESET',
      `Farm reset by admin${reason ? `: ${reason}` : ''}`,
      farmId,
    );

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
      // A4 — `player_id` / `amount_change` are not columns on this table.
      .select('farm_id, entry_type, reference_type, currency_change, description, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error(`Ledger query failed: ${error.message}`);
      return [];
    }

    return data || [];
  }
}
