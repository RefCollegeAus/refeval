export type NoteType =
  | "General"
  | "Mentoring"
  | "Training"
  | "Sideline Feedback"
  | "Review Follow-up"
  | "Welfare / Support"
  | "Other";

export type NoteVisibility = "Educator Only" | "Visible to Referee";

export const NOTE_TYPES: NoteType[] = [
  "General",
  "Mentoring",
  "Training",
  "Sideline Feedback",
  "Review Follow-up",
  "Welfare / Support",
  "Other",
];

export const NOTE_VISIBILITIES: NoteVisibility[] = [
  "Educator Only",
  "Visible to Referee",
];

export type DevelopmentNote = {
  id: string;
  refereeId: string;
  organisationId: string;
  title: string;
  body: string;
  noteType: NoteType;
  visibility: NoteVisibility;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  linkedGoalId: string | null;
  // Reserved for future features — not yet implemented:
  // linkedReviewId: string | null;
  // linkedAssignmentId: string | null;
  // linkedCompetencyId: string | null;
  // attachments: string[];
  // aiSummary: string | null;
};

export type CreateNoteInput = {
  refereeId: string;
  title: string;
  body: string;
  noteType: NoteType;
  visibility: NoteVisibility;
  linkedGoalId: string | null;
};
