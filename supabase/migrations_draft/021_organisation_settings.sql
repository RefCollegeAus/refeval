-- ============================================================
-- Phase 13.3 Draft — Organisation Settings
--
-- Tables:
--   organisation_settings    Wide org configuration stored as JSONB per section.
--
-- Status: DRAFT — do not apply to production without review.
--
-- Design rationale:
--   OrganisationSettings in lib/types/organisationSettings.ts has ~60 fields
--   across 8 sections. Each section gets its own jsonb column rather than one
--   monolithic column. This:
--     - Preserves the section-level merge behaviour in useOrganisationSettings
--     - Allows partial updates without touching other sections
--     - Keeps future schema evolution to ALTER TABLE ADD COLUMN per section
--
--   TypeScript section → DB column mapping:
--     profile           → profile
--     branding          → branding
--     preferences       → preferences      (timezone, locale, dateFormat, etc.)
--     reviewDefaults    → review_settings
--     learningDefaults  → learning_settings
--     notifications     → notification_settings
--     security          → security_settings
--     resources         → resource_settings (learningDocuments array + feature flags)
--
-- Partial update pattern:
--   UPDATE public.organisation_settings
--   SET review_settings = review_settings || $1::jsonb
--   WHERE organisation_id = $2;
--
-- First-time insert pattern (upsert):
--   INSERT INTO public.organisation_settings (organisation_id, review_settings, ...)
--   VALUES ($1, $2, ...)
--   ON CONFLICT (organisation_id) DO UPDATE SET review_settings = EXCLUDED.review_settings, ...;
--
-- Code fallback:
--   DEFAULT_ORG_SETTINGS in lib/types/organisationSettings.ts remains the
--   code-level fallback when no row exists for the org.
-- ============================================================


-- ── organisation_settings ───────────────────────────────────────────────────

create table if not exists public.organisation_settings (
  organisation_id     uuid        primary key references public.organisations(id) on delete cascade,
  profile             jsonb       not null default '{}',
  branding            jsonb       not null default '{}',
  preferences         jsonb       not null default '{}',
  review_settings     jsonb       not null default '{}',
  learning_settings   jsonb       not null default '{}',
  notification_settings jsonb     not null default '{}',
  -- Column named notification_settings (not notifications) to avoid ambiguity
  -- with the public.notifications table.
  security_settings   jsonb       not null default '{}',
  resource_settings   jsonb       not null default '{}',
  updated_at          timestamptz not null default now()
);

-- No additional indexes needed: organisation_id PK is the only lookup key.

drop trigger if exists organisation_settings_updated_at on public.organisation_settings;
create trigger organisation_settings_updated_at
  before update on public.organisation_settings
  for each row execute function public.set_updated_at();


-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.organisation_settings enable row level security;

drop policy if exists "os_select" on public.organisation_settings;
drop policy if exists "os_insert" on public.organisation_settings;
drop policy if exists "os_update" on public.organisation_settings;
drop policy if exists "os_delete" on public.organisation_settings;

-- All org members can read settings (referees need locale, timezone, branding, etc.).
create policy "os_select" on public.organisation_settings for select using (
  public.is_org_member(organisation_id)
  or public.is_super_admin()
);

-- Only admins and super admins can create or modify settings.
create policy "os_insert" on public.organisation_settings for insert with check (
  public.has_org_role(organisation_id, array[
    'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

create policy "os_update" on public.organisation_settings for update using (
  public.has_org_role(organisation_id, array[
    'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

-- Super admin only for DELETE (prevent accidental settings loss).
create policy "os_delete" on public.organisation_settings for delete using (
  public.has_org_role(organisation_id, array['super_admin'::organisation_role])
);
