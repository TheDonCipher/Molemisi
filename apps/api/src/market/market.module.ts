import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { WalletModule } from '../wallet/wallet.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [WalletModule, InventoryModule],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}
