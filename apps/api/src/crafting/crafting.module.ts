import { Module } from '@nestjs/common';
import { CraftingController } from './crafting.controller';
import { CraftingService } from './crafting.service';
import { InventoryModule } from '../inventory/inventory.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [InventoryModule, WalletModule],
  controllers: [CraftingController],
  providers: [CraftingService],
  exports: [CraftingService],
})
export class CraftingModule {}
