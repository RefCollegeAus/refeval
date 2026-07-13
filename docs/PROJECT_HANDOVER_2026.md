# RefCoach — Project Handover 2026

**Last updated:** July 2026 (updated Phase 18.6)  
**Status:** Phase 18.1–18.7 complete — production schema confirmed; RLS enabled on all 25 tables; ready for controlled beta  
**Source of truth:** The Git repository. This document describes the current implementation as read from the codebase. Do not rely on earlier conversations or assumptions.

---

## Table of Contents

1. [RefCoach Overview](#1-refcoach-overview)
2. [Technology](#2-technology)
3. [Architecture](#3-architecture)
4. [Current Modules](#4-current-modules)
5. [Database Summary](#5-database-summary)
6. [User Roles](#6-user-roles)
7. [UI / UX Philosophy](#7-ui--ux-philosophy)
8. [Current Development Status](#8-current-development-status)
9. [Known Beta Issues](#9-known-beta-issues)
10. [Future Roadmap](#10-future-roadmap)
11. [Development Workflow](#11-development-workflow)
12. [Definition of Done](#12-definition-of-done)

---

## 1. RefCoach Overview

### Product Vision

RefCoach is a coaching and development platform for basketball referees and their educators. It gives referee educators a structured workflow to evaluate game footage, code decisions, and build a longitudinal development record for each referee they coach. Referees access their evaluations, complete assigned learning, track their goals, and engage with feedback from their educators.

### Primary Users

| Role | Who they are |
|---|---|
| **Educator** | A referee coach or assessor who evaluates games, assigns learning, and tracks development |
| **Referee** | A game official who receives evaluations, completes assignments, and reviews feedback |
| **Admin** | An organisation administrator who manages members, settings, and permissions |
| **Super Admin** | A platform-wide administrator with access across all organisations |
| **Viewer** | A read-only stakeholder who can watch assigned game footage only |

### Core Philosophy

- **Educator-first:** Every workflow is designed around the educator's coaching intent. The referee receives the output; the educator controls the frame.
- **Longitudinal development:** Reviews, goals, notes, and assignments build a continuous record over a referee's career — not isolated one-off assessments.
- **Structured feedback:** Clip-level commenting, official summaries, and development goals give educators precise tools to communicate what was good and what needs work.
- **Referee agency:** Referees are not passive recipients. They complete learning, respond to reflections, attempt simulators, and view their own stats.

### Design Principles

- Clean, distraction-free UI — the video and the coaching decision are the focus
- Minimal navigation chrome — content-first layout
- Role-aware — every screen and data query is scoped to the active user's role and organisation
- No placeholder data in production — only real data from the database is displayed

---

## 2. Technology

| Concern | Choice |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **UI** | React 18 — no UI framework, all custom CSS |
| **Icons** | Lucide React |
| **Authentication** | Supabase Auth (email/password + invite flow) |
| **Database** | Supabase Postgres with Row Level Security |
| **Storage** | Supabase Storage (logo upload — not yet active) |
| **Deployment** | Vercel (two projects: `refeval` for production, `refeval-dev` for development) |
| **Export** | xlsx (spreadsheet export for analytics) |
| **Package manager** | npm |

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL (safe for browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY  — Supabase anon key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY      — Service role key (server-only, never exposed to browser)
```

The service role key is used exclusively in Next.js API routes (`app/api/admin/*`). It is never set as a `NEXT_PUBLIC_` variable.

---

## 3. Architecture

### Routing

RefCoach uses Next.js App Router but operates as a **single-page application**. There is one route: `app/page.tsx`. All navigation is handled by a `screen` state variable of type `Screen` (defined in `lib/types/auth.ts`).

```ts
type Screen =
  | "login" | "org-selector" | "educator" | "referee" | "viewer"
  | "database" | "reviewer" | "refereeReview" | "org-settings"
  | "user-profile" | "comment-inbox" | "referee-stats" | "clip-library"
  | "learning-library" | "playlists" | "playlist-detail" | "team-management"
  | "assignments" | "assignment-detail" | "my-learning" | "learning-runner"
  | "quiz-builder" | "learning-hub" | "learning-progress" | "groups"
  | "organisation" | "referee-development" | "referee-comments"
  | "notifications" | "simulator-builder" | "simulator-runner"
  | "simulator-analytics";
```

Navigating between screens is done by calling `setScreen("target-screen")`. There are no URL parameters or dynamic routes. Deep linking is not supported.

A `useEffect` in `app/page.tsx` watches the active `screen` and `activeRole` and redirects if a role attempts to access a forbidden screen.

### Authentication

`lib/hooks/useAuthSession.ts` owns all auth state. On mount it calls `supabase.auth.getUser()`, fetches the user's `profiles` row and all `organisation_members` rows, then sets the active session. If the user belongs to a single organisation they are routed directly to their role's home screen. If they belong to multiple organisations they see the `org-selector` screen to choose.

Session state is passed as a prop (`session: RefEvalSession | null`) to every screen component that needs it. There is no React context for auth — all state flows from `app/page.tsx` downward.

### Organisation Model

Every piece of data is scoped to an `organisation_id`. Supabase RLS policies enforce this at the database level using the helper functions `has_org_role()`, `is_org_member()`, and `is_super_admin()` defined in the schema.

A user can belong to multiple organisations with different roles in each. Switching organisations reloads the active session context without a page reload.

### Permissions

A two-layer permission model is implemented:

1. **Role defaults** — each role has a default set of permissions defined in `lib/types/permissions.ts` (`ROLE_DEFAULT_PERMISSIONS`). These are applied when no custom overrides exist.
2. **Custom overrides** — admins can grant or revoke individual permissions per user via `organisation_user_permissions`. When a row exists for a user, only those explicit grants apply (role defaults are ignored for that user).

The `hasPermission(customPerms, role, key)` utility in `lib/utils/permissions.ts` implements this logic. `super_admin` always returns `true` regardless of stored permissions.

**Key permission gates in `app/page.tsx`:**
- `canViewClipLibrary` — gates Clip Library and Learning Library screens
- `canAccessPlaylists` — gates Playlists and Playlist Detail screens
- `canViewAssignments` — gates Assignments, Assignment Detail, Quiz Builder screens
- `canViewGroups` — gates Groups screen

### Header and Navigation

`components/Header.tsx` renders the top navigation bar. It receives `setScreen` as a prop and renders navigation items appropriate to the active role. The Header is rendered inside each screen's page shell (not globally), which means each screen controls its own chrome.

### Shared Components

| Component | Location | Purpose |
|---|---|---|
| `AppToast` | `components/common/AppToast.tsx` | Renders toast notifications from `lib/toast.ts` custom DOM events |
| `ConfirmModal` | `components/common/ConfirmModal.tsx` | Destructive action confirmation dialog |
| `ClipPreview` | `components/common/ClipPreview.tsx` | Video player with timestamp seek — used in clip library, reviews, assignments |
| `GlobalSearch` | `components/common/GlobalSearch.tsx` | Client-side search across reviews, assignments, playlists, members, groups |
| `RecipientPicker` | `components/common/RecipientPicker.tsx` | Reusable member/group selector used in assignment and goal creation modals |
| `DateRangeFilter` | `components/common/DateRangeFilter.tsx` | Date range picker for analytics and review filters |
| `OnboardingPanel` | `components/common/OnboardingPanel.tsx` | First-run onboarding checklist |

### Hooks

All Supabase data fetching is done in custom React hooks in `lib/hooks/`. Each hook owns its own loading/error state and re-fetch function. Data is passed as props from `app/page.tsx` to screen components.

| Hook | Tables | Notes |
|---|---|---|
| `useAuthSession` | `profiles`, `organisation_members` | Auth and session management |
| `useReviews` | `reviews`, `clips` | All review and clip data |
| `useAssignments` | `learning_assignments`, `learning_assignment_users` | Assignment lifecycle |
| `useSimulatorSessions` | `simulator_sessions`, `simulator_events`, `simulator_attempts`, `simulator_responses` | Simulator sessions and scoring |
| `usePlaylists` | `clip_playlists`, `clip_playlist_items` | Playlist management |
| `useViewOnlyGames` | `view_only_games`, `view_only_game_assignments` | Viewer portal games |
| `useGroups` | `groups`, `group_members` | Group management |
| `usePermissions` | `organisation_user_permissions` | Custom permission overrides |
| `useUnreadCounts` | `review_comments`, `review_comment_reads` | Comment notification badge |
| `useDevelopmentGoals` | `development_goal_defs`, `development_goal_assignments`, `development_goal_assignment_referees`, `referee_goals` | Development goals (requires draft 018) |
| `useOrganisationSettings` | localStorage only | Organisation settings (not yet in Supabase) |
| `useReviewGoalLinks` | localStorage only | Review–goal and clip–goal links |
| `useDevelopmentNotes` | localStorage only | Coaching notes |
| `useNotifications` | In-memory only | Notification list (no persistence) |

### API Routes

Server-side operations that require the service role key are in `app/api/admin/`:

| Route | Method | Purpose |
|---|---|---|
| `invite/route.ts` | POST | Invite user by email, create profile, add to org |
| `invite/resend/route.ts` | POST | Resend invitation email |
| `member/route.ts` | PATCH / DELETE | Update member role / remove member |
| `members/route.ts` | GET | List enriched members (with auth metadata) |
| `org-settings/route.ts` | PATCH | Update organisation name, timezone, brand colour, logo |
| `profile/route.ts` | PATCH | Update current user's display name |
| `user-profile/route.ts` | PATCH | Admin update of another user's name/email |
| `user-password/route.ts` | POST | Admin reset of another user's password |
| `playlist/learning-clips/route.ts` | GET | Fetch playlist clips for a learner (bypasses RLS via service role) |

### Data Flow

```
Supabase
   ↓
lib/hooks/* (fetch + mutate)
   ↓
app/page.tsx (aggregates all hook state)
   ↓
screen components (receive data + callbacks as props)
   ↓
lib/services/* (for multi-step or service-role operations)
   ↓
app/api/admin/* (server-side, uses SUPABASE_SERVICE_ROLE_KEY)
```

---

## 4. Current Modules

### Dashboard

**Purpose:** Landing screen for educators, admins, and super admins after login.

**Current functionality:**
- KPI cards showing reviews in-progress, completed this week, and total
- Review list with filters (status, referee, game, date range, has-video)
- Sort options (newest, oldest, last updated, referee name, game name)
- Create new review button
- Quick navigation to comment inbox

**Major components:** `components/educator/EducatorDashboard.tsx`

**Database tables:** `reviews`

---

### Reviews

**Purpose:** The core educator workflow — create, manage, and complete video reviews.

**Current functionality:**
- Create new review (auto-saves with "New Review" title)
- Edit review metadata: game name, game date, referee assignments (up to 3 officials), video URL, timestamp offset
- List view with full filtering on the dashboard
- Status transitions: In Review → Completed
- Delete review (with clip deletion cascade)
- Per-official final summary modal (positives, work-ons, next focus)
- Reviews created by the Simulator Builder are flagged `is_simulator: true` and excluded from normal review lists

**Major components:** `components/educator/EducatorDashboard.tsx`, `components/educator/ReviewDevelopmentPanel.tsx`

**Database tables:** `reviews`

---

### Video Coding

**Purpose:** Frame-level decision tagging on game footage.

**Current functionality:**
- YouTube and direct video (MP4/WebM) support
- Keyboard shortcut coding (spacebar to pause/play, number keys for outcome coding)
- Clip creation with: time, adjusted time (offset-corrected), outcome, category, position, coverage, mode, referee target, extra officials, notes
- Clip editing and deletion
- `is_learning_clip` flag to promote clips to the Learning Library
- Per-clip comment threads (educator + referee)
- Timestamp offset correction (configurable seconds to align video time to game clock)

**Major components:** `app/page.tsx` (reviewer screen — inline), `components/ReviewComments.tsx`

**Database tables:** `reviews`, `clips`, `review_comments`, `review_comment_reads`

---

### Analytics

**Purpose:** Performance analysis per referee.

**Current functionality:**
- Referee Stats Hub: outcome distribution donut chart, category breakdown, position breakdown, coverage breakdown, game timeline
- Date range filtering
- Per-review drill-down
- Export (XLSX)

**Major components:** `components/referee/RefereeStatsHub.tsx`

**Database tables:** `reviews`, `clips` (client-side aggregation from loaded data)

---

### Clip Library

**Purpose:** Organisation-wide library of all coded clips, filterable and searchable.

**Current functionality:**
- Full clip list across all reviews
- Filter by outcome, category, referee, date
- Preview clips in-place
- Promote clip to Learning Library (`is_learning_clip` flag)

**Major components:** `components/admin/ClipLibraryScreen.tsx`

**Database tables:** `clips`, `reviews`

**Access:** Requires `learning.clip_library` permission. Educators have this by default.

---

### Playlists

**Purpose:** Curator-organised collections of learning clips for assignment.

**Current functionality:**
- Create / edit / archive playlists
- Add clips from the Clip Library or Learning Library to a playlist
- Reorder clips within a playlist (drag-order stored as `position`)
- Add curator notes per clip (`creator_note`)
- Playlist detail view with preview mode
- Archived playlists hidden from list (filtered by `archived_at IS NULL`)

**Major components:** `components/admin/PlaylistsScreen.tsx`, `components/admin/PlaylistDetailScreen.tsx`, `components/learning/ClipPickerModal.tsx`

**Database tables:** `clip_playlists`, `clip_playlist_items`

**Note:** `clip_playlists.archived_at` must exist in production. Apply `migrations_draft/027_playlist_archive.sql` if missing.

---

### Learning Assignments

**Purpose:** Assign structured learning tasks to referees or groups.

**Current functionality:**
- Create assignments linking a playlist, simulator session, or standalone quiz to a set of users/groups
- Assignment types: Playlist, Simulator, Quiz, or combined
- Optional due date and required flag
- Referee-level completion tracking (Assigned / Started / Completed)
- Assignment detail: per-referee progress table with status, score, completion date
- Edit assignment title, instructions, due date
- Add/remove assignees after creation

**Assignment runner (referee-side):**
- Playlist activity: watch clips, mark watched, track progress
- Reflection activity: respond to open-ended questions per clip
- Quiz activity: multiple-choice questions with configurable retake policy
- Simulator activity: launched inline via `SimulatorRunnerScreen`

**Major components:** `components/admin/AssignmentsScreen.tsx`, `components/admin/AssignmentDetailScreen.tsx`, `components/admin/QuizBuilderScreen.tsx`, `components/learning/LearningAssignmentRunner.tsx`, `components/learning/PlaylistActivity.tsx`, `components/learning/ReflectionActivity.tsx`, `components/learning/QuizActivity.tsx`, `components/learning/QuizPlayer.tsx`

**Database tables:** `learning_assignments`, `learning_assignment_users`, `clip_playlists`, `clip_playlist_items`, `simulator_sessions`

**Note:** Several columns on these tables require draft migrations to be promoted before the full assignment feature works in production. See §9.

---

### Learning Notes (Coaching Notes)

**Purpose:** Private coaching notes written by educators against a referee's development record.

**Current functionality:**
- Create notes with type (Observation, Strength, Development Area, Goal Update, Other) and visibility (Private / Visible to Referee)
- Notes appear in the referee's development timeline
- Chronological display alongside development goals

**Major components:** `components/educator/RefereeDevelopmentScreen.tsx`

**Storage:** Currently `localStorage` (`refcoach_dev_notes_{orgId}`). Not yet in Supabase.

---

### Development Goals

**Purpose:** Structured, assignable development objectives that track a referee's long-term improvement.

**Current functionality:**
- Create goal definitions (title, description, category, priority)
- Assign goals to individual referees or the entire org
- Per-referee progress records (Active / Completed / Archived)
- Update referee progress notes and target review date
- Status transitions: Active → Completed → Archived → Active (reopen)
- Soft-delete goal definitions (`deleted_at`)
- Development timeline showing goals + notes in chronological order

**Major components:** `components/educator/RefereeDevelopmentScreen.tsx`, `components/referee/RefereeGoalsPanel.tsx`

**Database tables:** `development_goal_defs`, `development_goal_assignments`, `development_goal_assignment_referees`, `referee_goals`

**Note:** These four tables are in `migrations_draft/018_development_goals.sql`. They must be applied to production before development goals work.

---

### Reflection Questions

**Purpose:** Open-ended questions attached to a playlist assignment, requiring written responses from the referee.

**Current functionality:**
- Quiz Builder screen: add/edit/reorder reflection questions per assignment
- Referee completes reflection in the assignment runner
- Educator views responses in Assignment Detail

**Major components:** `components/admin/QuizBuilderScreen.tsx`, `components/learning/ReflectionActivity.tsx`

**Database tables:** `learning_assignments.questions` (jsonb), `learning_assignment_users.reflection_responses` (jsonb), `learning_assignment_users.reflection_submitted_at`

**Note:** These columns require `migrations_draft/026_assignment_reflection_questions.sql`.

---

### Simulator

**Purpose:** A video-based decision-making challenge for referees. The video pauses at pre-coded decision points; the referee must make the correct call.

**Current functionality:**
- **Educator flow:** Create simulator session → code decisions in the Review Coder → publish → assign to referees
- **Referee flow:** Launch simulator, choose difficulty level (Foundation / Developing / Intermediate / Advanced / Expert), respond to timed prompts, receive score and decision breakdown
- Five difficulty levels control which attributes (outcome, category, position, coverage) are scored
- Per-attempt score and response storage
- Analytics dashboard: overview stats, per-referee breakdown, category performance, decision analysis
- Assignment integration: simulator assignments track completion and attempt count

**Major components:** `components/admin/SimulatorBuilderScreen.tsx`, `components/admin/SimulatorAssignmentModal.tsx`, `components/admin/SimulatorAnalyticsDashboard.tsx`, `components/learning/SimulatorRunnerScreen.tsx`

**Database tables:** `simulator_sessions`, `simulator_events`, `simulator_attempts`, `simulator_responses`, `reviews` (linked via `review_id`), `clips` (decisions stored as clips)

---

### Notifications

**Purpose:** In-app notification centre for system and coaching events.

**Current functionality:**
- Bell icon in header with unread badge (driven by `review_comment_reads`)
- Notification centre panel with categorised list
- Mark as read

**Storage:** Currently in-memory only. Seeded with sample data on mount. No persistence.

**Major components:** `components/NotificationCentre.tsx`

**Note:** Notifications are in-memory (session only) — generated during the active session and cleared on page reload. Sample/fictional seeding was removed in Phase 18.5. A `notifications` table is designed in `docs/supabase-schema-draft.md` but not yet created.

---

### Organisation Management

**Purpose:** Organisation-level settings and branding.

**Current functionality:**
- Organisation name editing
- Timezone selection
- Brand colour picker
- Logo URL (upload UI placeholder — Supabase Storage not yet connected)

**Major components:** `components/organisation/OrganisationScreen.tsx`, `components/organisation/SettingsLayout.tsx`

**Database tables:** `organisations` (name, timezone, brand_colour, logo_url)

**API routes:** `app/api/admin/org-settings/route.ts`

---

### Members

**Purpose:** Member management for admins.

**Current functionality:**
- List all members with role, join date, invitation status, last sign-in
- Invite new member by email (sends Supabase invitation email)
- Resend invitation
- Change member role
- Remove member from organisation
- Edit member name and email (admin)
- Reset member password (admin)
- Custom permission override per member

**Major components:** `components/admin/MembersScreen.tsx`, `components/admin/ManageUserModal.tsx`

**Database tables:** `organisation_members`, `profiles`, `organisation_user_permissions`

**API routes:** `app/api/admin/invite/`, `app/api/admin/member/`, `app/api/admin/members/`, `app/api/admin/user-profile/`, `app/api/admin/user-password/`

**Security:** Only `super_admin` can assign `admin` or `super_admin` roles. Regular admins can assign `educator`, `referee`, or `viewer` roles only.

---

### Groups

**Purpose:** Named collections of members used for bulk assignment targeting.

**Current functionality:**
- Create, edit, delete groups (name, description, colour)
- Add/remove members from groups
- Groups appear as targets in assignment and goal creation flows via `RecipientPicker`

**Major components:** `components/educator/GroupsScreen.tsx`

**Database tables:** `groups`, `group_members`

---

### User Management (Team Management)

**Purpose:** Super-admin view of all users and organisations on the platform.

**Current functionality:**
- List all organisations and their members
- Platform-wide view (not scoped to one organisation)

**Major components:** `components/admin/TeamManagementScreen.tsx`

**Database tables:** `organisations`, `organisation_members`, `profiles`

---

### Search

**Purpose:** Client-side global search across loaded data.

**Current functionality:**
- Accessible from the header (magnifying glass icon or keyboard shortcut)
- Searches reviews, assignments, playlists, members, groups
- Results navigate to the relevant screen on selection
- Scoped to data already loaded in the current session (no server-side search)

**Major components:** `components/common/GlobalSearch.tsx`

**Database tables:** None (client-side filter over in-memory data)

---

### Profile

**Purpose:** User's own profile and security settings.

**Current functionality:**
- Display name editing
- Password change (via Supabase Auth)
- Active organisation display with role
- Multi-organisation switcher

**Major components:** `components/admin/UserProfileScreen.tsx`

**Database tables:** `profiles`

**API routes:** `app/api/admin/profile/route.ts`

---

### Viewer Portal

**Purpose:** Read-only screen for stakeholders assigned game footage.

**Current functionality:**
- List of games assigned to this viewer
- Full-screen game player with video controls
- No access to reviews, coding, assignments, or any management screens

**Major components:** `components/viewer/ViewerScreen.tsx`, `components/viewer/ViewerGamePlayer.tsx`

**Database tables:** `view_only_games`, `view_only_game_assignments`

---

### Comment Inbox (Educator)

**Purpose:** Educators see all open comment threads across their reviews in one place.

**Current functionality:**
- List threads with unread comments
- Inline reply
- Mark thread as read
- Navigate to source review

**Major components:** `components/educator/CommentInbox.tsx`

**Database tables:** `review_comments`, `review_comment_reads`

---

### Referee Comments Screen

**Purpose:** Referees view and respond to clip-level comment threads on their own reviews.

**Current functionality:**
- Grouped by review
- Star/dismiss threads (localStorage)
- Reply to educator
- Unread count badge

**Major components:** `components/referee/RefereeCommentsScreen.tsx`

**Database tables:** `review_comments`, `review_comment_reads`

---

## 5. Database Summary

### Production Schema (migrations 001–024 applied)

#### Core Identity

| Table | Key columns |
|---|---|
| `profiles` | id, email, name, created_at |
| `organisations` | id, name, status, created_at, timezone, brand_colour, logo_url |
| `organisation_members` | id, user_id, organisation_id, role (enum), created_at, joined_at |
| `organisation_user_permissions` | id, organisation_id, user_id, permission_key, granted |

#### Reviews

| Table | Key columns |
|---|---|
| `reviews` | id, organisation_id, educator_id, educator_name, game, game_date, referee1/2/3_id, referee1/2/3_name, video_link, timestamp_offset, status, submitted_at, official_summaries, is_simulator, created_at |
| `clips` | id, review_id, organisation_id, time, seconds, adjusted_seconds, adjusted_time, timestamp_seconds, timestamp_link, mode, referee_target, extra_review_officials, clip_officials, outcome, category, position, coverage, notes, is_learning_clip, created_at |
| `review_comments` | id, review_id, user_id, author_name, message, tag_id, created_at |
| `review_comment_reads` | id, user_id, review_id, tag_id, last_read_at, created_at, updated_at |

#### Learning

| Table | Key columns |
|---|---|
| `clip_playlists` | id, organisation_id, title, description, created_by, created_at, updated_at, archived_at* |
| `clip_playlist_items` | id, playlist_id, review_id, tag_id, position, creator_note, created_at |
| `learning_assignments` | id, organisation_id, playlist_id†, simulator_session_id, assigned_by, title, instructions, due_date, required, quiz_allow_retakes, questions*, quiz_questions*, created_at |
| `learning_assignment_users` | id, assignment_id, user_id, status, assigned_at, started_at, completed_at, watched_clip_ids*, reflection_responses*, reflection_submitted_at*, quiz_answers*, quiz_score*, quiz_total*, quiz_submitted_at*, quiz_attempt_count* |

#### Simulator

| Table | Key columns |
|---|---|
| `simulator_sessions` | id, organisation_id, title, description, video_url, level, review_id, created_by, created_at, updated_at |
| `simulator_events` | id, session_id, timestamp_seconds, window_seconds, correct_outcome, correct_call, category, notes, display_order |
| `simulator_attempts` | id, session_id, user_id, started_at, completed_at, score, total, level |
| `simulator_responses` | id, attempt_id, event_id (nullable), clip_id, response_outcome, response_call, response_time_seconds, is_correct, created_at |

#### Groups and Viewer

| Table | Key columns |
|---|---|
| `groups` | id, organisation_id, name, description, colour, created_at, updated_at |
| `group_members` | id, group_id, user_id, created_at |
| `view_only_games` | id, organisation_id, title, category, game_date, video_url, created_by, created_at |
| `view_only_game_assignments` | id, game_id, viewer_user_id, assigned_by, assigned_at |

#### Development Goals (Draft — requires migration_draft/018)

| Table | Key columns |
|---|---|
| `development_goal_defs` | id, organisation_id, title, description, category, priority, created_by, deleted_at, created_at, updated_at |
| `development_goal_assignments` | id, goal_id, organisation_id, assignment_type, assigned_by, created_at |
| `development_goal_assignment_referees` | id, assignment_id, referee_id |
| `referee_goals` | id, goal_id, referee_id, organisation_id, status, notes, target_review_date, completed_at, archived_at, created_at, updated_at |

**Legend:**
- All columns listed above are confirmed present in production as of Phase 18.6 audit.

### Enum Values

`organisation_role`: `super_admin | admin | educator | referee | viewer` — all values confirmed in production.

### Production Migration Status (Phase 18.6 Audit)

A direct REST audit of production (`rydjxihdukoretyqqfue`) confirmed all draft migrations have been applied manually:

| File | Status |
|---|---|
| `migrations_draft/025_alter_existing_tables.sql` | ✅ Applied — `watched_clip_ids`, `onboarding_dismissed` confirmed in production |
| `migrations_draft/026_assignment_reflection_questions.sql` | ✅ Applied — `questions`, reflection columns confirmed in production |
| `migrations_draft/027_playlist_archive.sql` | ✅ Applied — `clip_playlists.archived_at` confirmed in production |
| `migrations_draft/028_quiz_questions.sql` | ✅ Applied — all quiz columns confirmed in production |
| `migrations_draft/029_nullable_playlist_id.sql` | ✅ Applied — `playlist_id` IS NULL filter returns 200 |
| `migrations_draft/018_development_goals.sql` | ✅ Applied — all 4 development goal tables confirmed in production |

| `migrations/026_handle_new_user_trigger.sql` | ⚠️ **Pending** — trigger already exists in production (applied manually) but was not in a migration file until now. Apply via SQL Editor — idempotent, safe to run even if trigger already exists. |
| `migrations_draft/030_enable_rls_reviews_clips.sql` | ✅ Applied — Phase 18.7, all 25 public tables have RLS enabled |

**One pending migration requires manual application to production** (`migrations/026_handle_new_user_trigger.sql`). All others are applied. The migration history table is empty (schema was applied via Dashboard SQL Editor, not `supabase db push`) — this is safe.

---

## 6. User Roles

### Role Hierarchy

```
super_admin > admin > educator > referee > viewer
```

### Role Permissions

#### super_admin
- All permissions, all organisations
- Can assign any role including `super_admin`
- Can access Team Management (platform-wide user list)
- Bypasses all permission checks

#### admin
- All permissions within their organisation
- Can invite users and assign roles up to `admin`
- Can manage organisation settings
- Can manage all members, permissions, and groups

#### educator
- Default permissions: all review and clip operations, clip library, playlists, assignments, groups, analytics
- Cannot manage members or organisation settings
- Cannot assign roles
- Permissions can be customised by an admin

#### referee
- Default: view reviews assigned to them (completed only, non-simulator)
- Access to: their own evaluations, comments, development goals, assigned learning, simulator runs, stats
- Cannot access any management screens

#### viewer
- No default permissions
- Access only to the Viewer Portal (assigned games)
- Cannot access reviews, learning, simulator, or any management screens

### Permission Override System

Admins can grant or revoke individual permissions from the Members screen → Manage User → Permissions tab. When any custom row exists for a user in `organisation_user_permissions`, role defaults are ignored and only the stored grants apply. This allows fine-grained control (e.g. giving a referee access to the Clip Library without making them an educator).

---

## 7. UI / UX Philosophy

### Educator-First Workflow

The educator's dashboard is the canonical starting point. Every tool — coding, goals, playlists, assignments — is designed to serve the educator's coaching intent. The referee's experience is the receiving end of that work.

### Referee Development Philosophy

Reviews, goals, notes, and assignments accumulate as a longitudinal record. A referee's development screen shows their full coaching history in a single timeline. Nothing is deleted from a referee's history without deliberate action.

### Navigation

Navigation is header-based. The active role determines which header items are visible. There are no sidebar menus. Screens stack and return using `setScreen()` callbacks. A `returnToScreen` state variable tracks where to navigate back to from sub-screens (e.g. returning from the learning runner to "my-learning" or "learning-hub").

### Responsive Behaviour

The application is designed for desktop use (1024px+). It is not a mobile-first design. Some screens (notably the video coder) require sufficient width to display the video and tag panel side by side.

### Design System

- Custom CSS throughout — no Tailwind, no CSS-in-JS framework
- Consistent class naming per module (e.g. `edu-dashboard__`, `lh-`, `sim-`)
- Colour palette driven by `brand_colour` from the organisation record
- Toast notifications via `lib/toast.ts` → `showToast(message, type)` (dispatches a custom DOM event picked up by `AppToast`)
- Destructive actions always go through `ConfirmModal` before executing

### Reusable Components

New screens must use:
- `showToast(message, type)` for feedback — never `alert()`
- `ConfirmModal` for destructive actions — never `confirm()`
- `RecipientPicker` for selecting members/groups
- `ClipPreview` for video clip display

---

## 8. Current Development Status

### Phase 18 Summary (Phases 18.1–18.5 complete)

| Phase | Work | Commit |
|---|---|---|
| 18.1 | Referee Development Goals UI, goal deep-linking from notifications, navigation fixes | `933384b`, `0045e7f`, `44a49a4` |
| 18.2 | Review timeline improvements, tagging workflow polish, Rules of Hooks fix | `f6a654d`, `4a307cd` |
| 18.3 | Learning Hub hierarchy redesign, playlist clip selection persistence | `dcfcdf8` |
| 18.4 | Dashboard and portal home — reviews as primary, Continue Review, compact KPIs | `297cc35` |
| 18.5 | Beta QA audit, staleDate useMemo fix, QA register, schema verification SQL, release readiness docs | see below |

### Complete (Phases 1–18)

| Module | Status |
|---|---|
| Authentication (login, invite, multi-org) | ✅ Complete |
| Educator Dashboard | ✅ Complete (Phase 18.4: reviews-first hierarchy) |
| Video Review Coding | ✅ Complete |
| Clip Library | ✅ Complete (Phase 18.3: selection persistence fix) |
| Playlists | ✅ Complete — `archived_at` confirmed in production (Phase 18.6) |
| Learning Assignments | ✅ Complete — all columns confirmed in production (Phase 18.6) |
| Reflection Questions | ✅ Complete — migration 026 confirmed applied in production (Phase 18.6) |
| Quiz Builder and Player | ✅ Complete — migration 028 confirmed applied in production (Phase 18.6) |
| Simulator (builder, runner, analytics) | ✅ Complete |
| Development Goals | ✅ Complete — migration 018 confirmed applied in production (Phase 18.6) |
| Learning Hub | ✅ Complete (Phase 18.3: learning tools as primary hierarchy) |
| Development Notes | ✅ Complete (localStorage only — Supabase migration deferred) |
| Referee Stats Hub | ✅ Complete |
| Referee Comments | ✅ Complete |
| Comment Inbox (educator) | ✅ Complete |
| Members Management | ✅ Complete |
| Groups | ✅ Complete |
| Viewer Portal | ✅ Complete |
| Organisation Settings | ✅ Complete |
| User Profile / Password | ✅ Complete |
| Global Search | ✅ Complete |
| Notifications (UI only) | ✅ UI complete — in-memory (session only); sample seeding removed (Phase 18.5) |
| Permission System | ✅ Complete |

### Beta / Partial

| Module | Status |
|---|---|
| Notifications | Beta — in-memory (session only), no server persistence; no fictional sample data (Phase 18.5) |
| Development Notes | Beta — localStorage only, not shared across devices/sessions |
| Review–Goal Links | Beta — localStorage only |
| Organisation Settings (extended) | Beta — localStorage only beyond name/timezone/colour |
| Reminder Engine | Beta — client-side only, fires only during active session |

---

## 9. Known Beta Issues

These are the currently identified schema and feature gaps that must be resolved before production use is fully reliable:

### Schema Gaps (Production Database)

**Phase 18.6 audit update:** All previously documented schema gaps have been confirmed resolved. All draft migrations have been applied to production manually.

| Gap | Status (Phase 18.6) |
|---|---|
| `clip_playlists.archived_at` missing | ✅ Resolved — column confirmed in production |
| `learning_assignments.questions` missing | ✅ Resolved — column confirmed in production |
| `learning_assignments.quiz_questions` missing | ✅ Resolved — column confirmed in production |
| `learning_assignment_users.watched_clip_ids` missing | ✅ Resolved — column confirmed in production |
| `learning_assignment_users` reflection columns missing | ✅ Resolved — all columns confirmed in production |
| `learning_assignment_users` quiz result columns missing | ✅ Resolved — all columns confirmed in production |
| `learning_assignments.playlist_id` NOT NULL | ✅ Resolved — nullable confirmed in production |
| Development goal tables missing | ✅ Resolved — all 4 tables confirmed in production |

**Security item (Phase 18.7 — fixed):**

| Issue | Impact | Status |
|---|---|---|
| `reviews` and `clips` returned all rows to anon-key requests — RLS was disabled on both tables despite correct policies being defined | High — coaching data was accessible without authentication | ✅ **Fixed (Phase 18.7)** — `migrations_draft/030_enable_rls_reviews_clips.sql` applied; anon now gets 0 rows; all 25 public tables have RLS enabled |

### Feature Limitations

| Feature | Limitation |
|---|---|
| Notifications | No server persistence — notifications do not survive page reload and are not shared across devices |
| Development Notes | localStorage only — notes are lost if browser data is cleared; not visible across devices |
| Email notifications | Configured in preferences but not delivered — no email service connected |
| Push notifications | Reminder engine is client-side only; no background delivery |
| Logo upload | UI exists; Supabase Storage bucket not configured |
| Global search | Client-side only — only searches data already loaded in the session |
| Deep linking | No URL-based navigation — cannot link directly to a review, assignment, or goal |
| Billing | Placeholder UI — no payment integration |
| Audit logs | Preference setting only — no storage or viewing |

---

## 10. Future Roadmap

### Immediate Pre-Beta Actions (required before inviting any beta users)

1. ~~Run `docs/PRODUCTION_SCHEMA_VERIFICATION.sql` against production to confirm schema state~~ — **Done (Phase 18.6)** — all schema objects confirmed via direct REST audit
2. ~~Apply migrations to production in order: `025` → `026` → `027` → `028` → `029` → `018`~~ — **Done (already applied to production)**
3. ~~Remove or gate the sample notification seeding in `lib/hooks/useNotifications.ts`~~ — **Done (Phase 18.5)**
4. ~~Verify RLS is enabled on `reviews` and `clips` tables~~ — **Done (Phase 18.7)** — `migrations_draft/030_enable_rls_reviews_clips.sql` applied; all 25 public tables now have RLS enabled
5. Apply `migrations/026_handle_new_user_trigger.sql` to production via SQL Editor — idempotent; ensures trigger is formally applied from the migration file, not just from the historical manual apply
6. Run smoke test on production URL after deploy

### Phase 19 — Supabase Data Migration (post-beta)

After beta migrations are confirmed working:
1. Migrate development notes from localStorage to Supabase `development_notes` table (migration_draft/019)
2. Migrate review–goal and clip–goal links to Supabase (migration_draft/020)
3. Implement notifications table and real event triggers (migration_draft/022)
4. Migrate organisation settings to Supabase (migration_draft/021)
5. Migrate `onboarding_dismissed` to use `profiles.onboarding_dismissed` column (column exists via migration 025)

### Future Phases (Post-19)

- **Email delivery** — integrate an email service for notification delivery and assignment reminders
- **Deep linking** — URL-based navigation to specific screens and resources
- **Mobile responsiveness** — adapt layouts for tablet and mobile use
- **Certificate generation** — completion certificates for assignments
- **Supabase Storage** — organisation logo upload
- **Advanced analytics** — cross-cohort reporting, trend analysis over time

---

## 11. Development Workflow

### Principles

1. **Git is the source of truth.** Read the repository before writing anything. Do not rely on conversation history or documentation alone.
2. **Read before coding.** Always read the relevant hooks, components, types, and migrations before making any change.
3. **Reuse existing architecture.** Use existing hooks, shared components, service functions, and patterns. Do not invent new abstractions for solved problems.
4. **Avoid unnecessary refactoring.** Fix the specific problem. Do not clean up unrelated code in the same commit.
5. **One complete phase at a time.** Finish a phase fully before starting the next. Partial work must not be left uncommitted.
6. **Strong typing.** All new code must be fully typed. No `any` unless interfacing with raw Supabase rows (and then only in mappers).
7. **TypeScript must pass clean.** `tsc --noEmit` must produce no errors before commit.
8. **Production build must pass.** `npm run build` must succeed before commit.
9. **Commit with a descriptive message.** Format: `Phase X.Y short description`
10. **Push to GitHub.** `git push origin main` after every phase commit.

### Security Rules

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It is only used in `app/api/admin/*` routes.
- Never set the service role key as a `NEXT_PUBLIC_` environment variable.
- All admin operations that require the service role must go through a Next.js API route that verifies the caller's session and role first.
- RLS policies enforce data access at the database level. Do not rely solely on frontend guards.
- Admin can manage only users in their own organisation.
- Only `super_admin` can assign `admin` or `super_admin` roles.

### Adding a New Screen

1. Add the screen name to the `Screen` union type in `lib/types/auth.ts`
2. Add any needed routing guard in the `useEffect` in `app/page.tsx`
3. Add the screen render block in `app/page.tsx` (`if (screen === "new-screen")`)
4. Create the component in the appropriate folder (`components/admin/`, `components/educator/`, `components/referee/`, `components/viewer/`)
5. Wire navigation buttons in the Header or other screens

### Toast and Modal Pattern

```ts
// Feedback
import { showToast } from "@/lib/toast";
showToast("Saved successfully", "success");
showToast("Failed to save", "error");

// Destructive confirmation
import { ConfirmModal } from "@/components/common/ConfirmModal";
<ConfirmModal
  message="Delete this review? This cannot be undone."
  onConfirm={handleDelete}
  onCancel={() => setConfirmOpen(false)}
/>
```

Never use `alert()` or `confirm()`.

---

## 12. Definition of Done

A phase is complete when all of the following are true:

- [ ] All planned features are implemented and working in the browser
- [ ] No `alert()` or `confirm()` calls — all feedback uses `showToast` and `ConfirmModal`
- [ ] No `console.log()` left in committed code
- [ ] No `TODO` or `FIXME` comments left in committed code
- [ ] TypeScript: `tsc --noEmit` passes with zero errors
- [ ] Production build: `npm run build` passes with zero errors
- [ ] All new Supabase tables have RLS enabled and policies applied
- [ ] All new API routes verify caller session and role before executing
- [ ] Service role key is never exposed to the browser in any new code
- [ ] Committed with message format: `Phase X.Y description`
- [ ] Pushed to `github.com/RefCollegeAus/refeval.git` main branch
