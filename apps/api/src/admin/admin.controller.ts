import { Controller, Get, Query, Param, UseGuards, Logger } from '@nestjs/common';
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
   * Search players.
   * GET /api/v1/admin/players?q=search
   */
  @Get('players')
  async searchPlayers(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
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
}
