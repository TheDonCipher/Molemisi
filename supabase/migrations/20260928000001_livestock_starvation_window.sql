-- R1 / docs/30 Pass 1 task 1.4 — livestock starvation window (P0-1).
--
-- Health now decays only after STARVATION_ONSET_HOURS (12) CONSECUTIVE hours
-- at hunger 0. The window start must persist across simulation passes and
-- client sessions, so it lives on the row: `hunger_zero_since`.
--
-- NULL means "not starving" (the animal has been fed since the clock started).

alter table public.livestock
  add column if not exists hunger_zero_since timestamptz;

comment on column public.livestock.hunger_zero_since is
  'When hunger last hit 0 (starvation window start). Health decays only after 12 consecutive hours at zero hunger; feeding/treatment clears it.';
