import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { DatabaseModule } from '../database/database.module';
import { FarmsModule } from '../farms/farms.module';

@Module({
  imports: [DatabaseModule, FarmsModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
