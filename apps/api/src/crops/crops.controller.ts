import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { CropsService } from './crops.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/auth.guard';
import { PlantCropSchema, PlantCropInput } from '@molemisi/validation';

@Controller('farms/:farmId/plots')
@UseGuards(AuthGuard)
export class CropsController {
  constructor(private cropsService: CropsService) {}

  @Post(':plotId/plant')
  async plantCrop(
    @Param('farmId') farmId: string,
    @Param('plotId') plotId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const input = PlantCropSchema.parse(body) as PlantCropInput;
    const result = await this.cropsService.plantCrop(
      farmId,
      plotId,
      user.id,
      input.cropType,
      input.seedId,
    );
    return { success: true, data: result };
  }

  @Post(':plotId/water')
  async waterCrop(
    @Param('farmId') farmId: string,
    @Param('plotId') plotId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const result = await this.cropsService.waterCrop(farmId, plotId);
    return { success: true, data: result };
  }

  @Post(':plotId/harvest')
  async harvestCrop(
    @Param('farmId') farmId: string,
    @Param('plotId') plotId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const result = await this.cropsService.harvestCrop(farmId, plotId);
    return { success: true, data: result };
  }
}
