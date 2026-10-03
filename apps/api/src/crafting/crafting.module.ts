import { Module, forwardRef } from '@nestjs/common';
import { CraftingController } from './crafting.controller';
import { CraftingService } from './crafting.service';
import { InventoryModule } from '../inventory/inventory.module';
import { WalletModule } from '../wallet/wallet.module';
import { MarketModule } from '../market/market.module';
import { FarmsModule } from '../farms/farms.module';

@Module({
  // NOTE: FarmsModule is part of a circular dependency, and it is the SAME cycle
  // water.module.ts documents:
  //   FarmsModule -> SimulationModule -> WaterModule -> FarmsModule
  //   (and SimulationService is also reachable from the crafting side)
  // CraftingController needs FarmsService.verifyFarmOwnership (A2 — the cross-tenant
  // IDOR fix), and FarmsService needs SimulationService, which sits behind that
  // cycle. forwardRef breaks it at this back-edge so Nest can finish
  // instantiating FarmsModule before CraftingModule asks for FarmsService.
  // See also water.module.ts and crafting.controller.ts.
  imports: [forwardRef(() => FarmsModule), InventoryModule, WalletModule, MarketModule],
  controllers: [CraftingController],
  providers: [CraftingService],
  exports: [CraftingService],
})
export class CraftingModule {}
