import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

interface WorldEvent {
  id: string;
  name: string;
  description: string;
  type: 'festival' | 'seasonal' | 'market' | 'weather';
  season: string | null;
  effects: {
    growthModifier?: number;
    priceModifier?: number;
    xpModifier?: number;
    energyModifier?: number;
  };
  duration: number; // hours
}

interface ActiveEvent {
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

  // Pre-defined world events
  private readonly EVENTS: WorldEvent[] = [
    // Spring Events
    {
      id: 'planting_festival',
      name: 'Planting Festival',
      description: 'A celebration of new beginnings! Crops grow faster.',
      type: 'festival',
      season: 'spring',
      effects: { growthModifier: 1.5 },
      duration: 24,
    },
    {
      id: 'rain_season',
      name: 'Rain Season',
      description: 'Heavy rains bring free hydration to all crops.',
      type: 'seasonal',
      season: 'spring',
      effects: { growthModifier: 1.2 },
      duration: 48,
    },
    // Summer Events
    {
      id: 'harvest_festival',
      name: 'Harvest Festival',
      description: 'A time of plenty! Sell prices are boosted.',
      type: 'festival',
      season: 'summer',
      effects: { priceModifier: 1.5, xpModifier: 1.3 },
      duration: 24,
    },
    {
      id: 'cattle_fair',
      name: 'Cattle Fair',
      description: 'Special livestock prices at the market.',
      type: 'market',
      season: 'summer',
      effects: { priceModifier: 1.3 },
      duration: 12,
    },
    // Autumn Events
    {
      id: 'community_day',
      name: 'Community Day',
      description: 'The Kgotla hosts special quests with bonus rewards.',
      type: 'festival',
      season: 'autumn',
      effects: { xpModifier: 2.0 },
      duration: 24,
    },
    {
      id: 'market_day',
      name: 'Market Day',
      description: 'Special deals at the market! Buy prices reduced.',
      type: 'market',
      season: 'autumn',
      effects: { priceModifier: 0.7 },
      duration: 12,
    },
    // Winter Events
    {
      id: 'winter_solstice',
      name: 'Winter Solstice',
      description: 'The shortest day brings special blessings.',
      type: 'festival',
      season: 'winter',
      effects: { xpModifier: 1.5, energyModifier: 1.5 },
      duration: 24,
    },
    {
      id: 'frost_warning',
      name: 'Frost Warning',
      description: 'Cold snap! Protect your crops from frost damage.',
      type: 'weather',
      season: 'winter',
      effects: { growthModifier: 0.5 },
      duration: 36,
    },
    // Any Season Events
    {
      id: 'traveling_merchant',
      name: 'Traveling Merchant',
      description: 'A rare merchant visits with exclusive items.',
      type: 'market',
      season: null,
      effects: { priceModifier: 0.8 },
      duration: 6,
    },
    {
      id: 'drought',
      name: 'Drought',
      description: 'Extended dry period. Water your crops carefully!',
      type: 'weather',
      season: null,
      effects: { growthModifier: 0.7 },
      duration: 24,
    },
  ];

  async getActiveEvents(): Promise<ActiveEvent[]> {
    const adminClient = this.supabaseService.getAdminClient();
    const now = new Date().toISOString();

    const { data: events } = await adminClient
      .from('world_events')
      .select('*')
      .gt('ends_at', now);

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

  async getAvailableEvents(farmId: string): Promise<WorldEvent[]> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get current season
    const { data: farm } = await adminClient
      .from('farms')
      .select('season')
      .eq('id', farmId)
      .single();

    const currentSeason = (farm?.season as string) || 'spring';

    // Filter events by current season or no season
    return this.EVENTS.filter(
      (e) => e.season === null || e.season === currentSeason,
    );
  }

  async triggerEvent(
    farmId: string,
    eventId: string,
  ): Promise<ActiveEvent> {
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

  async getEventEffects(farmId: string): Promise<{
    growthModifier: number;
    priceModifier: number;
    xpModifier: number;
    energyModifier: number;
  }> {
    const activeEvents = await this.getActiveEvents();

    let growthModifier = 1.0;
    let priceModifier = 1.0;
    let xpModifier = 1.0;
    let energyModifier = 1.0;

    for (const event of activeEvents) {
      if (event.effects.growthModifier) {
        growthModifier *= event.effects.growthModifier;
      }
      if (event.effects.priceModifier) {
        priceModifier *= event.effects.priceModifier;
      }
      if (event.effects.xpModifier) {
        xpModifier *= event.effects.xpModifier;
      }
      if (event.effects.energyModifier) {
        energyModifier *= event.effects.energyModifier;
      }
    }

    return { growthModifier, priceModifier, xpModifier, energyModifier };
  }
}
