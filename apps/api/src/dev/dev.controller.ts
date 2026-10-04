import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedUser } from '../common/guards/auth.guard';
import { DevGuard } from '../common/guards/dev.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DevService } from './dev.service';
import { ClockService } from '../common/clock.service';

/**
 * Dev tooling — the API half of the in-game dev affordances (D9 / W10).
 *
 * D9 ruled the affordances live *inside* the real screens rather than behind a
 * walled `/dev` panel, so that a dev navigates by playing the game. These routes
 * are what those affordances call. The panel itself lives in the client
 * (`components/dev/DevAffordance`); the tools still sit behind
 * `AuthGuard + DevGuard`, so a player can neither see nor reach them.
 *
 *   GET  /dev/status               liveness, build info, and the safety banner
 *   POST /dev/date-jump            { date } move the clock, re-derive, roll over
 *   POST /dev/clock/reset          back to wall-clock time
 *   GET  /dev/state                the seven corruption classes + recovery plan
 *   POST /dev/inventory/grant      { slug, qty } spawn items
 *   POST /dev/kgotla/complete-charge   force an active Charge to `claimed`
 *
 * SAFETY. Every mutating route calls `DevService.assertThrowaway()` first, which
 * refuses to run against the hosted project unless an operator has explicitly set
 * `DEV_TOOLS_ALLOW_LIVE=true`. The flag is reported in `/dev/status` so the UI
 * can render a loud warning rather than pretending the tools are safe.
 */
@Controller('dev')
@UseGuards(AuthGuard, DevGuard)
export class DevController {
  constructor(
    private readonly dev: DevService,
    private readonly clock: ClockService,
  ) {}

  /** GET /dev/status — dev-area liveness + build info + the safety banner. */
  @Get('status')
  async status(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: {
        role: 'dev',
        userId: user.id,
        email: user.email,
        serverTime: this.clock.now().toISOString(),
        wallClock: new Date().toISOString(),
        clockOverridden: this.clock.isOverridden,
        clockOffsetMs: this.clock.offset,
        /** True when these tools would refuse to mutate anything. */
        isLiveProject: this.dev.isLive(),
        toolsEnabled: !this.dev.isLive() || process.env.DEV_TOOLS_ALLOW_LIVE === 'true',
        uptimeSeconds: Math.round(process.uptime()),
        node: process.version,
        env: process.env.NODE_ENV ?? 'development',
      },
    };
  }

  /** POST /dev/date-jump — jump the calendar and validate I13 without waiting. */
  @Post('date-jump')
  async dateJump(@Body() body: { date?: string }) {
    const target = new Date(body?.date ?? '');
    const data = await this.dev.dateJump(target);
    return { success: true, data };
  }

  @Post('clock/reset')
  async resetClock() {
    return { success: true, data: this.dev.resetClock() };
  }

  /** GET /dev/state — the corruption-class panel. Read-only. */
  @Get('state')
  async state(@CurrentUser('id') userId: string) {
    const data = await this.dev.state(userId);
    return { success: true, data };
  }

  /** POST /dev/inventory/grant — spawn items via the sanctioned writer. */
  @Post('inventory/grant')
  async grant(@CurrentUser('id') userId: string, @Body() body: { slug: string; qty: number }) {
    const data = await this.dev.grant(userId, body?.slug, Number(body?.qty));
    return { success: true, data };
  }

  @Post('kgotla/complete-charge')
  async completeCharge(@CurrentUser('id') userId: string) {
    const data = await this.dev.forceCompleteCharge(userId);
    return { success: true, data };
  }
}
