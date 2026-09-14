import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { WalletService } from '../wallet/wallet.service';
import { SupabaseService } from '../database/supabase.service';
import { makeDb, clientFor, type MockDb, type MockClient } from '../test/supabase-mock';

/**
 * P9 — real-money monetisation path (05 §P9; R4; the P8 webhook idempotency).
 *
 * Proves:
 *   - a Guild subscription webhook sets the wallet to guild + a 30-day expiry
 *   - a P100 top-up credits exactly 105 Pula, ONCE (a replayed webhook does not double-credit)
 *   - a second top-up that would breach P500/Botswana-day is rejected at purchase time
 */

const PROVIDER = {
  name: 'stub',
  verifyWebhookEvent: jest.fn().mockResolvedValue(true),
  createPayment: jest.fn().mockResolvedValue({ providerPaymentId: 'prov-x', status: 'COMPLETED' }),
  refundPayment: jest.fn().mockResolvedValue({ success: true, status: 'REFUNDED' }),
};

describe('PaymentsService — P9 real-money path', () => {
  let service: PaymentsService;
  let db: MockDb;
  let client: MockClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    PROVIDER.verifyWebhookEvent.mockResolvedValue(true);
    PROVIDER.createPayment.mockResolvedValue({ providerPaymentId: 'prov-x', status: 'COMPLETED' });
    db = makeDb({ player_wallets: [{ player_id: 'u1', pula_balance: 0, botho_points: 0 }] });
    client = clientFor(db);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        WalletService,
        { provide: SupabaseService, useValue: { getAdminClient: () => client, getClient: () => client } },
        { provide: 'PAYMENT_PROVIDER', useValue: PROVIDER },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  describe('subscription entitlement (award on webhook)', () => {
    it('sets the wallet to guild with a ~30-day expiry', async () => {
      db.payments = [
        {
          id: 'pay-1',
          player_id: 'u1',
          sku: 'subscription_guild',
          status: 'PENDING',
          entitlement_type: 'subscription',
          entitlement_data: { type: 'subscription', slug: 'guild', days: 30 },
          provider_payment_id: 'prov-1',
          provider: 'stub',
          amount: 4900,
          currency: 'BWP',
          idempotency_key: 'ik-1',
          created_at: new Date().toISOString(),
        },
      ];

      await service.handleWebhook({
        eventType: 'payment.completed',
        providerPaymentId: 'prov-1',
        status: 'COMPLETED',
        amount: 4900,
        currency: 'BWP',
        payload: {},
        signature: 'x',
      });

      const w = db.player_wallets[0];
      expect(w.subscription_status).toBe('guild');
      expect(w.subscription_expires_at).not.toBeNull();
      const days = (new Date(w.subscription_expires_at).getTime() - Date.now()) / 86400000;
      expect(days).toBeGreaterThan(29);
      expect(days).toBeLessThan(31);
    });
  });

  describe('top-up credits exactly once (05 §P9 done-criteria)', () => {
    function seedPending(sku: string, providerId: string, entitlementData: any) {
      db.payments = [
        {
          id: `pay-${providerId}`,
          player_id: 'u1',
          sku,
          status: 'PENDING',
          entitlement_type: entitlementData.type,
          entitlement_data: entitlementData,
          provider_payment_id: providerId,
          provider: 'stub',
          amount: 10500,
          currency: 'BWP',
          idempotency_key: `ik-${providerId}`,
          created_at: new Date().toISOString(),
        },
      ];
    }

    const webhook = (providerId: string) => ({
      eventType: 'payment.completed',
      providerPaymentId: providerId,
      status: 'COMPLETED',
      amount: 10500,
      currency: 'BWP',
      payload: {},
      signature: 'x',
    });

    it('a P100 pack credits exactly 105 Pula, once', async () => {
      seedPending('topup_harvest', 'prov-2', { type: 'currency', amount: 105 });

      await service.handleWebhook(webhook('prov-2'));
      expect(db.player_wallets[0].pula_balance).toBe(105);
      expect(db.ledger_entries.filter((l) => l.player_id === 'u1' && l.source === 'topup')).toHaveLength(1);

      // Replayed webhook (same provider_payment_id) must NOT credit again.
      await service.handleWebhook(webhook('prov-2'));
      expect(db.player_wallets[0].pula_balance).toBe(105);
      expect(db.ledger_entries.filter((l) => l.player_id === 'u1' && l.source === 'topup')).toHaveLength(1);
    });
  });

  describe('R4 — P500/day Botswana-time top-up cap', () => {
    it('rejects a top-up that would breach the daily BWP cap', async () => {
      // First purchase: farmer pack (BWP 50) completes and credits 50 Pula.
      await service.createPayment('u1', { sku: 'topup_farmer' });
      expect(db.player_wallets[0].pula_balance).toBe(50);

      // Second purchase: export pack (BWP 500) would put the day at 550 > 500 → rejected.
      await expect(service.createPayment('u1', { sku: 'topup_export' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      // Wallet unchanged; no second top-up ledger entry.
      expect(db.player_wallets[0].pula_balance).toBe(50);
      expect(db.ledger_entries.filter((l) => l.source === 'topup')).toHaveLength(1);
    });
  });
});
