# RefCoach — Supabase Migration SQL Notes

**Phase:** 13.3  
**Date:** July 2026  
**Status:** Draft SQL only — not applied to Supabase.

---

## Files created

All files are in `supabase/migrations_draft/`. They follow the same numbering and style as the existing `supabase/migrations/` files (001–017) but are kept in a separate folder until reviewed and approved for production.

| File | Tables / Changes | Priority |
|---|---|---|
| `018_development_goals.sql` | `development_goal_defs`, `development_goal_assignments`, `development_goal_assignment_referees`, `referee_goals` | High |
| `019_development_notes.sql` | `development_notes` | High |
| `020_goal_links.sql` | `review_goal_links`, `clip_goal_links` | Medium |
| `021_organisation_settings.sql` | `organisation_settings` | Medium |
| `022_notifications.sql` | `notifications`, `notification_preferences` | Medium |
| `023_sent_reminders.sql` | `sent_reminders` | Low |
| `024_user_thread_state.sql` | `user_thread_state` | Low |
| `025_alter_existing_tables.sql` | `learning_assignment_users.watched_clip_ids`, `profiles.onboarding_dismissed` | Low |

---

## What each file does

### `018_development_goals.sql`
Creates the three-layer development goal architecture:

- **`development_goal_defs`** — reusable goal templates with soft delete (`deleted_at timestamptz`). Application code sets `deleted_at = now()` instead of hard DELETE. Two indexes: `(organisation_id)` and a partial `(organisation_id) WHERE deleted_at IS NULL` for active-only queries.
- **`development_goal_assignments`** — audit record of each assignment event. `assignment_type` stores the intent (`'Everyone'`, `'SelectedReferees'`, `'Individual'`); the junction table always stores the resolved explicit list.
- **`development_goal_assignment_referees`** — junction table. Includes a new SECURITY DEFINER helper `dga_org_id(uuid)` (modelled on the existing `la_org_id()` and `grp_org_id()` helpers) to avoid RLS recursion when the junction table's policies need to look up the parent assignment's `organisation_id`.
- **`referee_goals`** — per-referee progress rows. `goal_id` FK uses `ON DELETE RESTRICT` (not CASCADE) — soft delete means the goal def row is never hard-deleted in normal flow; RESTRICT is a safety net. `UNIQUE (goal_id, referee_id)`.

### `019_development_notes.sql`
Creates `development_notes`. The critical feature here is **two separate SELECT policies**:
- `dn_select_staff` — educators/admins/super_admin see all notes in their org.
- `dn_select_referee` — referees see only their own notes where `visibility = 'Visible to Referee'`.

Postgres evaluates multiple SELECT policies as OR, so both are active simultaneously. A referee cannot see `Educator Only` notes even with a direct `SELECT *` through the anon key.

### `020_goal_links.sql`
Creates `review_goal_links` and `clip_goal_links`. Both allow all org members to SELECT (referees need to see their goal context). Note: `clip_goal_links` adds `linked_at` and `linked_by` columns that do not yet exist in the TypeScript `ClipGoalLink` type — these must be added to `lib/types/reviewGoalLinks.ts` when the hook is migrated.

### `021_organisation_settings.sql`
Creates `organisation_settings` with one `jsonb` column per section (`profile`, `branding`, `preferences`, `review_settings`, `learning_settings`, `notification_settings`, `security_settings`, `resource_settings`). The column is named `notification_settings` (not `notifications`) to avoid naming conflicts with the `notifications` table.

### `022_notifications.sql`
Creates `notifications` and `notification_preferences`. The `notifications` table has **no INSERT policy for the authenticated role** — insertions are server-side only via the service role key. The absence of a policy means Supabase's RLS blocks direct browser inserts. `notification_preferences` is a 1:1 row per user, created lazily on first preference save.

### `023_sent_reminders.sql`
Creates `sent_reminders` with `UNIQUE (user_id, reminder_key)`. The reminder engine uses `INSERT ... ON CONFLICT (user_id, reminder_key) DO NOTHING` for idempotent deduplication.

### `024_user_thread_state.sql`
Creates `user_thread_state` with composite PK `(user_id, review_id)`. Contains a prominent verification note about the thread key format assumption (Checkpoint C2 from `supabase-schema-draft.md`).

### `025_alter_existing_tables.sql`
Adds two columns to existing tables:
- `learning_assignment_users.watched_clip_ids jsonb DEFAULT '[]'` — watched clip progress, scoped per assignment-user row.
- `profiles.onboarding_dismissed boolean DEFAULT false` — replaces the `refcoach_onboarding_dismissed_{userId}` localStorage key.

Both use `ADD COLUMN IF NOT EXISTS` — safe to re-run.

---

## What is safe to apply (in order)

The files have no circular dependencies and can be applied sequentially in numeric order. Each is idempotent where possible (`create table if not exists`, `create index if not exists`, `drop policy if exists` before creates).

**Safe to apply after verification:**
1. `025_alter_existing_tables.sql` — purely additive columns on existing tables; lowest risk.
2. `018_development_goals.sql` through `024_user_thread_state.sql` — new tables only; no existing tables are modified.

**Apply in a dev/staging environment first.** The production Supabase project (`rydjxihdukoretyqqfue`, per `001_initial_schema.sql`) should only receive these migrations after testing in a separate dev instance.

---

## What must be verified before applying

### 1. `organisation_role` enum — does it include `'viewer'`?

Migration `002_rls_policies.sql` defines `organisation_role` as a custom enum. The policies in `018_development_goals.sql` and `020_goal_links.sql` reference `'viewer'::organisation_role`. Verify that `viewer` is a valid enum value:

```sql
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'organisation_role'
ORDER BY enumsortorder;
```

If `viewer` is not in the enum, remove it from the goal def and goal link SELECT policies before applying.

### 2. Thread key format in `RefereeCommentsScreen.tsx`

`024_user_thread_state.sql` assumes `user_thread_state.review_id` stores bare review UUID strings from the localStorage keys. Before applying, confirm by reading `RefereeCommentsScreen.tsx` and checking how it constructs the key strings for `refcoach_starred_comment_threads_{userId}`.

If the keys are composite (e.g. `review_abc123_thread_xyz`), the `review_id uuid FK` must be replaced with `thread_key text` and the `REFERENCES public.reviews(id)` removed.

### 3. `set_updated_at()` trigger function

Migration `017_groups.sql` defines `public.set_updated_at()`. Verify it is present before running the draft migrations (it is called by the new triggers in 018, 019, 021, 024). If it is not present (e.g. in a fresh dev environment):

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
```

### 4. Helper functions from `002_rls_policies.sql`

The draft policies use `public.has_org_role()`, `public.is_org_member()`, and `public.is_super_admin()`. These are defined in `002_rls_policies.sql`. Confirm they exist in the target Supabase instance before running the drafts.

### 5. `development_notes` — welfare note retention

`019_development_notes.sql` uses `ON DELETE CASCADE` on `referee_id`. If a referee's account is deleted, all their notes (including `Welfare / Support` type) are also deleted. Confirm this is acceptable with the organisation before applying. If notes must be retained after account deletion, change the FK to `ON DELETE SET NULL` (and make `referee_id` nullable).

---

## Remaining risks

| Risk | File | Mitigation |
|---|---|---|
| `viewer` role not in `organisation_role` enum | `018`, `020` | Run the pg_enum query in §verify-1 before applying |
| Thread keys are composite strings, not bare UUIDs | `024` | Read `RefereeCommentsScreen.tsx` before applying |
| Goal def hard-deleted while referee_goals exist | `018` | `ON DELETE RESTRICT` on `referee_goals.goal_id` will block and surface a DB error — good; investigate before force-deleting |
| `clip_goal_links` TypeScript type mismatch | `020` | `linked_at` and `linked_by` added here; TypeScript type must be updated in Phase 13.3 app work |
| `notifications.action_route` stores Screen names | `022` | If Screen union is renamed later, stored routes become stale — document in changelog |
| Empty `notification_preferences` rows | `022` | No row = all defaults `true`; this is handled in the hook; no pre-population needed |
| `dga_org_id()` helper SECURITY DEFINER search_path | `018` | Uses `set search_path = ''` (matches `la_org_id()` in 013); correct |

---

## Applying to production: checklist

- [ ] Run all files in a Supabase dev instance first
- [ ] Verify `organisation_role` enum includes `viewer` (see §verify-1)
- [ ] Confirm thread key format in `RefereeCommentsScreen.tsx` (see §verify-2)
- [ ] Confirm welfare note cascade policy with the organisation (see §verify-5)
- [ ] Run `025_alter_existing_tables.sql` — confirm no downtime impact (additive only)
- [ ] Run `018` through `024` in numeric order
- [ ] Verify each table is visible in the Supabase Table Editor with expected columns
- [ ] Verify RLS policies appear under Authentication → Policies for each table
- [ ] Begin Phase 13.3 app work: migrate hooks one at a time, test each before moving on
- [ ] Run the localStorage export / import flow from the admin UI once app work is complete
