export type Role = "super_admin" | "admin" | "educator" | "referee";

export type Screen =
  | "login"
  | "org-selector"
  | "educator"
  | "referee"
  | "database"
  | "reviewer"
  | "refereeReview"
  | "org-settings"
  | "user-profile";

export type RefEvalSession = {
  user: {
    id: string;
    email: string;
  };
  profile: {
    id: string;
    email: string;
    name: string;
  };
  memberships: {
    organisationId: string;
    organisationName: string;
    role: Role;
  }[];
  activeOrganisation: {
    id: string;
    name: string;
  } | null;
  activeRole: Role | null;
};
