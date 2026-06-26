import type { Role } from "@/lib/types/auth";

export type MemberRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  organisationId: string;
};

export type EnrichedMember = MemberRecord & {
  joinedAt: string | null;
  invitedAt: string | null;
  lastSignInAt: string | null;
  invitationStatus: "pending" | "active";
};
