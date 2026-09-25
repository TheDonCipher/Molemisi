import { WaterService } from './water.service';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { makeFakeSupabase, updatesTo, updateTo, FakeResult } from '../test/fake-supabase';
import { MAX_OFFLINE_HOURS, WATER, WATER_WHISPERS, getCropConfig } from '@molemisi/game-config';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * The Jojo tank is the central tension of the farm loop (05 §P4), so these specs
 * are written against the *done-criteria* rather than the method list:
 *   1. an empty tank stops the clock;
 *   2. refilling resumes from where it stopped;
 *   3. bare plots cost nothing;
 *   4. nothing is ever killed by drought.
 */
describe('WaterService', () => {
  const NOW = new Date('2026-09-09T12:00:00.000Z');
  const HOUR = 3_600_000;

  function makeService(sequence: FakeResult[]) {
    const { client, calls } = makeFakeSupabase(sequence);
    const wallet = {
      spendPula: jest.fn().mockResolvedValue(undefined),
      credit: jest.fn().mockResolvedValue(undefined),
    };
    const svc = new WaterService(
      { getAdminClient: () => client } as unknown as SupabaseService,
      wallet as unknown as WalletService,
    );
    return { svc, calls, wallet };
  }

  const farmRow = (over: Record<string, unknown> = {}) => ({
    weather_state: 'clear',
    last_simulated_at: new Date(NOW.getTime() - 6 * HOUR).toISOString(),
    ...over,
  });

  const tankRow = (over: Record<string, unknown> = {}) => ({
    id: 'tank-1',
    water_level: WATER.tankCapacity,
    capacity: WATER.tankCapacity,
    state: 'ACTIVE',
    ...over,
  });

  // Mirrors crop_instances: note there is no `state` column — readiness is
  // derived from growth_progress_hours against the crop's growthHours.
  const cropRow = (over: Record<string, unknown> = {}) => ({
    id: 'crop-1',
    plot_id: 'plot-1',
    crop_type: 'sorghum', // 18 h, 0.04 units/hour
    growth_progress_hours: 0,
    last_growth_tick_at: new Date(NOW.getTime() - 6 * HOUR).toISOString(),
    ...over,
  });

  const ok = { data: null, error: null };

  // ==================================================================
  // Criterion 1 — an empty tank stops the clock
  // ==================================================================
  describe('an empty tank', () => {
    it('stops growth without advancing the crop or killing it', async () => {
      const { svc, calls } = makeService([
        { data: farmRow(), error: null },
        { data: tankRow({ water_level: 0 }), error: null },
        { data: [cropRow({ growth_progress_hours: 9 })], error: null },
      ]);

      const result = await svc.advanceFarmGrowth('farm-1', NOW);

      expect(result.cropsAdvanced).toBe(0);
      expect(result.waterConsumed).toBe(0);
      expect(result.cropsReady).toBe(0);

      const cropWrite = updateTo(calls, 'crop_instances')!;
      // Half-grown and it stays exactly half-grown — six dry hours buy nothing.
      expect(cropWrite.growth_progress_hours).toBeCloseTo(9, 6);
      expect(cropWrite.growth_stage).toBe(1);
      expect(cropWrite.hydration).toBe(0);

      // The dry interval is *discarded*, not banked: the tick moves to now so a
      // refill resumes rather than back-paying six hours of stalled growth.
      expect(cropWrite.last_growth_tick_at).toBe(NOW.toISOString());

      // Never a withered crop. Drought is a pause, not a punishment (03 §1.2).
      const plotWrite = updateTo(calls, 'farm_plots')!;
      expect(plotWrite.state).toBe('GROWING');
      expect(plotWrite.state).not.toBe('WITHERED');
    });

    it('does not write to the tank at all when nothing was drawn', async () => {
      const { svc, calls } = makeService([
        { data: farmRow(), error: null },
        { data: tankRow({ water_level: 0 }), error: null },
        { data: [cropRow({ growth_progress_hours: 9 })], error: null },
      ]);

      await svc.advanceFarmGrowth('farm-1', NOW);

      expect(updatesTo(calls, 'buildings')).toHaveLength(0);
    });

    it('supplies nothing while the tank is not ACTIVE (under construction)', async () => {
      const { svc, calls } = makeService([
        { data: farmRow(), error: null },
        // Full tank, but still being built — it cannot water anything yet.
        { data: tankRow({ state: 'CONSTRUCTION' }), error: null },
        { data: [cropRow({ growth_progress_hours: 9 })], error: null },
      ]);

      const result = await svc.advanceFarmGrowth('farm-1', NOW);

      expect(result.cropsAdvanced).toBe(0);
      expect(updateTo(calls, 'crop_instances')!.growth_progress_hours).toBeCloseTo(9, 6);
      expect(updateTo(calls, 'crop_instances')!.hydration).toBe(0);
    });
  });

  // ==================================================================
  // G1 — fertilizer (01 §Fertilization)
  // ==================================================================
  describe('a fertilized plot', () => {
    it('grows +20% faster inside its stage window and keeps the dose armed', async () => {
      const { svc, calls } = makeService([
        { data: farmRow(), error: null },
        { data: tankRow(), error: null },
        {
          data: [
            cropRow({
              last_growth_tick_at: new Date(NOW.getTime() - 3 * HOUR).toISOString(),
              growth_progress_hours: 0,
              fertilizer_active: true,
              fertilizer_bonus: 0.2,
              fertilized_until_stage: 0,
            }),
          ],
          error: null,
        },
      ]);

      await svc.advanceFarmGrowth('farm-1', NOW);

      // Sorghum band 0 = 0–6 h. Three elapsed hours x1.2 = 3.6 progress, and
      // the window (6 h) is not exhausted, so the dose stays armed.
      const write = updateTo(calls, 'crop_instances')!;
      expect(write.growth_progress_hours).toBeCloseTo(3.6, 6);
      expect(write.fertilizer_active).toBe(true);
    });

    it('retires the dose once the interval runs past its stage window', async () => {
      const { svc, calls } = makeService([
        { data: farmRow(), error: null },
        { data: tankRow(), error: null },
        {
          data: [
            cropRow({
              last_growth_tick_at: new Date(NOW.getTime() - 12 * HOUR).toISOString(),
              growth_progress_hours: 0,
              fertilizer_active: true,
              fertilizer_bonus: 0.2,
              fertilized_until_stage: 0,
            }),
          ],
          error: null,
        },
      ]);

      await svc.advanceFarmGrowth('farm-1', NOW);

      // Twelve elapsed hours, but only the first six (band 0) earn the bonus:
      // 12 + 0.2 x 6 = 13.2, and the dose is spent.
      const write = updateTo(calls, 'crop_instances')!;
      expect(write.growth_progress_hours).toBeCloseTo(13.2, 6);
      expect(write.fertilizer_active).toBe(false);
    });
  });

  // ==================================================================
  // Criterion 2 — refilling resumes from where it stopped
  // ==================================================================
  describe('a refilled tank', () => {
    it('resumes from stored progress and never back-pays the dry hours', async () => {
      // First pass: six dry hours at 9/18 h — nothing moves.
      const dry = makeService([
        { data: farmRow(), error: null },
        { data: tankRow({ water_level: 0 }), error: null },
        { data: [cropRow({ growth_progress_hours: 9 })], error: null },
      ]);
      await dry.svc.advanceFarmGrowth('farm-1', NOW);
      expect(updateTo(dry.calls, 'crop_instances')!.growth_progress_hours).toBeCloseTo(9, 6);

      // Second pass: tank refilled, six more hours. 9 + 6 = 15 — the six dry
      // hours are gone for good, so this can never jump to 21.
      const later = new Date(NOW.getTime() + 6 * HOUR);
      const wet = makeService([
        { data: farmRow({ last_simulated_at: NOW.toISOString() }), error: null },
        { data: tankRow(), error: null },
        {
          data: [
            cropRow({
              growth_progress_hours: 9,
              last_growth_tick_at: NOW.toISOString(),
            }),
          ],
          error: null,
        },
      ]);

      const result = await wet.svc.advanceFarmGrowth('farm-1', later);

      expect(result.cropsAdvanced).toBe(1);
      const cropWrite = updateTo(wet.calls, 'crop_instances')!;
      expect(cropWrite.growth_progress_hours).toBeCloseTo(15, 6);
      expect(cropWrite.growth_progress_hours).toBeLessThan(16); // not 21
      expect(cropWrite.growth_stage).toBe(2);
      expect(cropWrite.hydration).toBe(1.0);

      // Sorghum sips: 0.04 units/h x 6 h = 0.24 units.
      expect(result.waterConsumed).toBeCloseTo(0.24, 6);
      expect(updateTo(wet.calls, 'buildings')!.water_level).toBeCloseTo(
        WATER.tankCapacity - 0.24,
        6,
      );
    });

    it('marks a crop READY and its plot READY when progress crosses the line', async () => {
      const { svc, calls } = makeService([
        { data: farmRow(), error: null },
        { data: tankRow(), error: null },
        // 17.5 of 18 h done — six hours of water carries it over.
        { data: [cropRow({ growth_progress_hours: 17.5 })], error: null },
      ]);

      const result = await svc.advanceFarmGrowth('farm-1', NOW);

      expect(result.cropsReady).toBe(1);
      expect(updateTo(calls, 'farm_plots')!.state).toBe('READY');
      expect(updateTo(calls, 'crop_instances')!.growth_stage).toBe(3);
    });

    it('a finished crop stops drawing water (drawn only while growing, F5)', async () => {
      const { svc } = makeService([
        { data: farmRow(), error: null },
        { data: tankRow(), error: null },
        // 20 of 18 h — past the line, so it is not in the growing set at all.
        { data: [cropRow({ growth_progress_hours: 20 })], error: null },
      ]);

      const result = await svc.advanceFarmGrowth('farm-1', NOW);

      expect(result.cropsAdvanced).toBe(0);
      expect(result.waterConsumed).toBe(0);
    });
  });

  // ==================================================================
  // Criterion 3 — bare plots cost nothing
  // ==================================================================
  it('draws nothing when no crop is growing, and leaves the tank alone', async () => {
    const { svc, calls } = makeService([
      { data: farmRow(), error: null },
      { data: tankRow({ water_level: 30 }), error: null },
      { data: [], error: null },
    ]);

    const result = await svc.advanceFarmGrowth('farm-1', NOW);

    expect(result.waterConsumed).toBe(0);
    expect(result.cropsAdvanced).toBe(0);
    expect(updatesTo(calls, 'crop_instances')).toHaveLength(0);
    expect(updatesTo(calls, 'buildings')).toHaveLength(0);
  });

  // ==================================================================
  // Rationing — one shared tank across the whole farm
  // ==================================================================
  describe('shared-tank rationing', () => {
    it('divides a short tank proportionally and empties it', async () => {
      // Ten thirsty maize (0.2 units/h) over six hours want 12 units; the tank
      // holds 1. Everyone gets 1/12 of what they asked for.
      const crops = Array.from({ length: 10 }, (_, i) =>
        cropRow({ id: `crop-${i}`, plot_id: `plot-${i}`, crop_type: 'maize' }),
      );
      const { svc, calls } = makeService([
        { data: farmRow(), error: null },
        { data: tankRow({ water_level: 1 }), error: null },
        { data: crops, error: null },
      ]);

      const result = await svc.advanceFarmGrowth('farm-1', NOW);

      expect(result.cropsAdvanced).toBe(10);
      expect(result.waterConsumed).toBeCloseTo(1, 6); // the tank is drained
      expect(updateTo(calls, 'buildings')!.water_level).toBeCloseTo(0, 6);

      for (const write of updatesTo(calls, 'crop_instances')) {
        // 6 h x (1/12) = 0.5 h of growth each, not 6 h.
        expect(write.growth_progress_hours).toBeCloseTo(0.5, 6);
      }
    });

    it('a tank with room to spare lets every crop grow at full speed', async () => {
      const { svc, calls } = makeService([
        { data: farmRow(), error: null },
        { data: tankRow(), error: null },
        { data: [cropRow({ growth_progress_hours: 2 })], error: null },
      ]);

      await svc.advanceFarmGrowth('farm-1', NOW);

      expect(updateTo(calls, 'crop_instances')!.growth_progress_hours).toBeCloseTo(8, 6);
      expect(updateTo(calls, 'crop_instances')!.hydration).toBe(1.0);
    });
  });

  // ==================================================================
  // Rain — free water, credited before demand (03 §1.2)
  // ==================================================================
  describe('rain', () => {
    it('credits the tank, capped at capacity', async () => {
      const { svc, calls } = makeService([
        { data: farmRow({ weather_state: 'storm' }), error: null },
        { data: tankRow({ water_level: 50 }), error: null },
        { data: [], error: null },
      ]);

      await svc.advanceFarmGrowth('farm-1', NOW);

      // Storm is 5 units/h: 50 + 30 would be 80, so it stops at capacity.
      expect(updateTo(calls, 'buildings')!.water_level).toBe(WATER.tankCapacity);
    });

    it('rescues a dry farm — credited before demand is calculated', async () => {
      const { svc, calls } = makeService([
        { data: farmRow({ weather_state: 'rain' }), error: null },
        { data: tankRow({ water_level: 0 }), error: null },
        { data: [cropRow({ growth_progress_hours: 9 })], error: null },
      ]);

      const result = await svc.advanceFarmGrowth('farm-1', NOW);

      // Rain is 2 units/h x 6 h = 12, plenty for 0.24 of demand: full growth.
      expect(result.cropsAdvanced).toBe(1);
      expect(updateTo(calls, 'crop_instances')!.growth_progress_hours).toBeCloseTo(15, 6);
      expect(updateTo(calls, 'buildings')!.water_level).toBeCloseTo(12 - 0.24, 6);
    });

    it('drought credits nothing', async () => {
      const { svc, calls } = makeService([
        { data: farmRow({ weather_state: 'drought' }), error: null },
        { data: tankRow({ water_level: 10 }), error: null },
        { data: [], error: null },
      ]);

      await svc.advanceFarmGrowth('farm-1', NOW);

      expect(updatesTo(calls, 'buildings')).toHaveLength(0);
    });
  });

  // ==================================================================
  // Offline cap
  // ==================================================================
  it('caps a long absence at MAX_OFFLINE_HOURS rather than fast-forwarding', async () => {
    const longAgo = new Date(NOW.getTime() - 1000 * HOUR).toISOString();
    const { svc, calls } = makeService([
      { data: farmRow({ last_simulated_at: longAgo }), error: null },
      { data: tankRow(), error: null },
      { data: [cropRow({ last_growth_tick_at: longAgo })], error: null },
    ]);

    const result = await svc.advanceFarmGrowth('farm-1', NOW);

    expect(result.cropsReady).toBe(1);
    expect(updateTo(calls, 'crop_instances')!.growth_progress_hours).toBeCloseTo(
      MAX_OFFLINE_HOURS,
      6,
    );
    expect(updateTo(calls, 'farm_plots')!.state).toBe('READY');
  });

  it('does nothing at all on a sub-second re-read', async () => {
    const sameInstant = new Date(NOW.getTime() + 500).toISOString();
    const { svc, calls } = makeService([
      { data: farmRow({ last_simulated_at: sameInstant }), error: null },
      { data: tankRow(), error: null },
      { data: [cropRow()], error: null },
    ]);

    const result = await svc.advanceFarmGrowth('farm-1', NOW);

    expect(result).toEqual({ cropsAdvanced: 0, cropsReady: 0, cropsStalled: 0, waterConsumed: 0 });
    expect(updatesTo(calls, 'crop_instances')).toHaveLength(0);
  });

  // ==================================================================
  // getTankStatus
  // ==================================================================
  describe('getTankStatus', () => {
    it('reports the live tank', async () => {
      const { svc } = makeService([{ data: tankRow({ water_level: 12.5 }), error: null }]);

      await expect(svc.getTankStatus('farm-1')).resolves.toEqual({
        hasTank: true,
        waterLevel: 12.5,
        capacity: WATER.tankCapacity,
        state: 'ACTIVE',
      });
    });

    it('reports no tank rather than inventing one', async () => {
      const { svc } = makeService([{ data: null, error: null }]);

      await expect(svc.getTankStatus('farm-1')).resolves.toEqual({
        hasTank: false,
        waterLevel: 0,
        capacity: WATER.tankCapacity,
        state: 'NONE',
      });
    });
  });

  // ==================================================================
  // refillTank
  // ==================================================================
  describe('refillTank', () => {
    it('charges only for the units added, through the wallet', async () => {
      const { svc, wallet, calls } = makeService([
        { data: tankRow({ water_level: 20 }), error: null },
        ok,
      ]);

      const result = await svc.refillTank('farm-1', 'user-1');

      expect(result).toMatchObject({ added: 40, cost: 40, waterLevel: 60, capacity: 60 });
      // spendPula is the only sanctioned path (05 §P2): check-and-debit + ledger.
      expect(wallet.spendPula).toHaveBeenCalledWith('user-1', 40, 'water_refill');
      expect(updateTo(calls, 'buildings')!.water_level).toBe(60);
    });

    it('is free when the tank is already full', async () => {
      const { svc, wallet, calls } = makeService([{ data: tankRow(), error: null }]);

      const result = await svc.refillTank('farm-1', 'user-1');

      expect(result).toMatchObject({ added: 0, cost: 0, waterLevel: 60, capacity: 60 });
      expect(wallet.spendPula).not.toHaveBeenCalled();
      expect(updatesTo(calls, 'buildings')).toHaveLength(0);
    });

    it('refuses a farm with no tank', async () => {
      const { svc } = makeService([{ data: null, error: null }]);
      await expect(svc.refillTank('farm-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('refuses a tank that is not ACTIVE', async () => {
      const { svc, wallet } = makeService([
        { data: tankRow({ state: 'DISABLED', water_level: 0 }), error: null },
      ]);
      await expect(svc.refillTank('farm-1', 'user-1')).rejects.toThrow(BadRequestException);
      expect(wallet.spendPula).not.toHaveBeenCalled();
    });

    it('hands the Pula back if the fill does not land', async () => {
      const { svc, wallet } = makeService([
        { data: tankRow({ water_level: 20 }), error: null },
        { data: null, error: { message: 'boom' } },
      ]);

      await expect(svc.refillTank('farm-1', 'user-1')).rejects.toThrow(BadRequestException);
      // Money must never be wrong: a failure the player can retry is a failure,
      // but paying for water they never received is theft.
      expect(wallet.credit).toHaveBeenCalledWith('user-1', 'pula', 40, 'refund');
    });

    // ----------------------------------------------------------------
    // Doc 11 §3 — the Water Whisper: a 10% roll on a refill that added
    // water. Rolled and recorded on the server; the client only shows it.
    // ----------------------------------------------------------------
    afterEach(() => jest.restoreAllMocks());

    it('rolls the whisper, records the listen, and hands back the line', async () => {
      // First roll fires (0.05 < 0.10); the second picks index 0 of the pool.
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.05).mockReturnValueOnce(0);
      const { svc, calls } = makeService([
        { data: tankRow({ water_level: 20 }), error: null },
        ok,
        ok,
      ]);

      const result = await svc.refillTank('farm-1', 'user-1');

      expect(result.water_whisper).toBe(WATER_WHISPERS[0]!.text);
      // The row IS the "+1 Journal progress": one listen, recorded server-side.
      const listen = calls.find((c) => c.table === 'lore_entries' && c.method === 'insert')!;
      expect(listen.args[0]).toMatchObject({
        player_id: 'user-1',
        kind: 'water_whisper',
        slug: WATER_WHISPERS[0]!.slug,
        quote: WATER_WHISPERS[0]!.text,
        is_original: true,
      });
      expect(updateTo(calls, 'buildings')!.water_level).toBe(60);
    });

    it('stays silent on most refills and records nothing', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      const { svc, calls } = makeService([
        { data: tankRow({ water_level: 20 }), error: null },
        ok,
      ]);

      const result = await svc.refillTank('farm-1', 'user-1');

      expect(result.water_whisper).toBeNull();
      expect(calls.some((c) => c.table === 'lore_entries')).toBe(false);
    });

    it('marks a repeat listen non-original rather than failing (unique index)', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0);
      const { svc, calls } = makeService([
        { data: tankRow({ water_level: 20 }), error: null },
        ok,
        { data: null, error: { message: 'duplicate key value violates unique constraint' } },
        ok,
      ]);

      const result = await svc.refillTank('farm-1', 'user-1');

      // Still heard: a repeat is the same memory rising again, not a failure.
      expect(result.water_whisper).toBe(WATER_WHISPERS[0]!.text);
      const loreCalls = calls.filter((c) => c.table === 'lore_entries');
      expect(loreCalls).toHaveLength(2);
      expect(loreCalls[1]!.method).toBe('upsert');
      expect(loreCalls[1]!.args[0]).toMatchObject({ is_original: false });
    });

    it('still delivers the water when the whisper cannot be logged', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0);
      const { svc } = makeService([
        { data: tankRow({ water_level: 20 }), error: null },
        ok,
        { data: null, error: { message: 'connection terminated unexpectedly' } },
      ]);

      // A gift, not a receipt: the Pula is spent and the water is in the tank,
      // so a logging failure must never take either away.
      await expect(svc.refillTank('farm-1', 'user-1')).resolves.toMatchObject({
        added: 40,
        water_whisper: WATER_WHISPERS[0]!.text,
      });
    });
  });

  // ==================================================================
  // Doc 11 §6 — Setlhare sa Boswa: Water Memory (0.8x for its neighbours)
  // ==================================================================
  describe('Heritage Tree — Water Memory (Doc 11 §6)', () => {
    const treeRow = (over: Record<string, unknown> = {}) => ({
      id: 'tree-1',
      building_type: 'setlhare_sa_boswa',
      state: 'ACTIVE',
      slot_index: 5,
      water_level: 0,
      capacity: 0,
      ...over,
    });

    // A 4-column grid, three rows. Slot 5's cross neighbours are 1 (up),
    // 9 (down), 4 (left) and 6 (right).
    const twelvePlots = Array.from({ length: 12 }, (_, i) => ({
      id: `plot-${i}`,
      slot_index: i,
    }));

    it('neighbours of an ACTIVE tree pay 0.8x — and growth is never slowed', async () => {
      const { svc, calls } = makeService([
        { data: farmRow(), error: null },
        { data: [tankRow({ water_level: 30 }), treeRow()], error: null },
        { data: [cropRow({ plot_id: 'plot-4' })], error: null },
        { data: twelvePlots, error: null },
      ]);

      const result = await svc.advanceFarmGrowth('farm-1', NOW);

      // The saving is water, not time: six hours of growth either way.
      expect(updateTo(calls, 'crop_instances')!.growth_progress_hours).toBeCloseTo(6, 6);
      expect(result.waterConsumed).toBeCloseTo(
        0.8 * getCropConfig('sorghum')!.waterPerHour * 6,
        6,
      );
    });

    it('a plot outside the blessing pays full price', async () => {
      const { svc } = makeService([
        { data: farmRow(), error: null },
        { data: [tankRow({ water_level: 30 }), treeRow()], error: null },
        { data: [cropRow({ plot_id: 'plot-0' })], error: null },
        { data: twelvePlots, error: null },
      ]);

      const result = await svc.advanceFarmGrowth('farm-1', NOW);

      expect(result.waterConsumed).toBeCloseTo(getCropConfig('sorghum')!.waterPerHour * 6, 6);
    });

    it('a tree that is still building blesses nothing', async () => {
      const { svc } = makeService([
        { data: farmRow(), error: null },
        { data: [tankRow({ water_level: 30 }), treeRow({ state: 'CONSTRUCTION' })], error: null },
        { data: [cropRow({ plot_id: 'plot-4' })], error: null },
      ]);

      const result = await svc.advanceFarmGrowth('farm-1', NOW);

      expect(result.waterConsumed).toBeCloseTo(getCropConfig('sorghum')!.waterPerHour * 6, 6);
    });
  });
});
