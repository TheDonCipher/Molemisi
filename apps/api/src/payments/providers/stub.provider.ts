import { Injectable, Logger } from '@nestjs/common';
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
    this.logger.log(
      `STUB: Verifying webhook event ${event.eventType} for ` +
        `payment ${event.providerPaymentId}`,
    );
    // In dev, all webhooks are trusted
    return true;
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
