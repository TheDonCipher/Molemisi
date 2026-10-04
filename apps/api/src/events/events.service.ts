import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { ChapterService } from '../chapters/chapter.service';
import { EVENT_TEMPLATES, type EventGrantItem } from '@molemisi/game-config';

export interface EventView {
  id?: string;
  slug: string;
  name: string;
  setswana: string;
  description: string;
  chapterSlug: string;
  startsAt: string;
  endsAt: string;
  grantItem: EventGrantItem;
  grantQty: number;
  chapterTokenReward: number;
  claimed?: boolean;
}

export interface ClaimResult {
  claimed: boolean;
  alreadyClaimed: boolean;
  itemSlug: string;
  quantity: number;
  chapterTokens: number;
  message: string;
}

interface EventRow {
  id: string;
  slug: string;
  chapter_slug: string;
  name: string;
  setswana: string;
  description: string;
  starts_at: string;
  ends_at: string;
  grant_item: EventGrantItem;
  grant_qty: number;
  chapter_token_reward: number;
}

/**
 * D6 / D8 / B3 — the Events live service.
 *
 * One themed Event per chapter, materialised from `EVENT_TEMPLATES` onto the
 * real Setswana calendar. Because D7 defers crafting, the player cannot make
 * Bupi or Borotho, so the Event GRANTS them and the Kgotla pays Chapter Tokens
 * for the turn-in. That is how D6 is real in MVP with no crafting system.
 *
 * Idempotency (14 §9): a claim writes one `event_grants` row, guarded by
 * UNIQUE(player_id, event_id). A replay is a no-op — it grants nothing and pays
 * nothing. Chapter Tokens are awarded through `ChapterService.addTokens`, so the
 * P8 rollover remains the single owner of token expiry (I13).
 */
@Injectable()
export class EventsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly inventory: InventoryService,
    private readonly chapters: ChapterService,
  ) {}

  private admin(): SupabaseClient {
    return this.supabase.getAdminClient();
  }

  /**
   * Materialise the current chapter's Event(s). The Event runs the whole chapter
   * window so the live service is never dark; the window is derived from the
   * chapter occurrence, so a rollover opens the next Event automatically.
   */
  async ensureCurrentEvents(now = new Date()): Promise<EventView[]> {
    const chapter = await this.chapters.getCurrentChapter(now);
    const admin = this.admin();
    const startsAt = new Date(`${chapter.startsOn.slice(0, 10)}T00:00:00.000Z`).toISOString();
    const endsAt = new Date(`${chapter.endsOn.slice(0, 10)}T23:59:59.999Z`).toISOString();

    const templates = EVENT_TEMPLATES.filter((t) => t.chapter === chapter.slug);
    for (const t of templates) {
      const { error } = await admin.from('events').upsert(
        {
          slug: t.slug,
          chapter_slug: t.chapter,
          name: t.name,
          setswana: t.setswana,
          description: t.description,
          starts_at: startsAt,
          ends_at: endsAt,
          grant_item: t.grantItem,
          grant_qty: t.grantQty,
          chapter_token_reward: t.chapterTokenReward,
        },
        { onConflict: 'slug,starts_at' },
      );
      if (error) throw new Error(`Failed to open event ${t.slug}: ${error.message}`);
    }
    return templates.map((t) => this.templateView(t, startsAt, endsAt));
  }

  /** Every Event open right now, with the caller's claim status attached. */
  async listActive(playerId: string, now = new Date()): Promise<EventView[]> {
    await this.ensureCurrentEvents(now);
    const admin = this.admin();
    const { data } = await admin.from('events').select('*').order('starts_at', { ascending: true });
    const open = ((data ?? []) as EventRow[]).filter(
      (r) =>
        new Date(r.starts_at).getTime() <= now.getTime() &&
        now.getTime() <= new Date(r.ends_at).getTime(),
    );

    const { data: claims } = await admin
      .from('event_grants')
      .select('event_id')
      .eq('player_id', playerId);
    const claimed = new Set(((claims ?? []) as Array<{ event_id: string }>).map((c) => c.event_id));

    return open.map((r) => ({ ...this.rowView(r), claimed: claimed.has(r.id) }));
  }

  /**
   * Claim an Event: grant the goods, record the claim, pay Chapter Tokens.
   * Safe to replay — the second call is a no-op that grants nothing.
   */
  async claim(playerId: string, eventId: string, now = new Date()): Promise<ClaimResult> {
    const admin = this.admin();
    const { data: ev } = await admin.from('events').select('*').eq('id', eventId).maybeSingle();
    const row = ev as EventRow | null;
    if (!row) throw new NotFoundException('Event not found.');
    if (
      !(
        new Date(row.starts_at).getTime() <= now.getTime() &&
        now.getTime() <= new Date(row.ends_at).getTime()
      )
    ) {
      throw new BadRequestException('This Event is not open right now.');
    }

    // Fast no-op path (also the path the in-memory test DB exercises, since it
    // does not enforce the UNIQUE constraint).
    const { data: existing } = await admin
      .from('event_grants')
      .select('id')
      .eq('player_id', playerId)
      .eq('event_id', eventId)
      .maybeSingle();
    if (existing) return this.alreadyClaimed(row);

    const { data: farm } = await admin
      .from('farms')
      .select('id')
      .eq('user_id', playerId)
      .maybeSingle();
    const farmId = (farm as { id?: string } | null)?.id;
    if (!farmId) throw new BadRequestException('You need a farm before you can claim an Event.');

    // Reserve the claim FIRST so a concurrent double-tap cannot double-grant;
    // the UNIQUE(player_id, event_id) constraint rejects the loser.
    const { error: claimErr } = await admin.from('event_grants').insert({
      player_id: playerId,
      event_id: eventId,
      item_slug: row.grant_item,
      quantity: row.grant_qty,
      chapter_tokens: row.chapter_token_reward,
    });
    if (claimErr) return this.alreadyClaimed(row);

    const added = await this.inventory.addItem(playerId, farmId, row.grant_item, row.grant_qty);
    const chapterTokens =
      row.chapter_token_reward > 0
        ? await this.chapters.addTokens(playerId, row.chapter_token_reward, now)
        : 0;

    return {
      claimed: true,
      alreadyClaimed: false,
      itemSlug: row.grant_item,
      quantity: added.added,
      chapterTokens,
      message: `${added.added} ${row.grant_item} granted. Turn it in at the Kgotla for Chapter Tokens.`,
    };
  }

  private alreadyClaimed(row: EventRow): ClaimResult {
    return {
      claimed: false,
      alreadyClaimed: true,
      itemSlug: row.grant_item,
      quantity: 0,
      chapterTokens: 0,
      message: 'You have already claimed this Event.',
    };
  }

  private templateView(
    t: (typeof EVENT_TEMPLATES)[number],
    startsAt: string,
    endsAt: string,
  ): EventView {
    return {
      slug: t.slug,
      name: t.name,
      setswana: t.setswana,
      description: t.description,
      chapterSlug: t.chapter,
      startsAt,
      endsAt,
      grantItem: t.grantItem,
      grantQty: t.grantQty,
      chapterTokenReward: t.chapterTokenReward,
    };
  }

  private rowView(r: EventRow): EventView {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      setswana: r.setswana,
      description: r.description,
      chapterSlug: r.chapter_slug,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      grantItem: r.grant_item,
      grantQty: r.grant_qty,
      chapterTokenReward: r.chapter_token_reward,
    };
  }
}

