import { Controller, Get, Post, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { CropsService } from './crops.service';
import { FarmsService } from '../farms/farms.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/auth.guard';
import { PlantCropSchema, PlantCropInput, FertilizeCropSchema } from '@molemisi/validation';

@Controller('farms/:farmId/plots')
@UseGuards(AuthGuard)
export class CropsController {
  constructor(
    private cropsService: CropsService,
    private farmsService: FarmsService,
  ) {}

  @Get()
  async listPlots(
    @Param('farmId') farmId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, user.id);
    const plots = await this.cropsService.getFarmPlots(farmId);
    return { success: true, data: plots };
  }

  @Post(':plotId/plant')
  async plantCrop(
    @Param('farmId') farmId: string,
    @Param('plotId') plotId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, user.id);
    const parsed = PlantCropSchema.safeParse(body);
    if (!parsed.success) {
      // A validation failure is a client error, never a 500. Surface the first
      // issue so the player (and the web) gets a clean 400 instead of a stack trace.
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid plant request');
    }
    const input = parsed.data;
    const result = await this.cropsService.plantCrop(
      farmId,
      plotId,
      user.id,
      input.cropType,
      input.seedId,
    );
    return { success: true, data: result };
  }

  @Post(':plotId/fertilize')
  async fertilizePlot(
    @Param('farmId') farmId: string,
    @Param('plotId') plotId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, user.id);
    const parsed = FertilizeCropSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Invalid fertilize request',
      );
    }
    const result = await this.cropsService.fertilizePlot(
      farmId,
      plotId,
      parsed.data.fertilizerType,
      // A2 — the identity is threaded into the service so the item it consumes
      // is resolved from a CHECKED farm→player lookup.
      user.id,
    );
    return { success: true, data: result };
  }

  @Post(':plotId/harvest')
  async harvestCrop(
    @Param('farmId') farmId: string,
    @Param('plotId') plotId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, user.id);
    // A2 — the identity is threaded into the service so `collectCrop`'s
    // farm→player resolution is a CHECKED lookup, not a bare one.
    const result = await this.cropsService.harvestCrop(farmId, plotId, user.id);
    return { success: true, data: result };
  }
}
