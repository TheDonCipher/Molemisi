import { Controller, Get, Post, Param, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

/**
 * Player Notification Controller
 *
 * Players can read and manage their notifications.
 * All endpoints require authentication.
 */
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /api/v1/notifications — Get all notifications for current player
   */
  @Get()
  async getNotifications(@CurrentUser('id') playerId: string) {
    this.logger.log(`Notifications: list for ${playerId}`);
    const notifications = await this.notificationsService.getByPlayer(playerId);
    const unreadCount = await this.notificationsService.getUnreadCount(playerId);
    return { notifications, unreadCount };
  }

  /**
   * GET /api/v1/notifications/unread-count — Get unread count only (lightweight poll)
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser('id') playerId: string) {
    const unreadCount = await this.notificationsService.getUnreadCount(playerId);
    return { unreadCount };
  }

  /**
   * POST /api/v1/notifications/:id/read — Mark a notification as read
   */
  @Post(':id/read')
  async markRead(@Param('id') notificationId: string, @CurrentUser('id') playerId: string) {
    this.logger.log(`Notifications: mark read ${notificationId}`);
    await this.notificationsService.markRead(notificationId, playerId);
    return { success: true };
  }

  /**
   * POST /api/v1/notifications/read-all — Mark all notifications as read
   */
  @Post('read-all')
  async markAllRead(@CurrentUser('id') playerId: string) {
    this.logger.log(`Notifications: mark all read for ${playerId}`);
    const count = await this.notificationsService.markAllRead(playerId);
    return { success: true, marked: count };
  }
}
