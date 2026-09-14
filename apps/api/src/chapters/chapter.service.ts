import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import {
  CHAPTERS,
  ALMANAC,
  chapterForDate,
  getChapter,
  daysUntilChapterEnd,
  getAlmanacTier,
  type Chapter,
  type AlmanacTrack,
  type AlmanacTier,
} from '@molemisi/game-config';

/**
 * P8 — Live service: chapters and events (05 §P8; 02 §3.3 Chapter Token; 04 §9.2).
 *
 * TWO jobs, and the second is the whole acceptance test:
 *
 *  1. Expose the current chapter + a player's Chapter Token balance + Almanac.
 *  2. The token ROLLOVER — Chapter Tokens expire to ZERO at chapter end (02 §3.3),
 *     hard zero, not a decay. `rolloverChapters()` is idempotent by construction:
 *     it only touches chapters whose `ends_on` is in the past, and it advances that
 *     window forward by a cycle, so a re-run finds nothing to do. It is safe to run
 *     on every boot and to re-run by hand. A dry-run reports what it WOULD zero.
 *
 * `chapters` is a four-row template (slug UNIQUE); `starts_on`/`ends_on` hold the
 * CURRENT occurrence and are advanced here — that is what makes the expiry exactly
 * once and re-runnable (05 §P8 done-criteria).
 */
@Injectable()
export class ChapterService implements OnModuleInit {
  private readonly logger = new Logger(ChapterService.name);

  constructor(
    private supabase: SupabaseService,
    private wallet: WalletService,
  ) {}

  /** Boot-time catch-up: roll any chapter that ended while the service was down. */
  async onModuleInit() {
    try {
      const result = await this.rolloverChapters(new Date(), false);
      if (result.rolledChapters > 0) {
        this.logger.log(
          `Chapter rollover on boot: ${result.rolledChapters} chapter(s), ` +
            `${result.affectedPlayers} player(s) had tokens zeroed.`,
        );
      }
    } catch (err) {
      // Boot must not fail the whole app if the DB is briefly unavailable; the next
      // boot (or an admin re-run) will catch up. The rollover is safe to repeat.
      this.logger.warn(`Chapter rollover on boot skipped: ${(err as Error).message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Chapter windows
  // ---------------------------------------------------------------------------

  /**
   * The occurrence window of a chapter that contains `now` (or the next upcoming one
   * if `now` falls in a gap). Returns ISO date strings (YYYY-MM-DD).
   */
  private occurrenceWindow(chapter: Chapter, now: Date): { start: string; end: string } {
    const months = chapter.months;
    const first = months[0]!;
    const last = months[months.length - 1]!;
    const dm = now.getUTCMonth() + 1;
    const dy = now.getUTCFullYear();

    let year: number;
    if (first <= last) {
      // Non-wrapping (e.g. phane [2,3,4]).
      if (dm >= first && dm <= last) year = dy;
      else if (dm < first) year = dy;
      else year = dy + 1;
    } else {
      // Wrapping (e.g. pula [11,12,1]).
      if (dm === 11 || dm === 12) year = dy;
      else if (dm === 1) year = dy - 1;
      else year = dy;
    }

    const start = new Date(Date.UTC(year, first - 1, 1));
    const endYear = first <= last ? year : year + 1;
    const end = new Date(Date.UTC(endYear, last, 0)); // last day of `last` month
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }

  /** Advance a window forward by whole cycles until its end is no earlier than `now`. */
  private advanceWindow(startStr: string, endStr: string, now: Date): { start: string; end: string } {
    let start = new Date(startStr);
    let end = new Date(endStr);
    let guard = 0;
    while (end.getTime() < now.getTime() && guard < 50) {
      start = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate()));
      end = new Date(Date.UTC(end.getUTCFullYear() + 1, end.getUTCMonth(), end.getUTCDate()));
      guard++;
    }
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }

  /**
   * Make sure all four template rows exist. Select-then-insert (never an upsert) so
   * it cannot clobber a window the rollover has already advanced. `ensureChapters`
   * only fills genuine gaps (e.g. an environment where the migration hadn't run).
   */
  async ensureChapters(now = new Date()): Promise<void> {
    const admin = this.supabase.getAdminClient();
    for (const ch of CHAPTERS) {
      const { data: existing } = await admin
        .from('chapters')
        .select('id')
        .eq('slug', ch.slug)
        .maybeSingle();
      if (existing) continue;
      const { start, end } = this.occurrenceWindow(ch, now);
      await admin.from('chapters').insert({
        slug: ch.slug,
        name: ch.name,
        setswana: ch.setswana,
        starts_on: start,
        ends_on: end,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  /** The chapter the player is in right now (by the real calendar). */
  async getCurrentChapter(now = new Date()): Promise<ChapterView> {
    await this.ensureChapters(now);
    const slug = chapterForDate(now).slug;
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('chapters')
      .select('id, slug, name, setswana, starts_on, ends_on')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(`Failed to read chapter: ${error.message}`);
    const row = data as ChapterRow | null;
    if (!row) throw new NotFoundException(`Chapter '${slug}' not found`);
    const cfg = getChapter(slug);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      setswana: row.setswana,
      tokenName: cfg?.tokenName ?? row.name,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      daysLeft: daysUntilChapterEnd(now),
      isCurrent: true,
    };
  }

  /** All four chapters, in calendar order, with the current one flagged. */
  async listChapters(now = new Date()): Promise<ChapterView[]> {
    await this.ensureChapters(now);
    const currentSlug = chapterForDate(now).slug;
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('chapters')
      .select('id, slug, name, setswana, starts_on, ends_on');
    if (error) throw new Error(`Failed to read chapters: ${error.message}`);
    const rows = (data ?? []) as ChapterRow[];
    // Stable canonical order (pula → phane → moriti → letlhafula), independent of
    // which occurrence window each row currently holds.
    const orderOf = (slug: string) => CHAPTERS.findIndex((c) => c.slug === slug);
    return rows
      .sort((a, b) => orderOf(a.slug) - orderOf(b.slug))
      .map((row) => {
      const cfg = getChapter(row.slug);
      const isCurrent = row.slug === currentSlug;
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        setswana: row.setswana,
        tokenName: cfg?.tokenName ?? row.name,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        daysLeft: isCurrent ? daysUntilChapterEnd(now) : 0,
        isCurrent,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Chapter Tokens (02 §3.3)
  // ---------------------------------------------------------------------------

  /** Read a player's state for a chapter, creating the row if absent. */
  private async getOrCreateState(
    playerId: string,
    chapterId: string,
  ): Promise<PlayerChapterState> {
    const admin = this.supabase.getAdminClient();
    const { data, error } = await admin
      .from('player_chapter_state')
      .select('player_id, chapter_id, chapter_tokens, almanac_progress')
      .eq('player_id', playerId)
      .eq('chapter_id', chapterId)
      .maybeSingle();
    if (error) throw new Error(`Failed to read chapter state: ${error.message}`);
    if (data) return data as PlayerChapterState;

    const seed: PlayerChapterState = {
      player_id: playerId,
      chapter_id: chapterId,
      chapter_tokens: 0,
      almanac_progress: {},
    };
    const { error: insErr } = await admin.from('player_chapter_state').insert(seed);
    if (insErr) throw new Error(`Failed to create chapter state: ${insErr.message}`);
    return seed;
  }

  /** Grant Chapter Tokens to the current chapter (never negative). */
  async addTokens(playerId: string, amount: number, now = new Date()): Promise<number> {
    if (!(amount > 0)) return 0;
    const chapter = await this.getCurrentChapter(now);
    const state = await this.getOrCreateState(playerId, chapter.id);
    const next = (state.chapter_tokens ?? 0) + amount;
    const { error } = await this.supabase
      .getAdminClient()
      .from('player_chapter_state')
      .update({ chapter_tokens: next })
      .eq('player_id', playerId)
      .eq('chapter_id', chapter.id);
    if (error) throw new Error(`Failed to add tokens: ${error.message}`);
    return next;
  }

  /**
   * Spend Chapter Tokens within the current chapter. Tokens are NOT money — they are
   * recorded in the ledger for audit (currency 'chapter_token') but never touch the
   * Pula/Madi wallets (02 §3.3: never convertible to Madi, never withdrawable).
   */
  async spendTokens(
    playerId: string,
    amount: number,
    purpose: string,
    now = new Date(),
  ): Promise<number> {
    if (!(amount > 0)) {
      throw new BadRequestException(`spendTokens requires a positive amount (got ${amount})`);
    }
    const chapter = await this.getCurrentChapter(now);
    const state = await this.getOrCreateState(playerId, chapter.id);
    const have = state.chapter_tokens ?? 0;
    if (have < amount) {
      throw new BadRequestException(
        `Not enough Chapter Tokens: have ${have}, need ${amount}`,
      );
    }
    const next = have - amount;
    const admin = this.supabase.getAdminClient();
    const { error } = await admin
      .from('player_chapter_state')
      .update({ chapter_tokens: next })
      .eq('player_id', playerId)
      .eq('chapter_id', chapter.id);
    if (error) throw new Error(`Failed to spend tokens: ${error.message}`);

    const { error: ledErr } = await admin.from('ledger_entries').insert({
      player_id: playerId,
      currency: 'chapter_token',
      amount: -amount,
      balance_after: next,
      source: 'chapter_spend',
      ref_id: purpose,
    });
    if (ledErr) throw new Error(`Failed to record token spend: ${ledErr.message}`);
    return next;
  }

  // ---------------------------------------------------------------------------
  // The Almanac (free + Guild track)
  // ---------------------------------------------------------------------------

  /** The full Almanac view for the current chapter: tracks with claimed flags. */
  async getAlmanac(playerId: string, now = new Date()): Promise<AlmanacView> {
    const chapter = await this.getCurrentChapter(now);
    const state = await this.getOrCreateState(playerId, chapter.id);
    const claimed = (state.almanac_progress ?? {}) as Record<string, number[]>;

    const buildTrack = (track: AlmanacTrack): AlmanacTierView[] => {
      const list = track === 'guild' ? ALMANAC.guildTrack : ALMANAC.freeTrack;
      const got = claimed[track] ?? [];
      return list.map((t) => ({ ...t, claimed: got.includes(t.tier) }));
    };

    return {
      chapter: {
        slug: chapter.slug,
        name: chapter.name,
        tokenName: chapter.tokenName,
        daysLeft: chapter.daysLeft,
      },
      chapterTokens: state.chapter_tokens ?? 0,
      tracks: { free: buildTrack('free'), guild: buildTrack('guild') },
    };
  }

  /**
   * Claim one Almanac tier. Sequential (must claim the previous tier first), the
   * Guild track requires an active subscription, and it is idempotent (re-claiming an
   * already-claimed tier is a no-op, not a second payout). Grants the configured
   * reward — Pula/Botho via WalletService, Chapter Tokens directly.
   */
  async claimAlmanacTier(
    playerId: string,
    track: AlmanacTrack,
    tier: number,
    now = new Date(),
  ): Promise<AlmanacView> {
    const def: AlmanacTier | undefined = getAlmanacTier(track, tier);
    if (!def) throw new NotFoundException(`Almanac tier ${track}#${tier} not found`);

    if (track === 'guild') {
      const wallet = await this.wallet.getWallet(playerId);
      if (wallet.subscription_status !== 'guild') {
        throw new BadRequestException('Guild subscription required for the Guild track');
      }
    }

    const chapter = await this.getCurrentChapter(now);
    const state = await this.getOrCreateState(playerId, chapter.id);
    const claimed = (state.almanac_progress ?? {}) as Record<string, number[]>;
    const got = claimed[track] ?? [];

    if (got.includes(tier)) return this.getAlmanac(playerId, now); // idempotent

    const prev = tier - 1;
    if (prev >= 1 && !got.includes(prev)) {
      throw new BadRequestException(`Claim tier ${prev} before tier ${tier}`);
    }

    const r = def.reward;
    if (r.pula) await this.wallet.credit(playerId, 'pula', r.pula, 'almanac');
    if (r.botho) await this.wallet.creditBothoCapped(playerId, r.botho, 'almanac');
    if (r.chapterTokens) await this.addTokens(playerId, r.chapterTokens, now);

    const newProgress = { ...claimed, [track]: [...got, tier] };
    const { error } = await this.supabase
      .getAdminClient()
      .from('player_chapter_state')
      .update({ almanac_progress: newProgress })
      .eq('player_id', playerId)
      .eq('chapter_id', chapter.id);
    if (error) throw new Error(`Failed to record Almanac claim: ${error.message}`);

    return this.getAlmanac(playerId, now);
  }

  // ---------------------------------------------------------------------------
  // The rollover — the acceptance test
  // ---------------------------------------------------------------------------

  /**
   * Zero every player's Chapter Token balance for each chapter whose window has ended,
   * then advance that chapter's window forward by a cycle.
   *
   * Idempotent: after a real run, no chapter has `ends_on < now`, so a re-run (or the
   * boot-time call, or an admin re-run) touches nothing. `dryRun` reports the impact
   * without writing — run it against production-shaped data before the first real run.
   */
  async rolloverChapters(now = new Date(), dryRun = false): Promise<RolloverResult> {
    await this.ensureChapters(now);
    const admin = this.supabase.getAdminClient();

    const { data: rows, error } = await admin
      .from('chapters')
      .select('id, slug, starts_on, ends_on')
      .order('starts_on', { ascending: true });
    if (error) throw new Error(`Failed to read chapters: ${error.message}`);

    const ended = (rows as ChapterRow[]).filter(
      (r) => new Date(r.ends_on).getTime() < now.getTime(),
    );

    let affectedPlayers = 0;
    for (const ch of ended) {
      const { data: holders, error: hErr } = await admin
        .from('player_chapter_state')
        .select('player_id, chapter_tokens')
        .eq('chapter_id', ch.id);
      if (hErr) throw new Error(`Failed to read token holders: ${hErr.message}`);
      const withTokens = ((holders ?? []) as Array<{ chapter_tokens: number }>).filter(
        (h) => (h.chapter_tokens ?? 0) > 0,
      );
      affectedPlayers += withTokens.length;

      if (!dryRun) {
        const { error: zErr } = await admin
          .from('player_chapter_state')
          .update({ chapter_tokens: 0 })
          .eq('chapter_id', ch.id);
        if (zErr) throw new Error(`Failed to zero tokens: ${zErr.message}`);

        const next = this.advanceWindow(ch.starts_on, ch.ends_on, now);
        const { error: wErr } = await admin
          .from('chapters')
          .update({ starts_on: next.start, ends_on: next.end })
          .eq('id', ch.id);
        if (wErr) throw new Error(`Failed to advance chapter window: ${wErr.message}`);
      }
    }

    return { rolledChapters: ended.length, affectedPlayers, dryRun };
  }
}

// ---- shapes ----------------------------------------------------------------
interface ChapterRow {
  id: string;
  slug: string;
  name: string;
  setswana: string;
  starts_on: string;
  ends_on: string;
}

interface PlayerChapterState {
  player_id: string;
  chapter_id: string;
  chapter_tokens: number;
  almanac_progress: Record<string, number[]>;
}

export interface ChapterView {
  id: string;
  slug: string;
  name: string;
  setswana: string;
  tokenName: string;
  startsOn: string;
  endsOn: string;
  daysLeft: number;
  isCurrent: boolean;
}

export interface AlmanacTierView extends AlmanacTier {
  claimed: boolean;
}

export interface AlmanacView {
  chapter: { slug: string; name: string; tokenName: string; daysLeft: number };
  chapterTokens: number;
  tracks: { free: AlmanacTierView[]; guild: AlmanacTierView[] };
}

export interface RolloverResult {
  rolledChapters: number;
  affectedPlayers: number;
  dryRun: boolean;
}
