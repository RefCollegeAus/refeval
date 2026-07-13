-- ============================================================
-- Migration 026: handle_new_user trigger
-- ============================================================
-- Captures the production trigger that was applied manually via the
-- Supabase Dashboard and never committed to a migration file.
--
-- PURPOSE
--   Automatically inserts a row into public.profiles whenever a new
--   user is created in auth.users (via invite, magic link, or password
--   signup). Without this trigger, every new auth user requires a
--   manual profile insert before they can log in.
--
-- IDEMPOTENCY
--   CREATE OR REPLACE FUNCTION is safe to re-run.
--   DROP TRIGGER IF EXISTS before CREATE TRIGGER is safe to re-run.
--
-- PRODUCTION NOTE
--   This trigger already exists in production (rydjxihdukoretyqqfue)
--   having been applied manually. Running this migration there is safe
--   and idempotent — it will replace the function definition in place
--   and recreate the trigger with identical behaviour.
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
