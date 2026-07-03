export type GoalPriority = "Low" | "Medium" | "High";
export type GoalStatus = "Active" | "Completed" | "Archived";

export const GOAL_PRIORITIES: GoalPriority[] = ["Low", "Medium", "High"];
export const GOAL_STATUSES: GoalStatus[] = ["Active", "Completed", "Archived"];

// Editable in code for future expansion
export const GOAL_CATEGORIES = [
  "Positioning",
  "Communication",
  "Game Management",
  "Rules",
  "Professionalism",
  "Mechanics",
  "Other",
] as const;

export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export type DevelopmentGoal = {
  id: string;
  refereeId: string;
  organisationId: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  targetReviewDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
};

export type CreateGoalInput = {
  refereeId: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  targetReviewDate?: string | null;
};
