-- ============================================================
-- Phase 18.7: Enable RLS on reviews, clips, review_referees
--
-- Root cause: ALTER TABLE ... ENABLE ROW LEVEL SECURITY was present
-- in migration 001_initial_schema.sql but was never applied to the
-- production database when the schema was set up manually via the
-- Supabase Dashboard SQL Editor. As a result, the anon role could
-- read all reviews and clips without any authentication.
--
-- All required policies already exist in production (confirmed via
-- pg_policies — they target {authenticated} only). This migration
-- activates them by enabling row-level security.
--
-- Safe to run multiple times: ENABLE ROW LEVEL SECURITY is idempotent
-- (it does nothing if RLS is already enabled).
-- ============================================================

ALTER TABLE public.reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips          ENABLE ROW LEVEL SECURITY;

-- review_referees: legacy table, 0 rows, not referenced by live code.
-- Secured here as part of the same fix to remove the open anon grant.
ALTER TABLE public.review_referees ENABLE ROW LEVEL SECURITY;
