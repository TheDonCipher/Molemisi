import { Module } from '@nestjs/common';
import { LivestockController } from './livestock.controller';
import { LivestockService } from './livestock.service';
import { DatabaseModule } from '../database/database.module';
import { FarmsModule } from '../farms/farms.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [DatabaseModule, FarmsModule, WalletModule],
  controllers: [LivestockController],
  providers: [LivestockService],
  exports: [LivestockService],
})
export class LivestockModule {}
