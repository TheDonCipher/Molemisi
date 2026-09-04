import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export interface Notification {
  id: string;
  player_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Create a notification for a player.
   */
  async create(
    playerId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
    actionUrl?: string,
  ): Promise<Notification | null> {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('notifications')
      .insert({
        player_id: playerId,
        type,
        title,
        message,
        metadata: metadata || {},
        action_url: actionUrl || null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      return null;
    }

    return data;
  }

  /**
   * Get all notifications for a player (newest first).
   */
  async getByPlayer(playerId: string, limit = 20): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('notifications')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error(`Failed to fetch notifications: ${error.message}`);
      return [];
    }

    return data || [];
  }

  /**
   * Get unread notification count for a player.
   */
  async getUnreadCount(playerId: string): Promise<number> {
    const { count, error } = await this.supabase
      .getAdminClient()
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .eq('read', false);

    if (error) {
      this.logger.error(`Failed to count notifications: ${error.message}`);
      return 0;
    }

    return count || 0;
  }

  /**
   * Mark a notification as read.
   */
  async markRead(notificationId: string, playerId: string): Promise<boolean> {
    const { error } = await this.supabase
      .getAdminClient()
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('player_id', playerId);

    if (error) {
      this.logger.error(`Failed to mark notification read: ${error.message}`);
      return false;
    }

    return true;
  }

  /**
   * Mark all notifications as read for a player.
   */
  async markAllRead(playerId: string): Promise<number> {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('notifications')
      .update({ read: true })
      .eq('player_id', playerId)
      .eq('read', false)
      .select('id');

    if (error) {
      this.logger.error(`Failed to mark all read: ${error.message}`);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Convenience: notify a player about a ban.
   */
  async notifyBan(playerId: string, reason: string) {
    return this.create(
      playerId,
      'ban',
      'Account Suspended',
      `Your account has been suspended by an administrator. Reason: ${reason}`,
      { reason },
    );
  }

  /**
   * Convenience: notify a player about a warning.
   */
  async notifyWarning(playerId: string, message: string, warningCount: number) {
    return this.create(playerId, 'warning', 'Warning Received', message, { warningCount });
  }

  /**
   * Convenience: notify a player about a farm reset.
   */
  async notifyFarmReset(playerId: string, reason?: string) {
    return this.create(
      playerId,
      'reset',
      'Farm Reset',
      `Your farm has been reset to starting state by an administrator.${reason ? ` Reason: ${reason}` : ''}`,
      { reason },
    );
  }

  /**
   * Convenience: notify about currency changes.
   */
  async notifyCurrencyChange(playerId: string, amount: number, reason: string) {
    const direction = amount >= 0 ? 'received' : 'spent';
    return this.create(
      playerId,
      'info',
      `Pula ${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
      `${amount >= 0 ? '+' : ''}${amount} Pula — ${reason}`,
      { amount, reason },
    );
  }
}
