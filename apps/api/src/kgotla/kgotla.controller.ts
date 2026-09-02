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
import { KgotlaService } from './kgotla.service';
import { FarmsService } from '../farms/farms.service';

@Controller('api/v1/farms/:farmId/kgotla')
@UseGuards(AuthGuard)
export class KgotlaController {
  constructor(
    private kgotlaService: KgotlaService,
    private farmsService: FarmsService,
  ) {}

  @Get('npcs')
  async getNPCs(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.kgotlaService.getNPCs(farmId);
  }

  @Post('npcs/:npcId/talk')
  async talkToNPC(
    @Param('farmId') farmId: string,
    @Param('npcId') npcId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.kgotlaService.talkToNPC(farmId, userId, npcId);
  }

  @Post('npcs/:npcId/quest')
  async completeQuest(
    @Param('farmId') farmId: string,
    @Param('npcId') npcId: string,
    @CurrentUser('userId') userId: string,
    @Body('questType') questType: string,
  ) {
    return this.kgotlaService.completeQuest(farmId, userId, npcId, questType);
  }

  @Get('projects')
  async getProjects(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.kgotlaService.getProjects(farmId);
  }

  @Post('projects/:projectId/donate')
  async donateToProject(
    @Param('farmId') farmId: string,
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
    @Body('amount') amount: number,
  ) {
    return this.kgotlaService.donateToProject(farmId, userId, projectId, amount);
  }
}
