import { Module } from '@nestjs/common';
import { EconomyService } from './economy.service';
import { EconomyController } from './economy.controller';

/**
 * Economy analysis. SupabaseService comes from the @Global DatabaseModule, so
 * no imports are required beyond the controller + provider registration.
 */
@Module({
  controllers: [EconomyController],
  providers: [EconomyService],
  exports: [EconomyService],
})
export class EconomyModule {}
