# Development Setup

## Prerequisites

### Required

- **Node.js 20+** - Download from [nodejs.org](https://nodejs.org/)
- **pnpm 9+** - Install with `npm install -g pnpm`
- **Docker** - Required for Supabase local development
- **Supabase CLI** - Install with `brew install supabase/tap/supabase` (macOS) or see [docs](https://supabase.com/docs/guides/cli)

### Optional

- **Git** - Version control
- **VS Code** - Recommended IDE
- **Docker Desktop** - GUI for Docker management

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/molemisi.git
cd molemisi
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
# At minimum, you need Supabase credentials
```

### 4. Start Supabase

```bash
# Start local Supabase (requires Docker)
pnpm supabase:start

# This will output:
# - API URL: http://localhost:54321
# - Studio URL: http://localhost:54323
# - Anon Key: eyJ...
# - Service Role Key: eyJ...
```

### 5. Update .env.local

Copy the keys from Supabase output to your `.env.local`:

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<paste-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 6. Apply Database Migrations

```bash
pnpm supabase:reset
```

### 7. Seed Development Data

```bash
pnpm db:seed
```

### 8. Start Development

```bash
pnpm dev
```

## Development Workflow

### Starting Fresh

```bash
pnpm supabase:stop
pnpm supabase:start
pnpm supabase:reset
pnpm db:seed
pnpm dev
```

### Creating a Test User

1. Open http://localhost:3000/auth/register
2. Register with any email/password
3. The user will be created in Supabase Auth
4. A profile and farm will be automatically created

### Running Tests

```bash
# All tests
pnpm test

# API tests only
pnpm --filter @molemisi/api test

# Watch mode
pnpm --filter @molemisi/api test:watch
```

### Database Changes

```bash
# Create new migration
pnpm supabase migration new <migration_name>

# Apply migrations
pnpm supabase:reset

# Generate types (if needed)
supabase gen types typescript --local > packages/database-types.ts
```

## IDE Setup

### VS Code

Recommended extensions:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Nightly

Settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Troubleshooting

### Port Already in Use

```bash
# Find process on port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Supabase Issues

```bash
# Reset everything
pnpm supabase:stop
docker rm -f $(docker ps -a | grep supabase | awk '{print $1}')
pnpm supabase:start
pnpm supabase:reset
```

### TypeScript Errors

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```
