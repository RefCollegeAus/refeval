"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap, ChevronLeft, CheckCircle2, XCircle, Clock, Play, RotateCcw, Plus,
} from "lucide-react";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
import { cn } from "@/lib/utils/cn";
import { Badge, Button } from "@/components/ui";
import type { RefEvalSession } from "@/lib/types/auth";
import type { CodedTag } from "@/lib/types/reviews";
import {
  SimulatorSessionWithEvents,
  SimulatorEvent,
  SimulatorLevel,
  LEVEL_LABELS,
  LEVEL_COLORS,
  LEVEL_DESCRIPTIONS,
  SIMULATOR_LEVELS,
  SIMULATOR_OUTCOMES,
  SIMULATOR_CALL_OPTIONS,
  SIM_CATEGORY_GROUPS,
  SIM_SPECIFIC_TAGS,
  SIM_POSITIONS,
  SIM_COVERAGE,
} from "@/lib/types/simulator";
import type { SaveResponseData } from "@/lib/hooks/useSimulatorSessions";
import { useSimulatorDecisionClips } from "@/lib/hooks/useSimulatorDecisionClips";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function LevelBadge({ level }: { level: SimulatorLevel }) {
  const c = LEVEL_COLORS[level];
  return (
    <span
      className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {LEVEL_LABELS[level]}
    </span>
  );
}

// ── Active event union ────────────────────────────────────────────────────────

type SimActiveEvent =
  | { kind: "clip"; tag: CodedTag }
  | { kind: "legacy"; event: SimulatorEvent };

function activeEventId(e: SimActiveEvent) {
  return e.kind === "clip" ? e.tag.id : e.event.id;
}

function activeEventTimestamp(e: SimActiveEvent) {
  return e.kind === "clip" ? e.tag.adjustedSeconds : e.event.timestampSeconds;
}

function activeEventWindow(e: SimActiveEvent) {
  return e.kind === "clip" ? 15 : e.event.windowSeconds;
}

function activeEventNotes(e: SimActiveEvent) {
  return e.kind === "clip" ? (e.tag.notes || "") : (e.event.notes || "");
}

function deriveCallFromOutcome(outcome: string): "Call" | "No Call" {
  return ["Correct Call", "Incorrect No Call"].includes(outcome) ? "Call" : "No Call";
}

function checkCorrectClip(tag: CodedTag, response: ClipResponse, level: SimulatorLevel): boolean {
  switch (level) {
    case "foundation": {
      const correct = deriveCallFromOutcome(tag.outcome || "");
      return response.callDecision === correct;
    }
    case "developing": {
      const correctGroup = (tag.category || "").split(" — ")[0];
      return !!correctGroup && response.categoryGroup === correctGroup;
    }
    case "intermediate": {
      return !!tag.category && response.category === tag.category;
    }
    case "advanced": {
      return (
        !!tag.category && response.category === tag.category &&
        !!tag.position && response.position === tag.position
      );
    }
    case "expert": {
      return (
        !!tag.category && response.category === tag.category &&
        !!tag.position && response.position === tag.position &&
        !!tag.coverage && response.coverage === tag.coverage
      );
    }
    default: return false;
  }
}

function checkCorrectLegacy(event: SimulatorEvent, outcome: string, call: string, level: string): boolean {
  if (!event.correctOutcome) return false;
  const outcomeMatch = outcome.toLowerCase() === event.correctOutcome.toLowerCase();
  if (level === "foundation" || level === "beginner" || level === "developing") return outcomeMatch;
  const callNeeded = (SIMULATOR_CALL_OPTIONS[event.correctOutcome] ?? []).length > 0;
  if (!callNeeded) return outcomeMatch;
  return outcomeMatch && call.toLowerCase() === event.correctCall.toLowerCase();
}

interface ClipResponse {
  callDecision?: "Call" | "No Call";
  categoryGroup?: string;
  category?: string;
  position?: string;
  coverage?: string;
}

// ── Video player with time-update callback ────────────────────────────────────

type PlayerActions = {
  pause: () => void;
  play: () => void;
  seekTo: (t: number) => void;
};

function YoutubeSimPlayer({
  ytId,
  actionsRef,
  onTimeUpdate,
}: {
  ytId: string;
  actionsRef: React.MutableRefObject<PlayerActions | null>;
  onTimeUpdate: (t: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const cancelledRef = useRef(false);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  useEffect(() => {
    cancelledRef.current = false;

    function createPlayer() {
      if (cancelledRef.current || !containerRef.current || !window.YT?.Player) return;
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch { }
        playerRef.current = null;
      }
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: ytId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: 0 },
        events: {
          onReady: () => {
            if (cancelledRef.current) return;
            actionsRef.current = {
              pause: () => playerRef.current?.pauseVideo?.(),
              play: () => playerRef.current?.playVideo?.(),
              seekTo: t => playerRef.current?.seekTo?.(t, true),
            };
          },
        },
      });
    }

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        createPlayer();
      };
    }

    // Poll current time every 500ms
    const interval = setInterval(() => {
      if (cancelledRef.current || !playerRef.current) return;
      const state: number = playerRef.current.getPlayerState?.() ?? -1;
      if (state !== 1) return; // 1 = playing
      const t: number = playerRef.current.getCurrentTime?.() ?? 0;
      onTimeUpdateRef.current(t);
    }, 500);

    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
      actionsRef.current = null;
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch { }
        playerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytId]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-[10px] bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

function DirectSimPlayer({
  src,
  actionsRef,
  onTimeUpdate,
}: {
  src: string;
  actionsRef: React.MutableRefObject<PlayerActions | null>;
  onTimeUpdate: (t: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  useEffect(() => {
    actionsRef.current = {
      pause: () => videoRef.current?.pause(),
      play: () => { videoRef.current?.play().catch(() => {}); },
      seekTo: t => { if (videoRef.current) videoRef.current.currentTime = t; },
    };
    return () => { actionsRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className="overflow-hidden rounded-[10px] bg-black">
      <video
        ref={videoRef}
        src={src}
        controls
        className="block max-h-[60vh] w-full"
        onTimeUpdate={() => {
          if (videoRef.current) onTimeUpdateRef.current(videoRef.current.currentTime);
        }}
      />
    </div>
  );
}

function SimulatorVideoPlayer({
  videoUrl,
  actionsRef,
  onTimeUpdate,
}: {
  videoUrl: string;
  actionsRef: React.MutableRefObject<PlayerActions | null>;
  onTimeUpdate: (t: number) => void;
}) {
  const ytId = getYouTubeId(videoUrl);
  const isDirect = !ytId && isDirectVideoUrl(videoUrl);

  if (ytId) {
    return <YoutubeSimPlayer ytId={ytId} actionsRef={actionsRef} onTimeUpdate={onTimeUpdate} />;
  }
  if (isDirect) {
    return <DirectSimPlayer src={videoUrl} actionsRef={actionsRef} onTimeUpdate={onTimeUpdate} />;
  }
  return (
    <div className="rounded-[10px] border border-border bg-panel p-6 text-center text-[13px] text-muted">
      <p className="m-0">Video format not supported for automatic playback.</p>
      <p className="hint mt-1">Use a YouTube link or direct MP4/WebM URL.</p>
    </div>
  );
}

// ── Decision prompt modal ─────────────────────────────────────────────────────

interface PromptResult {
  eventId: string;
  clipId?: string;
  responseOutcome: string;
  responseCall: string;
  responseTimeSeconds: number;
  isCorrect: boolean;
}

interface DecisionPromptProps {
  activeEvent: SimActiveEvent;
  level: SimulatorLevel;
  promptStartTime: number;
  onSubmit: (result: PromptResult) => void;
}

function OptionBtn({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border px-3.5 py-[7px] text-[13px]",
        selected
          ? "border-accent bg-accent font-bold text-black"
          : "border-border bg-panel-2 font-normal text-text"
      )}
    >
      {label}
    </button>
  );
}

function DecisionPrompt({ activeEvent, level, promptStartTime, onSubmit }: DecisionPromptProps) {
  const windowSeconds = activeEventWindow(activeEvent);
  const [remaining, setRemaining] = useState(Math.ceil(windowSeconds));

  // Clip-based state
  const [callDecision, setCallDecision] = useState<"Call" | "No Call" | "">("");
  const [categoryGroup, setCategoryGroup] = useState("");
  const [category, setCategory] = useState("");
  const [position, setPosition] = useState("");
  const [coverage, setCoverage] = useState("");

  // Legacy state
  const [legacyOutcome, setLegacyOutcome] = useState("");
  const [legacyCall, setLegacyCall] = useState("");

  const isClip = activeEvent.kind === "clip";
  const ts = activeEventTimestamp(activeEvent);
  const id = activeEventId(activeEvent);

  const specificTags = categoryGroup ? (SIM_SPECIFIC_TAGS[categoryGroup] ?? []) : [];
  const legacyCallOptions = SIMULATOR_CALL_OPTIONS[legacyOutcome] ?? [];

  const canSubmit = isClip
    ? (
        (level === "foundation" && callDecision !== "") ||
        (level === "developing" && categoryGroup !== "") ||
        (level === "intermediate" && category !== "") ||
        (level === "advanced" && category !== "" && position !== "") ||
        (level === "expert" && category !== "" && position !== "" && coverage !== "")
      )
    : (
        legacyOutcome !== "" &&
        (legacyCallOptions.length === 0 || legacyCall !== "" ||
          level === "foundation" || level === "developing")
      );

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(interval);
          const elapsed = (performance.now() - promptStartTime) / 1000;
          onSubmit({ eventId: id, clipId: isClip ? id : undefined, responseOutcome: "", responseCall: "", responseTimeSeconds: elapsed, isCorrect: false });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleSubmit() {
    if (!canSubmit) return;
    const elapsed = (performance.now() - promptStartTime) / 1000;
    let responseOutcome = "";
    let responseCall = "";
    let isCorrect = false;

    if (isClip) {
      const tag = activeEvent.tag;
      const resp: ClipResponse = { callDecision: callDecision as any, categoryGroup, category, position, coverage };
      isCorrect = checkCorrectClip(tag, resp, level);
      responseOutcome = callDecision || categoryGroup || category || "";
      responseCall = level === "expert"
        ? [position, coverage].filter(Boolean).join(" · ")
        : position || "";
    } else {
      isCorrect = checkCorrectLegacy(activeEvent.event, legacyOutcome, legacyCall, level);
      responseOutcome = legacyOutcome;
      responseCall = legacyCall;
    }

    onSubmit({
      eventId: id,
      clipId: isClip ? id : undefined,
      responseOutcome,
      responseCall,
      responseTimeSeconds: Math.round(elapsed * 10) / 10,
      isCorrect,
    });
  }

  const pct = Math.max(0, remaining / Math.ceil(windowSeconds)) * 100;
  const timerColor = remaining <= 3 ? "#ef4444" : remaining <= 5 ? "#f59e0b" : "#22c55e";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/[82%] p-4">
      <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-[14px] border border-border bg-panel px-7 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="mb-1.5 flex items-center gap-2.5">
          <Zap size={18} className="shrink-0 text-amber-400" />
          <p className="eyebrow m-0">Decision Point</p>
          <div className="ml-auto flex items-center gap-[5px] text-[13px] font-bold" style={{ color: timerColor }}>
            <Clock size={14} /> {remaining}s
          </div>
        </div>

        {/* Timer bar */}
        <div className="mb-5 h-1 overflow-hidden rounded-sm bg-border">
          <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: timerColor, transition: "width 1s linear, background 0.3s" }} />
        </div>

        <h2 className="mb-4 mt-0 text-[17px]">What is your call at {fmtTime(ts)}?</h2>

        {/* Clip-based prompts */}
        {isClip && (
          <>
            {level === "foundation" && (
              <>
                <p className="mb-2.5 mt-0 text-[13px] font-semibold text-muted">Call or No Call?</p>
                <div className="flex gap-2.5">
                  <OptionBtn label="Call" selected={callDecision === "Call"} onClick={() => setCallDecision("Call")} />
                  <OptionBtn label="No Call" selected={callDecision === "No Call"} onClick={() => setCallDecision("No Call")} />
                </div>
              </>
            )}

            {level === "developing" && (
              <>
                <p className="mb-2.5 mt-0 text-[13px] font-semibold text-muted">What category of incident?</p>
                <div className="flex flex-wrap gap-2">
                  {SIM_CATEGORY_GROUPS.map(g => (
                    <OptionBtn key={g} label={g} selected={categoryGroup === g} onClick={() => setCategoryGroup(g)} />
                  ))}
                </div>
              </>
            )}

            {(level === "intermediate" || level === "advanced" || level === "expert") && (
              <>
                <p className="mb-2.5 mt-0 text-[13px] font-semibold text-muted">Category</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {SIM_CATEGORY_GROUPS.map(g => (
                    <OptionBtn key={g} label={g} selected={categoryGroup === g} onClick={() => { setCategoryGroup(g); setCategory(""); }} />
                  ))}
                </div>

                {categoryGroup && (
                  <>
                    <p className="mb-2.5 mt-0 text-[13px] font-semibold text-muted">Specific call</p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {specificTags.map(t => (
                        <OptionBtn key={t} label={t} selected={category === `${categoryGroup} — ${t}`} onClick={() => setCategory(`${categoryGroup} — ${t}`)} />
                      ))}
                    </div>
                  </>
                )}

                {(level === "advanced" || level === "expert") && category && (
                  <>
                    <p className="mb-2.5 mt-0 text-[13px] font-semibold text-muted">Position</p>
                    <div className="mb-4 flex gap-2">
                      {SIM_POSITIONS.map(p => (
                        <OptionBtn key={p} label={p} selected={position === p} onClick={() => setPosition(p)} />
                      ))}
                    </div>
                  </>
                )}

                {level === "expert" && position && (
                  <>
                    <p className="mb-2.5 mt-0 text-[13px] font-semibold text-muted">Coverage</p>
                    <div className="mb-4 flex gap-2">
                      {SIM_COVERAGE.map(c => (
                        <OptionBtn key={c} label={c} selected={coverage === c} onClick={() => setCoverage(c)} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Legacy prompts */}
        {!isClip && (
          <>
            <p className="mb-2.5 mt-0 text-[13px] font-semibold text-muted">Select outcome</p>
            <div className={cn("flex flex-wrap gap-2", legacyCallOptions.length > 0 ? "mb-4" : "mb-0")}>
              {SIMULATOR_OUTCOMES.map(o => (
                <OptionBtn key={o} label={o} selected={legacyOutcome === o} onClick={() => { setLegacyOutcome(o); setLegacyCall(""); }} />
              ))}
            </div>

            {legacyCallOptions.length > 0 && (
              <>
                <p className="mb-2.5 mt-0 text-[13px] font-semibold text-muted">Select call type</p>
                <div className="flex flex-wrap gap-2">
                  {legacyCallOptions.map(c => (
                    <OptionBtn key={c} label={c} selected={legacyCall === c} onClick={() => setLegacyCall(c)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-5 w-full justify-center text-[15px] font-bold"
        >
          Submit Decision
        </Button>
      </div>
    </div>
  );
}

// ── Score screen ──────────────────────────────────────────────────────────────

interface RecordedResponse {
  activeEvent: SimActiveEvent;
  responseOutcome: string;
  responseCall: string;
  responseTimeSeconds: number;
  isCorrect: boolean;
}

function correctAnswerLabel(ae: SimActiveEvent, level: SimulatorLevel): string {
  if (ae.kind === "legacy") {
    const ev = ae.event;
    return ev.correctOutcome + (ev.correctCall ? ` — ${ev.correctCall}` : "");
  }
  const tag = ae.tag;
  switch (level) {
    case "foundation": return deriveCallFromOutcome(tag.outcome || "");
    case "developing": return (tag.category || "").split(" — ")[0] || "—";
    case "intermediate": return tag.category || "—";
    case "advanced": return `${tag.category || "—"} · ${tag.position || "—"}`;
    case "expert": return `${tag.category || "—"} · ${tag.position || "—"} · ${tag.coverage || "—"}`;
    default: return "—";
  }
}

function ScoreScreen({
  session, responses, level, assignmentCompleted, onTryAgain, onDone,
}: {
  session: SimulatorSessionWithEvents;
  responses: RecordedResponse[];
  level: SimulatorLevel;
  assignmentCompleted?: boolean;
  onTryAgain: () => void;
  onDone: () => void;
}) {
  const score = responses.filter(r => r.isCorrect).length;
  const total = responses.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  // "Good"/"Needs Work" reuse the exact --good/--danger token matches; the "Good" and
  // "Developing" tiers (blue/amber) have no equivalent token in the design system (--warn is
  // aliased to the brownish accent colour, not true amber), so those two stay literal, same
  // call as the amber left in commit 5c10432.
  const grade = pct >= 90 ? { label: "Excellent", color: "var(--good)" }
    : pct >= 70 ? { label: "Good", color: "#3b82f6" }
    : pct >= 50 ? { label: "Developing", color: "#f59e0b" }
    : { label: "Needs Work", color: "var(--danger)" };

  return (
    <div className="box-border mx-auto max-w-[680px]">
      <div className="panel mb-4 px-6 py-8 text-center">
        <Zap size={32} className="mb-2.5 text-amber-400" />
        <p className="eyebrow">{session.title}</p>
        <div className="mb-1 text-[52px] font-extrabold leading-[1.1] tabular-nums">
          {score}<span className="text-[28px] font-normal text-muted">/{total}</span>
        </div>
        <div className="mb-2 text-lg font-bold" style={{ color: grade.color }}>
          {pct}% — {grade.label}
        </div>
        {assignmentCompleted && (
          <div className="mb-3.5 flex items-center justify-center gap-1.5 rounded-lg border border-good/30 bg-good/10 px-4 py-2 text-[13px] text-green-300">
            <CheckCircle2 size={14} className="shrink-0 text-good" />
            Assignment marked complete
          </div>
        )}
        <div className="flex justify-center gap-2">
          <Button variant="secondary" onClick={onTryAgain}>
            <RotateCcw size={14} /> Try Again
          </Button>
          <Button variant="primary" onClick={onDone}>Done</Button>
        </div>
      </div>

      <div className="panel overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="m-0 text-sm font-bold">Decision Breakdown</h3>
        </div>
        {responses.map((r, i) => (
          <div
            key={activeEventId(r.activeEvent)}
            className={cn(
              "border-l-[3px] px-4 py-3.5",
              i < responses.length - 1 && "border-b border-border",
              r.isCorrect ? "border-l-good" : "border-l-danger"
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="shrink-0 pt-px">
                {r.isCorrect
                  ? <CheckCircle2 size={18} className="text-good" />
                  : <XCircle size={18} className="text-danger" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold">
                    Decision {i + 1} · {fmtTime(activeEventTimestamp(r.activeEvent))}
                  </span>
                  {r.responseTimeSeconds > 0 && (
                    <span className="hint text-[11px]">
                      <Clock size={10} className="inline align-middle" /> {r.responseTimeSeconds.toFixed(1)}s
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
                  <div>
                    <span className="hint text-[11px]">Your answer</span>
                    <div className={cn("font-semibold", r.isCorrect ? "text-good" : "text-red-300")}>
                      {r.responseOutcome
                        ? <>{r.responseOutcome}{r.responseCall ? ` · ${r.responseCall}` : ""}</>
                        : <em className="italic text-muted">No answer (timed out)</em>
                      }
                    </div>
                  </div>
                  <div>
                    <span className="hint text-[11px]">Correct answer</span>
                    <div className="font-semibold text-good">
                      {correctAnswerLabel(r.activeEvent, level)}
                    </div>
                  </div>
                </div>
                {activeEventNotes(r.activeEvent) && (
                  <p className="hint mt-1.5 text-xs italic">
                    {activeEventNotes(r.activeEvent)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  session: RefEvalSession;
  sessions: SimulatorSessionWithEvents[];
  loading: boolean;
  tags: CodedTag[];
  publishedSessionIds?: Set<string>;
  onBack: () => void;
  onCreateAttempt: (sessionId: string, level: string) => Promise<string>;
  onSaveResponse: (resp: SaveResponseData) => Promise<void>;
  onCompleteAttempt: (attemptId: string, score: number, total: number) => Promise<void>;
  onSessionComplete?: (score: number, total: number) => Promise<void>;
  initialSessionId?: string | null;
  onNavigateToBuilder?: () => void;
}

type RunnerView = "picker" | "intro" | "running" | "score";

// ── Main component ────────────────────────────────────────────────────────────

const MANAGEMENT_ROLES = ["educator", "admin", "super_admin"];

export function SimulatorRunnerScreen({
  session, sessions, loading, tags, publishedSessionIds,
  onBack, onCreateAttempt, onSaveResponse, onCompleteAttempt, onSessionComplete,
  initialSessionId, onNavigateToBuilder,
}: Props) {
  const canManage = MANAGEMENT_ROLES.includes(session.activeRole ?? "");
  const [view, setView] = useState<RunnerView>(initialSessionId ? "intro" : "picker");
  const [selectedSession, setSelectedSession] = useState<SimulatorSessionWithEvents | null>(
    initialSessionId ? (sessions.find(s => s.id === initialSessionId) ?? null) : null
  );
  const [selectedLevel, setSelectedLevel] = useState<SimulatorLevel>("foundation");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [firedEventIds, setFiredEventIds] = useState<Set<string>>(new Set());
  const [promptEvent, setPromptEvent] = useState<SimActiveEvent | null>(null);
  const [promptStartTime, setPromptStartTime] = useState(0);
  const [responses, setResponses] = useState<RecordedResponse[]>([]);
  const [startingAttempt, setStartingAttempt] = useState(false);
  const [assignmentCompletedThisRun, setAssignmentCompletedThisRun] = useState(false);

  const playerActionsRef = useRef<PlayerActions | null>(null);
  const nextEventRef = useRef<SimActiveEvent | null>(null);
  const promptActiveRef = useRef(false);

  // Authenticated, entitlement-checked fetch of the selected session's
  // decision clips (review-linked sessions only — legacy sessions carry
  // their decisions in sess.events, already RLS-readable). This is the
  // single source of truth for running a review-linked simulator; the
  // picker's per-card decision count below still reads the ordinary `tags`
  // prop and is unaffected by (and not fixed by) this change.
  const decisionSessionId = selectedSession?.reviewId ? selectedSession.id : null;
  const { clips: decisionClips, loading: decisionClipsLoading, error: decisionClipsError } =
    useSimulatorDecisionClips(decisionSessionId);

  // Derive active events for selected session
  function getActiveEvents(sess: SimulatorSessionWithEvents): SimActiveEvent[] {
    if (sess.reviewId) {
      return decisionClips
        .filter(t => t.reviewId === sess.reviewId)
        .sort((a, b) => a.adjustedSeconds - b.adjustedSeconds)
        .map(t => ({ kind: "clip", tag: t } as SimActiveEvent));
    }
    return [...sess.events]
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
      .map(e => ({ kind: "legacy", event: e } as SimActiveEvent));
  }

  // Keep nextEventRef in sync
  useEffect(() => {
    if (!selectedSession) { nextEventRef.current = null; return; }
    const active = getActiveEvents(selectedSession);
    const unfired = active.filter(e => !firedEventIds.has(activeEventId(e)));
    nextEventRef.current = unfired[0] ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession, firedEventIds, tags]);

  // Keep promptActiveRef in sync
  useEffect(() => {
    promptActiveRef.current = promptEvent !== null;
  }, [promptEvent]);

  function pickSession(s: SimulatorSessionWithEvents) {
    setSelectedSession(s);
    setSelectedLevel("foundation");
    setView("intro");
    resetRunnerState();
  }

  function resetRunnerState() {
    setAttemptId(null);
    setFiredEventIds(new Set());
    setPromptEvent(null);
    setResponses([]);
  }

  async function startSession() {
    if (!selectedSession) return;
    setStartingAttempt(true);
    try {
      const id = await onCreateAttempt(selectedSession.id, selectedLevel);
      setAttemptId(id);
      setView("running");
    } finally {
      setStartingAttempt(false);
    }
  }

  const handleTimeUpdate = useCallback((currentTime: number) => {
    if (promptActiveRef.current) return;
    const next = nextEventRef.current;
    if (!next) return;
    if (currentTime >= activeEventTimestamp(next)) {
      playerActionsRef.current?.pause();
      const eid = activeEventId(next);
      setFiredEventIds(prev => { const n = new Set(prev); n.add(eid); return n; });
      setPromptEvent(next);
      setPromptStartTime(performance.now());
    }
  }, []);

  async function handlePromptSubmit(result: PromptResult) {
    if (!selectedSession || !attemptId) return;

    const activeEvents = getActiveEvents(selectedSession);
    const ae = activeEvents.find(e => activeEventId(e) === result.eventId);
    if (!ae) return;

    const recorded: RecordedResponse = {
      activeEvent: ae,
      responseOutcome: result.responseOutcome,
      responseCall: result.responseCall,
      responseTimeSeconds: result.responseTimeSeconds,
      isCorrect: result.isCorrect,
    };
    const newResponses = [...responses, recorded];
    setResponses(newResponses);

    await onSaveResponse({
      attemptId,
      eventId: result.clipId ? undefined : result.eventId,
      clipId: result.clipId,
      responseOutcome: result.responseOutcome,
      responseCall: result.responseCall,
      responseTimeSeconds: result.responseTimeSeconds,
      isCorrect: result.isCorrect,
    });

    setPromptEvent(null);

    const totalEvents = activeEvents.length;
    if (newResponses.length >= totalEvents) {
      const score = newResponses.filter(r => r.isCorrect).length;
      await onCompleteAttempt(attemptId, score, totalEvents);
      if (onSessionComplete) {
        try {
          await onSessionComplete(score, totalEvents);
          setAssignmentCompletedThisRun(true);
        } catch (e) {
          console.error("[SimulatorRunnerScreen] onSessionComplete error:", e);
        }
      }
      setView("score");
      return;
    }

    const ts = activeEventTimestamp(ae);
    const win = activeEventWindow(ae);
    playerActionsRef.current?.seekTo(ts + win);
    setTimeout(() => playerActionsRef.current?.play(), 200);
  }

  function handleTryAgain() {
    resetRunnerState();
    setAssignmentCompletedThisRun(false);
    setView("intro");
  }

  // ── Picker ──────────────────────────────────────────────────────────────────

  if (view === "picker") {
    return (
      <div className="box-border">
        <div className="panel mb-4">
          <div className="table-head">
            <div className="flex items-center gap-2.5">
              <Zap size={20} className="shrink-0 text-amber-400" />
              <div>
                <p className="eyebrow m-0">Learning Hub</p>
                <h1 className="m-0 text-[22px]">Referee Simulator</h1>
                <p className="hint mt-0.5">Test your decision-making on real game footage</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && onNavigateToBuilder && (
                <Button variant="primary" onClick={onNavigateToBuilder}>
                  <Plus size={14} /> Create Simulator
                </Button>
              )}
              <Button variant="secondary" onClick={onBack}>
                <ChevronLeft size={15} /> Back
              </Button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="panel p-8 text-center text-muted">Loading simulators…</div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="panel px-6 py-12 text-center text-muted">
            <Zap size={36} className="mb-3 opacity-30" />
            {canManage ? (
              <>
                <p className="m-0 font-bold">No Referee Simulators yet</p>
                <p className="hint mb-4 mt-1.5">
                  Create your first simulator to begin building decision-based referee training.
                </p>
                {onNavigateToBuilder && (
                  <Button variant="primary" onClick={onNavigateToBuilder}>
                    <Plus size={14} /> Create Simulator
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="m-0 font-bold">No simulations available yet</p>
                <p className="hint mt-1.5">Your educator will create simulations for you to complete.</p>
              </>
            )}
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {sessions.map(s => {
              const decisionCount = s.reviewId
                ? tags.filter(t => t.reviewId === s.reviewId).length
                : s.events.length;
              return (
                <div key={s.id} className="panel flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-start gap-2">
                    <h3 className="m-0 flex-1 text-[15px] font-bold leading-[1.3]">{s.title}</h3>
                    {canManage && (() => {
                      if (!s.reviewId) return <Badge tone="neutral">Legacy</Badge>;
                      const isPublished = publishedSessionIds?.has(s.id) ?? false;
                      if (isPublished) return <Badge tone="good">Published</Badge>;
                      // Draft: true amber (#f59e0b) has no exact match in the --warn token
                      // (aliased to the brownish accent colour here), so it's kept as a literal
                      // rather than forced onto Badge's warn tone — same call made for the
                      // equivalent amber in commit 5c10432.
                      return (
                        <span className="whitespace-nowrap rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/[12%] px-[7px] py-0.5 text-[11px] font-bold text-[#f59e0b]">
                          Draft
                        </span>
                      );
                    })()}
                  </div>
                  {s.description && (
                    <p className="hint m-0 text-[13px]">{s.description}</p>
                  )}
                  <p className="hint m-0 text-xs">
                    <Zap size={11} className="mr-[3px] inline align-middle" />
                    {decisionCount} decision{decisionCount !== 1 ? "s" : ""}
                  </p>
                  <Button variant="primary" onClick={() => pickSession(s)} className="mt-auto justify-center">
                    <Play size={13} /> Start Simulation
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Intro ───────────────────────────────────────────────────────────────────

  if (view === "intro" && selectedSession) {
    const isReviewLinked = !!selectedSession.reviewId;

    if (isReviewLinked && decisionClipsLoading) {
      return (
        <div className="box-border mx-auto max-w-[580px]">
          <div className="panel px-6 py-12 text-center text-muted">
            <p className="m-0">Loading decisions…</p>
          </div>
        </div>
      );
    }

    if (isReviewLinked && decisionClipsError) {
      return (
        <div className="box-border mx-auto max-w-[580px]">
          <div className="panel px-6 py-12 text-center">
            <Button variant="secondary" size="sm" onClick={() => setView("picker")} className="mx-auto mb-6">
              <ChevronLeft size={14} /> All Simulations
            </Button>
            <p className="m-0 font-bold text-red-300">Could not load decisions</p>
            <p className="hint mt-1.5">{decisionClipsError}</p>
          </div>
        </div>
      );
    }

    const activeEvents = getActiveEvents(selectedSession);

    if (activeEvents.length === 0) {
      return (
        <div className="box-border mx-auto max-w-[580px]">
          <div className="panel px-6 py-12 text-center">
            <Button variant="secondary" size="sm" onClick={() => setView("picker")} className="mx-auto mb-6">
              <ChevronLeft size={14} /> All Simulations
            </Button>
            <Zap size={36} className="mb-3 text-amber-400 opacity-40" />
            <p className="m-0 text-base font-bold">{selectedSession.title}</p>
            <p className="hint mt-2">
              This simulator has no decisions coded yet.
              {canManage ? " Open it in the Simulator Builder to code decision moments." : " Check back once your educator has finished setting it up."}
            </p>
            {canManage && onNavigateToBuilder && (
              <Button variant="primary" onClick={onNavigateToBuilder} className="mt-[18px]">
                Open Simulator Builder
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="box-border mx-auto max-w-[580px]">
        <div className="panel">
          <Button variant="secondary" size="sm" onClick={() => setView("picker")} className="mb-5">
            <ChevronLeft size={14} /> All Simulations
          </Button>

          <div className="mb-5 text-center">
            <Zap size={36} className="mb-2.5 text-amber-400" />
            <h1 className="mb-1.5 mt-0 text-[22px]">{selectedSession.title}</h1>
            <p className="hint m-0">
              {activeEvents.length} decision{activeEvents.length !== 1 ? "s" : ""}
            </p>
          </div>

          {selectedSession.description && (
            <div className="mb-5 rounded-lg bg-panel-2 px-4 py-3.5 text-sm">
              {selectedSession.description}
            </div>
          )}

          {/* Level picker */}
          <div className="mb-5">
            <p className="mb-2.5 mt-0 text-sm font-bold">Choose your difficulty level</p>
            <div className="flex flex-col gap-2">
              {SIMULATOR_LEVELS.map(lv => {
                const c = LEVEL_COLORS[lv];
                const selected = selectedLevel === lv;
                return (
                  <button
                    key={lv}
                    onClick={() => setSelectedLevel(lv)}
                    className="cursor-pointer rounded-[9px] border-[1.5px] px-3.5 py-2.5 text-left"
                    style={{
                      background: selected ? c.bg : "var(--panel2)",
                      borderColor: selected ? c.border : "var(--border)",
                    }}
                  >
                    <span className="mr-2.5 font-bold" style={{ color: c.color }}>{LEVEL_LABELS[lv]}</span>
                    <span className="text-xs text-muted">{LEVEL_DESCRIPTIONS[lv]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5 rounded-lg border border-amber-400/25 bg-amber-400/[6%] px-4 py-3.5 text-[13px]">
            <p className="mb-1.5 mt-0 font-bold">How it works</p>
            <ul className="m-0 pl-[18px] leading-[1.7] text-muted">
              <li>Watch the video — it will pause at key decision moments</li>
              <li>Select your call within the time window</li>
              <li>{LEVEL_DESCRIPTIONS[selectedLevel]}</li>
              <li>See your score and explanations at the end</li>
            </ul>
          </div>

          <Button variant="primary" onClick={startSession} disabled={startingAttempt} className="w-full justify-center">
            <Play size={16} /> {startingAttempt ? "Starting…" : "Start Simulation"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Running ─────────────────────────────────────────────────────────────────

  if (view === "running" && selectedSession) {
    const activeEvents = getActiveEvents(selectedSession);
    const answered = responses.length;
    const total = activeEvents.length;

    return (
      <div className="box-border">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Zap size={18} className="text-amber-400" />
            <span className="font-bold">{selectedSession.title}</span>
            <LevelBadge level={selectedLevel} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hint text-[13px]">
              {answered} / {total} decisions answered
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4 h-1 overflow-hidden rounded-sm bg-border">
          <div
            className="h-full rounded-sm bg-accent transition-[width] duration-300"
            style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
          />
        </div>

        {/* Video */}
        <SimulatorVideoPlayer
          videoUrl={selectedSession.videoUrl}
          actionsRef={playerActionsRef}
          onTimeUpdate={handleTimeUpdate}
        />

        <p className="hint mt-2 text-center text-xs">
          Watch the video — it will pause automatically at each decision point.
          {getYouTubeId(selectedSession.videoUrl) && " YouTube timing precision: ~500ms."}
        </p>

        {/* Decision prompt overlay */}
        {promptEvent && (
          <DecisionPrompt
            activeEvent={promptEvent}
            level={selectedLevel}
            promptStartTime={promptStartTime}
            onSubmit={handlePromptSubmit}
          />
        )}
      </div>
    );
  }

  // ── Score ───────────────────────────────────────────────────────────────────

  if (view === "score" && selectedSession) {
    return (
      <ScoreScreen
        session={selectedSession}
        responses={responses}
        level={selectedLevel}
        assignmentCompleted={assignmentCompletedThisRun}
        onTryAgain={handleTryAgain}
        onDone={onBack}
      />
    );
  }

  return null;
}
