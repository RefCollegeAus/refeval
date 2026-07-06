-- ============================================================
-- Phase 15.5: Quiz Learning Feedback
-- Adds quiz_allow_retakes to learning_assignments.
-- quiz_questions JSONB already stores explanation per question
-- (no column change needed — it is stored in the JSONB blob).
-- ============================================================

alter table public.learning_assignments
  add column if not exists quiz_allow_retakes boolean not null default true;
