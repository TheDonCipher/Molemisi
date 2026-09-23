-- ============================================
-- 00031 — G8/G3/G2/G4: config single-sourcing + legacy livestock inventory cutover
-- ============================================
-- Companion to the game-config changes that deleted StorageTier.upgradeCostPula
-- and AnimalConfig.baseProductPrice, added the `truffle` item, and repointed
-- livestock collection + contracts at InventoryService (player_inventory).
-- Idempotent: safe to re-run.

-- -------------------------------------------- G8: storage upgrade costs
-- The cost is charged from BUILDINGS.storage.upgradeCosts (P2,500 / P12,000) by
-- buildings.service ('storage_upgrade'). The storage_tiers seed rows carried the
-- stale duplicate (P1,200 / P6,000); align the catalogue with the single source.
UPDATE public.storage_tiers SET upgrade_cost_pula = 2500  WHERE tier = 2;
UPDATE public.storage_tiers SET upgrade_cost_pula = 12000 WHERE tier = 3;

-- -------------------------------------------- G3: livestock product prices
-- ItemDef.baseValue is the price of record; AnimalConfig.baseProductPrice is
-- deleted from config. The animal prices (5/15/15/50) win — payback math was
-- tuned on them.
UPDATE public.item_definitions SET base_value_pula = 5  WHERE slug = 'eggs';
UPDATE public.item_definitions SET base_value_pula = 15 WHERE slug = 'milk';

-- -------------------------------------------- G2: the pig's truffle exists
INSERT INTO public.item_definitions
  (slug, name, setswana, category, base_value_pula, max_stack, is_tool, use_text, sprite)
VALUES
  ('truffle', 'Truffle', 'Truffle ya Naga', 'DIPHOLOGOLO', 50, 30, false,
   'Go rekisa. Sell at the Co-op — chefs pay well for it.', 'ui/items/product_truffle.png')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  setswana = EXCLUDED.setswana,
  category = EXCLUDED.category,
  base_value_pula = EXCLUDED.base_value_pula,
  max_stack = EXCLUDED.max_stack,
  is_tool = EXCLUDED.is_tool,
  use_text = EXCLUDED.use_text,
  sprite = EXCLUDED.sprite;

-- -------------------------------------------- G4: backfill legacy rows
-- Move livestock products out of the legacy farm-scoped `inventory` table into
-- player_inventory. goat_milk and cow_milk both merge into 'milk'; truffles
-- become real items. player_id is the farm's owner. The legacy table itself is
-- kept (drop deferred) but no longer holds livestock products.
WITH moved AS (
  SELECT
    f.user_id AS player_id,
    d.id      AS item_def_id,
    SUM(i.quantity) AS qty
  FROM public.inventory i
  JOIN public.farms f ON f.id = i.farm_id
  JOIN public.item_definitions d ON d.slug = CASE i.item_type
    WHEN 'egg'       THEN 'eggs'
    WHEN 'goat_milk' THEN 'milk'
    WHEN 'cow_milk'  THEN 'milk'
    WHEN 'truffle'   THEN 'truffle'
  END
  WHERE i.item_type IN ('egg', 'goat_milk', 'cow_milk', 'truffle')
  GROUP BY f.user_id, d.id
)
INSERT INTO public.player_inventory (player_id, item_def_id, quantity, updated_at)
SELECT player_id, item_def_id, qty, now() FROM moved
ON CONFLICT (player_id, item_def_id) DO UPDATE SET
  quantity = public.player_inventory.quantity + EXCLUDED.quantity,
  updated_at = now();

DELETE FROM public.inventory
WHERE item_type IN ('egg', 'goat_milk', 'cow_milk', 'truffle');
