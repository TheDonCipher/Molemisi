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
    db = makeDb({
      // docs/34 §2.1 — madi_balance mirrors the real column (migration
      // 20261001000003). Seeded explicitly rather than relying on the default so
      // this spec fails loudly if the wallet ever starts without a Madi balance.
      player_wallets: [{ player_id: 'u1', pula_balance: 0, madi_balance: 0, botho_points: 0 }],
    });
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
          sku: 'subscription_village_pass',
          status: 'PENDING',
          entitlement_type: 'subscription',
          entitlement_data: { type: 'subscription', slug: 'village_pass', days: 30 },
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

    it('the P50 flagship pack credits exactly 55 MADI — and NOT one Pula, once', async () => {
      // docs/34 §2.2 — this is the assertion the whole decision rests on. Real
      // money buys Madi; Pula is earned-only and a top-up must never touch it.
      seedPending('topup_harvest', 'prov-2', { type: 'madi', amount: 55 });

      await service.handleWebhook(webhook('prov-2'));
      expect(db.player_wallets[0].madi_balance).toBe(55);
      expect(db.player_wallets[0].pula_balance).toBe(0);
      expect(db.ledger_entries.filter((l) => l.player_id === 'u1' && l.source === 'madi_topup')).toHaveLength(1);

      // Replayed webhook (same provider_payment_id) must NOT credit again.
      await service.handleWebhook(webhook('prov-2'));
      expect(db.player_wallets[0].madi_balance).toBe(55);
      expect(db.ledger_entries.filter((l) => l.player_id === 'u1' && l.source === 'madi_topup')).toHaveLength(1);
    });

    it('a STALE Pula entitlement on a payment row cannot mint Pula', async () => {
      // The row claims the old `type: 'currency', amount: 105` shape. The webhook
      // resolves the SKU against the live catalogue rather than trusting the
      // stored entitlement, so it grants Madi — never Pula.
      //
      // This is the property that actually matters: a row written before the
      // 2026-10-01 migration, a replayed webhook, or a tampered entitlement blob
      // all resolve to the same safe outcome.
      seedPending('topup_harvest', 'prov-3', { type: 'currency', amount: 105 });

      await service.handleWebhook(webhook('prov-3'));
      expect(db.player_wallets[0].pula_balance).toBe(0);
      // Madi, from the current catalogue — never the stale 105.
      expect(db.player_wallets[0].madi_balance).toBe(55);
      const rows = db.ledger_entries.filter((l) => l.player_id === 'u1');
      expect(rows.every((r) => r.currency !== 'pula')).toBe(true);
      expect(rows.every((r) => r.source === 'madi_topup')).toBe(true);
    });
  });

  describe('R4 — P500/day Botswana-time top-up cap', () => {
    /** A COMPLETED payment row, i.e. money already taken by the provider. */
    function completed(id: string, sku: string, bwp: number) {
      return {
        id,
        player_id: 'u1',
        sku,
        status: 'COMPLETED', // uppercase: payments.status is a Postgres ENUM
        entitlement_type: 'madi',
        entitlement_data: { type: 'madi', amount: 0 },
        provider_payment_id: `prov-${id}`,
        provider: 'stub',
        amount: bwp * 100, // cents, per the column comment
        currency: 'BWP',
        idempotency_key: `ik-${id}`,
        created_at: new Date().toISOString(),
      };
    }

    it('allows a purchase that lands exactly on the cap', async () => {
      db.payments = [completed('a', 'topup_export', 250)];
      // 250 + 250 = BWP 500, which is not MORE than the cap.
      await expect(service.createPayment('u1', { sku: 'topup_export' })).resolves.toBeDefined();
    });

    it('refuses a purchase that would breach the cap, before any money moves', async () => {
      // BWP 300 already taken today: export P250 + cattle P100... no — 250 + 50.
      db.payments = [completed('a', 'topup_export', 250), completed('b', 'topup_harvest', 50)];
      // A further P250 would put the day at BWP 550 > 500.
      await expect(service.createPayment('u1', { sku: 'topup_export' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('measures BWP spent, not Madi credited — the pack bonus must not tighten the cap', async () => {
      // Export costs BWP 250 and credits 275 Madi. If the cap summed the credit
      // instead of the charge, a player at BWP 250 today would be told they had
      // BWP 275 used and refused a purchase that is actually within the limit.
      db.payments = [completed('a', 'topup_export', 250)];
      const wallet = await service.createPayment('u1', { sku: 'topup_export' });
      expect(wallet).toBeDefined();
    });
  });

  describe('H3 — webhook integrity: the event must belong to the recorded payment', () => {
    // The signature (verified in the provider) proves WHO sent the event, not
    // WHICH payment it describes. These pin the row-consistency checks added by
    // the security audit: provider, amount and currency must all match.
    function seed(
      sku: string,
      providerId: string,
      entitlementData: any,
      over: Record<string, unknown> = {},
    ) {
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
          ...over,
        },
      ];
    }

    const event = (over: Record<string, unknown> = {}) => ({
      eventType: 'payment.completed',
      providerPaymentId: 'prov-h3',
      status: 'COMPLETED',
      amount: 10500,
      currency: 'BWP',
      payload: {},
      signature: 'x',
      ...over,
    });

    it('rejects an event whose amount does not match the stored payment', async () => {
      seed('topup_harvest', 'prov-h3', { type: 'madi', amount: 55 });
      const res = await service.handleWebhook(event({ amount: 1 }));
      expect(res.processed).toBe(false);
      expect(db.player_wallets[0].madi_balance).toBe(0);
    });

    it('rejects an event whose currency does not match', async () => {
      seed('topup_harvest', 'prov-h3', { type: 'madi', amount: 55 });
      const res = await service.handleWebhook(event({ currency: 'USD' }));
      expect(res.processed).toBe(false);
      expect(db.player_wallets[0].madi_balance).toBe(0);
    });

    it('rejects an event recorded under a different provider', async () => {
      seed('topup_harvest', 'prov-h3', { type: 'madi', amount: 55 }, { provider: 'orangemoney' });
      const res = await service.handleWebhook(event());
      expect(res.processed).toBe(false);
      expect(db.player_wallets[0].madi_balance).toBe(0);
    });
  });
});
