-- ============================================================
-- Phase 13.3 Draft — User Thread State
--
-- Tables:
--   user_thread_state    Per-user starred / dismissed / seen state for comment threads.
--
-- Status: DRAFT — do not apply to production without review.
--
-- Replaces three localStorage keys from RefereeCommentsScreen.tsx:
--   refcoach_starred_comment_threads_{userId}    string[]
--   refcoach_dismissed_comment_threads_{userId}  string[]
--   refcoach_thread_seen_at_{userId}             Record<string, ISO>
--
-- Design rationale (separate table, not extending review_comment_reads):
--   review_comment_reads operates at clip level (per tag_id).
--   This table operates at review level (per review_id): starred/dismissed state
--   applies to the entire thread, not individual clips. Mixing the concepts into
--   review_comment_reads would complicate its existing unread-count queries.
--
-- VERIFY BEFORE APPLYING (Checkpoint C2 from supabase-schema-draft.md):
--   The thread key format used in RefereeCommentsScreen.tsx must be confirmed
--   as bare review_id UUIDs before this table is applied. If the localStorage
--   keys are composite strings (e.g. 'review_abc_thread_xyz'), replace the
--   review_id uuid FK with a plain `thread_key text` column and remove the
--   reference to public.reviews(id).
--
-- Rollback:
--   drop table if exists public.user_thread_state;
-- ============================================================


-- ── user_thread_state ────────────────────────────────────────────────────────

create table if not exists public.user_thread_state (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  review_id   uuid        not null references public.reviews(id) on delete cascade,
  -- ASSUMPTION: thread keys in RefereeCommentsScreen.tsx are bare review_id UUIDs.
  -- Verify this before applying. If composite keys are used, change to text.
  starred     boolean     not null default false,
  dismissed   boolean     not null default false,
  seen_at     timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, review_id)
);

-- Load all thread state for a user at session start.
create index if not exists uts_user_idx on public.user_thread_state(user_id);

drop trigger if exists user_thread_state_updated_at on public.user_thread_state;
create trigger user_thread_state_updated_at
  before update on public.user_thread_state
  for each row execute function public.set_updated_at();


-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.user_thread_state enable row level security;

drop policy if exists "uts_select" on public.user_thread_state;
drop policy if exists "uts_insert" on public.user_thread_state;
drop policy if exists "uts_update" on public.user_thread_state;
drop policy if exists "uts_delete" on public.user_thread_state;

create policy "uts_select" on public.user_thread_state for select using (
  user_id = auth.uid()
);

create policy "uts_insert" on public.user_thread_state for insert with check (
  user_id = auth.uid()
);

create policy "uts_update" on public.user_thread_state for update using (
  user_id = auth.uid()
);

create policy "uts_delete" on public.user_thread_state for delete using (
  user_id = auth.uid()
);
