import { Module } from '@nestjs/common';
import { AchievementController } from './achievements.controller';
import { AchievementService } from './achievements.service';
import { DatabaseModule } from '../database/database.module';

/**
 * D5 / B2 — the achievement + honorific-ladder feature module.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [AchievementController],
  providers: [AchievementService],
  exports: [AchievementService],
})
export class AchievementsModule {}
