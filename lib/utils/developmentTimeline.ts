import type { RefereeGoalView } from "@/lib/types/developmentGoals";
import type { DevelopmentNote } from "@/lib/types/developmentNotes";
import type { ReviewRecord } from "@/lib/types/reviews";

// ── Timeline event types ──────────────────────────────────────────────────────
// Extend this union to add future event sources (learning, competency, etc.)

export type TimelineEventKind =
  | "goal_assigned"
  | "goal_completed"
  | "goal_archived"
  | "goal_reopened"
  | "note_added"
  | "review_completed";
// Future: "learning_assigned" | "competency_updated" | "mentor_session" | "promotion_recommended"

export type TimelineFilter = "all" | "goals" | "notes" | "reviews";

export type TimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  date: string;          // ISO string — used for sort
  title: string;
  description: string;
  badge?: string;        // e.g. category, priority, note type
  badgeColor?: string;
  sourceId: string;      // refereeGoal.id, note.id, or review.id
};

// ── Derivation ────────────────────────────────────────────────────────────────

export function buildTimeline(
  goalViews: RefereeGoalView[],
  notes: DevelopmentNote[],
  completedReviews: ReviewRecord[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Goals — one event per state transition stored on the record
  for (const v of goalViews) {
    events.push({
      id: `ga_${v.id}`,
      kind: "goal_assigned",
      date: v.createdAt,
      title: v.title,
      description: `${v.category} · ${v.priority} priority`,
      badge: v.priority,
      badgeColor: PRIORITY_COLOR[v.priority],
      sourceId: v.id,
    });

    if (v.completedAt) {
      events.push({
        id: `gc_${v.id}`,
        kind: "goal_completed",
        date: v.completedAt,
        title: v.title,
        description: `Goal marked as completed`,
        badge: "Completed",
        badgeColor: "#30d158",
        sourceId: v.id,
      });
    }

    if (v.archivedAt && v.status === "Archived") {
      events.push({
        id: `gar_${v.id}`,
        kind: "goal_archived",
        date: v.archivedAt,
        title: v.title,
        description: `Goal archived`,
        badge: "Archived",
        badgeColor: "#636366",
        sourceId: v.id,
      });
    }

    // Reopened: status Active but has completedAt or archivedAt
    if (v.status === "Active" && (v.completedAt || v.archivedAt)) {
      events.push({
        id: `gr_${v.id}`,
        kind: "goal_reopened",
        date: v.updatedAt,
        title: v.title,
        description: `Goal reopened and set back to Active`,
        badge: "Active",
        badgeColor: "#0a84ff",
        sourceId: v.id,
      });
    }
  }

  // Notes
  for (const n of notes) {
    events.push({
      id: `na_${n.id}`,
      kind: "note_added",
      date: n.createdAt,
      title: n.title,
      description: n.body.length > 120 ? n.body.slice(0, 117) + "…" : n.body,
      badge: n.noteType,
      badgeColor: "#636366",
      sourceId: n.id,
    });
  }

  // Reviews
  for (const r of completedReviews) {
    const date = r.submittedAt ?? r.createdAt;
    events.push({
      id: `rc_${r.id}`,
      kind: "review_completed",
      date,
      title: r.game || "Review",
      description: r.gameDate ? `Game date: ${r.gameDate}` : `Reviewed by ${r.educatorName}`,
      badge: "Review",
      badgeColor: "#bf5af2",
      sourceId: r.id,
    });
  }

  // Sort newest first
  events.sort((a, b) => b.date.localeCompare(a.date));
  return events;
}

export function filterTimeline(
  events: TimelineEvent[],
  filter: TimelineFilter,
): TimelineEvent[] {
  if (filter === "all") return events;
  if (filter === "goals")   return events.filter(e => e.kind.startsWith("goal_"));
  if (filter === "notes")   return events.filter(e => e.kind === "note_added");
  if (filter === "reviews") return events.filter(e => e.kind === "review_completed");
  return events;
}

const PRIORITY_COLOR: Record<string, string> = {
  Low:    "#636366",
  Medium: "#ff9f0a",
  High:   "#ff453a",
};
