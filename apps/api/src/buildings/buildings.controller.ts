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
import { BuildingsService } from './buildings.service';
import { FarmsService } from '../farms/farms.service';

@Controller('api/v1/farms/:farmId/buildings')
@UseGuards(AuthGuard)
export class BuildingsController {
  constructor(
    private buildingsService: BuildingsService,
    private farmsService: FarmsService,
  ) {}

  @Get()
  async listBuildings(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.buildingsService.listBuildings(farmId);
  }

  @Get('available')
  async getAvailableBuildings(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.buildingsService.getAvailableBuildings(farmId);
  }

  @Post('construct')
  @HttpCode(HttpStatus.CREATED)
  async constructBuilding(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
    @Body('buildingType') buildingType: string,
  ) {
    return this.buildingsService.constructBuilding(farmId, userId, buildingType);
  }

  @Post(':buildingId/upgrade')
  async upgradeBuilding(
    @Param('farmId') farmId: string,
    @Param('buildingId') buildingId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.buildingsService.upgradeBuilding(farmId, userId, buildingId);
  }

  @Post(':buildingId/maintain')
  async maintainBuilding(
    @Param('farmId') farmId: string,
    @Param('buildingId') buildingId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.buildingsService.maintainBuilding(farmId, userId, buildingId);
  }
}
