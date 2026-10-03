import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  COOP_TAX_RATE,
  PRICE_BAND,
  CRAFTED_BAND,
  CRAFTED_CATEGORIES,
  getItemDef,
  isSeedInSeason,
  nextSeasonFor,
  chapterForDate,
  CHAPTER_MARKET_EVENTS,
  type ChapterSlug,
} from '@molemisi/game-config';

/**
 * Pula is NUMERIC(12,2) in the wallet, so every derived amount is rounded to
 * two decimals at the point it is computed. Doing it once here — rather than
 * letting each call site round or not — is what stops a hundred tiny rounding
 * differences from turning into a reconciliation problem.
 */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Crafted and processed goods (DITSALO, DIKUNO) are exempt from the speculative
 * price band (C14). One predicate, shared by the band and the quote, so the two
 * cannot disagree about which regime an item is in.
 */
function isCrafted(itemType: string): boolean {
  const def = getItemDef(itemType);
  return !!def && (CRAFTED_CATEGORIES as readonly string[]).includes(def.category);
}

/**
 * Seeds (DIPEO) are buyable at the Co-op but explicitly NOT sellable
 * (docs/26 §11.1 — "seeds never sell"). The catalogue carries seed rows only so
 * the BUY path (buyItem) has a price; the SELL path (sellItem/quoteSale) must
 * reject them, otherwise a player could flip seeds. The `_seed` suffix is the
 * documented UI gate (26 §11); the category check is the authoritative one.
 */
function isSeedItem(itemType: string): boolean {
  const def = getItemDef(itemType);
  return def?.category === 'DIPEO' || itemType.endsWith('_seed');
}

/**
 * Which price band an item sells in. Crafted and processed goods get the narrow
 * 0.9–1.1 band instead of the speculative 0.5–2.0 one (C14). Anything
 * unrecognised falls back to the wide band, which is the safe default.
 */
function bandFor(itemType: string): { min: number; max: number } {
  return isCrafted(itemType)
    ? { min: CRAFTED_BAND.min, max: CRAFTED_BAND.max }
    : { min: PRICE_BAND.min, max: PRICE_BAND.max };
}

/**
 * Sale inputs come straight off the request body, so they are re-validated
 * here as well as in the controller (M5 — defence in depth: a future caller
 * that skips the Zod gate must still never reach `inventory.removeItem` with
 * a fractional or negative quantity, which previously wrote fractional
 * inventory rows and `Math.round(price * -n)` credits).
 */
export class SellItemInput {
  itemType!: string;
  quantity!: number;
}

export class BuyItemInput {
  itemType!: string;
  quantity!: number;
}

/** Parse a positive integer quantity or throw the caller's 400 for them. */
export function parseQuantity(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  throw new BadRequestException('quantity must be a positive whole number');
}

export interface SellResult {
  transaction: {
    itemType: string;
    quantity: number;
    pricePerUnit: number;
    /** Gross, before the Co-op's cut. */
    totalPrice: number;
    /** The Co-op's 5% (02 §4.1). Zero for nothing — every sale pays it. */
    tax: number;
    /** What actually lands in the wallet. This is the number the UI must show. */
    netProceeds: number;
  };
  currencyAdded: number;
  newCurrencyBalance: number;
}

/**
 * A read-only preview of a sale (07 §7.5). Same numbers as `SellResult.transaction`
 * would be, with nothing written — so the confirm sheet can show the fee *before*
 * the button, which 01 §4 requires ("never surprise the player with a cost").
 */
export interface SaleQuote {
  itemType: string;
  quantity: number;
  pricePerUnit: number;
  /** Before the Co-op's cut. */
  gross: number;
  tax: number;
  /** 0.05, from config — never restated in the client. */
  taxRate: number;
  /** What would land in the wallet. */
  netProceeds: number;
  /** Crafted goods sit in the narrow band and do not drift with the market (C14). */
  band: 'wide' | 'crafted';
}

export interface BuyResult {
  transaction: {
    itemType: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  };
  currencyDeducted: number;
  newCurrencyBalance: number;
}

export interface MarketPrice {
  itemType: string;
  basePrice: number;
  currentPrice: number;
  trend: 'up' | 'down' | 'stable';
  supply: number;
  demand: number;
}

export interface MarketEvent {
  id: string;
  name: string;
  description: string;
  effect: string;
  multiplier: number;
  endsAt: string;
}

@Injectable()
export class MarketService {
  constructor(
    private supabaseService: SupabaseService,
    private wallet: WalletService,
    private inventory: InventoryService,
  ) {}

  // Price multiplier bounds — sourced from config, not restated here.
  private readonly MIN_PRICE_MULT = PRICE_BAND.min;
  private readonly MAX_PRICE_MULT = PRICE_BAND.max;
  private readonly SUPPLY_IMPACT = 0.002; // per unit sold
  private readonly DEMAND_IMPACT = 0.001; // per unit bought
  private readonly PRICE_DECAY = 0.02; // price moves toward base per update

  /**
   * The one place a Co-op sale's fee is computed. `sellItem` and `quoteSale` both
   * call it, so the confirm sheet the player saw and the credit they actually get
   * cannot drift apart — a quote that disagrees with the sale is worse than no
   * quote at all (07 §7.5).
   */
  private computeSale(pricePerUnit: number, quantity: number): {
    gross: number;
    tax: number;
    netProceeds: number;
  } {
    const gross = Math.round(pricePerUnit * quantity);
    const tax = round2(gross * COOP_TAX_RATE);
    return { gross, tax, netProceeds: round2(gross - tax) };
  }

  /**
   * Reject a quantity that is not a whole, positive, finite number.
   *
   * A5 (security audit 2026-10-03) — this guard did not exist. `@Body()` gives
   * whatever JSON the client sent, so `quantity` could be `0`, `-5`, `1.5`,
   * `"3"`, `null`, or `1e9`. Two of those are directly exploitable:
   *
   *   - NEGATIVE on buy. `totalPrice = price * quantity` goes negative, so
   *     `wallet.spendPula` is asked to spend a NEGATIVE amount — it would
   *     CREDIT the player rather than debit them, and `inventory.addItem` with a
   *     negative quantity would likewise move the wrong way. The seeds-only
   *     gate (R3a) means the attacker needs an in-season seed, which every
   *     player has, so this was a free-money route.
   *   - FRACTIONAL quantities. Pula is NUMERIC(12,2) but the stack caps and item
   *     quantities are whole numbers; a fractional write leaves rows no other
   *     code path can produce, and rounding at the DB boundary makes the credited
   *     amount disagree with the debited one.
   *
   * `quoteSale` had a `quantity <= 0` check but no integer check, so it happily
   * quoted a fractional sale that `sellItem` would then refuse — the quote sheet
   * and the sale could disagree. One validator, called by all three, is what
   * makes "the quote matches the sale" (07 §7.5) actually true.
   *
   * No upper bound is imposed here: the per-item stack cap and the daily cap are
   * enforced by the stores that actually know them, and inventing a second limit
   * here would just be a number that drifts out of step with the real one.
   */
  private requireWholeQuantity(quantity: number): number {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException(
        `quantity must be a positive whole number (got ${JSON.stringify(quantity)})`,
      );
    }
    return quantity;
  }

  /**
   * Preview a sale without writing anything: price today, gross, the Co-op's 5%
   * and the net the player would receive. Reuses `computeSale`, so it is exact.
   */
  async quoteSale(itemType: string, quantity: number): Promise<SaleQuote> {
    // A5 — the same validator the real sale uses, so a quote can never describe
    // a transaction `sellItem` would refuse.
    this.requireWholeQuantity(quantity);

    const pricePerUnit = await this.getDynamicPrice(itemType);
    if (pricePerUnit <= 0) {
      throw new BadRequestException('Item has no market value');
    }

    if (isSeedItem(itemType)) {
      throw new BadRequestException('Seeds cannot be sold at the Co-op');
    }

    const { gross, tax, netProceeds } = this.computeSale(pricePerUnit, quantity);
    return {
      itemType,
      quantity,
      pricePerUnit,
      gross,
      tax,
      taxRate: COOP_TAX_RATE,
      netProceeds,
      band: isCrafted(itemType) ? 'crafted' : 'wide',
    };
  }

  async sellItem(
    farmId: string,
    userId: string,
    itemType: string,
    rawQuantity: number,
    _quality: string = 'normal',
  ): Promise<SellResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // M5 — re-validated at the service boundary (defence in depth), in addition
    // to the Zod gate in the controller. `removeItem` and `computeSale` must
    // never see a fractional, zero, or negative quantity.
    const quantity = parseQuantity(rawQuantity);

    // A5 — validate BEFORE the ownership read and before any write. The old code
    // went straight to the inventory check, where `owned < quantity` is FALSE for
    // a negative quantity (`0 < -5` is false) — so a negative sale passed the
    // only gate there was, then `removeItem(player, item, -5)` ADDED five units
    // and `wallet.credit(..., netProceeds)` paid the Pula that came with them.
    // That is a money printer: sell -5 of anything you own and get paid for it.
    this.requireWholeQuantity(quantity);

    // 1. Verify farm ownership
    const { data: farm } = await adminClient
      .from('farms')
      .select('user_id')
      .eq('id', farmId)
      .single();
    if (!farm || farm.user_id !== userId) {
      throw new NotFoundException('Farm not found');
    }

    // 1b. Seeds are buyable but never sellable (docs/26 §11.1).
    if (isSeedItem(itemType)) {
      throw new BadRequestException('Seeds cannot be sold at the Co-op');
    }

    // 2. Check inventory has the item (canonical store)
    const owned = await this.inventory.countOwned(userId, itemType);
    if (owned < quantity) {
      throw new BadRequestException('Insufficient items in inventory');
    }

    // 3. Get dynamic market price
    const pricePerUnit = await this.getDynamicPrice(itemType);
    if (pricePerUnit <= 0) {
      throw new BadRequestException('Item has no market value');
    }

    // 4. Co-op tax, taken server-side (02 §4.1). Crafted goods are exempt from the
    //    price BAND, not the tax (C14) — they still pay 5%. Computed by the same
    //    helper the quote endpoint uses, so the two can never disagree.
    const { gross, tax, netProceeds } = this.computeSale(pricePerUnit, quantity);
    const now = new Date().toISOString();

    // 5. Remove from inventory (the only sanctioned writer)
    await this.inventory.removeItem(userId, itemType, quantity);

    const newCurrency = await this.wallet.credit(userId, 'pula', netProceeds, 'coop_sale');

    // 7. Record market transaction (audit only)
    await adminClient.from('market_transactions').insert({
      farm_id: farmId,
      transaction_type: 'SELL',
      item_type: itemType,
      quantity,
      price_per_unit: pricePerUnit,
      total_price: gross,
      quality: 'normal',
    });

    // 8. Update supply/demand
    await this.updateSupplyDemand(itemType, quantity, 0);

    return {
      transaction: {
        itemType,
        quantity,
        pricePerUnit,
        totalPrice: gross,
        tax,
        netProceeds,
      },
      currencyAdded: netProceeds,
      newCurrencyBalance: newCurrency,
    };
  }

  async buyItem(
    farmId: string,
    userId: string,
    itemType: string,
    rawQuantity: number,
  ): Promise<BuyResult> {
    const adminClient = this.supabaseService.getAdminClient();

    // M5 — same service-boundary validation as the sell path.
    const quantity = parseQuantity(rawQuantity);

    // A5 — the buy path had NO quantity validation at all, and this is the worse
    // of the two directions. `totalPrice = pricePerUnit * quantity` was computed
    // unchecked, so a negative quantity produced a negative `spendPula` — a debit
    // request for a negative amount, which the wallet's conditional-update
    // arithmetic turns into a CREDIT — while `inventory.addItem(..., negative)`
    // removed units instead of adding them. Guarded first, before the ownership
    // read and before any spend.
    this.requireWholeQuantity(quantity);

    // 1. Verify farm ownership
    const { data: farm } = await adminClient
      .from('farms')
      .select('user_id')
      .eq('id', farmId)
      .single();
    if (!farm || farm.user_id !== userId) {
      throw new NotFoundException('Farm not found');
    }

    // 1b. R3a / docs-31 P0-1 — THE CO-OP SELLS SEEDS ONLY, and only the ones in
    // season. The audit found the buy path accepted any priced item, so a player
    // could skip production entirely and farm craft/market arbitrage. The docs
    // have always said seeds only (26 §11); this is the code catching up.
    if (!isSeedItem(itemType)) {
      throw new BadRequestException(
        'The Co-op only sells seed (DIPEO). Produce and materials are sold, not bought.',
      );
    }
    const cropId = itemType.endsWith('_seed')
      ? itemType.slice(0, -'_seed'.length)
      : itemType;
    if (!isSeedInSeason(cropId as Parameters<typeof isSeedInSeason>[0])) {
      const next = nextSeasonFor(cropId as Parameters<typeof nextSeasonFor>[0]);
      throw new BadRequestException(
        `${cropId} seed is out of season — the Co-op stocks it again in ${next.name}.`,
      );
    }

    // 2. Get dynamic market price
    const pricePerUnit = await this.getDynamicPrice(itemType);
    if (pricePerUnit <= 0) {
      throw new BadRequestException('Item not available for purchase');
    }

    const totalPrice = pricePerUnit * quantity;
    const now = new Date().toISOString();

    // 3. Spend through the wallet (05 §P2). Atomic check-and-debit.
    const newCurrency = await this.wallet.spendPula(
      userId,
      totalPrice,
      itemType.includes('_seed') ? 'seed_purchase' : 'coop_sale',
    );

    // 4. Add to the canonical inventory store (handles stack + slot caps)
    await this.inventory.addItem(userId, farmId, itemType, quantity);

    // 5. Record market transaction (audit only)
    await adminClient.from('market_transactions').insert({
      farm_id: farmId,
      transaction_type: 'BUY',
      item_type: itemType,
      quantity,
      price_per_unit: pricePerUnit,
      total_price: totalPrice,
      quality: 'normal',
    });

    // 6. Update supply/demand
    await this.updateSupplyDemand(itemType, 0, quantity);

    return {
      transaction: {
        itemType,
        quantity,
        pricePerUnit,
        totalPrice,
      },
      currencyDeducted: totalPrice,
      newCurrencyBalance: newCurrency,
    };
  }

  async getPrices(): Promise<MarketPrice[]> {
    const adminClient = this.supabaseService.getAdminClient();
    const { data: prices } = await adminClient.from('market_prices').select('*');
    if (!prices) return [];
    return await Promise.all(
      (prices ?? []).map(async (p: Record<string, unknown>) => {
        const itemType = p.item_type as string;
        const basePrice = p.base_price as number;
        const currentPrice = await this.getDynamicPrice(itemType);
        const supply = (p.supply as number) || 0;
        const demand = (p.demand as number) || 0;
        const trend =
          currentPrice > basePrice ? 'up' : currentPrice < basePrice ? 'down' : 'stable';
        return { itemType, basePrice, currentPrice, trend, supply, demand };
      }),
    );
  }

  async getActiveEvents(): Promise<MarketEvent[]> {
    // 3.3 — make sure a fresh install shows a chapter-themed event immediately.
    await this.ensureActiveChapterEvent();
    const adminClient = this.supabaseService.getAdminClient();
    const now = new Date().toISOString();
    const { data: events } = await adminClient.from('market_events').select('*').gt('ends_at', now);
    const rows = Array.isArray(events) ? events : [];
    // De-dupe by name so a concurrent double-seed cannot show the same event twice.
    const seen = new Set<string>();
    return rows
      .filter((e: Record<string, unknown>) => {
        const name = e.name as string;
        if (name && seen.has(name)) return false;
        if (name) seen.add(name);
        return true;
      })
      .map((e: Record<string, unknown>) => ({
        id: e.id as string,
        name: e.name as string,
        description: e.description as string,
        effect: e.effect as string,
        multiplier: e.multiplier as number,
        endsAt: e.ends_at as string,
      }));
  }

  /**
   * The live per-unit price of one item. Public because the workshop's margin
   * warning (31 §6.3) needs today's price, not the catalogue's base value, and it
   * must get it through this same band + event logic rather than re-deriving it.
   */
  async getDynamicPrice(itemType: string): Promise<number> {
    const adminClient = this.supabaseService.getAdminClient();
    const { data: priceData } = await adminClient
      .from('market_prices')
      .select('base_price, supply, demand')
      .eq('item_type', itemType)
      .single();
    if (!priceData) return 0;

    const basePrice = priceData.base_price as number;
    const supply = (priceData.supply as number) || 0;
    const demand = (priceData.demand as number) || 0;

    const supplyDemandRatio = supply > 0 ? demand / supply : 1;
    const supplyDemandModifier = Math.max(-0.3, Math.min(0.3, (supplyDemandRatio - 1) * 0.3));
    const eventModifier = await this.getEventModifier(itemType);

    // C14 — crafted/processed goods are exempt from the 0.5x–2.0x band (stable 1.0x ±10%).
    const band = bandFor(itemType);

    const priceMultiplier = 1 + supplyDemandModifier + eventModifier;
    const finalPrice = Math.round(basePrice * Math.max(band.min, Math.min(band.max, priceMultiplier)));
    return finalPrice;
  }

  /**
   * 3.3 — guarantees a fresh install always has an active, chapter-themed market
   * event and rotates it when the real Botswana chapter changes (04 §9.1). Idempotent:
   * if an event already active under the CURRENT chapter's pool name exists, it is a
   * no-op, so calling it on every event/price read is safe. No schema change — it
   * writes the existing `market_events` table. The chapter is matched by the pool
   * `name` (unique per chapter), which avoids needing a chapter column.
   */
  private async ensureActiveChapterEvent(): Promise<void> {
    const chapter = chapterForDate(new Date());
    const pool = CHAPTER_MARKET_EVENTS[chapter.slug as ChapterSlug];
    if (!pool) return;

    const adminClient = this.supabaseService.getAdminClient();
    const now = new Date().toISOString();
    const { data: active } = await adminClient
      .from('market_events')
      .select('id, name')
      .gt('ends_at', now);

    const rows = (Array.isArray(active) ? active : []) as Array<{ id: string; name: string }>;
    // Already running the current chapter's event — nothing to do.
    if (rows.some((e) => e.name === pool.name)) return;

    // Expire any out-of-chapter or stale active events, then seed the current one.
    if (rows.length > 0) {
      const ids = rows.map((e) => e.id);
      await adminClient.from('market_events').update({ ends_at: now }).in('id', ids);
    }
    await adminClient.from('market_events').insert({
      name: pool.name,
      description: pool.description,
      effect: pool.effect,
      multiplier: pool.multiplier,
      started_at: now,
      ends_at: new Date(Date.now() + pool.rotationHours * 3_600_000).toISOString(),
    });
  }

  private async getEventModifier(itemType: string): Promise<number> {
    // 3.3 — keep the price path in step with the displayed chapter event.
    await this.ensureActiveChapterEvent();
    const adminClient = this.supabaseService.getAdminClient();
    const now = new Date().toISOString();
    const { data: events } = await adminClient
      .from('market_events')
      .select('name, effect, multiplier')
      .gt('ends_at', now);
    if (!events || events.length === 0) return 0;

    let modifier = 0;
    const seen = new Set<string>();
    for (const event of events) {
      // Guard against a concurrent double-seed (two identical-name rows): a
      // chapter event must never apply its multiplier twice.
      const name = event.name as string;
      if (name) {
        if (seen.has(name)) continue;
        seen.add(name);
      }
      const effect = event.effect as string;
      const multiplier = event.multiplier as number;
      if (
        effect === 'all' ||
        (effect === 'grain' && ['sorghum', 'maize', 'millet'].includes(itemType)) ||
        (effect === 'food' && !itemType.includes('_seed')) ||
        (effect === 'materials' && ['wood', 'stone', 'iron'].includes(itemType)) ||
        effect === itemType
      ) {
        modifier += multiplier - 1;
      }
    }
    return modifier;
  }

  private async updateSupplyDemand(
    itemType: string,
    supplyIncrease: number,
    demandIncrease: number,
  ): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();
    const { data: current } = await adminClient
      .from('market_prices')
      .select('supply, demand')
      .eq('item_type', itemType)
      .single();
    if (!current) return;

    const currentSupply = (current.supply as number) || 0;
    const currentDemand = (current.demand as number) || 0;
    const decayedSupply = Math.max(0, currentSupply * (1 - this.PRICE_DECAY) + supplyIncrease);
    const decayedDemand = Math.max(0, currentDemand * (1 - this.PRICE_DECAY) + demandIncrease);

    await adminClient
      .from('market_prices')
      .update({
        supply: Math.round(decayedSupply),
        demand: Math.round(decayedDemand),
      })
      .eq('item_type', itemType);
  }
}
