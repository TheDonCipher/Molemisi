-- P10 cleanup — drop the two obsolete plant_crop_transaction overloads.
--
-- History: three CREATE OR REPLACE statements across 00001 / 00020 / 00040 each
-- landed a DISTINCT signature, so Postgres now holds three overloads:
--   1. (UUID, UUID, VARCHAR, UUID,     UUID)   -- 00001, legacy public.inventory (p_seed_id)  [OBSOLETE]
--   2. (UUID, UUID, VARCHAR, UUID)              -- 00020, pre-P4, no growth_hours               [OBSOLETE]
--   3. (UUID, UUID, VARCHAR, UUID,     NUMERIC) -- 00040, p_growth_hours — the LIVE form        [KEEP]
--
-- The API service calls overload #3 by NAMED argument (p_growth_hours), so removing
-- #1 and #2 is invisible to runtime and kills the latent ambiguity hazard noted in
-- the project handover. Idempotent via IF EXISTS. No CASCADE — if anything unexpected
-- still depends on these, the DROP fails loudly rather than cascading.
-- Ruling/date: 2026-09-16 (Princess authorized the live-DB schema cleanup).

DROP FUNCTION IF EXISTS public.plant_crop_transaction(UUID, UUID, VARCHAR, UUID, UUID);
DROP FUNCTION IF EXISTS public.plant_crop_transaction(UUID, UUID, VARCHAR, UUID);
