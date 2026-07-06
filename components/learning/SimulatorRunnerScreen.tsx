"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap, ChevronLeft, CheckCircle2, XCircle, Clock, Play, RotateCcw, Plus,
} from "lucide-react";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
import type { RefEvalSession } from "@/lib/types/auth";
import {
  SimulatorSessionWithEvents,
  SimulatorEvent,
  SimulatorLevel,
  LEVEL_LABELS,
  LEVEL_COLORS,
  SIMULATOR_OUTCOMES,
  SIMULATOR_CALL_OPTIONS,
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

function isBeginnerLevel(level: string) {
  return level === "beginner" || level === "developing";
}

function checkCorrect(event: SimulatorEvent, outcome: string, call: string, level: string): boolean {
  if (!event.correctOutcome) return false;
  const outcomeMatch = outcome.toLowerCase() === event.correctOutcome.toLowerCase();
  if (isBeginnerLevel(level)) return outcomeMatch;
  const callNeeded = (SIMULATOR_CALL_OPTIONS[event.correctOutcome] ?? []).length > 0;
  if (!callNeeded) return outcomeMatch;
  return outcomeMatch && call.toLowerCase() === event.correctCall.toLowerCase();
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
  responseOutcome: string;
  responseCall: string;
  responseTimeSeconds: number;
  isCorrect: boolean;
}

interface DecisionPromptProps {
  event: SimulatorEvent;
  level: string;
  promptStartTime: number;
  onSubmit: (result: PromptResult) => void;
}

function DecisionPrompt({ event, level, promptStartTime, onSubmit }: DecisionPromptProps) {
  const [outcome, setOutcome] = useState("");
  const [call, setCall] = useState("");
  const [remaining, setRemaining] = useState(Math.ceil(event.windowSeconds));
  const showCall = !isBeginnerLevel(level);
  const callOptions = SIMULATOR_CALL_OPTIONS[outcome] ?? [];
  const needsCall = showCall && callOptions.length > 0;
  const canSubmit = outcome !== "" && (!needsCall || call !== "");

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(interval);
          // Auto-submit with empty answers (timed out)
          const elapsed = (performance.now() - promptStartTime) / 1000;
          onSubmit({
            eventId: event.id,
            responseOutcome: "",
            responseCall: "",
            responseTimeSeconds: elapsed,
            isCorrect: false,
          });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  function handleSubmit() {
    if (!canSubmit) return;
    const elapsed = (performance.now() - promptStartTime) / 1000;
    const correct = checkCorrect(event, outcome, call, level);
    onSubmit({
      eventId: event.id,
      responseOutcome: outcome,
      responseCall: call,
      responseTimeSeconds: Math.round(elapsed * 10) / 10,
      isCorrect: correct,
    });
  }

  const pct = Math.max(0, remaining / Math.ceil(event.windowSeconds)) * 100;
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
        borderRadius: 14, padding: "24px 28px", maxWidth: 480, width: "100%",
        boxShadow: "0 24px 60px rgba(0,0,0,.6)",
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
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${pct}%`,
            background: timerColor,
            transition: "width 1s linear, background 0.3s",
          }} />
        </div>

        <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>
          What is your call at {fmtTime(event.timestampSeconds)}?
        </h2>

        {/* Outcome buttons */}
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Select outcome</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: needsCall ? 20 : 0 }}>
          {SIMULATOR_OUTCOMES.map(o => (
            <button
              key={o}
              onClick={() => { setOutcome(o); setCall(""); }}
              style={{
                fontSize: 13, padding: "7px 14px", borderRadius: 8,
                background: outcome === o ? "var(--accent)" : "var(--panel2)",
                color: outcome === o ? "#000" : "var(--text)",
                border: `1px solid ${outcome === o ? "var(--accent)" : "var(--border)"}`,
                fontWeight: outcome === o ? 700 : 400,
                cursor: "pointer",
              }}
            >
              {o}
            </button>
          ))}
        </div>

        {/* Call sub-selection (intermediate+) */}
        {needsCall && (
          <>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Select call type</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {callOptions.map(c => (
                <button
                  key={c}
                  onClick={() => setCall(c)}
                  style={{
                    fontSize: 13, padding: "7px 14px", borderRadius: 8,
                    background: call === c ? "var(--accent)" : "var(--panel2)",
                    color: call === c ? "#000" : "var(--text)",
                    border: `1px solid ${call === c ? "var(--accent)" : "var(--border)"}`,
                    fontWeight: call === c ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Submit */}
        <button
          className="primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ width: "100%", marginTop: needsCall ? 0 : 20, padding: "10px 0", fontSize: 15, fontWeight: 700 }}
        >
          Submit Decision
        </button>
      </div>
    </div>
  );
}

// ── Score screen ──────────────────────────────────────────────────────────────

interface RecordedResponse {
  event: SimulatorEvent;
  responseOutcome: string;
  responseCall: string;
  responseTimeSeconds: number;
  isCorrect: boolean;
}

function ScoreScreen({
  session,
  responses,
  onTryAgain,
  onDone,
}: {
  session: SimulatorSessionWithEvents;
  responses: RecordedResponse[];
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
      {/* Score summary */}
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

      {/* Per-event breakdown */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Decision Breakdown</h3>
        </div>
        {responses.map((r, i) => (
          <div
            key={r.event.id}
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
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Event {i + 1} · {fmtTime(r.event.timestampSeconds)}</span>
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
                      {r.responseOutcome || <em style={{ fontStyle: "italic", color: "var(--muted)" }}>No answer (timed out)</em>}
                      {r.responseCall ? ` — ${r.responseCall}` : ""}
                    </div>
                  </div>
                  <div>
                    <span className="hint" style={{ fontSize: 11 }}>Correct answer</span>
                    <div style={{ fontWeight: 600, color: "#22c55e" }}>
                      {r.event.correctOutcome}
                      {r.event.correctCall ? ` — ${r.event.correctCall}` : ""}
                    </div>
                  </div>
                </div>
                {r.event.notes && (
                  <p className="hint" style={{ margin: "6px 0 0", fontSize: 12, fontStyle: "italic" }}>
                    {r.event.notes}
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
  session, sessions, loading,
  onBack, onCreateAttempt, onSaveResponse, onCompleteAttempt,
  initialSessionId, onNavigateToBuilder,
}: Props) {
  const canManage = MANAGEMENT_ROLES.includes(session.activeRole ?? "");
  const [view, setView] = useState<RunnerView>(initialSessionId ? "intro" : "picker");
  const [selectedSession, setSelectedSession] = useState<SimulatorSessionWithEvents | null>(
    initialSessionId ? (sessions.find(s => s.id === initialSessionId) ?? null) : null
  );
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [firedEventIds, setFiredEventIds] = useState<Set<string>>(new Set());
  const [promptEvent, setPromptEvent] = useState<SimulatorEvent | null>(null);
  const [promptStartTime, setPromptStartTime] = useState(0);
  const [responses, setResponses] = useState<RecordedResponse[]>([]);
  const [startingAttempt, setStartingAttempt] = useState(false);

  const playerActionsRef = useRef<PlayerActions | null>(null);
  const nextEventRef = useRef<SimulatorEvent | null>(null);
  const promptActiveRef = useRef(false);

  // Keep nextEventRef in sync
  useEffect(() => {
    if (!selectedSession) { nextEventRef.current = null; return; }
    const sorted = [...selectedSession.events].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    const unfired = sorted.filter(e => !firedEventIds.has(e.id));
    nextEventRef.current = unfired[0] ?? null;
  }, [selectedSession, firedEventIds]);

  // Keep promptActiveRef in sync
  useEffect(() => {
    promptActiveRef.current = promptEvent !== null;
  }, [promptEvent]);

  function pickSession(s: SimulatorSessionWithEvents) {
    setSelectedSession(s);
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
      const id = await onCreateAttempt(selectedSession.id, selectedSession.level);
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
    if (currentTime >= next.timestampSeconds) {
      playerActionsRef.current?.pause();
      setFiredEventIds(prev => { const n = new Set(prev); n.add(next!.id); return n; });
      setPromptEvent(next);
      setPromptStartTime(performance.now());
    }
  }, []);

  async function handlePromptSubmit(result: PromptResult) {
    if (!selectedSession || !attemptId) return;

    const event = selectedSession.events.find(e => e.id === result.eventId);
    if (!event) return;

    // Record locally
    const recorded: RecordedResponse = {
      event,
      responseOutcome: result.responseOutcome,
      responseCall: result.responseCall,
      responseTimeSeconds: result.responseTimeSeconds,
      isCorrect: result.isCorrect,
    };
    const newResponses = [...responses, recorded];
    setResponses(newResponses);

    // Save to DB
    await onSaveResponse({
      attemptId,
      eventId: result.eventId,
      responseOutcome: result.responseOutcome,
      responseCall: result.responseCall,
      responseTimeSeconds: result.responseTimeSeconds,
      isCorrect: result.isCorrect,
    });

    // Close prompt
    setPromptEvent(null);

    // All events answered?
    const totalEvents = selectedSession.events.length;
    if (newResponses.length >= totalEvents) {
      const score = newResponses.filter(r => r.isCorrect).length;
      await onCompleteAttempt(attemptId, score, totalEvents);
      setView("score");
      return;
    }

    // Seek past the event window and resume
    const resumeAt = event.timestampSeconds + event.windowSeconds;
    playerActionsRef.current?.seekTo(resumeAt);
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
            {sessions.map(s => (
              <div key={s.id} className="panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{s.title}</h3>
                  <LevelBadge level={s.level} />
                </div>
                {s.description && (
                  <p className="hint" style={{ margin: 0, fontSize: 13 }}>{s.description}</p>
                )}
                <p className="hint" style={{ margin: 0, fontSize: 12 }}>
                  <Zap size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                  {s.events.length} decision event{s.events.length !== 1 ? "s" : ""}
                </p>
                <button
                  className="primary"
                  onClick={() => pickSession(s)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: "auto" }}
                >
                  <Play size={13} /> Start Simulation
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Intro ───────────────────────────────────────────────────────────────────

  if (view === "intro" && selectedSession) {
    return (
      <div style={{ padding: "20px 20px 60px", boxSizing: "border-box", maxWidth: 560, margin: "0 auto" }}>
        <div className="panel">
          <button
            onClick={() => setView("picker")}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, marginBottom: 20 }}
          >
            <ChevronLeft size={14} /> All Simulations
          </button>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <Zap size={36} style={{ color: "#fbbf24", marginBottom: 10 }} />
            <LevelBadge level={selectedSession.level} />
            <h1 style={{ margin: "10px 0 6px", fontSize: 22 }}>{selectedSession.title}</h1>
            <p className="hint" style={{ margin: "0 0 4px" }}>
              {selectedSession.events.length} decision event{selectedSession.events.length !== 1 ? "s" : ""}
            </p>
          </div>

          {selectedSession.description && (
            <div style={{ padding: "14px 16px", background: "var(--panel2)", borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
              {selectedSession.description}
            </div>
          )}

          <div style={{ padding: "14px 16px", background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.25)", borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>How it works</p>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", lineHeight: 1.7 }}>
              <li>Watch the video — it will pause at key decision moments</li>
              <li>Select your call within the time window</li>
              {isBeginnerLevel(selectedSession.level)
                ? <li>Beginner mode: choose the correct outcome</li>
                : <li>Intermediate mode: choose outcome + call type</li>
              }
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
    const answered = responses.length;
    const total = selectedSession.events.length;

    return (
      <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Zap size={18} style={{ color: "#fbbf24" }} />
            <span style={{ fontWeight: 700 }}>{selectedSession.title}</span>
            <LevelBadge level={selectedSession.level} />
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
            event={promptEvent}
            level={selectedSession.level}
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
        onTryAgain={handleTryAgain}
        onDone={onBack}
      />
    );
  }

  return null;
}
