-- ============================================================
-- RefCoach — Production Schema Verification
-- Phase 18.5 — Beta QA
-- Generated: July 2026
--
-- READ-ONLY — DO NOT MODIFY PRODUCTION DATA.
-- Run in Supabase Dashboard → SQL Editor against the production project (rydjxihdukoretyqqfue).
-- All statements are SELECT only.
--
-- PURPOSE:
--   Confirm which draft migrations have been applied to production
--   and which are still pending.
--
-- SECTIONS:
--   1. Core tables (migrations 001–024) — expected to exist
--   2. Draft migrations 025–029 — column-level checks
--   3. Development goal tables (migration 018) — table existence
--   4. RLS status for key tables
--   5. Policy existence
--   6. Index presence
--   7. Enum values
-- ============================================================


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 1: Core table existence (migrations 001–024 expected)
-- ────────────────────────────────────────────────────────────────────────────

SELECT
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'organisations',
    'organisation_members',
    'organisation_user_permissions',
    'reviews',
    'clips',
    'review_comments',
    'review_comment_reads',
    'clip_playlists',
    'clip_playlist_items',
    'learning_assignments',
    'learning_assignment_users',
    'simulator_sessions',
    'simulator_events',
    'simulator_attempts',
    'simulator_responses',
    'groups',
    'group_members',
    'view_only_games',
    'view_only_game_assignments'
  )
ORDER BY table_name;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 2: Draft migration column checks (025–029)
-- ────────────────────────────────────────────────────────────────────────────

-- Check each draft migration column individually.
-- A row appearing means the column EXISTS.
-- A missing row means the column is ABSENT (migration not applied).

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '025_alter_existing_tables' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learning_assignment_users'
  AND column_name = 'watched_clip_ids'

UNION ALL

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '025_alter_existing_tables' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'onboarding_dismissed'

UNION ALL

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '026_reflection_questions' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learning_assignments'
  AND column_name = 'questions'

UNION ALL

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '026_reflection_questions' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learning_assignment_users'
  AND column_name = 'reflection_responses'

UNION ALL

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '026_reflection_questions' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learning_assignment_users'
  AND column_name = 'reflection_submitted_at'

UNION ALL

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '027_playlist_archive (CRITICAL)' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clip_playlists'
  AND column_name = 'archived_at'

UNION ALL

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '028_quiz_questions' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learning_assignments'
  AND column_name = 'quiz_questions'

UNION ALL

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '028_quiz_questions' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learning_assignment_users'
  AND column_name = 'quiz_answers'

UNION ALL

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '028_quiz_questions' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learning_assignment_users'
  AND column_name = 'quiz_score'

UNION ALL

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '028_quiz_questions' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learning_assignment_users'
  AND column_name = 'quiz_submitted_at'

UNION ALL

SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  '028_quiz_questions' AS migration
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learning_assignment_users'
  AND column_name = 'quiz_attempt_count'

ORDER BY migration, table_name, column_name;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 2b: playlist_id nullability check (migration 029)
-- ────────────────────────────────────────────────────────────────────────────

SELECT
  column_name,
  is_nullable,
  CASE
    WHEN is_nullable = 'YES' THEN '✅ 029 applied — playlist_id is nullable'
    ELSE '❌ 029 NOT applied — playlist_id is NOT NULL (standalone quizzes will fail)'
  END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learning_assignments'
  AND column_name = 'playlist_id';


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 3: Development goal tables (migration 018)
-- ────────────────────────────────────────────────────────────────────────────

SELECT
  t.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING — apply 018_development_goals.sql' END AS status
FROM (
  VALUES
    ('development_goal_defs'),
    ('development_goal_assignments'),
    ('development_goal_assignment_referees'),
    ('referee_goals')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public' AND t.table_name = expected.table_name
ORDER BY expected.table_name;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 4: RLS enabled on key tables
-- ────────────────────────────────────────────────────────────────────────────

SELECT
  relname AS table_name,
  CASE WHEN relrowsecurity THEN '✅ RLS enabled' ELSE '❌ RLS DISABLED' END AS rls_status
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relname IN (
    'profiles',
    'organisations',
    'organisation_members',
    'organisation_user_permissions',
    'reviews',
    'clips',
    'review_comments',
    'review_comment_reads',
    'clip_playlists',
    'clip_playlist_items',
    'learning_assignments',
    'learning_assignment_users',
    'simulator_sessions',
    'simulator_events',
    'simulator_attempts',
    'simulator_responses',
    'groups',
    'group_members',
    'view_only_games',
    'view_only_game_assignments'
  )
ORDER BY table_name;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 5: Policy count per table
-- ────────────────────────────────────────────────────────────────────────────

SELECT
  tablename,
  COUNT(*) AS policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) AS policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'reviews', 'clips', 'review_comments', 'review_comment_reads',
    'clip_playlists', 'clip_playlist_items',
    'learning_assignments', 'learning_assignment_users',
    'simulator_sessions', 'simulator_events', 'simulator_attempts', 'simulator_responses',
    'groups', 'group_members',
    'view_only_games', 'view_only_game_assignments',
    'organisation_members', 'organisation_user_permissions'
  )
GROUP BY tablename
ORDER BY tablename;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 6: Key indexes
-- ────────────────────────────────────────────────────────────────────────────

SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'reviews', 'clips', 'clip_playlists', 'clip_playlist_items',
    'learning_assignments', 'learning_assignment_users',
    'review_comments', 'review_comment_reads'
  )
ORDER BY tablename, indexname;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 7: Organisation role enum values
-- ────────────────────────────────────────────────────────────────────────────

SELECT
  e.enumlabel AS role_value,
  e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'organisation_role'
ORDER BY e.enumsortorder;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 8: Helper functions existence
-- ────────────────────────────────────────────────────────────────────────────

SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'has_org_role',
    'is_org_member',
    'is_super_admin',
    'set_updated_at',
    'la_org_id',
    'dga_org_id'
  )
ORDER BY routine_name;


-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 9: Row count sanity check (production data check)
-- ────────────────────────────────────────────────────────────────────────────
-- This section shows live data counts to confirm data is present.
-- Expected: at least 1 organisation, 1+ profiles, 1+ organisation_members.

SELECT 'organisations'        AS entity, COUNT(*)::int AS row_count FROM public.organisations
UNION ALL
SELECT 'profiles',             COUNT(*)::int FROM public.profiles
UNION ALL
SELECT 'organisation_members', COUNT(*)::int FROM public.organisation_members
UNION ALL
SELECT 'reviews',              COUNT(*)::int FROM public.reviews
UNION ALL
SELECT 'clips',                COUNT(*)::int FROM public.clips
UNION ALL
SELECT 'clip_playlists',       COUNT(*)::int FROM public.clip_playlists
UNION ALL
SELECT 'learning_assignments',  COUNT(*)::int FROM public.learning_assignments
ORDER BY entity;
