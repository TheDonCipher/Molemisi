import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { WalletModule } from '../wallet/wallet.module';
import { FarmsModule } from '../farms/farms.module';

@Module({
  imports: [WalletModule, FarmsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
