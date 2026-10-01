import { Controller, Get, Post, Query, Body, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AntiCheatService, type RunOptions } from './anti-cheat.service';

/**
 * Admin-only anti-cheat surface (13 §9 "flag, review").
 *
 * Detection only: running a sweep never mutates player state. It writes flags
 * to `anti_cheat_flags` and the Nest log, which a reviewer then acts on.
 */
@Controller('admin/anti-cheat')
@UseGuards(AuthGuard, AdminGuard)
export class AntiCheatController {
  private readonly logger = new Logger(AntiCheatController.name);

  constructor(private readonly antiCheat: AntiCheatService) {}

  /** GET /api/v1/admin/anti-cheat/flags?playerId=&limit=100 */
  @Get('flags')
  async listFlags(@Query('playerId') playerId?: string, @Query('limit') limit?: string) {
    this.logger.log(`anti-cheat flags requested (player=${playerId ?? 'all'})`);
    return this.antiCheat.listFlags({
      playerId: playerId || undefined,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  /** POST /api/v1/admin/anti-cheat/passive — sweep for impossible states. */
  @Post('passive')
  async runPassive(@Body() body?: { now?: string }) {
    this.logger.log('anti-cheat passive sweep started');
    const opts: RunOptions = body?.now ? { now: new Date(body.now) } : {};
    const flags = await this.antiCheat.runPassiveChecks(opts);
    return { scanned: true, flagged: flags.length, flags };
  }

  /** POST /api/v1/admin/anti-cheat/active — scan the ledger/market window. */
  @Post('active')
  async runActive(
    @Body()
    body?: {
      now?: string;
      windowHours?: number;
      maxCreditPulaPerDay?: number;
      minFlipSeconds?: number;
    },
  ) {
    this.logger.log(`anti-cheat active sweep started (window=${body?.windowHours ?? 24}h)`);
    const flags = await this.antiCheat.runActiveChecks({
      now: body?.now ? new Date(body.now) : undefined,
      windowHours: body?.windowHours,
      maxCreditPulaPerDay: body?.maxCreditPulaPerDay,
      minFlipSeconds: body?.minFlipSeconds,
    });
    return { scanned: true, flagged: flags.length, flags };
  }
}
