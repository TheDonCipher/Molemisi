import { Module } from '@nestjs/common';
import { ProgressionController } from './progression.controller';
import { ProgressionService } from './progression.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
