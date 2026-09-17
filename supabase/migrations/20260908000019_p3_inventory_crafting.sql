-- ============================================
-- P3 — Inventory, storage tiers, crafting
-- tables + idempotent seed (per docs/MVP/05 §P3)
--
-- The canonical item store is `player_inventory`, keyed by the auth user (the
-- same key as `player_wallets`). The pre-existing `public.inventory` table is
-- intentionally RETAINED for the deferred producers (bushveld, livestock,
-- contracts) which are cut over in their own phases — the same incremental
-- discipline used for the wallet mirror in P2. Nothing in P3 writes it.
-- ============================================

-- ---------------------------------------------------------------- item_definitions
CREATE TABLE IF NOT EXISTS public.item_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  setswana TEXT NOT NULL,
  category TEXT NOT NULL,
  base_value_pula INT NOT NULL,
  max_stack INT NOT NULL DEFAULT 99,
  is_tool BOOLEAN NOT NULL DEFAULT FALSE,
  use_text TEXT NOT NULL DEFAULT '',
  sprite TEXT NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------- storage_tiers
CREATE TABLE IF NOT EXISTS public.storage_tiers (
  tier INT PRIMARY KEY,
  name TEXT NOT NULL,
  setswana TEXT NOT NULL,
  slot_cap INT NOT NULL,
  listing_slots INT NOT NULL,
  upgrade_cost_pula INT
);

-- ---------------------------------------------------------------- crafting_recipes
CREATE TABLE IF NOT EXISTS public.crafting_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  setswana TEXT NOT NULL,
  output_item_id UUID REFERENCES public.item_definitions(id),
  output_qty INT NOT NULL DEFAULT 1,
  inputs JSONB NOT NULL,
  fee_pula INT NOT NULL,
  duration_minutes INT NOT NULL,
  unlock_condition JSONB
);

-- ---------------------------------------------------------------- player_inventory
CREATE TABLE IF NOT EXISTS public.player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_def_id UUID NOT NULL REFERENCES public.item_definitions(id),
  quantity INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, item_def_id)
);

-- ---------------------------------------------------------------- crafting_jobs
CREATE TABLE IF NOT EXISTS public.crafting_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.crafting_recipes(id),
  slot_index INT NOT NULL,
  qty INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collected_at TIMESTAMPTZ
);

-- ============================================
-- SEED — idempotent (re-runnable, no drift on second run)
-- ============================================

-- storage_tiers (D9 / 02 §6.5)
INSERT INTO public.storage_tiers (tier, name, setswana, slot_cap, listing_slots, upgrade_cost_pula) VALUES
  (1, 'Storage Basket', 'Seroto', 24, 5, NULL),
  (2, 'Storage Shed', 'Shedi', 48, 10, 1200),
  (3, 'Storehouse', 'Ntlo ya Polokelo', 96, 20, 6000)
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  setswana = EXCLUDED.setswana,
  slot_cap = EXCLUDED.slot_cap,
  listing_slots = EXCLUDED.listing_slots,
  upgrade_cost_pula = EXCLUDED.upgrade_cost_pula;

-- item_definitions (02 §6.2). `use_text` is the one-line "what is it FOR"
-- required by 03 §2.1. Tools are equipment (F15) — is_tool = true, max_stack 1.
INSERT INTO public.item_definitions (slug, name, setswana, category, base_value_pula, max_stack, is_tool, use_text, sprite) VALUES
  -- Crops (DIJALO, stack 50)
  ('sorghum','Sorghum','Mabele','DIJALO',3,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/sorghum.png'),
  ('millet','Millet','Lebelebele','DIJALO',4,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/millet.png'),
  ('maize','Maize','Mmidi','DIJALO',5,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/maize.png'),
  ('cowpeas','Cowpeas','Dinawa','DIJALO',6,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/cowpeas.png'),
  ('tomatoes','Tomatoes','Tamati','DIJALO',10,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/tomatoes.png'),
  ('watermelon','Watermelon','Legapu','DIJALO',11,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/watermelon.png'),
  ('groundnuts','Groundnuts','Manoko','DIJALO',11,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/groundnuts.png'),
  ('sesame','Sesame','Sesame','DIJALO',15,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/sesame.png'),
  ('pepper','Pepper','Pepere','DIJALO',17,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/pepper.png'),
  ('herbs','Herbs','Ditlhare tsa Setso','DIJALO',25,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/herbs.png'),
  ('morula','Morula','Morula','DIJALO',46,50,false,'Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it.','ui/items/morula.png'),
  -- Seeds (DIPEO, stack 99; base value = the crop's seed cost)
  ('sorghum_seed','Sorghum Seed','Peo ya Mabele','DIPEO',2,99,false,'Go jala. For planting.','ui/items/sorghum_seed.png'),
  ('millet_seed','Millet Seed','Peo ya Lebelebele','DIPEO',2,99,false,'Go jala. For planting.','ui/items/millet_seed.png'),
  ('maize_seed','Maize Seed','Peo ya Mmidi','DIPEO',3,99,false,'Go jala. For planting.','ui/items/maize_seed.png'),
  ('cowpeas_seed','Cowpeas Seed','Peo ya Dinawa','DIPEO',3,99,false,'Go jala. For planting.','ui/items/cowpeas_seed.png'),
  ('tomatoes_seed','Tomatoes Seed','Peo ya Tamati','DIPEO',5,99,false,'Go jala. For planting.','ui/items/tomatoes_seed.png'),
  ('watermelon_seed','Watermelon Seed','Peo ya Legapu','DIPEO',6,99,false,'Go jala. For planting.','ui/items/watermelon_seed.png'),
  ('groundnuts_seed','Groundnuts Seed','Peo ya Manoko','DIPEO',8,99,false,'Go jala. For planting.','ui/items/groundnuts_seed.png'),
  ('sesame_seed','Sesame Seed','Peo ya Sesame','DIPEO',10,99,false,'Go jala. For planting.','ui/items/sesame_seed.png'),
  ('pepper_seed','Pepper Seed','Peo ya Pepere','DIPEO',12,99,false,'Go jala. For planting.','ui/items/pepper_seed.png'),
  ('herbs_seed','Herbs Seed','Peo ya Ditlhare tsa Setso','DIPEO',16,99,false,'Go jala. For planting.','ui/items/herbs_seed.png'),
  ('morula_seed','Morula Seed','Peo ya Morula','DIPEO',28,99,false,'Go jala. For planting.','ui/items/morula_seed.png'),
  -- Livestock products (DIPHOLOGOLO, stack 30)
  ('eggs','Eggs','Mae','DIPHOLOGOLO',3,30,false,'Go rekisa kgotsa go baka. Sell, or bake into bread.','ui/items/eggs.png'),
  ('milk','Milk','Mashi','DIPHOLOGOLO',5,30,false,'Go rekisa. Sell at the Co-op.','ui/items/milk.png'),
  ('manure','Manure','Manyoro','DIPHOLOGOLO',1,30,false,'Go nontsha tshimo. Enriches the soil.','ui/items/manure.png'),
  -- Bushveld materials (DITSHIMOLOGO TSA NAGENG, stack 50)
  ('wood','Wood','Dikgong','DITSHIMOLOGO TSA NAGENG',2,50,false,'Go dira Poleto. For planks.','ui/items/wood.png'),
  ('stone','Stone','Matlapa','DITSHIMOLOGO TSA NAGENG',3,50,false,'Go dira Setena. For bricks — two clay, or clay and stone (F8).','ui/items/stone.png'),
  ('clay','Clay','Letsopa','DITSHIMOLOGO TSA NAGENG',3,50,false,'Go dira Setena. For bricks.','ui/items/clay.png'),
  ('palm_fiber','Palm Fiber','Mokolwane','DITSHIMOLOGO TSA NAGENG',4,50,false,'Go dira Thapo. For rope.','ui/items/palm_fiber.png'),
  ('thatch','Thatch / Reeds','Lotlhaka','DITSHIMOLOGO TSA NAGENG',3,50,false,'Go tlhabolola matlo. For re-ratching roofs.','ui/items/thatch.png'),
  ('phane','Mophane Worms','Phane','DITSHIMOLOGO TSA NAGENG',10,50,false,'Go rekisa. A seasonal delicacy.','ui/items/phane.png'),
  -- Crafted (DITSALO, stack 99)
  ('poleto','Plank','Poleto','DITSALO',7,99,false,'Go aga. Building material.','ui/items/poleto.png'),
  ('thapo','Rope','Thapo','DITSALO',18,99,false,'Go aga le go baakanya. Building and kraal repair.','ui/items/thapo.png'),
  ('setena','Brick','Setena','DITSALO',11,99,false,'Go aga. Building material (R2 — Setena, not Setene).','ui/items/setena.png'),
  -- Processed (DIKUNO, stack 20)
  ('bupi','Flour','Bupi','DIKUNO',20,20,false,'Go baka Borotho. For bread.','ui/items/bupi.png'),
  ('borotho','Bread','Borotho','DIKUNO',60,20,false,'Go rekisa. The most valuable thing you can make.','ui/items/borotho.png'),
  -- Tools / equipment (DIDIRISIWA, stack 1, never occupy a storage slot — F15)
  ('mogoma','Hoe','Mogoma','DIDIRISIWA',0,1,true,'Go lema. For working the soil.','ui/items/mogoma.png'),
  ('selepe','Axe','Selepe','DIDIRISIWA',0,1,true,'Go rema. For cutting wood.','ui/items/selepe.png'),
  ('watering_can','Watering Can','Nkgo ya Metsi','DIDIRISIWA',0,1,true,'Go nosetsa. For watering crops.','ui/items/watering_can.png'),
  ('pickaxe','Pickaxe','Piki','DIDIRISIWA',0,1,true,'Go epa. For breaking stone.','ui/items/pickaxe.png')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  setswana = EXCLUDED.setswana,
  category = EXCLUDED.category,
  base_value_pula = EXCLUDED.base_value_pula,
  max_stack = EXCLUDED.max_stack,
  is_tool = EXCLUDED.is_tool,
  use_text = EXCLUDED.use_text,
  sprite = EXCLUDED.sprite;

-- crafting_recipes (02 §6.3). output_item_id resolved by slug so this stays
-- correct even though item_definitions ids are random. Substitution groups are
-- stored verbatim as the InputGroup JSON the service already understands.
INSERT INTO public.crafting_recipes (slug, name, setswana, output_item_id, output_qty, inputs, fee_pula, duration_minutes, unlock_condition) VALUES
  ('poleto','Plank','Poleto',(SELECT id FROM public.item_definitions WHERE slug='poleto'),1,
    '[{"anyOf":["wood"],"qty":2}]'::jsonb, 1, 120, NULL),
  ('thapo','Rope','Thapo',(SELECT id FROM public.item_definitions WHERE slug='thapo'),1,
    '[{"anyOf":["palm_fiber"],"qty":3}]'::jsonb, 1, 120, NULL),
  ('setena','Brick','Setena',(SELECT id FROM public.item_definitions WHERE slug='setena'),1,
    '[{"anyOf":["clay","stone"],"qty":2}]'::jsonb, 2, 180, NULL),
  ('bupi','Flour','Bupi',(SELECT id FROM public.item_definitions WHERE slug='bupi'),1,
    '[{"anyOf":["sorghum","millet"],"qty":4}]'::jsonb, 2, 240, '{"bothoGte":100}'::jsonb),
  ('borotho','Bread','Borotho',(SELECT id FROM public.item_definitions WHERE slug='borotho'),1,
    '[{"anyOf":["bupi"],"qty":2}]'::jsonb, 3, 360, '{"bothoGte":100}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  setswana = EXCLUDED.setswana,
  output_item_id = EXCLUDED.output_item_id,
  output_qty = EXCLUDED.output_qty,
  inputs = EXCLUDED.inputs,
  fee_pula = EXCLUDED.fee_pula,
  duration_minutes = EXCLUDED.duration_minutes,
  unlock_condition = EXCLUDED.unlock_condition;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_player_inventory_player ON public.player_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_def ON public.player_inventory(item_def_id);
CREATE INDEX IF NOT EXISTS idx_crafting_jobs_player ON public.crafting_jobs(player_id);
CREATE INDEX IF NOT EXISTS idx_crafting_jobs_active ON public.crafting_jobs(player_id, slot_index) WHERE collected_at IS NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- Catalogs are public read; personal tables are owner-scoped. The server uses
-- the admin client (bypasses RLS) for all writes, so this is defence-in-depth.
-- ============================================
ALTER TABLE public.item_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crafting_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crafting_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalogs_read" ON public.item_definitions;
CREATE POLICY "catalogs_read" ON public.item_definitions FOR SELECT USING (true);
DROP POLICY IF EXISTS "catalogs_read" ON public.storage_tiers;
CREATE POLICY "catalogs_read" ON public.storage_tiers FOR SELECT USING (true);
DROP POLICY IF EXISTS "catalogs_read" ON public.crafting_recipes;
CREATE POLICY "catalogs_read" ON public.crafting_recipes FOR SELECT USING (true);

DROP POLICY IF EXISTS "owner_read_inventory" ON public.player_inventory;
CREATE POLICY "owner_read_inventory" ON public.player_inventory FOR SELECT USING (player_id = auth.uid());
DROP POLICY IF EXISTS "owner_read_jobs" ON public.crafting_jobs;
CREATE POLICY "owner_read_jobs" ON public.crafting_jobs FOR SELECT USING (player_id = auth.uid());
