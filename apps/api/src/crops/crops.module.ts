import { Module } from '@nestjs/common';
import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';
import { FarmsModule } from '../farms/farms.module';
import { InventoryModule } from '../inventory/inventory.module';
import { WaterModule } from '../water/water.module';
import { WalletModule } from '../wallet/wallet.module';
import { LetsemaController } from './letsema.controller';

@Module({
  imports: [FarmsModule, InventoryModule, WaterModule, WalletModule],
  controllers: [CropsController, LetsemaController],
  providers: [CropsService],
  exports: [CropsService],
})
export class CropsModule {}
