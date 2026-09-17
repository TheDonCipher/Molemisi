import { Module, forwardRef } from '@nestjs/common';
import { WaterController } from './water.controller';
import { WaterService } from './water.service';
import { FarmsModule } from '../farms/farms.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  // NOTE: FarmsModule is part of a 3-hop circular dependency:
  //   FarmsModule -> SimulationModule -> WaterModule -> FarmsModule
  // (WaterController needs FarmsService.verifyFarmOwnership, FarmsService needs
  // SimulationService, SimulationService needs WaterService.) forwardRef breaks the
  // cycle at this back-edge so Nest can finish instantiating FarmsModule before
  // WaterModule asks for FarmsService. See also water.controller.ts.
  imports: [forwardRef(() => FarmsModule), WalletModule],
  controllers: [WaterController],
  providers: [WaterService],
  exports: [WaterService],
})
export class WaterModule {}
