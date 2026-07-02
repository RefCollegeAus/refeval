export type AssignmentStatus = "Assigned" | "Started" | "Completed";

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ["Assigned", "Started", "Completed"];

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
