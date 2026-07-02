"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Search, CheckCircle2, Clock,
  AlertCircle, BookOpen, ArrowUpDown, X,
} from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { Assignment, AssignmentUser } from "@/lib/types/assignments";
import { STATUS_COLORS, STATUS_BG, STATUS_BORDER } from "@/lib/types/assignments";
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

type SortKey = "name" | "assigned" | "started" | "completed" | "pct" | "overdue" | "lastActive";

export function LearningProgress({ session, assignments, members, groups, setScreen }: Props) {
  const [search, setSearch]               = useState("");
  const [groupFilter, setGroupFilter]     = useState<string>("all");
  const [showOverdue, setShowOverdue]     = useState(false);
  const [sort, setSort]                   = useState<SortKey>("name");
  const [sortAsc, setSortAsc]             = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const now = new Date().toISOString().slice(0, 10);

  const refereeMembers = useMemo(
    () => members.filter(m => m.role === "referee"),
    [members],
  );

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

  const overdueTotal = useMemo(() => stats.reduce((n, s) => n + s.overdue, 0), [stats]);

  const filtered = useMemo(() => {
    const groupMemberIds: Set<string> = (() => {
      if (groupFilter === "all") return new Set<string>();
      const g = groups.find(x => x.id === groupFilter);
      return g ? new Set<string>(g.members.map(m => m.userId)) : new Set<string>();
    })();

    let out = stats.filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (groupFilter !== "all" && !groupMemberIds.has(s.id)) return false;
      if (showOverdue && s.overdue === 0) return false;
      return true;
    });

    out = [...out].sort((a, b) => {
      let cmp = 0;
      if      (sort === "name")       cmp = a.name.localeCompare(b.name);
      else if (sort === "assigned")   cmp = a.assigned - b.assigned;
      else if (sort === "started")    cmp = a.started - b.started;
      else if (sort === "completed")  cmp = a.completed - b.completed;
      else if (sort === "pct")        cmp = a.pct - b.pct;
      else if (sort === "overdue")    cmp = a.overdue - b.overdue;
      else if (sort === "lastActive") {
        const ta = a.lastActivity ?? "";
        const tb = b.lastActivity ?? "";
        cmp = ta.localeCompare(tb);
      }
      return sortAsc ? cmp : -cmp;
    });
    return out;
  }, [stats, search, groupFilter, groups, showOverdue, sort, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sort === key) setSortAsc(a => !a);
    else { setSort(key); setSortAsc(false); } // default desc for numeric cols feels natural
  }

  // Name defaults to asc; others default to desc
  function handleSortTh(key: SortKey) {
    if (sort === key) { setSortAsc(a => !a); return; }
    setSort(key);
    setSortAsc(key === "name");
  }

  function SortTh({ col, label, right }: { col: SortKey; label: string; right?: boolean }) {
    const active = sort === col;
    return (
      <th
        style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", textAlign: right ? "right" : undefined }}
        onClick={() => handleSortTh(col)}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <ArrowUpDown size={11} style={{ opacity: active ? 1 : 0.3, color: active ? "var(--accent)" : undefined }} />
        </span>
      </th>
    );
  }

  const selectedStat = selectedMemberId ? stats.find(s => s.id === selectedMemberId) ?? null : null;

  const selectedRows = useMemo(() => {
    if (!selectedMemberId) return [];
    return assignments.flatMap(a =>
      a.assignmentUsers
        .filter(u => u.userId === selectedMemberId)
        .map(u => ({ ...u, assignment: a }))
    ).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  }, [selectedMemberId, assignments]);

  const weekAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();
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

        {/* Filter bar */}
        <div className="panel" style={{ padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 160px", minWidth: 140 }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
            <input
              style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
              placeholder="Search referees…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <button onClick={() => setSearch("")} style={{ border: "none", background: "none", padding: "4px 6px", cursor: "pointer", flexShrink: 0 }}>
              <X size={13} />
            </button>
          )}
          {groups.length > 0 && (
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              style={{ fontSize: 12, padding: "6px 10px", width: "auto", flexShrink: 0, borderRadius: 8 }}
            >
              <option value="all">All Groups</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
          {/* Overdue filter toggle */}
          <button
            onClick={() => setShowOverdue(v => !v)}
            className={showOverdue ? "selected" : ""}
            style={{
              fontSize: 12, padding: "6px 10px", display: "flex", alignItems: "center", gap: 5,
              flexShrink: 0, borderRadius: 8,
              ...(showOverdue ? {} : {}),
            }}
          >
            <AlertCircle size={13} style={{ color: showOverdue ? "#ef4444" : undefined }} />
            Overdue{overdueTotal > 0 ? ` (${overdueTotal})` : ""}
          </button>
        </div>

        {/* Progress table */}
        {refereeMembers.length === 0 ? (
          <div className="empty-state panel">
            <BookOpen size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No referees in this organisation.</p>
            <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>Add referee members to start tracking learning progress.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state panel">
            {showOverdue ? (
              <>
                <CheckCircle2 size={28} style={{ opacity: 0.3, marginBottom: 8, color: "#22c55e" }} />
                <p style={{ margin: 0, fontWeight: 700 }}>No overdue referees</p>
                <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>All referees are up to date with their learning.</p>
              </>
            ) : (
              <p style={{ margin: 0 }}>No referees match your search.</p>
            )}
          </div>
        ) : (
          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ref-reviews-table">
              <table>
                <thead>
                  <tr>
                    <SortTh col="name"       label="Referee" />
                    <SortTh col="assigned"   label="Assigned"   right />
                    <SortTh col="started"    label="Started"    right />
                    <SortTh col="completed"  label="Completed"  right />
                    <SortTh col="pct"        label="Progress"   />
                    <SortTh col="overdue"    label="Overdue"    right />
                    <SortTh col="lastActive" label="Last Active" />
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const pctColor = s.pct === 100 ? "#22c55e" : s.pct >= 50 ? "#3b82f6" : "var(--accent)";
                    return (
                      <tr
                        key={s.id}
                        className={"ed-review-row" + (selectedMemberId === s.id ? " lh-row--selected" : "")}
                        onClick={() => setSelectedMemberId(prev => prev === s.id ? null : s.id)}
                      >
                        <td data-label="Referee">
                          <div style={{ fontWeight: 700 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.email}</div>
                        </td>
                        <td data-label="Assigned" style={{ textAlign: "right" }}>
                          {s.assigned || <span className="hint">—</span>}
                        </td>
                        <td data-label="Started" style={{ textAlign: "right" }}>
                          {s.started > 0 ? (
                            <span style={{ color: STATUS_COLORS.Started, fontWeight: 700 }}>{s.started}</span>
                          ) : <span className="hint">—</span>}
                        </td>
                        <td data-label="Completed" style={{ textAlign: "right" }}>
                          {s.completed > 0 ? (
                            <span style={{ color: STATUS_COLORS.Completed, fontWeight: 700 }}>{s.completed}</span>
                          ) : <span className="hint">—</span>}
                        </td>
                        <td data-label="Progress" style={{ minWidth: 120 }}>
                          {s.assigned > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div className="lh-progress-bar" style={{ flex: 1 }}>
                                <div className="lh-progress-fill" style={{ width: `${s.pct}%`, background: pctColor }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, color: pctColor }}>{s.pct}%</span>
                            </div>
                          ) : <span className="hint">—</span>}
                        </td>
                        <td data-label="Overdue" style={{ textAlign: "right" }}>
                          {s.overdue > 0 ? (
                            <span style={{ color: "#ef4444", fontWeight: 700 }}>{s.overdue}</span>
                          ) : (
                            s.assigned > 0
                              ? <span style={{ color: "#22c55e", fontSize: 13 }}>✓</span>
                              : <span className="hint">—</span>
                          )}
                        </td>
                        <td data-label="Last Active" style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {s.lastActivity ? fmtRel(s.lastActivity) : <span className="hint">—</span>}
                        </td>
                        <td>
                          <ChevronRight size={14} style={{ opacity: 0.4 }} />
                        </td>
                      </tr>
                    );
                  })}
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

              {/* Last active */}
              {selectedStat.lastActivity && (
                <p className="hint" style={{ margin: "10px 0 0", fontSize: 12 }}>
                  Last active {fmtRel(selectedStat.lastActivity)}
                </p>
              )}
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
                            style={{
                              display: "inline-block",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 999,
                              whiteSpace: "nowrap",
                              background: STATUS_BG[row.status],
                              color: STATUS_COLORS[row.status],
                              border: `1px solid ${STATUS_BORDER[row.status]}`,
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
                              Due {fmtDate(row.assignment.dueDate)}{isOverdue ? " · Overdue" : ""}
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
