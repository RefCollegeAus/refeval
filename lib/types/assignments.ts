import type { CSSProperties } from "react";

export type AssignmentStatus = "Assigned" | "Started" | "Completed";

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ["Assigned", "Started", "Completed"];

// ── Canonical Learning Status Design Tokens ───────────────────────────────────
// Single source of truth for status colours across all Learning screens.

export const STATUS_COLORS: Record<AssignmentStatus, string> = {
  Assigned:  "var(--muted)",
  Started:   "#fde68a",
  Completed: "#bbf7d0",
};

export const STATUS_BG: Record<AssignmentStatus, string> = {
  Assigned:  "rgba(148,163,184,.1)",
  Started:   "rgba(245,158,11,.12)",
  Completed: "rgba(34,197,94,.12)",
};

export const STATUS_BORDER: Record<AssignmentStatus, string> = {
  Assigned:  "rgba(148,163,184,.2)",
  Started:   "rgba(245,158,11,.3)",
  Completed: "rgba(34,197,94,.3)",
};

// Progress-bar / percentage colour ramp (used in table and card progress bars).
// Returns a CSS colour string. #22c55e at 100 %, #3b82f6 at ≥ 50 %, accent below.
export function learningPctColor(pct: number): string {
  if (pct >= 100) return "#22c55e";
  if (pct >= 50)  return "#3b82f6";
  return "var(--accent)";
}

export const REQUIRED_BADGE_STYLE: CSSProperties = {
  fontSize: 11,
  padding: "2px 7px",
  borderRadius: 999,
  background: "rgba(239,68,68,.15)",
  color: "#fca5a5",
  border: "1px solid rgba(239,68,68,.3)",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  answers: string[];
  correctAnswerIndex: number;
  required: boolean;
  displayOrder: number;
  clipResourceId?: string | null;
  explanation?: string;
  resourceType?: "video_url" | "review_clip" | null;
  resourceVideoUrl?: string | null;
  resourceReviewId?: string | null;
  resourceTagId?: string | null;
  resourceClipDurationSeconds?: number | null;
};

export type QuizAnswer = {
  questionId: string;
  selectedAnswerIndex: number | null;
};

export type ReflectionQuestion = {
  id: string;
  text: string;
  required: boolean;
  displayOrder: number;
};

export type ReflectionResponse = {
  questionId: string;
  response: string;
};

export type AssignmentUser = {
  id: string;
  assignmentId: string;
  userId: string;
  status: AssignmentStatus;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  watchedClipIds: string[];
  reflectionResponses: ReflectionResponse[] | null;
  reflectionSubmittedAt: string | null;
  quizAnswers: QuizAnswer[] | null;
  quizScore: number | null;
  quizTotal: number | null;
  quizSubmittedAt: string | null;
  quizAttemptCount: number;
};

export type Assignment = {
  id: string;
  organisationId: string;
  playlistId: string | null;
  simulatorSessionId: string | null;
  assignedBy: string | null;
  title: string;
  instructions: string | null;
  dueDate: string | null;
  required: boolean;
  quizAllowRetakes: boolean;
  createdAt: string;
  questions: ReflectionQuestion[];
  quizQuestions: QuizQuestion[];
  assignmentUsers: AssignmentUser[];
};

export type CreateAssignmentInput = {
  playlistId: string | null;
  simulatorSessionId: string | null;
  title: string;
  instructions: string;
  dueDate: string | null;
  required: boolean;
  quizAllowRetakes: boolean;
  userIds: string[];
  questions: ReflectionQuestion[];
  quizQuestions: QuizQuestion[];
};
