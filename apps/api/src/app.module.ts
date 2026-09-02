import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { FarmsModule } from './farms/farms.module';
import { CropsModule } from './crops/crops.module';
import { InventoryModule } from './inventory/inventory.module';
import { MarketModule } from './market/market.module';
import { SimulationModule } from './simulation/simulation.module';
import { BuildingsModule } from './buildings/buildings.module';
import { LivestockModule } from './livestock/livestock.module';
import { ContractsModule } from './contracts/contracts.module';
import { ProgressionModule } from './progression/progression.module';
import { KgotlaModule } from './kgotla/kgotla.module';
import { BushveldModule } from './bushveld/bushveld.module';
import { WorldEventsModule } from './world-events/world-events.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    ProfileModule,
    FarmsModule,
    CropsModule,
    InventoryModule,
    MarketModule,
    SimulationModule,
    BuildingsModule,
    LivestockModule,
    ContractsModule,
    ProgressionModule,
    KgotlaModule,
    BushveldModule,
    WorldEventsModule,
  ],
})
export class AppModule {}
