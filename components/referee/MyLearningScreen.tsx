"use client";

import { BookOpen, Calendar, AlertCircle } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Assignment, AssignmentUser } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";

interface Props {
  session: RefEvalSession;
  myAssignments: Assignment[];
  playlists: Playlist[];
  members: MemberRecord[];
  onOpenPlaylist: (assignment: Assignment, assignmentUser: AssignmentUser) => void;
  onBack: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  Assigned:  "var(--muted)",
  Started:   "#fde68a",
  Completed: "#bbf7d0",
};

function fmt(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function isDueSoon(dueDate: string | null) {
  if (!dueDate) return false;
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // within 7 days
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function MyLearningScreen({ session, myAssignments, playlists, members, onOpenPlaylist, onBack }: Props) {
  const userId = session.user.id;

  const pending   = myAssignments.filter(a => {
    const au = a.assignmentUsers.find(u => u.userId === userId);
    return au && au.status !== "Completed";
  });
  const completed = myAssignments.filter(a => {
    const au = a.assignmentUsers.find(u => u.userId === userId);
    return au && au.status === "Completed";
  });

  function renderCard(a: Assignment) {
    const au = a.assignmentUsers.find(u => u.userId === userId);
    if (!au) return null;
    const playlist = playlists.find(p => p.id === a.playlistId);
    const assigner = members.find(m => m.id === (a.assignedBy ?? ""));
    const overdue = isOverdue(a.dueDate) && au.status !== "Completed";
    const dueSoon = isDueSoon(a.dueDate) && au.status !== "Completed";

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
            : "4px solid var(--border)",
        }}
      >
        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.title}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              📋 {playlist?.title ?? "Playlist"} · {playlist?.items.length ?? 0} clip{playlist?.items.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[au.status] ?? "var(--muted)" }}>
              {au.status}
            </span>
            {a.required && (
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(239,68,68,.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,.3)", fontWeight: 700 }}>
                Required
              </span>
            )}
          </div>
        </div>

        {/* Instructions */}
        {a.instructions && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
            {a.instructions}
          </p>
        )}

        {/* Meta */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--muted)" }}>
          {assigner && (
            <span>Assigned by {assigner.name || assigner.email}</span>
          )}
          {a.dueDate && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: overdue ? "#fca5a5" : dueSoon ? "#fde68a" : "var(--muted)" }}>
              {(overdue || dueSoon) && <AlertCircle size={12} />}
              <Calendar size={11} />
              Due {fmt(a.dueDate)}
              {overdue && " — Overdue"}
              {!overdue && dueSoon && " — Due soon"}
            </span>
          )}
          {au.completedAt && (
            <span>Completed {fmt(au.completedAt)}</span>
          )}
        </div>

        {/* Action button */}
        {au.status !== "Completed" && (
          <button
            className="primary"
            style={{ alignSelf: "flex-start", fontSize: 13 }}
            onClick={() => onOpenPlaylist(a, au)}
          >
            {au.status === "Assigned" ? "Start Learning" : "Continue Learning"}
          </button>
        )}
        {au.status === "Completed" && (
          <button
            style={{ alignSelf: "flex-start", fontSize: 13 }}
            onClick={() => onOpenPlaylist(a, au)}
          >
            View Playlist
          </button>
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
            <p className="hint" style={{ margin: "2px 0 0" }}>Playlists assigned to you by your educators</p>
          </div>
        </div>
        <button onClick={onBack}>← Back</button>
      </div>

      {myAssignments.length === 0 && (
        <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
          <BookOpen size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>No learning assignments yet</p>
          <p className="hint" style={{ margin: "6px 0 0" }}>Your educators will assign playlists here.</p>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", margin: "0 0 12px" }}>
            To Do · {pending.length}
          </h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
            {pending.map(renderCard)}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", margin: "0 0 12px" }}>
            Completed · {completed.length}
          </h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
            {completed.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  );
}
