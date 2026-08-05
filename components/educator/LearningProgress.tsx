"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Search, CheckCircle2, Clock,
  AlertCircle, BookOpen, ArrowUpDown, X,
} from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { Assignment, AssignmentUser } from "@/lib/types/assignments";
import { STATUS_COLORS, STATUS_BG, STATUS_BORDER, learningPctColor } from "@/lib/types/assignments";
import type { MemberRecord } from "@/lib/types/members";
import type { Group } from "@/lib/types/groups";
import { fmtDate, fmtRel } from "@/lib/utils/time";
import { PageFrame } from "@/components/shell/PageFrame";
import {
  Badge, Button, Card, EmptyState, Input, Select,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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

  // Name defaults to asc; others default to desc
  function handleSortTh(key: SortKey) {
    if (sort === key) { setSortAsc(a => !a); return; }
    setSort(key);
    setSortAsc(key === "name");
  }

  function SortTh({ col, label, right }: { col: SortKey; label: string; right?: boolean }) {
    const active = sort === col;
    return (
      <TableHeaderCell
        className={cn("cursor-pointer select-none whitespace-nowrap", right && "text-right")}
        onClick={() => handleSortTh(col)}
      >
        <span className={cn("inline-flex items-center gap-1", right && "justify-end")}>
          {label}
          <ArrowUpDown size={11} className={active ? "text-accent" : "opacity-30"} />
        </span>
      </TableHeaderCell>
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
    <PageFrame
      className="p-0"
      eyebrow="Learning Hub"
      title="Learning Progress"
      actions={
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setScreen("learning-hub")}>
          <ChevronLeft size={15} /> Back
        </Button>
      }
    >
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">

        {/* ── Main column ── */}
        <div className="grid grid-cols-1 gap-3.5">

          {/* Filter bar */}
          <Card className="flex flex-wrap items-center gap-2 p-3">
            {/* Search */}
            <div className="relative min-w-[140px] flex-1">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                className="pl-7 text-sm"
                placeholder="Search referees…"
                aria-label="Search referees"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {search && (
              <Button variant="ghost" size="sm" className="shrink-0 px-1.5" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={13} />
              </Button>
            )}
            {groups.length > 0 && (
              <Select
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                aria-label="Filter by group"
                className="w-auto shrink-0 text-xs"
              >
                <option value="all">All Groups</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
            )}
            {/* Overdue filter toggle */}
            <Button
              variant={showOverdue ? "primary" : "secondary"}
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setShowOverdue(v => !v)}
            >
              <AlertCircle size={13} />
              Overdue{overdueTotal > 0 ? ` (${overdueTotal})` : ""}
            </Button>
          </Card>

          {/* Progress table */}
          {refereeMembers.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={28} />}
              title="No referees in this organisation"
              description="Add referee members to start tracking learning progress."
            />
          ) : filtered.length === 0 ? (
            showOverdue ? (
              <EmptyState
                icon={<CheckCircle2 size={28} className="text-good" />}
                title="No overdue referees"
                description="All referees are up to date with their learning."
              />
            ) : (
              <EmptyState title="No referees match your search." />
            )
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <SortTh col="name"       label="Referee" />
                  <SortTh col="assigned"   label="Assigned"   right />
                  <SortTh col="started"    label="Started"    right />
                  <SortTh col="completed"  label="Completed"  right />
                  <SortTh col="pct"        label="Progress"   />
                  <SortTh col="overdue"    label="Overdue"    right />
                  <SortTh col="lastActive" label="Last Active" />
                  <TableHeaderCell aria-hidden="true" />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(s => {
                  const pctColor = learningPctColor(s.pct);
                  return (
                    <TableRow
                      key={s.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-accent/5",
                        selectedMemberId === s.id && "bg-accent/10"
                      )}
                      onClick={() => setSelectedMemberId(prev => prev === s.id ? null : s.id)}
                      tabIndex={0}
                      aria-label={`${s.name} — view learning profile`}
                      aria-selected={selectedMemberId === s.id}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedMemberId(prev => prev === s.id ? null : s.id); } }}
                    >
                      <TableCell data-label="Referee">
                        <div className="font-semibold text-text">{s.name}</div>
                        <div className="text-[11px] text-muted">{s.email}</div>
                      </TableCell>
                      <TableCell data-label="Assigned" className="text-right">
                        {s.assigned || <span className="text-muted">—</span>}
                      </TableCell>
                      <TableCell data-label="Started" className="text-right">
                        {s.started > 0 ? (
                          <span className="font-semibold" style={{ color: STATUS_COLORS.Started }}>{s.started}</span>
                        ) : <span className="text-muted">—</span>}
                      </TableCell>
                      <TableCell data-label="Completed" className="text-right">
                        {s.completed > 0 ? (
                          <span className="font-semibold" style={{ color: STATUS_COLORS.Completed }}>{s.completed}</span>
                        ) : <span className="text-muted">—</span>}
                      </TableCell>
                      <TableCell data-label="Progress" className="min-w-[120px]">
                        {s.assigned > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 min-w-[40px] max-w-[80px] flex-1 overflow-hidden rounded-full bg-accent/15" aria-hidden="true">
                              <div className="h-full rounded-full transition-[width]" style={{ width: `${s.pct}%`, background: pctColor }} />
                            </div>
                            <span className="min-w-[34px] text-xs font-semibold" style={{ color: pctColor }}>{s.pct}%</span>
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </TableCell>
                      <TableCell data-label="Overdue" className="text-right">
                        {s.overdue > 0 ? (
                          <span className="font-semibold text-red-400">{s.overdue}</span>
                        ) : (
                          s.assigned > 0
                            ? <CheckCircle2 size={14} className="ml-auto text-good" />
                            : <span className="text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell data-label="Last Active" className="whitespace-nowrap text-xs text-muted">
                        {s.lastActivity ? fmtRel(s.lastActivity) : <span className="text-muted">—</span>}
                      </TableCell>
                      <TableCell>
                        <ChevronRight size={14} className="opacity-40" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

        </div>

        {/* ── Sidebar / Referee Profile ── */}
        <aside className="grid grid-cols-1 gap-3.5">
          {selectedStat ? (
            <>
              {/* Profile header */}
              <Card>
                <div className="mb-3.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-accent">Referee Profile</p>
                    <h2 className="text-lg font-bold text-text">{selectedStat.name}</h2>
                    <p className="mt-0.5 text-xs text-muted">{selectedStat.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 px-1.5" onClick={() => setSelectedMemberId(null)} title="Close profile">
                    <X size={14} />
                  </Button>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border bg-panel-2 p-2.5 text-center">
                    <div className="text-xl font-extrabold leading-none tracking-tight text-text">{selectedStat.assigned}</div>
                    <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Assigned</div>
                  </div>
                  <div className="rounded-lg border border-good/25 bg-panel-2 p-2.5 text-center">
                    <div className="text-xl font-extrabold leading-none tracking-tight text-text">{selectedStat.completed}</div>
                    <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Completed</div>
                  </div>
                  <div className={cn("rounded-lg border bg-panel-2 p-2.5 text-center", selectedStat.overdue > 0 ? "border-danger/35" : "border-border")}>
                    <div className={cn("text-xl font-extrabold leading-none tracking-tight", selectedStat.overdue > 0 ? "text-red-400" : "text-muted")}>
                      {selectedStat.overdue}
                    </div>
                    <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Overdue</div>
                  </div>
                </div>

                {/* Activity cadence */}
                <div className="mt-3 flex gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                    <Clock size={11} />
                    {completedThisWeek} this week
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                    <CheckCircle2 size={11} />
                    {completedThisMonth} this month
                  </span>
                </div>

                {/* Last active */}
                {selectedStat.lastActivity && (
                  <p className="mt-2.5 text-xs text-muted">
                    Last active {fmtRel(selectedStat.lastActivity)}
                  </p>
                )}
              </Card>

              {/* Assignment history */}
              <Card>
                <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Assignment History</h3>
                {selectedRows.length === 0 ? (
                  <EmptyState
                    className="px-2.5 py-4"
                    title="No assignments yet."
                    description="Assign a playlist to begin tracking their learning."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {selectedRows.map(row => {
                      const isOverdue = row.status !== "Completed" && row.assignment.dueDate && row.assignment.dueDate < now;
                      return (
                        <div
                          key={row.id}
                          className={cn(
                            "rounded-lg border bg-panel-2 p-2.5 transition-colors",
                            isOverdue ? "border-danger/35" : "border-border"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="flex-1 text-sm font-semibold text-text">{row.assignment.title}</span>
                            <Badge
                              className="shrink-0"
                              style={{ background: STATUS_BG[row.status], color: STATUS_COLORS[row.status], borderColor: STATUS_BORDER[row.status] }}
                            >
                              {row.status}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span className="text-[11px] text-muted">Assigned {fmtDate(row.assignedAt)}</span>
                            {row.assignment.dueDate && (
                              <span className={cn("text-[11px]", isOverdue ? "text-red-400" : "text-muted")}>
                                Due {fmtDate(row.assignment.dueDate)}{isOverdue ? " · Overdue" : ""}
                              </span>
                            )}
                            {row.completedAt && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-good">
                                <CheckCircle2 size={11} /> {fmtDate(row.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="py-8 text-center">
              <BookOpen size={28} className="mx-auto mb-2.5 opacity-25" />
              <p className="text-sm font-semibold text-text">Select a referee</p>
              <p className="mt-1 text-xs text-muted">
                Click any row to view their learning history and progress summary.
              </p>
            </Card>
          )}
        </aside>
      </div>
    </PageFrame>
  );
}
