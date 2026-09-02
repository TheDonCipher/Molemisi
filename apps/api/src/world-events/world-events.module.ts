import { Module } from '@nestjs/common';
import { WorldEventsController } from './world-events.controller';
import { WorldEventsService } from './world-events.service';
import { DatabaseModule } from '../database/database.module';
import { FarmsModule } from '../farms/farms.module';

@Module({
  imports: [DatabaseModule, FarmsModule],
  controllers: [WorldEventsController],
  providers: [WorldEventsService],
  exports: [WorldEventsService],
})
export class WorldEventsModule {}
