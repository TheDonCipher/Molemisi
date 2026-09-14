import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedUser } from '../common/guards/auth.guard';
import { DevGuard } from '../common/guards/dev.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Dev Controller — the separate /dev tooling area.
 *
 * Dev accounts exist for testing and debugging the app; this is a DISTINCT tier
 * from admin (which handles user control and game config). Every route requires
 * a valid JWT AND profiles.role = 'dev' (DevGuard).
 *
 * Only non-sensitive build/runtime info is returned here — never secrets.
 */
@Controller('dev')
@UseGuards(AuthGuard, DevGuard)
export class DevController {
  /**
   * GET /api/v1/dev/status — dev-area liveness + build info for the tooling panel.
   */
  @Get('status')
  async status(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: {
        role: 'dev',
        userId: user.id,
        email: user.email,
        serverTime: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        node: process.version,
        env: process.env.NODE_ENV ?? 'development',
      },
    };
  }
}
