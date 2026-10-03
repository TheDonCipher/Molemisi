-- ============================================================================
-- M8 — Constrain the retired game_ledger_entries table, and document the six
--       call sites that write to it with columns that do not exist
--
-- BACKGROUND
--   game_ledger_entries (20260902000000) is the ORIGINAL farm-scoped audit
--   table. Its real columns are:
--       farm_id UUID NOT NULL REFERENCES farms(id)
--       entry_type VARCHAR(30) NOT NULL
--       currency_change INTEGER NOT NULL DEFAULT 0
--       currency_balance_after INTEGER NOT NULL
--       item_type, item_quantity_change, item_quality, reference_type,
--       reference_id, description, metadata, created_at
--
--   It was superseded by player_wallets + ledger_entries (20260908000016), where
--   wallet_apply() is the single writer of any balance movement. Services were
--   progressively migrated and now carry comments like "Ledger row is written by
--   wallet_apply(); game_ledger_entries is retired" (buildings.service.ts:244,
--   livestock.service.ts:158, payments.service.ts:469). The table was kept
--   rather than dropped because it still holds historical rows and because
--   dropping it is a destructive act requiring sign-off — see the memory note of
--   2026-09-07: "Decision needed: keep as audit log, or drop."
--
--   This migration does NOT drop it and does NOT delete a single row.
--
-- THE SIX BROKEN CALL SITES
--   Six call sites in apps/api still write or read this table using column names
--   from the RETIRED schema. Every one fails at runtime with PostgREST error 42703
--   (undefined_column) — or PGRST204 — and, because the services `await` the
--   insert and ignore `error`, the failure is SILENT: the admin action appears to
--   succeed while no audit row exists, and the ledger query returns null.
--
--   1. admin.service.ts:33  getPlayerOverview
--        .select('entry_type, amount_change, description, created_at')
--        .eq('player_id', playerId)
--      -> `amount_change` and `player_id` DO NOT EXIST. The real columns are
--         `currency_change` and `farm_id`.
--
--   2. admin.service.ts:118 getBalanceHistory
--        .select('entry_type, amount_change, description, created_at')
--        .eq('player_id', playerId)
--      -> same two phantom columns. The running-balance arithmetic below it
--         then reads `e.amount_change`, so the whole chart is null.
--
--   3. admin.service.ts:185 banPlayer
--        .insert({ player_id, entry_type: 'ADMIN_BAN', amount_change: 0,
--                  description, reference_type })
--      -> `player_id` and `amount_change` do not exist, AND `farm_id` is NOT NULL
--         with no default, so even with the names corrected the insert would fail
--         23502 without a farm lookup.
--
--   4. admin.service.ts:218 unbanPlayer
--        .insert({ player_id, entry_type: 'ADMIN_UNBAN', amount_change: 0, ... })
--      -> identical failure to (3).
--
--   5. admin.service.ts:261 warnPlayer
--        .insert({ player_id, entry_type: 'ADMIN_WARNING', amount_change: 0, ... })
--      -> identical failure to (3).
--
--   6. livestock.service.ts:442 collectProduct
--        .insert({ user_id, entry_type: 'COLLECT', item_type, quantity,
--                  currency_change: 0, description })
--      -> `user_id` and `quantity` do not exist. The real columns are `farm_id`
--         and `item_quantity_change`. Note this one is the only call site that
--         names `currency_change` correctly — it is the vestige of the older,
--         correct shape, which is how the mismatch is easy to miss on review.
--
--   WHY THE CODE IS NOT FIXED HERE
--   These are TypeScript changes in apps/api, outside the scope of a migration
--   agent, and the correct fix differs per site: the admin services need a farm
--   lookup (or should be repointed at ledger_entries), and the livestock one
--   needs farm_id resolved from the animal's farm. Writing the application fix
--   here would mean shipping a migration that silently depends on an unreviewed
--   code change. What this migration does instead is make the schema state the
--   truth — and, critically, make the failure LOUD rather than silent.
--
-- WHAT THIS MIGRATION CHANGES
--   §1 adds NOT NULL-safe, additive constraints that reject the specific shapes
--      of garbage the retired table accumulated, without touching existing rows
--      (§1 constraints are added NOT VALID for the same reason as M3).
--   §2 adds a trigger that raises on any future insert which does not name a
--      resolvable farm — converting the silent admin-action-with-no-audit-row
--      failure into a loud, attributable error.
--   §3 records the six call sites as a table COMMENT, so the next person to open
--      this table in an IDE sees them without having to audit the services.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Data-quality constraints on the retired table.
--
--    These are all NOT VALID so this migration applies on a database with
--    historical rows I could not inspect. They are enforced on every new and
--    updated row from now on, and §1b tries to promote them.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_name TEXT;
  v_expr TEXT;
BEGIN
  FOR v_name, v_expr IN
    SELECT * FROM (VALUES
      -- `currency_balance_after INTEGER NOT NULL` is the field the admin
      -- services were trying to reconstruct by walking entries backwards. A
      -- negative value there is meaningless: no balance in this codebase is
      -- legitimately negative, and a negative "balance after" silently poisons
      -- every running-total computation that reads it.
      ('game_ledger_entries_balance_after_non_negative',
       'currency_balance_after >= 0'),
      -- entry_type is the one column the six call sites DO agree on, and it is
      -- the discriminator that makes this table queryable at all. An empty or
      -- whitespace-only entry_type produces a row that belongs to no category.
      -- Written as length(...) > 0 rather than `<> ''` so the constraint carries
      -- no embedded single-quote literal into the dynamic EXECUTE below.
      ('game_ledger_entries_entry_type_not_blank',
       'length(btrim(entry_type)) > 0')
    ) AS t(cname, expr)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.game_ledger_entries'::regclass
        AND conname  = v_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.game_ledger_entries
           ADD CONSTRAINT %I CHECK (%s) NOT VALID', v_name, v_expr);
      RAISE NOTICE 'M8: added %.', v_name;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 1b. Try to validate; warn loudly if legacy rows disagree.
--
--    Unlike M3, a violation here is EXPECTED and is itself the evidence for the
--    six broken call sites: a row whose entry_type is blank, or whose
--    currency_balance_after is negative, is a symptom of the phantom-column
--    writes. The counts are reported rather than raised so the migration lands
--    and the operator gets a number to reconcile.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_bad BIGINT;
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE public.game_ledger_entries
             VALIDATE CONSTRAINT game_ledger_entries_entry_type_not_blank';
    RAISE NOTICE 'M8: entry_type_not_blank validated — no malformed legacy rows.';
  EXCEPTION WHEN check_violation THEN
    SELECT COUNT(*) INTO v_bad FROM public.game_ledger_entries
      WHERE btrim(entry_type) = '';
    RAISE WARNING
      'M8: game_ledger_entries has % row(s) with a blank entry_type — evidence of '
      'the broken call sites documented below. Constraint is active for new rows.',
      v_bad;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.game_ledger_entries
             VALIDATE CONSTRAINT game_ledger_entries_balance_after_non_negative';
    RAISE NOTICE 'M8: balance_after_non_negative validated.';
  EXCEPTION WHEN check_violation THEN
    SELECT COUNT(*) INTO v_bad FROM public.game_ledger_entries
      WHERE currency_balance_after < 0;
    RAISE WARNING
      'M8: game_ledger_entries has % row(s) with a negative '
      'currency_balance_after. Constraint is active for new rows.', v_bad;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Make the silent failure loud.
--
--    A trigger that raises whenever a game_ledger_entries insert cannot be
--    attributed to a farm. In practice farm_id is NOT NULL, so this can only
--    fire for a caller that bypassed the NOT NULL (a future migration making it
--    nullable, or a superuser insert). It is included because the *reason* the
--    six call sites fail silently is structural: the services `await` the insert
--    and discard `error`, so a schema rejection never reaches the log.
--
--    The alternative — turning every service-level insert into a checked write —
--    is an application fix and belongs with the services. What belongs here is a
--    database-side tripwire that says "an unattributable audit row is being
--    attempted", which is the invariant the table actually cares about.
--
--    The trigger name is namespaced (m8_) to make its origin obvious and to
--    avoid colliding with anything a future migration adds.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.m8_game_ledger_requires_farm()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    RAISE EXCEPTION
      'game_ledger_entries: farm_id is required — an audit row that cannot be '
      'attributed to a farm is not an audit row. (M8 tripwire. If you are '
      'calling from apps/api, the correct column is farm_id — NOT player_id or '
      'user_id, which do not exist on this table.)'
      USING ERRCODE = '23502';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS m8_game_ledger_requires_farm ON public.game_ledger_entries;
CREATE TRIGGER m8_game_ledger_requires_farm
  BEFORE INSERT ON public.game_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.m8_game_ledger_requires_farm();

COMMENT ON FUNCTION public.m8_game_ledger_requires_farm() IS
  'M8 — tripwire: refuses a game_ledger_entries insert with no farm_id. Exists '
  'because the six broken call sites in apps/api await their inserts and discard '
  '`error`, so schema rejections were silent.';

-- ----------------------------------------------------------------------------
-- 3. The six broken call sites, recorded where a developer will actually see
--    them — in the table tooltip in an IDE.
--
--    Column-name map, once, for the record:
--      player_id  -> farm_id              (all six sites are wrong)
--      user_id    -> farm_id              (livestock site)
--      amount_change -> currency_change
--      quantity   -> item_quantity_change
--    And note that even after renaming, all six still need farm_id RESOLVED from
--    a lookup, because farm_id is NOT NULL REFERENCES farms(id) with no default.
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.game_ledger_entries IS
  'M8 — RETIRED. Superseded by player_wallets + ledger_entries (20260908000016), '
  'where wallet_apply() is the only sanctioned writer of a balance movement. '
  'Retained for historical rows only; DO NOT write new balance rows here. '
  || 'Real columns: farm_id (NOT NULL), entry_type, currency_change, '
  || 'currency_balance_after (NOT NULL), item_type, item_quantity_change, '
  || 'item_quality, reference_type, reference_id, description, metadata. '
  || 'KNOWN-BROKEN call sites in apps/api, all failing silently (error discarded): '
  || '(1) admin.service.ts:33 getPlayerOverview — selects amount_change/player_id; '
  || '(2) admin.service.ts:118 getBalanceHistory — selects amount_change/player_id, '
  || 'so the running-balance chart is null; '
  || '(3) admin.service.ts:185 banPlayer — inserts player_id/amount_change, and '
  || 'omits NOT NULL farm_id; '
  || '(4) admin.service.ts:218 unbanPlayer — same as (3); '
  || '(5) admin.service.ts:261 warnPlayer — same as (3); '
  || '(6) livestock.service.ts:442 collectProduct — inserts user_id/quantity, '
  || 'which should be farm_id/item_quantity_change. '
  || 'Column map: player_id|user_id -> farm_id, amount_change -> currency_change, '
  || 'quantity -> item_quantity_change. All six additionally need farm_id resolved '
  || 'from a lookup before the insert can succeed. See '
  || '20261003000005_m8_game_ledger_constraints.sql for the full rationale.';

COMMIT;