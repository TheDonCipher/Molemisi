import { Controller, Get, Post, Param, Body, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { CraftingService } from './crafting.service';
import { InventoryService } from '../inventory/inventory.service';
import { FarmsService } from '../farms/farms.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * A2 (security audit 2026-10-03) — every handler here now VERIFIES OWNERSHIP
 * before it resolves anything.
 *
 * The bug this replaces was on all four routes, and it was not subtle: each one
 * read `const playerId = await this.inventoryService.resolvePlayerId(farmId);`
 * and then executed `void userId;` on the very next line. The JWT identity was
 * resolved from the decorator and immediately discarded, so the `:farmId` path
 * parameter was the only thing that decided whose inventory got spent. Any
 * authenticated player could `POST /farms/<anyone's farmId>/crafting/start` and
 * consume a stranger's wood, stone and Pula fee — an IDOR across the whole
 * crafting surface, reachable by one authenticated request with no tooling.
 *
 * Two layers, deliberately:
 *   1. `verifyFarmOwnership(farmId, userId)` FIRST, before any resolution. This
 *      is the explicit guard the other controllers (water, crops, inventory)
 *      already use, and it fails with a clear 403/404.
 *   2. `resolvePlayerId(farmId, userId)` now takes the expected userId and
 *      refuses to resolve a farm owned by anyone else, so even a future handler
 *      that forgets step 1 cannot reach another tenant's inventory.
 *
 * Belt and braces is the point: layer 2 is what stops this class of bug from
 * being reintroduced one route at a time.
 */
@Controller('farms/:farmId/crafting')
@UseGuards(AuthGuard)
export class CraftingController {
  constructor(
    private craftingService: CraftingService,
    private inventoryService: InventoryService,
    // forwardRef: CraftingController lives in CraftingModule, which imports
    // FarmsModule lazily (see crafting.module.ts) because FarmsService needs
    // SimulationService, which lives behind the same cycle. The token is
    // resolved after the cycle settles, so this injection must be wrapped too —
    // the same pattern water.controller.ts uses.
    @Inject(forwardRef(() => FarmsService))
    private farmsService: FarmsService,
  ) {}

  @Get()
  async getRecipes(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const playerId = await this.inventoryService.resolvePlayerId(farmId, userId);
    // `slots` travels with the recipes because the screen always needs both, and
    // the slot count is the server's number (03 §3.1 — it swings income tenfold).
    const [recipes, slots] = await Promise.all([
      this.craftingService.getRecipes(playerId),
      this.craftingService.unlockedSlots(farmId),
    ]);
    return { success: true, data: { recipes, slots } };
  }

  @Get('jobs')
  async listJobs(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const playerId = await this.inventoryService.resolvePlayerId(farmId, userId);
    return { success: true, data: { jobs: await this.craftingService.listJobs(playerId) } };
  }

  @Post('start')
  async startCraft(
    @Param('farmId') farmId: string,
    @CurrentUser('id') userId: string,
    @Body('recipeSlug') recipeSlug: string,
    @Body('qty') qty: number,
    @Body('chosenInputs') chosenInputs?: Record<string, number>,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const playerId = await this.inventoryService.resolvePlayerId(farmId, userId);
    const result = await this.craftingService.startCraft(playerId, farmId, recipeSlug, qty, chosenInputs);
    return { success: true, data: result };
  }

  @Post(':jobId/collect')
  async collectCraft(
    @Param('farmId') farmId: string,
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const playerId = await this.inventoryService.resolvePlayerId(farmId, userId);
    const result = await this.craftingService.collectCraft(playerId, farmId, jobId);
    return { success: true, data: result };
  }
}
