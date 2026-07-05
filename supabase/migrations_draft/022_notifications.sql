-- ============================================================
-- Phase 13.3 Draft — Notifications & Notification Preferences
--
-- Tables:
--   notifications              Persisted notification records per user per org.
--   notification_preferences   Per-user notification toggle settings.
--
-- Status: DRAFT — do not apply to production without review.
--
-- INSERT security for notifications:
--   Notifications are created server-side only, via API routes that use the
--   Supabase service role key. The service role key bypasses RLS entirely,
--   so no INSERT policy is needed for the authenticated role — the absence of
--   an INSERT policy means authenticated users cannot insert directly.
--
--   This prevents a user from injecting notifications for other users through
--   the browser client with the anon key.
--
-- Sample data removal:
--   buildSampleNotifications() in lib/hooks/useNotifications.ts must be
--   removed when this table is live. No sample rows should be inserted here.
-- ============================================================


-- ── notifications ────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id                   uuid        primary key default gen_random_uuid(),
  organisation_id      uuid        not null references public.organisations(id) on delete cascade,
  user_id              uuid        not null references auth.users(id) on delete cascade,
  type                 text        not null check (type in (
                                     'review_assigned', 'review_completed', 'review_updated',
                                     'assignment_assigned', 'assignment_due', 'assignment_overdue',
                                     'assignment_completed', 'goal_review_due', 'goal_updated',
                                     'playlist_shared', 'learning_note_added', 'comment_received',
                                     'organisation_announcement', 'system'
                                   )),
  title                text        not null,
  message              text        not null default '',
  related_entity_type  text        check (related_entity_type in (
                                     'review', 'assignment', 'development_goal',
                                     'playlist', 'learning_note', 'comment',
                                     'organisation', 'system'
                                   )),
  related_entity_id    uuid,
  -- related_entity_id is uuid; all existing Supabase tables use uuid PKs.
  -- No FK: related_entity_type is a discriminator across multiple tables.
  -- Application code is responsible for providing valid values.
  created_at           timestamptz not null default now(),
  created_by           uuid        references auth.users(id) on delete set null,
  is_read              boolean     not null default false,
  read_at              timestamptz,
  priority             text        not null default 'normal'
                                     check (priority in ('low', 'normal', 'high')),
  action_label         text,
  action_route         text,
  -- action_route stores a Screen union value (e.g. 'my-learning', 'referee-development'),
  -- not a URL. If the Screen type is refactored, a data migration on this column
  -- will be needed. Additional navigation context (entity IDs, etc.) goes in metadata.
  metadata             jsonb
);

-- Primary query pattern: user's notifications newest-first.
create index if not exists notif_user_created_idx on public.notifications(user_id, created_at desc);
-- Unread count badge.
create index if not exists notif_user_unread_idx  on public.notifications(user_id)
  where is_read = false;


-- ── notification_preferences ─────────────────────────────────────────────────
--
-- Per-user preference row. Scoped to the user, not per-org-per-user.
-- A user with multiple org memberships shares one preference row.

create table if not exists public.notification_preferences (
  user_id                        uuid        primary key references auth.users(id) on delete cascade,
  in_app_enabled                 boolean     not null default true,
  review_notifications           boolean     not null default true,
  assignment_notifications       boolean     not null default true,
  learning_notifications         boolean     not null default true,
  development_goal_notifications boolean     not null default true,
  organisation_notifications     boolean     not null default true,
  system_notifications           boolean     not null default true,
  updated_at                     timestamptz not null default now()
);

-- No additional indexes needed: user_id PK is the only lookup key.

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();


-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.notifications            enable row level security;
alter table public.notification_preferences enable row level security;


-- ── notifications policies ───────────────────────────────────────────────────

drop policy if exists "notif_select" on public.notifications;
drop policy if exists "notif_update" on public.notifications;
drop policy if exists "notif_delete" on public.notifications;

-- No INSERT policy: authenticated users cannot insert directly.
-- Insertions are performed server-side via the service role key only.

-- Users can read their own notifications.
create policy "notif_select" on public.notifications for select using (
  user_id = auth.uid()
);

-- Users can mark their own notifications read (updates is_read, read_at).
-- Column-level restriction (only is_read and read_at may be updated) is
-- enforced at the application layer, not in this policy.
create policy "notif_update" on public.notifications for update using (
  user_id = auth.uid()
);

-- Users can delete their own notifications. Admins can delete any in their org.
create policy "notif_delete" on public.notifications for delete using (
  user_id = auth.uid()
  or public.has_org_role(organisation_id, array[
    'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);


-- ── notification_preferences policies ────────────────────────────────────────

drop policy if exists "np_select" on public.notification_preferences;
drop policy if exists "np_insert" on public.notification_preferences;
drop policy if exists "np_update" on public.notification_preferences;
drop policy if exists "np_delete" on public.notification_preferences;

create policy "np_select" on public.notification_preferences for select using (
  user_id = auth.uid()
);

create policy "np_insert" on public.notification_preferences for insert with check (
  user_id = auth.uid()
);

create policy "np_update" on public.notification_preferences for update using (
  user_id = auth.uid()
);

create policy "np_delete" on public.notification_preferences for delete using (
  user_id = auth.uid()
);
