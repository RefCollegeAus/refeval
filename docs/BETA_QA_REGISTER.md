# RefCoach — Beta QA Register

**Phase:** 18.5  
**Date:** July 2026  
**Tester:** Claude Code (automated code audit + limited browser interaction)  
**Environment:** Local dev server (`localhost:3000`), Supabase DEV project (`eydvhyajgoiaursfhyon`)  
**Branch:** `main` @ `297cc35`

---

## Testing Method Key

| Method | Meaning |
|--------|---------|
| **Browser** | Interactively tested in the browser preview |
| **Code** | Verified by reading source code, hooks, types, SQL migrations |
| **Unable** | Could not test — reason given |

---

## QA Register

| ID | Priority | Role | Area | Workflow | Issue | Reproduction | Expected | Actual | Status | Commit |
|----|----------|------|------|----------|-------|--------------|----------|--------|--------|--------|
| QA-001 | Critical | All | Playlists | Load playlists | `clip_playlists.archived_at` column missing in production → all playlist loads return 400 error | Load Playlists screen on production | Playlist list loads | Supabase error `column "archived_at" does not exist` | Identified — fix requires applying `migrations_draft/027_playlist_archive.sql` to production | — |
| QA-002 | High | All | Assignments | Create assignment with reflection questions | `learning_assignments.questions` column missing in production | Create assignment with reflection questions enabled | Assignment created | Insert fails — column doesn't exist | Identified — fix requires `migrations_draft/026_assignment_reflection_questions.sql` | — |
| QA-003 | High | All | Assignments | Submit quiz | `learning_assignments.quiz_questions` + `learning_assignment_users` quiz result columns missing | Submit quiz attempt | Score saved | Update fails | Identified — fix requires `migrations_draft/028_quiz_questions.sql` | — |
| QA-004 | High | All | Assignments | Track clip progress | `learning_assignment_users.watched_clip_ids` missing | Watch a clip in assignment | Progress saves | Update fails | Identified — fix requires `migrations_draft/025_alter_existing_tables.sql` | — |
| QA-005 | High | All | Assignments | Standalone quiz assignment | `learning_assignments.playlist_id` is NOT NULL in production → standalone quiz create fails | Create assignment with no playlist | Assignment created | Insert fails — NOT NULL violation | Identified — fix requires `migrations_draft/029_nullable_playlist_id.sql` | — |
| QA-006 | High | All | Development Goals | All goal screens | Development goal tables missing in production → all goal screens fail with Supabase errors | Navigate to Development Goals | Goals load | Query fails — tables don't exist | Identified — fix requires `migrations_draft/018_development_goals.sql` | — |
| QA-007 | Medium | All | Dashboard | Stale date useMemo dep | `staleDate` and `oneWeekAgo` computed on every render with millisecond precision → `attentionReviews` and `thisWeekCount` useMemos invalidate on every render | Open educator dashboard | Stable memoization | Unnecessary recomputation each render | **Fixed** — wrapped in `useMemo` with `[]` deps | `phase-18.5` |
| QA-008 | Medium | All | Notifications | Persistence | Notifications are in-memory only — lost on page reload; sample data is seeded, not real events | Reload page after reading notification | Notification read state persists | State lost on reload | Identified — Known Limitation, deferred post-beta | — |
| QA-009 | Medium | All | Development Notes | Persistence | Coaching notes stored in localStorage — lost if browser data cleared; not shared across devices or sessions | Clear browser storage | Notes persist | Notes lost | Identified — Known Limitation | — |
| QA-010 | Medium | All | Review-Goal Links | Persistence | Review ↔ Goal and Clip ↔ Goal links stored in localStorage — not cross-device | Clear browser storage | Links persist | Links lost | Identified — Known Limitation | — |
| QA-011 | Medium | All | Onboarding | Persistence | Onboarding dismissed state stored in localStorage — reset if browser data cleared | Clear browser storage | Onboarding stays dismissed | Onboarding re-appears | Identified — Known Limitation (migration 025 adds column but hook not migrated) | — |
| QA-012 | Low | All | Dashboard | Coaching Queue | Coaching Queue and Smart Follow-ups now collapsed by default in Phase 18.4 — educators who relied on these as primary alerts may not notice count badges | Open educator dashboard | Alerts visible | Collapsed — must expand | Code-verified — intentional Phase 18.4 UX change, count badge visible | — |
| QA-013 | Low | All | Search | Scope | Global search only searches data already loaded in the current session — does not search server-side | Search for a review before data is fully loaded | All results shown | Partial results possible during initial load | Identified — Known Limitation | — |
| QA-014 | Low | All | Notifications sample data | Accuracy | `useNotifications.ts` seeds role-specific sample notifications in-memory — these are fictional and present to all users on login | Login as any role | Real notifications only | Sample notifications shown | **Fixed** — `buildSampleNotifications` removed; hook initialises with empty list; real users see no notifications on login | `phase-18.5-sample-notif` |
| QA-015 | Low | super_admin / admin | Security | user-profile + notifications | `user-profile` and `notifications` screens are not in the `viewerForbidden` list — intentional (all users may update their own profile) | Login as viewer, navigate to profile | Profile accessible | Profile accessible | Code-verified — intentional and safe; viewer profile is scoped to their own data | — |
| QA-016 | Low | All | Logo | Upload | Logo upload UI exists but Supabase Storage bucket is not configured — upload silently fails or shows error | Attempt logo upload | Logo saved | Upload fails | Identified — Known Limitation | — |
| QA-017 | Low | All | Email | Notifications | Email notification preferences UI exists but no email delivery service is connected | Enable email notifications | Emails delivered | No emails sent | Identified — Known Limitation | — |

---

## Environment Check Results

| Check | Result |
|-------|--------|
| Node version | v24.18.0 |
| npm version | 11.16.0 |
| Next.js version | 14.2.35 |
| Branch | `main` |
| Commit at test start | `297cc35` |
| Supabase project | DEV (`eydvhyajgoiaursfhyon`) — not production |
| Git working tree | Clean (only `.DS_Store` and seed SQL uncommitted) |
| TypeScript | ✅ Clean — 0 errors |
| Production build | ✅ Clean — 0 errors |
| ESLint | Not configured — no `.eslintrc` or `eslint.config` file found |
| `console.log` in source | None found |
| `TODO` / `FIXME` in source | None found |
| `alert()` / `window.confirm()` | None found |
| Service role key exposure | Not exposed — server-only via API routes ✅ |
| Login page rendered | ✅ |
| Console errors on load | None |

---

## Browser Testing

Interactive browser testing was **not completed** for most workflows. The dev Supabase account passwords (for `super@refeval.dev`, `educator@refeval.dev`, `referee@refeval.dev`) are not available in this session. The login form rejected the production account credentials (`support@refereecollegeofaustralia.com.au`) as expected — those accounts do not exist in the dev project.

**Browser-verified:**
- Login page renders correctly ✅
- Error state for invalid credentials renders correctly (shows "Invalid login credentials") ✅
- No console errors on login page load ✅
- Dev server starts and serves the application ✅

**Code-verified only (not browser-tested):**
All other workflow items listed in Parts 2–16.

---

## Permission Matrix (Code-Verified)

| Screen | super_admin | admin | educator | referee | viewer |
|--------|------------|-------|----------|---------|--------|
| Educator Dashboard | ✅ | ✅ | ✅ | ✗ (guard) | ✗ (guard) |
| Reviewer (coding) | ✅ | ✅ | ✅ | ✗ (guard) | ✗ (guard) |
| Clip Library | ✅ | ✅ | ✅ (perm) | ✗ | ✗ (guard) |
| Playlists | ✅ | ✅ | ✅ (perm) | ✗ | ✗ (guard) |
| Assignments (create) | ✅ | ✅ | ✅ (perm) | ✗ | ✗ (guard) |
| My Learning | ✗ | ✗ | ✗ | ✅ | ✗ (guard) |
| Development Goals | ✅ | ✅ | ✅ | ✅ (own) | ✗ (guard) |
| Referee Stats | ✅ | ✅ | ✅ | ✅ | ✗ (guard) |
| Organisation Settings | ✅ | ✅ | ✗ (guard) | ✗ | ✗ (guard) |
| Team Management | ✅ only | ✗ | ✗ | ✗ | ✗ |
| Viewer Portal | ✗ | ✗ | ✗ | ✗ | ✅ |
| User Profile | ✅ | ✅ | ✅ | ✅ | ✅ (own only) |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ (own only) |
| Simulator Builder | ✅ | ✅ | ✅ | ✗ (guard) | ✗ (guard) |
| Simulator Runner | ✅ | ✅ | ✅ | ✅ | ✗ (guard) |

---

## Schema Gap Impact Summary

| Migration | Status | Workflows Broken Without It |
|-----------|--------|-----------------------------|
| `018_development_goals.sql` | Not in production | All Development Goals screens fail |
| `025_alter_existing_tables.sql` | Not in production | Clip progress tracking fails; onboarding dismissed not persisted in DB |
| `026_assignment_reflection_questions.sql` | Not in production | Reflection questions and responses fail |
| `027_playlist_archive.sql` | Not in production | **All playlist loads fail (Critical)** |
| `028_quiz_questions.sql` | Not in production | Quiz creation and submission fails |
| `029_nullable_playlist_id.sql` | Not in production | Standalone quiz assignments fail on create |

---

## Persistence Summary

| Feature | Storage | Cross-Device | Notes |
|---------|---------|--------------|-------|
| Reviews and clips | Supabase | ✅ | Core data, fully persisted |
| Comments | Supabase | ✅ | Fully persisted |
| Playlists | Supabase | ✅ (if migration 027 applied) | 400 error until migration applied |
| Assignments | Supabase | ✅ (partial) | Several columns pending migrations |
| Development Goals | Supabase | ✅ (if migration 018 applied) | Tables missing until migration applied |
| Notifications | In-memory (session only) | ✗ | Generated during the session only; cleared on reload; no sample data |
| Development Notes | localStorage | ✗ | Per-browser, lost on clear |
| Review-Goal Links | localStorage | ✗ | Per-browser, lost on clear |
| Onboarding Dismissed | localStorage | ✗ | Per-browser, lost on clear |
| Organisation Settings | Supabase (name/tz/colour) | ✅ | Logo URL placeholder only |
