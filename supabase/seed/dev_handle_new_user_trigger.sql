-- ============================================================
-- handle_new_user trigger for DEV
-- ============================================================
-- FOR DEV ONLY — check whether this already exists in production
-- before applying there.
--
-- PURPOSE
--   Automatically inserts a row into public.profiles whenever a new
--   user is created in auth.users (via invite, magic link, or password
--   signup). Without this trigger, every new auth user requires a
--   manual profile insert before they can log in.
--
--   Production has this trigger but it was never captured in a migration
--   file. This script adds it to DEV and serves as documentation for the
--   production trigger.
--
-- HOW TO RUN
--   Paste into Dashboard → SQL Editor (refeval-dev project) and run.
--   Safe to re-run (uses CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
--
-- NOTE
--   This should eventually be promoted to a proper migration file
--   (e.g. supabase/migrations/026_handle_new_user_trigger.sql) so it
--   is applied to all environments consistently.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
