// ── Level system ──────────────────────────────────────────────────────────────

export type SimulatorLevel = "foundation" | "developing" | "intermediate" | "advanced" | "expert";

export const SIMULATOR_LEVELS: SimulatorLevel[] = [
  "foundation", "developing", "intermediate", "advanced", "expert",
];

export const LEVEL_LABELS: Record<SimulatorLevel, string> = {
  foundation:   "Foundation",
  developing:   "Developing",
  intermediate: "Intermediate",
  advanced:     "Advanced",
  expert:       "Expert",
};

export const LEVEL_COLORS: Record<SimulatorLevel, { color: string; bg: string; border: string }> = {
  foundation:   { color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
  developing:   { color: "#a78bfa", bg: "rgba(167,139,250,.12)", border: "rgba(167,139,250,.35)" },
  intermediate: { color: "#fbbf24", bg: "rgba(251,191,36,.12)",  border: "rgba(251,191,36,.35)"  },
  advanced:     { color: "#fb923c", bg: "rgba(251,146,60,.12)",  border: "rgba(251,146,60,.35)"  },
  expert:       { color: "#f87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.35)" },
};

export const LEVEL_DESCRIPTIONS: Record<SimulatorLevel, string> = {
  foundation:   "Call or No Call — identify whether action should be called",
  developing:   "Category group — identify the type of incident",
  intermediate: "Specific tag — name the exact call",
  advanced:     "Specific tag + position of primary official",
  expert:       "Specific tag + position + coverage area",
};

// ── Category taxonomy (mirrors page.tsx CATEGORY_GROUPS / SPECIFIC_TAGS) ─────

export const SIM_CATEGORY_GROUPS = ["Foul", "Violation", "Mechanics", "Game Awareness", "Game Administration"];

export const SIM_SPECIFIC_TAGS: Record<string, string[]> = {
  "Foul":               ["Push","Block","Charge","Hands","Hold","Illegal Screen","Impact","Disruption","Hook","Head Contact","Unsportsmanlike","Technical","Disqualifying","Other"],
  "Violation":          ["Travel","Out of Bounds","Double Dribble","Carry / Palming","Backcourt","3 Seconds","5 Seconds","8 Seconds","24 Seconds","Kick Ball","Jump Ball","Free Throw","Other"],
  "Mechanics":          ["Positioning","Coverage","Closed Angle","Rotation","Signals","Communication","Whistle Timing","Process","Other"],
  "Game Awareness":     ["Player Management","Bench Management","Preventative Officiating","Feel for Game","State of Game","Escalation","End of Quarter","Other"],
  "Game Administration":["Inbound Location","Game Clock","Shot Clock","Timeout","Substitution","Correctable Error","Other"],
};

export const SIM_POSITIONS = ["Trail", "Lead", "Centre"];
export const SIM_COVERAGE  = ["Primary", "Secondary", "Extended"];

// ── Legacy manual-event model (kept for backward compat) ─────────────────────

export const SIMULATOR_OUTCOMES = [
  "Foul", "No Call", "Violation", "Technical Foul", "Jump Ball", "Out of Bounds", "Other",
];

export const SIMULATOR_CALL_OPTIONS: Record<string, string[]> = {
  "Foul":           ["Push","Block","Charge","Hands","Hold","Illegal Screen","Impact","Other"],
  "Violation":      ["Travel","Out of Bounds","Double Dribble","Carry / Palming","3 Seconds","Backcourt","24 Seconds","Other"],
  "Technical Foul": ["Player","Coach","Bench"],
  "No Call":        [],
  "Jump Ball":      [],
  "Out of Bounds":  [],
  "Other":          [],
};

// ── Data types ────────────────────────────────────────────────────────────────

export interface SimulatorSession {
  id: string;
  organisationId: string;
  title: string;
  description: string;
  videoUrl: string;
  level?: SimulatorLevel; // legacy only — new sessions don't set a level at creation
  reviewId?: string;      // Phase 16.2: linked review used for event coding
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SimulatorEvent {
  id: string;
  sessionId: string;
  timestampSeconds: number;
  windowSeconds: number;
  correctOutcome: string;
  correctCall: string;
  category: string;
  notes: string;
  displayOrder: number;
}

export interface SimulatorSessionWithEvents extends SimulatorSession {
  events: SimulatorEvent[];
}

export interface SimulatorAttempt {
  id: string;
  sessionId: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  total: number | null;
  level: string;
}

export interface SimulatorResponse {
  id: string;
  attemptId: string;
  eventId?: string;
  clipId?: string;
  responseOutcome: string;
  responseCall: string;
  responseTimeSeconds: number | null;
  isCorrect: boolean;
  createdAt: string;
}
