/**
 * Payment Provider Abstraction
 *
 * ADR-008: Payment Provider Abstraction
 *
 * All payment providers must implement this interface.
 * The game economy never trusts client-side payment state.
 * Payment completion is always verified server-side through webhooks/callbacks.
 */

export interface CreatePaymentRequest {
  /** Unique idempotency key to prevent duplicate payments */
  idempotencyKey: string;
  /** Player profile UUID */
  playerId: string;
  /** Player email for receipt */
  playerEmail: string;
  /** Amount in smallest currency unit (e.g., cents) */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Description of what the player is purchasing */
  description: string;
  /** Product SKU(s) being purchased */
  productSkus: string[];
  /** Optional metadata to pass through to provider */
  metadata?: Record<string, string>;
}

export interface CreatePaymentResponse {
  /** Provider-specific payment ID */
  providerPaymentId: string;
  /** URL to redirect the player to for payment completion */
  redirectUrl?: string;
  /** Status of the payment */
  status: PaymentStatus;
  /** Client secret for frontend payment form if applicable */
  clientSecret?: string;
}

export interface PaymentWebhookEvent {
  /** Provider-specific event type */
  eventType: string;
  /** Provider-specific payment ID */
  providerPaymentId: string;
  /** Current status */
  status: PaymentStatus;
  /** Amount in smallest currency unit */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Raw event payload for logging */
  rawPayload: Record<string, unknown>;
  /** Signature for verification */
  signature?: string;
}

export interface VerifyPaymentResponse {
  /** Whether the payment was successfully verified */
  verified: boolean;
  /** Verified status */
  status: PaymentStatus;
  /** Verified amount */
  amount: number;
  /** Verified currency */
  currency: string;
}

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface RefundPaymentRequest {
  /** Provider-specific payment ID to refund */
  providerPaymentId: string;
  /** Amount to refund (null = full refund) */
  amount?: number;
  /** Reason for refund */
  reason: string;
}

export interface RefundPaymentResponse {
  /** Whether the refund was initiated */
  success: boolean;
  /** Provider-specific refund ID */
  providerRefundId?: string;
  /** New status after refund */
  status: PaymentStatus;
}

/**
 * Every payment provider must implement this interface.
 *
 * Example providers:
 * - StripeProvider (cards, mobile money via Stripe)
 * - OrangeMoneyProvider (Orange Money mobile payments)
 * - MascomProvider (Mascom mobile money)
 * - StubProvider (development/testing — always succeeds)
 */
export interface PaymentProvider {
  /** Unique provider identifier */
  readonly name: string;

  /** Create a new payment */
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;

  /** Verify a payment via webhook event */
  verifyWebhookEvent(event: PaymentWebhookEvent): Promise<boolean>;

  /** Get the verified payment details from a webhook */
  getPaymentStatus(providerPaymentId: string): Promise<VerifyPaymentResponse>;

  /** Initiate a refund */
  refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResponse>;

  /** Check if this provider is configured and available */
  isAvailable(): boolean;
}
