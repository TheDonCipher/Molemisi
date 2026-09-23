import {
  Injectable,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { WalletService } from '../wallet/wallet.service';
import {
  KAGISO,
  SCENES,
  HOTSPOTS,
  getScene as getSceneConfig,
  hotspotsForScene,
  getHotspot,
  findsForScene,
  restorationStage,
  rarityWeights,
  SPARKLE_RARE_WEIGHT_BONUS,
  type HotspotDef,
  type LootEntry,
  type Rarity,
} from '@molemisi/game-config';

/**
 * P6 — The Bushveld (04_Bushveld.md, 05 §P6).
 *
 * Replaces the legacy energy/XP gather loop. The Bushveld is explicitly NOT a
 * second farm (04 §1): the Kagiso scarcity model is what guarantees gathering
 * cannot out-earn the fields and invert the craft chain.
 *
 * Invariants this file is responsible for:
 *  - Kagiso is COMPUTED ON READ from `kagiso_updated_at` — never a cron (04 §4.2).
 *  - The two 409s are DISTINCT: `hotspot_resting` (60-min personal cooldown) vs
 *    `scene_not_settled` (Kagiso below the hotspot's cost). The client must tell
 *    them apart (05 §P6 #3).
 *  - The Mophane window is a plain real-month check, decoupled from the farm's
 *    chapter clock (04 §9.3). A mock clock proves this in the spec.
 *  - Daily Sparkle: exactly one hotspot system-wide per day (04 §8).
 *  - No XP / level / energy writes — those columns are retired (D5) and orphaned.
 */
@Injectable()
export class BushveldService {
  constructor(
    private supabaseService: SupabaseService,
    private inventory: InventoryService,
    private wallet: WalletService,
  ) {}

  // ============================================================ GET /scenes
  async listScenes(playerId: string, now = new Date()): Promise<SceneView[]> {
    const botho = await this.wallet.getBotho(playerId);
    const sparkle = await this.todaySparkle(now); // ensure the daily badge exists

    return Promise.all(
      SCENES.map(async (scene) => this.sceneView(scene, playerId, botho, now)),
    );
  }

  // ===================================================== GET /scenes/:id
  async getScene(playerId: string, sceneId: string, now = new Date()): Promise<{
    scene: SceneView;
    hotspots: HotspotView[];
  }> {
    const scene = getSceneConfig(sceneId);
    if (!scene) throw new NotFoundException('Scene not found');

    const botho = await this.wallet.getBotho(playerId);
    const sparkle = await this.todaySparkle(now);

    const view = await this.sceneView(scene, playerId, botho, now);
    const hotspots = await Promise.all(
      hotspotsForScene(scene.slug).map((h) =>
        this.hotspotView(h, playerId, view.kagiso, sparkle, now),
      ),
    );

    return { scene: view, hotspots };
  }

  // ============================================ POST /hotspots/:id/collect
  async collect(
    playerId: string,
    farmId: string,
    hotspotId: string,
    now = new Date(),
  ): Promise<CollectResult> {
    const admin = this.supabaseService.getAdminClient();

    const def = getHotspot(hotspotId);
    if (!def) throw new NotFoundException('Hotspot not found');

    const scene = getSceneConfig(def.scene);
    if (!scene) throw new NotFoundException('Scene not found');

    // 1. Kagiso, recomputed on read (04 §4.2).
    const { kagiso } = await this.loadSceneState(playerId, def.scene, now);

    // 2. Per-hotspot rest, independent of Kagiso (04 §4.2).
    const { data: hs } = await admin
      .from('player_hotspot_state')
      .select('last_collected_at')
      .eq('player_id', playerId)
      .eq('hotspot_id', hotspotId)
      .single();
    const last = (hs?.last_collected_at as string | undefined) ?? null;
    const resting = last !== null && now.getTime() - new Date(last).getTime() < KAGISO.restMinutes * 60_000;

    // ORDER MATTERS (05 §P6 #3): a second tap within 60 min must return
    // `hotspot_resting` even when Kagiso would otherwise allow it. Check rest FIRST.
    if (resting) {
      const etaSeconds = Math.ceil(
        (KAGISO.restMinutes * 60_000 - (now.getTime() - new Date(last!).getTime())) / 1000,
      );
      throw new BushveldConflict('hotspot_resting', Math.max(0, etaSeconds));
    }

    if (kagiso < def.kagisoCost) {
      throw new BushveldConflict('scene_not_settled');
    }

    // 3. Choose loot table: seasonal when the real-world month matches (04 §9.3).
    const seasonal = this.isSeasonalActive(def, now);
    const table = seasonal ? def.seasonalLoot ?? def.loot : def.loot;
    const sparkling = (await this.todaySparkle(now)) === hotspotId;

    const rolled = this.rollLoot(table, kagiso, sparkling);
    const qty = rolled.qty
      ? Math.floor(Math.random() * (rolled.qty.max - rolled.qty.min + 1)) + rolled.qty.min
      : 1;

    // 4. Bank the material BEFORE mutating Kagiso, so a full-storage failure
    //    aborts cleanly rather than spending Kagiso for nothing. Discovery-only
    //    loot (no item) skips the inventory write.
    let stored = qty;
    if (rolled.item) {
      const res = await this.inventory.addItem(playerId, farmId, rolled.item, qty);
      stored = res.added;
    }

    // 5. Debit Kagiso + persist (the only write that moves the meter).
    await this.persistSceneState(playerId, def.scene, kagiso - def.kagisoCost, now);

    // 6. Per-hotspot rest timestamp.
    await admin.from('player_hotspot_state').upsert(
      { player_id: playerId, hotspot_id: hotspotId, last_collected_at: now.toISOString() },
      { onConflict: 'player_id,hotspot_id' },
    );

    // 7. Journal: capture the count BEFORE recording, so the before/after stage
    // delta is correct (recordDiscovery mutates state on a new find, so reading
    // the count after would double-count this find).
    const total = findsForScene(def.scene).length;
    const beforeFound = await this.discoveredCount(playerId, def.scene);
    const beforeStage = restorationStage(beforeFound, total);
    const isNewDiscovery = await this.recordDiscovery(playerId, def.scene, rolled.discovery);
    const afterStage = isNewDiscovery ? restorationStage(beforeFound + 1, total) : beforeStage;

    return {
      reward: {
        item: rolled.item,
        qty: stored,
        discovery: rolled.discovery,
        name: rolled.name,
        setswana: rolled.setswana,
        rarity: rolled.rarity,
      },
      isNewDiscovery,
      kagisoRemaining: kagiso - def.kagisoCost,
      restorationStage: afterStage,
      restorationStageChanged: afterStage !== beforeStage,
      restorationAssetKey: this.assetKeyFor(scene, afterStage),
    };
  }

  // ============================================================ internals
  private async sceneView(
    scene: (typeof SCENES)[number],
    playerId: string,
    botho: number,
    now: Date,
  ): Promise<SceneView> {
    const unlocked = !scene.unlock || botho >= scene.unlock.bothoGte;
    const { kagiso, secondsToNextPip } = await this.loadSceneState(playerId, scene.slug, now);

    const finds = findsForScene(scene.slug);
    const discovered = await this.discoveredCount(playerId, scene.slug);
    const stage = restorationStage(discovered, finds.length);

    return {
      slug: scene.slug,
      name: scene.name,
      unlocked,
      kagiso,
      kagisoMax: KAGISO.max,
      secondsToNextPip,
      findsDiscovered: discovered,
      findsTotal: finds.length,
      restorationStage: stage,
      restorationAssetKey: this.assetKeyFor(scene, stage),
    };
  }

  private async hotspotView(
    h: HotspotDef,
    playerId: string,
    sceneKagiso: number,
    sparkle: string | null,
    now: Date,
  ): Promise<HotspotView> {
    const admin = this.supabaseService.getAdminClient();
    const { data: hs } = await admin
      .from('player_hotspot_state')
      .select('last_collected_at')
      .eq('player_id', playerId)
      .eq('hotspot_id', h.id)
      .single();
    const last = (hs?.last_collected_at as string | undefined) ?? null;
    const resting = last !== null && now.getTime() - new Date(last).getTime() < KAGISO.restMinutes * 60_000;

    let state: HotspotView['state'] = 'ready';
    let etaSeconds: number | undefined;
    if (resting) {
      state = 'resting';
      etaSeconds = Math.max(
        0,
        Math.ceil((KAGISO.restMinutes * 60_000 - (now.getTime() - new Date(last!).getTime())) / 1000),
      );
    } else if (sceneKagiso < h.kagisoCost) {
      state = 'scene_not_settled';
    }

    return {
      id: h.id,
      tell: h.tell,
      x: h.x,
      y: h.y,
      spriteKey: h.sprite,
      kagisoCost: h.kagisoCost,
      state,
      etaSeconds,
      isSparklingToday: sparkle === h.id,
      isSeasonalActiveToday: this.isSeasonalActive(h, now),
    };
  }

  /** Recompute Kagiso from the stored value + elapsed time. Never exceeds max. */
  private recomputeKagiso(stored: number, updatedAt: Date, now: Date): {
    kagiso: number;
    secondsToNextPip: number;
  } {
    const regenMs = KAGISO.regenMinutes * 60_000;
    const elapsed = now.getTime() - updatedAt.getTime();
    const gained = Math.floor(Math.max(0, elapsed) / regenMs);
    const kagiso = Math.min(KAGISO.max, stored + gained);

    let secondsToNextPip = 0;
    if (kagiso < KAGISO.max && elapsed >= 0) {
      const sinceTick = elapsed - gained * regenMs;
      secondsToNextPip = Math.ceil(Math.max(0, regenMs - sinceTick) / 1000);
    }
    return { kagiso, secondsToNextPip };
  }

  private async loadSceneState(
    playerId: string,
    sceneId: string,
    now: Date,
  ): Promise<{ kagiso: number; secondsToNextPip: number }> {
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('player_scene_state')
      .select('kagiso, kagiso_updated_at')
      .eq('player_id', playerId)
      .eq('scene_id', sceneId)
      .single();

    if (!data) {
      // New scene starts settled (04 §4.2). Nothing persisted until first collect.
      return { kagiso: KAGISO.startingValue, secondsToNextPip: 0 };
    }
    const updatedAt = new Date((data.kagiso_updated_at as string) ?? now.toISOString());
    return this.recomputeKagiso(Number(data.kagiso ?? KAGISO.startingValue), updatedAt, now);
  }

  private async persistSceneState(
    playerId: string,
    sceneId: string,
    kagiso: number,
    now: Date,
  ): Promise<void> {
    await this.supabaseService
      .getAdminClient()
      .from('player_scene_state')
      .upsert(
        {
          player_id: playerId,
          scene_id: sceneId,
          kagiso: Math.max(0, Math.min(KAGISO.max, kagiso)),
          kagiso_updated_at: now.toISOString(),
        },
        { onConflict: 'player_id,scene_id' },
      );
  }

  /** Weighted pick of one LootEntry. Rarity weights scale with Kagiso; sparkle boosts rare. */
  private rollLoot(entries: LootEntry[], kagiso: number, sparkling: boolean): LootEntry {
    const base = rarityWeights(kagiso);
    const rareW = sparkling ? base.rare * SPARKLE_RARE_WEIGHT_BONUS : base.rare;

    const buckets = entries.map((e) => ({
      e,
      w: e.rarity === 'rare' ? rareW : e.rarity === 'uncommon' ? base.uncommon : base.common,
    }));
    const total = buckets.reduce((s, b) => s + b.w, 0);

    let r = Math.random() * total;
    for (const b of buckets) {
      r -= b.w;
      if (r <= 0) return b.e;
    }
    return entries[entries.length - 1]!;
  }

  /** Real-world month match — deliberately decoupled from the farm's chapter clock (04 §9.3). */
  private isSeasonalActive(h: HotspotDef, now: Date): boolean {
    if (!h.activeMonths || h.activeMonths.length === 0) return false;
    return h.activeMonths.includes(now.getUTCMonth() + 1);
  }

  private async discoveredCount(playerId: string, sceneId: string): Promise<number> {
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('field_journal_entries')
      .select('discovery_slug')
      .eq('player_id', playerId)
      .eq('scene_id', sceneId);
    return (data ?? []).length;
  }

  /** Insert on first find only. The composite PK makes repeats a silent no-op. */
  private async recordDiscovery(
    playerId: string,
    sceneId: string,
    discoverySlug: string,
  ): Promise<boolean> {
    const { data: existing } = await this.supabaseService
      .getAdminClient()
      .from('field_journal_entries')
      .select('discovery_slug')
      .eq('player_id', playerId)
      .eq('scene_id', sceneId)
      .eq('discovery_slug', discoverySlug)
      .single();

    if (existing) return false;

    await this.supabaseService
      .getAdminClient()
      .from('field_journal_entries')
      .insert({ player_id: playerId, scene_id: sceneId, discovery_slug: discoverySlug });
    return true;
  }

  private assetKeyFor(scene: (typeof SCENES)[number], stage: number): string {
    const keys = (scene.restorationAssets ?? []) as string[];
    return keys[Math.max(0, Math.min(stage, keys.length - 1))] ?? '';
  }

  /**
   * Daily Sparkle: lazily ensure one row exists for `now`'s date, choosing from
   * all configured hotspots — every scene with content participates, Deep
   * Bushveld included (G5).
   * The per-date PK guarantees exactly one sparkle per day (04 §8). No cron needed.
   */
  private async todaySparkle(now: Date): Promise<string | null> {
    const date = now.toISOString().slice(0, 10);
    const admin = this.supabaseService.getAdminClient();

    const { data } = await admin
      .from('daily_sparkle')
      .select('hotspot_id')
      .eq('sparkle_date', date)
      .single();

    if (data) return data.hotspot_id as string;

    const pick = HOTSPOTS[Math.floor(Math.random() * HOTSPOTS.length)]!;
    await admin.from('daily_sparkle').insert({ sparkle_date: date, hotspot_id: pick.id });
    return pick.id;
  }
}

/** 409 with a machine-readable reason — the client tells the two apart (05 §P6 #3). */
export class BushveldConflict extends HttpException {
  constructor(
    public readonly reason: 'scene_not_settled' | 'hotspot_resting',
    public readonly etaSeconds?: number,
  ) {
    super({ reason, etaSeconds: etaSeconds ?? null }, 409);
  }
}

// ------------------------------------------------------------------ view types
export interface SceneView {
  slug: string;
  name: string;
  unlocked: boolean;
  kagiso: number;
  kagisoMax: number;
  secondsToNextPip: number;
  findsDiscovered: number;
  findsTotal: number;
  restorationStage: number;
  restorationAssetKey: string;
}

export interface HotspotView {
  id: string;
  tell: string;
  x: number;
  y: number;
  spriteKey: string;
  kagisoCost: number;
  state: 'ready' | 'resting' | 'scene_not_settled';
  etaSeconds?: number;
  isSparklingToday: boolean;
  isSeasonalActiveToday: boolean;
}

export interface CollectResult {
  reward: {
    item?: string;
    qty: number;
    discovery: string;
    name: string;
    setswana: string;
    rarity: Rarity;
  };
  isNewDiscovery: boolean;
  kagisoRemaining: number;
  restorationStage: number;
  restorationStageChanged: boolean;
  restorationAssetKey: string;
}
