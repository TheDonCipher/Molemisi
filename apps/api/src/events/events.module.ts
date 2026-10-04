import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { InventoryModule } from '../inventory/inventory.module';
import { ChapterModule } from '../chapters/chapter.module';

/**
 * D6 / D8 / B3 — the Events live-service module.
 *
 * Depends on InventoryService (to grant the goods) and ChapterService (to award
 * Chapter Tokens through the one sanctioned award path, so the P8 rollover stays
 * the sole owner of token expiry).
 */
@Module({
  imports: [InventoryModule, ChapterModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
