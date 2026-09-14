import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { WaterService } from './water.service';
import { FarmsService } from '../farms/farms.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/auth.guard';

/**
 * Jojo-tank operations. Water is a farm-level resource — the refill fills the whole
 * farm's tank, not a single plot (03 §1.2). The per-plot watering action from the
 * legacy model is retired with P4: growth is gated by the tank, not by per-crop
 * hydration.
 */
@Controller('farms/:farmId/water')
@UseGuards(AuthGuard)
export class WaterController {
  constructor(
    private water: WaterService,
    private farmsService: FarmsService,
  ) {}

  @Post('refill')
  async refill(
    @Param('farmId') farmId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, user.id);
    const result = await this.water.refillTank(farmId, user.id);
    return { success: true, data: result };
  }

  @Get()
  async status(
    @Param('farmId') farmId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, user.id);
    const status = await this.water.getTankStatus(farmId);
    return { success: true, data: status };
  }
}
