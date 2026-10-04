import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../database/supabase.service';
import { CHAT_PAGE_SIZE, CHAT_RATE_LIMITS, isPostable, type ChatLanguage } from '@molemisi/game-config';

export interface ChatMessageView {
  id: string;
  playerId: string;
  displayName: string;
  body: string;
  language: string;
  createdAt: string;
  /** True when the viewer authored the message. */
  mine: boolean;
}

interface MessageRow {
  id: string;
  player_id: string;
  display_name: string;
  body: string;
  language: string;
  created_at: string;
  deleted_at: string | null;
}

/**
 * D5 / B1 â€” global Kgotla chat.
 *
 * RULING (2026-10-04, third pass): **no chat moderation.** The service applies no
 * content filter, no mute/block and no report queue â€” a message is written if it is
 * a non-empty payload of a sane length and the author is not sending faster than the
 * anti-flood window. The moderation subsystem from the original B1 scope is withdrawn.
 *
 * What IS enforced, and why it is not moderation:
 *   - payload guard (empty / over-length) â€” a malformed request, not a policy call;
 *   - anti-flood rate limit â€” one shared line on mobile data (`20 Â§5.4`), so a stuck
 *     send loop must not become an unbounded request storm. It limits frequency only.
 *
 * The author line is the PLAYER identity (`display_name`), never the farm name â€” the
 * D4 identity split applied to the social surface.
 */
@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin(): SupabaseClient {
    return this.supabase.getAdminClient();
  }

  /** Post a message. Throws 400 (bad payload) or 429 (anti-flood) â€” never writes on failure. */
  async post(
    playerId: string,
    body: string,
    language: ChatLanguage = 'en',
  ): Promise<ChatMessageView> {
    const verdict = isPostable(body);
    if (verdict === 'too_long') {
      throw new BadRequestException(`Keep it under ${CHAT_RATE_LIMITS.maxLength} characters.`);
    }
    if (verdict === 'empty') throw new BadRequestException('Say something.');

    await this.enforceRateLimit(playerId);

    const { data: profile } = await this.admin()
      .from('profiles')
      .select('display_name')
      .eq('id', playerId)
      .maybeSingle();
    const displayName = (profile as { display_name?: string } | null)?.display_name ?? 'Molemisi';

    const { data, error } = await this.admin()
      .from('kgotla_messages')
      .insert({ player_id: playerId, display_name: displayName, body: body.trim(), language })
      .select('*');
    if (error) throw new BadRequestException(`Failed to post: ${error.message}`);
    const inserted = (Array.isArray(data) ? data[0] : data) as MessageRow | undefined;
    if (!inserted) throw new BadRequestException('Failed to post: no row returned.');
    return { ...this.view(inserted), mine: true };
  }

  /** Recent messages for everyone â€” a single shared channel (D5). */
  async list(viewerId: string, limit = CHAT_PAGE_SIZE): Promise<ChatMessageView[]> {
    const { data, error } = await this.admin()
      .from('kgotla_messages')
      .select('id, player_id, display_name, body, language, created_at, deleted_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new BadRequestException(`Failed to load chat: ${error.message}`);
    const rows = ((data ?? []) as MessageRow[]).filter((r) => !r.deleted_at);
    return rows
      .reverse()
      .map((r) => ({ ...this.view(r), mine: r.player_id === viewerId }));
  }

  // -------------------------------------------------------------- internals

  /**
   * Anti-flood only: caps how OFTEN this player may post inside a rolling window.
   * It reads timestamps, never content.
   */
  private async enforceRateLimit(playerId: string): Promise<void> {
    const since = new Date(Date.now() - CHAT_RATE_LIMITS.windowSeconds * 1000).toISOString();
    const { data } = await this.admin()
      .from('kgotla_messages')
      .select('created_at')
      .eq('player_id', playerId)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    const rows = (data ?? []) as Array<{ created_at: string }>;

    if (rows.length >= CHAT_RATE_LIMITS.maxPerWindow) {
      throw new HttpException(
        'You are sending messages too quickly. Rest a moment.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const last = rows[0]?.created_at;
    if (last && Date.now() - new Date(last).getTime() < CHAT_RATE_LIMITS.minSecondsBetween * 1000) {
      throw new HttpException('Wait a few seconds between messages.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private view(r: MessageRow): Omit<ChatMessageView, 'mine'> {
    return {
      id: r.id,
      playerId: r.player_id,
      displayName: r.display_name,
      body: r.body,
      language: r.language,
      createdAt: r.created_at,
    };
  }
}

