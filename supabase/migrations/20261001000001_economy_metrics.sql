-- ============================================================================
-- Economy analysis: history table + SQL views (§5 "Analyze economy health")
--
-- The NestJS `EconomyService` recomputes these metrics in-process so they are
-- testable without a live database; these views exist so a BI/dashboard tool
-- can read the same numbers straight from Postgres, and so the definitions live
-- next to the data rather than in a dashboard's ad-hoc SQL.
--
--   economy_price_snapshots   - daily price history, the source of inflation
--   economy_currency_supply   - total money in circulation (Pula + Botho)
--   economy_wealth_distribution - percentile bands + Gini coefficient
--   economy_transaction_velocity - count/volume per ledger entry per day
--   economy_item_price_drift    - live price vs catalogue baseline
--   economy_crop_supply         - over/under-supply flags for crops & products
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. economy_price_snapshots — one row per item per snapshot.
--    `avg_price` is the item's price at snapshot time. It is named `avg` (not
--    `price`) so a later basket rollup can share the column; with a unique
--    item_type in market_prices the average of one sample is the sample.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.economy_price_snapshots (
  item_type    TEXT           NOT NULL,
  avg_price    NUMERIC(12,4)  NOT NULL,
  snapshot_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_type, snapshot_at)
);

CREATE INDEX IF NOT EXISTS idx_economy_price_snapshots_at
  ON public.economy_price_snapshots (snapshot_at DESC);

ALTER TABLE public.economy_price_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "economy_snapshots_admin_read" ON public.economy_price_snapshots;
CREATE POLICY "economy_snapshots_admin_read" ON public.economy_price_snapshots
  FOR SELECT USING (public.is_admin(auth.uid()));

-- The argument is load-bearing: `public.is_admin` is declared as
-- is_admin(user_id uuid) in 20260902000015_admin_role.sql, and has no zero-arg
-- overload. Calling it bare (`is_admin()`) is a 42883 at CREATE POLICY time,
-- which aborts the whole transaction and leaves this migration unapplied.

-- ----------------------------------------------------------------------------
-- 2. economy_snapshot_prices() — append today's prices, prune the old.
--    Called by the simulation's daily roll (and directly for testing). SECURITY
--    DEFINER because players can never write this table.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.economy_snapshot_prices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n INTEGER;
BEGIN
  INSERT INTO public.economy_price_snapshots (item_type, avg_price, snapshot_at)
  SELECT mp.item_type, mp.current_price, NOW()
  FROM public.market_prices mp;

  GET DIAGNOSTICS n = ROW_COUNT;

  DELETE FROM public.economy_price_snapshots
  WHERE snapshot_at < NOW() - INTERVAL '90 days';

  RETURN n;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. economy_currency_supply — the money-supply number.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.economy_currency_supply AS
SELECT
  COALESCE(SUM(w.pula_balance), 0)  AS total_pula,
  COALESCE(SUM(w.botho_points), 0)  AS total_botho,
  COUNT(*)                          AS wallet_count,
  MAX(w.updated_at)                 AS last_movement_at
FROM public.player_wallets w;

-- ----------------------------------------------------------------------------
-- 4. economy_wealth_distribution — percentile bands + Gini.
--
--    Gini over a sample (empirical definition):
--      2 * SUM(x_i * i) / (n * SUM(x_i)) - (n + 1) / n   for x sorted ascending
--    0 = perfect equality, 1 = one holder owns everything.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.economy_wealth_distribution AS
WITH ordered AS (
  SELECT
    w.pula_balance::NUMERIC AS x,
    ROW_NUMBER() OVER (ORDER BY w.pula_balance) AS i,
    COUNT(*)         OVER () AS n,
    SUM(w.pula_balance) OVER () AS total
  FROM public.player_wallets w
)
SELECT
  COUNT(*)::INT                                        AS wallet_count,
  COALESCE(MAX(total), 0)::NUMERIC                     AS total_pula,
  COALESCE(AVG(x), 0)::NUMERIC                         AS mean_pula,
  COALESCE(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY x), 0)::NUMERIC AS p25,
  COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY x), 0)::NUMERIC AS p50,
  COALESCE(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY x), 0)::NUMERIC AS p75,
  COALESCE(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY x), 0)::NUMERIC AS p90,
  COALESCE(MAX(x), 0)::NUMERIC                         AS max_pula,
  CASE
    WHEN COUNT(*) <= 1 OR COALESCE(MAX(total), 0) = 0 THEN 0
    ELSE GREATEST(
      0,
      LEAST(
        1,
        (2 * SUM(x * i)::NUMERIC / (MAX(n) * MAX(total))) - ((MAX(n) + 1)::NUMERIC / MAX(n))
      )
    )
  END::NUMERIC                                         AS gini
FROM ordered;

-- ----------------------------------------------------------------------------
-- 5. economy_transaction_velocity — movement per calendar day.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.economy_transaction_velocity AS
SELECT
  DATE_TRUNC('day', l.created_at)::DATE           AS day,
  l.currency,
  COUNT(*)                                        AS transaction_count,
  SUM(l.amount)                                   AS net_amount,
  SUM(ABS(l.amount))                              AS volume,
  COUNT(DISTINCT l.player_id)                     AS active_players
FROM public.ledger_entries l
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- ----------------------------------------------------------------------------
-- 6. economy_item_price_drift — live price vs catalogue baseline.
--    `drift` = (current - base) / base. Positive = inflation on that item.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.economy_item_price_drift AS
SELECT
  mp.item_type,
  mp.item_name,
  mp.category,
  mp.base_price,
  mp.current_price,
  CASE
    WHEN mp.base_price = 0 THEN 0
    ELSE ((mp.current_price - mp.base_price)::NUMERIC / mp.base_price)
  END                                              AS drift,
  mp.supply,
  mp.demand,
  CASE
    WHEN mp.demand = 0 AND mp.supply > 0 THEN 'oversupplied'
    WHEN mp.demand = 0 THEN 'balanced'
    WHEN (mp.supply::NUMERIC / mp.demand) > 1.5 THEN 'oversupplied'
    WHEN (mp.supply::NUMERIC / mp.demand) < 0.67 THEN 'undersupplied'
    ELSE 'balanced'
  END                                              AS supply_state
FROM public.market_prices mp;

-- ----------------------------------------------------------------------------
-- 7. economy_crop_supply — only the crops and products, for the flags panel.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.economy_crop_supply AS
SELECT
  item_type, supply, demand, supply_state, current_price, base_price, drift
FROM public.economy_item_price_drift
WHERE category IN ('crop', 'product');

COMMIT;

