import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { chapterForDate, type ChapterSlug } from '@molemisi/game-config';

export interface WorldEvent {
  id: string;
  name: string;
  description: string;
  type: 'festival' | 'seasonal' | 'market' | 'weather';
  /** Chapter this event belongs to, or null for an any-chapter event. */
  chapterSlug: ChapterSlug | null;
  effects: {
    growthModifier?: number;
    priceModifier?: number;
  };
  duration: number; // hours
}

export interface ActiveEvent {
  id: string;
  name: string;
  description: string;
  type: string;
  effects: Record<string, number>;
  startedAt: string;
  endsAt: string;
}

@Injectable()
export class WorldEventsService {
  constructor(private supabaseService: SupabaseService) {}

  // Pre-defined world events — keyed to the real Botswana chapter calendar
  // (Pass 3.2 / 30 N-7). xpModifier/energyModifier were stripped: the game has
  // no XP/energy economy, so they were dead multipliers. winter_solstice and
  // frost_warning were dropped — frost is not a Botswana phenomenon and they
  // carried only the removed xp/energy modifiers.
  private readonly EVENTS: WorldEvent[] = [
    // Pula (Season of Rain) — planting & growth
    {
      id: 'planting_festival',
      name: 'Planting Festival',
      description: 'A celebration of new beginnings! Crops grow faster.',
      type: 'festival',
      chapterSlug: 'pula',
      effects: { growthModifier: 1.5 },
      duration: 24,
    },
    {
      id: 'rain_season',
      name: 'Rain Season',
      description: 'Heavy rains bring free hydration to all crops.',
      type: 'seasonal',
      chapterSlug: 'pula',
      effects: { growthModifier: 1.2 },
      duration: 48,
    },
    // Phane (Season of Mophane) — harvest & markets
    {
      id: 'harvest_festival',
      name: 'Harvest Festival',
      description: 'A time of plenty! Sell prices are boosted.',
      type: 'festival',
      chapterSlug: 'phane',
      effects: { priceModifier: 1.5 },
      duration: 24,
    },
    {
      id: 'cattle_fair',
      name: 'Cattle Fair',
      description: 'Special livestock prices at the market.',
      type: 'market',
      chapterSlug: 'phane',
      effects: { priceModifier: 1.3 },
      duration: 12,
    },
    // Moriti (Season of Shade) — community & thrift
    {
      id: 'community_day',
      name: 'Community Day',
      description: 'The Kgotla hosts special quests with bonus rewards.',
      type: 'festival',
      chapterSlug: 'moriti',
      effects: {},
      duration: 24,
    },
    {
      id: 'market_day',
      name: 'Market Day',
      description: 'Special deals at the market! Buy prices reduced.',
      type: 'market',
      chapterSlug: 'moriti',
      effects: { priceModifier: 0.7 },
      duration: 12,
    },
    // Any-chapter events
    {
      id: 'traveling_merchant',
      name: 'Traveling Merchant',
      description: 'A rare merchant visits with exclusive items.',
      type: 'market',
      chapterSlug: null,
      effects: { priceModifier: 0.8 },
      duration: 6,
    },
    {
      id: 'drought',
      name: 'Drought',
      description: 'Extended dry period. Water your crops carefully!',
      type: 'weather',
      chapterSlug: null,
      effects: { growthModifier: 0.7 },
      duration: 24,
    },
    // Doc 11 §4 — Nako ya Go Arogana (The Season of Sharing). Deliberately an
    // EMPTY effects bag: the feast is a donation event with no negative modifier
    // and nothing to fear from ignoring it. The reward lives on the Kgotla
    // donation endpoint (Botho + a cosmetic, never Pula).
    {
      id: 'village_feast',
      name: 'Village Feast',
      description:
        'The Kgotla is preparing the village feast and asks for 20 Watermelons. Sharing earns Botho and the feast-day fence pattern. Declining costs nothing.',
      type: 'festival',
      chapterSlug: null,
      effects: {},
      duration: 72,
    },
  ];

  async getActiveEvents(): Promise<ActiveEvent[]> {
    const adminClient = this.supabaseService.getAdminClient();
    const now = new Date().toISOString();

    const { data: events } = await adminClient.from('world_events').select('*').gt('ends_at', now);

    return (events ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      name: e.name as string,
      description: e.description as string,
      type: e.type as string,
      effects: (e.effects as Record<string, number>) || {},
      startedAt: e.started_at as string,
      endsAt: e.ends_at as string,
    }));
  }

  async getAvailableEvents(_farmId: string): Promise<WorldEvent[]> {
    // One calendar: events are keyed to the real Botswana chapter for today,
    // not a simulated season clock (Pass 3.2 / 30 N-7).
    const current = chapterForDate(new Date());

    // Filter events by current chapter or any-chapter events
    return this.EVENTS.filter((e) => e.chapterSlug === null || e.chapterSlug === current.slug);
  }

  async triggerEvent(farmId: string, eventId: string): Promise<ActiveEvent> {
    const adminClient = this.supabaseService.getAdminClient();

    const event = this.EVENTS.find((e) => e.id === eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + event.duration * 60 * 60 * 1000);

    // Check if event is already active
    const { data: existing } = await adminClient
      .from('world_events')
      .select('id')
      .eq('farm_id', farmId)
      .eq('event_id', eventId)
      .gt('ends_at', now.toISOString())
      .single();

    if (existing) {
      throw new Error('Event already active');
    }

    // Create event
    const { data: active, error } = await adminClient
      .from('world_events')
      .insert({
        farm_id: farmId,
        event_id: eventId,
        name: event.name,
        description: event.description,
        type: event.type,
        effects: event.effects,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single();

    if (error || !active) {
      throw new Error('Failed to trigger event');
    }

    return {
      id: (active as Record<string, unknown>).id as string,
      name: event.name,
      description: event.description,
      type: event.type,
      effects: event.effects,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
    };
  }

  async getEventEffects(_farmId: string): Promise<{
    growthModifier: number;
    priceModifier: number;
  }> {
    const activeEvents = await this.getActiveEvents();

    let growthModifier = 1.0;
    let priceModifier = 1.0;

    for (const event of activeEvents) {
      if (event.effects.growthModifier) {
        growthModifier *= event.effects.growthModifier;
      }
      if (event.effects.priceModifier) {
        priceModifier *= event.effects.priceModifier;
      }
    }

    return { growthModifier, priceModifier };
  }
}
