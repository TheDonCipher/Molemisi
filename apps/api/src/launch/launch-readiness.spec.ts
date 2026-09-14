import * as fs from 'fs';
import * as path from 'path';
import {
  BOOSTS,
  BOOST_SLUGS,
  COOP_TAX_RATE,
  DAILY_TOP_UP_CAP_BWP,
  KAGISO,
  PRIZE,
} from '@molemisi/game-config';

/**
 * P10 — v1 launch readiness (05 §P10).
 *
 * The spec asks for these to be confirmed "in production configuration, not in
 * tests". Engineering-wise that means: the *shipped config* must carry the real
 * numbers, and something must fail loudly the moment it stops doing so. A
 * hand-ticked checklist silently goes stale the first time someone nudges a
 * value; a test that reads the shipped config does not.
 *
 * So this file is deliberately three things:
 *   1. pins on the numbers that have to match `02` (tax, top-up cap, prize pool)
 *   2. a static scan of the HTTP surface for the two shapes v1 must NOT have:
 *      a withdrawal endpoint, and any player-to-player transfer path
 *   3. the structural half of the Bushveld-supplement argument (see the last
 *      block — the comparative half is NOT provable here, and says so)
 */

const SRC = path.resolve(__dirname, '..');

/** Recursively collect files under `dir` ending in one of `exts`. */
function collect(dir: string, exts: string[]): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collect(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      found.push(full);
    }
  }
  return found;
}

/** Route path strings from HTTP decorators, plus every controller method name. */
function routeTokens(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  const tokens: string[] = [];

  const decorated = /@(?:Get|Post|Put|Patch|Delete|All)\(\s*['"`]([^'"`]*)['"`]/g;
  let m: RegExpExecArray | null = decorated.exec(src);
  while (m) {
    tokens.push(m[1] ?? '');
    m = decorated.exec(src);
  }

  // A bare `@Get()` routes on the method name, so the name is part of the surface.
  const methods = /^ {2}(?:private |public |protected )?(?:async )?([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\(/gm;
  m = methods.exec(src);
  while (m) {
    tokens.push(m[1] ?? '');
    m = methods.exec(src);
  }

  return tokens;
}

/** Every method-looking declaration at class-body depth in a service. */
function serviceMethods(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  const out: string[] = [];
  const re = /^ {2}(?:private |public |protected )?(?:static )?(?:async )?([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\(/gm;
  let m: RegExpExecArray | null = re.exec(src);
  while (m) {
    out.push(m[1] ?? '');
    m = re.exec(src);
  }
  return out;
}

describe('P10 — v1 launch readiness (05 §P10)', () => {
  // ------------------------------------------------ shipped config, real numbers
  describe('shipped configuration carries the real numbers', () => {
    it('Co-op tax is 5% (02 §4.1)', () => {
      expect(COOP_TAX_RATE).toBe(0.05);
    });

    it('daily top-up cap is P500 (R4, C5)', () => {
      expect(DAILY_TOP_UP_CAP_BWP).toBe(500);
    });

    it('prize pool floor and ceiling are 02 §6.7, not placeholder values', () => {
      expect(PRIZE.floorPula).toBe(350);
      expect(PRIZE.ceilingPula).toBe(1500);
      expect(PRIZE.revenueShare).toBe(0.1);
      expect(PRIZE.minimumBothoInPeriod).toBe(150);
      expect(PRIZE.topN).toBe(3);
    });

    it('the 4:2:1 split pays P200 / P100 / P50 at the floor (02 §6.7)', () => {
      expect(PRIZE.split).toEqual([4, 2, 1]);
      const share = PRIZE.split.reduce((a, b) => a + b, 0);
      const payouts = PRIZE.split.map((s) => Math.round((PRIZE.floorPula * s) / share));
      expect(payouts).toEqual([200, 100, 50]);
    });

    it('store carries exactly three boosts and no Fertility Shell (R8)', () => {
      expect(BOOST_SLUGS).toEqual(['pula_stone', 'ancestral_ward', 'breath_of_the_land']);
    });
  });

  // -------------------------------------------- closed loop: no cash-out, no P2P
  describe('v1 ships closed-loop — no withdrawal, no P2P Pula transfer', () => {
    const controllers = collect(SRC, ['.controller.ts']);
    const services = collect(SRC, ['.service.ts']);

    it('finds the HTTP surface (guards against a vacuous pass)', () => {
      expect(controllers.length).toBeGreaterThan(0);
      expect(services.length).toBeGreaterThan(0);
      // A route we know exists — proves the scan is reading real decorators.
      expect(controllers.flatMap(routeTokens)).toContain('sell');
    });

    it('no controller exposes a withdrawal, payout, cash-out or P2P route', () => {
      const forbidden = /withdraw|cash[-_]?out|payout|p2p|transfer/i;
      const offenders: string[] = [];
      for (const file of controllers) {
        for (const token of routeTokens(file)) {
          if (forbidden.test(token)) offenders.push(`${path.basename(file)}:${token}`);
        }
      }
      // v1 has no Madi and no cash-out. If one of these ever appears, v1.1 legal
      // (B1) and the PSP decision (B2) have to be signed off first.
      expect(offenders).toEqual([]);
    });

    it('no service declares a player-to-player movement method', () => {
      const forbidden = /transfer|sendPula|sendMadi|gift|remit|moveBetween|swapBetween|p2p/i;
      const offenders: string[] = [];
      for (const file of services) {
        for (const method of serviceMethods(file)) {
          if (forbidden.test(method)) offenders.push(`${path.basename(file)}.${method}`);
        }
      }
      // Complements the reflection test in wallet.service.spec, which proves no
      // WalletService method takes two player IDs. This one covers every service,
      // so a two-party method can't sneak in under a single-ID signature.
      expect(offenders).toEqual([]);
    });
  });

  // ------------------------------------------------- Bushveld: bounded supplement
  describe('Bushveld stays a supplement — the structural half (04 §4.2)', () => {
    it('gathering is capped by Kagiso, so the bush cannot be grind-farmed', () => {
      // Kagiso regenerates +1 per `regenMinutes`, so the daily income of the
      // Bushveld is bounded by arithmetic, not by how long a player is willing
      // to tap. That is the mechanism that keeps it a supplement.
      const kagisoPerDay = (24 * 60) / KAGISO.regenMinutes;
      expect(kagisoPerDay).toBe(6);

      // Cheapest possible gather costs at least 1, and stock can never exceed
      // `max`, so the act count per day is finite and small.
      const cheapest = Math.min(KAGISO.costCommon, KAGISO.costPremium);
      expect(cheapest).toBeGreaterThanOrEqual(1);
      expect(Math.floor(KAGISO.max / cheapest)).toBeLessThanOrEqual(6);
      expect(KAGISO.max).toBe(6);
    });

    it('Kagiso cannot be bought — no boost grants it', () => {
      // If money could buy stillness, the cap above would be decorative: a
      // spender would gather without limit and the Bushveld would out-earn the
      // Farm. Nothing in the store may hand out Kagiso.
      const grants = BOOSTS.filter(
        (b) => /kagiso|stillness|bush/i.test(b.effect) || /kagiso/i.test(b.name),
      );
      expect(grants).toEqual([]);
    });

      /**
       * NOT covered here, and deliberately not faked: whether gathering income
       * actually stays below farm income at *every* farm size. That is a
       * comparative question (best hotspot yield x Kagiso ceiling vs. worst crop
       * x plots, through the craft chain's margins) and needs the deferred tuning
       * sandbox in 06 §5 — the very gate P10 says it depends on. This block proves
       * the Bushveld is *bounded*; it does not prove it is *smaller*. See the
       * P10 note in the handover.
       */
  });

  // ----------------------------------- D5/C12 — XP & level gating is deleted, not hidden
  describe('D5/C12 — no XP/level/unlock gating remains anywhere in the API (05 §D5, 06 §C12)', () => {
    // Scan implementation source only. The negative-control catalogues the banned
    // tokens as literal strings (in `BANNED` and in comments), so including this
    // spec file would make the scan match itself — a vacuous, self-defeating pass.
    const files = collect(SRC, ['.ts']).filter((f) => !f.endsWith('.spec.ts'));

    // The exact identifiers 06 §C12 enumerates as banned, plus their camelCase
    // runtime twins the client used to read off responses.
    const BANNED = [
      'unlockLevel',
      'farm_xp',
      'farm_level',
      'farmXp',
      'farmLevel',
      'XP_REWARDS',
      'STARTING_ENERGY',
      'calculateLevelXpRequired',
      'xpReward',
    ];

    it('the scan actually reads source files (guard against a vacuous pass)', () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it('none of the deleted XP/level identifiers appear in any API source file', () => {
      const offenders: string[] = [];
      for (const file of files) {
        const src = fs.readFileSync(file, 'utf8');
        for (const token of BANNED) {
          if (src.includes(token)) offenders.push(`${path.basename(file)}: ${token}`);
        }
      }
      // D5 retired the XP/level progression; C12 demands it be gone from the
      // codebase, not just unread. If any of these reappears — a stray
      // `unlockLevel` gate, an `xpReward` on a contract, a `farm_level` column
      // read — the build must fail here rather than ship a half-deleted system.
      expect(offenders).toEqual([]);
    });
  });
});
