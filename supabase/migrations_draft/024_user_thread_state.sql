-- ============================================================
-- Phase 13.3 Draft — User Thread State
-- Updated: Phase 13.4 hardening
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
--   This table operates at thread level (per review_id + tag_id pair): starred/dismissed
--   state applies to one thread, not the whole review or an individual clip.
--   Mixing this into review_comment_reads would complicate its existing unread-count queries.
--
-- Thread key format (VERIFIED in Phase 13.4):
--   RefereeCommentsScreen.tsx threadKey() function returns:
--     `${reviewId}::${tagId ?? ""}`
--   e.g. "a1b2c3d4-...::" (review-level thread, no tag)
--        "a1b2c3d4-...::e5f6g7h8-..." (clip-level thread)
--   Keys are NOT bare review UUIDs. The schema was updated to use
--   thread_key text as the primary key component.
--
-- review_id column:
--   Stored alongside thread_key (redundant but derivable by splitting on '::').
--   Required for ON DELETE CASCADE: when a review is deleted, all thread state rows
--   for that review are removed without needing application-layer cleanup.
--
-- Rollback:
--   drop table if exists public.user_thread_state;
-- ============================================================


-- ── user_thread_state ────────────────────────────────────────────────────────

create table if not exists public.user_thread_state (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  thread_key  text        not null,
  -- Composite key: '{review_id}::{tag_id}' or '{review_id}::' for review-level threads.
  -- Mirrors threadKey() in components/referee/RefereeCommentsScreen.tsx.
  review_id   uuid        not null references public.reviews(id) on delete cascade,
  -- review_id is stored for cascade deletion support (not part of the PK).
  -- Application code must keep review_id consistent with the review_id embedded
  -- in thread_key. Constraint: thread_key must start with review_id::
  starred     boolean     not null default false,
  dismissed   boolean     not null default false,
  seen_at     timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, thread_key)
);

-- Load all thread state for a user at session start.
create index if not exists uts_user_idx    on public.user_thread_state(user_id);
-- Cascade support: find all thread state rows for a review being deleted.
create index if not exists uts_review_idx  on public.user_thread_state(review_id);

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
