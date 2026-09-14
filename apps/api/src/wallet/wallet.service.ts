import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { BOTHO_DAILY_CAP } from '@molemisi/game-config';

/**
 * The single sanctioned way to move a balance (05 §P2).
 *
 * THREE INVARIANTS, and the reason each exists:
 *
 *  1. No method on this class accepts two distinct player IDs.
 *     Not "doesn't currently use two" — cannot. It is enforced by the signature of
 *     every public method. v1 ships closed-loop (D12), so there is no legitimate
 *     player-to-player transfer to build. When v1.1 adds the Madi market, it gets
 *     its own explicitly-named method with its own audit trail, added deliberately
 *     rather than emerging from a general-purpose `transfer(a, b, n)`.
 *
 *  2. Every movement writes a ledger row in the same transaction.
 *     Done in Postgres by `wallet_apply()`, not here, so a balance cannot move
 *     without a record of why even if this process dies mid-call.
 *
 *  3. Nothing else in the codebase may touch `player_wallets`.
 *     If you are reaching around this service, the correct fix is to add a `source`
 *     here, not to write the column directly.
 */
export type WalletCurrency = 'pula' | 'botho';

/** Every reason a balance can move. Adding one is a deliberate act. */
export type LedgerSource =
  | 'signup_grant'
  | 'coop_sale'
  | 'seed_purchase'
  | 'craft_fee'
  | 'crafting_fee'
  | 'water_refill'
  | 'land_purchase'
  | 'storage_upgrade'
  | 'building_construction'
  | 'building_maintenance'
  | 'topup'
  | 'guild_subscription'
  | 'boost_purchase'
  | 'cosmetic_purchase'
  | 'letsema_contribution'
  | 'quest_reward'
  | 'bushveld_forage'
  | 'almanac'
  | 'chapter_spend'
  | 'admin_adjustment'
  | 'refund';

export interface WalletSnapshot {
  pula_balance: number;
  botho_points: number;
  subscription_status: 'free' | 'guild';
  subscription_expires_at: string | null;
}

@Injectable()
export class WalletService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Read a wallet, creating it if this is the player's first touch.
   * Never throws on "not found" — a wallet always exists once a profile does.
   */
  async getWallet(playerId: string): Promise<WalletSnapshot> {
    const admin = this.supabase.getAdminClient();

    const { data, error } = await admin
      .from('player_wallets')
      .select(
        'pula_balance, botho_points, subscription_status, subscription_expires_at',
      )
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) throw new Error(`Failed to read wallet: ${error.message}`);
    if (data) return data as WalletSnapshot;

    // Race: profile created before the seed trigger ran, or the trigger is absent
    // on an older database. Creating on read keeps callers simple.
    const { data: created, error: createError } = await admin
      .from('player_wallets')
      .insert({ player_id: playerId })
      .select(
        'pula_balance, botho_points, subscription_status, subscription_expires_at',
      )
      .single();

    if (createError) throw new Error(`Failed to create wallet: ${createError.message}`);
    return created as WalletSnapshot;
  }

  async getPula(playerId: string): Promise<number> {
    return (await this.getWallet(playerId)).pula_balance;
  }

  async getBotho(playerId: string): Promise<number> {
    return (await this.getWallet(playerId)).botho_points;
  }

  /**
   * Add to a balance. `amount` must be positive — callers express direction with
   * the method name, not with a signed number. A negative "credit" is always a bug
   * and is better rejected here than reconciled later.
   */
  async credit(
    playerId: string,
    currency: WalletCurrency,
    amount: number,
    source: LedgerSource,
    refId?: string,
  ): Promise<number> {
    if (!(amount > 0)) {
      throw new BadRequestException(`credit requires a positive amount (got ${amount})`);
    }
    return this.apply(playerId, currency, amount, source, refId);
  }

  /** Subtract from a balance. `amount` must be positive. */
  async debit(
    playerId: string,
    currency: WalletCurrency,
    amount: number,
    source: LedgerSource,
    refId?: string,
  ): Promise<number> {
    if (!(amount > 0)) {
      throw new BadRequestException(`debit requires a positive amount (got ${amount})`);
    }
    return this.apply(playerId, currency, -amount, source, refId);
  }

  /** True when the player can afford `amount` Pula. */
  async canAffordPula(playerId: string, amount: number): Promise<boolean> {
    return (await this.getPula(playerId)) >= amount;
  }

  /**
   * Spend Pula, or throw. Use this rather than check-then-debit: doing both in one
   * round trip is what stops two concurrent purchases from both passing the check.
   *
   * `amount` must be a finite number greater than zero. This guard is load-bearing,
   * not decorative: the amount is negated into `apply()` below, so a negative input
   * would arrive at `wallet_apply` as a POSITIVE delta and quietly mint Pula.
   * `wallet_apply` only rejects a negative resulting *balance*, so it cannot catch
   * this — an unvalidated amount reaching `spendPula` is a currency-printing bug.
   */
  async spendPula(
    playerId: string,
    amount: number,
    source: LedgerSource,
    refId?: string,
  ): Promise<number> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        `spendPula requires a positive, finite amount (got ${amount})`,
      );
    }
    const balance = await this.apply(playerId, 'pula', -amount, source, refId);
    return balance;
  }

  /** Recent ledger rows, newest first. Feeds the player's own transaction view. */
  async recentEntries(playerId: string, limit = 50) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('ledger_entries')
      .select('id, currency, amount, balance_after, source, ref_id, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to read ledger: ${error.message}`);
    return data ?? [];
  }

  /**
   * Pula credited from real-money top-ups today, in Botswana time (R4).
   * The P500/day cap is checked against this, not against the raw ledger, so the
   * day boundary is the player's day and not the server's.
   */
  async topUpTotalToday(playerId: string, now = new Date()): Promise<number> {
    const startUtc = this.startOfBotswanaDay(now);

    const { data, error } = await this.supabase
      .getAdminClient()
      .from('ledger_entries')
      .select('amount')
      .eq('player_id', playerId)
      .eq('currency', 'pula')
      .eq('source', 'topup')
      .gte('created_at', startUtc);

    if (error) throw new Error(`Failed to read top-ups: ${error.message}`);
    return (data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  }

  /**
   * Botho earned from manual acts today, in Botswana time (I4).
   * Sums every positive Botho ledger row for the player's Botswana day. Because the
   * ONLY sanctioned way to credit Botho is `creditBothoCapped()` (below), this is
   * exactly the per-day legal cap's running total — there are no other Botho credits.
   */
  async bothoEarnedToday(playerId: string, now = new Date()): Promise<number> {
    const startUtc = this.startOfBotswanaDay(now);

    const { data, error } = await this.supabase
      .getAdminClient()
      .from('ledger_entries')
      .select('amount')
      .eq('player_id', playerId)
      .eq('currency', 'botho')
      .gt('amount', 0)
      .gte('created_at', startUtc);

    if (error) throw new Error(`Failed to read Botho ledger: ${error.message}`);
    return (data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  }

  /**
   * Earn Botho from a manual act, capped at BOTHO_DAILY_CAP per Botswana day (I4).
   *
   * This is the ONLY sanctioned path for act-earned Botho. Kgotla (quests, project
   * donations) must call this rather than `credit('botho', …)` so the legal daily
   * cap is never bypassed — the Auto-Collector is provably incapable of calling it,
   * which is what keeps Botho a loyalty signal rather than a purchase-linked sweep.
   *
   * Returns the amount actually awarded, which may be 0 if the cap is already met.
   * The cap check is read-then-credit, so two *simultaneous* manual acts could in
   * principle over-award by a few points — a soft, non-financial boundary on a
   * human-paced action. The hard invariants (Botho can never go negative, no money
   * involved) live in `wallet_apply`. If this ever needs to be airtight, fold the
   * sum-and-cap into `wallet_apply` as a guarded UPDATE.
   */
  async creditBothoCapped(
    playerId: string,
    requested: number,
    source: LedgerSource,
    refId?: string,
    now = new Date(),
  ): Promise<number> {
    if (!(requested > 0)) return 0;
    const earned = await this.bothoEarnedToday(playerId, now);
    const remaining = BOTHO_DAILY_CAP - earned;
    if (remaining <= 0) return 0;
    const award = Math.min(requested, Math.floor(remaining));
    if (award <= 0) return 0;
    await this.credit(playerId, 'botho', award, source, refId);
    return award;
  }

  /**
   * Pula donated to community projects today, in Botswana time (02 §9).
   *
   * Contribution is capped per day so the thing the design pays best for cannot be
   * multiplied by grinding — a spreadsheet should not beat a loyal player. Debits
   * are stored negative, so this sums magnitudes.
   */
  async contributedToday(playerId: string, now = new Date()): Promise<number> {
    const startUtc = this.startOfBotswanaDay(now);

    const { data, error } = await this.supabase
      .getAdminClient()
      .from('ledger_entries')
      .select('amount')
      .eq('player_id', playerId)
      .eq('currency', 'pula')
      .eq('source', 'letsema_contribution')
      .lt('amount', 0)
      .gte('created_at', startUtc);

    if (error) throw new Error(`Failed to read contributions: ${error.message}`);
    return (data ?? []).reduce((sum, r) => sum + Math.abs(Number(r.amount ?? 0)), 0);
  }

  /**
   * When Letsema was last used, or null if never (05 §P5). Read separately rather
   * than folded into `getWallet` so the hot path stays narrow.
   */
  async letsemaLastUsedAt(playerId: string): Promise<Date | null> {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('player_wallets')
      .select('letsema_last_used_at')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) throw new Error(`Failed to read Letsema cooldown: ${error.message}`);
    const raw = (data as { letsema_last_used_at?: string | null } | null)?.letsema_last_used_at;
    return raw ? new Date(raw) : null;
  }

  /**
   * Record a Letsema use. This is the ONLY writer of `letsema_last_used_at` — the
   * column lives on `player_wallets`, and nothing outside this class may write
   * there (invariant 3).
   */
  async markLetsemaUsed(playerId: string, now = new Date()): Promise<void> {
    const { error } = await this.supabase
      .getAdminClient()
      .from('player_wallets')
      .update({
        letsema_last_used_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('player_id', playerId);

    if (error) throw new Error(`Failed to record Letsema use: ${error.message}`);
  }

  /**
   * Set a player's subscription status and expiry. This is the ONLY sanctioned
   * writer of `subscription_status` / `subscription_expires_at` (invariant 3 — only
   * this class may touch `player_wallets`). P9 uses it both when a Guild subscription
   * is awarded (via the webhook path) and when it lapses (the daily flip job).
   *
   * Benefits gated on this column — auto-collector, +50% storage, subscriber
   * cosmetics — are therefore dropped the instant it is set back to 'free', which is
   * exactly the P9 done-criterion ("a lapsed subscription immediately drops
   * auto-collect, storage bonus and cosmetics").
   */
  async setSubscription(
    playerId: string,
    status: 'free' | 'guild',
    expiresAt: string | null,
    now: Date = new Date(),
  ): Promise<void> {
    const { error } = await this.supabase
      .getAdminClient()
      .from('player_wallets')
      .update({
        subscription_status: status,
        subscription_expires_at: expiresAt,
        updated_at: now.toISOString(),
      })
      .eq('player_id', playerId);

    if (error) throw new Error(`Failed to set subscription: ${error.message}`);
  }

  /**
   * Midnight CAT (UTC+2, no DST) as a UTC instant. Botswana does not observe
   * daylight saving, so the offset really is a constant — this is the one place
   * in the codebase where hardcoding +02:00 is correct.
   */
  startOfBotswanaDay(now: Date): string {
    const shifted = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const y = shifted.getUTCFullYear();
    const m = shifted.getUTCMonth();
    const d = shifted.getUTCDate();
    return new Date(Date.UTC(y, m, d, 0, 0, 0) - 2 * 60 * 60 * 1000).toISOString();
  }

  // ---------------------------------------------------------------- internals

  /**
   * The only path to the database for a balance change. Delegates to
   * `wallet_apply()` in Postgres so the update and the ledger insert are atomic.
   * Takes ONE player id — see the class comment.
   */
  private async apply(
    playerId: string,
    currency: WalletCurrency,
    amount: number,
    source: LedgerSource,
    refId?: string,
  ): Promise<number> {
    // Sign is meaningful here (debit negates), so this cannot reject negatives —
    // but NaN/Infinity have no meaning as money and would either error inside
    // Postgres or, worse, coerce into something we could not reconcile.
    if (!Number.isFinite(amount)) {
      throw new BadRequestException(
        `wallet movement requires a finite amount (got ${amount})`,
      );
    }

    const { data, error } = await this.supabase
      .getAdminClient()
      .rpc('wallet_apply', {
        p_player_id: playerId,
        p_currency: currency,
        p_amount: amount,
        p_source: source,
        p_ref_id: refId ?? null,
      });

    if (error) {
      // surfaced verbatim: wallet_apply raises the useful message
      throw new BadRequestException(error.message);
    }
    return Number(data);
  }
}
