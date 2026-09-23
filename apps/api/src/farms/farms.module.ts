import { Module } from '@nestjs/common';
import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { SimulationModule } from '../simulation/simulation.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [SimulationModule, WalletModule],
  controllers: [FarmsController],
  providers: [FarmsService],
  exports: [FarmsService],
})
export class FarmsModule {}
