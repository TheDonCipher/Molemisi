import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StoreService } from './store.service';
import { WalletService } from '../wallet/wallet.service';
import { SupabaseService } from '../database/supabase.service';
import { BOOST_SLUGS } from '@molemisi/game-config';
import { makeDb, clientFor, type MockDb, type MockClient } from '../test/supabase-mock';

/**
 * P9 — the in-game store (05 §P9; F7 unbounded sink), as decided in docs/33 and
 * built in docs/34.
 *
 * Proves:
 *   - the shelf carries NO boosts (cut 2026-10-01, docs/34 §3.3)
 *   - cosmetics sit on TWO shelves, and each is denominated in its own currency
 *   - buying a Market-shelf cosmetic debits Pula and is idempotent on re-buy
 *   - buying a Festival-shelf cosmetic debits MADI — and never Pula
 *   - insufficient funds are rejected without recording anything
 *   - real-money SKUs are refused here (they go through /payments)
 */

describe('StoreService — P9 in-game store', () => {
  let service: StoreService;
  let db: MockDb;
  let client: MockClient;

  beforeEach(async () => {
    db = makeDb({ player_wallets: [{ player_id: 'u1', pula_balance: 2000, botho_points: 0 }] });
    client = clientFor(db);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        WalletService,
        { provide: SupabaseService, useValue: { getAdminClient: () => client, getClient: () => client } },
      ],
    }).compile();
    service = module.get(StoreService);
  });

  describe('catalog (docs/34 §3.1 — two shelves, no boosts)', () => {
    it('sells no boosts at all', () => {
      const boosts = service.getCatalog().filter((i) => (i as { category: string }).category === 'boost');
      expect(boosts).toEqual([]);
    });

    it('defines no boosts in config either — they were cut, not just hidden', () => {
      // Replaces the old "three slugs still EXIST so restoring is one line"
      // assertion. Keeping the entries is what let them be half-restored before;
      // removing them is the point.
      expect([...BOOST_SLUGS]).toEqual([]);
    });

    it('carries a cosmetic line on BOTH shelves so the sink is not empty (F7)', () => {
      const cosmetics = service.getCatalog().filter((i) => i.category === 'cosmetic');
      expect(cosmetics.length).toBeGreaterThan(0);
      const shelves = new Set(cosmetics.map((i) => i.shelf));
      expect(shelves).toContain('market');
      expect(shelves).toContain('festival');
    });

    it('prices each shelf in its own currency', () => {
      const cosmetics = service.getCatalog().filter((i) => i.category === 'cosmetic');
      for (const item of cosmetics) {
        expect(item.currency).toBe(item.shelf === 'market' ? 'PULA' : 'MADI');
      }
    });
  });

  describe('boosts are cut (docs/34 §3.3)', () => {
    it('refuses a legacy boost SKU, taking nothing and recording nothing', async () => {
      const before = db.player_wallets[0].pula_balance;
      // docs/34 §3.3 — the SKU does not exist at all now, so this is a 404 rather
      // than a 400. That is the stronger outcome: there is nothing to reject,
      // because there is nothing to buy.
      await expect(service.purchase('u1', 'boost_pula_stone')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      // Nothing leaves the player in exchange for an effect that does not exist.
      expect(db.player_wallets[0].pula_balance).toBe(before);
      expect(db.player_boosts.filter((b) => b.player_id === 'u1')).toHaveLength(0);
      expect(db.ledger_entries.filter((l) => l.player_id === 'u1')).toHaveLength(0);
    });
  });

  describe('buying a cosmetic', () => {
    it('debits Pula and records ownership; re-buying is a no-op', async () => {
      await service.purchase('u1', 'cos_market_frame_bush'); // P200
      const owned = db.player_cosmetics.filter((c) => c.player_id === 'u1');
      expect(owned).toHaveLength(1);
      const pulaAfterFirst = db.player_wallets[0].pula_balance;

      // Second purchase must not add a row or debit again.
      await service.purchase('u1', 'cos_market_frame_bush');
      expect(db.player_cosmetics.filter((c) => c.player_id === 'u1')).toHaveLength(1);
      expect(db.player_wallets[0].pula_balance).toBe(pulaAfterFirst);
    });

    it('rejects when the player cannot afford it, recording nothing', async () => {
      db.player_wallets[0].pula_balance = 10; // far short of the P200 frame
      await expect(service.purchase('u1', 'cos_market_frame_bush')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(db.player_cosmetics.filter((c) => c.player_id === 'u1')).toHaveLength(0);
      expect(db.ledger_entries.filter((l) => l.player_id === 'u1')).toHaveLength(0);
    });
  });

  // docs/34 §3.1 — the Festival shelf spends MADI and must never touch Pula.
  // This is the test that would catch a copy-paste in the debit branch.
  describe('buying a Festival-shelf cosmetic', () => {
    beforeEach(() => {
      db.player_wallets[0].madi_balance = 200;
    });

    it('debits MADI and records ownership', async () => {
      await service.purchase('u1', 'cos_fest_frame_bush'); // M80
      expect(db.player_wallets[0].madi_balance).toBe(120);
      expect(db.player_cosmetics.filter((c) => c.player_id === 'u1')).toHaveLength(1);
    });

    it('does NOT touch Pula at all', async () => {
      const pulaBefore = db.player_wallets[0].pula_balance;
      await service.purchase('u1', 'cos_fest_frame_bush');
      expect(db.player_wallets[0].pula_balance).toBe(pulaBefore);
    });

    it('writes a madi_spend ledger row, never a cosmetic_purchase one', async () => {
      await service.purchase('u1', 'cos_fest_frame_bush');
      const rows = db.ledger_entries.filter((l) => l.player_id === 'u1');
      expect(rows).toHaveLength(1);
      expect(rows[0].currency).toBe('madi');
      expect(rows[0].source).toBe('madi_spend');
    });

    it('rejects when the player has Pula but not Madi — the wallets are not fungible', async () => {
      db.player_wallets[0].pula_balance = 100000;
      db.player_wallets[0].madi_balance = 0;
      await expect(service.purchase('u1', 'cos_fest_frame_bush')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(db.player_cosmetics.filter((c) => c.player_id === 'u1')).toHaveLength(0);
    });
  });

  describe('routing guards', () => {
    it('refuses a real-money SKU (top-up / subscription) — use /payments/create', async () => {
      await expect(service.purchase('u1', 'subscription_village_pass')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.purchase('u1', 'topup_farmer')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws NotFound for an unknown SKU', async () => {
      await expect(service.purchase('u1', 'does_not_exist')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
