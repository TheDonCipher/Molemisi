# Document 17: Deployment and DevOps Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-02

---

## 1. Local Development

**NFR-DEP-001**

### Setup

```bash
# Clone repository
git clone https://github.com/molemisi/game.git
cd game

# Install dependencies
npm install

# Set up environment
cp .env.example .env.development

# Start Supabase local
npx supabase start

# Run migrations
npx supabase db reset

# Start development servers
npm run dev
```

### Development Services

| Service | URL | Port |
|---------|-----|------|
| Next.js Web | http://localhost:3000 | 3000 |
| NestJS API | http://localhost:3001 | 3001 |
| Phaser Game | http://localhost:3000/game | 3000 |
| Supabase Studio | http://localhost:54323 | 54323 |
| Redis | localhost:6379 | 6379 |

---

## 2. Environment Setup

### Supabase Projects

| Environment | Purpose | Plan |
|------------|---------|------|
| Local | Development | Supabase CLI |
| Staging | Testing | Free tier |
| Production | Live | Pro tier |

### Database Migrations

```bash
# Create new migration
npx supabase migration new <migration_name>

# Reset local database
npx supabase db reset

# Apply to staging
npx supabase db push --linked

# Apply to production
npx supabase db push --linked --project-ref <prod-ref>
```

---

## 3. Staging Environment

**NFR-DEP-002**

### Deployment

| Component | Platform | Trigger |
|-----------|----------|---------|
| API | Railway | Push to `main` |
| Web | Vercel | Push to `main` |
| Game | Vercel | Push to `main` |
| Database | Supabase | Manual migration |

### Staging URLs

- Web: https://staging.molemisi.com
- API: https://api-staging.molemisi.com

---

## 4. Production Environment

**NFR-DEP-003**

### Deployment

| Component | Platform | Trigger |
|-----------|----------|---------|
| API | Railway | Tag release |
| Web | Vercel | Tag release |
| Game | Vercel | Tag release |
| Database | Supabase | Manual migration |

### Production URLs

- Web: https://molemisi.com
- API: https://api.molemisi.com

---

## 5. CI/CD

**NFR-DEP-004**

### Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    needs: test
    if: startsWith(github.ref, 'refs/tags/')
    steps:
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 6. Asset Deployment

**NFR-DEP-005**

### Asset Pipeline

1. Assets stored in `apps/game/public/assets/`
2. Built with game client (Vite)
3. Served via Vercel CDN
4. Cache-Control headers for performance

### CDN Configuration

```
Cache-Control: public, max-age=31536000, immutable
```

---

## 7. Secrets Management

**NFR-DEP-006**

| Secret | Location | Rotation |
|--------|----------|----------|
| Supabase keys | Railway/Vercel env | Quarterly |
| JWT secret | Railway/Vercel env | Quarterly |
| Stripe keys | Railway env | Quarterly |
| Redis URL | Railway env | On compromise |
| Sentry DSN | Railway/Vercel env | On compromise |

---

## 8. Backups

**NFR-DEP-007**

| Backup Type | Frequency | Retention |
|------------|-----------|-----------|
| Database (Supabase) | Daily | 30 days |
| Database (manual) | Weekly | 90 days |
| Git repository | Continuous | Forever |
| Environment config | On change | Forever |

---

## 9. Rollback

**NFR-DEP-008**

### Rollback Procedures

**API rollback:**
```bash
# Rollback to previous deployment
railway rollback
```

**Web/Game rollback:**
```bash
# Rollback Vercel deployment
vercel rollback
```

**Database rollback:**
```bash
# Create rollback migration
npx supabase migration new rollback_<migration_name>
# Apply rollback
npx supabase db push --linked
```

---

## 10. Monitoring

**NFR-DEP-009**

### Health Checks

```
GET /health
Response: { "status": "ok", "version": "1.0.0", "uptime": 12345 }
```

### Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| API down | No response 5 min | Page on-call |
| High error rate | > 5% errors | Page on-call |
| Database connections | > 80% pool | Investigate |
| Memory usage | > 80% | Investigate |
| Disk usage | > 80% | Investigate |
