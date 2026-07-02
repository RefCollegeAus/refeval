"use client";

import { useState } from "react";
import { BookOpen, Trash2, Eye, Search } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Assignment } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";

interface Props {
  session: RefEvalSession;
  assignments: Assignment[];
  playlists: Playlist[];
  members: MemberRecord[];
  loading: boolean;
  error: string;
  canDelete: boolean;
  onView: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function playlistTitle(playlistId: string, playlists: Playlist[]) {
  return playlists.find(p => p.id === playlistId)?.title ?? "Unknown playlist";
}

function memberName(userId: string | null, members: MemberRecord[]) {
  if (!userId) return "—";
  const m = members.find(m => m.id === userId);
  return m?.name || m?.email || "Unknown";
}

function statusSummary(assignment: Assignment) {
  const total = assignment.assignmentUsers.length;
  const completed = assignment.assignmentUsers.filter(u => u.status === "Completed").length;
  const started   = assignment.assignmentUsers.filter(u => u.status === "Started").length;
  if (total === 0) return { label: "No users", color: "var(--muted)" };
  if (completed === total) return { label: `${completed}/${total} Completed`, color: "#bbf7d0" };
  if (started + completed > 0) return { label: `${started + completed}/${total} In Progress`, color: "#fde68a" };
  return { label: `0/${total} Started`, color: "var(--muted)" };
}

export function AssignmentsScreen({
  session, assignments, playlists, members, loading, error,
  canDelete, onView, onDelete, onBack,
}: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function handleDelete(a: Assignment) {
    if (!confirm(`Delete assignment "${a.title}"?\n\nThis will remove all user progress. This cannot be undone.`)) return;
    setDeleting(a.id);
    try { await onDelete(a.id); } finally { setDeleting(null); }
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? assignments.filter(a =>
        a.title.toLowerCase().includes(q) ||
        playlistTitle(a.playlistId, playlists).toLowerCase().includes(q) ||
        memberName(a.assignedBy, members).toLowerCase().includes(q)
      )
    : assignments;

  return (
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>
      <div className="panel">

        {/* Header */}
        <div className="table-head" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BookOpen size={20} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Organisation</p>
              <h1 style={{ margin: 0, fontSize: 22 }}>Learning Assignments</h1>
              <p className="hint" style={{ margin: "2px 0 0" }}>
                Playlists assigned to team members as learning tasks
              </p>
            </div>
          </div>
          <button onClick={onBack}>← Back</button>
        </div>

        {error && <p className="danger-text">{error}</p>}
        {loading && <p className="hint">Loading…</p>}

        {/* Search */}
        {!loading && assignments.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search assignments…"
                style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
              />
            </div>
            <span style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>
              {q
                ? `Showing ${filtered.length} of ${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`
                : `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}

        {/* Empty states */}
        {!loading && assignments.length === 0 && (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted)" }}>
            <BookOpen size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No assignments yet</p>
            <p className="hint" style={{ margin: "6px 0 0" }}>
              Open a playlist and click "Assign Playlist" to create your first learning assignment.
            </p>
          </div>
        )}

        {!loading && assignments.length > 0 && filtered.length === 0 && (
          <p className="hint" style={{ padding: "16px 0" }}>No assignments match your search.</p>
        )}

        {filtered.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Assignment</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Playlist</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Assigned Users</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Due Date</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Progress</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Created By</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Created</th>
                  <th style={{ padding: "6px 10px" }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const summary = statusSummary(a);
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 10px", fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {a.title}
                          {a.required && (
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(239,68,68,.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,.3)", fontWeight: 700 }}>
                              Required
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)" }}>
                        {playlistTitle(a.playlistId, playlists)}
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "center" }}>
                        <span className="chip" style={{ fontSize: 11 }}>{a.assignmentUsers.length}</span>
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {fmt(a.dueDate)}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap", color: summary.color, fontWeight: 600, fontSize: 12 }}>
                        {summary.label}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)" }}>
                        {memberName(a.assignedBy, members)}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {fmt(a.createdAt)}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "3px 10px" }}
                            onClick={() => onView(a.id)}
                          >
                            <Eye size={12} /> View
                          </button>
                          {canDelete && (
                            <button
                              className="danger"
                              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "3px 10px" }}
                              onClick={() => handleDelete(a)}
                              disabled={deleting === a.id}
                            >
                              <Trash2 size={12} /> {deleting === a.id ? "…" : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
