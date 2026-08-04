"use client";

import { useMemo, useState } from "react";
import { BookOpen, Calendar, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ListVideo, HelpCircle, MessageSquare, Zap } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Assignment, AssignmentUser } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import type { SimulatorAttempt } from "@/lib/types/simulator";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, type BadgeTone, Button, Card, EmptyState } from "@/components/ui";

interface Props {
  session: RefEvalSession;
  myAssignments: Assignment[];
  playlists: Playlist[];
  members: MemberRecord[];
  simulatorAttempts?: SimulatorAttempt[];
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

// Assignment "type" (Playlist/Quiz/Simulator/...) is informational, not a status — a
// single restrained tone keeps the card from competing with the real status badge.
function typeLabelFor(a: Assignment): string {
  const hasPlaylist   = !!a.playlistId;
  const hasSimulator  = !!a.simulatorSessionId;
  const hasReflection = a.questions.length > 0;
  const hasQuiz       = a.quizQuestions.length > 0;
  if (hasSimulator) return "Simulator";
  if (!hasPlaylist && hasQuiz) return "Quiz";
  if (hasPlaylist && !hasReflection && !hasQuiz) return "Playlist";
  if (hasPlaylist && hasReflection && !hasQuiz) return "Playlist + Reflection";
  if (hasPlaylist && !hasReflection && hasQuiz) return "Playlist + Quiz";
  if (hasPlaylist && hasReflection && hasQuiz) return "Playlist + Reflection + Quiz";
  return "Assignment";
}

const STATUS_TONE: Record<AssignmentUser["status"], BadgeTone> = {
  Assigned: "neutral",
  Started: "warn",
  Completed: "good",
};

export function MyLearningScreen({ session, myAssignments, playlists, members, simulatorAttempts = [], onOpenPlaylist, onOpenSimulator, onBack }: Props) {
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
    const hasReflection = a.questions.length > 0;
    const hasQuiz       = a.quizQuestions.length > 0;
    const hasSimulator  = !!a.simulatorSessionId;
    const typeLabel = typeLabelFor(a);

    const summaryParts: React.ReactNode[] = [];
    if (hasPlaylist) {
      const clipCount = playlist?.items.length ?? 0;
      summaryParts.push(
        <span key="pl" className="flex items-center gap-1">
          <ListVideo size={10} className="shrink-0" />
          {clipCount} clip{clipCount !== 1 ? "s" : ""}
        </span>
      );
    }
    if (hasReflection) {
      const qCount = a.questions.length;
      summaryParts.push(
        <span key="ref" className="flex items-center gap-1">
          <MessageSquare size={10} className="shrink-0" />
          {qCount} reflection Q{qCount !== 1 ? "s" : ""}
        </span>
      );
    }
    if (hasQuiz) {
      const qCount = a.quizQuestions.length;
      summaryParts.push(
        <span key="quiz" className="flex items-center gap-1">
          <HelpCircle size={10} className="shrink-0" />
          {qCount} question{qCount !== 1 ? "s" : ""}
        </span>
      );
    }
    // Simulator attempt stats for this user
    const mySimAttempts = hasSimulator && a.simulatorSessionId
      ? simulatorAttempts.filter(at => at.sessionId === a.simulatorSessionId && at.userId === userId)
      : [];
    const scoredSimAttempts = mySimAttempts.filter(at => at.score !== null && at.total && at.total > 0);
    const latestSimAttempt = mySimAttempts[0]; // sorted desc by completed_at
    const latestPct = latestSimAttempt?.score != null && latestSimAttempt.total
      ? Math.round((latestSimAttempt.score / latestSimAttempt.total) * 100) : null;
    const bestPct = scoredSimAttempts.length > 0
      ? Math.round(Math.max(...scoredSimAttempts.map(at => (at.score! / at.total!) * 100))) : null;

    const overdue  = isOverdue(a.dueDate) && au.status !== "Completed";
    const dueSoon  = isDueSoon(a.dueDate) && au.status !== "Completed";
    const isCompleted = au.status === "Completed";
    const isExpanded  = expanded.has(a.id);
    const longInstructions = a.instructions && a.instructions.length > INSTRUCTIONS_THRESHOLD;

    const accentClass = overdue
      ? "border-l-4 border-l-danger"
      : dueSoon
      ? "border-l-4 border-l-warn"
      : isCompleted
      ? "border-l-4 border-l-good/60"
      : "border-l-4 border-l-border";

    return (
      <Card key={a.id} className={`flex flex-col gap-3 ${accentClass}`}>
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-text">{a.title}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{typeLabel}</Badge>
              {summaryParts.length > 0 && (
                <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  {summaryParts}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {!isCompleted && <Badge tone={STATUS_TONE[au.status]}>{au.status}</Badge>}
            {a.required && <Badge tone="danger">Required</Badge>}
          </div>
        </div>

        {/* Completion banner for completed assignments */}
        {isCompleted && au.completedAt && (
          <div className="flex items-center gap-2 rounded-lg border border-good/25 bg-good/[.08] px-2.5 py-1.5">
            <CheckCircle2 size={14} className="shrink-0 text-good" />
            <span className="text-[13px] font-semibold text-good">Completed {fmt(au.completedAt)}</span>
          </div>
        )}

        {/* Instructions */}
        {a.instructions && (
          <div>
            <p className={`m-0 text-[13px] text-muted ${!isExpanded && longInstructions ? "line-clamp-3" : ""}`}>
              {a.instructions}
            </p>
            {longInstructions && (
              <button
                onClick={() => toggleExpand(a.id)}
                className="mt-1 flex items-center gap-1 border-none bg-none p-0 text-xs font-semibold text-accent"
              >
                {isExpanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show more</>}
              </button>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          {assigner && <span>Assigned by {assigner.name || assigner.email}</span>}
          {a.dueDate && !isCompleted && (
            <span className={`flex items-center gap-1 ${overdue ? "text-red-300" : dueSoon ? "text-yellow-300" : "text-muted"}`}>
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
          <>
            <Button
              variant={isCompleted ? "secondary" : "primary"}
              size="sm"
              className="w-fit gap-1.5"
              onClick={() => onOpenSimulator ? onOpenSimulator(a, au) : undefined}
            >
              <Zap size={13} />
              {isCompleted ? "Replay Simulator" : au.status === "Assigned" ? "Start Simulator" : "Continue Simulator"}
            </Button>
            {mySimAttempts.length > 0 && (
              <div className="flex flex-wrap gap-2.5 border-t border-border pt-2 text-xs text-muted">
                <span><strong className="text-text">{mySimAttempts.length}</strong> attempt{mySimAttempts.length !== 1 ? "s" : ""}</span>
                {latestPct !== null && <span>Latest <strong className="text-accent">{latestPct}%</strong></span>}
                {bestPct !== null && latestPct !== bestPct && <span>Best <strong className="text-good">{bestPct}%</strong></span>}
                {latestSimAttempt?.completedAt && <span>Last played {fmt(latestSimAttempt.completedAt)}</span>}
              </div>
            )}
          </>
        ) : (
          <>
            {!isCompleted && (
              <Button variant="primary" size="sm" className="w-fit" onClick={() => onOpenPlaylist(a, au)}>
                {au.status === "Assigned" ? "Start Learning" : "Continue Learning"}
              </Button>
            )}
            {isCompleted && (
              <Button variant="secondary" size="sm" className="w-fit" onClick={() => onOpenPlaylist(a, au)}>
                {a.playlistId ? "View Playlist" : "View Quiz"}
              </Button>
            )}
          </>
        )}
      </Card>
    );
  }

  return (
    <PageFrame
      eyebrow="Referee Portal"
      title="My Learning"
      description="Assignments from your educators"
      actions={<Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>}
      className="mx-auto max-w-[900px]"
    >
      {/* Empty state */}
      {myAssignments.length === 0 && (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="No learning assignments yet"
          description="Your educators will assign learning activities here."
        />
      )}

      {/* Learning summary */}
      {myAssignments.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Card className="min-w-[120px] flex-1 text-center">
            <div className="text-2xl font-extrabold text-text">{pending.length}</div>
            <div className="mt-0.5 text-xs text-muted">Pending</div>
          </Card>
          <Card className="min-w-[120px] flex-1 text-center">
            <div className="text-2xl font-extrabold text-good">{completed.length}</div>
            <div className="mt-0.5 text-xs text-muted">Completed</div>
          </Card>
          <Card className="min-w-[120px] flex-1 text-center">
            <div className={`text-2xl font-extrabold ${overdueCount > 0 ? "text-red-300" : "text-text"}`}>{overdueCount}</div>
            <div className="mt-0.5 text-xs text-muted">Overdue</div>
          </Card>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">To Do · {pending.length}</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {pending.map(a => renderCard(a))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Completed · {completed.length}</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {completed.map(a => renderCard(a))}
          </div>
        </section>
      )}
    </PageFrame>
  );
}
