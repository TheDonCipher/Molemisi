import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StoreService } from './store.service';
import { WalletService } from '../wallet/wallet.service';
import { SupabaseService } from '../database/supabase.service';
import { BOOST_SLUGS } from '@molemisi/game-config';
import { makeDb, clientFor, type MockDb, type MockClient } from '../test/supabase-mock';

/**
 * P9 — the in-game Pula store (05 §P9; F7 unbounded sink).
 *
 * Proves:
 *   - the shelf carries NO boosts while their effects are deferred (ruling
 *     2026-09-11) and never carries a Fertility Shell (R8)
 *   - the three boost slugs still EXIST in config, so R8/C10 stays satisfied and
 *     restoring them is a one-line change
 *   - buying a cosmetic debits Pula and is idempotent on re-buy — the sink drains
 *   - insufficient Pula is rejected without recording anything
 *   - real-money SKUs are refused here (they go through /payments)
 */

describe('StoreService — P9 in-game Pula store', () => {
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

  describe('catalog (R8 — no Fertility Shell, no unwired boosts)', () => {
    it('sells no boosts at all while their effects are deferred', () => {
      const boosts = service.getCatalog().filter((i) => i.category === 'boost');
      expect(boosts).toEqual([]);
    });

    it('still defines exactly three boosts in config, none of them a Fertility Shell', () => {
      // R8/C10 is about what EXISTS, not about what is on the shelf. Keeping the
      // catalogue entries is what makes restoring them `available: true`.
      expect([...BOOST_SLUGS].sort()).toEqual([
        'ancestral_ward',
        'breath_of_the_land',
        'pula_stone',
      ]);
      expect(BOOST_SLUGS).not.toContain('fertility_shell');
    });

    it('carries a cosmetic line so the sink is not empty (F7)', () => {
      const cosmetics = service.getCatalog().filter((i) => i.category === 'cosmetic');
      expect(cosmetics.length).toBeGreaterThan(0);
    });
  });

  describe('boosts are withdrawn (ruling 2026-09-11)', () => {
    it('refuses to sell a boost, taking no Pula and recording nothing', async () => {
      const before = db.player_wallets[0].pula_balance;
      await expect(service.purchase('u1', 'boost_pula_stone')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      // The whole point of withdrawing them: no Pula leaves the player in exchange
      // for an effect that no endpoint applies.
      expect(db.player_wallets[0].pula_balance).toBe(before);
      expect(db.player_boosts.filter((b) => b.player_id === 'u1')).toHaveLength(0);
      expect(db.ledger_entries.filter((l) => l.player_id === 'u1')).toHaveLength(0);
    });
  });

  describe('buying a cosmetic', () => {
    it('debits Pula and records ownership; re-buying is a no-op', async () => {
      await service.purchase('u1', 'cos_scene_frame_open_bush'); // P400
      const owned = db.player_cosmetics.filter((c) => c.player_id === 'u1');
      expect(owned).toHaveLength(1);
      const pulaAfterFirst = db.player_wallets[0].pula_balance;

      // Second purchase must not add a row or debit again.
      await service.purchase('u1', 'cos_scene_frame_open_bush');
      expect(db.player_cosmetics.filter((c) => c.player_id === 'u1')).toHaveLength(1);
      expect(db.player_wallets[0].pula_balance).toBe(pulaAfterFirst);
    });

    it('rejects when the player cannot afford it, recording nothing', async () => {
      db.player_wallets[0].pula_balance = 10; // far short of the P400 frame
      await expect(service.purchase('u1', 'cos_scene_frame_open_bush')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(db.player_cosmetics.filter((c) => c.player_id === 'u1')).toHaveLength(0);
      expect(db.ledger_entries.filter((l) => l.player_id === 'u1')).toHaveLength(0);
    });
  });

  describe('routing guards', () => {
    it('refuses a real-money SKU (top-up / subscription) — use /payments/create', async () => {
      await expect(service.purchase('u1', 'subscription_guild')).rejects.toBeInstanceOf(
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
