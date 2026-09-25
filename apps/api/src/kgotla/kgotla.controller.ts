import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { KgotlaService } from './kgotla.service';
import { FarmsService } from '../farms/farms.service';

/**
 * BREAKING CHANGE (2026-09-23): `POST /npcs/:npcId/quest` is gone. It completed a
 * "quest" instantly and paid 50 Pula per call with no objective, no cooldown and no
 * cap — an unbounded faucet (SPEC §5.4). The loop is now
 * offer → `accept` → objective (elsewhere) → `turn-in`.
 */
@Controller('farms/:farmId/kgotla')
@UseGuards(AuthGuard)
export class KgotlaController {
  constructor(
    private kgotlaService: KgotlaService,
    private farmsService: FarmsService,
  ) {}

  @Get('npcs')
  async getNPCs(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.kgotlaService.getNPCs(farmId, userId);
  }

  /** The charge board: today's shared pool and every elder's charge state (AC-16). */
  @Get('charges')
  async getCharges(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.kgotlaService.getChargeBoard(farmId, userId);
  }

  @Post('npcs/:npcId/talk')
  async talkToNPC(
    @Param('farmId') farmId: string,
    @Param('npcId') npcId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.kgotlaService.talkToNPC(farmId, userId, npcId);
  }

  /** Accept a charge — spends one slot of today's shared pool (AC-02). */
  @Post('npcs/:npcId/accept')
  async acceptCharge(
    @Param('farmId') farmId: string,
    @Param('npcId') npcId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.kgotlaService.acceptCharge(farmId, userId, npcId);
  }

  /** Turn in a charge — verified against state recorded outside the Kgotla (AC-03). */
  @Post('npcs/:npcId/turn-in')
  async turnInCharge(
    @Param('farmId') farmId: string,
    @Param('npcId') npcId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.kgotlaService.turnInCharge(farmId, userId, npcId);
  }

  /** Projects plus today's contribution allowance, so the cap is visible up front (AC-07). */
  @Get('projects')
  async getProjects(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.kgotlaService.getProjectsView(farmId, userId);
  }

  @Post('projects/:projectId/donate')
  async donateToProject(
    @Param('farmId') farmId: string,
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @Body('amount') amount: number,
  ) {
    return this.kgotlaService.donateToProject(farmId, userId, projectId, amount);
  }
  /**
   * Doc 11 - Village Feast donation (docs/Molemisi LORE FINAL.txt 4). 20 Watermelons
   * in; capped Botho and a permanent cosmetic out; and deliberately NO Pula -
   * sharing is a social act (Botho, I4-capped), never an economic one.
   */
  @Post('village-feast')
  async donateVillageFeast(
    @Param('farmId') farmId: string,
    @CurrentUser('id') userId: string,
    @Body('cropType') cropType = 'watermelon',
    @Body('quantity') quantity = 20,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.kgotlaService.donateVillageFeast(farmId, userId, cropType, quantity);
  }

  /** Doc 11 §4 — feast standing: fence owned? Friend of the Feast? (read-only) */
  @Get('feast-status')
  async getFeastStatus(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.kgotlaService.getFeastStatus(userId);
  }
}
