import { Module } from '@nestjs/common';
import { AntiCheatService } from './anti-cheat.service';
import { AntiCheatController } from './anti-cheat.controller';

/**
 * Anti-cheat is a cross-cutting concern: `SimulationService` and every economic
 * write path may want to record a rejected action, so the service is exported.
 * SupabaseService comes from the @Global DatabaseModule.
 */
@Module({
  controllers: [AntiCheatController],
  providers: [AntiCheatService],
  exports: [AntiCheatService],
})
export class AntiCheatModule {}
