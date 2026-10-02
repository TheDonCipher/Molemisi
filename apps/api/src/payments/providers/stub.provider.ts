import { Injectable, Logger } from '@nestjs/common';
import { verifyHmacSignature } from './webhook-signature';
import {
  PaymentProvider,
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentWebhookEvent,
  VerifyPaymentResponse,
  RefundPaymentRequest,
  RefundPaymentResponse,
} from './payment-provider.interface';

/**
 * Stub payment provider for development and testing.
 *
 * All payments succeed immediately. No real money is involved.
 * This provider is always available and requires no credentials.
 */
@Injectable()
export class StubPaymentProvider implements PaymentProvider {
  readonly name = 'stub';
  private readonly logger = new Logger(StubPaymentProvider.name);

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    this.logger.log(
      `STUB: Creating payment for player ${request.playerId}, ` +
        `amount ${request.amount} ${request.currency}, ` +
        `products: ${request.productSkus.join(', ')}`,
    );

    return {
      providerPaymentId: `stub_${Date.now()}_${request.idempotencyKey.slice(0, 8)}`,
      status: 'COMPLETED',
      redirectUrl: undefined,
      clientSecret: undefined,
    };
  }

  async verifyWebhookEvent(event: PaymentWebhookEvent): Promise<boolean> {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    const verdict = verifyHmacSignature(event.rawPayload, event.signature, secret);

    if (verdict.ok) {
      this.logger.log(
        `STUB: verified webhook ${event.eventType} for payment ${event.providerPaymentId}`,
      );
      return true;
    }

    // H3 (security audit 2026-10-02) — this method used to `return true`
    // unconditionally. POST /payments/webhook is unauthenticated by design (the
    // provider calls it), so an always-true verifier made it an open door: anyone
    // could POST a forged COMPLETED event for any provider_payment_id and be
    // credited. The module now refuses to BOOT this stub when NODE_ENV=production,
    // so the unverified branch below is only reachable in development, where the
    // simulator and local runs need it. Production must configure a real provider
    // with PAYMENT_WEBHOOK_SECRET.
    if (!secret && process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        'STUB: no PAYMENT_WEBHOOK_SECRET configured — accepting webhook UNVERIFIED ' +
          '(development only; production refuses to boot this provider).',
      );
      return true;
    }

    this.logger.error(
      `STUB: rejecting webhook for payment ${event.providerPaymentId} — ${verdict.reason}`,
    );
    return false;
  }

  async getPaymentStatus(providerPaymentId: string): Promise<VerifyPaymentResponse> {
    this.logger.log(`STUB: Checking status for payment ${providerPaymentId}`);

    return {
      verified: true,
      status: 'COMPLETED',
      amount: 0, // Stub doesn't track amounts
      currency: 'BWP',
    };
  }

  async refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResponse> {
    this.logger.log(`STUB: Refunding payment ${request.providerPaymentId} — ${request.reason}`);

    return {
      success: true,
      providerRefundId: `stub_refund_${Date.now()}`,
      status: 'REFUNDED',
    };
  }

  isAvailable(): boolean {
    return true; // Stub is always available
  }
}
