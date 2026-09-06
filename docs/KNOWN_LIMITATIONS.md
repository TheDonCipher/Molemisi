# Known Limitations

As-built gaps and debt as of 2026-09-06. Older scaffold notes in this file are obsolete.

---

## Product / UX

### Phaser is not the player client

The ADR and rendering spec assume Next.js hosts Phaser. `/game` is a React screen switcher. Phaser runs only as a standalone Vite app on port 3002 with Boot / Preload / FarmScene. Kgotla, Bushveld, and Market Phaser scenes and most `apps/game/src/ui` panels are unused.

### No player logout

`POST /api/v1/auth/logout` exists but is a server no-op. Settings has no logout. Tokens stay in `localStorage` (`token` and `molemisi_token`).

### Token key split

Login writes both `molemisi_token` and `token`. `apps/web/src/lib/api.ts` reads only `token`. Phaser `ApiClient` accepts either. Admin uses `molemisi_admin_token`. Easy to desync.

### No token refresh

Login/register return a Supabase `refreshToken`. There is no `POST /auth/refresh`. Sessions die with JWT expiry (`jwt_expiry = 3600` in `supabase/config.toml`).

### No audio

No Phaser sound, Howler, or audio assets. Settings BGM/SFX sliders only write React state.

### Store UI missing on the web client

API store + stub payments exist. Phaser `StorePanel` is unregistered. React has no IAP shop. Admin can view payment history.

### Bushveld React forage is partly client-side

`BushveldScreen` can show forage nodes without going through every API path. Server `POST .../bushveld/gather` is authoritative when used.

### No i18n beyond en/tn strings

`translations.ts` covers UI copy. Content (crop names, NPC dialogue) is English in config/services.

---

## API / backend

### `pnpm db:seed` is broken

`apps/api` script `db:seed` runs `ts-node src/database/seed.ts`, which does not exist. Use registration + `supabase/seed/seed.sql` (via `pnpm supabase:reset`).

### Config mutation is not admin-only

`PUT /config` and `PUT /config/:key` use `AuthGuard` only. Any logged-in player can change live `game_config`.

### Payment webhook requires JWT

Comments say webhook is unauthenticated. Class-level `AuthGuard` still applies. Stub `verifyWebhookEvent` always returns true. No Stripe/Orange HMAC.

### Stub payments only

`StubPaymentProvider` completes immediately. Stripe / Orange Money env vars are commented in `.env.example`. Entitlements for extra plots/storage/cosmetics are largely logged, not fully applied.

### Exception filter unused

`AllExceptionsFilter` is not registered in `main.ts`.

### Rate limit is in-process

60 requests / 60 seconds, memory map, not Redis. Resets per API process. Comment in code: use `@nestjs/throttler` + Redis in production.

### Analytics has no HTTP API

`analytics_events` table + service exist. No player or admin query endpoints. Events may not be emitted from every action.

### Validation schemas underused

Zod schemas exist for fertilize, heal, etc. Controllers mostly use loose body types. Nest `ValidationPipe` + class-validator run on DTOs that exist; many routes have none.

### Contracts / NPCs / zones / events not data-driven

Hardcoded in Nest services. `packages/game-config` does not export them. Conflicts with ADR-009.

### No idempotency on most mutations

Payments table has an idempotency column. Plant/water/harvest/market are not idempotent-keyed.

---

## Frontend / infra

### No reverse proxy

Next.js has no `rewrites` for `/api`. Vite has no `server.proxy`. Online single-port preview cannot reach the API unless `NEXT_PUBLIC_API_URL` is publicly reachable and CORS allows the preview origin.

### Vite `allowedHosts` not set

`apps/game/vite.config.ts` does not allow `*.monkeycode-ai.live`.

### Dual Next config

`next.config.js` is the active file. `next.config.mjs` is a stale duplicate.

### PWA is minimal

Custom `sw.js`, no `next-pwa`, no offline game simulation on the client, no push.

### Capacitor / native

Not started (ADR-011).

### Redis

Not used (ADR-012: optional later). No cache, no distributed rate limit, no job queue.

---

## Testing / ops

### Thin automated tests

A handful of unit tests. Integration file under `apps/api/test/` is outside Jest `rootDir`. No Playwright/E2E. Live coverage is `scripts/test-*.mjs` against a running API.

### CI has no database

GitHub Actions runs lint, typecheck, test, build. No Supabase service, no migration check, no deploy.

### No staging/production pipeline

Deployment spec is design-only.

---

## Security notes (known, not a scan)

- JWT in localStorage (XSS-sensitive), not httpOnly cookies
- Service role key is server-only if env is set correctly
- Admin is a boolean on `profiles`, not a JWT role claim
- Banned users can still hit `/admin/` URLs at the guard layer (intended for admin tooling)

---

## Won't-fix for Alpha unless blocking

- Full Phaser embedding in Next.js
- Real payment providers
- Sound design
- Push notifications
- Friend/social features (post-MVP roadmap)
