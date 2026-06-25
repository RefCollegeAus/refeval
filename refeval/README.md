# Referee Coder Web Tool v5

## New in v5

- Clip can include one primary tagged official plus extra review-only officials.
- Same comments/notes apply to all officials attached to that clip.
- Save & Complete Later sets review status to **In Review**.
- Submit Review sets review status to **Completed**.
- Educator portal separates In Review and Completed evaluations.
- Referee portal only shows submitted/completed evaluations.
- Referees can open an evaluation, view clips, and open timestamp links.
- Video viewer added for referee review page:
  - YouTube links embed with timestamp support.
  - Direct video file links are playable.
  - Other links open externally with timestamp parameters where possible.

## Important

This is still a local prototype. It stores data in browser localStorage.
For a real backend, use Supabase/Auth/Storage.

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Default logins

Educator:
- Logan Bilby
- admin

Referee:
- Demo Referee
- demo
