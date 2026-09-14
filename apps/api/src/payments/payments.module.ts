import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StubPaymentProvider } from './providers/stub.provider';
import { DatabaseModule } from '../database/database.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [DatabaseModule, WalletModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: 'PAYMENT_PROVIDER',
      useClass: StubPaymentProvider,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
