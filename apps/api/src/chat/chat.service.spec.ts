import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SupabaseService } from '../database/supabase.service';
import { CHAT_RATE_LIMITS } from '@molemisi/game-config';
import { makeDb, clientFor, type MockDb, type MockClient } from '../test/supabase-mock';

/**
 * D5 / B1 — global Kgotla chat, proved against the no-moderation ruling.
 *
 * What is asserted: the author line is the PLAYER identity (D4), the payload guard
 * and the anti-flood limit hold, and — critically — that NO content filter is in
 * the way. The last test is the regression guard for the ruling.
 */
describe('ChatService — Kgotla chat (D5, no moderation)', () => {
  let service: ChatService;
  let db: MockDb;
  let client: MockClient;

  beforeEach(async () => {
    db = makeDb({ profiles: [], kgotla_messages: [] });
    client = clientFor(db);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: SupabaseService, useValue: { getAdminClient: () => client, getClient: () => client } },
      ],
    }).compile();
    service = module.get(ChatService);
  });

  it('posts under the player’s display name — the Kgotla identity (D4)', async () => {
    db.profiles.push({ id: 'u1', display_name: 'Naledi' });
    const msg = await service.post('u1', 'Dumela, bagaetsho!');
    expect(msg.displayName).toBe('Naledi');
    expect(msg.body).toBe('Dumela, bagaetsho!');
    expect(msg.mine).toBe(true);
    expect(db.kgotla_messages).toHaveLength(1);
  });

  it('never reads the farm name into the author line (D4 identity split)', async () => {
    db.profiles.push({ id: 'u1', display_name: 'Naledi' });
    db.farms.push({ id: 'f1', user_id: 'u1', name: 'Sunny Acres' });
    const msg = await service.post('u1', 'hello');
    expect(msg.displayName).toBe('Naledi');
    expect(msg.displayName).not.toBe('Sunny Acres');
  });

  // ---- the ruling itself: no content filter exists -------------------------
  it('accepts ANY wording — there is no content filter (ruling: no moderation)', async () => {
    // Distinct authors so the anti-flood window (which IS still enforced) is not
    // what makes this test pass — it must prove CONTENT is never inspected.
    const bodies = ['this is rude but allowed', 'any wording at all', 'Profanity passes too'];
    let i = 0;
    for (const body of bodies) {
      const playerId = `player${i++}`;
      await expect(service.post(playerId, body)).resolves.toBeDefined();
    }
    expect(db.kgotla_messages).toHaveLength(3);
    expect(db.kgotla_messages.map((m) => m.body)).toEqual(bodies);
  });

  it('rejects an empty payload without writing', async () => {
    await expect(service.post('u1', '   ')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.kgotla_messages).toHaveLength(0);
  });

  it('rejects an over-long payload (transport limit, not a filter)', async () => {
    await expect(service.post('u1', 'a'.repeat(CHAT_RATE_LIMITS.maxLength + 1))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.kgotla_messages).toHaveLength(0);
  });

  it('rate-limits a second message inside the minimum interval (anti-flood)', async () => {
    await service.post('u1', 'first');
    await expect(service.post('u1', 'second')).rejects.toBeInstanceOf(HttpException);
    expect(db.kgotla_messages).toHaveLength(1);
  });

  it('shows every message to everyone — one shared channel', async () => {
    db.kgotla_messages.push({
      id: 'm1',
      player_id: 'u2',
      display_name: 'Thabo',
      body: 'hi',
      language: 'en',
      created_at: '2026-10-01T00:00:00.000Z',
      deleted_at: null,
    });
    expect(await service.list('u1')).toHaveLength(1);
    expect(await service.list('u3')).toHaveLength(1);
  });
});

