import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export type AnalyticsEvent =
  // Gameplay
  | 'farm_loaded'
  | 'crop_planted'
  | 'crop_watered'
  | 'crop_harvested'
  | 'livestock_fed'
  | 'livestock_collected'
  | 'building_constructed'
  | 'building_upgraded'
  | 'item_sold'
  | 'item_bought'
  | 'contract_accepted'
  | 'contract_completed'
  | 'kgotla_opened'
  | 'bushveld_explored'
  | 'resource_collected'
  // Engagement
  | 'session_started'
  | 'session_ended'
  | 'tutorial_completed'
  // Economy
  | 'payment_started'
  | 'payment_completed'
  | 'payment_failed'
  // World
  | 'weather_changed'
  | 'season_changed'
  | 'event_triggered';

export interface TrackEventRequest {
  event: AnalyticsEvent;
  playerId?: string;
  properties?: Record<string, unknown>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Track an analytics event.
   *
   * Events are stored in the analytics_events table for later analysis.
   * In production, also emit to external analytics providers.
   */
  async track(request: TrackEventRequest): Promise<void> {
    const { event, playerId, properties } = request;

    // Log structured event
    this.logger.log(
      `ANALYTICS: ${event} player=${playerId || 'anonymous'} props=${JSON.stringify(properties || {})}`,
    );

    // Persist to database (best-effort — don't block on analytics)
    try {
      await this.supabase
        .getClient()
        .from('analytics_events')
        .insert({
          event,
          player_id: playerId || null,
          properties: properties || {},
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      // Analytics failures should never break gameplay
      this.logger.warn(
        `Failed to persist analytics event ${event}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get event counts for a time range.
   */
  async getEventCounts(event: AnalyticsEvent, since: string): Promise<number> {
    try {
      const { count } = await this.supabase
        .getClient()
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('event', event)
        .gte('created_at', since);

      return count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get DAU (Daily Active Users) for a date.
   */
  async getDAU(date: string): Promise<number> {
    try {
      const { count } = await this.supabase
        .getClient()
        .from('analytics_events')
        .select('player_id', { count: 'exact', head: true })
        .eq('event', 'farm_loaded')
        .gte('created_at', `${date}T00:00:00Z`)
        .lt('created_at', `${date}T23:59:59Z`);

      return count || 0;
    } catch {
      return 0;
    }
  }
}
