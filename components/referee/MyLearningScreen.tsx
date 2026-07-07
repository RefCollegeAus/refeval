"use client";

import { useMemo, useState } from "react";
import { BookOpen, Calendar, AlertCircle, ChevronLeft, CheckCircle2, ChevronDown, ChevronUp, ListVideo, HelpCircle, MessageSquare, Zap } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Assignment, AssignmentUser } from "@/lib/types/assignments";
import { STATUS_COLORS, STATUS_BG, STATUS_BORDER, REQUIRED_BADGE_STYLE } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";

interface Props {
  session: RefEvalSession;
  myAssignments: Assignment[];
  playlists: Playlist[];
  members: MemberRecord[];
  onOpenPlaylist: (assignment: Assignment, assignmentUser: AssignmentUser) => void;
  onOpenSimulator?: (assignment: Assignment, assignmentUser: AssignmentUser) => void;
  onBack: () => void;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function isDueSoon(dueDate: string | null) {
  if (!dueDate) return false;
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

// Sort priority: 0 = overdue, 1 = due soon, 2 = future, 3 = no due date
function pendingSortKey(a: Assignment): [number, number] {
  if (!a.dueDate) return [3, 0];
  const t = new Date(a.dueDate).getTime();
  if (t < Date.now()) return [0, t];         // overdue — earliest first
  if (t < Date.now() + 7 * 24 * 60 * 60 * 1000) return [1, t]; // due soon
  return [2, t];                             // future
}

const INSTRUCTIONS_THRESHOLD = 200;

export function MyLearningScreen({ session, myAssignments, playlists, members, onOpenPlaylist, onOpenSimulator, onBack }: Props) {
  const userId = session.user.id;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const pending = useMemo(() => {
    const list = myAssignments.filter(a => {
      const au = a.assignmentUsers.find(u => u.userId === userId);
      return au && au.status !== "Completed";
    });
    return list.sort((a, b) => {
      const [pa, ta] = pendingSortKey(a);
      const [pb, tb] = pendingSortKey(b);
      return pa !== pb ? pa - pb : ta - tb;
    });
  }, [myAssignments, userId]);

  const completed = useMemo(() =>
    myAssignments.filter(a => {
      const au = a.assignmentUsers.find(u => u.userId === userId);
      return au && au.status === "Completed";
    }).sort((a, b) => {
      const au = a.assignmentUsers.find(u => u.userId === userId);
      const bu = b.assignmentUsers.find(u => u.userId === userId);
      const ta = au?.completedAt ? new Date(au.completedAt).getTime() : 0;
      const tb = bu?.completedAt ? new Date(bu.completedAt).getTime() : 0;
      return tb - ta; // most recently completed first
    }),
  [myAssignments, userId]);

  const overdueCount = useMemo(
    () => pending.filter(a => isOverdue(a.dueDate)).length,
    [pending],
  );

  function renderCard(a: Assignment) {
    const au = a.assignmentUsers.find(u => u.userId === userId);
    if (!au) return null;
    const playlist = playlists.find(p => p.id === a.playlistId);
    const assigner = members.find(m => m.id === (a.assignedBy ?? ""));
    const hasPlaylist   = !!a.playlistId;
    const hasSimulator  = !!a.simulatorSessionId;
    const hasReflection = a.questions.length > 0;
    const hasQuiz       = a.quizQuestions.length > 0;

    let typeLabel: string;
    let typeBg: string;
    let typeBorder: string;
    let typeColor: string;
    if (hasSimulator) {
      typeLabel = "Simulator";
      typeBg = "rgba(245,158,11,.13)"; typeBorder = "rgba(245,158,11,.4)"; typeColor = "#fde68a";
    } else if (!hasPlaylist && hasQuiz) {
      typeLabel = "Quiz";
      typeBg = "rgba(99,102,241,.15)"; typeBorder = "rgba(99,102,241,.4)"; typeColor = "#a5b4fc";
    } else if (hasPlaylist && !hasReflection && !hasQuiz) {
      typeLabel = "Playlist";
      typeBg = "rgba(59,130,246,.13)"; typeBorder = "rgba(59,130,246,.35)"; typeColor = "#93c5fd";
    } else if (hasPlaylist && hasReflection && !hasQuiz) {
      typeLabel = "Playlist + Reflection";
      typeBg = "rgba(20,184,166,.13)"; typeBorder = "rgba(20,184,166,.35)"; typeColor = "#5eead4";
    } else if (hasPlaylist && !hasReflection && hasQuiz) {
      typeLabel = "Playlist + Quiz";
      typeBg = "rgba(139,92,246,.13)"; typeBorder = "rgba(139,92,246,.35)"; typeColor = "#c4b5fd";
    } else if (hasPlaylist && hasReflection && hasQuiz) {
      typeLabel = "Playlist + Reflection + Quiz";
      typeBg = "rgba(139,92,246,.13)"; typeBorder = "rgba(139,92,246,.35)"; typeColor = "#c4b5fd";
    } else {
      typeLabel = "Assignment";
      typeBg = "rgba(255,255,255,.07)"; typeBorder = "rgba(255,255,255,.15)"; typeColor = "var(--muted)";
    }

    const summaryParts: React.ReactNode[] = [];
    if (hasPlaylist) {
      const clipCount = playlist?.items.length ?? 0;
      summaryParts.push(
        <span key="pl" style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <ListVideo size={10} style={{ flexShrink: 0 }} />
          {clipCount} clip{clipCount !== 1 ? "s" : ""}
        </span>
      );
    }
    if (hasReflection) {
      const qCount = a.questions.length;
      summaryParts.push(
        <span key="ref" style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <MessageSquare size={10} style={{ flexShrink: 0 }} />
          {qCount} reflection Q{qCount !== 1 ? "s" : ""}
        </span>
      );
    }
    if (hasQuiz) {
      const qCount = a.quizQuestions.length;
      summaryParts.push(
        <span key="quiz" style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <HelpCircle size={10} style={{ flexShrink: 0 }} />
          {qCount} question{qCount !== 1 ? "s" : ""}
        </span>
      );
    }
    const overdue  = isOverdue(a.dueDate) && au.status !== "Completed";
    const dueSoon  = isDueSoon(a.dueDate) && au.status !== "Completed";
    const isCompleted = au.status === "Completed";
    const isExpanded  = expanded.has(a.id);
    const longInstructions = a.instructions && a.instructions.length > INSTRUCTIONS_THRESHOLD;

    return (
      <div
        key={a.id}
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          borderLeft: overdue
            ? "4px solid rgba(239,68,68,.6)"
            : dueSoon
            ? "4px solid rgba(245,158,11,.6)"
            : isCompleted
            ? "4px solid rgba(34,197,94,.4)"
            : "4px solid var(--border)",
        }}
      >
        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.title}
            </div>
            <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                background: typeBg, border: `1px solid ${typeBorder}`, color: typeColor,
                whiteSpace: "nowrap",
              }}>
                {typeLabel}
              </span>
              {summaryParts.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {summaryParts.map((part, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{part}</span>
                  ))}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            {/* Status badge */}
            {!isCompleted && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                background: STATUS_BG[au.status],
                color: STATUS_COLORS[au.status],
                border: `1px solid ${STATUS_BORDER[au.status]}`,
              }}>
                {au.status}
              </span>
            )}
            {a.required && (
              <span style={REQUIRED_BADGE_STYLE}>Required</span>
            )}
          </div>
        </div>

        {/* Completion banner for completed assignments */}
        {isCompleted && au.completedAt && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.25)", borderRadius: 8 }}>
            <CheckCircle2 size={14} style={{ color: "#22c55e", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#86efac", fontWeight: 600 }}>
              Completed {fmt(au.completedAt)}
            </span>
          </div>
        )}

        {/* Instructions */}
        {a.instructions && (
          <div>
            <p style={{
              margin: 0, fontSize: 13, color: "var(--muted)",
              ...(!isExpanded && longInstructions ? {
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical" as const,
              } : {}),
            }}>
              {a.instructions}
            </p>
            {longInstructions && (
              <button
                onClick={() => toggleExpand(a.id)}
                style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 5, padding: 0, background: "none", border: "none", fontSize: 12, color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}
              >
                {isExpanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show more</>}
              </button>
            )}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--muted)" }}>
          {assigner && (
            <span>Assigned by {assigner.name || assigner.email}</span>
          )}
          {a.dueDate && !isCompleted && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: overdue ? "#fca5a5" : dueSoon ? "#fde68a" : "var(--muted)" }}>
              {(overdue || dueSoon) && <AlertCircle size={12} />}
              <Calendar size={11} />
              Due {fmt(a.dueDate)}
              {overdue && " — Overdue"}
              {!overdue && dueSoon && " — Due soon"}
            </span>
          )}
        </div>

        {/* Action button */}
        {hasSimulator ? (
          <button
            className={isCompleted ? undefined : "primary"}
            style={{ alignSelf: "flex-start", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}
            onClick={() => onOpenSimulator ? onOpenSimulator(a, au) : undefined}
          >
            <Zap size={13} />
            {isCompleted ? "Replay Simulator" : au.status === "Assigned" ? "Start Simulator" : "Open Simulator"}
          </button>
        ) : (
          <>
            {!isCompleted && (
              <button
                className="primary"
                style={{ alignSelf: "flex-start", fontSize: 13 }}
                onClick={() => onOpenPlaylist(a, au)}
              >
                {au.status === "Assigned" ? "Start Learning" : "Continue Learning"}
              </button>
            )}
            {isCompleted && (
              <button
                style={{ alignSelf: "flex-start", fontSize: 13 }}
                onClick={() => onOpenPlaylist(a, au)}
              >
                {a.playlistId ? "View Playlist" : "View Quiz"}
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box", maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BookOpen size={22} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Referee Portal</p>
            <h1 style={{ margin: 0, fontSize: 22 }}>My Learning</h1>
            <p className="hint" style={{ margin: "2px 0 0" }}>Assignments from your educators</p>
          </div>
        </div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={15} /> Back
        </button>
      </div>

      {/* Empty state */}
      {myAssignments.length === 0 && (
        <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
          <BookOpen size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>No learning assignments yet</p>
          <p className="hint" style={{ margin: "6px 0 0" }}>Your educators will assign learning activities here.</p>
        </div>
      )}

      {/* Learning summary */}
      {myAssignments.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <div className="panel" style={{ flex: "1 1 120px", padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>{pending.length}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Pending</div>
          </div>
          <div className="panel" style={{ flex: "1 1 120px", padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#86efac" }}>{completed.length}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Completed</div>
          </div>
          <div className="panel" style={{ flex: "1 1 120px", padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: overdueCount > 0 ? "#fca5a5" : "var(--text)" }}>{overdueCount}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Overdue</div>
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 className="ed-section-title">To Do · {pending.length}</h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {pending.map(a => renderCard(a))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="ed-section-title">Completed · {completed.length}</h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {completed.map(a => renderCard(a))}
          </div>
        </div>
      )}
    </div>
  );
}
