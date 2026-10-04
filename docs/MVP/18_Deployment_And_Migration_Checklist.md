# 18 — Deployment & Migration Checklist

> Companion to `09`. Normative anchors: `05` (phases, critical path), `06 §4` (P0–P10 criteria), `17_Deployment_and_DevOps_Specification.md`, `DEVELOPMENT_STATE.md` §Current objective.
> **Purpose:** the go-live runbook. Ordered, checkable, with the exact commands and the failure modes that silently no-op.

---

## 1. Deployment shape

| Component | Target | Port |
|---|---|---|
| `apps/web` — Next.js 14 App Router, Tailwind, PWA | Vercel (or equivalent) | 3000 |
| `apps/api` — NestJS 10, prefix `/api/v1` | Node host | 3001 |
| Database + Auth | Supabase PostgreSQL 17.6.1 (`nyapfgawanqvnkkjudxb`) | — |

**Required env (all gitignored):**

| File | Vars |
|---|---|
| `apps/api/.env` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (RESOLVED `f8912f4`), `PAYMENT_WEBHOOK_SECRET` (required before any real PSP goes live) |
| `apps/web/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_BASE` |

> ⚠️ **The DB password is NOT the service-role key.** `supabase db push` prompts for it; it is not in `.env`. Headless environments cannot push DDL without it.

---

## 2. Build order — the critical path (`05 §Critical path`)

```
P0 ─┐
    ├─→ P1 ─→ P2 ─→ P3 ─→ P4 ─→ P7 ─┐
        │         └─→ P5 ─→ P6 ─→ P8 ─┤
        └─────────────────────── P9 ──┤
                                      │
                        [ tuning sandbox ] ──→ P10
                          (starts after P6)

                [ B1 + B2 ] ─→ P11 ─→ P12 ─→ P13 ─→ P14
```

- **P1 is on the critical path for everything.** A wrong number in config propagates into every system built on it and looks like a balance problem rather than a data problem.
- **P2 is the highest-risk phase.** It moves every player's balance. Reconciliation before cutover, or don't cut over.
- **Everything from P11 right is behind the gate** (B1 legal + B2 PSP). If they resolve late, v1 has already shipped and is earning.

---

## 3. Pre-go-live verification

### 3.1 Step 0 — verify the schema (already landed)

> ✅ **All 49 migrations are committed, pushed, and applied live** as of 2026-10-04 (commit `bf235be` landed the M-series batch; verified: `git ls-files` = 49, zero untracked). The historical "10 untracked / unpushed" state is stale. **Do this as a verification step, not a pending action.**

```bash
cd "…/Molemisi"
git ls-files supabase/migrations/*.sql | wc -l      # expect 49
git status --porcelain supabase/migrations/        # expect EMPTY
supabase migration list --linked
   # → every migration must show a Remote timestamp.
   #   A blank Remote column = the migration ROLLED BACK and was NOT recorded.
```

If — and only if — a migration shows a blank Remote column, re-apply:

```bash
supabase db push                                   # prompts for the DB password
supabase migration list --linked                   # re-verify
```

**The M-series batch** (`20261002000001_profiles_role_guard` → `20261003000020_spend_chapter_tokens`) provides `inventory_take`, `botho_credit_capped`, `spend_chapter_tokens`, the widened `ledger_entries.currency` CHECK, and the RLS closures. These are **live**; the C1/C2/C3/H1/H3/H6 fixes are deployed.

**Silent-failure checklist for each migration file:**
- [ ] One balanced `BEGIN; … COMMIT;` (no stray `COMMIT;`, no unclosed `BEGIN;`).
- [ ] `COMMENT ON … IS 'a' 'b'` — adjacent literals, never `||`.
- [ ] `is_admin(auth.uid())` — never the bare zero-arg form.
- [ ] 14-digit filename prefix is unique across the folder.

### 3.2 Static checks

- [ ] `tsc --noEmit -p apps/api` → **0** (re-verify — HEAD was not 0 before the remediation pass).
- [ ] `tsc --noEmit -p apps/web` → **0**.
- [ ] Route table contains **no withdrawal endpoint** (I15).
- [ ] No numeric literal from `02 §6` in application code.
- [ ] No P2P Pula function accepts two player IDs (I2).

### 3.3 Config seeding (idempotent)

```bash
pnpm db:seed      # ⚠️ currently BROKEN — root delegates to a non-existent src/database/seed.ts
pnpm db:seed      # second run must change NOTHING (06 P1)
```

- [ ] `pnpm db:seed` works (fix or restore `src/database/seed.ts`), or is removed from `package.json`.
- [ ] Second run is a no-op.
- [ ] Every value in `02 §6` is present in seeded data, asserted by test.
- [ ] Crop values match `02 §6.1` exactly (sorghum P3 · millet P4 · maize P5 · cowpeas P6 · tomatoes P10 · watermelon P11 · groundnuts P11 · sesame P15 · pepper P17 · herbs P25 · morula P46 — **not** the codebase's old P15/P20/P40).

### 3.4 The economy gate

```bash
python scripts/balance_verify.py
```

- [ ] Prints **PASS** — dead-zone 0, dominance ≤ 3, value spread 3.32×, thirst 7.5×, crafting closes.
- [ ] Run **against the seeded config**, not against the spec on disk (P10).
- [ ] If `FAIL` → **fix `02`, never the script.**

### 3.5 Reconciliation (before wallet cutover)

| # | Checkpoint | Assertion | Gate |
|---|---|---|---|
| REC-1 | Wallet migration | `sum(old) == sum(new)` Pula | **before** reads cut over |
| REC-2 | Botho migration | old standing migrated into `botho_points`; old column deleted (I10) | P2 |
| REC-3 | Historical top-ups | 27 rows credited Pula (P395) pre-Madi. Not rewritten — reconciliation note raised for operator ruling | P9 |

- [ ] `scripts/live-db-audit.mjs` reports: 0 negative balances, 0 negative inventory, 0 orphan crops, 0 stale/future timestamps, 0 anti-cheat flags.

---

## 4. Migration strategy (reference)

**49 files.** All committed, pushed, and applied live (verified 2026-10-04).

**Rules (full detail in `11 §4`):**
1. Unique 14-digit prefix per file.
2. One balanced `BEGIN;…COMMIT;` per file.
3. Verify with `supabase migration list --linked` after every push — **blank Remote = not applied**.
4. `supabase db push` applies **all** pending migrations, including other agents'. Check the `list` output before a root push.
5. `supabase db dump --schema-only` is **not a valid flag** (prints help, exit 0). Live DDL cannot be inspected without Docker.

**New tables added by the 2026-10-04 rulings (`11 §3`):** `cosmetic_skus`, `achievements`, `player_achievements`, `events` + `event_grants`, and `farms.name`. Additive; can ship after the 10 land, but the ordering must be explicit.

---

## 5. Post-go-live verification

### 5.1 Production-config assertions

Confirmed **in production configuration, not in tests** (`06` P10):

- [ ] 5% Co-op tax live on every sale path.
- [ ] Daily top-up cap at **P500 in UTC+2** (not server-local).
- [ ] **No withdrawal endpoint exists** (I15).
- [ ] No P2P Pula transfer path exists (I2).
- [ ] **No boost SKU exists in the catalogue at all.**
- [ ] The store sells only the two cosmetic shelves and the Village Pass.
- [ ] Prize pool floor/ceiling are the `02 §6.7` values (not placeholder test values).
- [ ] `PaymentsModule` resolves a **real** provider, not the stub (it throws in production if it does not).

### 5.2 Jobs & crons

- [ ] Daily cron flips lapsed subscriptions to `free`.
- [ ] Weekly cron grants subscribers a Pula Stone *(note: boosts are cut; confirm what this grants, or disable it — a job granting a cut SKU is a bug)*.
- [ ] Daily Sparkle cron writes one row per date, chosen from currently-ready hotspots.
- [ ] Chapter rollover dry-run executed against production-shaped data **before** the first real rollover (I13).

### 5.3 PWA & device

- [ ] PWA installs on Android and iOS with no Play Store dependency.
- [ ] Low-end device smoke test on throttled 3G passes.
- [ ] Full scripted walkthrough in one sitting, desktop + mobile widths (`17 §4.4`).

---

## 6. Phase sign-off criteria (condensed)

| Phase | Sign-off |
|---|---|
| P0 | Stabilise: logout, `/api` rewrite, `AdminGuard` on both `PUT /config`, `db:seed` fixed/removed, signup→farm→sell→logout→login |
| P1 | Numbers of record seeded + asserted; gate PASS; XP/level deleted; enums correct; no timer in (24 h, 40 h); seed calendar; idempotent seed |
| P2 | Wallet single-writer; reconciliation; ledger append-only + nullable currency; replay-once; no P2P; no withdrawal route |
| P3 | Catalogue seeded; caps enforced; recipes net margins; no partial deduction; slots; thresholds on direct calls; tools don't occupy slots |
| P4 | Tank halts/resumes; rain credits; maintenance demand; land ladder; water only while growing |
| P5 | `/progression` shape; Letsema double-gate; Botho cap; Elder tip reactive; Deep Bushveld `coming_soon` |
| P6 | Kagiso on read; two 409 reasons; bounds; one Sparkle/day; Mophane clock-mocked; journal write-once; restoration swap |
| P7 | Tax + band + crafted exemption + seasonal seed rotation |
| P8 | Four chapters on real dates; rollover zeroes once, idempotent; dry-run done |
| P9 | Store = 2 shelves + Pass, no boosts; webhook-only credit; caps in UTC+2; lapsed sub drops benefits; Auto-Collector Botho-neutral; ≥1 unbounded sink |
| P10 | Full walkthrough; PWA; production-config assertions; 3G smoke; **gate PASS against seeded config**; Bushveld-supplement answered by telemetry commitment |
| P11–P14 | B1+B2 recorded; KYC; Madi from deposits only; Exchange fees; withdrawal rules; I15 retired by sign-off |

---

## 7. Known launch blockers & open items

| Blocker | Impact | Owner |
|---|---|---|
| **`mailer_autoconfirm: false`** on live | `signUp` hits SMTP rate limits — **real users cannot sign up**. `/auth/register` is the only bootstrap path. | operator |
| **`pnpm db:seed` broken** | config cannot materialise | eng |
| **Store purchase UI not wired** | P10 walkthrough cannot finish | eng |
| **Botho automation unlocks config-only** | the 300/500 ladder advertises a reward nothing grants | eng (`docs/34 §1.2`) |
| **Stub payment provider** | real top-ups impossible | eng + PSP (B2) |
| **B1 legal sign-off** | blocks all of v1.1 | Princess + lawyer |
| **B2 PSP vs self-custody** | blocks v1.1; touches wallet schema | Princess |
| **H2 rate limit** / missing `trust proxy` | single-instance only | eng |
| **M1 `AdminGuard` ≡ `DevGuard`** | no genuine admin-only surface | eng |
| **Webhook route behind `AuthGuard`** | documented public, actually needs a bearer token | eng |

---

## 8. Rollback

| Scenario | Action |
|---|---|
| A migration fails mid-push | The whole migration is transactional — a failure rolls it back and records nothing. Fix the SQL, re-push. Verify with `migration list --linked`. |
| A balance corruption is detected | **Do not auto-fix.** `validateGameState()` + `planRecovery()` names the action; apply it deliberately and log to the ledger. |
| A bad config value ships | Re-seed from `game-config` (idempotent). The gate re-verifies. |
| Payments misbehave | Revert `PaymentsModule` to the stub **in a non-production env only** — it throws at boot in production by design. |

> **Never** roll back by editing `player_wallets` directly. Every correction is a ledgered `WalletService` operation, or a named recovery action. An unkelgered balance edit destroys the audit trail the whole model rests on.

---

## 9. The one-line summary

**Verify 49 migrations live → seed idempotently → gate PASS → reconcile → assert in production config → sign off P0–P10.** v1 ships closed-loop and earning; v1.1 waits on B1 + B2 and can slip without delaying the product.

*End of `18`. End of the MVP Development Document Set.*
