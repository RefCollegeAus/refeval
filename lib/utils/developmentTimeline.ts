import type { RefereeGoalView } from "@/lib/types/developmentGoals";
import type { DevelopmentNote } from "@/lib/types/developmentNotes";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { ReviewGoalLink } from "@/lib/types/reviewGoalLinks";

// ── Timeline event types ──────────────────────────────────────────────────────
// Extend this union to add future event sources (learning, competency, etc.)

export type TimelineEventKind =
  | "goal_assigned"
  | "goal_completed"
  | "goal_archived"
  | "goal_reopened"
  | "note_added"
  | "review_completed"
  | "review_linked_to_goal";
// Future: "learning_assigned" | "competency_updated" | "mentor_session" | "promotion_recommended"

export type TimelineFilter = "all" | "goals" | "notes" | "reviews";

export type TimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  date: string;          // ISO string — used for sort
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  sourceId: string;      // refereeGoal.id, note.id, review.id, or reviewGoalLink.id
};

// ── Derivation ────────────────────────────────────────────────────────────────

export function buildTimeline(
  goalViews: RefereeGoalView[],
  notes: DevelopmentNote[],
  completedReviews: ReviewRecord[],
  reviewGoalLinks: ReviewGoalLink[] = [],
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

  // Completed reviews
  const reviewById = new Map(completedReviews.map(r => [r.id, r]));
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

  // Review ↔ Goal links
  const goalTitleById = new Map(goalViews.map(v => [v.goalId, v.title]));
  for (const link of reviewGoalLinks) {
    const goalTitle = goalTitleById.get(link.goalDefId);
    const review    = reviewById.get(link.reviewId);
    if (!goalTitle) continue; // linked goal no longer exists for this referee
    events.push({
      id: `rgl_${link.id}`,
      kind: "review_linked_to_goal",
      date: link.linkedAt,
      title: goalTitle,
      description: review
        ? `Review: ${review.game || "Untitled"} · ${link.createdGoalFromReview ? "Goal created from this review" : "Linked from review"}`
        : link.createdGoalFromReview ? "Goal created from a review" : "Linked from a review",
      badge: link.createdGoalFromReview ? "Created" : "Linked",
      badgeColor: "#30d158",
      sourceId: link.id,
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
  if (filter === "goals")   return events.filter(e => e.kind.startsWith("goal_") || e.kind === "review_linked_to_goal");
  if (filter === "notes")   return events.filter(e => e.kind === "note_added");
  if (filter === "reviews") return events.filter(e => e.kind === "review_completed" || e.kind === "review_linked_to_goal");
  return events;
}

const PRIORITY_COLOR: Record<string, string> = {
  Low:    "#636366",
  Medium: "#ff9f0a",
  High:   "#ff453a",
};
