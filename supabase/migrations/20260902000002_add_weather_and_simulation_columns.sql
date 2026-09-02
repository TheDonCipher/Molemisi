-- Add missing columns to farms table for weather and simulation support
-- These are needed by the SimulationService for M5: Time & Offline Simulation

ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS last_simulated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS weather_temperature NUMERIC(5,2) NOT NULL DEFAULT 25.0,
  ADD COLUMN IF NOT EXISTS weather_humidity NUMERIC(3,2) NOT NULL DEFAULT 0.30,
  ADD COLUMN IF NOT EXISTS current_day INTEGER NOT NULL DEFAULT 1;

-- Add product_timer_hours to livestock for numeric hour-based tracking
-- (product_timer remains as TIMESTAMPTZ for display purposes)
ALTER TABLE public.livestock
  ADD COLUMN IF NOT EXISTS product_timer_hours REAL NOT NULL DEFAULT 0;
