-- Migration 028: must_change_password flag for admin-provisioned accounts
--
-- Admins can now create a member's account directly with a server-generated
-- temporary password instead of routing through Supabase's invite-by-email
-- flow (which depends on email delivery being configured and reachable).
-- This flag is set true at creation time and forces the new user to choose
-- their own password on first login, before they can reach any other screen.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
