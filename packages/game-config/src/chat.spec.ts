import { CHAT_RATE_LIMITS, isPostable } from './chat';

/**
 * D5 — the chat is unmoderated by ruling (2026-10-04), so what remains to test is
 * the anti-flood / payload guard: it must constrain LENGTH and FREQUENCY, never
 * content.
 */
describe('chat payload guard (D5, no moderation)', () => {
  it('accepts an ordinary bilingual greeting verbatim', () => {
    expect(isPostable('Dumela, bagaetsho! How is the planting going?')).toBe('ok');
  });

  it('accepts any wording — content is not filtered', () => {
    // There is deliberately no wordlist. The guard must be content-blind.
    expect(isPostable('whatever a player chooses to say')).toBe('ok');
  });

  it('rejects an empty payload', () => {
    expect(isPostable('   ')).toBe('empty');
    expect(isPostable('')).toBe('empty');
  });

  it('rejects an over-long payload (a transport limit, not a filter)', () => {
    expect(isPostable('a'.repeat(CHAT_RATE_LIMITS.maxLength))).toBe('ok');
    expect(isPostable('a'.repeat(CHAT_RATE_LIMITS.maxLength + 1))).toBe('too_long');
  });

  it('keeps the anti-flood window bounded', () => {
    expect(CHAT_RATE_LIMITS.maxPerWindow).toBeGreaterThan(0);
    expect(CHAT_RATE_LIMITS.minSecondsBetween).toBeGreaterThan(0);
    expect(CHAT_RATE_LIMITS.windowSeconds).toBeGreaterThan(0);
  });
});

