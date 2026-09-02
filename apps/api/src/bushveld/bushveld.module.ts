import { Module } from '@nestjs/common';
import { BushveldController } from './bushveld.controller';
import { BushveldService } from './bushveld.service';
import { DatabaseModule } from '../database/database.module';
import { FarmsModule } from '../farms/farms.module';

@Module({
  imports: [DatabaseModule, FarmsModule],
  controllers: [BushveldController],
  providers: [BushveldService],
  exports: [BushveldService],
})
export class BushveldModule {}
