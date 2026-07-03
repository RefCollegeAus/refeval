export type GoalPriority = "Low" | "Medium" | "High";
export type GoalStatus = "Active" | "Completed" | "Archived";
export type GoalAssignmentType = "Individual" | "SelectedReferees" | "Everyone";

export const GOAL_PRIORITIES: GoalPriority[] = ["Low", "Medium", "High"];
export const GOAL_STATUSES: GoalStatus[] = ["Active", "Completed", "Archived"];
export const GOAL_ASSIGNMENT_TYPES: GoalAssignmentType[] = ["Individual", "SelectedReferees", "Everyone"];

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

// ── Layer 1: Goal definition ──────────────────────────────────────────────────
// Reusable coaching goal template. Contains no progress or assignment state.
// Editing this record updates the goal name/description across all referees.

export type DevGoalDef = {
  id: string;
  organisationId: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

// ── Layer 2: Assignment record ────────────────────────────────────────────────
// Represents the act of assigning a goal definition to one or more referees.
// Preserved for future reporting (who assigned what, when, to whom).

export type DevGoalAssignment = {
  id: string;
  goalId: string;
  organisationId: string;
  assignmentType: GoalAssignmentType;
  assignedRefereeIds: string[];
  assignedBy: string;
  assignedAt: string;
};

// ── Layer 3: Per-referee progress record ──────────────────────────────────────
// Each assigned referee gets their own RefereeGoal to track independent progress.

export type RefereeGoal = {
  id: string;
  goalId: string;
  refereeId: string;
  organisationId: string;
  status: GoalStatus;
  notes: string;
  targetReviewDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
};

// ── Merged view for display ───────────────────────────────────────────────────
// Combines RefereeGoal + DevGoalDef fields for use in UI components.
// id is the RefereeGoal id; goalId links back to the DevGoalDef.

export type RefereeGoalView = RefereeGoal & {
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
};

// ── Input for creating and assigning a goal ───────────────────────────────────

export type AssignGoalInput = {
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  assignmentType: GoalAssignmentType;
  assignedRefereeIds: string[]; // ignored when assignmentType === "Everyone"
  targetReviewDate: string | null;
};

// ── V1 migration type (Phase 9.1 format) ─────────────────────────────────────
// Used only during one-time migration from old storage key.

export type _V1DevelopmentGoal = {
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
