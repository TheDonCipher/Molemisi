import { BadRequestException } from '@nestjs/common';
import { BOTHO_DAILY_CAP } from '@molemisi/game-config';
import { WalletService } from './wallet.service';

/**
 * P2's done-criterion, in two parts:
 *   - a replayed webhook credits exactly once (covered by the UNIQUE constraint on
 *     `real_world_transactions.provider_tx_id`; see the migration comments)
 *   - an automated test enumerates every function touching a balance and asserts
 *     none accepts two player IDs
 *
 * The second is the test below. It is a *reflection* test on purpose: a hand-written
 * list of method names would silently go stale the moment someone adds a method.
 */

/** Parameter names that plausibly identify a player. If two appear, it's a transfer. */
const PLAYERISH = /^(player|from|to|sender|recipient|target|beneficiary|user|owner)/i;

function publicMethodNames(svc: WalletService): string[] {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(svc)).filter(
    (n) => n !== 'constructor' && typeof (svc as never as Record<string, unknown>)[n] === 'function',
  );
}

function paramNames(svc: WalletService, method: string): string[] {
  const fn = (svc as never as Record<string, unknown>)[method] as (...a: unknown[]) => unknown;
  const src = fn.toString();
  // Handles both `method(a, b)` and `method(a,b)`; strips defaults and destructuring.
  const open = src.indexOf('(');
  const close = src.indexOf(')');
  if (open < 0 || close < 0) return [];
  return src
    .slice(open + 1, close)
    .split(',')
    .map((p) => p.trim().split('=')[0]!.trim())
    .filter(Boolean);
}

describe('WalletService — server authority (05 §P2)', () => {
  let svc: WalletService;

  beforeEach(() => {
    // The invariant tests are purely structural; no DB is touched.
    svc = Object.create(WalletService.prototype) as WalletService;
  });

  // ---------------------------------------------------------------- invariant
  describe('no method accepts two player IDs', () => {
    it('enumerates every public method and finds none that is a transfer', () => {
      const methods = publicMethodNames(svc);
      expect(methods.length).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (const m of methods) {
        const players = paramNames(svc, m).filter((p) => PLAYERISH.test(p));
        if (players.length > 1) offenders.push(`${m}(${players.join(', ')})`);
      }
      expect(offenders).toEqual([]);
    });

    it('has no method whose name implies player-to-player movement', () => {
      const forbidden = /transfer|send|gift|remit|payout|move.?between|swap/i;
      const offenders = publicMethodNames(svc).filter((m) => forbidden.test(m));
      // `sendPula`-style names are how a two-party method sneaks in under a
      // single-`playerId` signature. Block the name too.
      expect(offenders).toEqual([]);
    });

    it('exposes credit and debit as the only movement primitives', () => {
      const methods = publicMethodNames(svc);
      expect(methods).toContain('credit');
      expect(methods).toContain('debit');
    });
  });

  // ------------------------------------------------------- direction & guards
  describe('amount direction is expressed by the method name', () => {
    it('credit rejects zero and negative amounts', async () => {
      await expect(svc.credit('p1', 'pula', 0, 'admin_adjustment')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(svc.credit('p1', 'pula', -5, 'admin_adjustment')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('debit rejects zero and negative amounts', async () => {
      await expect(svc.debit('p1', 'pula', 0, 'admin_adjustment')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(svc.debit('p1', 'pula', -5, 'admin_adjustment')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    // spendPula negates its argument on the way into apply(), so a negative amount
    // arrives at wallet_apply as a POSITIVE delta and mints Pula. wallet_apply only
    // rejects a negative resulting *balance*, so it cannot catch this — the guard
    // has to live here. Reachable today via the Kgotla donation body.
    it('spendPula rejects zero, negative and non-finite amounts', async () => {
      for (const bad of [0, -1, -100, NaN, Infinity, -Infinity]) {
        await expect(
          svc.spendPula('p1', bad, 'letsema_contribution'),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
    });

    it('spendPula still reaches the database for a legitimate amount', async () => {
      const rpc = jest.fn().mockResolvedValue({ data: 900, error: null });
      const stub = Object.create(WalletService.prototype) as WalletService;
      (stub as unknown as { supabase: unknown }).supabase = {
        getAdminClient: () => ({ rpc }),
      };

      // Guards that reject everything are worse than no guard: this proves the
      // valid path still spends, and spends in the right direction.
      await expect(stub.spendPula('p1', 100, 'water_refill')).resolves.toBe(900);
      expect(rpc).toHaveBeenCalledWith(
        'wallet_apply',
        expect.objectContaining({ p_amount: -100 }),
      );
    });
  });

  // ------------------------------------------------------------ I4 daily cap
  /**
   * H1 (security audit 2026-10-03) — the cap moved INTO Postgres.
   *
   * These three tests used to drive a two-statement read-then-credit: the
   * service summed the day's positive Botho rows itself, then called
   * `wallet_apply`. That is exactly the shape a scripted burst could race —
   * two concurrent acts both read a pre-cap total and both awarded, overshooting
   * the 50/day legal cap. The service now delegates the whole sum-and-cap to
   * `botho_credit_capped`, which takes a `SELECT ... FOR UPDATE` row lock on the
   * wallet so concurrent callers serialise and the second one sees the cap
   * already consumed (migration 20261002000003).
   *
   * The contract the service must honour is therefore much simpler, and these
   * tests now assert THAT: it passes the player's request and the day window to
   * the atomic RPC, and returns whatever the database awarded. The arithmetic
   * itself is tested where it now lives — in the SQL — not by re-deriving it in
   * a spec that would only be testing its own mock.
   */
  describe('I4 — Botho accrual is capped per player per Botswana day (creditBothoCapped)', () => {
    function buildWith(award: number | null, error: any = null) {
      const admin = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
        rpc: jest.fn().mockResolvedValue({ data: award, error }),
      };
      const svc = Object.create(WalletService.prototype) as WalletService;
      (svc as unknown as { supabase: unknown }).supabase = {
        getAdminClient: () => admin,
      };
      return { svc, admin };
    }

    it('delegates the cap to the atomic RPC and returns what the database awarded', async () => {
      const { svc, admin } = buildWith(10);
      const awarded = await svc.creditBothoCapped('p1', 10, 'quest_reward');
      expect(awarded).toBe(10);
      expect(admin.rpc).toHaveBeenCalledWith(
        'botho_credit_capped',
        expect.objectContaining({
          p_player_id: 'p1',
          p_requested: 10,
          p_source: 'quest_reward',
          p_cap: BOTHO_DAILY_CAP,
        }),
      );
    });

    it('returns the PARTIAL award the database granted when the cap is nearly spent', async () => {
      // The DB returns 5 for a request of 20 against 45 already earned. The
      // service must report 5, not 20 and not throw — this is what the Kgotla
      // turn-in response and the Botho objective progress both read.
      const { svc } = buildWith(5);
      await expect(
        svc.creditBothoCapped('p1', 20, 'letsema_contribution'),
      ).resolves.toBe(5);
    });

    it('returns 0 and does not fall back to a raw credit when the cap is met', async () => {
      const { svc, admin } = buildWith(0);
      await expect(svc.creditBothoCapped('p1', 10, 'quest_reward')).resolves.toBe(0);
      // Exactly ONE rpc call. A raw `wallet_apply` fallback here would silently
      // reintroduce the uncapped path this change removed.
      expect(admin.rpc).toHaveBeenCalledTimes(1);
      expect(admin.rpc).toHaveBeenCalledWith('botho_credit_capped', expect.anything());
    });

    it('passes a BOTSWANA day start, not a UTC one, so the window rolls over at local midnight', async () => {
      const { svc, admin } = buildWith(5);
      // 21:30 UTC on the 1st is already 23:30 in Botswana, so the day start
      // handed to the RPC must be that same date's local midnight (22:00 UTC on
      // the 31st) rather than 00:00 UTC on the 1st.
      await svc.creditBothoCapped(
        'p1',
        5,
        'quest_reward',
        undefined,
        new Date('2026-02-01T21:30:00.000Z'),
      );
      const call = admin.rpc.mock.calls.find((c) => c[0] === 'botho_credit_capped');
      expect(call?.[1]?.p_day_start).toBe('2026-01-31T22:00:00.000Z');
    });

    it('awards nothing for a non-positive request without touching the database', async () => {
      const { svc, admin } = buildWith(10);
      expect(await svc.creditBothoCapped('p1', 0, 'quest_reward')).toBe(0);
      expect(await svc.creditBothoCapped('p1', -5, 'quest_reward')).toBe(0);
      expect(admin.rpc).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------ Botswana day
  describe('R4 — the daily top-up cap uses Botswana time, not server time', () => {
    /** Botswana is UTC+2 with no DST, so midnight CAT is 22:00 UTC the prior day. */
    it('startOfBotswanaDay is 22:00 UTC of the previous calendar day', () => {
      // 2026-09-07T23:30 CAT (UTC+2) => 21:30 UTC on the 7th => day starts 2026-09-06T22:00Z
      const at = new Date('2026-09-07T21:30:00.000Z');
      expect(svc.startOfBotswanaDay(at)).toBe('2026-09-06T22:00:00.000Z');
    });

    it('rolls over at 22:00 UTC, not at 00:00 UTC', () => {
      const before = new Date('2026-09-06T21:59:59.000Z');
      const after = new Date('2026-09-06T22:00:00.000Z');
      expect(svc.startOfBotswanaDay(before)).toBe('2026-09-05T22:00:00.000Z');
      expect(svc.startOfBotswanaDay(after)).toBe('2026-09-06T22:00:00.000Z');
    });

    it('is stable across a DST-style boundary elsewhere (Botswana has none)', () => {
      const jan = new Date('2026-01-15T10:00:00.000Z');
      const jul = new Date('2026-07-15T10:00:00.000Z');
      // both must use the same +02:00 offset
      expect(svc.startOfBotswanaDay(jan)).toBe('2026-01-14T22:00:00.000Z');
      expect(svc.startOfBotswanaDay(jul)).toBe('2026-07-14T22:00:00.000Z');
    });
  });
});
