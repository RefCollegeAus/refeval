"use client";

import { useState, useMemo } from "react";
import { BookOpen, Trash2, Eye, Search, ArrowUpDown, ChevronLeft, X, HelpCircle, Zap } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Assignment } from "@/lib/types/assignments";
import { learningPctColor } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import type { Group } from "@/lib/types/groups";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, EmptyState, Input, Spinner, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

interface Props {
  session: RefEvalSession;
  assignments: Assignment[];
  playlists: Playlist[];
  members: MemberRecord[];
  groups: Group[];
  simulatorSessions?: Array<{ id: string; title: string }>;
  loading: boolean;
  error: string;
  canDelete: boolean;
  onView: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onNewQuiz: () => void;
  onNewSimulator?: () => void;
  onBack: () => void;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function playlistTitle(playlistId: string | null, playlists: Playlist[]) {
  if (!playlistId) return "—";
  return playlists.find(p => p.id === playlistId)?.title ?? "Unknown playlist";
}

function simulatorTitle(sessionId: string | null, sessions: Array<{ id: string; title: string }>) {
  if (!sessionId) return "—";
  return sessions.find(s => s.id === sessionId)?.title ?? "Unknown simulator";
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

// ── Main screen ───────────────────────────────────────────────────────────────

export function AssignmentsScreen({
  session, assignments, playlists, members, groups, simulatorSessions = [], loading, error,
  canDelete, onView, onDelete, onNewQuiz, onNewSimulator, onBack,
}: Props) {
  const [deleting, setDeleting]               = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [query, setQuery]                     = useState("");
  const [statusFilter, setStatusFilter]       = useState<StatusFilter>("all");
  const [sort, setSort]                       = useState<SortKey>("created");
  const [sortAsc, setSortAsc]                 = useState(false);

  const now = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleDelete(id: string) {
    setDeleting(id);
    setPendingDeleteId(null);
    try { await onDelete(id); } finally { setDeleting(null); }
  }

  const canCreate = session.activeRole === "educator" || session.activeRole === "admin" || session.activeRole === "super_admin";

  const enriched = useMemo<EnrichedAssignment[]>(() =>
    assignments.map(a => {
      const total     = a.assignmentUsers.length;
      const completed = a.assignmentUsers.filter(u => u.status === "Completed").length;
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
      const allDone   = total > 0 && completed === total;
      const isOverdue = !allDone && !!a.dueDate && a.dueDate < now;
      const sf: StatusFilter = allDone ? "completed" : isOverdue ? "overdue" : "active";
      const title = a.simulatorSessionId
        ? simulatorTitle(a.simulatorSessionId, simulatorSessions)
        : playlistTitle(a.playlistId, playlists);
      return {
        ...a,
        _playlistTitle: title,
        _userCount: total,
        _completed: completed,
        _pct: pct,
        _statusFilter: sf,
      };
    }),
  [assignments, playlists, simulatorSessions, now]);

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
      <TableHeaderCell
        className={cn("cursor-pointer select-none whitespace-nowrap", right && "text-right")}
        onClick={() => handleSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown size={11} className={active ? "text-accent opacity-100" : "opacity-30"} />
        </span>
      </TableHeaderCell>
    );
  }

  const STATUSES: { key: StatusFilter; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "active",    label: "Active" },
    { key: "overdue",   label: "Overdue" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <PageFrame
      className="mx-auto max-w-[1200px]"
      eyebrow="Organisation"
      title="Learning Assignments"
      description="Playlists, quizzes, and simulator assignments for team members"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && onNewSimulator && simulatorSessions.length > 0 && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={onNewSimulator}>
              <Zap size={13} /> Assign Simulator
            </Button>
          )}
          {canCreate && (
            <Button variant="primary" size="sm" className="gap-1.5" onClick={onNewQuiz}>
              <HelpCircle size={13} /> New Quiz
            </Button>
          )}
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={onBack}>
            <ChevronLeft size={15} /> Back
          </Button>
        </div>
      }
    >
      {error && <p className="text-[13px] text-red-300">{error}</p>}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Spinner size={16} /> Loading…
        </div>
      )}

      {/* Filter bar */}
      {!loading && assignments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-[340px] flex-[1_1_200px]">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search assignments…" aria-label="Search assignments" className="pl-8" />
          </div>
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="rounded-lg border-none bg-none p-1.5 text-muted">
              <X size={13} />
            </button>
          )}
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                  statusFilter === key
                    ? key === "overdue" ? "border-danger/40 bg-danger/10 font-bold text-red-300" : "border-accent/40 bg-accent/10 font-bold text-accent"
                    : "border-border bg-panel-2 font-normal text-muted"
                )}
              >
                {label}
                {statusCounts[key] > 0 && statusFilter !== key && (
                  <span className="ml-1 text-[11px] text-muted">{statusCounts[key]}</span>
                )}
              </button>
            ))}
          </div>
          <span className="ml-auto whitespace-nowrap text-xs text-muted">
            {filtered.length} of {assignments.length}
          </span>
        </div>
      )}

      {/* Empty states */}
      {!loading && assignments.length === 0 && (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="No assignments yet"
          description={'Open a playlist and click "Assign Playlist" to create a learning assignment, use New Quiz above to create a standalone knowledge quiz, or use Assign Simulator to assign a simulator session.'}
        />
      )}

      {!loading && assignments.length > 0 && filtered.length === 0 && (
        <p className="py-4 text-sm text-muted">No assignments match your filters.</p>
      )}

      {filtered.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <SortTh col="title"    label="Assignment" />
              <SortTh col="playlist" label="Content" />
              <SortTh col="users"    label="Users" right />
              <SortTh col="pct"      label="Progress" />
              <SortTh col="due"      label="Due" />
              <TableHeaderCell className="whitespace-nowrap">Created by</TableHeaderCell>
              <SortTh col="created"  label="Created" />
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(a => {
              const isOverdue = a._statusFilter === "overdue";
              const isDone    = a._statusFilter === "completed";
              const pctColor  = learningPctColor(isDone ? 100 : a._pct);
              const isQuizOnly = !a.playlistId;
              return (
                <TableRow key={a.id}>
                  <TableCell data-label="Assignment">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-text">{a.title}</span>
                      {a.required && <Badge tone="danger">Required</Badge>}
                      {a.simulatorSessionId && (
                        <Badge tone="warn" className="gap-1"><Zap size={9} /> Simulator</Badge>
                      )}
                      {isQuizOnly && !a.simulatorSessionId && (
                        <Badge tone="accent" className="gap-1"><HelpCircle size={9} /> Quiz</Badge>
                      )}
                      {isOverdue && <Badge tone="danger">Overdue</Badge>}
                    </div>
                  </TableCell>
                  <TableCell data-label="Content" className="max-w-[200px] truncate text-muted">
                    {isQuizOnly && !a.simulatorSessionId
                      ? <span className="text-xs italic text-muted">Standalone quiz</span>
                      : a._playlistTitle}
                  </TableCell>
                  <TableCell data-label="Users" className="text-center">
                    {a._userCount > 0
                      ? <span className="chip text-[11px]">{a._userCount}</span>
                      : <span className="text-muted">—</span>}
                  </TableCell>
                  <TableCell data-label="Progress" className="min-w-[130px]">
                    {a._userCount > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="lh-progress-bar flex-1" aria-hidden="true">
                          <div className="lh-progress-fill" style={{ width: `${a._pct}%`, background: pctColor }} />
                        </div>
                        <span className="min-w-[34px] text-xs font-bold" style={{ color: pctColor }}>{a._pct}%</span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </TableCell>
                  <TableCell data-label="Due" className={cn("whitespace-nowrap", isOverdue ? "text-red-300" : "text-muted")}>
                    {fmt(a.dueDate)}
                  </TableCell>
                  <TableCell data-label="Created by" className="max-w-[140px] truncate text-muted">
                    {memberName(a.assignedBy, members)}
                  </TableCell>
                  <TableCell data-label="Created" className="whitespace-nowrap text-muted">
                    {fmt(a.createdAt)}
                  </TableCell>
                  <TableCell data-label="">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="secondary" size="sm" className="gap-1" onClick={() => onView(a.id)}>
                        <Eye size={12} /> View
                      </Button>
                      {canDelete && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="gap-1"
                          onClick={() => setPendingDeleteId(a.id)}
                          disabled={deleting === a.id}
                        >
                          <Trash2 size={12} /> Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {pendingDeleteId && (
        <ConfirmModal
          title="Delete Assignment"
          message="This will permanently delete the assignment and remove all member progress. This cannot be undone."
          confirmLabel="Yes, Delete"
          busy={deleting === pendingDeleteId}
          onConfirm={() => handleDelete(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </PageFrame>
  );
}
