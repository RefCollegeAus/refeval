export type LearningCategory =
  | "Game"
  | "Training"
  | "Rules"
  | "Mechanics"
  | "Promotion"
  | "Communication"
  | "Other";

export const LEARNING_CATEGORIES: LearningCategory[] = [
  "Game",
  "Training",
  "Rules",
  "Mechanics",
  "Promotion",
  "Communication",
  "Other",
];

export interface ViewOnlyGame {
  id: string;
  organisationId: string;
  title: string;
  category: LearningCategory;
  gameDate: string | null;
  videoUrl: string;
  createdBy: string;
  createdAt: string;
  assignedViewerIds: string[];
}

export interface ViewOnlyGameAssignment {
  id: string;
  gameId: string;
  viewerUserId: string;
  assignedBy: string;
  assignedAt: string;
}
