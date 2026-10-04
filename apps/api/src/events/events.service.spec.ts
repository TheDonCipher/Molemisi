import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { ChapterService } from '../chapters/chapter.service';
import { makeDb, clientFor, type MockDb, type MockClient } from '../test/supabase-mock';

/**
 * D6 / D8 / B3 — the Events live service, proven.
 *
 * The rule under test: the Event GRANTS the goods (since D7 defers crafting) and
 * pays Chapter Tokens on the turn-in, and a replayed claim is a no-op (14 §9).
 */
describe('EventsService — the Events live service (D6/D8)', () => {
  let service: EventsService;
  let db: MockDb;
  let client: MockClient;
  let chapters: { getCurrentChapter: jest.Mock; addTokens: jest.Mock };
  let inventory: { addItem: jest.Mock };

  const CHAPTER = {
    id: 'ch-pula',
    slug: 'pula',
    name: 'Pula',
    setswana: 'Sekala sa Pula',
    tokenName: 'Pula',
    startsOn: '2026-11-01',
    endsOn: '2027-01-31',
    daysLeft: 30,
    isCurrent: true,
  };

  beforeEach(async () => {
    db = makeDb({ farms: [{ id: 'farm1', user_id: 'u1' }] });
    client = clientFor(db);
    chapters = {
      getCurrentChapter: jest.fn().mockResolvedValue(CHAPTER),
      addTokens: jest.fn().mockResolvedValue(2),
    };
    inventory = { addItem: jest.fn().mockResolvedValue({ added: 4, overflow: 0 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: SupabaseService, useValue: { getAdminClient: () => client, getClient: () => client } },
        { provide: InventoryService, useValue: inventory },
        { provide: ChapterService, useValue: chapters },
      ],
    }).compile();
    service = module.get(EventsService);
  });

  it('materialises the current chapter’s Event and lists it as active', async () => {
    const now = new Date('2026-11-15T12:00:00.000Z');
    const events = await service.listActive('u1', now);
    expect(events).toHaveLength(1);
    expect(events[0]!.slug).toBe('pula_first_sowing');
    expect(events[0]!.chapterSlug).toBe('pula');
    expect(events[0]!.claimed).toBe(false);
  });

  it('claims an Event: grants bupi and pays Chapter Tokens', async () => {
    const now = new Date('2026-11-15T12:00:00.000Z');
    const ev = (await service.listActive('u1', now))[0]!;
    const result = await service.claim('u1', ev.id!, now);

    expect(result.claimed).toBe(true);
    expect(result.itemSlug).toBe('bupi');
    expect(inventory.addItem).toHaveBeenCalledWith('u1', 'farm1', 'bupi', 4);
    expect(chapters.addTokens).toHaveBeenCalledWith('u1', 2, now);
    expect(db.event_grants).toHaveLength(1);
  });

  it('is idempotent — a replayed claim grants nothing and pays nothing', async () => {
    const now = new Date('2026-11-15T12:00:00.000Z');
    const ev = (await service.listActive('u1', now))[0]!;
    await service.claim('u1', ev.id!, now);

    inventory.addItem.mockClear();
    chapters.addTokens.mockClear();
    const second = await service.claim('u1', ev.id!, now);

    expect(second.claimed).toBe(false);
    expect(second.alreadyClaimed).toBe(true);
    expect(inventory.addItem).not.toHaveBeenCalled();
    expect(chapters.addTokens).not.toHaveBeenCalled();
    expect(db.event_grants).toHaveLength(1);
  });

  it('refuses a claim outside the Event window', async () => {
    const inside = new Date('2026-11-15T12:00:00.000Z');
    const ev = (await service.listActive('u1', inside))[0]!;
    const tooLate = new Date('2027-05-01T00:00:00.000Z');
    await expect(service.claim('u1', ev.id!, tooLate)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s an unknown Event', async () => {
    await expect(service.claim('u1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
