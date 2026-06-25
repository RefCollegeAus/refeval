import type { Role } from "@/lib/types/auth";

export type MemberRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  organisationId: string;
};
