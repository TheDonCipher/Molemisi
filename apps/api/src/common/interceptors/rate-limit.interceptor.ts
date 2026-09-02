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

/**
 * Simple in-memory rate limiter.
 *
 * For production, use @nestjs/throttler with Redis backing.
 * This is sufficient for development and early testing.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly store = new Map<string, RateLimitEntry>();

  constructor(
    private readonly windowMs: number = 60_000,
    private readonly maxRequests: number = 60,
  ) {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300_000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const clientId = this.getClientId(request);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.store.get(clientId);

    if (!entry || entry.resetAt < windowStart) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(clientId, entry);
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
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

  private getClientId(request: Record<string, unknown>): string {
    const req = request as { user?: { sub?: string }; ip?: string; headers?: Record<string, string> };
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
