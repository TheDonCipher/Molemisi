import { createHmac } from 'crypto';
import { verifyHmacSignature } from './webhook-signature';

/**
 * H3 (security audit 2026-10-02) — the stub used to return `true` from
 * verifyWebhookEvent unconditionally, so the unauthenticated /payments/webhook
 * route accepted any forged event. These pin the real HMAC check.
 */
const sign = (payload: unknown, secret: string) =>
  createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

describe('verifyHmacSignature (H3)', () => {
  const secret = 'test-secret';
  const payload = { providerPaymentId: 'p1', status: 'COMPLETED' };

  it('accepts a correctly signed payload', () => {
    expect(verifyHmacSignature(payload, sign(payload, secret), secret).ok).toBe(true);
  });

  it('rejects a tampered payload signed with the right key', () => {
    const sig = sign(payload, secret);
    expect(verifyHmacSignature({ ...payload, status: 'FAILED' }, sig, secret).ok).toBe(false);
  });

  it('rejects a signature of the wrong length without throwing', () => {
    // timingSafeEqual THROWS on a length mismatch; the guard must prevent that,
    // or a malformed signature becomes a 500 instead of a clean reject.
    const v = verifyHmacSignature(payload, 'abc', secret);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/length/);
  });

  it('rejects when no secret is configured', () => {
    expect(verifyHmacSignature(payload, sign(payload, secret), undefined).ok).toBe(false);
  });

  it('rejects a missing signature', () => {
    expect(verifyHmacSignature(payload, undefined, secret).ok).toBe(false);
  });
});
