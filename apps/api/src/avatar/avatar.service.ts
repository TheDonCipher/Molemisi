import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../database/supabase.service';
import {
  AVATAR_HAT,
  AVATAR_LAYERS,
  DEFAULT_AVATAR_BASE,
  getAvatarBase,
  getGoodsByCategory,
  isAvatarBaseKey,
  type AvatarBase,
} from '@molemisi/game-config';

export interface AvatarView {
  /** Layer 1 — chosen once at creation; immutable. */
  baseKey: string;
  base: Pick<AvatarBase, 'key' | 'setswana' | 'name' | 'sprite'>;
  /** Layer 2 — the swappable cosmetic overlay (a cosmetic slug, or null). */
  outfitKey: string | null;
  /** Layer 3 — the always-worn hat. Fixed, non-removable, not a SKU. */
  hat: { key: string; setswana: string; name: string; sprite: string };
  /** Bottom-to-top draw order. */
  layers: readonly string[];
  /**
   * Outfit cosmetics this player owns and may therefore equip. The client uses
   * it to render the wardrobe instead of guessing from the catalogue — the server
   * re-checks ownership on every equip, this is presentation only.
   */
  ownedOutfits: string[];
  /** False until the player has chosen their base at creation. */
  created: boolean;
}

/**
 * D10 / B4 — the 3-layer avatar.
 *
 *   base_key        chosen once at creation; not a cosmetic, never bought
 *   equipped_outfit the ONLY layer the store swaps
 *   hat             the signature Farmer's Hat — always drawn on top, never stored
 *
 * The service can change the OUTFIT and nothing else. `base_key` is immutable
 * after creation, which is what keeps "chosen once at creation" true in code
 * rather than by convention.
 */
@Injectable()
export class AvatarService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin(): SupabaseClient {
    return this.supabase.getAdminClient();
  }

  /** The current avatar, or a not-yet-created default the renderer can draw. */
  async getAvatar(playerId: string): Promise<AvatarView> {
    const { data } = await this.admin()
      .from('player_avatar')
      .select('base_key, equipped_outfit')
      .eq('player_id', playerId)
      .maybeSingle();

    const owned = await this.ownedOutfitIds(playerId);
    if (!data) return this.view(DEFAULT_AVATAR_BASE, null, false, owned);
    const row = data as { base_key: string; equipped_outfit: string | null };
    return this.view(row.base_key, row.equipped_outfit, true, owned);
  }

  /** Choose the base — ONCE. A second call is refused, not silently ignored. */
  async createAvatar(playerId: string, baseKey: string): Promise<AvatarView> {
    if (!isAvatarBaseKey(baseKey)) {
      throw new BadRequestException(`Unknown avatar base "${baseKey}".`);
    }
    const existing = await this.admin()
      .from('player_avatar')
      .select('player_id')
      .eq('player_id', playerId)
      .maybeSingle();
    if (existing.data) {
      throw new BadRequestException('Your avatar base is chosen once and cannot be changed.');
    }

    const { error } = await this.admin()
      .from('player_avatar')
      .insert({ player_id: playerId, base_key: baseKey, equipped_outfit: null });
    if (error) throw new BadRequestException(`Failed to create avatar: ${error.message}`);

    return this.view(baseKey, null, true, await this.ownedOutfitIds(playerId));
  }

  /**
   * Swap the outfit layer. `outfitKey` is a cosmetic id from the store, or null
   * to wear none. Only an OWNED, outfit-slot cosmetic may be equipped, so the
   * avatars view can never surface a look the player did not buy or earn.
   */
  async equipOutfit(playerId: string, outfitKey: string | null): Promise<AvatarView> {
    const avatar = await this.getAvatar(playerId);
    if (!avatar.created) {
      throw new BadRequestException('Choose your avatar base before choosing an outfit.');
    }

    if (outfitKey !== null) {
      if (!this.isOutfitCosmetic(outfitKey)) {
        throw new BadRequestException(`"${outfitKey}" is not an outfit.`);
      }
      const { data: owned } = await this.admin()
        .from('player_cosmetics')
        .select('id')
        .eq('player_id', playerId)
        .eq('cosmetic_id', outfitKey)
        .maybeSingle();
      if (!owned) {
        throw new NotFoundException(`You do not own the outfit "${outfitKey}".`);
      }
    }

    const { error } = await this.admin()
      .from('player_avatar')
      .update({ equipped_outfit: outfitKey, updated_at: new Date().toISOString() })
      .eq('player_id', playerId);
    if (error) throw new BadRequestException(`Failed to equip outfit: ${error.message}`);

    return this.view(avatar.baseKey, outfitKey, true, await this.ownedOutfitIds(playerId));
  }

  /**
   * The outfit-slot cosmetics this player owns. Read straight from
   * `player_cosmetics` and intersected with the `outfit` slot so a farm cosmetic
   * (hut/kraal/frame/livestock) can never appear in the wardrobe.
   */
  private async ownedOutfitIds(playerId: string): Promise<string[]> {
    const outfitIds = new Set(
      getGoodsByCategory('cosmetic')
        .filter((g) => g.slot === 'outfit')
        .map((g) => (g.entitlement as { cosmeticId: string }).cosmeticId),
    );
    const { data } = await this.admin()
      .from('player_cosmetics')
      .select('cosmetic_id')
      .eq('player_id', playerId);
    return ((data ?? []) as Array<{ cosmetic_id: string }>)
      .map((r) => r.cosmetic_id)
      .filter((id) => outfitIds.has(id));
  }

  /** Is `cosmeticId` a cosmetic on the `outfit` slot anywhere in the catalog? */
  private isOutfitCosmetic(cosmeticId: string): boolean {
    return getGoodsByCategory('cosmetic').some(
      (g) => g.slot === 'outfit' && (g.entitlement as { cosmeticId?: string }).cosmeticId === cosmeticId,
    );
  }

  private view(
    baseKey: string,
    outfitKey: string | null,
    created: boolean,
    ownedOutfits: string[],
  ): AvatarView {
    const base = getAvatarBase(baseKey) ?? getAvatarBase(DEFAULT_AVATAR_BASE)!;
    return {
      baseKey: base.key,
      base: { key: base.key, setswana: base.setswana, name: base.name, sprite: base.sprite },
      outfitKey,
      hat: {
        key: AVATAR_HAT.key,
        setswana: AVATAR_HAT.setswana,
        name: AVATAR_HAT.name,
        sprite: AVATAR_HAT.sprite,
      },
      layers: AVATAR_LAYERS,
      ownedOutfits,
      created,
    };
  }
}
