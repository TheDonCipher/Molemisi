import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BushveldService } from './bushveld.service';
import { FarmsService } from '../farms/farms.service';

/**
 * P6 — The Bushveld (05 §P6; 04 §11 API).
 *
 * Routes are farm-scoped because collecting banks items into the farm's canonical
 * inventory, but the standing the Bushveld reads (Botho for scene unlocks, Kagiso
 * per scene) is the player's — so every method is ownership-guarded on the farm and
 * then reads player-scoped state. The client never supplies quantity, rarity or reward.
 */
@Controller('farms/:farmId/bushveld')
@UseGuards(AuthGuard)
export class BushveldController {
  constructor(
    private bushveldService: BushveldService,
    private farmsService: FarmsService,
  ) {}

  @Get('scenes')
  async listScenes(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const data = await this.bushveldService.listScenes(userId);
    return { success: true, data };
  }

  @Get('scenes/:sceneId')
  async getScene(
    @Param('farmId') farmId: string,
    @Param('sceneId') sceneId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const data = await this.bushveldService.getScene(userId, sceneId);
    return { success: true, data };
  }

  @Post('hotspots/:hotspotId/collect')
  async collect(
    @Param('farmId') farmId: string,
    @Param('hotspotId') hotspotId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const data = await this.bushveldService.collect(userId, farmId, hotspotId);
    return { success: true, data };
  }
}
