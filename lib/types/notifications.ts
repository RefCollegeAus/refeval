export type NotificationCategory =
  | "reviews"
  | "assignments"
  | "learning"
  | "goals"
  | "organisation"
  | "system";

export type NotificationFilter =
  | "all"
  | "unread"
  | "reviews"
  | "assignments"
  | "learning"
  | "goals"
  | "organisation"
  | "system";

export type NotificationPreferences = {
  userId: string;
  inAppEnabled: boolean;
  reviewNotifications: boolean;
  assignmentNotifications: boolean;
  learningNotifications: boolean;
  developmentGoalNotifications: boolean;
  organisationNotifications: boolean;
  systemNotifications: boolean;
};

export type NotificationType =
  | "review_assigned"
  | "review_completed"
  | "review_updated"
  | "assignment_assigned"
  | "assignment_due"
  | "assignment_overdue"
  | "assignment_completed"
  | "goal_review_due"
  | "goal_updated"
  | "playlist_shared"
  | "learning_note_added"
  | "comment_received"
  | "organisation_announcement"
  | "system";

export type NotificationPriority = "low" | "normal" | "high";

export type NotificationEntityType =
  | "review"
  | "assignment"
  | "development_goal"
  | "playlist"
  | "learning_note"
  | "comment"
  | "organisation"
  | "system";

export type Notification = {
  id: string;
  organisationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: NotificationEntityType | null;
  relatedEntityId: string | null;
  createdAt: string;
  createdBy: string | null;
  isRead: boolean;
  readAt: string | null;
  priority: NotificationPriority;
  actionLabel: string | null;
  actionRoute: string | null;
  metadata: Record<string, unknown> | null;
};
