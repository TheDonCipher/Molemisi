import { WorldEventsService } from './world-events.service';

function makeService() {
  // SupabaseService is only used by getActiveEvents (DB-backed); the catalogue
  // and getAvailableEvents are pure. Stub getAdminClient to return no active events.
  const fakeSupabase = {
    getAdminClient: () => ({
      from: () => ({ select: () => ({ gt: () => ({ data: [] }) }) }),
    }),
  } as any;
  return new WorldEventsService(fakeSupabase);
}

describe('WorldEventsService (Pass 3.2 — chapter-keyed events)', () => {
  it('keys events to the four chapters and drops xp/energy modifiers + winter events', () => {
    const svc = makeService();
    const all = (svc as any).EVENTS as Array<{ id: string; chapterSlug: any; effects: any }>;

    // Dropped events (Pass 3.2 / 30 N-7)
    expect(all.find((e) => e.id === 'winter_solstice')).toBeUndefined();
    expect(all.find((e) => e.id === 'frost_warning')).toBeUndefined();

    // xpModifier / energyModifier stripped everywhere
    for (const e of all) {
      expect(e.effects.xpModifier).toBeUndefined();
      expect(e.effects.energyModifier).toBeUndefined();
    }

    // Every event is keyed to a real chapter slug or is any-chapter
    const valid = [null, 'pula', 'phane', 'moriti', 'letlhafula'];
    for (const e of all) {
      expect(valid).toContain(e.chapterSlug);
    }
  });

  it('getAvailableEvents filters by the current real Botswana chapter', async () => {
    const svc = makeService();

    // March (UTC month index 2) → Phane chapter. Pula-only events must drop.
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2026, 2, 15)));
    const phane = await svc.getAvailableEvents('farm-x');
    jest.useRealTimers();

    const phaneIds = phane.map((e) => e.id);
    expect(phaneIds).toContain('harvest_festival'); // phane
    expect(phaneIds).toContain('traveling_merchant'); // any-chapter
    expect(phaneIds).not.toContain('planting_festival'); // pula only

    // November (UTC month index 10) → Pula chapter. Phane-only events must drop.
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2026, 10, 15)));
    const pula = await svc.getAvailableEvents('farm-x');
    jest.useRealTimers();

    const pulaIds = pula.map((e) => e.id);
    expect(pulaIds).toContain('planting_festival'); // pula
    expect(pulaIds).not.toContain('harvest_festival'); // phane only
  });

  it('getEventEffects returns only growth + price modifiers', async () => {
    const svc = makeService();
    const fx = await svc.getEventEffects('farm-x');
    expect(Object.keys(fx).sort()).toEqual(['growthModifier', 'priceModifier']);
    expect((fx as any).xpModifier).toBeUndefined();
    expect((fx as any).energyModifier).toBeUndefined();
  });
});
