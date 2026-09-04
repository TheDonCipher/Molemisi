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
import { LivestockService } from './livestock.service';
import { FarmsService } from '../farms/farms.service';

@Controller('farms/:farmId/livestock')
@UseGuards(AuthGuard)
export class LivestockController {
  constructor(
    private livestockService: LivestockService,
    private farmsService: FarmsService,
  ) {}

  @Get()
  async listLivestock(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.livestockService.listLivestock(farmId);
  }

  @Get('available')
  async getAvailableAnimals(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.livestockService.getAvailableAnimals(farmId);
  }

  @Post('purchase')
  @HttpCode(HttpStatus.CREATED)
  async purchaseAnimal(
    @Param('farmId') farmId: string,
    @CurrentUser('id') userId: string,
    @Body('animalType') animalType: string,
    @Body('name') name?: string,
  ) {
    return this.livestockService.purchaseAnimal(farmId, userId, animalType, name);
  }

  @Post(':animalId/feed')
  async feedAnimal(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.livestockService.feedAnimal(farmId, userId, animalId);
  }

  @Post(':animalId/collect')
  async collectProduct(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.livestockService.collectProduct(farmId, userId, animalId);
  }

  @Post(':animalId/pet')
  async petAnimal(
    @Param('farmId') farmId: string,
    @Param('animalId') animalId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.livestockService.petAnimal(farmId, userId, animalId);
  }
}
