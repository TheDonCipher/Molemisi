/**
 * docs/34 §5 — the assertions the decided economy must keep passing.
 *
 * Four of these are the acceptance criteria from docs/34 itself; the rest exist
 * because each one is a promise that is easy to break silently with a data edit
 * and impossible to notice until a player does.
 */
import { VIRTUAL_GOODS, getShelf, getGoodsByCategory, getVirtualGood } from './store';
import { TOP_UP_PACKS, packBonus, BOOSTS, BOOST_SLUGS, VILLAGE_PASS, DAILY_TOP_UP_CAP_BWP, RAID_SYSTEM_IMPLEMENTED } from './economy';
import { BUILDINGS } from './buildings';

const COSMETICS = VIRTUAL_GOODS.filter((g) => g.category === 'cosmetic');

describe('docs/34 §3.3 — boosts are gone from the catalogue', () => {
  it('defines no boosts at all', () => {
    expect(BOOSTS).toHaveLength(0);
    expect(BOOST_SLUGS).toHaveLength(0);
  });

  it('sells no boost SKU and has no boost category', () => {
    expect(VIRTUAL_GOODS.filter((g) => g.sku.startsWith('boost_'))).toHaveLength(0);
    expect(VIRTUAL_GOODS.filter((g) => (g as { category: string }).category === 'boost')).toHaveLength(0);
  });

  it('removes the three known boosts by name, so a rename cannot smuggle one back', () => {
    for (const slug of ['pula_stone', 'ancestral_ward', 'breath_of_the_land']) {
      expect(VIRTUAL_GOODS.map((g) => g.sku)).not.toContain(`boost_${slug}`);
    }
  });
});

/**
 * WILDLIFE RAIDS ARE DEFERRED FROM v1 (product ruling 2026-09-11).
 *
 * The ruling is only real if it is enforced somewhere, because the failure mode
 * it exists to prevent is subtle: nobody adds a raid SYSTEM by accident, but
 * somebody eventually adds raid COPY. That is how a player ends up being sold a
 * fence "that protects crops from overnight wildlife raids" for 1,500 Pula in a
 * game where no animal has ever been taken. Advertising a threat with no
 * mechanic behind it is a consumer-protection problem, not a content gap.
 *
 * So this asserts the invariant from both directions: the catalogue sells no
 * raid insurance, and no building advertises a raid. If raids are ever built,
 * these tests are the checklist — build the tick first, then relax them.
 */
describe('wildlife raids are deferred from v1', () => {
  it('sells no raid-adjacent SKU', () => {
    const slugs = VIRTUAL_GOODS.map((g) => g.sku.toLowerCase());
    for (const banned of ['raid', 'ward', 'shield', 'warding', 'ancestral']) {
      expect(slugs.filter((s) => s.includes(banned))).toEqual([]);
    }
  });

  it('no building benefit string advertises a raid or a wildlife threat', () => {
    const banned = /raid|wildlife|predator|stolen|thieves|burglar/i;
    for (const b of Object.values(BUILDINGS)) {
      expect(`${b.id} :: ${b.benefit}`).not.toMatch(banned);
    }
  });

  it('no building benefit promises protection from a named night-time attacker', () => {
    // Belt-and-braces: even reworded copy that still implies an overnight
    // threat the simulation never produces is caught.
    const overnight = /overnight|at night|while you sleep/i;
    for (const b of Object.values(BUILDINGS)) {
      expect(`${b.id} :: ${b.benefit}`).not.toMatch(overnight);
    }
  });

  it('confirms there is no raid system to advertise — no raid table, no raid tick', () => {
    // If a raid system is ever implemented this flips to false, which is the
    // signal to restore raid copy deliberately rather than by accident.
    expect(RAID_SYSTEM_IMPLEMENTED).toBe(false);
  });
});

describe('docs/34 §3.1 — nobody looks poorer because they did not pay', () => {
  it('every Festival cosmetic has a Market cousin in the same slot', () => {
    const marketSlots = new Set(getShelf('market').map((g) => g.slot));
    for (const fest of getShelf('festival')) {
      expect(marketSlots.has(fest.slot)).toBe(true);
    }
  });

  it('covers every cosmetic slot on both shelves', () => {
    const market = new Set(getShelf('market').map((g) => g.slot));
    const festival = new Set(getShelf('festival').map((g) => g.slot));
    for (const slot of festival) expect(market.has(slot)).toBe(true);
    for (const slot of market) expect(festival.has(slot)).toBe(true);
  });

  it('prices the shelves in their own currency — the split is the model', () => {
    for (const g of getShelf('market')) {
      expect(g.currency).toBe('PULA'); // earned
      expect(g.price).toBeGreaterThan(0);
    }
    for (const g of getShelf('festival')) {
      expect(g.currency).toBe('MADI'); // bought
      expect(g.price).toBeGreaterThan(0);
    }
  });

  it('declares every cosmetic on exactly one shelf and slot', () => {
    for (const g of COSMETICS) {
      expect(g.shelf).toBeDefined();
      expect(g.slot).toBeDefined();
    }
  });
});

describe('docs/34 §2.2 / §2.3 — packs grant Madi, never Pula', () => {
  it('credits Madi, not a currency entitlement that resolves to Pula', () => {
    for (const pack of TOP_UP_PACKS) {
      const good = getVirtualGood(`topup_${pack.slug}`)!;
      expect(good.entitlement.type).toBe('madi');
      expect((good.entitlement as { amount: number }).amount).toBe(pack.grantedMadi);
    }
  });

  it('keeps every bonus inside 0-10%', () => {
    for (const pack of TOP_UP_PACKS) {
      const bonus = packBonus(pack);
      expect(bonus).toBeGreaterThanOrEqual(0);
      expect(bonus).toBeLessThanOrEqual(0.1 + Number.EPSILON);
    }
  });

  it('features a P50 flagship — the pack most buyers should take', () => {
    const flagship = TOP_UP_PACKS.find((p) => p.slug === 'harvest')!;
    expect(flagship.priceBwp).toBe(50);
    expect(flagship.grantedMadi).toBe(55);
  });

  it('never offers a pack at or above the daily cap, so no single buy is the cap', () => {
    for (const pack of TOP_UP_PACKS) {
      expect(pack.priceBwp).toBeLessThan(DAILY_TOP_UP_CAP_BWP);
    }
  });

  it('never grants Pula through ANY good in the catalogue', () => {
    // The load-bearing one. If a future SKU reintroduces a Pula entitlement,
    // the "free player reaches everything" promise silently becomes false.
    for (const g of VIRTUAL_GOODS) {
      expect(g.entitlement.type).not.toBe('pula');
      expect((g.entitlement as { type: string }).type).not.toBe('currency');
    }
  });
});

describe('docs/34 §3.2 — the Village Pass replaces the Guild subscription', () => {
  it('is sold for M50 of Madi monthly', () => {
    const pass = getVirtualGood('subscription_village_pass')!;
    expect(pass.currency).toBe('MADI');
    expect(pass.price).toBe(50);
    expect(VILLAGE_PASS.priceMadi).toBe(50);
    expect(VILLAGE_PASS.days).toBe(30);
  });

  it('grants only convenience and cosmetics — never Botho or Pula', () => {
    // I4: Botho gates a real-money prize, so the pass must be structurally
    // unable to touch it. Asserted here so a future benefit cannot slip in.
    for (const benefit of VILLAGE_PASS.benefits) {
      expect(benefit).not.toContain('botho');
      expect(benefit).not.toContain('pula');
    }
    expect(VILLAGE_PASS.benefits).toContain('auto_helper');
    expect(VILLAGE_PASS.benefits).toContain('storage_bonus_50');
  });

  it('is the only subscription on sale', () => {
    expect(getGoodsByCategory('subscription').map((g) => g.sku)).toEqual([
      'subscription_village_pass',
    ]);
  });
});

describe('store integrity', () => {
  it('has no duplicate SKUs', () => {
    const skus = VIRTUAL_GOODS.map((g) => g.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('never sells something that is not available', () => {
    for (const g of VIRTUAL_GOODS) expect(g.available).toBe(true);
  });

  it('gives every cosmetic a readable name and a one-line description', () => {
    for (const g of COSMETICS) {
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.description.length).toBeGreaterThan(0);
    }
  });
});