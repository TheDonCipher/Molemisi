import { Module } from '@nestjs/common';
import { WaterController } from './water.controller';
import { WaterService } from './water.service';
import { FarmsModule } from '../farms/farms.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [FarmsModule, WalletModule],
  controllers: [WaterController],
  providers: [WaterService],
  exports: [WaterService],
})
export class WaterModule {}
