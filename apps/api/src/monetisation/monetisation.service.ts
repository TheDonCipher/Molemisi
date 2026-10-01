import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';

export interface FlipResult {
  flipped: number;
}

/**
 * P9 - the subscription-expiry job (05 P9 "Jobs").
 *
 * docs/34 3.2 (2026-10-01) - the WEEKLY JOB IS GONE. It granted every subscriber
 * a Pula Stone, and Pula Stone is a cut boost (docs/34 3.3): it was sold and
 * granted while no endpoint applied any of its effects. A subscription that pays a
 * player a broken item weekly is worse than no item at all.
 *
 * Nothing mechanical is granted weekly any more, deliberately: the Village Pass
 * grants a helper, an outfit and storage stacking - none of which is a recurring
 * resource drip for a player to budget around.
 *
 * There is no @nestjs/schedule infrastructure here (see the Bushveld Daily Sparkle
 * and P8 rollover, which use the same pattern). So the job is an IDEMPOTENT
 * service method exposed via an admin endpoint, and it also runs on boot to
 * recover from downtime. The actual cron is an external scheduler (Supabase
 * pg_cron, a systemd timer, or similar) calling the admin endpoint - the method
 * being safe to re-run is what makes that deployment trivial.
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


}
