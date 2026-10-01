import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { getVirtualGood, getGoodsByCategory, type VirtualGood, type CosmeticShelf } from '@molemisi/game-config';

export interface StoreItemView {
  sku: string;
  name: string;
  description: string;
  /** Cosmetic is the only category left — boosts were cut (docs/34 §3.3). */
  category: 'cosmetic';
  price: number;
  /** Which shelf, so the client can render Market / Festival. */
  shelf?: CosmeticShelf;
  /** The currency this specific item is bought with. */
  currency: 'PULA' | 'MADI';
  slug: string;
}

/**
 * P9 — the in-game store (05 §P9; 02 §6.6, §7.1; decided in docs/33, built in
 * docs/34).
 *
 * The **Market shelf** is the unbounded Pula sink the economy needs (F7): late
 * Pula otherwise accumulates with nothing to buy (MVP/02 §7.1 records P1,913 to
 * P8,814 a month). Top-up packs and the Village Pass are the real-money and
 * premium side and never appear here.
 *
 * docs/34 §3.1 — the **Festival shelf** is the same model in Madi. This service
 * is therefore the ONLY writer of `player_cosmetics`, and it spends from whichever
 * wallet the SKU is denominated in: `spendPula` for the Market shelf,
 * `spendMadi` for the Festival shelf. Both are ledgered and neither can take a
 * balance negative.
 */
@Injectable()
export class StoreService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly wallet: WalletService,
  ) {}

  /**
   * The cosmetic catalogue, optionally filtered to what is visible in a given
   * Setswana chapter (04 §9.2). Never includes real-money goods — those are
   * served by GET /payments/store.
   */
  getCatalog(chapter?: string | null): StoreItemView[] {
    const goods: VirtualGood[] = getGoodsByCategory('cosmetic');
    return (chapter ? goods.filter((g) => !g.chapter || g.chapter === chapter) : goods).map(
      (g) => ({
        sku: g.sku,
        name: g.name,
        description: g.description,
        category: 'cosmetic' as const,
        price: g.price,
        shelf: g.shelf,
        currency: g.currency as 'PULA' | 'MADI',
        slug: (g.entitlement as { cosmeticId: string }).cosmeticId,
      }),
    );
  }

  /**
   * Buy an in-game cosmetic. Market-shelf items spend Pula, Festival-shelf items
   * spend Madi. Real-money SKUs (top-up packs, the Village Pass) are rejected
   * here — they must go through POST /payments/create.
   */
  async purchase(playerId: string, sku: string): Promise<StoreItemView> {
    const good = getVirtualGood(sku);
    if (!good) {
      throw new NotFoundException(`Store item "${sku}" not found.`);
    }
    if (!good.available) {
      throw new BadRequestException(`Store item "${sku}" is not currently available.`);
    }
    if (good.category !== 'cosmetic') {
      throw new BadRequestException(`"${sku}" is not an in-game cosmetic.`);
    }
    if (good.currency === 'BWP') {
      throw new BadRequestException(
        `"${sku}" is bought with real money — use POST /payments/create instead.`,
      );
    }

    const admin = this.supabase.getAdminClient();
    const currency = good.currency as 'PULA' | 'MADI';
    const cosmeticId = (good.entitlement as { cosmeticId: string }).cosmeticId;

    // A cosmetic is owned forever. Check ownership BEFORE charging: re-buying an
    // owned cosmetic is a no-op (no debit, no duplicate row), so a player can
    // click twice without losing currency.
    const { data: owned } = await admin
      .from('player_cosmetics')
      .select('id')
      .eq('player_id', playerId)
      .eq('cosmetic_id', cosmeticId)
      .maybeSingle();
    const alreadyOwned = Boolean(owned);

    if (!alreadyOwned) {
      // docs/34 §3.1 — the shelf decides the wallet. This is the whole reason the
      // two-shelf model needs one service: the SKU's own currency picks the
      // debit, so no code path can spend the wrong balance.
      if (currency === 'MADI') {
        if (!(await this.wallet.canAffordMadi(playerId, good.price))) {
          throw new BadRequestException(
            `Not enough Madi for "${sku}" (need ${good.price}). Top up from the store.`,
          );
        }
        await this.wallet.spendMadi(playerId, good.price, 'madi_spend', sku);
      } else {
        if (!(await this.wallet.canAffordPula(playerId, good.price))) {
          throw new BadRequestException(
            `Not enough Pula for "${sku}" (need ${good.price}, see your balance).`,
          );
        }
        await this.wallet.spendPula(playerId, good.price, 'cosmetic_purchase', sku);
      }

      const { error } = await admin
        .from('player_cosmetics')
        .insert({ player_id: playerId, cosmetic_id: cosmeticId });
      if (error) throw new BadRequestException(`Failed to record cosmetic: ${error.message}`);
    }

    return {
      sku: good.sku,
      name: good.name,
      description: good.description,
      category: 'cosmetic',
      price: good.price,
      shelf: good.shelf,
      currency,
      slug: cosmeticId,
    };
  }
}
