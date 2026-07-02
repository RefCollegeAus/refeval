-- ============================================================
-- Phase 2: Clip Playlists
-- Creates clip_playlists and clip_playlist_items tables with
-- RLS policies matching the existing has_org_role pattern.
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.clip_playlists (
  id              uuid        primary key default gen_random_uuid(),
  organisation_id uuid        not null references public.organisations(id) on delete cascade,
  title           text        not null,
  description     text,
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.clip_playlist_items (
  id          uuid        primary key default gen_random_uuid(),
  playlist_id uuid        not null references public.clip_playlists(id) on delete cascade,
  review_id   uuid        not null,
  tag_id      uuid        not null,
  position    integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Trigger: auto-update updated_at when playlist row changes ─────────────────

create or replace function public.set_playlist_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clip_playlists_updated_at on public.clip_playlists;
create trigger clip_playlists_updated_at
  before update on public.clip_playlists
  for each row execute function public.set_playlist_updated_at();

-- Trigger: touch playlist updated_at whenever items are inserted/updated/deleted

create or replace function public.touch_playlist_updated_at()
returns trigger language plpgsql as $$
begin
  update public.clip_playlists
  set updated_at = now()
  where id = coalesce(new.playlist_id, old.playlist_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists cpi_touch_playlist on public.clip_playlist_items;
create trigger cpi_touch_playlist
  after insert or update or delete on public.clip_playlist_items
  for each row execute function public.touch_playlist_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.clip_playlists      enable row level security;
alter table public.clip_playlist_items enable row level security;

-- clip_playlists: educator / admin / super_admin in same org

drop policy if exists "cp_select" on public.clip_playlists;
drop policy if exists "cp_insert" on public.clip_playlists;
drop policy if exists "cp_update" on public.clip_playlists;
drop policy if exists "cp_delete" on public.clip_playlists;

create policy "cp_select" on public.clip_playlists for select using (
  public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
);

create policy "cp_insert" on public.clip_playlists for insert with check (
  public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
);

create policy "cp_update" on public.clip_playlists for update using (
  public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
);

create policy "cp_delete" on public.clip_playlists for delete using (
  public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
);

-- clip_playlist_items: inherit access from parent playlist

drop policy if exists "cpi_select" on public.clip_playlist_items;
drop policy if exists "cpi_insert" on public.clip_playlist_items;
drop policy if exists "cpi_update" on public.clip_playlist_items;
drop policy if exists "cpi_delete" on public.clip_playlist_items;

create policy "cpi_select" on public.clip_playlist_items for select using (
  exists (
    select 1 from public.clip_playlists
    where id = clip_playlist_items.playlist_id
      and public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
  )
);

create policy "cpi_insert" on public.clip_playlist_items for insert with check (
  exists (
    select 1 from public.clip_playlists
    where id = clip_playlist_items.playlist_id
      and public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
  )
);

create policy "cpi_update" on public.clip_playlist_items for update using (
  exists (
    select 1 from public.clip_playlists
    where id = clip_playlist_items.playlist_id
      and public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
  )
);

create policy "cpi_delete" on public.clip_playlist_items for delete using (
  exists (
    select 1 from public.clip_playlists
    where id = clip_playlist_items.playlist_id
      and public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
  )
);
