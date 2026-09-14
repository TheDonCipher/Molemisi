import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { getVirtualGood, getGoodsByCategory, type VirtualGood } from '@molemisi/game-config';

export interface StoreItemView {
  sku: string;
  name: string;
  description: string;
  category: 'boost' | 'cosmetic';
  price: number;
  slug: string;
}

/**
 * P9 — the in-game Pula store (05 §P9; 02 §6.6, §7.1).
 *
 * This is the UNBOUNDED Pula sink the economy needs (F7). Top-up packs and the Guild
 * subscription are real-money and flow through PaymentsService; everything here is
 * priced in Pula and paid by debiting the wallet directly. Three things this service
 * is deliberately the only writer of:
 *
 *   - player_boosts rows (purchased boosts)
 *   - player_cosmetics rows (owned cosmetics)
 *
 * The wallet debit goes through WalletService.spendPula, so every purchase is a
 * ledgered event and can never take the balance negative.
 */
@Injectable()
export class StoreService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly wallet: WalletService,
  ) {}

  /**
   * The Pula-priced catalog, optionally filtered to what is visible in a given Setswana
   * chapter (04 §9.2). Never includes real-money goods — those are served by
   * GET /payments/store. Fertility Shell is absent by construction (R8), and the three
   * boosts are currently withdrawn while their effects are unwired (ruling 2026-09-11).
   * Both fall out for free: `getGoodsByCategory` filters on `available`.
   */
  getCatalog(chapter?: string | null): StoreItemView[] {
    const goods: VirtualGood[] = [
      ...getGoodsByCategory('boost'),
      ...getGoodsByCategory('cosmetic'),
    ];
    return (chapter ? goods.filter((g) => !g.chapter || g.chapter === chapter) : goods).map(
      (g) => ({
        sku: g.sku,
        name: g.name,
        description: g.description,
        category: g.category as 'boost' | 'cosmetic',
        price: g.price,
        slug:
          g.category === 'boost'
            ? (g.entitlement as { slug: string }).slug
            : (g.entitlement as { cosmeticId: string }).cosmeticId,
      }),
    );
  }

  /**
   * Buy a Pula-priced good. Validates the SKU, checks affordability, debits Pula,
   * then records ownership. Real-money SKUs (top-up packs, the Guild subscription)
   * are rejected here — they must go through POST /payments/create.
   */
  async purchase(playerId: string, sku: string): Promise<StoreItemView> {
    const good = getVirtualGood(sku);
    if (!good) {
      throw new NotFoundException(`Store item "${sku}" not found.`);
    }
    if (!good.available) {
      throw new BadRequestException(`Store item "${sku}" is not currently available.`);
    }
    if (good.currency !== 'PULA') {
      throw new BadRequestException(
        `"${sku}" is bought with real money — use POST /payments/create instead.`,
      );
    }

    const admin = this.supabase.getAdminClient();

    // A cosmetic is owned forever. Check ownership BEFORE charging: re-buying an owned
    // cosmetic is a no-op (no debit, no duplicate row). Boosts are consumables, so they
    // are always charged and always recorded.
    let alreadyOwnedCosmetic = false;
    if (good.category === 'cosmetic') {
      const cosmeticId = (good.entitlement as { cosmeticId: string }).cosmeticId;
      const { data: owned } = await admin
        .from('player_cosmetics')
        .select('id')
        .eq('player_id', playerId)
        .eq('cosmetic_id', cosmeticId)
        .maybeSingle();
      alreadyOwnedCosmetic = Boolean(owned);
    }

    if (!alreadyOwnedCosmetic) {
      if (!(await this.wallet.canAffordPula(playerId, good.price))) {
        throw new BadRequestException(
          `Not enough Pula for "${sku}" (need ${good.price}, see your balance).`,
        );
      }
      // Debit only when we are actually granting something. The debit is ledgered, so a
      // purchase is always auditable and can never take the balance negative.
      await this.wallet.spendPula(
        playerId,
        good.price,
        good.category === 'boost' ? 'boost_purchase' : 'cosmetic_purchase',
        sku,
      );
    }

    if (good.category === 'boost') {
      const slug = (good.entitlement as { slug: string }).slug;
      const { error } = await admin
        .from('player_boosts')
        .insert({ player_id: playerId, slug, source: 'purchase' });
      if (error) throw new BadRequestException(`Failed to record boost: ${error.message}`);
      return { sku: good.sku, name: good.name, description: good.description, category: 'boost', price: good.price, slug };
    }

    // Cosmetic: record only if not already owned (idempotent re-buy handled above).
    const cosmeticId = (good.entitlement as { cosmeticId: string }).cosmeticId;
    if (!alreadyOwnedCosmetic) {
      const { error } = await admin
        .from('player_cosmetics')
        .insert({ player_id: playerId, cosmetic_id: cosmeticId });
      if (error) throw new BadRequestException(`Failed to record cosmetic: ${error.message}`);
    }
    return { sku: good.sku, name: good.name, description: good.description, category: 'cosmetic', price: good.price, slug: cosmeticId };
  }
}
