/**
 * Crafting — numbers of record from docs/MVP/02_Economy_And_Currencies.md §6.3
 * and behaviour from 03_Core_Systems.md §3.
 *
 * Every row closes horizontally: `Total + Profit == Net` — but only when the input
 * column is read at OPPORTUNITY COST (base x 0.95), i.e. what you'd net from just
 * selling the material. Printing base value in one column and opportunity cost in
 * the next is what made the old table not add up (F4).
 *
 * F14: timers are 2–6 HOURS, not minutes. 10-minute timers pressure a player to sit
 * in the app, which contradicts the 5–15 minute session and the no-babysitting goal.
 * Once a timer is shorter than the visit interval, SLOTS are the binding constraint,
 * not timers — which is exactly the progression C22 intended.
 */

import { ITEMS, type ItemDef } from './items';

/** Opportunity cost = base x 0.95. What you'd net from selling the input instead. */
export const OPPORTUNITY_COST_FACTOR = 0.95;
export const COOP_TAX = 0.05;

export function opportunityCost(item: ItemDef, qty = 1): number {
  return item.baseValue * OPPORTUNITY_COST_FACTOR * qty;
}

/**
 * A substitution group: the recipe needs `qty` items drawn from `anyOf`.
 * 03 §3.3 — substitution is what makes an inventory feel like yours rather than
 * like a spreadsheet, and it must be a VISIBLE CHOICE, not an automatic pick.
 */
export interface InputGroup {
  anyOf: string[];
  qty: number;
}

export interface RecipeDef {
  slug: 'poleto' | 'thapo' | 'setena' | 'bupi' | 'borotho';
  name: string;
  setswana: string;
  output: string;
  outputQty: number;
  inputs: InputGroup[];
  /** Fee for a batch of 1. */
  feePula: number;
  durationMinutes: number;
  /** null = available from the start; otherwise a Botho threshold (02 §6.4). */
  unlock: { bothoGte: number } | null;
  /** F14 — the spec's own floor. No recipe may be quicker than 2 hours. */
  note?: string;
}

export const RECIPES: Record<RecipeDef['slug'], RecipeDef> = {
  poleto: {
    slug: 'poleto',
    name: 'Plank',
    setswana: 'Poleto',
    output: 'poleto',
    outputQty: 1,
    inputs: [{ anyOf: ['wood'], qty: 2 }],
    feePula: 1,
    durationMinutes: 120,
    unlock: null,
    note: 'Building material. Also the input for seasonal maintenance.',
  },
  thapo: {
    slug: 'thapo',
    name: 'Rope',
    setswana: 'Thapo',
    output: 'thapo',
    outputQty: 1,
    inputs: [{ anyOf: ['palm_fiber'], qty: 3 }],
    feePula: 1,
    durationMinutes: 120,
    unlock: null,
    note: 'The best profit per slot-hour in the chain. Kraal repair needs it.',
  },
  setena: {
    slug: 'setena',
    name: 'Brick',
    setswana: 'Setena',
    output: 'setena',
    outputQty: 1,
    // F8: Stone had no recipe at all, so a third of a scene's output was dead
    // content. Setena now accepts any two of Clay / Stone, mixed pairs included.
    inputs: [{ anyOf: ['clay', 'stone'], qty: 2 }],
    feePula: 2,
    durationMinutes: 180,
    unlock: null,
    note: 'Any two of clay and stone — mixed pairs allowed.',
  },
  bupi: {
    slug: 'bupi',
    name: 'Flour',
    setswana: 'Bupi',
    output: 'bupi',
    outputQty: 1,
    inputs: [{ anyOf: ['sorghum', 'millet'], qty: 4 }],
    feePula: 2,
    durationMinutes: 240,
    unlock: { bothoGte: 100 },
    note: 'Four of any grain. Sorghum is the cheaper branch — the UI shows both.',
  },
  borotho: {
    slug: 'borotho',
    name: 'Bread',
    setswana: 'Borotho',
    output: 'borotho',
    outputQty: 1,
    inputs: [{ anyOf: ['bupi'], qty: 2 }],
    feePula: 3,
    durationMinutes: 360,
    unlock: { bothoGte: 100 },
    note: 'Deliberately a two-day good in practice: Bupi 4 h then Borotho 6 h.',
  },
};

export const RECIPE_SLUGS = Object.keys(RECIPES) as RecipeDef['slug'][];

/** 03 §3.2 — batching trades capital tied up for fee efficiency (sub-linear). */
export const BATCH_SIZES = [1, 3, 6] as const;
export type BatchSize = (typeof BATCH_SIZES)[number];
export const BATCH_FEE_MULTIPLIER: Record<BatchSize, number> = { 1: 1, 3: 2.5, 6: 4 };

export function batchFee(recipe: RecipeDef, qty: BatchSize): number {
  return Math.round(recipe.feePula * BATCH_FEE_MULTIPLIER[qty]);
}

/** 03 §3.1 — one slot by default; the 2nd and 3rd come from Crafting upgrades. */
export const CRAFTING_SLOTS = { base: 1, perUpgrade: 1, max: 3 } as const;

/**
 * 03 §3.4 — variance, never failure. A batch sometimes yields a bonus unit.
 * Cozy games should only ever surprise the player upward.
 */
export const BONUS_YIELD_CHANCE = 0.12;

export interface RecipeEconomics {
  /** What the inputs would fetch if you just sold them. */
  inputValue: number;
  fee: number;
  totalCost: number;
  saleGross: number;
  netAfterTax: number;
  profit: number;
  roi: number;
}

/**
 * The margin for one specific choice of inputs. 03 §3.6: show input value against
 * output value on the recipe card, so a player can see the margin without doing
 * arithmetic — and never let a craft be a loss by accident (say so if it is).
 */
export function recipeEconomics(
  recipe: RecipeDef,
  chosenInputs: Record<string, number>,
  qty: BatchSize = 1,
): RecipeEconomics {
  let inputValue = 0;
  for (const group of recipe.inputs) {
    for (const [slug, n] of Object.entries(chosenInputs)) {
      if (!group.anyOf.includes(slug)) continue;
      const item = ITEMS[slug];
      if (item) inputValue += opportunityCost(item, n);
    }
  }
  const fee = batchFee(recipe, qty);
  const out = ITEMS[recipe.output];
  const outputQty = recipe.outputQty * qty;
  const saleGross = (out?.baseValue ?? 0) * outputQty;
  const netAfterTax = saleGross * (1 - COOP_TAX);
  const totalCost = inputValue + fee;
  const profit = netAfterTax - totalCost;
  return {
    inputValue: round2(inputValue),
    fee,
    totalCost: round2(totalCost),
    saleGross: round2(saleGross),
    netAfterTax: round2(netAfterTax),
    profit: round2(profit),
    roi: totalCost > 0 ? round2(profit / totalCost) : 0,
  };
}

/** Default the substitution to whichever the player has more of (03 §3.3). */
export function defaultInputsFor(recipe: RecipeDef, owned: Record<string, number>): Record<string, number> {
  const chosen: Record<string, number> = {};
  for (const group of recipe.inputs) {
    if (group.anyOf.length === 1) {
      chosen[group.anyOf[0]!] = group.qty;
      continue;
    }
    // Prefer the cheapest sufficient option; fall back to most-owned among affordable.
    let remaining = group.qty;
    const ranked = [...group.anyOf].sort((a, b) => (owned[b] ?? 0) - (owned[a] ?? 0));
    for (const slug of ranked) {
      const have = owned[slug] ?? 0;
      if (have <= 0) continue;
      const take = Math.min(have, remaining);
      chosen[slug] = take;
      remaining -= take;
      if (remaining === 0) break;
    }
    if (remaining > 0) {
      // Nothing owned — show the first option so the card still reads sensibly.
      chosen[ranked[0] ?? group.anyOf[0]!] = (chosen[ranked[0] ?? group.anyOf[0]!] ?? 0) + remaining;
    }
  }
  return chosen;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
