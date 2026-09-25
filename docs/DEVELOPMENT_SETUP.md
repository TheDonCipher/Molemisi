# Development Setup

Last updated 2026-09-14.

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
VITE_API_URL=http://localhost:3001/api/v1
JWT_SECRET=unused-by-api
CORS_ORIGIN=http://localhost:3000
```

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

Applies `supabase/migrations/*` and `supabase/seed/seed.sql`.

**Do not run `pnpm db:seed`.** The Nest script `apps/api/src/database/seed.ts` is missing.

> **Deploying to the linked remote project:** the local flow (`supabase:start` +
> `supabase:reset`) targets a Docker instance. The production-shaped target
> `nyapfgawanqvnkkjudxb` is **schema-current** — the 11-migration gap was pushed on 2026-09-14
> (`supabase db push --dry-run` reports "Remote database is up to date"). Two corrective migrations
> remain unpushed. See `DEVELOPMENT_STATE.md` Headline status.

### 6. Dev servers

```bash
pnpm dev
```

`predev` runs `pnpm assets:sync`. Turborepo starts web (3000) and api (3001).

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| Game (React) | http://localhost:3000/game |
| Phaser standalone | deleted 2026-09-11 |
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

> Role tiers `player|admin|dev` are defined by migration `000021`, which — like all of
> `000016`–`000021` — is **not yet pushed** to the linked project. Until then, `AdminGuard`
> and `DevGuard` fail closed. See `DEVELOPMENT_STATE.md` Headline status.

### Tests

```bash
pnpm test
pnpm --filter @molemisi/api test
pnpm --filter @molemisi/api test:watch
```

Live API (servers up):

```bash
node scripts/test-game-loop.mjs
node scripts/test-full-suite.mjs
```

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

Frees 3000, 3001, and 3002. Then `pnpm dev`.

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

There is no `/api` proxy. Set `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL` to the hosts you actually use.

### Game shows demo plots

No JWT in `localStorage` (`token` / `molemisi_token`), or API down. Register/login first; the React `/game` client needs a valid session.
