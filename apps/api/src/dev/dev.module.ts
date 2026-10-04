import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';
import { ClockService } from '../common/clock.service';
import { WalletModule } from '../wallet/wallet.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ChapterModule } from '../chapters/chapter.module';

/**
 * DevModule — the in-game dev tooling (D9 / W10).
 *
 * SupabaseService comes from the global DatabaseModule. It now also owns the
 * offset-aware `ClockService`, which is what the date-jump tool moves; the
 * inventory and chapter modules are imported so the tools reuse the SANCTIONED
 * writers rather than opening a second path onto `player_inventory`, wallets or
 * chapter tokens.
 */
@Module({
  imports: [WalletModule, InventoryModule, ChapterModule],
  controllers: [DevController],
  providers: [DevService, ClockService],
  exports: [ClockService],
})
export class DevModule {}
