"use client";

import { useState, useMemo } from "react";
import { BookOpen, Trash2, Eye, Search, ArrowUpDown, ChevronLeft, X } from "lucide-react";
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

type StatusFilter = "all" | "active" | "overdue" | "completed";
type SortKey = "title" | "playlist" | "users" | "pct" | "due" | "created";

type EnrichedAssignment = Assignment & {
  _playlistTitle: string;
  _userCount: number;
  _completed: number;
  _pct: number;
  _statusFilter: StatusFilter;
};

export function AssignmentsScreen({
  session, assignments, playlists, members, loading, error,
  canDelete, onView, onDelete, onBack,
}: Props) {
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [query, setQuery]             = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort]               = useState<SortKey>("created");
  const [sortAsc, setSortAsc]         = useState(false);

  const now = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleDelete(a: Assignment) {
    if (!confirm(`Delete assignment "${a.title}"?\n\nThis will remove all user progress. This cannot be undone.`)) return;
    setDeleting(a.id);
    try { await onDelete(a.id); } finally { setDeleting(null); }
  }

  const enriched = useMemo<EnrichedAssignment[]>(() =>
    assignments.map(a => {
      const total     = a.assignmentUsers.length;
      const completed = a.assignmentUsers.filter(u => u.status === "Completed").length;
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
      const allDone   = total > 0 && completed === total;
      const isOverdue = !allDone && !!a.dueDate && a.dueDate < now;
      const sf: StatusFilter = allDone ? "completed" : isOverdue ? "overdue" : "active";
      return {
        ...a,
        _playlistTitle: playlistTitle(a.playlistId, playlists),
        _userCount: total,
        _completed: completed,
        _pct: pct,
        _statusFilter: sf,
      };
    }),
  [assignments, playlists, now]);

  const statusCounts = useMemo(() => ({
    all:       enriched.length,
    active:    enriched.filter(a => a._statusFilter === "active").length,
    overdue:   enriched.filter(a => a._statusFilter === "overdue").length,
    completed: enriched.filter(a => a._statusFilter === "completed").length,
  }), [enriched]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = enriched.filter(a => {
      if (statusFilter !== "all" && a._statusFilter !== statusFilter) return false;
      if (q && !a.title.toLowerCase().includes(q) && !a._playlistTitle.toLowerCase().includes(q) && !memberName(a.assignedBy, members).toLowerCase().includes(q)) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      let cmp = 0;
      if      (sort === "title")    cmp = a.title.localeCompare(b.title);
      else if (sort === "playlist") cmp = a._playlistTitle.localeCompare(b._playlistTitle);
      else if (sort === "users")    cmp = a._userCount - b._userCount;
      else if (sort === "pct")      cmp = a._pct - b._pct;
      else if (sort === "due")      cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
      else if (sort === "created")  cmp = a.createdAt.localeCompare(b.createdAt);
      return sortAsc ? cmp : -cmp;
    });
    return out;
  }, [enriched, query, statusFilter, members, sort, sortAsc]);

  function handleSort(key: SortKey) {
    if (sort === key) { setSortAsc(v => !v); return; }
    setSort(key);
    setSortAsc(key === "title" || key === "playlist");
  }

  function SortTh({ col, label, right }: { col: SortKey; label: string; right?: boolean }) {
    const active = sort === col;
    return (
      <th
        style={{ textAlign: right ? "right" : "left", padding: "8px 10px", fontWeight: 600, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
        onClick={() => handleSort(col)}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <ArrowUpDown size={11} style={{ opacity: active ? 1 : 0.3, color: active ? "var(--accent)" : undefined }} />
        </span>
      </th>
    );
  }

  const STATUSES: { key: StatusFilter; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "active",    label: "Active" },
    { key: "overdue",   label: "Overdue" },
    { key: "completed", label: "Completed" },
  ];

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
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={15} /> Back
          </button>
        </div>

        {error && <p className="danger-text">{error}</p>}
        {loading && <p className="hint">Loading…</p>}

        {/* Filter bar */}
        {!loading && assignments.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            {/* Search */}
            <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 340 }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search assignments…"
                style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
              />
            </div>
            {query && (
              <button onClick={() => setQuery("")} style={{ border: "none", background: "none", padding: "4px 6px", cursor: "pointer" }}>
                <X size={13} />
              </button>
            )}
            {/* Status filter tabs */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {STATUSES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={statusFilter === key ? "selected" : ""}
                  style={{
                    fontSize: 12, padding: "5px 10px", borderRadius: 8,
                    color: key === "overdue" && statusFilter === key ? "#ef4444" : undefined,
                  }}
                >
                  {label}
                  {statusCounts[key] > 0 && statusFilter !== key && (
                    <span style={{ marginLeft: 5, fontSize: 11, color: "var(--muted)" }}>{statusCounts[key]}</span>
                  )}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", marginLeft: "auto" }}>
              {filtered.length} of {assignments.length}
            </span>
          </div>
        )}

        {/* Empty states */}
        {!loading && assignments.length === 0 && (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted)" }}>
            <BookOpen size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No assignments yet</p>
            <p className="hint" style={{ margin: "6px 0 0" }}>
              Open a playlist and click &ldquo;Assign Playlist&rdquo; to create your first learning assignment.
            </p>
          </div>
        )}

        {!loading && assignments.length > 0 && filtered.length === 0 && (
          <p className="hint" style={{ padding: "16px 0" }}>No assignments match your filters.</p>
        )}

        {filtered.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <SortTh col="title"    label="Assignment" />
                  <SortTh col="playlist" label="Playlist" />
                  <SortTh col="users"    label="Users" right />
                  <SortTh col="pct"      label="Progress" />
                  <SortTh col="due"      label="Due" />
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>Created by</th>
                  <SortTh col="created"  label="Created" />
                  <th style={{ padding: "8px 10px" }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const isOverdue = a._statusFilter === "overdue";
                  const isDone    = a._statusFilter === "completed";
                  const pctColor  = isDone ? "#22c55e" : a._pct >= 50 ? "#3b82f6" : "var(--accent)";
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 600 }}>{a.title}</span>
                          {a.required && (
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(239,68,68,.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,.3)", fontWeight: 700, whiteSpace: "nowrap" }}>
                              Required
                            </span>
                          )}
                          {isOverdue && (
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(239,68,68,.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,.3)", fontWeight: 700, whiteSpace: "nowrap" }}>
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a._playlistTitle}
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "center" }}>
                        {a._userCount > 0
                          ? <span className="chip" style={{ fontSize: 11 }}>{a._userCount}</span>
                          : <span className="hint">—</span>}
                      </td>
                      <td style={{ padding: "10px 10px", minWidth: 130 }}>
                        {a._userCount > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="lh-progress-bar" style={{ flex: 1 }}>
                              <div className="lh-progress-fill" style={{ width: `${a._pct}%`, background: pctColor }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, color: pctColor }}>{a._pct}%</span>
                          </div>
                        ) : <span className="hint">—</span>}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap", color: isOverdue ? "#ef4444" : "var(--muted)" }}>
                        {fmt(a.dueDate)}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {memberName(a.assignedBy, members)}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {fmt(a.createdAt)}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px" }}
                            onClick={() => onView(a.id)}
                          >
                            <Eye size={12} /> View
                          </button>
                          {canDelete && (
                            <button
                              className="danger"
                              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px" }}
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
