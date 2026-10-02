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
    StubPaymentProvider,
    {
      provide: 'PAYMENT_PROVIDER',
      // H3 (security audit 2026-10-02) — provider SELECTION with a production gate.
      //
      // The stub approves every webhook and marks every payment COMPLETED on
      // creation, so resolving it in production means real money is handled by a
      // provider that verifies nothing. Fail fast at BOOT rather than let a
      // misconfigured deploy quietly run with an open payment path.
      //
      // v1 ships only the stub; a real PSP adapter (Orange Money / Mascom / Stripe)
      // is selected here by PAYMENT_PROVIDER once B2 (PSP vs self-custody) is ruled.
      useFactory: (stub: StubPaymentProvider) => {
        const configured = (process.env.PAYMENT_PROVIDER ?? 'stub').toLowerCase();
        if (process.env.NODE_ENV === 'production' && configured === 'stub') {
          throw new Error(
            'Refusing to start: PAYMENT_PROVIDER resolves to the STUB in production. ' +
              'The stub approves every webhook unverified — set PAYMENT_PROVIDER to a ' +
              'real PSP adapter (and PAYMENT_WEBHOOK_SECRET) before deploying.',
          );
        }
        return stub;
      },
      inject: [StubPaymentProvider],
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
