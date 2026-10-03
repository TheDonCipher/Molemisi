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
/**
 * docs/34 §2.2 (DECIDED 2026-10-01) — three currencies, not two.
 *
 * `pula`  earned by play. NEVER sold, never withdrawn (MVP/02 §3.1).
 * `madi`  bought with mobile money. SPEND-ONLY: decorations and the Village Pass.
 * `botho` standing. Capped per day (I4). Never sold.
 *
 * There is deliberately no `madi → pula` helper anywhere in this file. That
 * absence is what makes "a free player reaches everything" structurally true
 * rather than a promise (docs/33 §2, docs/34 §6).
 */
export type WalletCurrency = 'pula' | 'botho' | 'madi';

/** Every reason a balance can move. Adding one is a deliberate act. */
export type LedgerSource =
  | 'signup_grant'
  | 'coop_sale'
  | 'seed_purchase'
  | 'craft_fee'
  | 'crafting_fee'
  | 'water_refill'
  | 'land_purchase'
  | 'botho_catchup'
  | 'storage_upgrade'
  | 'building_construction'
  | 'building_maintenance'
  | 'topup'
  | 'guild_subscription'
  | 'boost_purchase'
  | 'cosmetic_purchase'
  /**
   * docs/34 §2.2 — real money buys MADI, never Pula. `madi_topup` is the only
   * source that may credit `madi_balance` from a payment, and it is the only
   * place the old `'topup'` source should be read as "money in".
   */
  | 'madi_topup'
  /** Festival-shelf cosmetic, paid with Madi. */
  | 'madi_spend'
  /** The recurring Village Pass. */
  | 'village_pass'
  | 'letsema_contribution'
  | 'quest_reward'
  /**
   * The Kgotla Year-charge reward (year-charge.service). `ledger_entries.source`
   * is TEXT, so this needs no migration — but it DOES need to be in this union,
   * or the call sites fail to compile (pre-existing tsc break fixed 2026-10-02).
   */
  | 'year_charge_reward'
  | 'bushveld_forage'
  | 'almanac'
  | 'chapter_spend'
  | 'tsholofelo_gift'
  /**
   * Doc 11 §4 — Nako ya Go Arogana: the Village Feast. 20 watermelons leave the
   * bag, capped Botho comes back, Pula is never touched. Added for the
   * `donateVillageFeast` path in KgotlaService; `ledger_entries.source` is TEXT,
   * so no migration is required to accept it.
   */
  | 'village_feast'
  | 'admin_adjustment'
  | 'refund'
  | 'contract_complete';

export interface WalletSnapshot {
  pula_balance: number;
  /** docs/34 §2.1 — added by 20261001000003_add_madi_balance.sql. */
  madi_balance: number;
  botho_points: number;
  subscription_status: 'free' | 'guild';
  subscription_expires_at: string | null;
}

const WALLET_COLUMNS =
  'pula_balance, madi_balance, botho_points, subscription_status, subscription_expires_at';

@Injectable()
export class WalletService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Read a wallet, creating it if this is the player's first touch.
   * Never throws on "not found" — a wallet always exists once a profile does.
   *
   * M6 (security audit 2026-10-03) — create-on-read is now idempotent at the
   * SQL level (`ON CONFLICT (player_id) DO NOTHING` + re-select). The old
   * version issued a bare INSERT on a miss, so two concurrent first reads
   * raced on the PK and one of them 500'd.
   */
  async getWallet(playerId: string): Promise<WalletSnapshot> {
    const admin = this.supabase.getAdminClient();

    const { data, error } = await admin
      .from('player_wallets')
      .select(WALLET_COLUMNS)
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) throw new Error(`Failed to read wallet: ${error.message}`);
    if (data) return data as WalletSnapshot;

    // Race: profile created before the seed trigger ran, or the trigger is absent
    // on an older database. Creating on read keeps callers simple.
    const { data: created, error: createError } = await admin
      .from('player_wallets')
      .insert({ player_id: playerId })
      .select(WALLET_COLUMNS)
      .single();

    // Two concurrent first reads both miss above; the loser hits the PK and must
    // NOT throw — the row exists now, so re-read it. The happy path must NOT
    // re-enter getWallet: this is a read-or-create, and recursing to re-read a
    // row we just SELECTed back turns a single miss into an unbounded loop if the
    // insert ever succeeds without returning the row.
    if (createError) {
      const { data: raced, error: readError } = await admin
        .from('player_wallets')
        .select(WALLET_COLUMNS)
        .eq('player_id', playerId)
        .maybeSingle();
      if (readError || !raced) {
        throw new Error(`Failed to create wallet: ${createError.message}`);
      }
      return raced as WalletSnapshot;
    }

    if (created) return created as WalletSnapshot;

    // The insert reported success but returned no row (some drivers do this
    // under a RETURNING-free path). One bounded re-read, not a recursion.
    const { data: reread, error: rereadError } = await admin
      .from('player_wallets')
      .select(WALLET_COLUMNS)
      .eq('player_id', playerId)
      .maybeSingle();
    if (rereadError || !reread) {
      throw new Error('Failed to create wallet: insert succeeded but the row was not readable');
    }
    return reread as WalletSnapshot;
  }

  async getPula(playerId: string): Promise<number> {
    return (await this.getWallet(playerId)).pula_balance;
  }

  /** docs/34 §2.1 — the spend-only premium balance. */
  async getMadi(playerId: string): Promise<number> {
    return (await this.getWallet(playerId)).madi_balance ?? 0;
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

  /** True when the player can afford `amount` Madi. */
  async canAffordMadi(playerId: string, amount: number): Promise<boolean> {
    return (await this.getMadi(playerId)) >= amount;
  }

  /**
   * docs/34 §2.2 — spend Madi, or throw. Check-and-debit in one round trip, for
   * the same reason `spendPula` does it: two concurrent purchases must not both
   * pass an affordability check.
   *
   * The positive-finite guard is load-bearing here too — `apply()` negates the
   * amount, so an unvalidated negative would arrive at `wallet_apply` as a
   * positive delta and MINT Madi.
   */
  async spendMadi(
    playerId: string,
    amount: number,
    source: LedgerSource,
    refId?: string,
  ): Promise<number> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        `spendMadi requires a positive, finite amount (got ${amount})`,
      );
    }
    if (!(await this.canAffordMadi(playerId, amount))) {
      throw new BadRequestException(
        `Not enough Madi for this (need ${amount}). Top up from the store.`,
      );
    }
    return this.apply(playerId, 'madi', -amount, source, refId);
  }

  /**
   * docs/34 §2.2 — credit Madi. The ONLY legitimate caller is PaymentsService
   * after a provider-confirmed real-money payment.
   *
   * There is no gameplay path to this method and no admin grant path: Madi is
   * 1:1 backed by player deposits, so creating it out of nothing would break the
   * backing that makes it safe to hold.
   */
  async creditMadi(
    playerId: string,
    amount: number,
    source: LedgerSource,
    refId?: string,
  ): Promise<number> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        `creditMadi requires a positive, finite amount (got ${amount})`,
      );
    }
    return this.apply(playerId, 'madi', amount, source, refId);
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
   * Real money (BWP) spent today, in Botswana time (R4). The P500/day cap is
   * checked against THIS, not against a balance, so the day boundary is the
   * player's day and not the server's.
   *
   * docs/34 §2.2 — this used to sum `ledger_entries` where `currency='pula'` and
   * `source='topup'`. That cannot survive the switch to Madi, and summing Madi
   * instead would be silently WRONG: the packs carry a bonus (P50 grants 55
   * Madi), so a Madi sum measures credit, not spend, and would report a player
   * who spent P50 as having spent P55 — tightening a fraud control by 10% for a
   * reason nobody chose.
   *
   * The `payments` table is the record of what was actually charged, so the cap
   * is measured there.
   */
  async topUpTotalToday(playerId: string, now = new Date()): Promise<number> {
    const startUtc = this.startOfBotswanaDay(now);

    const { data, error } = await this.supabase
      .getAdminClient()
      .from('payments')
      .select('amount')
      .eq('player_id', playerId)
      // `payments.status` is a Postgres ENUM (payment_status) whose members are
      // UPPERCASE — 'PENDING' | 'COMPLETED' | ... (20260902000008). Matching the
      // lowercase 'completed' here does not error; it silently matches nothing,
      // which leaves the daily cap reading zero forever. Caught by the payments
      // spec, and the reason this comment is here.
      .eq('status', 'COMPLETED')
      .gte('created_at', startUtc);

    if (error) throw new Error(`Failed to read top-ups: ${error.message}`);

    // UNIT TRAP: `payments.amount` is in CENTS (column comment in
    // 20260902000008_payments_table.sql), while DAILY_TOP_UP_CAP_BWP and
    // VirtualGood.price are whole BWP. Summing without dividing makes one
    // P250 purchase look like BWP 25,000 and the cap fires on the first buy of
    // the day — which is exactly what the first run of this spec caught.
    const cents = (data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    return cents / 100;
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
   *
   * H1 (security audit 2026-10-03) — the sum-and-cap now lives INSIDE Postgres
   * (`botho_credit_capped`, migration 20261002000003), behind a wallet row lock
   * (`SELECT ... FOR UPDATE`). The old read-then-credit did the sum and the award
   * as two statements from Node, so two *simultaneous* manual acts both read a
   * pre-cap total and both awarded — the 50/day LEGAL cap could be overshot by a
   * scripted burst. Concurrent callers now serialise on the wallet row: the
   * second one re-reads the post-award ledger and sees the cap consumed.
   */
  async creditBothoCapped(
    playerId: string,
    requested: number,
    source: LedgerSource,
    refId?: string,
    now = new Date(),
  ): Promise<number> {
    if (!(requested > 0)) return 0;
    const { data, error } = await this.supabase
      .getAdminClient()
      .rpc('botho_credit_capped', {
        p_player_id: playerId,
        p_requested: Math.floor(requested),
        p_source: source,
        p_ref_id: refId ?? null,
        p_day_start: this.startOfBotswanaDay(now),
        p_cap: BOTHO_DAILY_CAP,
      });

    if (error) throw new Error(`Failed to credit Botho: ${error.message}`);
    return Number(data ?? 0);
  }

  /**
   * Pula donated to community projects today, in Botswana time (02 §9).
   *
   * Contribution is capped per day so the thing the design pays best for cannot be
   * multiplied by grinding — a spreadsheet should not beat a loyal player. Debits
   * are stored negative, so this sums magnitudes.
   */
  async contributedToday(playerId: string, now = new Date()): Promise<number> {
    return this.sumSince(
      playerId,
      'pula',
      'letsema_contribution',
      new Date(this.startOfBotswanaDay(now)),
      'debit',
    );
  }

  /**
   * Pula donated to community projects since an arbitrary instant (Kgotla charge
   * progress, SPEC §5.2). Day-scoped sibling is `contributedToday`.
   */
  async contributedSince(playerId: string, since: Date): Promise<number> {
    return this.sumSince(playerId, 'pula', 'letsema_contribution', since, 'debit');
  }

  /**
   * Pula actually received from Co-op sales since an arbitrary instant (Kgotla
   * charge progress, SPEC §5.2).
   *
   * Only CREDITS count. `market.buyItem` also writes `coop_sale` rows for non-seed
   * purchases, and those are debits — counting them would let a player buy back
   * what they just sold and run the objective backwards.
   */
  async coopSalesSince(playerId: string, since: Date): Promise<number> {
    return this.sumSince(playerId, 'pula', 'coop_sale', since, 'credit');
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
   * Admin-only: force a player's Pula to an exact value (AdminService.resetFarm).
   *
   * Moves the balance through `wallet_apply` like every other change, so the reset
   * is ledgered and the read-only `profiles.currency` mirror is updated by its own
   * trigger. A direct write to `profiles.currency` is rejected at runtime by
   * `trg_profiles_guard_currency` — so this method is the sanctioned way for an
   * admin to SET a balance (every other method only moves it by a delta).
   */
  async resetPula(playerId: string, newBalance: number): Promise<number> {
    if (!Number.isFinite(newBalance) || newBalance < 0) {
      throw new BadRequestException(
        `resetPula requires a non-negative, finite balance (got ${newBalance})`,
      );
    }
    const current = await this.getPula(playerId);
    // Round to the wallet's NUMERIC(12,2) so the delta cannot leave a sub-cent residue.
    const delta = Math.round((newBalance - current) * 100) / 100;
    if (delta === 0) return current;
    return this.apply(playerId, 'pula', delta, 'admin_adjustment');
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
   * Sum ledger magnitudes for one currency+source since an instant, in one
   * direction only. Every "how much has the player done since X" question in the
   * game funnels through here so the day-boundary and sign rules live in one place.
   *
   * `direction` is the load-bearing part: several sources carry both credits and
   * debits, and a Kgotla objective that summed them net could be walked backwards.
   */
  private async sumSince(
    playerId: string,
    currency: WalletCurrency,
    source: LedgerSource,
    since: Date,
    direction: 'credit' | 'debit',
  ): Promise<number> {
    let query = this.supabase
      .getAdminClient()
      .from('ledger_entries')
      .select('amount')
      .eq('player_id', playerId)
      .eq('currency', currency)
      .eq('source', source)
      .gte('created_at', since.toISOString());

    query = direction === 'credit' ? query.gt('amount', 0) : query.lt('amount', 0);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to read ledger: ${error.message}`);
    return (data ?? []).reduce((sum, r) => sum + Math.abs(Number(r.amount ?? 0)), 0);
  }

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
