import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChapterService } from './chapter.service';
import type { AlmanacTrack } from '@molemisi/game-config';

/**
 * P8 — chapters, Chapter Tokens and the Almanac (05 §P8; 02 §3.3).
 *
 * The rollover is an admin job, not a player endpoint: tokens expire automatically
 * (server-authoritative) and the admin call is the manual/periodic trigger. It is
 * idempotent and supports a dry-run.
 */
@Controller('chapters')
@UseGuards(AuthGuard)
export class ChapterController {
  constructor(private chapterService: ChapterService) {}

  @Get()
  async listChapters(@CurrentUser('id') _userId: string) {
    const data = await this.chapterService.listChapters();
    return { success: true, data };
  }

  @Get('current')
  async getCurrent(@CurrentUser('id') userId: string) {
    const chapter = await this.chapterService.getCurrentChapter();
    const almanac = await this.chapterService.getAlmanac(userId);
    return { success: true, data: { chapter, almanac } };
  }

  @Post('current/claim')
  async claimTier(
    @CurrentUser('id') userId: string,
    @Body() body: { track: AlmanacTrack; tier: number },
  ) {
    const almanac = await this.chapterService.claimAlmanacTier(userId, body.track, body.tier);
    return { success: true, data: almanac };
  }

  @Post('rollover')
  @UseGuards(AdminGuard)
  async rollover(@Body() body: { dryRun?: boolean }) {
    const data = await this.chapterService.rolloverChapters(new Date(), Boolean(body?.dryRun));
    return { success: true, data };
  }
}
