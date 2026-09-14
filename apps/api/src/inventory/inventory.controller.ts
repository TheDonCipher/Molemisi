import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FarmsService } from '../farms/farms.service';

@Controller('farms/:farmId/inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private farmsService: FarmsService,
  ) {}

  @Get()
  async getInventory(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const playerId = await this.inventoryService.resolvePlayerId(farmId);
    const { items, usedSlots, slotCap } = await this.inventoryService.getInventory(playerId, farmId);
    return { success: true, data: { items, usedSlots, slotCap } };
  }
}
