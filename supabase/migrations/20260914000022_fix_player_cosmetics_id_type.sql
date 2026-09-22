-- Corrective migration: player_cosmetics.cosmetic_id must be TEXT (a cosmetic
-- slug such as "cos_hut_moriti"), not UUID.
--
-- The P9 migration (20260909000120_p9_monetisation.sql) declares it TEXT, but the
-- table was created earlier with a UUID column and `CREATE TABLE IF NOT EXISTS`
-- skipped the redefinition, so the LIVE column drifted to UUID. That is why
-- POST /store/purchase fails with `invalid input syntax for type uuid:
-- "cos_hut_moriti"` — the code and the current migration agree it should be a
-- slug, but the deployed column disagrees.
--
-- This widens the column to TEXT. It is non-destructive: any existing UUID values
-- are cast to text, and the table is currently empty on production so nothing is
-- converted in practice. Re-run-safe (idempotent type change).
ALTER TABLE public.player_cosmetics
  ALTER COLUMN cosmetic_id TYPE TEXT USING cosmetic_id::TEXT;
