import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/auth.guard';

@Controller('farms/:farmId/inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  async getInventory(
    @Param('farmId') farmId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const result = await this.inventoryService.getInventory(farmId);
    return { success: true, data: { inventory: result } };
  }
}
