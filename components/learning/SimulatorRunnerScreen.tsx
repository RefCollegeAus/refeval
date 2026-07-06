"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap, ChevronLeft, CheckCircle2, XCircle, Clock, Play, RotateCcw, Plus,
} from "lucide-react";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function LevelBadge({ level }: { level: SimulatorLevel }) {
  const c = LEVEL_COLORS[level];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: c.color, background: c.bg, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>
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
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
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
    <div style={{ borderRadius: 10, overflow: "hidden", background: "#000" }}>
      <video
        ref={videoRef}
        src={src}
        controls
        style={{ width: "100%", display: "block", maxHeight: "60vh" }}
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
    <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--muted)", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)" }}>
      <p style={{ margin: 0 }}>Video format not supported for automatic playback.</p>
      <p className="hint" style={{ margin: "4px 0 0" }}>Use a YouTube link or direct MP4/WebM URL.</p>
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
      style={{
        fontSize: 13, padding: "7px 14px", borderRadius: 8,
        background: selected ? "var(--accent)" : "var(--panel2)",
        color: selected ? "#000" : "var(--text)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
        fontWeight: selected ? 700 : 400,
        cursor: "pointer",
      }}
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
      responseCall = position || coverage || "";
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
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,.82)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        background: "var(--panel)", border: "1px solid var(--border)",
        borderRadius: 14, padding: "24px 28px", maxWidth: 520, width: "100%",
        boxShadow: "0 24px 60px rgba(0,0,0,.6)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Zap size={18} style={{ color: "#fbbf24", flexShrink: 0 }} />
          <p className="eyebrow" style={{ margin: 0 }}>Decision Point</p>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: timerColor }}>
            <Clock size={14} /> {remaining}s
          </div>
        </div>

        {/* Timer bar */}
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginBottom: 20, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: timerColor, transition: "width 1s linear, background 0.3s" }} />
        </div>

        <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>What is your call at {fmtTime(ts)}?</h2>

        {/* Clip-based prompts */}
        {isClip && (
          <>
            {level === "foundation" && (
              <>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Call or No Call?</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <OptionBtn label="Call" selected={callDecision === "Call"} onClick={() => setCallDecision("Call")} />
                  <OptionBtn label="No Call" selected={callDecision === "No Call"} onClick={() => setCallDecision("No Call")} />
                </div>
              </>
            )}

            {level === "developing" && (
              <>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>What category of incident?</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SIM_CATEGORY_GROUPS.map(g => (
                    <OptionBtn key={g} label={g} selected={categoryGroup === g} onClick={() => setCategoryGroup(g)} />
                  ))}
                </div>
              </>
            )}

            {(level === "intermediate" || level === "advanced" || level === "expert") && (
              <>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Category</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {SIM_CATEGORY_GROUPS.map(g => (
                    <OptionBtn key={g} label={g} selected={categoryGroup === g} onClick={() => { setCategoryGroup(g); setCategory(""); }} />
                  ))}
                </div>

                {categoryGroup && (
                  <>
                    <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Specific call</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {specificTags.map(t => (
                        <OptionBtn key={t} label={t} selected={category === `${categoryGroup} — ${t}`} onClick={() => setCategory(`${categoryGroup} — ${t}`)} />
                      ))}
                    </div>
                  </>
                )}

                {(level === "advanced" || level === "expert") && category && (
                  <>
                    <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Position</p>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                      {SIM_POSITIONS.map(p => (
                        <OptionBtn key={p} label={p} selected={position === p} onClick={() => setPosition(p)} />
                      ))}
                    </div>
                  </>
                )}

                {level === "expert" && position && (
                  <>
                    <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Coverage</p>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Select outcome</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: legacyCallOptions.length > 0 ? 16 : 0 }}>
              {SIMULATOR_OUTCOMES.map(o => (
                <OptionBtn key={o} label={o} selected={legacyOutcome === o} onClick={() => { setLegacyOutcome(o); setLegacyCall(""); }} />
              ))}
            </div>

            {legacyCallOptions.length > 0 && (
              <>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Select call type</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {legacyCallOptions.map(c => (
                    <OptionBtn key={c} label={c} selected={legacyCall === c} onClick={() => setLegacyCall(c)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <button
          className="primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ width: "100%", marginTop: 20, padding: "10px 0", fontSize: 15, fontWeight: 700 }}
        >
          Submit Decision
        </button>
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
  session, responses, level, onTryAgain, onDone,
}: {
  session: SimulatorSessionWithEvents;
  responses: RecordedResponse[];
  level: SimulatorLevel;
  onTryAgain: () => void;
  onDone: () => void;
}) {
  const score = responses.filter(r => r.isCorrect).length;
  const total = responses.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  const grade = pct >= 90 ? { label: "Excellent", color: "#22c55e" }
    : pct >= 70 ? { label: "Good", color: "#3b82f6" }
    : pct >= 50 ? { label: "Developing", color: "#f59e0b" }
    : { label: "Needs Work", color: "#ef4444" };

  return (
    <div style={{ padding: "20px 20px 80px", boxSizing: "border-box", maxWidth: 680, margin: "0 auto" }}>
      <div className="panel" style={{ textAlign: "center", padding: "32px 24px", marginBottom: 16 }}>
        <Zap size={32} style={{ color: "#fbbf24", marginBottom: 10 }} />
        <p className="eyebrow">{session.title}</p>
        <div style={{ fontSize: 52, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginBottom: 4 }}>
          {score}<span style={{ fontSize: 28, fontWeight: 400, color: "var(--muted)" }}>/{total}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: grade.color, marginBottom: 8 }}>
          {pct}% — {grade.label}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={onTryAgain} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <RotateCcw size={14} /> Try Again
          </button>
          <button className="primary" onClick={onDone}>Done</button>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Decision Breakdown</h3>
        </div>
        {responses.map((r, i) => (
          <div
            key={activeEventId(r.activeEvent)}
            style={{
              padding: "14px 16px",
              borderBottom: i < responses.length - 1 ? "1px solid var(--border)" : "none",
              borderLeft: `3px solid ${r.isCorrect ? "#22c55e" : "#ef4444"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flexShrink: 0, paddingTop: 1 }}>
                {r.isCorrect
                  ? <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
                  : <XCircle size={18} style={{ color: "#ef4444" }} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    Event {i + 1} · {fmtTime(activeEventTimestamp(r.activeEvent))}
                  </span>
                  {r.responseTimeSeconds > 0 && (
                    <span className="hint" style={{ fontSize: 11 }}>
                      <Clock size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {r.responseTimeSeconds.toFixed(1)}s
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                  <div>
                    <span className="hint" style={{ fontSize: 11 }}>Your answer</span>
                    <div style={{ fontWeight: 600, color: r.isCorrect ? "#22c55e" : "#fca5a5" }}>
                      {r.responseOutcome
                        ? <>{r.responseOutcome}{r.responseCall ? ` · ${r.responseCall}` : ""}</>
                        : <em style={{ fontStyle: "italic", color: "var(--muted)" }}>No answer (timed out)</em>
                      }
                    </div>
                  </div>
                  <div>
                    <span className="hint" style={{ fontSize: 11 }}>Correct answer</span>
                    <div style={{ fontWeight: 600, color: "#22c55e" }}>
                      {correctAnswerLabel(r.activeEvent, level)}
                    </div>
                  </div>
                </div>
                {activeEventNotes(r.activeEvent) && (
                  <p className="hint" style={{ margin: "6px 0 0", fontSize: 12, fontStyle: "italic" }}>
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
  onBack: () => void;
  onCreateAttempt: (sessionId: string, level: string) => Promise<string>;
  onSaveResponse: (resp: SaveResponseData) => Promise<void>;
  onCompleteAttempt: (attemptId: string, score: number, total: number) => Promise<void>;
  initialSessionId?: string | null;
  onNavigateToBuilder?: () => void;
}

type RunnerView = "picker" | "intro" | "running" | "score";

// ── Main component ────────────────────────────────────────────────────────────

const MANAGEMENT_ROLES = ["educator", "admin", "super_admin"];

export function SimulatorRunnerScreen({
  session, sessions, loading, tags,
  onBack, onCreateAttempt, onSaveResponse, onCompleteAttempt,
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

  const playerActionsRef = useRef<PlayerActions | null>(null);
  const nextEventRef = useRef<SimActiveEvent | null>(null);
  const promptActiveRef = useRef(false);

  // Derive active events for selected session
  function getActiveEvents(sess: SimulatorSessionWithEvents): SimActiveEvent[] {
    if (sess.reviewId) {
      return tags
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
    setView("intro");
  }

  // ── Picker ──────────────────────────────────────────────────────────────────

  if (view === "picker") {
    return (
      <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="table-head">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Zap size={20} style={{ color: "#fbbf24", flexShrink: 0 }} />
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Learning Hub</p>
                <h1 style={{ margin: 0, fontSize: 22 }}>Referee Simulator</h1>
                <p className="hint" style={{ margin: "2px 0 0" }}>Test your decision-making on real game footage</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {canManage && onNavigateToBuilder && (
                <button
                  className="primary"
                  onClick={onNavigateToBuilder}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Plus size={14} /> Create Simulator
                </button>
              )}
              <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <ChevronLeft size={15} /> Back
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="panel" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>Loading simulators…</div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <Zap size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            {canManage ? (
              <>
                <p style={{ margin: 0, fontWeight: 700 }}>No Referee Simulators yet</p>
                <p className="hint" style={{ margin: "6px 0 16px" }}>
                  Create your first simulator to begin building decision-based referee training.
                </p>
                {onNavigateToBuilder && (
                  <button
                    className="primary"
                    onClick={onNavigateToBuilder}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Plus size={14} /> Create Simulator
                  </button>
                )}
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontWeight: 700 }}>No simulations available yet</p>
                <p className="hint" style={{ margin: "6px 0 0" }}>Your educator will create simulations for you to complete.</p>
              </>
            )}
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {sessions.map(s => {
              const eventCount = s.reviewId
                ? tags.filter(t => t.reviewId === s.reviewId).length
                : s.events.length;
              return (
                <div key={s.id} className="panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{s.title}</h3>
                  {s.description && (
                    <p className="hint" style={{ margin: 0, fontSize: 13 }}>{s.description}</p>
                  )}
                  <p className="hint" style={{ margin: 0, fontSize: 12 }}>
                    <Zap size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                    {eventCount} decision event{eventCount !== 1 ? "s" : ""}
                  </p>
                  <button
                    className="primary"
                    onClick={() => pickSession(s)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: "auto" }}
                  >
                    <Play size={13} /> Start Simulation
                  </button>
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
    const activeEvents = getActiveEvents(selectedSession);
    return (
      <div style={{ padding: "20px 20px 60px", boxSizing: "border-box", maxWidth: 580, margin: "0 auto" }}>
        <div className="panel">
          <button
            onClick={() => setView("picker")}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, marginBottom: 20 }}
          >
            <ChevronLeft size={14} /> All Simulations
          </button>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <Zap size={36} style={{ color: "#fbbf24", marginBottom: 10 }} />
            <h1 style={{ margin: "0 0 6px", fontSize: 22 }}>{selectedSession.title}</h1>
            <p className="hint" style={{ margin: 0 }}>
              {activeEvents.length} decision event{activeEvents.length !== 1 ? "s" : ""}
            </p>
          </div>

          {selectedSession.description && (
            <div style={{ padding: "14px 16px", background: "var(--panel2)", borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
              {selectedSession.description}
            </div>
          )}

          {/* Level picker */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 14 }}>Choose your difficulty level</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SIMULATOR_LEVELS.map(lv => {
                const c = LEVEL_COLORS[lv];
                const selected = selectedLevel === lv;
                return (
                  <button
                    key={lv}
                    onClick={() => setSelectedLevel(lv)}
                    style={{
                      textAlign: "left", padding: "10px 14px", borderRadius: 9,
                      background: selected ? c.bg : "var(--panel2)",
                      border: `1.5px solid ${selected ? c.border : "var(--border)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: c.color, marginRight: 10 }}>{LEVEL_LABELS[lv]}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{LEVEL_DESCRIPTIONS[lv]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: "14px 16px", background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.25)", borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>How it works</p>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", lineHeight: 1.7 }}>
              <li>Watch the video — it will pause at key decision moments</li>
              <li>Select your call within the time window</li>
              <li>{LEVEL_DESCRIPTIONS[selectedLevel]}</li>
              <li>See your score and explanations at the end</li>
            </ul>
          </div>

          <button
            className="primary"
            onClick={startSession}
            disabled={startingAttempt}
            style={{ width: "100%", padding: "12px 0", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            <Play size={16} /> {startingAttempt ? "Starting…" : "Start Simulation"}
          </button>
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
      <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Zap size={18} style={{ color: "#fbbf24" }} />
            <span style={{ fontWeight: 700 }}>{selectedSession.title}</span>
            <LevelBadge level={selectedLevel} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="hint" style={{ fontSize: 13 }}>
              {answered} / {total} decisions answered
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2, background: "var(--accent)",
            width: `${total > 0 ? (answered / total) * 100 : 0}%`,
            transition: "width 0.3s",
          }} />
        </div>

        {/* Video */}
        <SimulatorVideoPlayer
          videoUrl={selectedSession.videoUrl}
          actionsRef={playerActionsRef}
          onTimeUpdate={handleTimeUpdate}
        />

        <p className="hint" style={{ marginTop: 8, fontSize: 12, textAlign: "center" }}>
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
        onTryAgain={handleTryAgain}
        onDone={onBack}
      />
    );
  }

  return null;
}
