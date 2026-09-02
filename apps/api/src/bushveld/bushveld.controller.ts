import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BushveldService } from './bushveld.service';
import { FarmsService } from '../farms/farms.service';

@Controller('api/v1/farms/:farmId/bushveld')
@UseGuards(AuthGuard)
export class BushveldController {
  constructor(
    private bushveldService: BushveldService,
    private farmsService: FarmsService,
  ) {}

  @Get('zones')
  async getZones(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.bushveldService.getZones(farmId);
  }

  @Post('gather')
  @HttpCode(HttpStatus.OK)
  async gatherResources(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
    @Body('zoneId') zoneId: string,
  ) {
    return this.bushveldService.gatherResources(farmId, userId, zoneId);
  }

  @Get('history')
  async getHistory(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.bushveldService.getGatheringHistory(farmId);
  }
}
