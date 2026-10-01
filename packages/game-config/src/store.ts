/**
 * The store - docs/MVP/02 §6.6 as decided in docs/33 (strategy) and applied in
 * docs/34 (this file's build sequence).
 *
 * DECIDED 2026-10-01. The store sells **two things**:
 *
 *   1. DECORATIONS, on two shelves.
 *        - **Market** (Pula, earned) - the everyday line, and the unbounded sink
 *          that keeps late-game Pula from becoming meaningless (MVP/02 §7.1).
 *        - **Festival** (Madi, bought) - the seasonal look, optional.
 *      Every Festival item has a Market cousin in the SAME slot, so nobody's
 *      farm looks poorer because they didn't pay. Enforced by store.spec.ts.
 *   2. THE VILLAGE PASS (M50/month) - helper, monthly outfit, +50% storage.
 *
 * What is NOT here, on purpose:
 *   - **Boosts.** Cut outright (docs/34 §3.3). They were sold while doing
 *     nothing; `BOOSTS` is an empty list and `BOOST_SLUGS` is empty.
 *   - **Anything that grants Pula.** Pula is earned-only (MVP/02 §3.1). Top-ups
 *     grant MADI. This is the anti-pay-to-win switch and it is structural.
 */

import { TOP_UP_PACKS, COSMETIC_PRICE_RANGE, VILLAGE_PASS } from './economy';
import type { ChapterSlug } from './chapters';

export type StoreCategory = 'currency' | 'subscription' | 'cosmetic';

export interface VirtualGood {
  sku: string;
  name: string;
  description: string;
  category: StoreCategory;
  price: number;
  /** BWP = the price is in real money. PULA = earned. MADI = premium balance. */
  currency: 'BWP' | 'PULA' | 'MADI';
  consumable: boolean;
  available: boolean;
  /** Restriction by Setswana chapter (04 §9.2). null = always available. */
  chapter?: ChapterSlug | null;
  entitlement: VirtualEntitlement;
  displayOrder: number;
  /** Which cosmetic shelf this sits on. Undefined for non-cosmetics. */
  shelf?: CosmeticShelf;
  /** Which visual affordance this fills. A Festival item needs a Market cousin. */
  slot?: CosmeticSlot;
}

/**
 * Which SHELF a cosmetic is sold on. This is the whole merchandising model:
 * `market` is what everyone can reach for free, `festival` is the paid
 * seasonal skin of the same thing.
 */
export type CosmeticShelf = 'market' | 'festival';

/** What a cosmetic changes visually. Two items in one slot never conflict. */
export type CosmeticSlot = 'hut' | 'kraal' | 'frame' | 'livestock' | 'outfit';

export type VirtualEntitlement =
  | { type: 'madi'; amount: number }
  | { type: 'subscription'; slug: string; days: number }
  | { type: 'cosmetic'; cosmeticId: string };

const TOP_UP_ENTITLEMENTS: Record<string, VirtualGood> = Object.fromEntries(
  TOP_UP_PACKS.map((p, i) => [
    p.slug,
    {
      sku: `topup_${p.slug}`,
      name: `${p.name} Pack`,
      description: `${p.grantedMadi} Madi, credited on confirmation. Spend it on decorations and the Village Pass.`,
      category: 'currency' as const,
      price: p.priceBwp,
      currency: 'BWP' as const,
      consumable: true,
      available: true,
      entitlement: { type: 'madi', amount: p.grantedMadi } as VirtualEntitlement,
      displayOrder: 1 + i,
    } satisfies VirtualGood,
  ]),
);

const VILLAGE_PASS_ENTITLEMENT: VirtualGood = {
  sku: 'subscription_village_pass',
  name: 'Village Pass',
  description:
    'M50/month. A helper that waters and collects while you are away, one festival outfit each month, and +50% storage. The same helper is earned free at Botho 500 - paying gets it early, playing gets it forever.',
  category: 'subscription',
  price: VILLAGE_PASS.priceMadi,
  currency: 'MADI',
  consumable: false,
  available: true,
  entitlement: { type: 'subscription', slug: VILLAGE_PASS.slug, days: VILLAGE_PASS.days },
  displayOrder: 10,
};

/**
 * docs/34 §3.3 (DECIDED 2026-10-01) - boosts are CUT, not merely withdrawn.
 *
 * Pula Stone, Ancestral Ward and Breath of the Land were catalogued and sold
 * while no endpoint applied any of their effects (docs/KNOWN_LIMITATIONS.md).
 * `available: false` was the withdrawal; the entries themselves are the problem,
 * because they can be half-restored by a later merge and they kept `BOOSTS`
 * looking like a live product line.
 *
 * Re-adding one is a deliberate act gated on EVERY effect in its description
 * working - see docs/34 §6 "do-not-do". `BOOSTS` and `BOOST_SLUGS` are both
 * empty, and the spec asserts the catalogue stays empty.
 */
const BOOST_ENTITLEMENTS: VirtualGood[] = [];

/**
 * THE TWO SHELVES (docs/33 -§2.1, docs/34 -§3.1).
 *
 * - **Market** â--⬝ Pula, 200/600/1,500. Earned, not bought. These are why
 *   late-game Pula has somewhere to go: MVP/02 -§7.1 records P1,913-8,814 a
 *   month accumulating with nothing to buy, and this is that unbounded sink.
 * - **Festival** â--⬝ Madi, 40/80/150/300. The seasonal look, optional.
 *
 * `slot` is load-bearing: every Festival item must have a Market cousin in the
 * same slot, so a free player can reach every visual affordance the game has.
 * store.spec.ts asserts it, because that promise is the whole product.
 */
const COSMETIC_ENTITLEMENTS: VirtualGood[] = [
  /* ------------- Market shelf (Pula - earned, open to everyone) ------------- */
  { sku: 'cos_market_hut_ochre', name: 'Moriti Hut Roof', description: 'A thatched roof in the dry-season ochre.', category: 'cosmetic', price: 600, currency: 'PULA', consumable: false, available: true, chapter: 'moriti', shelf: 'market', slot: 'hut', entitlement: { type: 'cosmetic', cosmeticId: 'hut_roof_ochre' }, displayOrder: 30 },
  { sku: 'cos_market_hut_trim', name: 'Phane Hut Trim', description: 'Warm red trim, in the colours of the late rains.', category: 'cosmetic', price: 600, currency: 'PULA', consumable: false, available: true, chapter: 'phane', shelf: 'market', slot: 'hut', entitlement: { type: 'cosmetic', cosmeticId: 'hut_trim_phane' }, displayOrder: 31 },
  { sku: 'cos_market_kraal_horizon', name: 'Horizon Kraal Pattern', description: 'Painted thorn branches in the evening colours.', category: 'cosmetic', price: 1500, currency: 'PULA', consumable: false, available: true, chapter: 'letlhafula', shelf: 'market', slot: 'kraal', entitlement: { type: 'cosmetic', cosmeticId: 'kraal_pattern_horizon' }, displayOrder: 32 },
  { sku: 'cos_market_frame_bush', name: 'Open Bush Frame', description: 'A wooden border for your field.', category: 'cosmetic', price: 200, currency: 'PULA', consumable: false, available: true, chapter: null, shelf: 'market', slot: 'frame', entitlement: { type: 'cosmetic', cosmeticId: 'frame_open_bush' }, displayOrder: 33 },
  { sku: 'cos_market_coat', name: 'Goat Coat', description: 'A ceremonial blanket for the goats. They do not care. You will.', category: 'cosmetic', price: 600, currency: 'PULA', consumable: false, available: true, chapter: null, shelf: 'market', slot: 'livestock', entitlement: { type: 'cosmetic', cosmeticId: 'livestock_coat' }, displayOrder: 34 },
  { sku: 'cos_market_hat', name: 'Mogolo Hat', description: 'A wide-brimmed hat for your fields. He wears one just like it.', category: 'cosmetic', price: 600, currency: 'PULA', consumable: false, available: true, chapter: 'pula', shelf: 'market', slot: 'outfit', entitlement: { type: 'cosmetic', cosmeticId: 'mogolo_hat' }, displayOrder: 35 },
/* ------------ Festival shelf (Madi - bought, purely optional) ------------- */
  { sku: 'cos_fest_hut_rains', name: 'Festival Hut Rains', description: 'Green-gold thatch for the first rains. Same hut, dressed up.', category: 'cosmetic', price: 40, currency: 'MADI', consumable: false, available: true, chapter: 'pula', shelf: 'festival', slot: 'hut', entitlement: { type: 'cosmetic', cosmeticId: 'fest_hut_rains' }, displayOrder: 40 },
  { sku: 'cos_fest_hut_moriti', name: 'Festival Hut Moriti', description: 'Dust-pale thatch for the dry months.', category: 'cosmetic', price: 40, currency: 'MADI', consumable: false, available: true, chapter: 'moriti', shelf: 'festival', slot: 'hut', entitlement: { type: 'cosmetic', cosmeticId: 'fest_hut_moriti' }, displayOrder: 41 },
  { sku: 'cos_fest_kraal_letlhafula', name: 'Festival Kraal Letlhafula', description: 'The harvest-colour kraal, painted once a year.', category: 'cosmetic', price: 80, currency: 'MADI', consumable: false, available: true, chapter: 'letlhafula', shelf: 'festival', slot: 'kraal', entitlement: { type: 'cosmetic', cosmeticId: 'fest_kraal_letlhafula' }, displayOrder: 42 },
  { sku: 'cos_fest_frame_bush', name: 'Festival Frame', description: 'Carved border for your field, re-cut each season.', category: 'cosmetic', price: 80, currency: 'MADI', consumable: false, available: true, chapter: null, shelf: 'festival', slot: 'frame', entitlement: { type: 'cosmetic', cosmeticId: 'fest_frame_bush' }, displayOrder: 43 },
  { sku: 'cos_fest_coat', name: 'Festival Coat', description: 'The goats wear it better than you do.', category: 'cosmetic', price: 80, currency: 'MADI', consumable: false, available: true, chapter: null, shelf: 'festival', slot: 'livestock', entitlement: { type: 'cosmetic', cosmeticId: 'fest_coat' }, displayOrder: 44 },
  { sku: 'cos_fest_outfit', name: 'Festival Outfit', description: 'What you wear to the harvest. Mogolo approves.', category: 'cosmetic', price: 150, currency: 'MADI', consumable: false, available: true, chapter: 'letlhafula', shelf: 'festival', slot: 'outfit', entitlement: { type: 'cosmetic', cosmeticId: 'fest_outfit' }, displayOrder: 45 },
  { sku: 'cos_fest_set_harvest', name: 'Festival Set Hut Kraal Frame', description: 'The whole farm dressed for Letlhafula. Three looks for less than three prices.', category: 'cosmetic', price: 300, currency: 'MADI', consumable: false, available: true, chapter: 'letlhafula', shelf: 'festival', slot: 'hut', entitlement: { type: 'cosmetic', cosmeticId: 'fest_set_harvest' }, displayOrder: 46 },
];
export const VIRTUAL_GOODS: VirtualGood[] = [
  ...Object.values(TOP_UP_ENTITLEMENTS),
  VILLAGE_PASS_ENTITLEMENT,
  ...BOOST_ENTITLEMENTS,
  ...COSMETIC_ENTITLEMENTS,
];

export function getVirtualGood(sku: string): VirtualGood | undefined {
  return VIRTUAL_GOODS.find((g) => g.sku === sku);
}

export function getAvailableGoods(chapter?: string | null): VirtualGood[] {
  return VIRTUAL_GOODS.filter((g) => {
    if (!g.available) return false;
    if (g.chapter && g.chapter !== chapter) return false;
    return true;
  });
}

export function getGoodsByCategory(category: StoreCategory): VirtualGood[] {
  return VIRTUAL_GOODS.filter((g) => g.category === category && g.available);
}

/** One shelf - what the storefront renders as "Market" or "Festival". */
export function getShelf(shelf: CosmeticShelf): VirtualGood[] {
  return VIRTUAL_GOODS.filter((g) => g.category === 'cosmetic' && g.shelf === shelf && g.available);
}

/** 02 6.6 - R4 / C5. P500/player/day, enforced in Botswana time (UTC+2). */
export { COSMETIC_PRICE_RANGE };
