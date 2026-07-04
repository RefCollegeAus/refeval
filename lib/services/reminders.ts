import type { Notification } from "@/lib/types/notifications";
import type { Assignment } from "@/lib/types/assignments";
import type { RefereeGoalView } from "@/lib/types/developmentGoals";
import {
  makeAssignmentDueSoonDraft,
  makeAssignmentOverdueDraft,
  makeGoalReviewDueDraft,
} from "@/lib/services/notifications";

export type ReminderResult = {
  key: string;
  draft: Omit<Notification, "id" | "isRead" | "readAt">;
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

// ── Dedup key ─────────────────────────────────────────────────────────────────

export function generateReminderKey(
  type: string,
  userId: string,
  entityId: string,
  dateWindow: string,
): string {
  return `reminder:${type}:${userId}:${entityId}:${dateWindow}`;
}

// ── Assignment reminders ──────────────────────────────────────────────────────

export function checkAssignmentReminders(
  myAssignments: Assignment[],
  userId: string,
  orgId: string,
  seenKeys: Set<string>,
): ReminderResult[] {
  const today = localDateStr();
  const dueSoonCutoff = addDays(today, 3);
  const results: ReminderResult[] = [];

  for (const a of myAssignments) {
    if (!a.dueDate) continue;

    const userRecord = a.assignmentUsers.find(u => u.userId === userId);
    if (!userRecord || userRecord.status === "Completed") continue;

    const due = a.dueDate.slice(0, 10);

    if (due < today) {
      const key = generateReminderKey("assignment_overdue", userId, a.id, due);
      if (!seenKeys.has(key)) {
        results.push({ key, draft: makeAssignmentOverdueDraft(orgId, userId, a.id, a.title, due) });
      }
    } else if (due <= dueSoonCutoff) {
      const key = generateReminderKey("assignment_due", userId, a.id, today);
      if (!seenKeys.has(key)) {
        results.push({ key, draft: makeAssignmentDueSoonDraft(orgId, userId, a.id, a.title, due) });
      }
    }
  }

  return results;
}

// ── Goal review reminders ─────────────────────────────────────────────────────

export function checkGoalReminders(
  allRefereeGoalViews: RefereeGoalView[],
  userId: string,
  orgId: string,
  seenKeys: Set<string>,
): ReminderResult[] {
  const today = localDateStr();
  const dueSoonCutoff = addDays(today, 3);
  const myGoals = allRefereeGoalViews.filter(g => g.refereeId === userId);
  const results: ReminderResult[] = [];

  for (const g of myGoals) {
    if (!g.targetReviewDate) continue;
    if (g.status === "Completed" || g.status === "Archived") continue;

    const target = g.targetReviewDate.slice(0, 10);

    if (target < today) {
      const key = generateReminderKey("goal_review_due_overdue", userId, g.id, target);
      if (!seenKeys.has(key)) {
        results.push({ key, draft: makeGoalReviewDueDraft(orgId, userId, g.id, g.title, target, true) });
      }
    } else if (target <= dueSoonCutoff) {
      const key = generateReminderKey("goal_review_due", userId, g.id, today);
      if (!seenKeys.has(key)) {
        results.push({ key, draft: makeGoalReviewDueDraft(orgId, userId, g.id, g.title, target, false) });
      }
    }
  }

  return results;
}
