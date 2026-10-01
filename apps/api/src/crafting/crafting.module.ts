import { Module } from '@nestjs/common';
import { CraftingController } from './crafting.controller';
import { CraftingService } from './crafting.service';
import { InventoryModule } from '../inventory/inventory.module';
import { WalletModule } from '../wallet/wallet.module';
import { MarketModule } from '../market/market.module';

@Module({
  imports: [InventoryModule, WalletModule, MarketModule],
  controllers: [CraftingController],
  providers: [CraftingService],
  exports: [CraftingService],
})
export class CraftingModule {}
