-- 020_referee_simulator.sql
-- Referee Simulator: sessions, events, attempts, responses

create table if not exists public.simulator_sessions (
  id              uuid        primary key default gen_random_uuid(),
  organisation_id uuid        not null references public.organisations(id) on delete cascade,
  title           text        not null,
  description     text        not null default '',
  video_url       text        not null default '',
  level           text        not null default 'beginner',
  created_by      uuid        not null references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.simulator_events (
  id                 uuid        primary key default gen_random_uuid(),
  session_id         uuid        not null references public.simulator_sessions(id) on delete cascade,
  timestamp_seconds  numeric     not null,
  window_seconds     numeric     not null default 10,
  correct_outcome    text        not null default '',
  correct_call       text        not null default '',
  category           text        not null default '',
  notes              text        not null default '',
  display_order      integer     not null default 0
);

create table if not exists public.simulator_attempts (
  id           uuid        primary key default gen_random_uuid(),
  session_id   uuid        not null references public.simulator_sessions(id) on delete cascade,
  user_id      uuid        not null references auth.users(id),
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  score        integer,
  total        integer,
  level        text
);

create table if not exists public.simulator_responses (
  id                    uuid        primary key default gen_random_uuid(),
  attempt_id            uuid        not null references public.simulator_attempts(id) on delete cascade,
  event_id              uuid        not null references public.simulator_events(id),
  response_outcome      text        not null default '',
  response_call         text        not null default '',
  response_time_seconds numeric,
  is_correct            boolean     not null default false,
  created_at            timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.simulator_sessions  enable row level security;
alter table public.simulator_events    enable row level security;
alter table public.simulator_attempts  enable row level security;
alter table public.simulator_responses enable row level security;

-- sessions: all org members can read; educators/admins can write
create policy "sim_sessions_select" on public.simulator_sessions
  for select using (
    public.has_org_role(organisation_id,
      array['educator'::organisation_role, 'admin'::organisation_role,
            'super_admin'::organisation_role, 'referee'::organisation_role])
  );

create policy "sim_sessions_insert" on public.simulator_sessions
  for insert with check (
    public.has_org_role(organisation_id,
      array['educator'::organisation_role, 'admin'::organisation_role,
            'super_admin'::organisation_role])
  );

create policy "sim_sessions_update" on public.simulator_sessions
  for update using (
    public.has_org_role(organisation_id,
      array['educator'::organisation_role, 'admin'::organisation_role,
            'super_admin'::organisation_role])
  );

create policy "sim_sessions_delete" on public.simulator_sessions
  for delete using (
    public.has_org_role(organisation_id,
      array['educator'::organisation_role, 'admin'::organisation_role,
            'super_admin'::organisation_role])
  );

-- events: inherit access from parent session
create policy "sim_events_select" on public.simulator_events
  for select using (
    exists (
      select 1 from public.simulator_sessions s
      where s.id = session_id
        and public.has_org_role(s.organisation_id,
              array['educator'::organisation_role, 'admin'::organisation_role,
                    'super_admin'::organisation_role, 'referee'::organisation_role])
    )
  );

create policy "sim_events_write" on public.simulator_events
  for all using (
    exists (
      select 1 from public.simulator_sessions s
      where s.id = session_id
        and public.has_org_role(s.organisation_id,
              array['educator'::organisation_role, 'admin'::organisation_role,
                    'super_admin'::organisation_role])
    )
  );

-- attempts: users see their own; educators/admins see all in org
create policy "sim_attempts_select" on public.simulator_attempts
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.simulator_sessions s
      where s.id = session_id
        and public.has_org_role(s.organisation_id,
              array['educator'::organisation_role, 'admin'::organisation_role,
                    'super_admin'::organisation_role])
    )
  );

create policy "sim_attempts_insert" on public.simulator_attempts
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.simulator_sessions where id = session_id)
  );

create policy "sim_attempts_update" on public.simulator_attempts
  for update using (user_id = auth.uid());

-- responses: follow attempt ownership
create policy "sim_responses_select" on public.simulator_responses
  for select using (
    exists (
      select 1 from public.simulator_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
    or exists (
      select 1 from public.simulator_attempts a
      join public.simulator_sessions s on s.id = a.session_id
      where a.id = attempt_id
        and public.has_org_role(s.organisation_id,
              array['educator'::organisation_role, 'admin'::organisation_role,
                    'super_admin'::organisation_role])
    )
  );

create policy "sim_responses_insert" on public.simulator_responses
  for insert with check (
    exists (
      select 1 from public.simulator_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );
