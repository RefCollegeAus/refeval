// Relationship between a review and a development goal.
// Stored in localStorage; no Supabase schema change required.

export type ReviewGoalLink = {
  id: string;
  organisationId: string;
  reviewId: string;
  goalDefId: string;      // DevGoalDef.id
  refereeId: string;      // the referee this link is for
  linkedAt: string;       // ISO timestamp
  linkedBy: string;       // educator userId
  createdGoalFromReview: boolean; // true when the goal itself was created from this review
};

// Relationship between a single coded clip and a development goal.
export type ClipGoalLink = {
  id: string;
  organisationId: string;
  clipId: string;
  reviewId: string;
  goalDefId: string;
  refereeId: string;
};

export type CreateReviewGoalLinkInput = {
  reviewId: string;
  goalDefId: string;
  refereeId: string;
  createdGoalFromReview?: boolean;
};

export type CreateClipGoalLinkInput = {
  clipId: string;
  reviewId: string;
  goalDefId: string;
  refereeId: string;
};
