/**
 * HTTP client for the real API. Same contract the React client uses, which is
 * what gives the security checks their value: a simulator that wrote game state
 * directly to the database would never exercise the API's own validation.
 */

import type { ApiResponse } from './types';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
  /** Milliseconds; safety-net only — the real limiter is the API's own. */
  timeoutMs?: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly payload: unknown,
  ) {
    super(`HTTP ${status} on ${path}`);
    this.name = 'ApiError';
  }
}

/**
 * The NestJS app mounts every controller behind a global prefix (`api/v1`, set
 * in `main.ts`). Endpoint paths in this package are written relative to that
 * prefix, so the client joins it rather than every call site repeating it.
 */
export const DEFAULT_API_PREFIX = '/api/v1';

export class ApiClient {
  /**
   * Recent mutating requests per identity, for the client-side pacing buckets.
   *
   * The API keys its limiter on `user:${sub}` when authenticated (falling back to
   * `ip:` when not), so each simulated player has their own 60/min allowance. A
   * single global bucket throttled the whole population to one player's budget and
   * turned a five-minute run into a two-hour one.
   */
  private readonly mutationBuckets = new Map<string, number[]>();

  constructor(
    readonly baseUrl: string,
    readonly apiPrefix: string = DEFAULT_API_PREFIX,
    /**
     * Client-side cap on mutating requests per rolling minute. The API's own
     * interceptor allows 60/60s and counts mutations only, so a harness that
     * ignores it measures nothing but the limiter: every check past the cap gets a
     * 429 instead of a verdict. 0 disables pacing (used for PostgREST clients).
     */
    readonly mutationsPerMinute: number = 0,
  ) {}

  private url(path: string): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    const prefix = this.apiPrefix.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${prefix}${p}`;
  }

  /**
   * Block until this mutation fits inside the rolling window for its identity.
   * GETs are exempt, matching the API's own rule.
   */
  private async pace(method: string, token?: string): Promise<void> {
    if (this.mutationsPerMinute <= 0 || method === 'GET') return;
    // Unauthenticated mutations share the API's IP bucket, so they share one here too.
    const key = token ? `user:${token}` : 'ip:anonymous';
    let times = this.mutationBuckets.get(key);
    if (!times) {
      times = [];
      this.mutationBuckets.set(key, times);
    }
    const windowMs = 60_000;
    for (;;) {
      const now = Date.now();
      while (times.length > 0 && now - times[0]! >= windowMs) times.shift();
      if (times.length < this.mutationsPerMinute) {
        times.push(now);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, windowMs - (now - times[0]!) + 25));
    }
  }

  /**
   * Call an endpoint. Never throws on a non-2xx — the harness needs to record
   * rejections as events, and the safeguard checks need to inspect status codes.
   */
  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
    const method = opts.method ?? 'GET';
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (opts.token) headers['authorization'] = `Bearer ${opts.token}`;

    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

    // Pace to the API's own limiter, and treat a 429 as "wait and retry" rather than
    // as a verdict — otherwise a saturated limiter silently masquerades as a
    // security finding.
    const url = this.url(path);
    let res: Response;
    for (let attempt = 0; ; attempt++) {
      await this.pace(method, opts.token);
      res = await fetch(url, init);
      if (res.status !== 429 || attempt >= 3) break;
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5_000 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const text = await res.text();
    let raw: unknown = undefined;
    if (text.length > 0) {
      try {
        raw = JSON.parse(text) as unknown;
      } catch {
        raw = text;
      }
    }

    // Response shapes differ across the API: most wrap `{ success, data }`, while
    // `/payments/store` returns `{ items }`. Unwrap defensively.
    const data = unwrap(raw) as T;
    return { status: res.status, ok: res.status >= 200 && res.status < 300, data, raw };
  }

  get<T = unknown>(path: string, token?: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET', token });
  }

  post<T = unknown>(path: string, body?: unknown, token?: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'POST', body: body ?? {}, token });
  }

  put<T = unknown>(path: string, body?: unknown, token?: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'PUT', body: body ?? {}, token });
  }
}

function unwrap(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  if ('data' in obj) return obj['data'];
  if ('items' in obj) return obj['items'];
  return raw;
}
