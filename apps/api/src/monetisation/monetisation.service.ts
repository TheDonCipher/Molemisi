import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';

export interface FlipResult {
  flipped: number;
}

export interface GrantResult {
  granted: number;
  weekStart: string;
}

/**
 * P9 — the two monetisation jobs (05 §P9 "Jobs"):
 *
 *   1. Daily — flip lapsed Guild subscriptions back to 'free'.
 *   2. Weekly — grant every Guild subscriber one Pula Stone.
 *
 * There is no @nestjs/schedule infrastructure in this codebase (see the Bushveld
 * Daily Sparkle and P8 rollover, which use the same pattern). So both jobs are
 * IDEMPOTENT service methods exposed via admin endpoints, and the daily flip also
 * runs on boot to recover from downtime. The actual cron is an external scheduler
 * (Supabase pg_cron, a systemd timer, or similar) calling the admin endpoints — the
 * method being safe to re-run is what makes that deployment trivial.
 */
@Injectable()
export class MonetisationService implements OnModuleInit {
  private readonly logger = new Logger(MonetisationService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly wallet: WalletService,
  ) {}

  /**
   * Boot catch-up: if the process was down past a subscription's expiry, flip it now
   * rather than waiting for the next scheduled run. A no-op when nothing is lapsed.
   * Wrapped so a failed flip can never block app boot.
   */
  async onModuleInit(): Promise<void> {
    try {
      const { flipped } = await this.flipLapsedSubscriptions(new Date());
      if (flipped > 0) {
        this.logger.log(`Boot catch-up: flipped ${flipped} lapsed subscription(s) to free.`);
      }
    } catch (err) {
      this.logger.error(
        `Boot subscription flip failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Flip every Guild subscriber whose subscription has expired (in Botswana time,
   * though the column is an absolute timestamp so the offset is already baked in).
   * Idempotent: a re-run finds no `subscription_expires_at < now` guild rows and flips
   * zero. Returns the count actually flipped.
   */
  async flipLapsedSubscriptions(now: Date = new Date()): Promise<FlipResult> {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('player_wallets')
      .update({
        subscription_status: 'free',
        subscription_expires_at: null,
        updated_at: now.toISOString(),
      })
      .eq('subscription_status', 'guild')
      .lt('subscription_expires_at', now.toISOString())
      .select('player_id');

    if (error) {
      throw new Error(`Failed to flip lapsed subscriptions: ${error.message}`);
    }
    return { flipped: (data ?? []).length };
  }

  /**
   * Grant one Pula Stone to every current Guild subscriber for the week containing
   * `now`. Idempotent two ways:
   *   - the player_boosts partial unique index (player_id, slug, week_start) rejects a
   *     duplicate insert at the database level;
   *   - this method also de-dupes in code (read-then-insert) so the same holds under
   *     the in-memory test mock, which has no unique index.
   * A re-run in the same week grants 0; the next week's run grants again.
   */
  async grantWeeklyPulaStones(now: Date = new Date()): Promise<GrantResult> {
    const weekStart = this.mondayUtc2(now);

    const { data: subscribers, error } = await this.supabase
      .getAdminClient()
      .from('player_wallets')
      .select('player_id')
      .eq('subscription_status', 'guild');

    if (error) {
      throw new Error(`Failed to read subscribers: ${error.message}`);
    }

    let granted = 0;
    const admin = this.supabase.getAdminClient();
    for (const sub of subscribers ?? []) {
      const playerId = (sub as { player_id: string }).player_id;

      const { data: existing } = await admin
        .from('player_boosts')
        .select('id')
        .eq('player_id', playerId)
        .eq('slug', 'pula_stone')
        .eq('week_start', weekStart)
        .maybeSingle();

      if (existing) continue; // already granted this week

      const { error: insErr } = await admin.from('player_boosts').insert({
        player_id: playerId,
        slug: 'pula_stone',
        source: 'guild_weekly',
        week_start: weekStart,
      });
      if (insErr) {
        this.logger.error(
          `Weekly Pula Stone grant failed for ${playerId}: ${insErr.message}`,
        );
        continue;
      }
      granted += 1;
    }

    this.logger.log(`Granted ${granted} weekly Pula Stone(s) for week ${weekStart}.`);
    return { granted, weekStart };
  }

  /**
   * Monday of the week containing `now`, expressed as a DATE string in Botswana time
   * (UTC+2, no DST). Used as the weekly-grant key so "this week" means the player's
   * week, not the server's.
   *
   * We compute against the Botswana wall-clock (now + 2h), read the Monday of that
   * week from those UTC fields (which ARE the Botswana calendar fields), and format
   * the date directly — never via toISOString(), which would snap it back to UTC and
   * shift the label a day early.
   */
  private mondayUtc2(now: Date): string {
    const shifted = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const dow = shifted.getUTCDay(); // 0=Sun .. 6=Sat
    const daysSinceMonday = (dow + 6) % 7;
    const monday = new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - daysSinceMonday),
    );
    const y = monday.getUTCFullYear();
    const m = String(monday.getUTCMonth() + 1).padStart(2, '0');
    const d = String(monday.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
