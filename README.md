# RefCoach — Referee College of Australia

A coaching and development platform for basketball referees.

## Overview

RefCoach is a multi-role web application that supports:

- **Educators** — video review coding, coaching queues, development goal assignment, learning management
- **Referees** — view evaluations, complete assigned learning, track development goals
- **Admins** — member management, organisation settings, group and permission management
- **Super Admins** — platform-wide access and role assignment

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Stack

- Next.js 14 (App Router, client-side SPA pattern)
- TypeScript, React
- Supabase (Auth + Postgres + RLS)

## Known Limitations (v5.2.8)

The following features are recorded as preferences or partially implemented and will be enforced / activated in a future release:

| Area | Status |
|---|---|
| **Data persistence** | Review clips, assignments, groups and development goals are stored in Supabase. Notification preferences and onboarding state are stored in browser localStorage per user. |
| **Email notifications** | Not yet active. Notification preferences can be configured; delivery will be enabled when the email service is integrated. |
| **Push notifications** | Not yet active. Background reminder jobs run client-side only during the current session. |
| **Billing / plans** | Billing management UI is a placeholder. No payment processing is connected. |
| **Logo upload** | Organisation logo upload requires Supabase Storage. Only brand colour is active. |
| **Certificates** | Certificate generation is recorded as a preference and will take effect when the feature launches. |
| **Audit logs** | Audit log storage and viewing are recorded as preferences for future enforcement. |
| **Deep linking** | Navigation to nested resources (e.g. a specific assignment) uses parent-screen routing. |
| **Global search** | Client-side only, scoped to data already loaded in the current session. |

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the browser — only used in API routes.
- RLS policies enforce organisation-scoped data access.
- Admin role can manage only users in their own organisation.
- Only Super Admin can assign admin or super_admin roles.
