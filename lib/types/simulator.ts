export type SimulatorLevel = "beginner" | "developing" | "intermediate" | "advanced" | "elite";

export const SIMULATOR_LEVELS: SimulatorLevel[] = [
  "beginner", "developing", "intermediate", "advanced", "elite",
];

export const LEVEL_LABELS: Record<SimulatorLevel, string> = {
  beginner:     "Beginner",
  developing:   "Developing",
  intermediate: "Intermediate",
  advanced:     "Advanced",
  elite:        "Elite",
};

export const LEVEL_COLORS: Record<SimulatorLevel, { color: string; bg: string; border: string }> = {
  beginner:     { color: "#60a5fa", bg: "rgba(96,165,250,.12)",  border: "rgba(96,165,250,.35)"  },
  developing:   { color: "#a78bfa", bg: "rgba(167,139,250,.12)", border: "rgba(167,139,250,.35)" },
  intermediate: { color: "#fbbf24", bg: "rgba(251,191,36,.12)",  border: "rgba(251,191,36,.35)"  },
  advanced:     { color: "#fb923c", bg: "rgba(251,146,60,.12)",  border: "rgba(251,146,60,.35)"  },
  elite:        { color: "#f87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.35)" },
};

// Decision outcomes the referee can choose from during a simulation
export const SIMULATOR_OUTCOMES = [
  "Foul",
  "No Call",
  "Violation",
  "Technical Foul",
  "Jump Ball",
  "Out of Bounds",
  "Other",
];

// Call sub-options per outcome (for intermediate+)
export const SIMULATOR_CALL_OPTIONS: Record<string, string[]> = {
  "Foul":          ["Push", "Block", "Charge", "Hands", "Hold", "Illegal Screen", "Impact", "Other"],
  "Violation":     ["Travel", "Out of Bounds", "Double Dribble", "Carry / Palming", "3 Seconds", "Backcourt", "24 Seconds", "Other"],
  "Technical Foul":["Player", "Coach", "Bench"],
  "No Call":       [],
  "Jump Ball":     [],
  "Out of Bounds": [],
  "Other":         [],
};

export interface SimulatorSession {
  id: string;
  organisationId: string;
  title: string;
  description: string;
  videoUrl: string;
  level: SimulatorLevel;
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
  eventId: string;
  responseOutcome: string;
  responseCall: string;
  responseTimeSeconds: number | null;
  isCorrect: boolean;
  createdAt: string;
}
