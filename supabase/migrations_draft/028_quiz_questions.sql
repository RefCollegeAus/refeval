-- ============================================================
-- Phase 15.2 Draft — Knowledge Quiz Questions
--
-- Changes:
--   learning_assignments       ADD COLUMN quiz_questions jsonb
--   learning_assignment_users  ADD COLUMN quiz_answers jsonb
--                              ADD COLUMN quiz_score integer
--                              ADD COLUMN quiz_total integer
--                              ADD COLUMN quiz_submitted_at timestamptz
--                              ADD COLUMN quiz_attempt_count integer
--
-- Status: DRAFT — do not apply to production without review.
-- ============================================================


-- ── learning_assignments: quiz_questions ─────────────────────────────────────
--
-- Stores educator-authored multiple-choice quiz questions.
-- Shape: [{
--   id: "uuid", prompt: "...", answers: ["...", "..."],
--   correctAnswerIndex: 0, required: false, displayOrder: 0
-- }, ...]
-- Empty array = no quiz attached.

alter table public.learning_assignments
  add column if not exists quiz_questions jsonb not null default '[]';


-- ── learning_assignment_users: quiz_answers ───────────────────────────────────
--
-- Stores the referee's selected answers for each quiz question.
-- Shape: [{ questionId: "uuid", selectedAnswerIndex: 0 | null }, ...]
-- NULL = quiz not yet started.

alter table public.learning_assignment_users
  add column if not exists quiz_answers jsonb default null;


-- ── learning_assignment_users: quiz_score ─────────────────────────────────────
--
-- Count of correct answers on the most recent quiz submission.

alter table public.learning_assignment_users
  add column if not exists quiz_score integer default null;


-- ── learning_assignment_users: quiz_total ─────────────────────────────────────
--
-- Total number of quiz questions at time of the most recent submission.
-- Stored so the percentage is stable even if questions are later edited.

alter table public.learning_assignment_users
  add column if not exists quiz_total integer default null;


-- ── learning_assignment_users: quiz_submitted_at ─────────────────────────────
--
-- Timestamp of the most recent quiz submission.
-- NULL = quiz not yet submitted on any attempt.

alter table public.learning_assignment_users
  add column if not exists quiz_submitted_at timestamptz default null;


-- ── learning_assignment_users: quiz_attempt_count ────────────────────────────
--
-- Number of times the referee has submitted the quiz.

alter table public.learning_assignment_users
  add column if not exists quiz_attempt_count integer not null default 0;
