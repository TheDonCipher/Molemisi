import { Module } from '@nestjs/common';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
