-- ============================================================
-- Phase 17.9: Schema alignment fixes
--
-- Fix 1 — Add viewer to organisation_role enum
--   The app assigns and reads a 'viewer' role on organisation_members,
--   but the enum (created in 002_rls_policies.sql) only contained:
--   super_admin, admin, educator, referee.
--   Without this, any invite or role-change that assigns 'viewer'
--   is rejected by Postgres with an invalid enum value error.
--
-- Fix 2 — Add joined_at to organisation_members
--   The invite API (app/api/admin/invite/route.ts) inserts joined_at
--   and the members API selects it, but the column was never added
--   in migrations. Backfills from created_at for existing rows.
-- ============================================================


-- ── Fix 1: viewer enum value ─────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'organisation_role'
      AND e.enumlabel = 'viewer'
  ) THEN
    ALTER TYPE public.organisation_role ADD VALUE 'viewer';
  END IF;
END$$;


-- ── Fix 2: joined_at column ──────────────────────────────────────────────────

ALTER TABLE public.organisation_members
  ADD COLUMN IF NOT EXISTS joined_at timestamptz;

-- Backfill from created_at for rows already in the table.
UPDATE public.organisation_members
SET joined_at = created_at
WHERE joined_at IS NULL;
