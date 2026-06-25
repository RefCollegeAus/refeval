-- RefEval initial schema
-- Applies to: Supabase project rydjxihdukoretyqqfue
-- This migration documents the tables as they exist in the live database.
-- Run this in the Supabase SQL editor to recreate the schema in a new environment.

-- ============================================================
-- profiles
-- Populated automatically by a Supabase Auth trigger on signup.
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  created_at  timestamptz default now()
);

-- ============================================================
-- organisations
-- ============================================================
create table if not exists public.organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  status      text not null default 'Active', -- 'Active' | 'Suspended'
  created_at  timestamptz default now()
);

-- ============================================================
-- organisation_members
-- One row per user per organisation. role drives the app's permission model.
-- ============================================================
create table if not exists public.organisation_members (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  role            text not null, -- 'super_admin' | 'admin' | 'educator' | 'referee'
  created_at      timestamptz default now(),
  unique (user_id, organisation_id)
);

-- ============================================================
-- reviews
-- One review per game. An educator creates it and assigns referees.
-- ============================================================
create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid references public.organisations(id) on delete cascade,
  educator_id      uuid references auth.users(id),
  educator_name    text,
  game             text,
  referee1_id      uuid references auth.users(id),
  referee2_id      uuid references auth.users(id),
  referee3_id      uuid references auth.users(id),
  referee1_name    text default '',
  referee2_name    text default '',
  referee3_name    text default '',
  video_link       text,
  timestamp_offset integer default 0,
  status           text not null default 'in_review', -- 'in_review' | 'completed'
  submitted_at     timestamptz,
  created_at       timestamptz default now()
);

-- ============================================================
-- clips
-- One row per coded moment within a review.
-- ============================================================
create table if not exists public.clips (
  id                     uuid primary key default gen_random_uuid(),
  review_id              uuid not null references public.reviews(id) on delete cascade,
  organisation_id        uuid references public.organisations(id), -- denormalised for scoped queries
  -- Timing
  time                   text,                 -- formatted mm:ss display string
  seconds                integer,              -- raw video seconds
  adjusted_seconds       integer,              -- seconds + timestamp_offset
  adjusted_time          text,                 -- formatted adjusted time
  timestamp_seconds      integer,              -- alias kept for backwards compat
  timestamp_link         text,                 -- deep-link URL to the moment
  -- Classification
  mode                   text default 'video', -- 'video' | 'non-video'
  referee_target         text,                 -- 'All Referees' | 'Referee 1' | 'Referee 2' | 'Referee 3'
  extra_review_officials jsonb default '[]',   -- array of RefSlot
  clip_officials         jsonb default '[]',   -- array of { slot, type }
  outcome                text,
  category               text,
  position               text,
  coverage               text,
  notes                  text,
  created_at             timestamptz default now()
);

-- Phase 5: add organisation_id to existing clips table
-- Run this in the Supabase SQL editor if the table already exists without this column:
-- alter table public.clips add column if not exists organisation_id uuid references public.organisations(id);

-- ============================================================
-- Row-Level Security
-- NOTE: RLS policies are managed in the Supabase dashboard.
-- The policies below are a reference only — apply them manually
-- or via the Supabase dashboard to match the live configuration.
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles          enable row level security;
alter table public.organisations     enable row level security;
alter table public.organisation_members enable row level security;
alter table public.reviews           enable row level security;
alter table public.clips             enable row level security;

-- Example policies (adjust to match live dashboard configuration):

-- Profiles: users can read/update their own profile
-- create policy "users can read own profile"   on public.profiles for select using (auth.uid() = id);
-- create policy "users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Reviews: members of the organisation can read reviews
-- create policy "org members can read reviews"
--   on public.reviews for select
--   using (organisation_id in (
--     select organisation_id from public.organisation_members where user_id = auth.uid()
--   ));

-- Reviews: educators can insert reviews for their organisation
-- create policy "educators can insert reviews"
--   on public.reviews for insert
--   with check (organisation_id in (
--     select organisation_id from public.organisation_members
--     where user_id = auth.uid() and role in ('educator', 'admin', 'super_admin')
--   ));

-- Clips: inherit access from parent review
-- create policy "org members can read clips"
--   on public.clips for select
--   using (review_id in (select id from public.reviews));

-- create policy "educators can write clips"
--   on public.clips for all
--   using (review_id in (select id from public.reviews));
