import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
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
import { KgotlaModule } from './kgotla/kgotla.module';
import { BushveldModule } from './bushveld/bushveld.module';
import { WorldEventsModule } from './world-events/world-events.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GameConfigModule } from './config/config.module';
import { WalletModule } from './wallet/wallet.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CraftingModule } from './crafting/crafting.module';
import { WaterModule } from './water/water.module';
import { ProgressionModule } from './progression/progression.module';
import { ChapterModule } from './chapters/chapter.module';
import { MonetisationModule } from './monetisation/monetisation.module';
import { DevModule } from './dev/dev.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Molemisi is a pnpm monorepo: `turbo dev` runs the API from apps/api, so
      // the repo-root .env (the single source of truth for secrets) is NOT
      // auto-loaded. Point at it explicitly, preferring a local apps/api/.env
      // override if one ever exists.
      envFilePath: [
        path.resolve(__dirname, '../.env'),
        path.resolve(__dirname, '../../../.env'),
      ],
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
    KgotlaModule,
    BushveldModule,
    WorldEventsModule,
    PaymentsModule,
    AdminModule,
    AnalyticsModule,
    GameConfigModule,
    NotificationsModule,
    WalletModule,
    CraftingModule,
    WaterModule,
    ProgressionModule,
    ChapterModule,
    MonetisationModule,
    DevModule,
  ],
})
export class AppModule {}
