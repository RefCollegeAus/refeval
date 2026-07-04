import type { Notification, NotificationType, NotificationPriority, NotificationEntityType } from "@/lib/types/notifications";

// ── Draft factory helpers ──────────────────────────────────────────────────────

function draft(
  orgId: string,
  userId: string,
  type: NotificationType,
  priority: NotificationPriority,
  title: string,
  message: string,
  entityType: NotificationEntityType | null,
  entityId: string | null,
  actionLabel: string | null,
  actionRoute: string | null,
  createdBy: string | null = null,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return {
    organisationId: orgId,
    userId,
    type,
    title,
    message,
    relatedEntityType: entityType,
    relatedEntityId: entityId,
    createdAt: new Date().toISOString(),
    createdBy,
    priority,
    actionLabel,
    actionRoute,
    metadata: null,
  };
}

export function makeReviewCompletedDraft(
  orgId: string,
  userId: string,
  reviewId: string,
  gameName: string,
  educatorName: string,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return draft(orgId, userId, "review_completed", "normal",
    "Review Ready to View",
    `${educatorName} has completed the review for "${gameName}".`,
    "review", reviewId, "View Review", "refereeReview", educatorName);
}

export function makeAssignmentAssignedDraft(
  orgId: string,
  userId: string,
  assignmentId: string,
  assignmentTitle: string,
  assignerName: string,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return draft(orgId, userId, "assignment_assigned", "normal",
    "New Learning Assignment",
    `${assignerName} has assigned you "${assignmentTitle}".`,
    "assignment", assignmentId, "Start Learning", "my-learning", assignerName);
}

export function makeAssignmentCompletedDraft(
  orgId: string,
  userId: string,
  assignmentTitle: string,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return draft(orgId, userId, "assignment_completed", "low",
    "Assignment Complete",
    `You completed "${assignmentTitle}". Great work!`,
    "assignment", null, "View Progress", "my-learning", null);
}

export function makeGoalAssignedDraft(
  orgId: string,
  userId: string,
  goalTitle: string,
  educatorName: string,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return draft(orgId, userId, "goal_review_due", "normal",
    "Development Goal Assigned",
    `${educatorName} has assigned you the goal: "${goalTitle}".`,
    "development_goal", null, "View Goals", "referee-development", educatorName);
}

export function makeGoalUpdatedDraft(
  orgId: string,
  userId: string,
  goalTitle: string,
  educatorName: string,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return draft(orgId, userId, "goal_updated", "low",
    "Development Goal Updated",
    `${educatorName} has updated the goal: "${goalTitle}".`,
    "development_goal", null, "View Goals", "referee-development", educatorName);
}

export function makeNoteAddedDraft(
  orgId: string,
  userId: string,
  educatorName: string,
  noteTitle: string,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return draft(orgId, userId, "learning_note_added", "normal",
    "Coaching Note Added",
    `${educatorName} added a note: "${noteTitle}".`,
    "learning_note", null, "View Notes", "referee-development", educatorName);
}

export function createNotification(
  notifications: Notification[],
  draft: Omit<Notification, "id" | "isRead" | "readAt">
): Notification[] {
  const newNotif: Notification = {
    ...draft,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    isRead: false,
    readAt: null,
  };
  return [newNotif, ...notifications];
}

export function markNotificationRead(
  notifications: Notification[],
  id: string
): Notification[] {
  const now = new Date().toISOString();
  return notifications.map(n =>
    n.id === id ? { ...n, isRead: true, readAt: now } : n
  );
}

export function markAllNotificationsRead(notifications: Notification[]): Notification[] {
  const now = new Date().toISOString();
  return notifications.map(n =>
    n.isRead ? n : { ...n, isRead: true, readAt: now }
  );
}

export function deleteNotification(
  notifications: Notification[],
  id: string
): Notification[] {
  return notifications.filter(n => n.id !== id);
}

export function getUnreadNotificationCount(notifications: Notification[]): number {
  return notifications.filter(n => !n.isRead).length;
}
