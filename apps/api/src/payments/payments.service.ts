import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import {
  PaymentProvider,
  PaymentStatus,
  RefundPaymentRequest,
} from './providers/payment-provider.interface';
import { getVirtualGood, DAILY_TOP_UP_CAP_BWP, TOP_UP_PACKS } from '@molemisi/game-config';
import { WalletService } from '../wallet/wallet.service';

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
    private readonly wallet: WalletService,
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
  async createPayment(playerId: string, dto: CreatePaymentDto): Promise<PaymentRecord> {
    const virtualGood = getVirtualGood(dto.sku);
    if (!virtualGood) {
      throw new NotFoundException(`Store item "${dto.sku}" not found.`);
    }

    if (!virtualGood.available) {
      throw new BadRequestException(`Store item "${dto.sku}" is not currently available.`);
    }

    // R4: refuse real-money top-ups that would breach the daily BWP cap *before*
    // any money moves. The webhook path cannot refuse — by the time it fires the
    // provider has already taken the cash, so it credits anyway and only alarms.
    // This create-time check is therefore the gate that actually prevents breaches;
    // it is scoped to BWP-priced goods, since Pula-priced cosmetics move no money.
    if (virtualGood.currency === 'BWP') {
      const alreadyToday = await this.wallet.topUpTotalToday(playerId);
      if (alreadyToday + virtualGood.price > DAILY_TOP_UP_CAP_BWP) {
        throw new BadRequestException(
          `Daily top-up cap of BWP ${DAILY_TOP_UP_CAP_BWP} reached ` +
            `(already BWP ${alreadyToday.toFixed(2)} today). Try again tomorrow.`,
        );
      }
    }

    const idempotencyKey = dto.idempotencyKey || `pay_${playerId}_${dto.sku}_${Date.now()}`;

    // Check for duplicate
    const existing = await this.supabase
      .getClient()
      .from('payments')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing.data) {
      this.logger.log(`Duplicate payment request with key ${idempotencyKey}, returning existing.`);
      return this.mapPaymentRecord(existing.data);
    }

    // Create pending payment record
    const { data: paymentRecord, error: insertError } = await this.supabase
      .getClient()
      .from('payments')
      .insert({
        player_id: playerId,
        sku: dto.sku,
        amount: virtualGood.price * 100, // Convert to cents
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
      this.logger.error(`Failed to create payment record: ${insertError.message}`);
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
          completed_at: providerResponse.status === 'COMPLETED' ? new Date().toISOString() : null,
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
        completed_at: providerResponse.status === 'COMPLETED' ? new Date().toISOString() : null,
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
  async handleWebhook(webhookPayload: WebhookDto): Promise<{ processed: boolean }> {
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
      this.logger.warn(`Payment not found for webhook: ${webhookPayload.providerPaymentId}`);
      return { processed: false };
    }

    if (webhookPayload.status === 'COMPLETED') {
      // Claim the completion ATOMICALLY.
      //
      // The old code read `payment.status`, checked it was not COMPLETED, and then
      // updated. Two webhooks for the same payment arriving together would both
      // read PENDING and both award — a double-credit on a real-money purchase.
      // The status predicate now lives inside the UPDATE, so Postgres decides who
      // wins and the loser gets zero rows back.
      const { data: claimed, error: claimErr } = await this.supabase
        .getClient()
        .from('payments')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('id', payment.id)
        .neq('status', 'COMPLETED')
        .select('id');

      if (claimErr) {
        this.logger.error(`Failed to complete payment ${payment.id}: ${claimErr.message}`);
        return { processed: false };
      }

      if (!claimed || claimed.length === 0) {
        // Zero rows: somebody else already completed this one. This is the replay
        // path, and doing nothing here is the whole point — awarding again is the
        // single most expensive bug this file could have.
        this.logger.log(
          `Webhook replay for payment ${payment.id} (already COMPLETED); not awarding again.`,
        );
        return { processed: true };
      }

      // Award entitlement
      const virtualGood = getVirtualGood(payment.sku);
      if (virtualGood) {
        await this.awardEntitlement(payment.player_id, virtualGood, payment.id);
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
  async refundPayment(playerId: string, paymentId: string, reason: string): Promise<PaymentRecord> {
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
      throw new BadRequestException(`Cannot refund payment with status ${payment.status}.`);
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
      await this.reverseEntitlement(payment.player_id, payment, payment.id);
    }

    return this.mapPaymentRecord({ ...payment, status: result.status });
  }

  /**
   * Award the entitlement to the player's account.
   *
   * This is where virtual goods actually enter the game economy.
   * All awards are recorded in game_ledger_entries for auditability.
   */
  /**
   * Real-money value of a purchase in BWP — 0 for anything bought with in-game
   * Pula. Only BWP-priced goods count against the daily cap (R4): a player spending
   * Pula on a cosmetic is not moving real money, so it must not consume cap headroom.
   * Falls back to the top-up pack table when a good has no explicit price, so a
   * missing price can never silently exempt a purchase from the cap.
   */
  private bwpFor(
    virtualGood: { sku?: string; price?: number; currency?: string },
    fallbackAmount: number,
  ): number {
    if (virtualGood.currency && virtualGood.currency !== 'BWP') return 0;
    if (typeof virtualGood.price === 'number' && virtualGood.price > 0) {
      return virtualGood.price;
    }
    const pack = TOP_UP_PACKS.find((p) => p.grantedPula === fallbackAmount);
    return pack?.priceBwp ?? fallbackAmount;
  }

  private async awardEntitlement(
    playerId: string,
    virtualGood: {
      sku?: string;
      price?: number;
      currency?: string;
      entitlement: { type: string; [key: string]: unknown };
    },
    paymentId?: string,
  ): Promise<void> {
    const ent = virtualGood.entitlement;

    switch (ent.type) {
      case 'currency': {
        const amount = ent.amount as number;

        // R4 — the daily top-up cap, checked in Botswana time.
        //
        // This is a compliance control, not a balance knob: it bounds how much
        // real money any one account can push into the game in a day. It is
        // enforced here on the grant path (not only on the purchase path) so that
        // a replayed or out-of-band webhook cannot walk past it either.
        const bwpValue = this.bwpFor(virtualGood, amount);
        const alreadyToday = await this.wallet.topUpTotalToday(playerId);
        if (alreadyToday + bwpValue > DAILY_TOP_UP_CAP_BWP) {
          // Deliberately NOT throwing. By the time we are here the provider has
          // already taken the money, so refusing to credit means we keep the cash
          // and deliver nothing — worse than over-crediting, and it would make the
          // provider retry the webhook forever.
          //
          // The real gate is createPayment(), which refuses before any money
          // moves. Reaching this branch means that gate was bypassed, so it is a
          // loud operational alarm, not a user-facing error.
          this.logger.error(
            `DAILY TOP-UP CAP BREACHED on award — player ${playerId}, ` +
              `BWP ${bwpValue} on top of BWP ${alreadyToday.toFixed(2)} today ` +
              `(cap ${DAILY_TOP_UP_CAP_BWP}). Payment ${paymentId ?? 'n/a'}. ` +
              `Credit proceeding; investigate how createPayment let this through.`,
          );
        }

        await this.wallet.credit(playerId, 'pula', amount, 'topup', paymentId);

        // Ledger row is written by wallet_apply(); game_ledger_entries is retired.
        this.logger.log(`Credited ${amount} Pula to ${playerId} (payment ${paymentId ?? 'n/a'})`);
        break;
      }

      case 'subscription': {
        // P9 — a Guild subscription. The entitlement carries the grant length in
        // days; default 30. We set the wallet column (the load-bearing benefit gate)
        // rather than a balance, because a subscription is a status, not currency.
        const days = Number((ent as { days?: number }).days ?? 30);
        const expiresAt = new Date(
          Date.now() + days * 24 * 60 * 60 * 1000,
        ).toISOString();
        await this.wallet.setSubscription(playerId, 'guild', expiresAt);
        this.logger.log(
          `Activated Guild subscription for ${playerId} until ${expiresAt} (payment ${paymentId ?? 'n/a'})`,
        );
        break;
      }

      case 'boost':
      case 'cosmetic': {
        // Pula-priced goods are NOT bought through this real-money path — they go
        // through the MonetisationService store purchase, which debits Pula directly.
        // If a boost/cosmetic SKU somehow reaches the webhook, refuse loudly rather
        // than silently no-op, so the routing bug is caught.
        this.logger.error(
          `Refusing to award ${ent.type} via the real-money webhook for player ${playerId} ` +
            `(payment ${paymentId ?? 'n/a'}). Pula-priced goods must use POST /store/purchase.`,
        );
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

    this.logger.log(`Awarded entitlement ${ent.type} to player ${playerId}`);
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
    paymentId?: string,
  ): Promise<void> {
    if (payment.entitlement_type === 'currency') {
      const amount = payment.entitlement_data.amount as number;
      // Move the balance only through the wallet so the reversal is a ledgered
      // event, not a silent profile edit. wallet.debit refuses to go negative,
      // so a refund for more than the player holds is rejected rather than
      // corrupting the balance.
      await this.wallet.debit(playerId, 'pula', amount, 'refund', paymentId);
      this.logger.log(`Reversed ${amount} Pula from ${playerId} (payment ${paymentId ?? 'n/a'})`);
    }

    if (payment.entitlement_type === 'subscription') {
      // A refunded subscription reverts to free immediately. This can clobber a
      // later renewal if the player re-subscribed and then refunded the old charge,
      // but refunds are rare and a reversed charge must not leave a paid status —
      // the weekly-grant and auto-collect gates read this column, so 'free' is the
      // safe state to land in.
      await this.wallet.setSubscription(playerId, 'free', null);
      this.logger.log(`Reverted subscription for ${playerId} (payment ${paymentId ?? 'n/a'})`);
    }

    this.logger.log(`Reversed entitlement ${payment.entitlement_type} from player ${playerId}`);
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
