export type Group = {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  colour: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
};

export type GroupMember = {
  id: string;
  groupId: string;
  userId: string;
  createdAt: string;
};

export type CreateGroupInput = {
  name: string;
  description: string;
  colour: string;
  memberIds: string[];
};

export type UpdateGroupInput = {
  name: string;
  description: string;
  colour: string;
};

export const GROUP_COLOURS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
] as const;
