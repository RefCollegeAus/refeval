export type OrgSport = "Basketball";

export type OrgDateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export type OrgTimeFormat = "12h" | "24h";

export type OrgReviewVisibility = "educators-only" | "assigned-referees";

export type ResourceLink = {
  id: string;
  title: string;
  url: string;
  description: string;
  addedAt: string;
};

export type OrganisationSettings = {
  profile: {
    name: string;
    shortName: string;
    sport: OrgSport;
    contactEmail: string;
    phone: string;
    website: string;
    address: string;
  };
  branding: {
    primaryColour: string;
    secondaryColour: string;
    accentColour: string;
    logoUrl: string | null;
    logoText: string;
  };
  preferences: {
    timezone: string;
    locale: string;
    dateFormat: OrgDateFormat;
    timeFormat: OrgTimeFormat;
    weekStartsOn: 0 | 1;
    country: string;
    defaultReviewVisibility: OrgReviewVisibility;
  };
  reviewDefaults: {
    timestampOffsetSeconds: number;
    requireOutcome: boolean;
    requireCoverage: boolean;
    requirePosition: boolean;
    requireCategory: boolean;
    requireSpecificTag: boolean;
    defaultCrewSize: 1 | 2 | 3;
    defaultClipLengthSeconds: number;
    requireCompletionNotes: boolean;
    requireEducatorSignature: boolean;
    autoPublishCompletedReviews: boolean;
    notifyRefereeOnCompletion: boolean;
    allowDraftReviews: boolean;
    defaultVisibility: OrgReviewVisibility;
  };
  learningDefaults: {
    assignmentDueDays: number;
    sendDueReminders: boolean;
    reminderDaysBefore: number;
    allowRefereeComments: boolean;
  };
  notifications: {
    newReviewAssigned: boolean;
    reviewCompleted: boolean;
    assignmentDue: boolean;
    assignmentCompleted: boolean;
    commentReceived: boolean;
  };
  security: {
    requireEmailVerification: boolean;
    sessionTimeoutMinutes: number;
  };
  resources: {
    learningDocuments: ResourceLink[];
  };
};

export const DEFAULT_ORG_SETTINGS: Omit<OrganisationSettings, "profile"> & {
  profile: Omit<OrganisationSettings["profile"], "name">;
} = {
  profile: {
    shortName: "",
    sport: "Basketball",
    contactEmail: "",
    phone: "",
    website: "",
    address: "",
  },
  branding: {
    primaryColour: "#a56a1b",
    secondaryColour: "#2c2c2e",
    accentColour: "#636366",
    logoUrl: null,
    logoText: "",
  },
  preferences: {
    timezone: "Australia/Sydney",
    locale: "en-AU",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    weekStartsOn: 1,
    country: "Australia",
    defaultReviewVisibility: "assigned-referees",
  },
  reviewDefaults: {
    timestampOffsetSeconds: -10,
    requireOutcome: true,
    requireCoverage: true,
    requirePosition: true,
    requireCategory: true,
    requireSpecificTag: true,
    defaultCrewSize: 1,
    defaultClipLengthSeconds: 60,
    requireCompletionNotes: false,
    requireEducatorSignature: false,
    autoPublishCompletedReviews: false,
    notifyRefereeOnCompletion: true,
    allowDraftReviews: true,
    defaultVisibility: "assigned-referees",
  },
  learningDefaults: {
    assignmentDueDays: 14,
    sendDueReminders: true,
    reminderDaysBefore: 3,
    allowRefereeComments: true,
  },
  notifications: {
    newReviewAssigned: true,
    reviewCompleted: true,
    assignmentDue: true,
    assignmentCompleted: true,
    commentReceived: true,
  },
  security: {
    requireEmailVerification: false,
    sessionTimeoutMinutes: 480,
  },
  resources: {
    learningDocuments: [],
  },
};

export function makeDefaultSettings(orgName: string): OrganisationSettings {
  return {
    ...DEFAULT_ORG_SETTINGS,
    profile: {
      ...DEFAULT_ORG_SETTINGS.profile,
      name: orgName,
    },
  };
}
