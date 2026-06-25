export type Mode = "video" | "non-video";
export type Status = "In Review" | "Completed";
export type RefSlot = "All Referees" | "Referee 1" | "Referee 2" | "Referee 3";

export type ClipReferee = { slot: RefSlot; type: "Call" | "Review" };

export type ReviewRecord = {
  id: string;
  organisationId: string;
  game: string;
  educatorId: string;
  educatorName: string;
  referee1Id: string;
  referee2Id: string;
  referee3Id: string;
  referee1Name: string;
  referee2Name: string;
  referee3Name: string;
  videoLink: string;
  timestampOffset: number;
  status: Status;
  createdAt: string;
  submittedAt?: string;
};

export type CodedTag = {
  id: string;
  reviewId: string;
  time: string;
  seconds: number;
  adjustedSeconds: number;
  adjustedTime: string;
  mode: Mode;
  refereeTarget: RefSlot;
  extraReviewOfficials: RefSlot[];
  clipOfficials: ClipReferee[];
  timestampLink?: string;
  outcome?: string;
  category?: string;
  position?: string;
  coverage?: string;
  notes?: string;
  createdAt: string;
};
