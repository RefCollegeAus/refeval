-- ============================================================
-- Phase 17.10: Add missing columns to organisations table
--
-- lib/services/organisations.ts selects timezone, brand_colour, and
-- logo_url from the organisations table, but these columns were never
-- created in any migration. This causes a runtime error on every page
-- load for all authenticated users.
-- ============================================================

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS timezone    text NOT NULL DEFAULT 'Australia/Melbourne',
  ADD COLUMN IF NOT EXISTS brand_colour text NOT NULL DEFAULT '#a56a1b',
  ADD COLUMN IF NOT EXISTS logo_url    text;
