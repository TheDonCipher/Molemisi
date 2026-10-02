-- ============================================================
-- Kgotla Year-layer Charges (docs/37/38 I-2; 2026-10-02)
--
-- The Year layer of the Kgotla: twelve monthly Charges sourced from
-- `chargeYear.ts` (one per real calendar month, revealed by the Gaborone
-- date). This is the ONLY Pula-bearing Kgotla path; the daily ward errands
-- (KgotlaService.CHARGES) pay Botho + regard only.
--
-- One row per accepted Charge per farm per cycle (game year). The UNIQUE
-- (farm_id, charge_id, cycle) constraint IS the atomic-deduction guarantee of
-- I-2: a Charge may be claimed exactly once per cycle. `asks` is a JSONB
-- snapshot of the Charge's objectives so a multi-ask Charge (e.g. plank+rope)
-- is recorded faithfully and can never drift from chargeYear.ts.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kgotla_charges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id     UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  charge_id   TEXT NOT NULL,
  npc_id      VARCHAR(50) NOT NULL,
  asks        JSONB NOT NULL,
  status      VARCHAR(12) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','claimed')),
  cycle       TEXT NOT NULL,
  accepted_on DATE NOT NULL,
  claimed_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (farm_id, charge_id, cycle)
);

COMMENT ON TABLE public.kgotla_charges IS
  'docs/37/38 I-2 — the Year layer of the Kgotla. One accepted monthly Charge '
  'per farm per cycle; UNIQUE(farm_id, charge_id, cycle) enforces one claim per cycle.';

-- The reveal/turn-in read path: "what is this farm''s Year Charge this cycle?"
CREATE INDEX IF NOT EXISTS idx_kgotla_charges_farm_cycle
  ON public.kgotla_charges (farm_id, cycle);
