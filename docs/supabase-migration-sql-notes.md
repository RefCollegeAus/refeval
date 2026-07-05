# RefCoach — Supabase Migration SQL Notes

**Phase:** 13.5 blocked
**Date:** July 2026  
**Status:** Draft SQL hardened — Phase 13.5 blocked pending DEV Supabase project setup.

---

## Phase 13.5 blocker — DEV Supabase project required

**Blocked:** 5 July 2026

Phase 13.5 requires a separate DEV Supabase project. The only project currently
configured in `.env.local` is `rydjxihdukoretyqqfue`, which is **production**.
Draft migrations must not be applied to production.

**Steps required before Phase 13.5 can proceed:**

1. Create a separate DEV Supabase project at supabase.com/dashboard.
2. Apply base migrations `001–017` to the DEV project via the SQL editor to establish the base schema (`profiles`, `organisations`, `reviews`, `clips`, etc.).
3. Add DEV credentials to a separate env file — **not** `.env.local` (which stays pointing at production):
   ```
   # .env.local.dev  (or .env.development — do not commit)
   NEXT_PUBLIC_SUPABASE_URL=https://<dev-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<dev-service-role-key>
   ```
4. Ensure the Supabase CLI is available (`brew install supabase/tap/supabase`) and a `SUPABASE_ACCESS_TOKEN` is set for type generation.
5. Re-run Phase 13.5 once DEV is confirmed active.

**Do not apply migrations 018–025 to `rydjxihdukoretyqqfue` (production).**

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
- **`development_goal_assignment_referees`** — junction table. Includes a SECURITY DEFINER helper `dga_org_id(uuid)` (modelled on the existing `la_org_id()` and `grp_org_id()` helpers) to avoid RLS recursion when the junction table's policies need to look up the parent assignment's `organisation_id`.
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
Creates `user_thread_state` with composite PK `(user_id, thread_key)`. `thread_key` is a composite string in the format `{review_id}::{tag_id}` (or `{review_id}::` for review-level threads) — verified in Phase 13.4 by reading `RefereeCommentsScreen.tsx`. A separate `review_id uuid FK` column is also stored for ON DELETE CASCADE support.

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

## Phase 13.4 review outcome

All 8 draft migration files were reviewed against existing migrations (001–017), the TypeScript types, and the schema design doc. Five issues were found and resolved.

### Issues found and fixed

#### 1. `viewer` role in policy arrays (018, 020) — CRITICAL
**Problem:** `dgd_select` (018) and `rgl_select`/`cgl_select` (020) used `'viewer'::organisation_role` in their role arrays. Scanning all 17 existing migrations found that `viewer` is never used in any role array. If `viewer` is not in the `organisation_role` enum, the cast fails at runtime.

**Fix:** Removed `'viewer'::organisation_role` from all three policies. Added explanatory comments noting that `viewer` is intentionally omitted and should only be added once its presence in the enum is confirmed.

**Files changed:** `018_development_goals.sql`, `020_goal_links.sql`

---

#### 2. Thread key format in `024_user_thread_state.sql` — CRITICAL
**Problem:** The original draft used `PRIMARY KEY (user_id, review_id)` and `review_id uuid NOT NULL FK`, assuming thread keys were bare review UUIDs. This was an untested assumption.

**Verification:** Read `components/referee/RefereeCommentsScreen.tsx`. Found:
```ts
function threadKey(reviewId: string, tagId: string | null) {
  return `${reviewId}::${tagId ?? ""}`;
}
```
Thread keys are composite strings (`{review_id}::{tag_id}`), not bare UUIDs.

**Fix:** Redesigned `user_thread_state`:
- PK changed from `(user_id, review_id)` to `(user_id, thread_key)`
- Added `thread_key text NOT NULL` as the actual primary key component
- Kept `review_id uuid NOT NULL FK` as a separate column for ON DELETE CASCADE
- Added `uts_review_idx` index on `review_id` for cascade-path queries

**Files changed:** `024_user_thread_state.sql`

---

#### 3. Missing `with check` on `rg_update` (018) — Security hardening
**Problem:** `rg_update` on `referee_goals` had a `using` clause but no `with check`. A referee could change `referee_id` or `organisation_id` on a row they can see.

**Fix:** Added `with check` clause that mirrors the `using` clause exactly.

**Files changed:** `018_development_goals.sql`

---

#### 4. Missing `with check` on `dn_update` (019) — Security hardening
**Problem:** `dn_update` on `development_notes` had no `with check`. An author could change `organisation_id` or other locked fields on a note they authored.

**Fix:** Added `with check` clause mirroring the `using` clause.

**Files changed:** `019_development_notes.sql`

---

#### 5. Missing `with check` on `notif_update` (022) — Security hardening
**Problem:** `notif_update` had no `with check`. A user could pass the `using` check (their own notification) but change `user_id` to redirect the notification to another user.

**Fix:** Added `with check (user_id = auth.uid())`.

**Files changed:** `022_notifications.sql`

---

### Pre-apply checklist — all items resolved

| # | Item | Resolution |
|---|---|---|
| C1 | `organisation_role` enum — does it include `viewer`? | `viewer` not found in any of 17 existing migrations. Removed from all policy arrays. Confirm in prod before adding back. |
| C2 | Thread key format in `RefereeCommentsScreen.tsx` | Verified: composite `{review_id}::{tag_id}`. Schema redesigned accordingly. |
| C3 | `set_updated_at()` trigger function exists | Confirmed defined in `017_groups.sql`. All draft migrations depend on 017 running first. |
| C4 | Helper functions from `002_rls_policies.sql` exist | Confirmed: `has_org_role()`, `is_org_member()`, `is_super_admin()` defined in `002`. `dga_org_id()` added in 018. |
| C5 | `development_notes` welfare note cascade | `ON DELETE CASCADE` on `referee_id`. If account deleted, notes are removed. Confirm policy with organisation before applying 019. |

---

## Remaining risks

| Risk | File | Mitigation |
|---|---|---|
| `viewer` role not confirmed in `organisation_role` enum | `018`, `020` | Currently excluded. Add only after running the pg_enum query below. |
| Goal def hard-deleted while `referee_goals` exist | `018` | `ON DELETE RESTRICT` blocks hard DELETE and surfaces a DB error — investigate before force-deleting |
| `clip_goal_links` TypeScript type mismatch | `020` | `linked_at` and `linked_by` added in DB but not in `ClipGoalLink` type; update `lib/types/reviewGoalLinks.ts` during Phase 13.3 app work |
| `notifications.action_route` stores Screen names | `022` | If Screen union is renamed later, stored routes become stale — document in changelog |
| Empty `notification_preferences` rows | `022` | No row = all defaults `true`; handled in the hook; no pre-population needed |
| Welfare notes deleted on account removal | `019` | `ON DELETE CASCADE` on `referee_id`; change to `SET NULL` if retention policy requires keeping notes after account deletion |
| `thread_key` / `review_id` sync | `024` | Application code must write both columns consistently; `review_id` is derivable from `thread_key` by splitting on `::` |

**Confirming the `organisation_role` enum values:**
```sql
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'organisation_role'
ORDER BY enumsortorder;
```

---

## Applying to production: checklist

- [ ] Run all files in a Supabase dev instance first
- [ ] Confirm `organisation_role` enum values (run pg_enum query above)
- [ ] Confirm welfare note cascade policy with the organisation (C5)
- [ ] Run `025_alter_existing_tables.sql` — confirm no downtime impact (additive only)
- [ ] Run `018` through `024` in numeric order
- [ ] Verify each table is visible in the Supabase Table Editor with expected columns
- [ ] Verify RLS policies appear under Authentication → Policies for each table
- [ ] Begin Phase 13.3 app work: migrate hooks one at a time, test each before moving on
- [ ] Run the localStorage export / import flow from the admin UI once app work is complete
