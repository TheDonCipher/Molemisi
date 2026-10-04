import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { DatabaseModule } from '../database/database.module';
import { FarmsModule } from '../farms/farms.module';
import { InventoryModule } from '../inventory/inventory.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  // WalletModule is REQUIRED: ContractsService injects WalletService as its
  // third constructor arg to pay the contract reward. Without this import the
  // whole API fails to boot with "can't resolve dependencies of the
  // ContractsService". Nothing caught it because the unit specs construct the
  // service directly and therefore bypass the module graph entirely — only a
  // real `nest start` exercises DI.
  imports: [DatabaseModule, FarmsModule, InventoryModule, WalletModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
