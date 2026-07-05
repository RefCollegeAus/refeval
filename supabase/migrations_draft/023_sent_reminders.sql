-- ============================================================
-- Phase 13.3 Draft — Sent Reminders
--
-- Tables:
--   sent_reminders    Deduplication log of reminders fired per user.
--
-- Status: DRAFT — do not apply to production without review.
--
-- Purpose:
--   Replaces refcoach_reminder_keys_{userId} localStorage key.
--   Persists reminder dedup state across sessions so a reminder is not
--   shown again after the user clears their browser storage.
--
-- Scope (this phase):
--   Persistence only. The reminder firing logic remains client-side
--   (useReminderEngine runs in a useEffect on page load). Background job
--   scheduling (Supabase Edge Functions / cron) is deferred to a later phase.
--
-- Key format:
--   reminder_key is an opaque string from useReminderEngine.
--   Typical format: {entityType}_{entityId}_{checkType}
--   e.g. 'assignment_abc123_due_soon'
--   Stored and compared as-is; no parsing at the DB layer.
--
-- Cleanup:
--   Old rows (fired_at older than ~90 days) should be purged periodically.
--   A Supabase scheduled function is the intended mechanism; deferred to the
--   same phase as background job scheduling.
--
-- Rollback:
--   drop table if exists public.sent_reminders;
-- ============================================================


-- ── sent_reminders ───────────────────────────────────────────────────────────

create table if not exists public.sent_reminders (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  reminder_key  text        not null,
  fired_at      timestamptz not null default now(),
  unique (user_id, reminder_key)
  -- Idempotency: INSERT ... ON CONFLICT (user_id, reminder_key) DO NOTHING
  -- is safe to call multiple times from the reminder engine.
);

-- The unique constraint on (user_id, reminder_key) covers the common lookup.
-- No additional indexes needed.


-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.sent_reminders enable row level security;

drop policy if exists "sr_select" on public.sent_reminders;
drop policy if exists "sr_insert" on public.sent_reminders;
drop policy if exists "sr_delete" on public.sent_reminders;

create policy "sr_select" on public.sent_reminders for select using (
  user_id = auth.uid()
);

create policy "sr_insert" on public.sent_reminders for insert with check (
  user_id = auth.uid()
);

-- Deletion allowed by owner or service role (cleanup jobs).
create policy "sr_delete" on public.sent_reminders for delete using (
  user_id = auth.uid()
);
