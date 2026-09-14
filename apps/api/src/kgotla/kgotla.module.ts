import { Module } from '@nestjs/common';
import { KgotlaController } from './kgotla.controller';
import { KgotlaService } from './kgotla.service';
import { DatabaseModule } from '../database/database.module';
import { FarmsModule } from '../farms/farms.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [DatabaseModule, FarmsModule, WalletModule],
  controllers: [KgotlaController],
  providers: [KgotlaService],
  exports: [KgotlaService],
})
export class KgotlaModule {}
