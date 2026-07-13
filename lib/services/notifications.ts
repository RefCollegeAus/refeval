import type { Notification, NotificationCategory, NotificationType, NotificationPriority, NotificationEntityType, NotificationPreferences } from "@/lib/types/notifications";

export function getNotificationCategory(type: NotificationType): NotificationCategory {
  switch (type) {
    case "review_assigned":
    case "review_completed":
    case "review_updated":
    case "comment_received":
      return "reviews";
    case "assignment_assigned":
    case "assignment_due":
    case "assignment_overdue":
    case "assignment_completed":
      return "assignments";
    case "playlist_shared":
    case "learning_note_added":
      return "learning";
    case "goal_review_due":
    case "goal_updated":
      return "goals";
    case "organisation_announcement":
      return "organisation";
    default:
      return "system";
  }
}

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
    "review", reviewId, "View My Reviews", "referee", educatorName);
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
    "development_goal", null, "View Goals", "referee-goals", educatorName);
}

export function makeGoalUpdatedDraft(
  orgId: string,
  userId: string,
  goalTitle: string,
  educatorName: string,
  refereeGoalId?: string | null,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return draft(orgId, userId, "goal_updated", "low",
    "Development Goal Updated",
    `${educatorName} has updated the goal: "${goalTitle}".`,
    "development_goal", refereeGoalId ?? null, "View Goals", "referee-goals", educatorName);
}

export function makeAssignmentDueSoonDraft(
  orgId: string,
  userId: string,
  assignmentId: string,
  title: string,
  dueDate: string,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return draft(orgId, userId, "assignment_due", "normal",
    "Assignment Due Soon",
    `"${title}" is due on ${dueDate}. Complete it before the deadline.`,
    "assignment", assignmentId, "Start Learning", "my-learning");
}

export function makeAssignmentOverdueDraft(
  orgId: string,
  userId: string,
  assignmentId: string,
  title: string,
  dueDate: string,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return draft(orgId, userId, "assignment_overdue", "high",
    "Assignment Overdue",
    `"${title}" was due on ${dueDate} and has not been completed.`,
    "assignment", assignmentId, "Complete Now", "my-learning");
}

export function makeGoalReviewDueDraft(
  orgId: string,
  userId: string,
  goalId: string,
  goalTitle: string,
  targetDate: string,
  isOverdue: boolean,
): Omit<Notification, "id" | "isRead" | "readAt"> {
  return draft(
    orgId, userId, "goal_review_due",
    isOverdue ? "high" : "normal",
    isOverdue ? "Goal Review Overdue" : "Goal Review Due Soon",
    isOverdue
      ? `Your review for "${goalTitle}" was due on ${targetDate}.`
      : `Your review for "${goalTitle}" is due on ${targetDate}.`,
    "development_goal", goalId, "View Goals", "referee-goals");
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
    "learning_note", null, "View Notes", "referee-goals", educatorName);
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

export function getVisibleUnreadCount(
  notifications: Notification[],
  prefs: NotificationPreferences | null,
): number {
  if (!prefs) return getUnreadNotificationCount(notifications);
  if (!prefs.inAppEnabled) return 0;
  return notifications.filter(n => {
    if (n.isRead) return false;
    switch (getNotificationCategory(n.type)) {
      case "reviews":      return prefs.reviewNotifications;
      case "assignments":  return prefs.assignmentNotifications;
      case "learning":     return prefs.learningNotifications;
      case "goals":        return prefs.developmentGoalNotifications;
      case "organisation": return prefs.organisationNotifications;
      case "system":       return prefs.systemNotifications;
    }
  }).length;
}
