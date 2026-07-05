-- ============================================================
-- Phase 15.1 Draft — Assignment Reflection Questions
--
-- Changes:
--   learning_assignments       ADD COLUMN questions jsonb
--   learning_assignment_users  ADD COLUMN reflection_responses jsonb
--                              ADD COLUMN reflection_submitted_at timestamptz
--
-- Status: DRAFT — do not apply to production without review.
-- ============================================================


-- ── learning_assignments: questions ─────────────────────────────────────────
--
-- Stores educator-authored reflection questions for an assignment.
-- Shape: [{ id: "uuid", text: "..." }, ...]
-- Empty array = no reflection required.

alter table public.learning_assignments
  add column if not exists questions jsonb not null default '[]';


-- ── learning_assignment_users: reflection_responses ─────────────────────────
--
-- Stores a referee's text responses to the assignment reflection questions.
-- Shape: [{ questionId: "uuid", response: "..." }, ...]
-- NULL = not yet started/submitted.

alter table public.learning_assignment_users
  add column if not exists reflection_responses jsonb default null;


-- ── learning_assignment_users: reflection_submitted_at ───────────────────────
--
-- Timestamp when the referee submitted their reflection.
-- NULL = not yet submitted.

alter table public.learning_assignment_users
  add column if not exists reflection_submitted_at timestamptz default null;
