import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';

/**
 * DevModule — the separate /dev tooling area for developer accounts.
 * SupabaseService comes from the global DatabaseModule.
 */
@Module({
  controllers: [DevController],
})
export class DevModule {}
