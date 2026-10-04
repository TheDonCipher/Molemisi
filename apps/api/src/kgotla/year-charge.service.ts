import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { InventoryService } from '../inventory/inventory.service';
import { ChapterService } from '../chapters/chapter.service';
import {
  deliverableCharges,
  cycleKey,
  type ChargeYearEntry,
  type ChargeAsk,
} from '@molemisi/game-config';

/**
 * docs/37/38 I-2 — the Kgotla **Year layer**.
 *
 * Twelve monthly Charges (chargeYear.ts), revealed by the Gaborone date and
 * delivered one per game-year cycle. This is the ONLY Pula-bearing Kgotla path;
 * the daily ward errands (KgotlaService.CHARGES) pay Botho + regard only.
 *
 * Persistence is `kgotla_charges` (migration 20261002000000). UNIQUE
 * (farm_id, charge_id, cycle) makes a Charge claimable exactly once per cycle —
 * that constraint is the atomic deduction of I-2. Progress toward each ask is
 * DERIVED from the player's inventory at read/turn-in time (never stored), so it
 * cannot drift from the world.
 */
@Injectable()
export class YearChargeService {
  constructor(
    private supabaseService: SupabaseService,
    private wallet: WalletService,
    private inventory: InventoryService,
    private chapters: ChapterService,
  ) {}

  /** The current month's Charge view: reveal + derived progress + claim state. */
  async getYearCharge(
    farmId: string,
    userId: string,
    now = new Date(),
  ): Promise<YearChargeView> {
    await this.verifyFarmOwnership(farmId, userId);
    const month = this.botswanaMonth(now);
    const cycle = cycleKey(now);
    // docs/36 K3 / §5.3.2 — a Charge is deliverable for the REST OF ITS CHAPTER,
    // not only the month it revealed in. `resolvePrimaryCharge` picks the Charge
    // the player should act on now (an unfinished accepted one first).
    const entry = await this.resolvePrimaryCharge(farmId, cycle, month);
    if (!entry) {
      return {
        chargeId: null,
        month,
        cycle,
        npcId: '',
        name: '',
        status: 'none',
        asks: [],
        ready: false,
        rewards: { pula: 0, botho: 0, chapterTokens: 0, almanacQuests: 0 },
      };
    }
    const row = await this.findRow(farmId, entry.chargeId, cycle);
    const asks = await this.measureAsks(userId, entry.asks);
    const status: YearChargeView['status'] = !row ? 'none' : (row.status as YearChargeView['status']);
    const ready = status !== 'claimed' && asks.every((a) => a.met);
    return {
      chargeId: entry.chargeId,
      month,
      cycle,
      npcId: entry.npcId,
      name: entry.name,
      status,
      asks,
      ready,
      rewards: {
        pula: entry.pulaReward,
        botho: entry.botho,
        chapterTokens: entry.stamp,
        almanacQuests: entry.almanacQuests,
      },
    };
  }

  /** Accept the current month's Charge — creates the (cycle-scoped) claim row. */
  async acceptYearCharge(
    farmId: string,
    userId: string,
    now = new Date(),
  ): Promise<YearChargeView> {
    await this.verifyFarmOwnership(farmId, userId);
    const month = this.botswanaMonth(now);
    const cycle = cycleKey(now);
    const entry = await this.resolvePrimaryCharge(farmId, cycle, month);
    if (!entry) throw new NotFoundException('No Year Charge is open to accept');
    const existing = await this.findRow(farmId, entry.chargeId, cycle);
    if (existing) return this.getYearCharge(farmId, userId, now);

    const acceptedOn = this.botswanaDate(now);
    await this.supabaseService
      .getAdminClient()
      .from('kgotla_charges')
      .insert({
        farm_id: farmId,
        user_id: userId,
        charge_id: entry.chargeId,
        npc_id: entry.npcId,
        asks: entry.asks,
        status: 'active',
        cycle,
        accepted_on: acceptedOn,
      });
    return this.getYearCharge(farmId, userId, now);
  }

  /**
   * Turn in the current month's Charge. The objective (every ask satisfied from
   * inventory) must be met OUTSIDE the Kgotla. Goods are consumed BEFORE any
   * currency is granted (fail toward the recoverable error). The UNIQUE
   * (farm_id, charge_id, cycle) row is flipped to `claimed` — atomic deduction:
   * a second turn-in finds status `claimed` and is rejected.
   */
  async turnInYearCharge(
    farmId: string,
    userId: string,
    now = new Date(),
  ): Promise<YearChargeTurnInResult> {
    await this.verifyFarmOwnership(farmId, userId);
    const month = this.botswanaMonth(now);
    const cycle = cycleKey(now);
    const entry = await this.resolvePrimaryCharge(farmId, cycle, month);
    if (!entry) throw new NotFoundException('No Year Charge is open to turn in');
    const row = await this.findRow(farmId, entry.chargeId, cycle);
    if (!row) {
      throw new BadRequestException('Accept this Charge before turning it in');
    }
    if (row.status === 'claimed') {
      throw new BadRequestException('You have already claimed this Charge');
    }

    const asks = await this.measureAsks(userId, entry.asks);
    const short = asks.filter((a) => !a.met);
    if (short.length) {
      const detail = short
        .map((a) => `${a.item}: have ${a.have}, need ${a.qty}`)
        .join('; ');
      throw new BadRequestException(`Charge not ready — missing: ${detail}`);
    }

    // Consume BEFORE crediting (recoverable failure mode): if the wallet call
    // then failed, the player would have lost goods — an admin_adjustment can
    // put that right. Crediting first and failing to consume would mint currency
    // from nothing, which cannot be put right.
    for (const ask of entry.asks) {
      await this.inventory.removeItem(userId, ask.item, ask.qty);
    }

    if (entry.pulaReward > 0) {
      await this.wallet.credit(userId, 'pula', entry.pulaReward, 'year_charge_reward');
    }
    const bothoReward = entry.botho > 0
      ? await this.wallet.creditBothoCapped(userId, entry.botho, 'year_charge_reward')
      : 0;
    const chapterTokens = entry.stamp > 0
      ? await this.chapters.addTokens(userId, entry.stamp, now)
      : 0;
    const almanacQuests = entry.almanacQuests > 0
      ? await this.chapters.recordQuests(userId, entry.almanacQuests, now)
      : 0;

    await this.supabaseService
      .getAdminClient()
      .from('kgotla_charges')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('farm_id', farmId)
      .eq('charge_id', entry.chargeId)
      .eq('cycle', cycle);

    return {
      chargeId: entry.chargeId,
      status: 'claimed',
      pulaReward: entry.pulaReward,
      bothoReward,
      chapterTokens,
      almanacQuests,
      consumed: entry.asks.map((a) => ({ item: a.item, qty: a.qty })),
    };
  }

  /* ----------------------------------------------------------- internals */

  /**
   * docs/36 K3 / §5.3.2–§5.4 — which Charge the player should act on right now.
   *
   * The Year is a serial with a delivery window that runs to the END OF THE
   * CHAPTER, not a single calendar month. The previous implementation looked up
   * `chargeForMonth(month)` only, which silently cut every Charge's window from
   * three months to one and contradicted K3. Preference order:
   *
   *   1. an accepted Charge still inside its window — finish what was started;
   *   2. the current month's Charge, if it is open;
   *   3. the earliest still-open, not-yet-claimed Charge of the chapter.
   *
   * `deliverableCharges` already excludes a Charge whose window has closed (so a
   * December Phane Charge is not offered in January) and any Charge from a
   * chapter that has ended (it has "rested", §5.3.3).
   */
  private async resolvePrimaryCharge(
    farmId: string,
    cycle: string,
    month: number,
  ): Promise<ChargeYearEntry | null> {
    const open = deliverableCharges(month);
    if (open.length === 0) return null;

    // At most three Charges per chapter, so a per-Charge read is bounded.
    const status = new Map<string, string | undefined>();
    for (const c of open) {
      const row = await this.findRow(farmId, c.chargeId, cycle);
      status.set(c.chargeId, row?.status);
    }

    const active = open.find((c) => status.get(c.chargeId) === 'active');
    if (active) return active;

    const current = open.find((c) => c.month === month);
    if (current) return current;

    return open.find((c) => status.get(c.chargeId) !== 'claimed') ?? open[0]!;
  }

  private async findRow(
    farmId: string,
    chargeId: string,
    cycle: string,
  ): Promise<{ status: string } | null> {
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('kgotla_charges')
      .select('id, charge_id, status, cycle')
      .eq('farm_id', farmId)
      .eq('charge_id', chargeId)
      .eq('cycle', cycle)
      .maybeSingle();
    return (data as { status: string } | null) ?? null;
  }

  private async measureAsks(userId: string, asks: ChargeAsk[]) {
    return Promise.all(
      asks.map(async (a) => {
        const have = await this.inventory.countOwned(userId, a.item);
        return { item: a.item, qty: a.qty, have, met: have >= a.qty };
      }),
    );
  }

  /** The Botswana calendar month (1–12), UTC+2 with no DST. */
  private botswanaMonth(now: Date): number {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000).getUTCMonth() + 1;
  }

  /** The Botswana calendar date, `YYYY-MM-DD`. */
  private botswanaDate(now: Date): string {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  private async verifyFarmOwnership(farmId: string, userId: string): Promise<void> {
    const { data: farm } = await this.supabaseService
      .getAdminClient()
      .from('farms')
      .select('user_id')
      .eq('id', farmId)
      .single();
    if (!farm) throw new NotFoundException('Farm not found');
    if (farm.user_id !== userId) {
      throw new ForbiddenException('You do not own this farm');
    }
  }
}

export interface YearChargeAskProgress {
  item: string;
  qty: number;
  have: number;
  met: boolean;
}

export interface YearChargeView {
  chargeId: string | null;
  month: number;
  cycle: string;
  npcId: string;
  name: string;
  status: 'none' | 'active' | 'claimed';
  asks: YearChargeAskProgress[];
  ready: boolean;
  rewards: { pula: number; botho: number; chapterTokens: number; almanacQuests: number };
}

export interface YearChargeTurnInResult {
  chargeId: string;
  status: 'claimed';
  pulaReward: number;
  bothoReward: number;
  chapterTokens: number;
  almanacQuests: number;
  consumed: { item: string; qty: number }[];
}
