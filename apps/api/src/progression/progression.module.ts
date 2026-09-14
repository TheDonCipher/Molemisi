import { Module } from '@nestjs/common';
import { ProgressionController } from './progression.controller';
import { ProgressionService } from './progression.service';
import { DatabaseModule } from '../database/database.module';
import { WalletModule } from '../wallet/wallet.module';
import { WaterModule } from '../water/water.module';
import { CraftingModule } from '../crafting/crafting.module';
import { FarmsModule } from '../farms/farms.module';

@Module({
  imports: [DatabaseModule, WalletModule, WaterModule, CraftingModule, FarmsModule],
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
