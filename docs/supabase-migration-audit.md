# RefCoach — Supabase Migration Audit

**Version:** v5.2.8  
**Date:** July 2026  
**Purpose:** Audit current data sources, storage patterns, and migration risks before beginning Phase 13.2 schema work.

---

## Executive Summary

RefCoach has a hybrid data storage model. The core entities (auth, profiles, organisations, memberships, reviews, clips, playlists, groups, permissions, comments) are already backed by Supabase. The coaching and operational layers (development goals, notes, goal links, organisation settings, notifications, preferences, reminders, and onboarding state) remain in browser `localStorage`, scoped by `orgId` or `userId`.

This is intentional staging from earlier phases, not technical debt that was overlooked. The Supabase tables that exist are well-structured and RLS-aware. The localStorage entities have clear data shapes in TypeScript and will be straightforward to migrate table-by-table.

The main risk areas are:
- **Development goals** — three-layer architecture (defs / assignments / referee progress) with a v1 legacy migration path still active.
- **Organisation settings** — very wide settings object; will need a JSON column or a normalised multi-row table.
- **Notifications** — currently in-memory with seeded sample data; no persistence layer at all.
- **Review–goal links** — explicitly documented as localStorage-only; will need a new Supabase table.
- **Watched clips progress** — scoped to `assignmentUser.id`, no org scope.

---

## Current Storage Overview

| Storage layer | Entities |
|---|---|
| **Supabase (live)** | auth, profiles, organisations, memberships, roles/permissions, reviews, clips, playlists, playlist items, groups, group members, assignments, assignment users, comments, comment reads, view-only games |
| **localStorage** | development goal defs, development goal assignments, referee goal progress, development notes, organisation settings, notification preferences, onboarding dismissed state, reminder seen-keys, review–goal links, clip–goal links, referee comment read state, assignment watched-clip progress |
| **React state (in-memory, session only)** | notifications (seeded with sample data on mount), coaching queue (derived), analytics (derived) |

---

## localStorage Key Table

All keys are written and read client-side. None are sent to the server.

| Key pattern | Hook / Component | Data stored | Scoping | Migration risk |
|---|---|---|---|---|
| `refcoach_goal_defs_{orgId}` | `useDevelopmentGoals` | `DevGoalDef[]` — reusable goal templates | org-scoped | **High** — three-layer split on migration |
| `refcoach_goal_assignments_{orgId}` | `useDevelopmentGoals` | `DevGoalAssignment[]` — assignment records | org-scoped | High — joins to defs and referee goals |
| `refcoach_referee_goals_{orgId}` | `useDevelopmentGoals` | `RefereeGoal[]` — per-referee progress | org-scoped | High — per-referee progress rows |
| `refcoach_dev_goals_{orgId}` | `useDevelopmentGoals` | `_V1DevelopmentGoal[]` — legacy flat format | org-scoped | **Cleanup only** — migrated on first load, then removed |
| `refcoach_dev_notes_{orgId}` | `useDevelopmentNotes` | `DevelopmentNote[]` — coaching notes | org-scoped | Medium — no user-level scoping beyond `createdBy` field |
| `refcoach_review_goal_links_{orgId}` | `useReviewGoalLinks` | `ReviewGoalLink[]` — review ↔ goal links | org-scoped | Medium — new Supabase table needed |
| `refcoach_clip_goal_links_{orgId}` | `useReviewGoalLinks` | `ClipGoalLink[]` — clip ↔ goal links | org-scoped | Medium — new Supabase table needed |
| `refcoach_org_settings_{orgId}` | `useOrganisationSettings` | `OrganisationSettings` — wide settings object | org-scoped | Medium — wide shape; decide JSONB vs normalised |
| `refcoach_notif_prefs_{userId}` | `useNotificationPreferences` | `NotificationPreferences` — toggle prefs per user | user-scoped | Low — small row per user; fits `user_preferences` table |
| `refcoach_reminder_keys_{userId}` | `useReminderEngine` | `string[]` — dedup keys for fired reminders | user-scoped | Low — can be replaced by a `sent_reminders` table |
| `refcoach_onboarding_dismissed_{userId}` | `useOnboardingDismissed` | `"true"` | user-scoped | Low — single boolean per user |
| `refcoach_watched_clips_{assignmentUserId}` | `PlaylistDetailScreen.tsx` | `string[]` — watched clip IDs | assignment-user-scoped | Medium — should migrate to `learning_assignment_users` progress column |
| `refcoach_starred_comment_threads_{userId}` | `RefereeCommentsScreen.tsx` | `string[]` — starred thread keys | user-scoped | Low — new `user_thread_state` table or JSON column |
| `refcoach_dismissed_comment_threads_{userId}` | `RefereeCommentsScreen.tsx` | `string[]` — dismissed thread keys | user-scoped | Low |
| `refcoach_thread_seen_at_{userId}` | `RefereeCommentsScreen.tsx` | `Record<string, ISO>` — last-seen timestamps | user-scoped | Low — similar to `review_comment_reads` already in Supabase |
| `sh-split-pct` | `RefereeStatsHub.tsx` | `number` — panel split ratio | no user/org scope | None — pure UI preference, keep in localStorage |

---

## Data Hook Table

| Hook | Backend | Tables / Keys | Mutations exposed | Notes |
|---|---|---|---|---|
| `useAuthSession` | Supabase Auth + DB | `auth.users`, `profiles`, `organisation_members` | `login`, `logout`, `selectOrganisation` | Session fully server-backed |
| `useOrganisations` | Supabase | `organisations` (read), API routes (write) | `refreshMembers`, `refreshOrganisations` | Calls `getOrganisations()` and `getMembersForOrganisation()` |
| `useReviews` | Supabase | `reviews`, `clips` | `openReviewForEdit`, `createReview`, `saveReviewMeta`, `submitReview`, `saveCompleteLater`, `deleteReview`, `clearReviewClips`, `buildTag`, `deleteClip` | Large hook; owns all review + clip state |
| `usePlaylists` | Supabase | `clip_playlists`, `clip_playlist_items` | `createPlaylist`, `updatePlaylist`, `deletePlaylist`, `updateItemPositions`, `removeItem`, `updateItemNote` | Fully Supabase-backed |
| `useAssignments` | Supabase | `learning_assignments`, `learning_assignment_users` | `createAssignment`, `updateAssignment`, `deleteAssignment`, `assignUsers`, `removeUser`, `updateUserStatus` | Fully Supabase-backed |
| `useGroups` | Supabase | `groups`, `group_members` | `createGroup`, `updateGroup`, `deleteGroup`, `setGroupMembers` | Fully Supabase-backed |
| `usePermissions` | Supabase | `organisation_user_permissions` | `savePerms` | Fully Supabase-backed |
| `useUnreadCounts` | Supabase | `review_comments`, `review_comment_reads` | `refresh` (read-only) | Derived counts; no localStorage |
| `usePlaylistLearningClips` | API route (`/api/playlist/learning-clips`) | `clip_playlists`, `clip_playlist_items`, `reviews`, `clips` via service role | None (read-only) | Bypasses RLS via server-side API; returns `ReviewRecord[]` + `CodedTag[]` |
| `useViewOnlyGames` | Supabase | `view_only_games`, `view_only_game_assignments` | `createGame`, `updateGame`, `deleteGame`, `assignViewers`, `removeViewer` | Fully Supabase-backed |
| `useDevelopmentGoals` | **localStorage** | `refcoach_goal_defs_{orgId}`, `refcoach_goal_assignments_{orgId}`, `refcoach_referee_goals_{orgId}` | `assignGoal`, `updateGoalStatus`, `updateGoalNotes`, `archiveGoal`, `deleteGoalDef` | Three-layer architecture; v1 migration active |
| `useDevelopmentNotes` | **localStorage** | `refcoach_dev_notes_{orgId}` | `createNote`, `updateNote`, `deleteNote` | No user-level security beyond `createdBy` field |
| `useReviewGoalLinks` | **localStorage** | `refcoach_review_goal_links_{orgId}`, `refcoach_clip_goal_links_{orgId}` | `createReviewGoalLink`, `removeReviewGoalLink`, `createClipGoalLink`, `removeClipGoalLink` | Explicitly marked "no Supabase schema required" in type file |
| `useOrganisationSettings` | **localStorage** | `refcoach_org_settings_{orgId}` | `updateSettings` | Very wide settings object; section-level merge on load |
| `useNotificationPreferences` | **localStorage** | `refcoach_notif_prefs_{userId}` | `updatePreferences`, `resetPreferences` | |
| `useNotifications` | **In-memory only** | None — React state | `createNotification`, `markRead`, `markAllRead`, `deleteNotification` | Seeded with `buildSampleNotifications()` on every mount; lost on page reload |
| `useReminderEngine` | localStorage (dedup) + in-memory (firing) | `refcoach_reminder_keys_{userId}` | None (write-only side-effect via `addNotification`) | Runs client-side in `useEffect`; fires once per session per key |
| `useOnboardingDismissed` | **localStorage** | `refcoach_onboarding_dismissed_{userId}` | `dismiss` | Simple boolean flag |

---

## Supabase Tables Already in Production

All of the following tables exist and are accessed by the live application. RLS is expected to be active.

| Table | Purpose | Key columns |
|---|---|---|
| `auth.users` | Supabase Auth managed | id, email |
| `profiles` | Display name + email | id (= auth.users.id), name, email |
| `organisations` | Org records | id, name, timezone, brand_colour, logo_url, created_at |
| `organisation_members` | Membership + role | user_id, organisation_id, role |
| `organisation_user_permissions` | Per-user permission overrides | user_id, organisation_id, permission_key, granted |
| `reviews` | Review sessions | id, organisation_id, game, educator_id, referee1_id–3_id, status, video_link, timestamp_offset, game_date, created_at |
| `clips` | Coded clip tags | id, review_id, many tag fields (outcome, category, position, etc.) |
| `clip_playlists` | Playlists | id, organisation_id, title, description, created_by, created_at |
| `clip_playlist_items` | Items in playlists | id, playlist_id, review_id, tag_id, position, creator_note |
| `learning_assignments` | Assignment header | id, organisation_id, playlist_id, title, instructions, due_date, required, assigned_by |
| `learning_assignment_users` | Per-referee assignment record | id, assignment_id, user_id, status, assigned_at, started_at, completed_at |
| `groups` | Referee groups | id, organisation_id, name, description, colour, created_at |
| `group_members` | Group membership | id, group_id, user_id, created_at |
| `review_comments` | Clip-level comments | id, review_id, tag_id, user_id, body, created_at |
| `review_comment_reads` | Unread tracking | user_id, review_id, tag_id, last_read_at |
| `view_only_games` | Viewer-role game access | id, organisation_id, title, video_url, learning_category, created_at |
| `view_only_game_assignments` | Viewer access grants | game_id, viewer_user_id |

---

## Tables Needed (Do Not Exist Yet)

These are required for the localStorage entities to be migrated:

| Proposed table | Maps from | Priority |
|---|---|---|
| `development_goal_defs` | `refcoach_goal_defs_{orgId}` | High |
| `development_goal_assignments` | `refcoach_goal_assignments_{orgId}` | High |
| `referee_goals` | `refcoach_referee_goals_{orgId}` | High |
| `development_notes` | `refcoach_dev_notes_{orgId}` | High |
| `review_goal_links` | `refcoach_review_goal_links_{orgId}` | Medium |
| `clip_goal_links` | `refcoach_clip_goal_links_{orgId}` | Medium |
| `organisation_settings` | `refcoach_org_settings_{orgId}` | Medium (single JSONB row per org) |
| `notifications` | In-memory `useNotifications` | Medium |
| `notification_preferences` | `refcoach_notif_prefs_{userId}` | Low |
| `sent_reminders` | `refcoach_reminder_keys_{userId}` | Low |
| `user_thread_state` | `refcoach_starred/dismissed/seen_at_{userId}` | Low (or extend `review_comment_reads`) |

---

## Seeded / Sample Data

| Location | Data | Should migrate? |
|---|---|---|
| `useNotifications.ts` → `buildSampleNotifications()` | 5 hardcoded in-memory notifications (IDs `sample_1`–`sample_4`, `sample_org`) seeded on every mount based on active role | **Remove** when notifications table exists. Replace with real data from `notifications` table. |
| Supabase data (dev environment) | Real review, clip, assignment, playlist, group data entered by hand during development | Stays in Supabase dev instance; use a seed script for new dev environments |
| `DEFAULT_ORG_SETTINGS` in `lib/types/organisationSettings.ts` | Default settings applied when no stored settings exist | **Keep as code defaults** — used as fallback when `organisation_settings` row is missing |

---

## Entity-to-Table Draft Map

```
DevGoalDef              → development_goal_defs
  id, organisationId, title, description,
  category, priority, createdBy, createdAt, updatedAt

DevGoalAssignment       → development_goal_assignments
  id, goalId, organisationId, assignmentType,
  assignedRefereeIds (junction), assignedBy, assignedAt

RefereeGoal             → referee_goals
  id, goalId, refereeId, organisationId, status,
  notes, targetReviewDate, createdAt, updatedAt,
  completedAt, archivedAt

DevelopmentNote         → development_notes
  id, refereeId, organisationId, title, body,
  noteType, visibility, createdBy, createdAt, updatedAt,
  linkedGoalId

ReviewGoalLink          → review_goal_links
  id, organisationId, reviewId, goalDefId, refereeId,
  linkedAt, linkedBy, createdGoalFromReview

ClipGoalLink            → clip_goal_links
  id, organisationId, clipId, reviewId,
  goalDefId, refereeId

OrganisationSettings    → organisation_settings
  organisationId (PK), settings JSONB (or normalised columns)

Notification            → notifications
  id, organisationId, userId, type, title, message,
  relatedEntityType, relatedEntityId, createdAt, createdBy,
  isRead, readAt, priority, actionLabel, actionRoute, metadata

NotificationPreferences → notification_preferences
  userId (PK), inAppEnabled, reviewNotifications,
  assignmentNotifications, learningNotifications,
  developmentGoalNotifications, organisationNotifications,
  systemNotifications

SentReminder (dedup)    → sent_reminders
  id, userId, reminderKey, firedAt

UserThreadState         → user_thread_state (or extend review_comment_reads)
  userId, threadKey, starred, dismissed, seenAt
```

`assignedRefereeIds` on `DevGoalAssignment` should become a junction table `development_goal_assignment_referees (assignmentId, refereeId)`.

---

## Migration Risks

### 1. Development goals — three-layer split
`useDevelopmentGoals` uses three separate localStorage keys per org, joined by `id` references at runtime into `RefereeGoalView`. The migration needs to correctly split flat v1 legacy records (still possible via `migrateV1()`) and populate all three tables atomically. A data migration script is essential before removing localStorage.

### 2. Organisation settings — wide object
`OrganisationSettings` has ~60 fields across 8 sections. The section-level merge in `loadFromStorage()` means partial settings are common. Options: single JSONB column (simple, hard to query), or one row per section (more RLS granularity). The current section-merge logic must be replicated in the API layer.

### 3. Notifications — in-memory only, seeded each session
`useNotifications` seeds 5 hardcoded sample notifications on every mount. There is no persistence — notifications are lost on page reload. The migration requires both a `notifications` table and a decision on whether historical notifications should be preserved or reset. The `buildSampleNotifications()` function should be removed entirely once the table exists.

### 4. Review–goal links — no Supabase table, explicitly noted
The type file for `ReviewGoalLink` includes a comment: *"Stored in localStorage; no Supabase schema change required."* This was an intentional deferral. Both `review_goal_links` and `clip_goal_links` tables need to be created.

### 5. Watched clips progress — scoped to assignment user record
`refcoach_watched_clips_{assignmentUserId}` is scoped to `learning_assignment_users.id`, not `user_id`. This is correct (one user can be assigned the same playlist in multiple assignments), but the migration should add a `watched_clip_ids JSONB` column to `learning_assignment_users` rather than a separate table.

### 6. Reminders — client-side only, no server scheduling
`useReminderEngine` fires reminder notifications on page load using `useEffect`. The dedup key is stored in `refcoach_reminder_keys_{userId}`. This works as a short-term solution but will miss reminders if the user doesn't visit the app. True background reminders require server-side jobs (cron or Supabase scheduled functions). The localStorage dedup key can migrate to a `sent_reminders` table, but the firing logic must move server-side eventually.

### 7. Comment thread state — partial overlap with `review_comment_reads`
`refcoach_thread_seen_at_{userId}` records per-thread last-seen timestamps. This overlaps conceptually with the `review_comment_reads` Supabase table. The "starred" and "dismissed" states have no equivalent in Supabase. Decide whether to extend `review_comment_reads` with `starred` and `dismissed` columns, or create a new `user_thread_state` table.

### 8. RLS policy gaps for new tables
All new tables will need RLS policies matching the patterns used by existing tables:
- Org-scoped tables: `organisation_id = auth.jwt() ->> 'org_id'` or via `organisation_members` join.
- User-scoped tables: `user_id = auth.uid()`.
- `development_notes` with `visibility = "Educator Only"` will need a policy that hides notes from the referee they reference.
- `development_goal_defs` and `development_goal_assignments` are created by educators/admins but read by referees — policies must allow referees to read their assigned goals.

### 9. `assignedRefereeIds` array on DevGoalAssignment
Currently stored as a JSON array field `assignedRefereeIds: string[]`. In Supabase this should become a junction table. The `assignmentType = "Everyone"` case means "all current org referees at assignment time" — the migration should resolve this to explicit referee IDs at write time.

### 10. No userId scoping on development notes
`DevelopmentNote.visibility = "Educator Only"` is enforced only in UI — the data is currently readable by any code that reads the org's localStorage key. The Supabase migration must enforce this via RLS on `development_notes`.

---

## Recommended Migration Order

### Stage 1 — Auth, profiles, organisations, memberships ✅ Already done
Supabase Auth, `profiles`, `organisations`, `organisation_members`, and `organisation_user_permissions` are live.

### Stage 2 — Reviews, clips ✅ Already done
`reviews` and `clips` tables are live and used by `useReviews`.

### Stage 3 — Learning: playlists, assignments, groups ✅ Already done
`clip_playlists`, `clip_playlist_items`, `learning_assignments`, `learning_assignment_users`, `groups`, and `group_members` are live.

### Stage 4 — Comments ✅ Already done
`review_comments` and `review_comment_reads` are live.

### Stage 5 — Development goals, notes, links ← **Next**
Highest value; most data risk. Suggested substeps:
1. Create `development_goal_defs`, `development_goal_assignment_referees` junction, `development_goal_assignments`, `referee_goals` tables.
2. Create `development_notes`.
3. Create `review_goal_links`, `clip_goal_links`.
4. Write and test migration script to read each org's localStorage keys and populate Supabase.
5. Write the `useDevelopmentGoals`, `useDevelopmentNotes`, `useReviewGoalLinks` hooks to read from Supabase.
6. After validation: remove localStorage write calls; keep read-fallback during transition period.
7. Remove v1 migration path (`KEY_V1_LEGACY`, `migrateV1()`).

### Stage 6 — Organisation settings
1. Create `organisation_settings` table (JSONB column recommended for first pass).
2. Migrate `useOrganisationSettings` to read/write via a new API route (`/api/admin/org-settings/advanced`).
3. Keep the section-merge fallback logic in the hook for missing fields.

### Stage 7 — Notifications, preferences, reminders
1. Create `notifications`, `notification_preferences`, `sent_reminders` tables.
2. Migrate `useNotifications` to Supabase; remove `buildSampleNotifications()`.
3. Migrate `useNotificationPreferences`.
4. Migrate reminder dedup keys to `sent_reminders`.
5. (Future) Move reminder firing logic to Supabase scheduled functions or Edge Functions.

### Stage 8 — User UI state
1. Extend `learning_assignment_users` with `watched_clip_ids JSONB`.
2. Migrate or extend `review_comment_reads` for thread star/dismiss state.
3. Create `notification_preferences` rows for all existing users.
4. `refcoach_onboarding_dismissed_{userId}` — add `onboarding_dismissed` boolean to `profiles` or `user_preferences`.

---

## Phase 13.2 Readiness Notes

Before beginning schema work, confirm:

1. **Supabase project** — prod and dev instances are provisioned. Dev instance available for schema iteration without affecting prod.
2. **Environment variables** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set for both environments (`.env.local` for dev, Vercel/host env for prod). `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the browser — API routes only.
3. **Existing Supabase tables** — verify that `reviews`, `clips`, `clip_playlists`, etc. have the expected columns by running a test query in the Supabase dashboard.
4. **RLS baseline** — review current RLS policies on existing tables before adding new ones to ensure the pattern is consistent.
5. **Type alignment** — the TypeScript types in `lib/types/` are the source of truth for column shapes. When creating SQL `CREATE TABLE` statements, use these as the reference.
6. **Migration script approach** — for Stage 5, a one-time CLI script (Node.js or Supabase Edge Function) that reads all org `localStorage` keys from a test browser session export, or a temporary admin UI "Export to Supabase" action, is preferable to manual data entry.
7. **V1 legacy cleanup** — `KEY_V1_LEGACY` / `migrateV1()` in `useDevelopmentGoals` can be removed as part of Stage 5 since all v1 data will have been migrated to the three-layer localStorage format already.
