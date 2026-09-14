import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { WaterModule } from '../water/water.module';

@Module({
  imports: [WaterModule],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
