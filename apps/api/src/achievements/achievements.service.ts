import { Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../database/supabase.service';
import {
  ACHIEVEMENTS,
  attainedAchievements,
  highestHonorific,
  type AchievementSignals,
} from '@molemisi/game-config';

export interface AchievementView {
  slug: string;
  rung: string;
  name: string;
  description: string;
  attained: boolean;
  attainedAt: string | null;
}

export interface TitleView {
  rung: string;
  index: number;
  title: string;
  meaning: string;
}

/**
 * D5 / B2 — achievements and the honorific ladder.
 *
 * The service READS live signals (Botho, livestock, buildings, Events won) and
 * writes attainment to `player_achievements`. It never reads a wallet to decide
 * a PRICE and never pays anything out: the ladder is display-only (D10 — no
 * purchase reads as rank, and no rank grants advantage).
 *
 * Idempotency is structural: attainment rows are keyed (player_id,
 * achievement_slug), so re-evaluating a milestone can never duplicate a row.
 */
@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private admin(): SupabaseClient {
    return this.supabase.getAdminClient();
  }

  /**
   * The catalog is data-driven, so the source of truth is `game-config`. This
   * upserts it before any attainment write, which removes the FK ordering
   * hazard: a fresh database gets its catalog the first time anyone is
   * evaluated, not only after a manual seed.
   */
  async ensureCatalog(): Promise<void> {
    const admin = this.admin();
    for (const a of ACHIEVEMENTS) {
      const { error } = await admin
        .from('achievements')
        .upsert(
          {
            slug: a.slug,
            rung: a.rung,
            name: a.name,
            description: a.description,
            milestones: a.milestones,
          },
          { onConflict: 'slug' },
        );
      if (error) throw new Error(`Failed to seed achievement catalog: ${error.message}`);
    }
  }

  /** The live signals the catalog is measured against. */
  async signals(playerId: string): Promise<AchievementSignals> {
    const admin = this.admin();
    const [{ data: wallet }, { data: farm }] = await Promise.all([
      admin.from('player_wallets').select('botho_points').eq('player_id', playerId).maybeSingle(),
      admin.from('farms').select('id').eq('user_id', playerId).maybeSingle(),
    ]);

    const botho = Number((wallet as { botho_points?: number } | null)?.botho_points ?? 0);
    const farmId = (farm as { id?: string } | null)?.id;

    const [buildings, livestock, eventsWon] = await Promise.all([
      this.countForFarm(admin, 'buildings', farmId),
      this.countForFarm(admin, 'livestock', farmId),
      this.countForPlayer(admin, 'event_grants', playerId),
    ]);

    return { botho, livestock, buildings, eventsWon };
  }

  private async countForFarm(
    admin: SupabaseClient,
    table: string,
    farmId: string | undefined,
  ): Promise<number> {
    if (!farmId) return 0;
    const { data } = await admin.from(table).select('id').eq('farm_id', farmId);
    return Array.isArray(data) ? data.length : 0;
  }

  private async countForPlayer(
    admin: SupabaseClient,
    table: string,
    playerId: string,
  ): Promise<number> {
    const { data } = await admin.from(table).select('id').eq('player_id', playerId);
    return Array.isArray(data) ? data.length : 0;
  }

  /** Recompute attainment, persist anything newly earned, and return the state. */
  async evaluate(playerId: string): Promise<{ attained: AchievementView[]; title: TitleView }> {
    await this.ensureCatalog();
    const signals = await this.signals(playerId);
    const earned = attainedAchievements(signals);

    const admin = this.admin();
    for (const a of earned) {
      // Per-row so the composite conflict key is honoured by the in-memory mock
      // as well as Postgres; the unique PK makes a repeat a genuine no-op.
      const { error } = await admin
        .from('player_achievements')
        .upsert(
          { player_id: playerId, achievement_slug: a.slug, rung: a.rung },
          { onConflict: 'player_id,achievement_slug', ignoreDuplicates: true },
        );
      if (error) throw new Error(`Failed to record achievement ${a.slug}: ${error.message}`);
    }

    return { attained: await this.list(playerId), title: this.titleFromSignals(signals) };
  }

  /** The full catalog with this player's attainment overlay. */
  async list(playerId: string): Promise<AchievementView[]> {
    const { data } = await this.admin()
      .from('player_achievements')
      .select('achievement_slug, attained_at')
      .eq('player_id', playerId);
    const rows = (data ?? []) as Array<{ achievement_slug: string; attained_at: string | null }>;
    const attainedAt = new Map(rows.map((r) => [r.achievement_slug, r.attained_at] as const));

    return ACHIEVEMENTS.map((a) => ({
      slug: a.slug,
      rung: a.rung,
      name: a.name,
      description: a.description,
      attained: attainedAt.has(a.slug),
      attainedAt: attainedAt.get(a.slug) ?? null,
    }));
  }

  async title(playerId: string): Promise<TitleView> {
    return this.titleFromSignals(await this.signals(playerId));
  }

  private titleFromSignals(signals: AchievementSignals): TitleView {
    const h = highestHonorific(signals);
    return { rung: h.rung, index: h.index, title: h.title, meaning: h.meaning };
  }
}
