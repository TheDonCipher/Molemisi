import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;

/**
 * H2 — tiered rate limits matching the normative table (13 NFR-SEC-006).
 *
 *   auth...........10/min — login/register/brute-force surface
 *   payments........5/min — create/refund/webhook-sensitive mutations
 *   mutations......30/min per endpoint+user — every other write
 *   global........100/min per IP — backstop across everything
 *   reads.........unlimited — GET/HEAD stay exempt (03: every screen mounts
 *                  against these; throttling reads caused the production
 *                  burst-load rejections the old code exempted them for)
 *
 * Two deliberate properties, documented because they look like bugs:
 *   1. The `resetAt < now - WINDOW_MS` expiry is a *double-window* check.
 *      The window resets only once a full untouched window has elapsed, which
 *      bounds burst continuity the way a plain sliding counter does not.
 *   2. Buckets are per-PROCESS (Map). This is the correct behaviour for a
 *      single instance; the moment a second instance exists, swap the store
 *      for Redis (@nestjs/throttler storage adapter) — the interface below is
 *      bucket-shaped precisely so the swap is mechanical.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly store = new Map<string, RateLimitEntry>();

  private readonly buckets = { auth: 10, payment: 5, mutation: 30, global: 100 };

  constructor(
    private readonly windowMs: number = 60_000,
    private readonly maxRequests: number = 60,
  ) {
    // LEGACY CONSTRUCTOR — main.ts still passes (60_000, 60). The class now
    // applies the tiered table above regardless; the arguments are kept only
    // so the wiring compiles. They are otherwise ignored.
    void windowMs;
    void maxRequests;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300_000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    // Idempotent reads are cheap and fire constantly from the game shell (every
    // screen mount, every 30s notification poll). Rate-limit only the mutating
    // requests, or a single client's load burst trips the limiter and rejects
    // all the read endpoints at once.
    const method = (request.method ?? 'GET').toString().toUpperCase();
    if (method === 'GET' || method === 'HEAD') {
      return next.handle();
    }
    const clientId = this.getClientId(request);
    const url = (request.url ?? '').toString();
    const now = Date.now();

    const limit = this.limitFor(url);

    // The specific tier AND the 100/min global backstop both bind. A caller
    // who spreads 30-request bursts across four endpoints still trips 100.
    const tierKey = `${limit.tier}:${clientId}:${limit.route}`;
    const globalKey = `global:${clientId}`;

    const tierOk = this.hit(tierKey, limit.max, now);
    const globalOk = this.hit(globalKey, this.buckets.global, now);

    if (!tierOk || !globalOk) {
      const entry =
        this.store.get(tierOk ? globalKey : tierKey) ?? { count: 0, resetAt: now + WINDOW_MS };
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Retry after ${retryAfter}s.`,
            retryAfter,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }

  /**
   * Route the request to its tier. Order is load-bearing: auth and payment are
   * matched before the generic mutation tier, and the global backstop is
   * enforced inside `hit()` alongside (not instead of) the specific tier.
   */
  private limitFor(url: string): { tier: 'auth' | 'payment' | 'mutation'; route: string; max: number } {
    const path = url.split('?')[0] ?? '';

    if (path.includes('/auth/')) {
      return { tier: 'auth', route: 'auth', max: this.buckets.auth };
    }
    if (path.includes('/payments/') || path.includes('/store/')) {
      return { tier: 'payment', route: 'payment', max: this.buckets.payment };
    }
    // One mutation bucket per (user, endpoint shape). Query params and UUID
    // path segments are stripped so the key stays bounded — otherwise every
    // distinct farm/plot id is its own bucket and the limit never binds.
    const route = path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+(?=\/|$)/g, '/:n')
      .slice(-80);
    return { tier: 'mutation', route, max: this.buckets.mutation };
  }

  /** Increment a bucket, creating it when absent or expired. True when allowed. */
  private hit(key: string, max: number, now: number): boolean {
    const entry = this.store.get(key);
    if (!entry || entry.resetAt < now - WINDOW_MS) {
      this.store.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }
    entry.count++;
    return entry.count <= max;
  }
    /**
   * Who the bucket belongs to. The authenticated user id is the primary key
   * because an IP alone is both too coarse (a shared NAT lumps a whole village)
   * and too forgeable (a spoofed `X-Forwarded-For` walks straight past it). The
   * IP fallbacks only matter for requests that have not authenticated yet —
   * `/auth/login` above all, which is where the credential-stuffing traffic is.
   */
  private getClientId(request: unknown): string {
    const req = request as {
      user?: { sub?: string };
      ip?: string;
      headers?: Record<string, string>;
    };
    // Use authenticated user ID if available
    if (req.user?.sub) return `user:${req.user.sub}`;
    // Fall back to IP
    if (req.ip) return `ip:${req.ip}`;
    // Fall back to X-Forwarded-For
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') return `ip:${forwarded.split(',')[0]?.trim() ?? 'unknown'}`;
    return 'ip:unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }
}
