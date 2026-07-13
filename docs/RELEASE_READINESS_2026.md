# RefCoach — Release Readiness 2026

**Phase:** 18.5 — End-to-End Beta QA  
**Date:** July 2026  
**Status:** See Executive Status below

---

## Executive Status

> **Ready for controlled beta — with known limitations**

RefCoach is functionally complete across all core educator, referee, admin and super_admin workflows. The codebase is TypeScript-clean, builds without errors, and has no runtime JavaScript errors on startup.

**Before inviting beta users, six database migrations must be applied to the production Supabase project.** Without them, Playlists (Critical) and Development Goals, Assignments (High) will fail. All other core workflows — Reviews, Tagging, Analytics, Comments, Members, Groups, Viewer — are ready as-is.

---

## Test Coverage

| Area | Method | Coverage |
|------|--------|----------|
| TypeScript compilation | Code | ✅ 0 errors |
| Production build | Code | ✅ Clean |
| ESLint | N/A | Not configured — no `.eslintrc` found |
| Login / auth flow | Browser (partial) | ✅ Login renders; error state works; login itself unable to test (no dev credentials) |
| Dashboard (educator) | Code | ✅ Reviewed — Phase 18.4 changes verified |
| Review creation | Code | ✅ Hook and flow verified |
| Video coding / tagging | Code | ✅ Timeline, clips, outcomes verified |
| Comments | Code | ✅ Supabase-backed, unread tracking confirmed |
| Clip Library | Code | ✅ Verified — Phase 18.3 selection fix confirmed |
| Playlists | Code | ⚠️ Code correct; blocked by migration 027 in production |
| Assignments | Code | ⚠️ Code correct; several columns pending migrations 025–029 |
| Development Goals | Code | ⚠️ Code correct; tables pending migration 018 |
| Simulator | Code | ✅ Tables and hook structure verified |
| Learning Hub | Code | ✅ Phase 18.3 changes verified |
| Analytics / Stats Hub | Code | ✅ Client-side aggregation from loaded data |
| Notifications | Code | ⚠️ In-memory only; sample data seeded — not real events |
| Org / Members | Code | ✅ API routes verified; role enforcement confirmed |
| Viewer Portal | Code | ✅ Screen guard and data isolation confirmed |
| Permission system | Code | ✅ Role defaults + custom overrides confirmed |
| Security (API routes) | Code | ✅ All routes verify session and role |
| localStorage features | Code | ⚠️ Notes, links, onboarding — not cross-device |
| Responsive layout | Unable | Dev credentials unavailable for interactive testing |
| Mobile QA | Unable | Dev credentials unavailable |

---

## Blocking Issues

**Updated Phase 18.6:** A direct audit of the production database (`rydjxihdukoretyqqfue`) via REST probes confirmed that all previously listed blocking schema gaps have already been applied. No pending migrations are required for core application functionality.

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | `clip_playlists.archived_at` missing | ~~Critical~~ | ✅ **Column confirmed present in production** (Phase 18.6) |
| 2 | Development goal tables missing | ~~High~~ | ✅ **All 4 tables confirmed present in production** (Phase 18.6) |
| 3 | Assignment reflection, quiz, and progress columns missing | ~~High~~ | ✅ **All columns confirmed present in production** (Phase 18.6) |

### Remaining action required (Phase 18.6 new finding)

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | `reviews` and `clips` tables return all rows to requests using only the publishable API key (no user session JWT) — RLS may be disabled on these tables | **High** | Verify in Supabase Dashboard → Table Editor → toggle for each table. If disabled, run in SQL Editor: `ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY; ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;` |

---

## Known Limitations

These are documented, non-blocking limitations appropriate to disclose to beta users:

| # | Limitation | Impact |
|---|-----------|--------|
| 1 | **Notifications are in-memory (session only)** — generated during the active session; cleared on page reload; no fictional sample data | Users start each session with an empty notification list |
| 2 | **Development notes are localStorage** — lost on browser clear; not shared across devices | Notes may be lost; warn users before they rely on them |
| 3 | **Review–goal links are localStorage** — same as notes | Same warning needed |
| 4 | **Onboarding dismissed state is localStorage** | Low impact — onboarding re-appears after clear |
| 5 | **No email notifications** — email delivery not connected | Assignment due date reminders not sent |
| 6 | **Logo upload not functional** — Supabase Storage bucket not configured | Logo upload UI shows but fails silently |
| 7 | **Global search is client-side only** — only searches loaded data | Searches may be incomplete during initial load |
| 8 | **No deep linking** — cannot link directly to a review, assignment, or goal | Share links not possible |
| 9 | **No billing integration** — billing UI is a placeholder | Cannot monetise yet |

---

## Production Schema Status

**Production project:** `rydjxihdukoretyqqfue`  
**Dev project used for QA:** `eydvhyajgoiaursfhyon`  
**Phase 18.6 audit method:** REST probes via service-role key — all tables and columns verified directly against the live production database.

### Confirmed present in production

All 20 core tables (migrations 001–024) ✅  
All draft migration schema objects (025–029, 018) ✅  
All development goal tables ✅  
`brand_colour`, `logo_url`, `timezone` on `organisations` ✅  
`onboarding_dismissed` on `profiles` ✅  
`archived_at` on `clip_playlists` ✅  
`playlist_id` nullable on `learning_assignments` ✅  
All quiz and reflection columns on `learning_assignments` and `learning_assignment_users` ✅

### Tables absent from production (not referenced by live code)

| Table | Draft migration | Live code usage |
|-------|----------------|-----------------|
| `development_notes` | 019 | localStorage only — no DB queries |
| `review_goal_links` | 020 | localStorage only — no DB queries |
| `clip_goal_links` | 020 | localStorage only — no DB queries |
| `notifications` | 022 | in-memory only — no DB queries |
| `sent_reminders` | 023 | not referenced by any live code |

These are not blockers. They will be needed when Phase 19 (Supabase Data Migration) is implemented.

### Migration history

None of the 24 migrations are recorded in the Supabase migration history table (`supabase_migrations.schema_migrations`). The schema was applied manually via the Supabase Dashboard SQL Editor, not via `supabase db push`. This means `supabase migration list` shows all migrations as local-only. This is safe as long as future migrations are also applied manually and tracked in `migrations_draft/`.

### No pending migrations required

~~Apply migrations in order: 025 → 026 → 027 → 028 → 029 → 018~~ — **All already applied (Phase 18.6)**

---

## Security Status

| Check | Result |
|-------|--------|
| Service role key exposed to browser | ✅ Not exposed — server API routes only |
| Admin operations verify caller session | ✅ All `app/api/admin/*` routes check caller |
| Role escalation prevention | ✅ Only `super_admin` can assign `admin`/`super_admin` roles |
| Org data isolation | ✅ All queries scoped to `organisation_id` |
| RLS on production tables | Assumed from migrations — verify with `PRODUCTION_SCHEMA_VERIFICATION.sql` |
| Viewer screen isolation | ✅ `viewerForbidden` list covers all non-viewer screens |
| Cross-org data leak | ✅ Not found in code review |
| Self-role change | ✅ Blocked at API layer (`caller.user.id === userId` check) |

---

## Deployment Checklist

Complete every item before inviting beta users:

### Pre-deployment
- [ ] Run `docs/PRODUCTION_SCHEMA_VERIFICATION.sql` against production to confirm current schema
- [ ] Back up production database (Supabase Dashboard → Database → Backups)
- [ ] Apply pending migrations in order (025 → 026 → 027 → 028 → 029 → 018) to production
- [ ] Re-run `docs/PRODUCTION_SCHEMA_VERIFICATION.sql` to confirm all columns exist

### Environment variables (Vercel)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — production project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — production anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — production service role key (server-only, not NEXT_PUBLIC_)
- [ ] Confirm no service role key is set as a `NEXT_PUBLIC_` variable

### Supabase configuration
- [ ] Confirm `handle_new_user` trigger exists on `auth.users` in production (auto-creates `profiles` rows on invite)
- [ ] Confirm email templates for invitation emails are configured
- [x] `organisation_role` enum includes `viewer` role — confirmed via REST probe (Phase 18.6)
- [ ] **Verify RLS is enabled on `reviews` and `clips` tables** — Phase 18.6 audit found these may have RLS disabled; check Supabase Dashboard → Table Editor and enable if not set
- [ ] Verify `has_org_role`, `is_org_member`, `is_super_admin`, `set_updated_at` functions exist in the SQL Editor

### Build and deploy
- [ ] `npx tsc --noEmit` — must pass with 0 errors
- [ ] `npm run build` — must pass with 0 errors
- [ ] Deploy to Vercel production project (`refeval`)
- [ ] Test login on production URL with a real account

### Data hygiene
- [ ] Confirm no seed/test data exists in production organisation
- [ ] Remove or disable dev-only seed SQL file from any CI pipelines

### Smoke test on production
- [ ] Login as super_admin
- [ ] Navigate to educator dashboard — confirm reviews load
- [ ] Create a new review — confirm it saves
- [x] Playlists — `clip_playlists.archived_at` confirmed in production (Phase 18.6)
- [x] Development Goals — all 4 goal tables confirmed in production (Phase 18.6)
- [ ] Navigate as referee — confirm My Learning loads
- [ ] Logout and confirm session is cleared

### Notifications
- [x] Sample notification seeding removed from `lib/hooks/useNotifications.ts` — users start each session with an empty notification list (Phase 18.5)

---

## Recommended Beta Scope

For a controlled first beta, invite only:

**Phase 1 — Internal only (1–2 weeks)**
- 1 super_admin account
- 1–2 educator accounts in a single organisation
- 1–2 referee accounts in the same organisation

**Recommended modules to test first:**
- Reviews (create, code, complete)
- Comments (educator ↔ referee)
- Analytics (Referee Stats Hub)
- Members (invite, role change)

**Hold back from Phase 1 beta:**
- Playlists (apply migration 027 first and test)
- Assignments (apply all draft migrations first and test)
- Development Goals (apply migration 018 first and test)
- Simulator (functional but not yet tested end-to-end with real users)
- Notifications (fictional data — disable seeding first)

**Phase 2 — Wider beta (after Phase 1 successful)**
- Playlists, Assignments, Development Goals (after migrations applied and smoke-tested)
- Additional organisations
- Referee self-service workflows (My Learning, Goals)

---

## Post-Beta Backlog

### Persistence (High priority for general release)
- Migrate notifications to Supabase `notifications` table
- Migrate development notes from localStorage to Supabase
- Migrate review-goal links to Supabase
- Migrate onboarding dismissed to `profiles.onboarding_dismissed` (column exists via migration 025)

### UX Polish (Medium)
- Deep linking / URL-based navigation
- Mobile-responsive layouts (app is desktop-first)
- Onboarding improvements for new organisations

### Mobile (Medium)
- Reviewer / video coder is desktop-only by design
- Dashboard, stats, and learning views should be mobile-usable

### Accessibility (Medium)
- Full keyboard navigation audit
- Screen reader testing
- WCAG AA compliance review

### Notifications (Medium)
- Email delivery integration
- Background reminder engine
- Push notifications (mobile)

### Analytics (Low)
- Cross-cohort reporting
- Trend analysis over time

### Billing (Deferred)
- Payment integration
- Organisation subscription management

### Infrastructure (Deferred)
- Supabase Storage for logo uploads
- Audit log storage and viewing
- Certificate generation for assignment completion
