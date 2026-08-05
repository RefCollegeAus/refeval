"use client";

import React, { useState, useMemo } from "react";
import { BookOpen, UserPlus, Trash2, Edit2, Search, X, ChevronLeft, ChevronDown, ChevronUp, CheckCircle2, ArrowUpDown, MessageSquare, Plus, HelpCircle, Zap } from "lucide-react";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import type { Assignment, AssignmentStatus, ReflectionQuestion, QuizQuestion } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import { ASSIGNMENT_STATUSES as ALL_STATUSES, STATUS_COLORS, STATUS_BG, STATUS_BORDER, learningPctColor } from "@/lib/types/assignments";
import QuizEditor from "@/components/learning/QuizEditor";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import type { SimulatorAttempt } from "@/lib/types/simulator";
import { useModalA11y } from "@/lib/hooks/useModalA11y";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, Input, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Textarea } from "@/components/ui";
import { ROLE_TONE } from "@/lib/utils/roleTone";
import { cn } from "@/lib/utils/cn";

interface Props {
  assignment: Assignment;
  playlist: Playlist | null;
  simulatorSessionTitle?: string | null;
  simulatorAttempts?: SimulatorAttempt[];
  members: MemberRecord[];
  canEdit: boolean;
  canDelete: boolean;
  reviews?: ReviewRecord[];
  tags?: CodedTag[];
  onBack: () => void;
  onUpdate: (id: string, data: { title: string; instructions: string | null; dueDate: string | null; required: boolean; quizAllowRetakes?: boolean; questions?: ReflectionQuestion[]; quizQuestions?: QuizQuestion[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddUsers: (assignmentId: string, userIds: string[]) => Promise<{ added: number; skipped: number }>;
  onRemoveUser: (assignmentUserId: string) => Promise<void>;
  onUpdateStatus?: (assignmentUserId: string, status: AssignmentStatus) => Promise<void>;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ── Edit Assignment Modal ─────────────────────────────────────────────────────

function EditModal({
  assignment,
  reviews = [],
  tags = [],
  onSave,
  onClose,
}: {
  assignment: Assignment;
  reviews?: ReviewRecord[];
  tags?: CodedTag[];
  onSave: (data: { title: string; instructions: string | null; dueDate: string | null; required: boolean; quizAllowRetakes: boolean; questions: ReflectionQuestion[]; quizQuestions: QuizQuestion[] }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle]               = useState(assignment.title);
  const [instructions, setInstr]        = useState(assignment.instructions || "");
  const [dueDate, setDueDate]           = useState(assignment.dueDate || "");
  const [required, setRequired]         = useState(assignment.required);
  const [allowRetakes, setAllowRetakes] = useState(assignment.quizAllowRetakes);
  const [questions, setQuestions]       = useState<ReflectionQuestion[]>(assignment.questions ?? []);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(assignment.quizQuestions ?? []);
  const [saving, setSaving]             = useState(false);
  const [err, setErr]                   = useState("");
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose);

  function addQuestion() {
    setQuestions(prev => [...prev, { id: crypto.randomUUID(), text: "", required: false, displayOrder: prev.length }]);
  }

  function updateQuestion(id: string, text: string) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, text } : q));
  }

  function toggleRequired(id: string) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, required: !q.required } : q));
  }

  function moveQuestion(id: string, dir: -1 | 1) {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((q, i) => ({ ...q, displayOrder: i }));
    });
  }

  function removeQuestion(id: string) {
    setQuestions(prev => prev.filter(q => q.id !== id).map((q, i) => ({ ...q, displayOrder: i })));
  }

  async function handleSave() {
    if (!title.trim()) { setErr("Title is required."); return; }
    const cleaned = questions.filter(q => q.text.trim());
    setSaving(true); setErr("");
    try {
      await onSave({
        title: title.trim(),
        instructions: instructions.trim() || null,
        dueDate: dueDate || null,
        required,
        quizAllowRetakes: allowRetakes,
        questions: cleaned,
        quizQuestions,
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit Assignment"
        tabIndex={-1}
        className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-panel p-5 shadow-xl focus:outline-none"
        style={{ maxHeight: "90vh" }}
      >
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Edit Assignment</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>Update details</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 px-1.5"
          >
            <X size={16} />
          </Button>
        </div>
        <div className="min-h-0 flex flex-1 flex-col gap-3.5 overflow-y-auto">
          <label className="grid gap-1 text-sm font-semibold text-text">
            Title *
            <Input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-text">
            Instructions <span className="text-xs font-normal text-muted">(optional)</span>
            <Textarea value={instructions} onChange={e => setInstr(e.target.value)} rows={4} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-text">
            Due Date <span className="text-xs font-normal text-muted">(optional)</span>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className="h-[15px] w-[15px] cursor-pointer accent-accent" />
            <span className="text-[13px] text-text">Required assignment</span>
          </label>
          {assignment.quizQuestions.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={allowRetakes} onChange={e => setAllowRetakes(e.target.checked)} className="h-[15px] w-[15px] cursor-pointer accent-accent" />
              <span className="text-[13px] text-text">Allow quiz retakes</span>
            </label>
          )}

          {/* Reflection questions */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-text">
                Reflection Questions <span className="font-normal text-muted">(optional)</span>
              </div>
              <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={addQuestion}>
                <Plus size={12} /> Add Question
              </Button>
            </div>
            {questions.length === 0 ? (
              <p className="text-xs text-muted">
                No reflection questions. Referees will be able to complete the assignment after watching all clips.
              </p>
            ) : (
              <div className="grid gap-2">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-1.5">
                    {/* Reorder */}
                    <div className="flex shrink-0 flex-col gap-0.5 pt-1">
                      <button type="button" onClick={() => moveQuestion(q.id, -1)} disabled={i === 0} className={cn("border-none bg-none p-0.5 text-muted", i === 0 ? "cursor-default opacity-30" : "cursor-pointer")} title="Move up"><ChevronUp size={12} /></button>
                      <button type="button" onClick={() => moveQuestion(q.id, 1)} disabled={i === questions.length - 1} className={cn("border-none bg-none p-0.5 text-muted", i === questions.length - 1 ? "cursor-default opacity-30" : "cursor-pointer")} title="Move down"><ChevronDown size={12} /></button>
                    </div>
                    <span className="min-w-[14px] shrink-0 pt-2.5 text-right text-xs text-muted">{i + 1}.</span>
                    <Input value={q.text} onChange={e => updateQuestion(q.id, e.target.value)} placeholder={`Question ${i + 1}…`} className="flex-1 text-[13px]" />
                    {/* Required toggle */}
                    <label className={cn("flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap pt-2.5 text-[11px]", q.required ? "text-red-300" : "text-muted")} title="Mark as required">
                      <input type="checkbox" checked={q.required} onChange={() => toggleRequired(q.id)} className="h-3 w-3 cursor-pointer accent-accent" />
                      Req
                    </label>
                    <button type="button" onClick={() => removeQuestion(q.id)} className="shrink-0 border-none bg-none p-1.5 text-muted" title="Remove question">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Knowledge quiz */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-text">
              <HelpCircle size={13} /> Knowledge Quiz <span className="font-normal text-muted">(optional)</span>
            </div>
            <QuizEditor questions={quizQuestions} onChange={setQuizQuestions} reviews={reviews} tags={tags} />
          </div>

          {err && <p className="text-[13px] text-red-300">{err}</p>}
        </div>
        <div className="action-row mt-5 shrink-0 border-t border-border pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Add Users Panel ───────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = { viewer: "Viewer", referee: "Referee", educator: "Educator", admin: "Administrator", super_admin: "Super Admin" };

function AddUsersPanel({
  assignment,
  members,
  onAdd,
}: {
  assignment: Assignment;
  members: MemberRecord[];
  onAdd: (userIds: string[]) => Promise<{ added: number; skipped: number }>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const assignedIds = new Set(assignment.assignmentUsers.map(u => u.userId));

  const q = query.trim().toLowerCase();
  const unassigned = members.filter(m => !assignedIds.has(m.id) && m.role === "referee");
  const filtered = q
    ? unassigned.filter(m =>
        (m.name || "").toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
      )
    : unassigned;

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true); setErr("");
    try {
      await onAdd(Array.from(selected));
      setSelected(new Set());
      setQuery("");
    } catch (e: any) {
      setErr(e?.message || "Failed to add users.");
    } finally {
      setSaving(false);
    }
  }

  if (unassigned.length === 0) return null;

  return (
    <div className="mt-5">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text">
        <UserPlus size={14} /> Add Team Members
      </h3>
      <div className="relative mb-2">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search team members…" className="pl-8" />
      </div>
      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border">
        {filtered.length === 0 && <p className="p-3 text-sm text-muted">No members to add.</p>}
        {filtered.map(m => {
          const tone = ROLE_TONE[m.role] ?? ROLE_TONE.viewer;
          return (
            <label
              key={m.id}
              className={cn("flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 last:border-b-0", selected.has(m.id) && "bg-panel-2")}
            >
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                onChange={() => toggle(m.id)}
                className="h-3.5 w-3.5 shrink-0 accent-accent"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text">{m.name || m.email}</div>
                <div className="truncate text-[11px] text-muted">{m.email}</div>
              </div>
              <Badge tone="neutral" className={cn("shrink-0", tone.text)}>{ROLE_LABELS[m.role] ?? m.role}</Badge>
            </label>
          );
        })}
      </div>
      {err && <p className="mt-1.5 text-[13px] text-red-300">{err}</p>}
      {selected.size > 0 && (
        <Button variant="primary" size="sm" className="mt-2.5" onClick={handleAdd} disabled={saving}>
          {saving ? "Adding…" : `Add ${selected.size} member${selected.size !== 1 ? "s" : ""}`}
        </Button>
      )}
    </div>
  );
}

// ── Assignment Detail Screen ──────────────────────────────────────────────────

export function AssignmentDetailScreen({
  assignment, playlist, simulatorSessionTitle, simulatorAttempts = [], members, canEdit, canDelete, reviews = [], tags = [],
  onBack, onUpdate, onDelete, onAddUsers, onRemoveUser, onUpdateStatus,
}: Props) {
  const [editOpen, setEditOpen]             = useState(false);
  const [removing, setRemoving]             = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [expandedResponsesId, setExpandedResponsesId] = useState<string | null>(null);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus]   = useState<{
    auId: string;
    status: AssignmentStatus;
    memberName: string;
  } | null>(null);

  const assignedIds = useMemo(
    () => new Set(assignment.assignmentUsers.map(u => u.userId)),
    [assignment.assignmentUsers],
  );

  function memberOf(userId: string) {
    return members.find(m => m.id === userId);
  }

  async function handleRemove(assignmentUserId: string) {
    setPendingRemoveId(null);
    setRemoving(assignmentUserId);
    try { await onRemoveUser(assignmentUserId); } finally { setRemoving(null); }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    setDeleting(true);
    try { await onDelete(assignment.id); } finally { setDeleting(false); }
  }

  async function confirmStatusChange() {
    if (!onUpdateStatus || !pendingStatus) return;
    const { auId, status } = pendingStatus;
    setPendingStatus(null);
    setUpdatingStatus(auId);
    try { await onUpdateStatus(auId, status); } catch { /* toast in future */ } finally { setUpdatingStatus(null); }
  }

  type ProgressSort = "status" | "progress" | "name";
  const [progressSort, setProgressSort] = useState<ProgressSort>("status");
  const [progressSortAsc, setProgressSortAsc] = useState(true);

  function handleProgressSort(key: ProgressSort) {
    if (progressSort === key) { setProgressSortAsc(a => !a); return; }
    setProgressSort(key);
    setProgressSortAsc(key === "name");
  }

  const totalClips    = playlist?.items.length ?? 0;
  const total         = assignment.assignmentUsers.length;
  const completedCount   = assignment.assignmentUsers.filter(u => u.status === "Completed").length;
  const inProgressCount  = assignment.assignmentUsers.filter(u => u.status === "Started").length;
  const notStartedCount  = assignment.assignmentUsers.filter(u => u.status === "Assigned").length;
  const overallWatched   = assignment.assignmentUsers.reduce((s, u) => s + u.watchedClipIds.length, 0);
  const overallPossible  = total * totalClips;
  const overallPct       = overallPossible > 0 ? Math.round((overallWatched / overallPossible) * 100) : 0;

  // Status sort order: In Progress → Not Started → Completed
  const STATUS_SORT_ORDER: Record<AssignmentStatus, number> = { Started: 0, Assigned: 1, Completed: 2 };

  const sortedUsers = useMemo(() => {
    const users = [...assignment.assignmentUsers];
    users.sort((a, b) => {
      let cmp = 0;
      if (progressSort === "status") {
        cmp = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
        if (cmp === 0) cmp = (memberOf(a.userId)?.name ?? "").localeCompare(memberOf(b.userId)?.name ?? "");
      } else if (progressSort === "progress") {
        cmp = a.watchedClipIds.length - b.watchedClipIds.length;
      } else {
        cmp = (memberOf(a.userId)?.name ?? "").localeCompare(memberOf(b.userId)?.name ?? "");
      }
      return progressSortAsc ? cmp : -cmp;
    });
    return users;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.assignmentUsers, progressSort, progressSortAsc, members]);

  // Column count for expanded-row colSpan (kept in sync with the header cells below)
  const colCount = 2
    + (assignment.simulatorSessionId ? 1 : 0)
    + (assignment.playlistId && totalClips > 0 ? 1 : 0)
    + (assignment.questions.length > 0 ? 1 : 0)
    + (assignment.quizQuestions.length > 0 ? 1 : 0)
    + 2
    + (canEdit ? 1 : 0);

  return (
    <PageFrame
      className="mx-auto max-w-[1200px] p-0"
      eyebrow="Learning Assignment"
      title={assignment.title}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Edit2 size={13} /> Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" size="sm" className="gap-1.5" onClick={() => setConfirmDelete(true)} disabled={deleting}>
              <Trash2 size={13} /> Delete
            </Button>
          )}
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={onBack}>
            <ChevronLeft size={15} /> Back
          </Button>
        </div>
      }
    >
      {assignment.required && <Badge tone="danger" className="-mt-3 w-fit">Required</Badge>}

      {/* Header details card */}
      <Card className="grid gap-3.5">
        {/* Meta row */}
        <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-panel-2 p-3.5 text-[13px]">
          {assignment.simulatorSessionId && (
            <div>
              <div className="mb-0.5 flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted">
                <Zap size={10} /> Simulator
              </div>
              <div className="font-semibold text-text">{simulatorSessionTitle ?? "Unknown simulator"}</div>
            </div>
          )}
          {assignment.playlistId && (
            <div>
              <div className="mb-0.5 text-[11px] uppercase tracking-wide text-muted">Playlist</div>
              <div className="font-semibold text-text">{playlist?.title ?? "Unknown playlist"}</div>
            </div>
          )}
          <div>
            <div className="mb-0.5 text-[11px] uppercase tracking-wide text-muted">Due Date</div>
            <div className="font-semibold text-text">{fmt(assignment.dueDate)}</div>
          </div>
          {assignment.playlistId && (
            <div>
              <div className="mb-0.5 text-[11px] uppercase tracking-wide text-muted">Clips</div>
              <div className="font-semibold text-text">{totalClips > 0 ? totalClips : "—"}</div>
            </div>
          )}
        </div>

        {/* Progress summary */}
        {total > 0 && (
          <div>
            {/* Stat chips */}
            <div className="mb-2.5 flex flex-wrap gap-2">
              {([
                { label: "Assigned",    value: total,          color: "var(--muted)",          bg: "var(--panel2)" },
                { label: "In Progress", value: inProgressCount, color: STATUS_COLORS.Started,   bg: STATUS_BG.Started },
                { label: "Not Started", value: notStartedCount, color: STATUS_COLORS.Assigned,  bg: STATUS_BG.Assigned },
                { label: "Completed",   value: completedCount,  color: STATUS_COLORS.Completed, bg: STATUS_BG.Completed },
              ] as const).map(({ label, value, color, bg }) => (
                <div key={label} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs" style={{ background: bg }}>
                  <span className="font-bold" style={{ color }}>{value}</span>
                  <span className="text-muted">{label}</span>
                </div>
              ))}
            </div>
            {/* Overall clip progress bar — only for playlist assignments */}
            {assignment.playlistId && totalClips > 0 && (
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-muted">
                  <span>Overall clip progress</span>
                  <span className="font-bold" style={{ color: learningPctColor(overallPct) }}>{overallPct}%</span>
                </div>
                <div className="lh-progress-bar">
                  <div className="lh-progress-fill" style={{ width: `${overallPct}%`, background: learningPctColor(overallPct) }} />
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {overallWatched} of {overallPossible} clips watched across all referees
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {assignment.instructions && (
          <div className="rounded-lg border border-border bg-panel-2 p-3.5 text-[13px]">
            <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">Instructions</div>
            <p className="whitespace-pre-wrap text-text">{assignment.instructions}</p>
          </div>
        )}

        {/* Quiz summary */}
        {assignment.quizQuestions.length > 0 && (
          <div className="rounded-lg border border-border bg-panel-2 p-3.5 text-[13px]">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted">
              <HelpCircle size={11} /> Knowledge Quiz ({assignment.quizQuestions.length} question{assignment.quizQuestions.length !== 1 ? "s" : ""})
            </div>
            <div className="text-xs text-muted">
              {assignment.assignmentUsers.filter(u => u.quizSubmittedAt).length} of {assignment.assignmentUsers.length} submitted
              {(() => {
                const submitted = assignment.assignmentUsers.filter(u => u.quizScore !== null && u.quizTotal);
                if (submitted.length === 0) return null;
                const avg = Math.round(submitted.reduce((s, u) => s + (u.quizScore! / u.quizTotal!) * 100, 0) / submitted.length);
                return <span className="ml-2 font-bold" style={{ color: learningPctColor(avg) }}>avg {avg}%</span>;
              })()}
            </div>
          </div>
        )}

        {/* Reflection questions summary */}
        {assignment.questions.length > 0 && (
          <div className="rounded-lg border border-border bg-panel-2 p-3.5 text-[13px]">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted">
              <MessageSquare size={11} /> Reflection Questions ({assignment.questions.length})
            </div>
            <ol className="grid list-decimal gap-1 pl-5">
              {assignment.questions.map(q => (
                <li key={q.id} className="text-[13px] text-text">{q.text}</li>
              ))}
            </ol>
            <div className="mt-2 text-xs text-muted">
              {assignment.assignmentUsers.filter(u => u.reflectionSubmittedAt).length} of {assignment.assignmentUsers.length} submitted
            </div>
          </div>
        )}
      </Card>

      {/* Users panel */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-text">Assigned Members</h2>
          {assignment.assignmentUsers.length > 1 && (
            <div className="flex gap-1.5">
              {(["status", "progress", "name"] as ProgressSort[]).filter(key => key !== "progress" || !!assignment.playlistId).map(key => (
                <button
                  key={key}
                  onClick={() => handleProgressSort(key)}
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                    progressSort === key ? "border-accent bg-panel-2 font-bold text-accent" : "border-border font-normal text-muted"
                  )}
                >
                  {key === "status" ? "Status" : key === "progress" ? "Progress" : "Name"}
                  <ArrowUpDown size={10} className={progressSort === key ? "opacity-100" : "opacity-40"} />
                </button>
              ))}
            </div>
          )}
        </div>

        {assignment.assignmentUsers.length === 0 && (
          <p className="text-sm text-muted">No members assigned yet.</p>
        )}
      </Card>

      {assignment.assignmentUsers.length > 0 && (
        <Card className="!p-0">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                {assignment.simulatorSessionId && <TableHeaderCell className="whitespace-nowrap">Score</TableHeaderCell>}
                {assignment.playlistId && totalClips > 0 && <TableHeaderCell className="min-w-[140px]">Progress</TableHeaderCell>}
                {assignment.questions.length > 0 && <TableHeaderCell className="whitespace-nowrap">Reflection</TableHeaderCell>}
                {assignment.quizQuestions.length > 0 && <TableHeaderCell className="whitespace-nowrap">Quiz</TableHeaderCell>}
                <TableHeaderCell className="whitespace-nowrap">Assigned</TableHeaderCell>
                <TableHeaderCell className="whitespace-nowrap">Completed</TableHeaderCell>
                {canEdit && <TableHeaderCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedUsers.map(au => {
                const m = memberOf(au.userId);
                const isUpdating = updatingStatus === au.id;
                const isRemoving = removing === au.id;
                const statusColor = STATUS_COLORS[au.status];
                const statusBg = STATUS_BG[au.status];
                const watchedCount = au.watchedClipIds.length;
                const clipPct = totalClips > 0 ? Math.round((watchedCount / totalClips) * 100) : 0;
                const pctColor = learningPctColor(clipPct);
                const userSimAttempts = assignment.simulatorSessionId
                  ? simulatorAttempts.filter(a => a.sessionId === assignment.simulatorSessionId && a.userId === au.userId)
                  : [];
                const latestSimAttempt = userSimAttempts[0];
                const latestSimPct = latestSimAttempt?.score != null && latestSimAttempt.total
                  ? Math.round((latestSimAttempt.score / latestSimAttempt.total) * 100) : null;
                return (
                  <React.Fragment key={au.id}>
                  <TableRow className={isRemoving ? "opacity-50" : undefined}>
                    <TableCell data-label="Name">
                      <div className="font-semibold text-text">{m?.name || "Unknown"}</div>
                      <div className="text-[11px] text-muted">{m?.email || "—"}</div>
                    </TableCell>
                    <TableCell data-label="Status">
                      {canEdit && onUpdateStatus ? (
                        <div className="relative inline-block">
                          <Select
                            value={pendingStatus?.auId === au.id ? pendingStatus.status : au.status}
                            disabled={isUpdating}
                            onChange={e => setPendingStatus({ auId: au.id, status: e.target.value as AssignmentStatus, memberName: m?.name || "this referee" })}
                            aria-label={`Learning status for ${m?.name || "this referee"}`}
                            className="!w-auto appearance-none pr-7 font-bold"
                            style={{
                              color: statusColor,
                              background: statusBg,
                              borderColor: STATUS_BORDER[au.status],
                              opacity: isUpdating ? 0.5 : 1,
                              cursor: isUpdating ? "default" : "pointer",
                            }}
                          >
                            {ALL_STATUSES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </Select>
                          <ChevronDown
                            size={10}
                            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-70"
                            style={{ color: statusColor }}
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-bold" style={{ color: statusColor }}>
                          {au.status}
                        </span>
                      )}
                    </TableCell>
                    {assignment.simulatorSessionId && (
                      <TableCell data-label="Score" className="whitespace-nowrap text-xs">
                        {latestSimPct !== null ? (
                          <div>
                            <span className="font-bold" style={{ color: learningPctColor(latestSimPct) }}>{latestSimPct}%</span>
                            <span className="ml-1.5 text-muted">{latestSimAttempt.score}/{latestSimAttempt.total}</span>
                            {userSimAttempts.length > 1 && (
                              <div className="text-[11px] text-muted">{userSimAttempts.length} attempts</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TableCell>
                    )}
                    {assignment.playlistId && totalClips > 0 && (
                      <TableCell data-label="Progress" className="min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="lh-progress-bar flex-1" aria-hidden="true">
                            <div className="lh-progress-fill" style={{ width: `${clipPct}%`, background: pctColor }} />
                          </div>
                          <span className="min-w-[34px] text-xs font-bold" style={{ color: pctColor }}>{clipPct}%</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted">
                          {watchedCount} of {totalClips} clips
                        </div>
                      </TableCell>
                    )}
                    {assignment.questions.length > 0 && (
                      <TableCell data-label="Reflection" className="whitespace-nowrap text-xs">
                        {au.reflectionSubmittedAt ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1"
                            onClick={() => setExpandedResponsesId(expandedResponsesId === au.id ? null : au.id)}
                          >
                            <MessageSquare size={11} />
                            {expandedResponsesId === au.id ? "Hide" : "View"}
                          </Button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TableCell>
                    )}
                    {assignment.quizQuestions.length > 0 && (
                      <TableCell data-label="Quiz" className="whitespace-nowrap text-xs">
                        {au.quizSubmittedAt ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1"
                            onClick={() => setExpandedQuizId(expandedQuizId === au.id ? null : au.id)}
                          >
                            <HelpCircle size={11} />
                            {au.quizScore !== null && au.quizTotal ? `${au.quizScore}/${au.quizTotal}` : "View"}
                            {expandedQuizId === au.id ? " ▲" : " ▼"}
                          </Button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell data-label="Assigned" className="min-w-[90px] whitespace-nowrap text-xs text-muted">
                      {fmt(au.assignedAt)}
                    </TableCell>
                    <TableCell data-label="Completed" className="min-w-[90px] whitespace-nowrap text-xs">
                      {au.completedAt ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-good">
                          <CheckCircle2 size={12} />
                          {fmt(au.completedAt)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell data-label="" className="whitespace-nowrap text-right">
                        <button
                          onClick={() => setPendingRemoveId(au.id)}
                          disabled={isRemoving}
                          className="inline-flex items-center border-none bg-none p-1 text-muted"
                          title="Remove from assignment"
                        >
                          <X size={14} />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                  {/* Expanded reflection responses */}
                  {expandedResponsesId === au.id && au.reflectionSubmittedAt && au.reflectionResponses && (
                    <TableRow className="bg-panel-2">
                      <TableCell colSpan={colCount} className="p-3.5">
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted">
                          <MessageSquare size={11} />
                          Reflection submitted {fmt(au.reflectionSubmittedAt)}
                        </div>
                        <div className="grid gap-2.5">
                          {assignment.questions.map((q, qi) => {
                            const resp = au.reflectionResponses!.find(r => r.questionId === q.id);
                            return (
                              <div key={q.id}>
                                <div className="mb-0.5 text-xs font-semibold text-text">{qi + 1}. {q.text}</div>
                                <div className={cn("whitespace-pre-wrap pl-3.5 text-[13px]", resp?.response ? "text-text" : "text-muted")}>
                                  {resp?.response || <em>No response</em>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Expanded quiz review */}
                  {expandedQuizId === au.id && au.quizSubmittedAt && (
                    <TableRow className="bg-panel-2">
                      <TableCell colSpan={colCount} className="p-3.5">
                        <div className="mb-2 flex items-center gap-2 text-[11px] text-muted">
                          <HelpCircle size={11} />
                          Quiz submitted {fmt(au.quizSubmittedAt)}
                          {au.quizAttemptCount > 1 && <span>({au.quizAttemptCount} attempts)</span>}
                          {au.quizScore !== null && au.quizTotal != null && (
                            <span className="font-bold" style={{ color: learningPctColor(Math.round((au.quizScore / au.quizTotal) * 100)) }}>
                              {au.quizScore}/{au.quizTotal} ({Math.round((au.quizScore / au.quizTotal) * 100)}%)
                            </span>
                          )}
                        </div>
                        <div className="grid gap-2.5">
                          {assignment.quizQuestions.sort((a, b) => a.displayOrder - b.displayOrder).map((q, qi) => {
                            const ans = au.quizAnswers?.find(a => a.questionId === q.id);
                            const sel = ans?.selectedAnswerIndex ?? null;
                            const correct = sel === q.correctAnswerIndex;
                            return (
                              <div key={q.id}>
                                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-text">
                                  {qi + 1}. {q.prompt}
                                  {sel !== null ? (
                                    <span className={correct ? "text-[11px] text-good" : "text-[11px] text-red-300"}>{correct ? "✓" : "✗"}</span>
                                  ) : (
                                    <span className="text-[11px] text-muted">no answer</span>
                                  )}
                                </div>
                                <div className="grid gap-1 pl-3.5">
                                  {q.answers.map((a, aIdx) => {
                                    const isSelected = sel === aIdx;
                                    const isCorrectAnswer = aIdx === q.correctAnswerIndex;
                                    return (
                                      <div
                                        key={aIdx}
                                        className={cn(
                                          "rounded-md border px-2 py-0.5 text-xs",
                                          isCorrectAnswer
                                            ? "border-good/30 bg-good/10 text-text"
                                            : isSelected && !correct
                                            ? "border-danger/30 bg-danger/10 text-text"
                                            : "border-transparent text-muted"
                                        )}
                                      >
                                        {isSelected ? "→ " : "   "}{a}
                                        {isCorrectAnswer && <span className="ml-1 text-good">✓</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card>
        {/* Pending status change confirm */}
        {pendingStatus && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warn/30 bg-warn/10 p-3">
            <span className="min-w-0 flex-1 text-[13px] text-text">
              Set <strong>{pendingStatus.memberName}</strong>&apos;s status to <strong>{pendingStatus.status}</strong>? This overrides their recorded progress.
            </span>
            <div className="flex shrink-0 gap-2">
              <Button variant="primary" size="sm" disabled={!!updatingStatus} onClick={confirmStatusChange}>
                {updatingStatus ? "Saving…" : "Confirm"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPendingStatus(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Add users */}
        {canEdit && (
          <AddUsersPanel
            assignment={assignment}
            members={members}
            onAdd={userIds => onAddUsers(assignment.id, userIds)}
          />
        )}
      </Card>

      {/* Edit modal */}
      {editOpen && (
        <EditModal
          assignment={assignment}
          reviews={reviews}
          tags={tags}
          onSave={data => onUpdate(assignment.id, data)}
          onClose={() => setEditOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Assignment"
          message="This will permanently delete the assignment and remove all member progress. This cannot be undone."
          confirmLabel="Yes, Delete"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {pendingRemoveId && (() => {
        const m = memberOf(assignment.assignmentUsers.find(au => au.id === pendingRemoveId)?.userId ?? "");
        return (
          <ConfirmModal
            title="Remove Member"
            message={`Remove ${m?.name || "this member"} from the assignment? Their progress will be lost.`}
            confirmLabel="Yes, Remove"
            busyLabel="Removing…"
            busy={removing === pendingRemoveId}
            onConfirm={() => handleRemove(pendingRemoveId)}
            onCancel={() => setPendingRemoveId(null)}
          />
        );
      })()}
    </PageFrame>
  );
}
