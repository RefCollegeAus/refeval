export type Role = "super_admin" | "admin" | "educator" | "referee" | "viewer";

export type Screen =
  | "login"
  | "org-selector"
  | "educator"
  | "referee"
  | "database"
  | "reviewer"
  | "refereeReview"
  | "org-settings"
  | "user-profile"
  | "comment-inbox"
  | "referee-stats"
  | "viewer"
  | "clip-library"
  | "playlists"
  | "playlist-detail"
  | "team-management"
  | "assignments"
  | "assignment-detail"
  | "my-learning"
  | "learning-runner"
  | "quiz-builder"
  | "learning-hub"
  | "learning-progress"
  | "groups"
  | "organisation"
  | "referee-development"
  | "referee-comments"
  | "notifications";

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
