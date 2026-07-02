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

export type AssignmentUser = {
  id: string;
  assignmentId: string;
  userId: string;
  status: AssignmentStatus;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type Assignment = {
  id: string;
  organisationId: string;
  playlistId: string;
  assignedBy: string | null;
  title: string;
  instructions: string | null;
  dueDate: string | null;
  required: boolean;
  createdAt: string;
  assignmentUsers: AssignmentUser[];
};

export type CreateAssignmentInput = {
  playlistId: string;
  title: string;
  instructions: string;
  dueDate: string | null;
  required: boolean;
  userIds: string[];
};
