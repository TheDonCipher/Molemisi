# Known Limitations

As-built gaps and debt as of **2026-09-16**. Supersedes the 2026-09-14 version. See
`DEVELOPMENT_STATE.md` for the live inventory.

---

## Hard blocker — RESOLVED

### Migrations are pushed (resolved 2026-09-14)

The 11-migration deploy gap (`000016`–`000120` + `000021`) was pushed to `nyapfgawanqvnkkjudxb`;
`supabase db push --dry-run` reports "Remote database is up to date". `/admin`, `/dev` and P2–P9
now run at runtime and `/auth/me` resolves roles correctly. Two **pending** corrective migrations
remain (`20260914000022` cosmetic-id type fix; `20260916000030` obsolete overload drop) and are
not yet pushed, but they are non-blocking bug-fixes.

---

## Deferred from v1 by ruling (2026-09-11)

Two features are specified in the normative set and deliberately **not** in v1. Recorded here
so "specified but absent" never reads as an oversight.

### Wildlife raids are not implemented

`03 §1.3` describes jackals and baboons raiding plots overnight, with the Kraal protecting
livestock, the Farm Boundary protecting crops, and the Ancestral Ward granting a 3-day shield.
**No raid mechanic exists anywhere in `apps/api/src`.** Deferred because it touches the
highest-risk surface — the growth simulation, building effects, and the offline-elapsed-time
pass — and no v1 done-criterion tests it. **The Ancestral Ward has been withdrawn from the
store** so nothing is sold that does nothing; restore `available: true` in
`packages/game-config/src/store.ts` in the same commit that implements raids.

### Boost effects are not wired

`05 §P9` requires three boosts (Pula Stone, Ancestral Ward, Breath of the Land). They are
catalogued and the weekly Pula Stone is granted, but **no endpoint applies any of their
effects** — no tank refill or rain guarantee, no shield, no timer completion. Deferred with
the raids; the Ancestral Ward's effect *is* the raid shield. All three are withdrawn from the
store (`available: false`) until they do something.

### Bushveld comparative income is answered by telemetry, not a model

`04 §1` requires the Bushveld never to out-earn the fields. The structural half is proven in
code; the comparative half is modelled in `scripts/balance_verify.py` §8 and reports
Bushveld net **P153.90/day** vs a 4-plot starter farm's P49/day — an inversion at 4, 8 and 12
plots that closes by 20 (0.63×). **Ruled 2026-09-11: live income telemetry answers this
post-launch.** The inversion is a recorded, accepted state, not an open bug.

---

## Product / UX

### Phaser is not the player client

`/game` is a React screen switcher. The standalone Phaser prototype `apps/game` (Boot / Preload /
FarmScene on port 3002, with Kgotla/Bushveld/Market scenes and `apps/game/src/ui` panels) was
**deleted on 2026-09-11**. React `/game` is now the only client; the spec's "React only" intent
(`01` D3) is satisfied.

### Token key split

Login writes both `molemisi_token` and `token`. `apps/web/src/lib/api.ts` reads
`molemisi_token` first, then `token`. Admin uses `molemisi_admin_token`. Easy to desync;
superseded by the Supabase session token in practice.

### No token refresh

Login/register return a Supabase `refreshToken`. There is no `POST /auth/refresh`. Sessions
die with JWT expiry (`jwt_expiry = 3600` in `supabase/config.toml`).

### No audio

No Phaser sound, Howler, or audio assets. Settings BGM/SFX sliders only write React state.

### Store UI exists on the web client

`StoreScreen` renders the Pula store (`GET /store`) and real-money packs (`GET
/payments/store`). **The three boosts are absent from both shelves** (deferred ruling above).

### Bushveld React forage is partly client-side

`BushveldScreen` can show forage nodes without going through every API path. The server
`POST .../bushveld/hotspots/:id/collect` is authoritative when used.

### No i18n beyond en/tn strings

`translations.ts` covers UI copy. Content (crop names, NPC dialogue) is English in
config/services.

### Nav is hybrid (resolved)

`HeaderNav` shows the 4 primary screens (Farm, Kgotla, Bushveld, Market) in the footer and the
rest (Store, Wallet, Crafting, Inventory, Journal, Settings) in a header **More** menu. This
reconciles the four-screen model (`01 §3` / `07 §7.2`); Inventory + Settings live in the header.

---

## API / backend

### `PUT /config` is not admin-gated

`GET/PUT /config` and `/config/:key` use `AuthGuard` only. Any logged-in player can change
live `game_config`.

### Payment webhook requires JWT

Comments say webhook is unauthenticated. Class-level `AuthGuard` still applies. Stub
`verifyWebhookEvent` always returns true. No Stripe/Orange Money HMAC.

### Stub payments only

`StubPaymentProvider` completes immediately. Stripe / Orange Money env vars are commented in
`.env.example`. Entitlements for extra plots/storage/cosmetics are largely logged, not fully
applied.

### Exception filter unused

`AllExceptionsFilter` is not registered in `main.ts`.

### Rate limit is in-process

60 requests / 60 seconds, memory map, not Redis. Resets per API process.

### Analytics has no HTTP API

`analytics_events` table + service exist. No player or admin query endpoints. Events are
emitted from most actions but not all.

### Validation schemas underused

Zod schemas exist for fertilize, heal, etc. Controllers mostly use loose body types. Nest
`ValidationPipe` + class-validator run on DTOs that exist; many routes have none.

### Contracts / NPCs / zones / events not data-driven

Hardcoded in Nest services. `packages/game-config` does not export them. This is a deliberate
MVP scoping choice (verified), not drift — flagged so it is not mistaken for debt.

### No idempotency on most mutations

Payments table has an idempotency column. Plant/water/harvest/market are not idempotent-keyed.

---

## Frontend / infra

### No reverse proxy

Next.js has no `rewrites` for `/api`. Vite has no `server.proxy`. Online single-port preview
cannot reach the API unless `NEXT_PUBLIC_API_URL` is publicly reachable and CORS allows the
preview origin.

### Vite `allowedHosts` not set (removed)

This limitation referenced `apps/game/vite.config.ts`, which no longer exists — the Phaser
prototype was deleted on 2026-09-11. Not applicable to the shipped React client.

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

18 Jest suites / **209 tests** across the API — a real suite, but integration coverage is
narrow. `apps/api/test/core-loop.integration.spec.ts` is outside Jest `rootDir`. No
Playwright/E2E. Live coverage is `scripts/test-*.mjs` against a running API.

### CI has no database

GitHub Actions runs lint, typecheck, test, build. No Supabase service, no migration check, no
deploy.

### No staging/production pipeline

Deployment spec is design-only.

---

## Security notes (known, not a scan)

- JWT in localStorage (XSS-sensitive), not httpOnly cookies
- Service role key is server-only if env is set correctly
- Admin is a boolean on `profiles` (`is_admin`) **and** a `role` (`admin`) — both must agree
  for `AdminGuard`; devs are excluded from admin
- Banned users can still hit `/admin/` URLs at the guard layer (intended for admin tooling)

---

## Won't-fix for Alpha unless blocking

- Full Phaser embedding in Next.js
- Real payment providers
- Sound design
- Push notifications
- Friend/social features (post-MVP roadmap)
