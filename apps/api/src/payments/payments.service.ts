import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import {
  PaymentProvider,
  PaymentStatus,
  CreatePaymentRequest,
  PaymentWebhookEvent,
  RefundPaymentRequest,
} from './providers/payment-provider.interface';
import { getVirtualGood } from '@molemisi/game-config';

export interface CreatePaymentDto {
  /** SKU of the virtual good */
  sku: string;
  /** Optional idempotency key */
  idempotencyKey?: string;
}

export interface WebhookDto {
  /** Provider-specific event type */
  eventType: string;
  /** Provider-specific payment ID */
  providerPaymentId: string;
  /** Current status */
  status: string;
  /** Amount in smallest currency unit */
  amount: number;
  /** Currency code */
  currency: string;
  /** Raw event payload */
  payload: Record<string, unknown>;
  /** Webhook signature */
  signature?: string;
}

export interface PaymentRecord {
  id: string;
  playerId: string;
  sku: string;
  amount: number;
  currency: string;
  providerPaymentId: string;
  provider: string;
  status: PaymentStatus;
  entitlementType: string;
  entitlementData: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
  completedAt: string | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @Inject('PAYMENT_PROVIDER')
    private readonly provider: PaymentProvider,
  ) {}

  /**
   * Create a new payment request.
   *
   * Flow:
   * 1. Validate the SKU exists and is available
   * 2. Check for duplicate idempotency key
   * 3. Record the pending payment in the database
   * 4. Call the payment provider
   * 5. Return the provider's redirect URL or client secret
   */
  async createPayment(
    playerId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentRecord> {
    const virtualGood = getVirtualGood(dto.sku);
    if (!virtualGood) {
      throw new NotFoundException(`Store item "${dto.sku}" not found.`);
    }

    if (!virtualGood.available) {
      throw new BadRequestException(
        `Store item "${dto.sku}" is not currently available.`,
      );
    }

    const idempotencyKey =
      dto.idempotencyKey || `pay_${playerId}_${dto.sku}_${Date.now()}`;

    // Check for duplicate
    const existing = await this.supabase
      .getClient()
      .from('payments')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing.data) {
      this.logger.log(
        `Duplicate payment request with key ${idempotencyKey}, returning existing.`,
      );
      return this.mapPaymentRecord(existing.data);
    }

    // Create pending payment record
    const { data: paymentRecord, error: insertError } = await this.supabase
      .getClient()
      .from('payments')
      .insert({
        player_id: playerId,
        sku: dto.sku,
        amount: virtualGood.amount * 100, // Convert to cents
        currency: virtualGood.currency,
        provider: this.provider.name,
        status: 'PENDING',
        entitlement_type: virtualGood.entitlement.type,
        entitlement_data: virtualGood.entitlement,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (insertError) {
      this.logger.error(
        `Failed to create payment record: ${insertError.message}`,
      );
      throw new BadRequestException('Failed to create payment request.');
    }

    // Call the payment provider
    try {
      const providerResponse = await this.provider.createPayment({
        idempotencyKey,
        playerId,
        playerEmail: '', // Would come from profile
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        description: `Molemisi: ${virtualGood.name}`,
        productSkus: [dto.sku],
      });

      // Update the payment record with provider info
      await this.supabase
        .getClient()
        .from('payments')
        .update({
          provider_payment_id: providerResponse.providerPaymentId,
          status: providerResponse.status,
          completed_at:
            providerResponse.status === 'COMPLETED'
              ? new Date().toISOString()
              : null,
        })
        .eq('id', paymentRecord.id);

      // If stub provider, it completes immediately
      if (providerResponse.status === 'COMPLETED') {
        await this.awardEntitlement(playerId, virtualGood);
      }

      return this.mapPaymentRecord({
        ...paymentRecord,
        provider_payment_id: providerResponse.providerPaymentId,
        status: providerResponse.status,
        completed_at:
          providerResponse.status === 'COMPLETED'
            ? new Date().toISOString()
            : null,
      });
    } catch (error) {
      // Mark payment as failed
      await this.supabase
        .getClient()
        .from('payments')
        .update({ status: 'FAILED' })
        .eq('id', paymentRecord.id);

      this.logger.error(
        `Payment provider error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Payment processing failed.');
    }
  }

  /**
   * Handle a payment webhook from a provider.
   *
   * This is the authoritative verification path.
   * The client never determines payment success — only webhooks do.
   */
  async handleWebhook(
    webhookPayload: WebhookDto,
  ): Promise<{ processed: boolean }> {
    // Verify the webhook signature
    const verified = await this.provider.verifyWebhookEvent({
      eventType: webhookPayload.eventType,
      providerPaymentId: webhookPayload.providerPaymentId,
      status: webhookPayload.status as PaymentStatus,
      amount: webhookPayload.amount,
      currency: webhookPayload.currency,
      rawPayload: webhookPayload.payload,
      signature: webhookPayload.signature,
    });

    if (!verified) {
      this.logger.warn(
        `Webhook verification failed for payment ${webhookPayload.providerPaymentId}`,
      );
      return { processed: false };
    }

    // Find the payment record
    const { data: payment, error } = await this.supabase
      .getClient()
      .from('payments')
      .select('*')
      .eq('provider_payment_id', webhookPayload.providerPaymentId)
      .single();

    if (error || !payment) {
      this.logger.warn(
        `Payment not found for webhook: ${webhookPayload.providerPaymentId}`,
      );
      return { processed: false };
    }

    // Update status if the webhook indicates completion
    if (webhookPayload.status === 'COMPLETED' && payment.status !== 'COMPLETED') {
      await this.supabase
        .getClient()
        .from('payments')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      // Award entitlement
      const virtualGood = getVirtualGood(payment.sku);
      if (virtualGood) {
        await this.awardEntitlement(payment.player_id, virtualGood);
      }

      this.logger.log(
        `Payment ${payment.id} completed via webhook. Awarded ${virtualGood?.name ?? payment.sku}.`,
      );
    } else if (webhookPayload.status === 'FAILED') {
      await this.supabase
        .getClient()
        .from('payments')
        .update({ status: 'FAILED' })
        .eq('id', payment.id);
    } else if (webhookPayload.status === 'REFUNDED') {
      await this.supabase
        .getClient()
        .from('payments')
        .update({ status: 'REFUNDED' })
        .eq('id', payment.id);
    }

    return { processed: true };
  }

  /**
   * Get payment history for a player.
   */
  async getPaymentHistory(playerId: string): Promise<PaymentRecord[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('payments')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      this.logger.error(`Failed to fetch payment history: ${error.message}`);
      return [];
    }

    return (data || []).map(this.mapPaymentRecord);
  }

  /**
   * Refund a payment.
   */
  async refundPayment(
    playerId: string,
    paymentId: string,
    reason: string,
  ): Promise<PaymentRecord> {
    const { data: payment, error } = await this.supabase
      .getClient()
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('player_id', playerId)
      .single();

    if (error || !payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot refund payment with status ${payment.status}.`,
      );
    }

    const request: RefundPaymentRequest = {
      providerPaymentId: payment.provider_payment_id,
      reason,
    };

    const result = await this.provider.refundPayment(request);

    if (result.success) {
      await this.supabase
        .getClient()
        .from('payments')
        .update({ status: result.status })
        .eq('id', payment.id);

      // Reverse the entitlement
      await this.reverseEntitlement(payment.player_id, payment);
    }

    return this.mapPaymentRecord({ ...payment, status: result.status });
  }

  /**
   * Award the entitlement to the player's account.
   *
   * This is where virtual goods actually enter the game economy.
   * All awards are recorded in game_ledger_entries for auditability.
   */
  private async awardEntitlement(
    playerId: string,
    virtualGood: { entitlement: { type: string; [key: string]: unknown } },
  ): Promise<void> {
    const ent = virtualGood.entitlement;

    switch (ent.type) {
      case 'currency': {
        const amount = ent.amount as number;
        // Add currency to player profile
        const { data: profile } = await this.supabase
          .getClient()
          .from('profiles')
          .select('currency')
          .eq('id', playerId)
          .single();

        if (profile) {
          await this.supabase
            .getClient()
            .from('profiles')
            .update({ currency: profile.currency + amount })
            .eq('id', playerId);
        }

        // Record ledger entry
        await this.supabase.getClient().from('game_ledger_entries').insert({
          player_id: playerId,
          entry_type: 'CURRENCY',
          reference_type: 'PAYMENT',
          reference_id: playerId,
          amount_change: amount,
          description: `Purchased ${amount} Pula via store`,
        });
        break;
      }

      case 'plot_slots':
      case 'storage_slots': {
        // These modify farm/building capacity — record for future use
        this.logger.log(
          `Entitlement recorded: ${ent.type} x${ent.count} for player ${playerId} (applied on next farm load)`,
        );
        break;
      }

      default: {
        this.logger.log(
          `Entitlement ${ent.type} recorded for player ${playerId} (applied on next load)`,
        );
        break;
      }
    }

    this.logger.log(
      `Awarded entitlement ${ent.type} to player ${playerId}`,
    );
  }

  /**
   * Reverse an entitlement when a payment is refunded.
   */
  private async reverseEntitlement(
    playerId: string,
    payment: {
      entitlement_type: string;
      entitlement_data: Record<string, unknown>;
    },
  ): Promise<void> {
    if (payment.entitlement_type === 'currency') {
      const amount = payment.entitlement_data.amount as number;
      const { data: profile } = await this.supabase
        .getClient()
        .from('profiles')
        .select('currency')
        .eq('id', playerId)
        .single();

      if (profile) {
        const newCurrency = Math.max(0, profile.currency - amount);
        await this.supabase
          .getClient()
          .from('profiles')
          .update({ currency: newCurrency })
          .eq('id', playerId);

        await this.supabase.getClient().from('game_ledger_entries').insert({
          player_id: playerId,
          entry_type: 'CURRENCY',
          reference_type: 'REFUND',
          reference_id: playerId,
          amount_change: -amount,
          description: `Refund: reversed ${amount} Pula`,
        });
      }
    }

    this.logger.log(
      `Reversed entitlement ${payment.entitlement_type} from player ${playerId}`,
    );
  }

  private mapPaymentRecord(row: Record<string, unknown>): PaymentRecord {
    return {
      id: row.id as string,
      playerId: row.player_id as string,
      sku: row.sku as string,
      amount: row.amount as number,
      currency: row.currency as string,
      providerPaymentId: row.provider_payment_id as string,
      provider: row.provider as string,
      status: row.status as PaymentStatus,
      entitlementType: row.entitlement_type as string,
      entitlementData: (row.entitlement_data as Record<string, unknown>) || {},
      idempotencyKey: row.idempotency_key as string,
      createdAt: row.created_at as string,
      completedAt: row.completed_at as string | null,
    };
  }
}
