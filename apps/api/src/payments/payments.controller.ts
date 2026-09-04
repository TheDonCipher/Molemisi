import { Controller, Get, Post, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService, CreatePaymentDto } from './payments.service';

@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Get available store items.
   */
  @Get('store')
  async getStore() {
    // Return available virtual goods
    const { VIRTUAL_GOODS } = await import('@molemisi/game-config');
    const available = VIRTUAL_GOODS.filter((g) => g.available);

    return {
      items: available.map((g) => ({
        sku: g.sku,
        name: g.name,
        description: g.description,
        category: g.category,
        price: g.price,
        currency: g.currency,
        consumable: g.consumable,
      })),
    };
  }

  /**
   * Create a payment for a store item.
   *
   * Flow:
   * 1. Validate the SKU exists
   * 2. Create a pending payment record
   * 3. Call the payment provider
   * 4. Return redirect URL or client secret
   *
   * For the stub provider, the payment completes immediately.
   */
  @Post('create')
  async createPayment(@CurrentUser() user: { sub: string }, @Body() dto: CreatePaymentDto) {
    this.logger.log(`Payment request from player ${user.sub} for SKU ${dto.sku}`);

    const record = await this.paymentsService.createPayment(user.sub, dto);

    return {
      paymentId: record.id,
      status: record.status,
      amount: record.amount,
      currency: record.currency,
      sku: record.sku,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
    };
  }

  /**
   * Get payment history for the current player.
   */
  @Get('history')
  async getPaymentHistory(@CurrentUser() user: { sub: string }) {
    const payments = await this.paymentsService.getPaymentHistory(user.sub);

    return {
      payments: payments.map((p) => ({
        id: p.id,
        sku: p.sku,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
      })),
    };
  }

  /**
   * Request a refund for a payment.
   */
  @Post(':paymentId/refund')
  async refundPayment(@CurrentUser() user: { sub: string }, @Param('paymentId') paymentId: string) {
    this.logger.log(`Refund request from player ${user.sub} for payment ${paymentId}`);

    const record = await this.paymentsService.refundPayment(
      user.sub,
      paymentId,
      'Player-requested refund',
    );

    return {
      paymentId: record.id,
      status: record.status,
    };
  }

  /**
   * Webhook endpoint for payment provider callbacks.
   *
   * IMPORTANT: This endpoint is NOT authenticated with JWT.
   * It is verified through the payment provider's webhook signature.
   *
   * In production, add webhook signature verification middleware.
   */
  @Post('webhook')
  async handleWebhook(
    @Body()
    body: {
      eventType: string;
      providerPaymentId: string;
      status: string;
      amount: number;
      currency: string;
      payload: Record<string, unknown>;
      signature?: string;
    },
  ) {
    this.logger.log(`Webhook received: ${body.eventType} for payment ${body.providerPaymentId}`);

    const result = await this.paymentsService.handleWebhook(body);

    return { received: result.processed };
  }
}
