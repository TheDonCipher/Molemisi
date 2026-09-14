import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { FarmsService } from '../farms/farms.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('farms/:farmId/storage')
@UseGuards(AuthGuard)
export class StorageController {
  constructor(
    private buildingsService: BuildingsService,
    private farmsService: FarmsService,
  ) {}

  @Post('upgrade')
  async upgradeStorage(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.buildingsService.upgradeStorage(farmId, userId);
  }
}
