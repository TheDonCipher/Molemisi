import { createHmac, timingSafeEqual } from 'crypto';

export interface SignatureVerdict {
  ok: boolean;
  reason: string;
}

/**
 * H3 (security audit 2026-10-02) — verify a payment webhook signature.
 *
 * HMAC-SHA256 over the raw event payload, hex-encoded, compared in CONSTANT TIME.
 * `timingSafeEqual` throws when the two buffers differ in length, so the length is
 * checked first — a variable-length comparison would leak the expected length and
 * an exception would turn a bad signature into a 500 instead of a clean reject.
 *
 * The signing secret lives in `PAYMENT_WEBHOOK_SECRET`. A provider that has no
 * secret configured cannot be trusted, and says so — the caller decides whether
 * that is fatal (production) or a development convenience.
 */
export function verifyHmacSignature(
  rawPayload: unknown,
  signature: string | undefined,
  secret: string | undefined,
): SignatureVerdict {
  if (!secret) return { ok: false, reason: 'no webhook secret configured' };
  if (!signature) return { ok: false, reason: 'missing signature' };

  const body = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload ?? {});
  const expected = createHmac('sha256', secret).update(body).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: 'signature length mismatch' };
  }

  return timingSafeEqual(expectedBuf, providedBuf)
    ? { ok: true, reason: 'ok' }
    : { ok: false, reason: 'signature mismatch' };
}
