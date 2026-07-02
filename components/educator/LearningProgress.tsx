"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Search, CheckCircle2, Clock,
  AlertCircle, BookOpen, ArrowUpDown, X,
} from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { Assignment, AssignmentUser } from "@/lib/types/assignments";
import type { MemberRecord } from "@/lib/types/members";
import type { Group } from "@/lib/types/groups";
import { fmtDate, fmtRel } from "@/lib/utils/time";

interface Props {
  session: RefEvalSession;
  assignments: Assignment[];
  members: MemberRecord[];
  groups: Group[];
  setScreen: (screen: Screen) => void;
}

type SortKey = "name" | "assigned" | "completed" | "pct" | "overdue";

function statusColor(status: AssignmentUser["status"]) {
  if (status === "Completed") return "#22c55e";
  if (status === "Started")   return "#3b82f6";
  return "#f59e0b";
}


export function LearningProgress({ session, assignments, members, groups, setScreen }: Props) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const now = new Date().toISOString().slice(0, 10);

  // Referees with at least one assignment row, plus any referee with zero rows
  const refereeMembers = useMemo(
    () => members.filter(m => m.role === "referee"),
    [members]
  );

  // Build per-referee stats
  type RefereeStat = {
    id: string;
    name: string;
    email: string;
    assigned: number;
    started: number;
    completed: number;
    overdue: number;
    pct: number;
    lastActivity: string | null;
  };

  const stats = useMemo<RefereeStat[]>(() => {
    return refereeMembers.map(m => {
      const myRows = assignments.flatMap(a =>
        a.assignmentUsers
          .filter(u => u.userId === m.id)
          .map(u => ({ ...u, assignment: a }))
      );
      const assigned  = myRows.length;
      const started   = myRows.filter(r => r.status === "Started").length;
      const completed = myRows.filter(r => r.status === "Completed").length;
      const overdue   = myRows.filter(r => r.status !== "Completed" && r.assignment.dueDate && r.assignment.dueDate < now).length;
      const pct       = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

      const times = myRows
        .flatMap(r => [r.completedAt, r.startedAt, r.assignedAt].filter(Boolean) as string[])
        .sort();
      const lastActivity = times[times.length - 1] ?? null;

      return { id: m.id, name: m.name, email: m.email, assigned, started, completed, overdue, pct, lastActivity };
    });
  }, [refereeMembers, assignments, now]);

  const filtered = useMemo(() => {
    // Build the group member ID set inside this memo so it's always in sync with groups + groupFilter.
    const groupMemberIds: Set<string> = (() => {
      if (groupFilter === "all") return new Set<string>();
      const g = groups.find(x => x.id === groupFilter);
      if (!g) return new Set<string>();
      return new Set<string>(g.members.map(m => m.userId));
    })();

    let out = stats.filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (groupFilter !== "all" && !groupMemberIds.has(s.id)) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      let cmp = 0;
      if (sort === "name")      cmp = a.name.localeCompare(b.name);
      else if (sort === "assigned")   cmp = a.assigned - b.assigned;
      else if (sort === "completed")  cmp = a.completed - b.completed;
      else if (sort === "pct")        cmp = a.pct - b.pct;
      else if (sort === "overdue")    cmp = a.overdue - b.overdue;
      return sortAsc ? cmp : -cmp;
    });
    return out;
  }, [stats, search, sort, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sort === key) setSortAsc(a => !a);
    else { setSort(key); setSortAsc(true); }
  }

  function SortTh({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
        onClick={() => toggleSort(col)}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <ArrowUpDown size={11} style={{ opacity: sort === col ? 1 : 0.35 }} />
        </span>
      </th>
    );
  }

  // --- Referee profile panel ---
  const selectedStat = selectedMemberId ? stats.find(s => s.id === selectedMemberId) ?? null : null;

  const selectedRows = useMemo(() => {
    if (!selectedMemberId) return [];
    return assignments.flatMap(a =>
      a.assignmentUsers
        .filter(u => u.userId === selectedMemberId)
        .map(u => ({ ...u, assignment: a }))
    ).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  }, [selectedMemberId, assignments]);

  const weekAgo  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const completedThisWeek  = selectedRows.filter(r => r.completedAt && r.completedAt >= weekAgo).length;
  const completedThisMonth = selectedRows.filter(r => r.completedAt && r.completedAt >= monthAgo).length;

  return (
    <div className="lh-layout">

      {/* ── Main column ── */}
      <div className="lh-main">

        {/* Page header */}
        <div className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Learning Hub</p>
            <h1 style={{ margin: 0, fontSize: 22 }}>Learning Progress</h1>
          </div>
          <button
            style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
            onClick={() => setScreen("learning-hub")}
          >
            <ChevronLeft size={15} /> Back
          </button>
        </div>

        {/* Search + group filter */}
        <div className="panel" style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Search size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input
            style={{ border: "none", background: "transparent", outline: "none", flex: "1 1 160px", fontSize: 14, padding: 0, color: "var(--text)", minWidth: 120 }}
            placeholder="Search referees…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ border: "none", background: "none", padding: 4, cursor: "pointer" }}>
              <X size={13} />
            </button>
          )}
          {groups.length > 0 && (
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              style={{ fontSize: 12, padding: "5px 8px", width: "auto", flexShrink: 0 }}
            >
              <option value="all">All Groups</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Progress table */}
        {refereeMembers.length === 0 ? (
          <div className="empty-state panel">
            <BookOpen size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No referees in this organisation.</p>
            <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>Add referee members to start tracking learning progress.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state panel">No referees match your search.</div>
        ) : (
          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ref-reviews-table">
              <table>
                <thead>
                  <tr>
                    <SortTh col="name"      label="Referee" />
                    <SortTh col="assigned"  label="Assigned" />
                    <th>Started</th>
                    <SortTh col="completed" label="Completed" />
                    <SortTh col="pct"       label="%" />
                    <SortTh col="overdue"   label="Overdue" />
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr
                      key={s.id}
                      className={"ed-review-row" + (selectedMemberId === s.id ? " lh-row--selected" : "")}
                      onClick={() => setSelectedMemberId(prev => prev === s.id ? null : s.id)}
                    >
                      <td data-label="Referee">
                        <div style={{ fontWeight: 700 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.email}</div>
                      </td>
                      <td data-label="Assigned">{s.assigned || "—"}</td>
                      <td data-label="Started">{s.started || "—"}</td>
                      <td data-label="Completed">
                        {s.completed > 0 ? (
                          <span style={{ color: "#22c55e", fontWeight: 700 }}>{s.completed}</span>
                        ) : "—"}
                      </td>
                      <td data-label="%">
                        {s.assigned > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="lh-progress-bar">
                              <div className="lh-progress-fill" style={{ width: `${s.pct}%`, background: s.pct === 100 ? "#22c55e" : s.pct > 50 ? "#3b82f6" : "var(--accent)" }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 30 }}>{s.pct}%</span>
                          </div>
                        ) : <span className="hint">—</span>}
                      </td>
                      <td data-label="Overdue">
                        {s.overdue > 0 ? (
                          <span style={{ color: "#ef4444", fontWeight: 700 }}>{s.overdue}</span>
                        ) : <span style={{ color: "#22c55e", fontSize: 12 }}>✓</span>}
                      </td>
                      <td>
                        <ChevronRight
                          size={14}
                          style={{ opacity: 0.4, transition: "opacity .1s" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── Sidebar / Referee Profile ── */}
      <aside className="lh-sidebar">
        {selectedStat ? (
          <>
            {/* Profile header */}
            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 14 }}>
                <div>
                  <p className="eyebrow" style={{ margin: "0 0 2px" }}>Referee Profile</p>
                  <h2 style={{ margin: 0, fontSize: 18 }}>{selectedStat.name}</h2>
                  <p className="hint" style={{ margin: "2px 0 0", fontSize: 12 }}>{selectedStat.email}</p>
                </div>
                <button
                  style={{ padding: "4px 8px", flexShrink: 0 }}
                  onClick={() => setSelectedMemberId(null)}
                  title="Close profile"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Summary stats */}
              <div className="lh-profile-stats">
                <div className="lh-profile-stat">
                  <div className="lh-profile-stat-num">{selectedStat.assigned}</div>
                  <div className="lh-profile-stat-lbl">Assigned</div>
                </div>
                <div className="lh-profile-stat lh-profile-stat--good">
                  <div className="lh-profile-stat-num">{selectedStat.completed}</div>
                  <div className="lh-profile-stat-lbl">Completed</div>
                </div>
                <div className="lh-profile-stat" style={selectedStat.overdue > 0 ? { borderColor: "rgba(239,68,68,.35)" } : {}}>
                  <div className="lh-profile-stat-num" style={selectedStat.overdue > 0 ? { color: "#ef4444" } : { color: "var(--muted)" }}>
                    {selectedStat.overdue}
                  </div>
                  <div className="lh-profile-stat-lbl">Overdue</div>
                </div>
              </div>

              {/* Activity cadence */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <div className="lh-cadence-chip">
                  <Clock size={11} />
                  <span>{completedThisWeek} this week</span>
                </div>
                <div className="lh-cadence-chip">
                  <CheckCircle2 size={11} />
                  <span>{completedThisMonth} this month</span>
                </div>
              </div>
            </div>

            {/* Assignment history */}
            <div className="panel">
              <h3 className="ed-section-title" style={{ marginBottom: 10 }}>Assignment History</h3>
              {selectedRows.length === 0 ? (
                <div className="empty-state" style={{ padding: "16px 10px" }}>
                  <p className="hint" style={{ margin: 0, fontSize: 13 }}>No assignments yet.</p>
                  <p className="hint" style={{ margin: "3px 0 0", fontSize: 12 }}>Assign a playlist to begin tracking their learning.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selectedRows.map(row => {
                    const isOverdue = row.status !== "Completed" && row.assignment.dueDate && row.assignment.dueDate < now;
                    return (
                      <div key={row.id} className={"lh-assignment-row" + (isOverdue ? " lh-assignment-row--overdue" : "")}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{row.assignment.title}</span>
                          <span
                            className="status-badge"
                            style={{
                              background: row.status === "Completed" ? "rgba(34,197,94,.16)" : row.status === "Started" ? "rgba(59,130,246,.16)" : "rgba(245,158,11,.16)",
                              color: statusColor(row.status),
                              border: `1px solid ${statusColor(row.status)}44`,
                              flexShrink: 0,
                            }}
                          >
                            {row.status}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 4 }}>
                          <span className="hint" style={{ fontSize: 11 }}>Assigned {fmtDate(row.assignedAt)}</span>
                          {row.assignment.dueDate && (
                            <span className="hint" style={{ fontSize: 11, color: isOverdue ? "#ef4444" : undefined }}>
                              Due {fmtDate(row.assignment.dueDate)}{isOverdue ? " · OVERDUE" : ""}
                            </span>
                          )}
                          {row.completedAt && (
                            <span style={{ fontSize: 11, color: "#22c55e" }}>✓ {fmtDate(row.completedAt)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty sidebar state */
          <div className="panel" style={{ textAlign: "center", padding: "32px 20px" }}>
            <BookOpen size={28} style={{ opacity: 0.25, marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Select a referee</p>
            <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Click any row to view their learning history and progress summary.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
