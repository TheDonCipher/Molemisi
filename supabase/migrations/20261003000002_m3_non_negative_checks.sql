-- ============================================================================
-- M3 — Non-negative CHECKs on every balance/quantity column
--
-- THE FINDING
--   The codebase treats a negative balance as a bug everywhere it is written in
--   TypeScript, but almost none of the columns actually enforce it:
--
--     player_wallets.pula_balance NUMERIC(12,2) — NO CHECK. Only botho_points
--         (20260908000016) and madi_balance (20261001000003) are constrained.
--         Pula is the soft currency the Co-op tax and market sales move most, so
--         the unconstrained one is the worst one to leave open.
--     player_inventory.quantity INT — NO CHECK. The audit script reports
--         negative and zero rows here.
--     player_chapter_state.chapter_tokens INT — NO CHECK. Non-monetary cosmetic
--         stamps (MVP/02 §3.3).
--     market_prices.base_price / current_price INTEGER — NO CHECK. A negative
--         price makes a SELL credit negative Pula.
--     item_definitions.base_value_pula / max_stack INT — NO CHECK.
--     economy_price_snapshots.avg_price NUMERIC — NO CHECK.
--
--   Defence in depth exists in places: wallet_apply() raises when Botho would go
--   negative, WalletService.spend()/spendMadi() check before debiting, and the
--   anti-cheat validator (docs/09 NEGATIVE_CURRENCY) DETECTS negatives after the
--   fact. None of that is prevention. The application is the only thing between
--   a logic bug and a permanently broken balance that the repair validator then
--   zeroes out — which is itself inflationary, since SET_CURRENCY_ZERO destroys
--   the player's money rather than refunding it.
--
-- WHY EVERY CONSTRAINT IS ADDED `NOT VALID`
--   ADD CONSTRAINT ... CHECK takes ACCESS EXCLUSIVE and, when validating an
--   existing table, scans every row — and would FAIL the whole migration if even
--   one historical row is negative. Per the live audit, negative rows are exactly
--   what is suspected, so an un-guarded ADD could not be relied on to apply.
--
--   `NOT VALID` splits the two concerns:
--     - The constraint IS enforced immediately for all new and updated rows, so
--       the bug class that matters (a future debit going negative) is closed.
--     - Existing rows are neither scanned nor rejected.
--   §5 then attempts VALIDATE inside a DO block that catches its own failure and
--   downgrades it to a WARNING. This is deliberate: the migration must be
--   applicable on a database whose historical contents could not be inspected
--   (no DDL access was available). VALIDATE takes SHARE UPDATE EXCLUSIVE, so it
--   neither blocks reads nor writes, and if it succeeds the constraint becomes
--   fully trusted.
--
--   TRADE-OFF, stated plainly: a NOT VALID constraint is enforced but not used by
--   the planner for constraint exclusion. On these tables that buys nothing, since
--   none of the CHECKs sit on a partition or inheritance key.
--
-- NOT TOUCHED, AND WHY
--   ledger_entries.amount is legitimately signed (negative = debit); a
--   non-negative CHECK there would reject half the ledger. game_ledger_entries and
--   profiles.currency are RETIRED mirrors — see M8.
--
--   botho_points and madi_balance already carry equivalent CHECKs; they are
--   re-asserted only if missing, for idempotency against a partially applied
--   database. `ADD CONSTRAINT IF NOT EXISTS` is not valid syntax, so every add
--   is guarded on pg_constraint instead.
-- ============================================================================

BEGIN;
-- ----------------------------------------------------------------------------
-- 1. player_wallets — the money columns.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_table  TEXT;
  v_name   TEXT;
  v_expr   TEXT;
BEGIN
  FOR v_table, v_name, v_expr IN
    SELECT * FROM (VALUES
      ('player_wallets', 'player_wallets_pula_non_negative',  'pula_balance >= 0'),
      ('player_wallets', 'player_wallets_botho_non_negative',  'botho_points >= 0'),
      ('player_wallets', 'player_wallets_madi_non_negative',   'madi_balance >= 0')
    ) AS t(tbl, cname, expr)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', v_table)::regclass
        AND conname  = v_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
        v_table, v_name, v_expr);
      RAISE NOTICE 'M3: added %.%', v_name, v_table;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Inventory quantity. A negative count is never meaningful. Zero IS tolerated
--    on purpose: the service zeroes a stack rather than deleting the row.
--    Decrement only through inventory_take() (20261002000002), which is
--    conditional (`AND quantity >= p_qty`), so the DB arbitrates.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.player_inventory'::regclass
      AND conname  = 'player_inventory_quantity_non_negative'
  ) THEN
    ALTER TABLE public.player_inventory
      ADD CONSTRAINT player_inventory_quantity_non_negative
      CHECK (quantity >= 0) NOT VALID;
    RAISE NOTICE 'M3: added player_inventory.quantity non-negative.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Chapter Tokens — non-monetary cosmetic currency (MVP/02 §3.3).
--    spend_chapter_tokens() (20261003000020) already decrements conditionally;
--    this is the backstop for a future writer that forgets the predicate.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.player_chapter_state'::regclass
      AND conname  = 'player_chapter_state_tokens_non_negative'
  ) THEN
    ALTER TABLE public.player_chapter_state
      ADD CONSTRAINT player_chapter_state_tokens_non_negative
      CHECK (chapter_tokens >= 0) NOT VALID;
    RAISE NOTICE 'M3: added player_chapter_state.chapter_tokens non-negative.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Prices and item values.
--    market_prices.current_price is the amount a market SELL credits, so a
--    negative row there converts a legitimate sale into negative Pula.
--    base_price is the drift denominator in economy_item_price_drift (guarded
--    by a WHEN base_price = 0 branch, but negative is still nonsense).
--    item_definitions.base_value_pula is the valuation floor for every item.
--    economy_price_snapshots.avg_price is simulator INPUT — negative prices
--    would corrupt every inflation metric derived from the snapshot history.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_table TEXT;
  v_name  TEXT;
  v_expr  TEXT;
BEGIN
  FOR v_table, v_name, v_expr IN
    SELECT * FROM (VALUES
      ('market_prices', 'market_prices_base_price_non_negative',
        'base_price >= 0'),
      ('market_prices', 'market_prices_current_price_non_negative',
        'current_price >= 0'),
      ('item_definitions', 'item_definitions_base_value_non_negative',
        'base_value_pula >= 0'),
      ('item_definitions', 'item_definitions_max_stack_positive',
        'max_stack >= 0'),
      ('economy_price_snapshots', 'economy_price_snapshots_avg_price_non_negative',
        'avg_price >= 0')
    ) AS t(tbl, cname, expr)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', v_table)::regclass
        AND conname  = v_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
        v_table, v_name, v_expr);
      RAISE NOTICE 'M3: added %.%', v_name, v_table;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Promote each constraint to VALID (fully trusted, historical rows scanned)
--    without ever failing the migration.
--
--    VALIDATE CONSTRAINT takes SHARE UPDATE EXCLUSIVE, which blocks neither
--    reads nor writes, so this is cheap to attempt at apply time. If the data is
--    clean the constraint becomes fully validated. If not, we emit a WARNING
--    naming the table and constraint rather than aborting: refusing to deploy an
--    integrity migration because of pre-existing bad data leaves the bug live,
--    which is strictly worse than shipping the constraint enforced-but-untrusted
--    and telling the operator exactly what to clean up.
--
--    The row count is computed with a per-constraint count query rather than by
--    parsing pg_get_constraintdef, because that returns the expression with
--    casts and parentheses that would need unwrapping before it could be reused
--    in a WHERE clause. Two explicit queries are cheaper and less fragile than a
--    generic one, and this block runs exactly once per apply.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_bad BIGINT;
BEGIN
  -- player_wallets.pula_balance
  BEGIN
    EXECUTE 'ALTER TABLE public.player_wallets
             VALIDATE CONSTRAINT player_wallets_pula_non_negative';
    RAISE NOTICE 'M3: player_wallets_pula_non_negative validated.';
  EXCEPTION WHEN check_violation THEN
    SELECT COUNT(*) INTO v_bad FROM public.player_wallets WHERE pula_balance < 0;
    RAISE WARNING
      'M3: player_wallets.pula_balance has % pre-existing NEGATIVE row(s). The '
      'CHECK is active for all new/updated rows; clean the legacy rows and '
      're-run VALIDATE to make it fully trusted.', v_bad;
  END;

  -- player_inventory.quantity
  BEGIN
    EXECUTE 'ALTER TABLE public.player_inventory
             VALIDATE CONSTRAINT player_inventory_quantity_non_negative';
    RAISE NOTICE 'M3: player_inventory_quantity_non_negative validated.';
  EXCEPTION WHEN check_violation THEN
    SELECT COUNT(*) INTO v_bad FROM public.player_inventory WHERE quantity < 0;
    RAISE WARNING
      'M3: player_inventory.quantity has % pre-existing NEGATIVE row(s). The '
      'CHECK is active for all new/updated rows.', v_bad;
  END;

  -- player_chapter_state.chapter_tokens
  BEGIN
    EXECUTE 'ALTER TABLE public.player_chapter_state
             VALIDATE CONSTRAINT player_chapter_state_tokens_non_negative';
    RAISE NOTICE 'M3: player_chapter_state_tokens_non_negative validated.';
  EXCEPTION WHEN check_violation THEN
    SELECT COUNT(*) INTO v_bad
      FROM public.player_chapter_state WHERE chapter_tokens < 0;
    RAISE WARNING
      'M3: player_chapter_state.chapter_tokens has % pre-existing NEGATIVE '
      'row(s). The CHECK is active for all new/updated rows.', v_bad;
  END;

  -- market_prices (both price columns, counted together — one scan)
  BEGIN
    EXECUTE 'ALTER TABLE public.market_prices
             VALIDATE CONSTRAINT market_prices_current_price_non_negative';
    EXECUTE 'ALTER TABLE public.market_prices
             VALIDATE CONSTRAINT market_prices_base_price_non_negative';
    RAISE NOTICE 'M3: market_prices price CHECKs validated.';
  EXCEPTION WHEN check_violation THEN
    SELECT COUNT(*) INTO v_bad FROM public.market_prices
      WHERE current_price < 0 OR base_price < 0;
    RAISE WARNING
      'M3: market_prices has % pre-existing row(s) with a negative price. The '
      'CHECKs are active for all new/updated rows.', v_bad;
  END;

  -- item_definitions
  BEGIN
    EXECUTE 'ALTER TABLE public.item_definitions
             VALIDATE CONSTRAINT item_definitions_base_value_non_negative';
    EXECUTE 'ALTER TABLE public.item_definitions
             VALIDATE CONSTRAINT item_definitions_max_stack_positive';
    RAISE NOTICE 'M3: item_definitions CHECKs validated.';
  EXCEPTION WHEN check_violation THEN
    SELECT COUNT(*) INTO v_bad FROM public.item_definitions
      WHERE base_value_pula < 0 OR max_stack < 0;
    RAISE WARNING
      'M3: item_definitions has % pre-existing row(s) with a negative value or '
      'max_stack. The CHECKs are active for all new/updated rows.', v_bad;
  END;

  -- economy_price_snapshots
  BEGIN
    EXECUTE 'ALTER TABLE public.economy_price_snapshots
             VALIDATE CONSTRAINT economy_price_snapshots_avg_price_non_negative';
    RAISE NOTICE 'M3: economy_price_snapshots_avg_price_non_negative validated.';
  EXCEPTION WHEN check_violation THEN
    SELECT COUNT(*) INTO v_bad
      FROM public.economy_price_snapshots WHERE avg_price < 0;
    RAISE WARNING
      'M3: economy_price_snapshots.avg_price has % pre-existing NEGATIVE '
      'row(s). The CHECK is active for all new/updated rows.', v_bad;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Document the invariants next to the columns, so the next person who asks
--    "can this go negative?" does not have to grep the migration history.
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.player_wallets.pula_balance IS
  'M3 — CHECK (pula_balance >= 0) as of 2026-10-03. NUMERIC(12,2), not INT: the '
  'Co-op tax produces fractional Pula (20260908000016 header). A negative value '
  'is a bug; the anti-cheat validator zeroes such rows (docs/09 NEGATIVE_CURRENCY), '
  'which destroys rather than refunds the player''s money.';

COMMENT ON COLUMN public.player_inventory.quantity IS
  'M3 — CHECK (quantity >= 0) as of 2026-10-03. Zero is allowed on purpose: the '
  'service zeroes a stack rather than deleting the row. Decrement only through '
  'inventory_take() (20261002000002), which is conditional.';

COMMENT ON COLUMN public.player_chapter_state.chapter_tokens IS
  'M3 — CHECK (chapter_tokens >= 0) as of 2026-10-03. Non-monetary cosmetic '
  'currency (MVP/02 §3.3): never convertible to Madi, never withdrawable. '
  'Spend only through spend_chapter_tokens() (20261003000020).';

COMMENT ON COLUMN public.market_prices.current_price IS
  'M3 — CHECK (current_price >= 0) as of 2026-10-03. This is the amount a market '
  'SELL credits, so a negative row here turns a legitimate sale into negative '
  'Pula. Driven by the dynamic-pricing tick, not by clients.';

COMMENT ON COLUMN public.economy_price_snapshots.avg_price IS
  'M3 — CHECK (avg_price >= 0) as of 2026-10-03. Snapshot history is an input to '
  'the economy simulator; negative prices would corrupt every inflation metric '
  'derived from it.';

COMMIT;