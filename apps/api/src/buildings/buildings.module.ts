import { Module } from '@nestjs/common';
import { BuildingsController } from './buildings.controller';
import { StorageController } from './storage.controller';
import { BuildingsService } from './buildings.service';
import { DatabaseModule } from '../database/database.module';
import { FarmsModule } from '../farms/farms.module';
import { WalletModule } from '../wallet/wallet.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [DatabaseModule, FarmsModule, WalletModule, InventoryModule],
  controllers: [BuildingsController, StorageController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
