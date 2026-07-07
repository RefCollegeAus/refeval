# Referee Simulator V1

## Purpose

The Referee Simulator gives referees a structured, video-based decision-making challenge. They watch real game footage; at key moments, the video pauses and they must make a call — outcome, category, position, and/or coverage depending on the chosen difficulty level. Results are persisted and visible to educators.

---

## Database Migrations Required

Apply in order:

| File | What it creates |
|---|---|
| `supabase/migrations/020_referee_simulator.sql` | `simulator_sessions`, `simulator_events`, `simulator_attempts`, `simulator_responses` tables + RLS policies |
| `supabase/migrations/021_simulator_review_link.sql` | Adds nullable `clip_id` to `simulator_responses`; makes `event_id` nullable (clip-based sessions) |
| `supabase/migrations/022_simulator_assignment.sql` | Adds `simulator_session_id` FK to `learning_assignments` |

All three migrations must be run before using the simulator. RLS is configured so referees see only their own attempts; educators and admins see all attempts in their organisation.

---

## Educator Flow

1. **Create** — Simulator Builder → "New Simulator". Enter title, description, and a YouTube or direct-video URL. A linked review record is created automatically to hold coded decisions.
2. **Code decisions** — "Open in Review Coder" to tag clip moments (outcome, category, position, coverage). Each tagged clip becomes a decision point.
3. **Publish** — Once decisions are coded, click "Publish". This sets the linked review's status to `completed`, making the session visible to referees. A published session cannot be re-edited.
4. **Assign** — "Assign to Referees" opens the assignment modal. Select session, title, recipients (individuals, groups, or whole org), optional due date. Creates a standard `learning_assignment` with `simulator_session_id` set.
5. **Monitor** — In Assignments → Assignment Detail, the Score column shows each referee's latest attempt percentage and attempt count.
6. **Analytics** — In the Simulator Builder, published sessions with at least one attempt show an Analytics button. This opens the Simulator Analytics Dashboard with overview stats, referee breakdown, category performance, and decision analysis.

---

## Referee Flow

1. **Access** — Via My Learning (assigned simulators appear as cards) or directly via Learning Hub → Simulator.
2. **Launch** — Click "Start Simulation" on the assignment or session card.
3. **Choose level** — Select difficulty before starting:
   - **Foundation** — Call or No Call only
   - **Developing** — Category group (broad) identification
   - **Intermediate** — Full category identification
   - **Advanced** — Category + player position
   - **Expert** — Category + position + coverage
4. **Run** — Video plays; pauses automatically at each decision point. A timed prompt appears. Submit before the countdown expires or the attempt is recorded as incorrect.
5. **Score** — After all decisions, a score screen shows result, grade, and a decision-by-decision breakdown with correct answers and notes.
6. **Retry** — "Try Again" returns to the intro screen; a new attempt record is created. Previous attempts are preserved.
7. **Complete assignment** — The first completion of a simulator run via an assignment link marks that assignment as Completed.

---

## Assignment & Result Behaviour

- A simulator assignment is `Completed` once the referee finishes one full run via the assignment link (regardless of score).
- Multiple retries are supported; each creates a new `simulator_attempts` row.
- `simulator_attempts` stores: `session_id`, `user_id`, `started_at`, `completed_at`, `score` (correct count), `total` (total decisions), `level`.
- `simulator_responses` stores per-decision data: `attempt_id`, `event_id` or `clip_id`, `response_outcome`, `response_call`, `response_time_seconds`, `is_correct`.
- Attempts with `completed_at IS NULL` are in-progress and excluded from all stats displays.

---

## Analytics Behaviour

The Simulator Analytics Dashboard (`simulator-analytics` screen, management roles only):

- **Overview panel** — total attempts, unique referees, avg/median/highest/lowest score percentages.
- **Referee Breakdown** — per-referee table: latest %, best %, avg %, attempts, last played, trend (Improving/Declining/Stable based on diff between two most recent scored attempts, threshold ±5%).
- **Category Performance** — bar chart sorted worst → best; weakest and strongest category callouts.
- **Decision Analysis** — per decision point: correct %, total responses, avg response time, most common wrong answer.
- Response data is fetched lazily per selected session (not bulk-loaded at startup).

---

## Known Limitations / Future Improvements

- **Legacy sessions** (no `review_id`, using `simulator_events` directly) are fully functional but the builder cannot re-edit decisions after creation. New sessions should use the clip-based flow.
- **Assignment completion fires on first completion only** — subsequent retries do not re-trigger the completion status. A referee who retries after already completing remains Completed.
- **No per-level filtering in analytics** — all attempts across all levels are aggregated. A future version could filter or facet by difficulty level.
- **YouTube timing precision** — the video time-update poll runs every 500 ms, so decision prompts may trigger up to 500 ms late for YouTube videos. Direct MP4/WebM videos use native `ontimeupdate` events and are more precise.
- **No bulk-assign from Analytics** — the analytics dashboard is read-only; creating a new assignment must be done from the Simulator Builder.
