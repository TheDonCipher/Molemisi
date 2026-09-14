import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { CropsService } from './crops.service';
import { FarmsService } from '../farms/farms.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/auth.guard';
import { LETSEMA_COOLDOWN_DAYS } from '@molemisi/game-config';

/**
 * Letsema is a farm-level act, not a plot-level one, so it gets its own
 * controller rather than hanging off `farms/:farmId/plots` where it would read
 * as `plots/letsema` — a plot that is not a plot.
 */
@Controller('farms/:farmId/letsema')
@UseGuards(AuthGuard)
export class LetsemaController {
  constructor(
    private cropsService: CropsService,
    private farmsService: FarmsService,
  ) {}

  @Get()
  async status(
    @Param('farmId') farmId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, user.id);
    const status = await this.cropsService.letsemaStatus(farmId, user.id);
    return {
      success: true,
      data: { ...status, cooldownDays: LETSEMA_COOLDOWN_DAYS },
    };
  }

  @Post()
  async run(
    @Param('farmId') farmId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, user.id);
    const result = await this.cropsService.letsema(farmId, user.id);
    return { success: true, data: result };
  }
}
