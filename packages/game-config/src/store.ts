/**
 * The store — docs/MVP/02_Economy_And_Currencies.md §6.6.
 *
 * Three categories only:
 *   - Top-up packs (Pula is transparent and 1:1)
 *   - Guild subscription
 *   - Boosts (THREE, not four — Fertility Shell is REMOVED, R8)
 *
 * Cosmetics live in seed data so seasonal rotation is effectively infinite (F7).
 * The `VirtualGood` shape is preserved so the existing payments service keeps
 * working — only the contents are now spec-aligned.
 */

import { BOOSTS, TOP_UP_PACKS, COSMETIC_PRICE_RANGE, GUILD_SUBSCRIPTION } from './economy';

export type StoreCategory = 'currency' | 'subscription' | 'boost' | 'cosmetic';

export interface VirtualGood {
  sku: string;
  name: string;
  description: string;
  category: StoreCategory;
  price: number;
  currency: 'BWP' | 'PULA';
  consumable: boolean;
  available: boolean;
  /** Restriction by Setswana chapter (04 §9.2). null = always available. */
  chapter?: 'pula' | 'phane' | 'moriti' | 'letlhafula' | null;
  entitlement: VirtualEntitlement;
  displayOrder: number;
}

export type VirtualEntitlement =
  | { type: 'currency'; amount: number }
  | { type: 'subscription'; slug: string; days: number }
  | { type: 'boost'; slug: string }
  | { type: 'cosmetic'; cosmeticId: string };

const TOP_UP_ENTITLEMENTS: Record<string, VirtualGood> = Object.fromEntries(
  TOP_UP_PACKS.map((p, i) => [
    p.slug,
    {
      sku: `topup_${p.slug}`,
      name: `${p.name} Pack`,
      description: `P${p.grantedPula} of Pula, credited on confirmation. The Co-op tax still applies when you spend it.`,
      category: 'currency' as const,
      price: p.priceBwp,
      currency: 'BWP' as const,
      consumable: true,
      available: true,
      entitlement: { type: 'currency', amount: p.grantedPula } as VirtualEntitlement,
      displayOrder: 1 + i,
    } satisfies VirtualGood,
  ]),
);

const GUILD_ENTITLEMENT: VirtualGood = {
  sku: 'subscription_guild',
  name: 'Guild Subscription',
  description:
    'P49/month. Auto-Collector, +50% storage stacking, weekly Pula Stone, ad-free, cosmetics. Auto-Collector can never deliver a quest or donate — that control is load-bearing (I4).',
  category: 'subscription',
  price: GUILD_SUBSCRIPTION.priceBwp,
  currency: 'BWP',
  consumable: false,
  available: true,
  entitlement: { type: 'subscription', slug: GUILD_SUBSCRIPTION.slug, days: 30 },
  displayOrder: 10,
};

/**
 * RULING 2026-09-11 — boost effects are deferred from v1 (see docs/KNOWN_LIMITATIONS.md).
 *
 * Ownership is recorded on purchase, but NO endpoint applies any effect: no tank refill,
 * no rain guarantee, no raid shield, no timer completion. Selling a boost that does
 * nothing is worse than not selling it, so `available` is false. That single flag is
 * load-bearing: `getGoodsByCategory()` and `GET /payments/store` both filter on it, so
 * the boosts leave both storefronts at once and `purchase()` rejects them.
 *
 * The entries stay in the catalogue deliberately — R8/C10 is about what EXISTS, and
 * `BOOST_SLUGS` is pinned by launch-readiness.spec.ts. Restoring them is one line.
 */
const BOOST_ENTITLEMENTS: VirtualGood[] = BOOSTS.map((b, i) => ({
  sku: `boost_${b.slug}`,
  name: b.name,
  description: b.effect,
  category: 'boost' as const,
  price: b.pricePula,
  currency: 'PULA' as const,
  consumable: true,
  available: false,
  entitlement: { type: 'boost', slug: b.slug } as VirtualEntitlement,
  displayOrder: 20 + i,
}));

/**
 * F7 — cosmetics are the only truly unbounded Pula sink. Indicative prices
 * P200–P2,000; seasonal rotation makes it effectively infinite. v1 ships a thin
 * initial line; new ones are seeded by chapter.
 */
const COSMETIC_ENTITLEMENTS: VirtualGood[] = [
  { sku: 'cos_hut_moriti', name: 'Moriti Hut Roof', description: 'A thatched roof in the dry-season ochre.', category: 'cosmetic', price: 600, currency: 'PULA', consumable: false, available: true, chapter: 'moriti', entitlement: { type: 'cosmetic', cosmeticId: 'hut_roof_moriti' }, displayOrder: 30 },
  { sku: 'cos_hut_phane', name: 'Phane Hut Trim', description: 'Warm red trim, in the colours of the late rains.', category: 'cosmetic', price: 600, currency: 'PULA', consumable: false, available: true, chapter: 'phane', entitlement: { type: 'cosmetic', cosmeticId: 'hut_trim_phane' }, displayOrder: 31 },
  { sku: 'cos_kraal_pattern_horizon', name: 'Horizon Kraal Pattern', description: 'Painted thorn branches in the evening colours.', category: 'cosmetic', price: 1200, currency: 'PULA', consumable: false, available: true, chapter: 'letlhafula', entitlement: { type: 'cosmetic', cosmeticId: 'kraal_pattern_horizon' }, displayOrder: 32 },
  { sku: 'cos_mogolo_hat', name: 'Mogolo\'s Hat', description: 'A wide-brimmed hat for your fields. He wears one just like it.', category: 'cosmetic', price: 900, currency: 'PULA', consumable: false, available: true, chapter: 'pula', entitlement: { type: 'cosmetic', cosmeticId: 'mogolo_hat' }, displayOrder: 33 },
  { sku: 'cos_scene_frame_open_bush', name: 'Open Bush Frame', description: 'A wooden border for your field.', category: 'cosmetic', price: 400, currency: 'PULA', consumable: false, available: true, chapter: null, entitlement: { type: 'cosmetic', cosmeticId: 'frame_open_bush' }, displayOrder: 34 },
  { sku: 'cos_livestock_coat', name: 'Goat Coat', description: 'A ceremonial blanket for the goats. They do not care. You will.', category: 'cosmetic', price: 350, currency: 'PULA', consumable: false, available: true, chapter: null, entitlement: { type: 'cosmetic', cosmeticId: 'livestock_coat' }, displayOrder: 35 },
];

export const VIRTUAL_GOODS: VirtualGood[] = [
  ...Object.values(TOP_UP_ENTITLEMENTS),
  GUILD_ENTITLEMENT,
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

/** 02 §6.6 — R4 / C5. P500/player/day, enforced in Botswana time (UTC+2). */
export { COSMETIC_PRICE_RANGE };
