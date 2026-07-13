-- ============================================================
-- handle_new_user trigger for DEV
-- ============================================================
-- FOR DEV ONLY — convenience script for resetting the dev environment.
--
-- PURPOSE
--   Applies the handle_new_user trigger to the dev Supabase project.
--   The canonical migration is supabase/migrations/026_handle_new_user_trigger.sql.
--   This seed script is kept for convenience when rebuilding the dev project.
--
-- HOW TO RUN
--   Paste into Dashboard → SQL Editor (refeval-dev project) and run.
--   Safe to re-run (uses CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
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
