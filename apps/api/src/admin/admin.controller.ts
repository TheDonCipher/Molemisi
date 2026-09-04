import { Controller, Get, Post, Query, Param, Body, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AdminService } from './admin.service';

/**
 * Admin Controller
 *
 * All admin endpoints require authentication and should be restricted
 * to admin users in production. Currently protected by JWT only.
 *
 * TODO: Add admin role check via a dedicated AdminGuard.
 */
@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  /**
   * Get player overview for inspection.
   * GET /api/v1/admin/players/:playerId
   */
  @Get('players/:playerId')
  async getPlayerOverview(@Param('playerId') playerId: string) {
    this.logger.log(`Admin: player overview for ${playerId}`);
    return this.adminService.getPlayerOverview(playerId);
  }

  /**
   * Get player currency history for charting.
   * GET /api/v1/admin/players/:playerId/currency-history
   */
  @Get('players/:playerId/currency-history')
  async getPlayerCurrencyHistory(
    @Param('playerId') playerId: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`Admin: currency history for ${playerId}`);
    return this.adminService.getPlayerCurrencyHistory(playerId, limit ? parseInt(limit) : 200);
  }

  /**
   * Search players.
   * GET /api/v1/admin/players?q=search
   */
  @Get('players')
  async searchPlayers(@Query('q') query: string, @Query('limit') limit?: string) {
    this.logger.log(`Admin: player search "${query}"`);
    return this.adminService.searchPlayers(query, limit ? parseInt(limit) : 20);
  }

  /**
   * Get economy overview.
   * GET /api/v1/admin/economy
   */
  @Get('economy')
  async getEconomyOverview() {
    this.logger.log('Admin: economy overview');
    return this.adminService.getEconomyOverview();
  }

  /**
   * Get recent ledger entries.
   * GET /api/v1/admin/ledger?limit=100
   */
  @Get('ledger')
  async getRecentLedger(@Query('limit') limit?: string) {
    this.logger.log('Admin: recent ledger');
    return this.adminService.getRecentLedger(limit ? parseInt(limit) : 100);
  }

  /**
   * Ban a player.
   * POST /api/v1/admin/players/:playerId/ban
   */
  @Post('players/:playerId/ban')
  async banPlayer(@Param('playerId') playerId: string, @Body('reason') reason: string) {
    this.logger.log(`Admin: ban player ${playerId}`);
    return this.adminService.banPlayer(playerId, reason || 'No reason provided');
  }

  /**
   * Unban a player.
   * POST /api/v1/admin/players/:playerId/unban
   */
  @Post('players/:playerId/unban')
  async unbanPlayer(@Param('playerId') playerId: string) {
    this.logger.log(`Admin: unban player ${playerId}`);
    return this.adminService.unbanPlayer(playerId);
  }

  /**
   * Send a warning to a player.
   * POST /api/v1/admin/players/:playerId/warn
   */
  @Post('players/:playerId/warn')
  async warnPlayer(@Param('playerId') playerId: string, @Body('message') message: string) {
    this.logger.log(`Admin: warn player ${playerId}`);
    return this.adminService.warnPlayer(playerId, message || 'Warning from admin');
  }

  /**
   * Reset a player's farm.
   * POST /api/v1/admin/players/:playerId/reset-farm
   */
  @Post('players/:playerId/reset-farm')
  async resetFarm(@Param('playerId') playerId: string, @Body('reason') reason?: string) {
    this.logger.log(`Admin: reset farm for player ${playerId}`);
    return this.adminService.resetFarm(playerId, reason);
  }
}
