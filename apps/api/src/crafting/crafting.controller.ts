import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { CraftingService } from './crafting.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('farms/:farmId/crafting')
@UseGuards(AuthGuard)
export class CraftingController {
  constructor(
    private craftingService: CraftingService,
    private inventoryService: InventoryService,
  ) {}

  @Get()
  async getRecipes(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    const playerId = await this.inventoryService.resolvePlayerId(farmId); // verifies farm
    void userId;
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
    const playerId = await this.inventoryService.resolvePlayerId(farmId);
    void userId;
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
    const playerId = await this.inventoryService.resolvePlayerId(farmId);
    void userId;
    const result = await this.craftingService.startCraft(playerId, farmId, recipeSlug, qty, chosenInputs);
    return { success: true, data: result };
  }

  @Post(':jobId/collect')
  async collectCraft(
    @Param('farmId') farmId: string,
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    const playerId = await this.inventoryService.resolvePlayerId(farmId);
    void userId;
    const result = await this.craftingService.collectCraft(playerId, farmId, jobId);
    return { success: true, data: result };
  }
}
