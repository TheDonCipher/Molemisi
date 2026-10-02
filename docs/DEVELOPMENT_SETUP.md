# Development Setup

Last updated 2026-10-02.

## Prerequisites

### Required

- **Node.js 20+**
- **pnpm 9+** — `npm install -g pnpm`
- **Docker** — Supabase local
- **Supabase CLI** — https://supabase.com/docs/guides/cli

### Optional

- Git, VS Code
- PixelLab API key — only for `pnpm assets:generate`

## Initial setup

### 1. Clone

```bash
git clone https://github.com/your-username/molemisi.git
cd molemisi
```

### 2. Install

```bash
pnpm install
```

### 3. Environment

```bash
cp .env.example .env.local
```

Do **not** set `NODE_ENV` in `.env` or `.env.local`. It breaks `next build` (`useContext` null during prerender).

Minimum after `pnpm supabase:start`:

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
PORT=3001
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
JWT_SECRET=unused-by-api
CORS_ORIGIN=http://localhost:3000
```

> **`CORS_ORIGIN` is load-bearing.** There is no Next.js rewrite/proxy for `/api` — the browser
> calls `:3001` directly. If you open the app on any origin other than the one in `CORS_ORIGIN`
> (a preview host, a LAN IP, a different port) every API call fails with a CORS error. Set it to
> the origin you are actually using, or a comma-separated list.

> `VITE_API_URL` is **not** used any more. It belonged to the deleted Phaser prototype
> (`apps/game`, removed 2026-09-11); the only client is Next.js and it reads
> `NEXT_PUBLIC_API_URL`. It is harmless to leave in `.env`, but it does nothing.

> `JWT_SECRET` is **unused** — auth is Supabase Auth (`auth.getUser(token)`), not a locally
> signed JWT. It is still listed in `.env.example`; nothing reads it.

Optional: `PIXELLAB_API_KEY` for asset generation.

### 4. Start Supabase

```bash
pnpm supabase:start
```

Copy API URL, Studio URL, anon key, and service role key into `.env.local`.

### 5. Migrations

```bash
pnpm supabase:reset
```

Applies `supabase/migrations/*` (38 files) and `supabase/seed/seed.sql`.

**Do not run `pnpm db:seed`.** The root script delegates to
`pnpm --filter @molemisi/api db:seed`, which runs `ts-node src/database/seed.ts` — and that file
does not exist. Use registration + `supabase:reset`.

> **Deploying to the linked remote project:** the local flow (`supabase:start` +
> `supabase:reset`) targets a Docker instance. The production-shaped target
> `nyapfgawanqvnkkjudxb` has **all 39 migrations pushed live** (through `20261002000000_kgotla_year_charges`,
> 0 pending). **`20261001000003` (`madi_balance`)** and **`20261002000000` (`kgotla_charges`)** are applied,
> so the store, wallet and Year-layer routes resolve against the remote DB. See `DEVELOPMENT_STATE.md`
> Headline status for the full inventory.

### 6. Dev servers

```bash
pnpm dev
```

`predev` runs `pnpm build-font` + `pnpm assets:sync` + `pnpm generate-icons.mjs`. Turborepo
starts web (3000) and api (3001).

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| Game (React) | http://localhost:3000/game |
| Phaser standalone | **deleted 2026-09-11** — no longer a service |
| API health | http://localhost:3001/api/v1/health |
| Admin | http://localhost:3000/admin/login |
| Studio | http://localhost:54323 |

## Workflow

### Fresh DB

```bash
pnpm supabase:stop
pnpm supabase:start
pnpm supabase:reset
pnpm dev
```

### Test user

1. http://localhost:3000/auth/register
2. Auth user + profile + farm + 4 plots + starter seeds are created

### Admin user

API must be running:

```bash
node scripts/create-admin.mjs
```

Default account is defined in that script. Sign in at `/admin/login`.

For a **dev** account (can do and test EVERYTHING — dev is the top tier,
admitted to `/dev` tooling, the `/admin` panel, and all player routes):

```bash
node scripts/create-dev.mjs
```

Default: `dev@molemisi.co` / `Dev12345!` (overridable via `DEV_EMAIL` / `DEV_PASSWORD`).

For a **test player** account (plain player tier — simulates real player
activity; blocked from `/admin` and `/dev` with 403):

```bash
node scripts/create-player.mjs
```

Default: `player@molemisi.co` / `Player123!` (overridable via `PLAYER_EMAIL` / `PLAYER_PASSWORD`).

> Role tiers `player|admin|dev` come from migration `20260911000021` and are **pushed**. `dev` is
> the **top tier**: admitted to `/admin` *and* `/dev`. `AdminGuard` and `DevGuard` query
> `profiles` on every request — there is no JWT role claim to go stale.

### Tests

```bash
pnpm test                        # everything: 37 suites / 615 tests
pnpm --filter @molemisi/api test        # 28 suites / 417 tests
pnpm --filter @molemisi/game-config test # 8 suites / 163 tests
pnpm --filter @molemisi/validation test  # 1 suite  / 35 tests
pnpm --filter @molemisi/api test:watch
```

The economy gate is separate and is **not** part of `pnpm test`:

```bash
python scripts/balance_verify.py    # must print PASS
```

Live API (servers up):

```bash
node scripts/test-game-loop.mjs
node scripts/test-full-suite.mjs
```

> ⚠️ **Never run the simulator against the linked Supabase project.** `pnpm simulate` creates
> real accounts. Validate with Jest and `balance_verify.py` instead, or point it at a throwaway
> local database.

### Database changes

```bash
pnpm supabase:migration:new <migration_name>
pnpm supabase:reset
```

### Assets

```bash
pnpm assets:sync
pnpm assets:generate
```

Generation overwrites files under `assets/` and needs `PIXELLAB_API_KEY`.

## Ports in use

```bash
pnpm dev:kill
```

Frees 3000 and 3001. (The 3002 entry that used to be listed belonged to the deleted Phaser
prototype.) Then `pnpm dev`.

On macOS/Linux you can also inspect with `lsof -i :3000`.

## VS Code

Suggested extensions: ESLint, Prettier, Tailwind CSS IntelliSense.

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

## Troubleshooting

### `next build` / `useContext` null

Remove `NODE_ENV` from env files. Web build uses `cross-env NODE_ENV=production`.

### Supabase will not start

Docker must be running. Then:

```bash
pnpm supabase:stop
pnpm supabase:start
pnpm supabase:reset
```

### TypeScript / stale builds

```bash
pnpm clean
pnpm install
pnpm build
```

### CORS on preview hosts

There is no `/api` proxy. Set `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL` to the hosts you actually
use. The single most common local failure is opening `http://127.0.0.1:3000` while
`CORS_ORIGIN=http://localhost:3000` — different origins as far as the browser is concerned.

### Assets missing / 404 on an icon

`apps/web/public/assets/` is **generated**, not committed in a durable way. If icons 404, run
`pnpm assets:sync`. Note the background files live at `assets/tiles/sky/` even though the
manifest group is called `backgrounds` — resolve via the manifest's `file` field, never by
rebuilding a path from the group name (`docs/05 §14`).

### Game shows demo plots

No JWT in `localStorage` (`token` / `molemisi_token`), or API down. Register/login first; the React `/game` client needs a valid session.
