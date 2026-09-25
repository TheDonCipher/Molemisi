import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ProgressionService } from './progression.service';
import { BushveldService } from '../bushveld/bushveld.service';
import { FarmsService } from '../farms/farms.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * P5 — `GET /progression` (05 §P5; 06 P5 checklist).
 *
 * Deliberately flat rather than farm-scoped: standing belongs to the player, not
 * to a farm, and Botho must survive anything that happens to the farm. The Elder
 * and the scene list do read farm state, so those resolve the caller's farm first.
 */
@Controller('progression')
@UseGuards(AuthGuard)
export class ProgressionController {
  constructor(
    private progressionService: ProgressionService,
    private bushveldService: BushveldService,
    private farmsService: FarmsService,
  ) {}

  @Get()
  async getProgression(@CurrentUser('id') userId: string) {
    const data = await this.progressionService.getProgression(userId);
    return { success: true, data };
  }

  @Get('elder')
  async getElder(@CurrentUser('id') userId: string) {
    // getFarmForUser returns { farm, plots } — the id lives one level down, and it
    // throws NotFound when the player has no farm, so no null branch is needed.
    const farm = await this.farmsService.getFarmForUser(userId);
    const data = await this.progressionService.getElderGuidance(farm.farm.id);
    return { success: true, data };
  }

  @Get('scenes')
  async getScenes(@CurrentUser('id') userId: string) {
    const data = await this.progressionService.getSceneAccess(userId);
    return { success: true, data };
  }

  /** Farm-scoped variant, for clients that already know the farm id. */
  @Get('farm/:farmId/elder')
  async getElderForFarm(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const data = await this.progressionService.getElderGuidance(farmId);
    return { success: true, data };
  }

  /**
   * Doc 11 §2 — Tsholofelo's appearance for the Farm dock (server side).
   * The client renders the perch + speech line from this, never from its own
   * Kagiso math.
   */
  @Get('farm/:farmId/tsholofelo')
  async getTsholofelo(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const data = await this.bushveldService.getTsholofeloStatus(farmId, userId);
    return { success: true, data };
  }

  /**
   * Doc 11 §2 — The Gift. Once per Botswana day while perched. Repeat claims
   * the same day are a no-op (claimed:false), never an error.
   */
  @Post('farm/:farmId/tsholofelo/gift')
  async claimTsholofeloGift(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const data = await this.bushveldService.claimTsholofeloBlessing(farmId, userId);
    return { success: true, data };
  }
}
