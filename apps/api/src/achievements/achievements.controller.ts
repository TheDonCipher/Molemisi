import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AchievementService } from './achievements.service';

/**
 * D5 / B2 — achievements & honorific endpoints.
 *
 *   GET  /achievements            the catalog with the player's attainment
 *   GET  /achievements/title      the player's current display title
 *   POST /achievements/evaluate   recompute attainment from live signals
 *
 * All authenticated. Read-only apart from `evaluate`, which writes attainment
 * rows the player already earned.
 */
@Controller('achievements')
@UseGuards(AuthGuard)
export class AchievementController {
  constructor(private readonly achievements: AchievementService) {}

  @Get()
  async list(@CurrentUser('id') userId: string) {
    const data = await this.achievements.list(userId);
    return { success: true, data };
  }

  @Get('title')
  async title(@CurrentUser('id') userId: string) {
    const data = await this.achievements.title(userId);
    return { success: true, data };
  }

  @Post('evaluate')
  async evaluate(@CurrentUser('id') userId: string) {
    const data = await this.achievements.evaluate(userId);
    return { success: true, data };
  }
}
