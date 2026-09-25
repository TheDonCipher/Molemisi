import { Module } from '@nestjs/common';
import { KgotlaController } from './kgotla.controller';
import { KgotlaService } from './kgotla.service';
import { DatabaseModule } from '../database/database.module';
import { FarmsModule } from '../farms/farms.module';
import { WalletModule } from '../wallet/wallet.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ChapterModule } from '../chapters/chapter.module';

@Module({
  // Inventory + Chapters are new here: charges are settled against the bag
  // (errands are consumed at turn-in) and pay Chapter Tokens (02 §3.3).
  imports: [DatabaseModule, FarmsModule, WalletModule, InventoryModule, ChapterModule],
  controllers: [KgotlaController],
  providers: [KgotlaService],
  exports: [KgotlaService],
})
export class KgotlaModule {}
