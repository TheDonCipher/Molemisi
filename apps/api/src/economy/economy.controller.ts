import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { EconomyService } from './economy.service';

/**
 * Admin-only economy-analysis surface (§5). Read-only: these endpoints report
 * balance, never change it.
 */
@Controller('admin/economy')
@UseGuards(AuthGuard, AdminGuard)
export class EconomyController {
  private readonly logger = new Logger(EconomyController.name);

  constructor(private readonly economy: EconomyService) {}

  /** GET /api/v1/admin/economy/overview?days=7 */
  @Get('overview')
  async overview(@Query('days') days?: string) {
    this.logger.log(`economy overview requested (days=${days ?? '7'})`);
    return this.economy.getOverview({ days: days ? parseInt(days, 10) : 7 });
  }

  /** Total currency in circulation. */
  @Get('currency')
  async currency(@Query('days') days?: string) {
    return this.economy.getCurrencySupply({ windowDays: days ? parseInt(days, 10) : 7 });
  }

  /** Wealth distribution: percentile bands + Gini. */
  @Get('wealth')
  async wealth() {
    return this.economy.getWealthDistribution();
  }

  /** Transaction velocity (count + volume per day). */
  @Get('velocity')
  async velocity(@Query('days') days?: string) {
    return this.economy.getTransactionVelocity({ days: days ? parseInt(days, 10) : 7 });
  }

  /** Price drift from baseline for every catalogued item. */
  @Get('prices')
  async prices() {
    return this.economy.getItemPriceDrift();
  }

  /** Inflation/deflation over a window. */
  @Get('inflation')
  async inflation(@Query('days') days?: string) {
    return this.economy.getInflation({ days: days ? parseInt(days, 10) : 7 });
  }

  /** Over/under-supply flags for crops and products. */
  @Get('crop-supply')
  async cropSupply() {
    return this.economy.getCropSupplyFlags();
  }

  /** Progression bottlenecks (land ladder + building health). */
  @Get('progression')
  async progression() {
    return this.economy.getProgressionBottlenecks();
  }
}
