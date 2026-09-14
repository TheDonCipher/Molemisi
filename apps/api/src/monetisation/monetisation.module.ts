import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WalletModule } from '../wallet/wallet.module';
import { StoreService } from './store.service';
import { MonetisationService } from './monetisation.service';
import { MonetisationController } from './monetisation.controller';

@Module({
  imports: [DatabaseModule, WalletModule],
  controllers: [MonetisationController],
  providers: [StoreService, MonetisationService],
  exports: [StoreService, MonetisationService],
})
export class MonetisationModule {}
