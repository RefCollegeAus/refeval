"use client";

import { useState, useCallback, useMemo } from "react";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import {
  Plus, CheckCircle, Archive, RotateCcw, Pencil, Trash2,
  ChevronLeft, Users, User, UserCheck, FileText, Lock, Eye,
  Clock,
} from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { MemberRecord } from "@/lib/types/members";
import type {
  DevGoalDef, RefereeGoal, RefereeGoalView,
  GoalStatus, AssignGoalInput, GoalAssignmentType,
} from "@/lib/types/developmentGoals";
import { GOAL_CATEGORIES, GOAL_PRIORITIES } from "@/lib/types/developmentGoals";
import type { DevelopmentNote, CreateNoteInput, NoteType, NoteVisibility } from "@/lib/types/developmentNotes";
import { NOTE_TYPES, NOTE_VISIBILITIES } from "@/lib/types/developmentNotes";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { ReviewGoalLink } from "@/lib/types/reviewGoalLinks";
import {
  buildTimeline, filterTimeline,
  type TimelineFilter, type TimelineEvent, type TimelineEventKind,
} from "@/lib/utils/developmentTimeline";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, type BadgeTone, Button, Card, EmptyState, Input, Select, Tabs, Textarea, type TabItem } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

// ── Tone tokens ───────────────────────────────────────────────────────────────

const PRIORITY_TONE: Record<string, BadgeTone> = { Low: "neutral", Medium: "warn", High: "danger" };
const PRIORITY_BORDER: Record<string, string> = { Low: "border-l-border", Medium: "border-l-warn", High: "border-l-danger" };
const STATUS_TONE: Record<GoalStatus, BadgeTone> = { Active: "accent", Completed: "good", Archived: "neutral" };
const STATUS_TEXT: Record<GoalStatus, string> = { Active: "text-accent", Completed: "text-good", Archived: "text-muted" };

// ── Shared display helpers ────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  return <Badge tone={PRIORITY_TONE[priority] ?? "neutral"}>{priority}</Badge>;
}

function StatusBadge({ status }: { status: GoalStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}

function CategoryChip({ category }: { category: string }) {
  return <Badge tone="accent">{category}</Badge>;
}

function NoteTypeBadge({ type }: { type: NoteType }) {
  return <Badge tone="neutral">{type}</Badge>;
}

function VisibilityBadge({ visibility }: { visibility: NoteVisibility }) {
  const isPrivate = visibility === "Educator Only";
  return (
    <Badge tone={isPrivate ? "warn" : "good"} className="gap-1">
      {isPrivate ? <Lock size={9} /> : <Eye size={9} />}
      {visibility}
    </Badge>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ── Timeline components ───────────────────────────────────────────────────────

const KIND_LABEL: Record<TimelineEventKind, string> = {
  goal_assigned:        "Goal Assigned",
  goal_completed:       "Goal Completed",
  goal_archived:        "Goal Archived",
  goal_reopened:        "Goal Reopened",
  note_added:           "Note Added",
  review_completed:     "Review Completed",
  review_linked_to_goal:"Review Linked",
};

const KIND_ICON: Record<TimelineEventKind, string> = {
  goal_assigned:        "🎯",
  goal_completed:       "✅",
  goal_archived:        "📦",
  goal_reopened:        "🔄",
  note_added:           "📝",
  review_completed:     "🎬",
  review_linked_to_goal:"🔗",
};

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex shrink-0 flex-col items-center pt-0.5">
        <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-border bg-panel-2 text-[13px]">
          {KIND_ICON[event.kind]}
        </div>
      </div>
      <Card className="grid flex-1 gap-1.5 p-3.5">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight text-text">{event.title}</p>
          </div>
          {event.badge && (
            <Badge tone="neutral" className="shrink-0">{event.badge}</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{KIND_LABEL[event.kind]}</span>
          <span className="text-xs text-muted">·</span>
          <span className="text-xs text-muted">{fmtDate(event.date)}</span>
        </div>
        {event.description && <p className="text-[13px] leading-relaxed text-muted">{event.description}</p>}
      </Card>
    </div>
  );
}

const TIMELINE_FILTERS: { key: TimelineFilter; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "goals",   label: "Goals" },
  { key: "notes",   label: "Notes" },
  { key: "reviews", label: "Reviews" },
];

function TimelineTab({ events, hasReviews }: { events: TimelineEvent[]; hasReviews: boolean }) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const visible = filterTimeline(events, filter);

  return (
    <div className="grid gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex flex-wrap gap-1">
          {TIMELINE_FILTERS.map(f => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-lg border px-3.5 py-1 text-[13px] transition-colors",
                  isActive ? "border-accent/40 bg-accent/10 font-bold text-accent" : "border-border bg-transparent text-muted hover:text-text"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-muted">{visible.length} event{visible.length !== 1 ? "s" : ""}</span>
      </div>

      {filter === "reviews" && !hasReviews && (
        <EmptyState title="No completed reviews" description="Completed video reviews featuring this referee will appear here automatically." />
      )}

      {events.length === 0 && (
        <EmptyState
          icon={<span className="text-4xl">📋</span>}
          title="No activity yet"
          description="As you assign goals, add coaching notes, and complete video reviews for this referee, their full development history will appear here in one chronological view."
        />
      )}

      {events.length > 0 && visible.length === 0 && (
        <EmptyState title={`No ${filter} events`} description='Switch to "All" to see everything.' />
      )}

      {visible.length > 0 && (
        <div className="relative grid gap-3">
          <div className="absolute bottom-3.5 left-3.5 top-7 w-0.5 rounded bg-border" />
          {visible.map(ev => <TimelineEventCard key={ev.id} event={ev} />)}
        </div>
      )}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewSectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2.5">
      <h2 className="text-[15px] font-extrabold tracking-tight text-text">{title}</h2>
      {action && (
        <button onClick={action.onClick} className="shrink-0 border-none bg-none p-0 text-xs font-semibold text-accent">
          {action.label} →
        </button>
      )}
    </div>
  );
}

function OverviewTab({
  goalViews,
  notes,
  timelineEvents,
  completedReviews,
  canEdit,
  onAssignGoal,
  onAddNote,
  onViewGoals,
  onViewNotes,
  onViewTimeline,
}: {
  goalViews: RefereeGoalView[];
  notes: DevelopmentNote[];
  timelineEvents: TimelineEvent[];
  completedReviews: ReviewRecord[];
  canEdit: boolean;
  onAssignGoal: () => void;
  onAddNote: () => void;
  onViewGoals: () => void;
  onViewNotes: () => void;
  onViewTimeline: () => void;
}) {
  const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
  // Current Focus: active goals sorted High → Medium → Low, then newest first
  const focusGoals = useMemo(
    () =>
      goalViews
        .filter(v => v.status === "Active")
        .sort((a, b) => {
          const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          return pr !== 0 ? pr : b.createdAt.localeCompare(a.createdAt);
        })
        .slice(0, 3),
    [goalViews],
  );

  const activeCount    = goalViews.filter(v => v.status === "Active").length;
  const completedCount = goalViews.filter(v => v.status === "Completed").length;
  const recentEvents   = timelineEvents.slice(0, 5);

  const latestReview = completedReviews.length > 0
    ? completedReviews.reduce((best, r) => {
        const d = r.submittedAt ?? r.createdAt;
        return d > (best.submittedAt ?? best.createdAt) ? r : best;
      })
    : null;

  return (
    <div className="grid gap-7">

      {/* ── Current Focus ─────────────────────────────────────── */}
      <section>
        <OverviewSectionHeader
          title="Current Focus"
          action={activeCount > 3 ? { label: `View all ${activeCount} goals`, onClick: onViewGoals } : undefined}
        />
        {focusGoals.length === 0 ? (
          <EmptyState
            icon={<span className="text-3xl">🎯</span>}
            title="No active development goals"
            description={canEdit
              ? "Assign a goal to give this referee a clear focus area for their next games."
              : "No active goals have been set for this referee yet."}
            action={canEdit ? (
              <Button variant="primary" size="sm" className="gap-1.5" onClick={onAssignGoal}>
                <Plus size={13} /> Assign Goal
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="grid gap-2">
            {focusGoals.map((v, i) => (
              <Card key={v.id} className={cn("flex gap-3.5 border-l-4", PRIORITY_BORDER[v.priority] ?? "border-l-border")}>
                <div
                  className={cn(
                    "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-current/15 text-[11px] font-extrabold",
                    PRIORITY_TONE[v.priority] === "danger" ? "text-red-300" : PRIORITY_TONE[v.priority] === "warn" ? "text-yellow-300" : "text-muted"
                  )}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-sm font-bold leading-tight text-text">{v.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryChip category={v.category} />
                    <PriorityBadge priority={v.priority} />
                    {v.targetReviewDate && <span className="text-[11px] text-muted">Target {fmtDate(v.targetReviewDate)}</span>}
                  </div>
                  {v.description && (
                    <p className="mt-1.5 text-xs text-muted">
                      {v.description.length > 140 ? v.description.slice(0, 137) + "…" : v.description}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent Activity ────────────────────────────────────── */}
      <section>
        <OverviewSectionHeader
          title="Recent Activity"
          action={timelineEvents.length > 5 ? { label: "View full timeline", onClick: onViewTimeline } : undefined}
        />
        {recentEvents.length === 0 ? (
          <EmptyState
            icon={<span className="text-3xl">📋</span>}
            title="No activity yet"
            description="Goals assigned, notes added and completed reviews will build up a history here."
          />
        ) : (
          <div className="relative grid gap-2.5">
            <div className="absolute bottom-3.5 left-3.5 top-7 w-0.5 rounded bg-border" />
            {recentEvents.map(ev => <TimelineEventCard key={ev.id} event={ev} />)}
            {timelineEvents.length > 5 && (
              <button onClick={onViewTimeline} className="ml-[42px] border-none bg-none p-0 py-1 text-left text-[13px] font-semibold text-accent">
                View all {timelineEvents.length} events →
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Development Summary ────────────────────────────────── */}
      <section>
        <OverviewSectionHeader title="Development Summary" />
        <Card className="overflow-hidden p-0">
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {[
              { label: "Active Goals",      value: activeCount,               colour: STATUS_TEXT.Active,    onClick: onViewGoals },
              { label: "Completed Goals",   value: completedCount,            colour: STATUS_TEXT.Completed, onClick: onViewGoals },
              { label: "Coaching Notes",    value: notes.length,              colour: "text-[#bf5af2]",      onClick: onViewNotes },
              { label: "Reviews Completed", value: completedReviews.length,   colour: "text-good",           onClick: onViewTimeline },
            ].map(({ label, value, colour, onClick }) => (
              <button key={label} onClick={onClick} className="border-b border-r border-border p-4 text-left hover:bg-panel-2">
                <p className={cn("mb-1 text-2xl font-extrabold leading-none", colour)}>{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </button>
            ))}
          </div>
          {latestReview && (
            <div className="border-t border-border px-4 py-2.5">
              <span className="text-xs text-muted">
                Latest review: <strong className="font-semibold text-text">{latestReview.game || "Untitled"}</strong>
                {" · "}{fmtDate(latestReview.submittedAt ?? latestReview.createdAt)}
              </span>
            </div>
          )}
        </Card>
      </section>

      {/* ── Quick Actions ──────────────────────────────────────── */}
      {canEdit && (
        <section>
          <OverviewSectionHeader title="Quick Actions" />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" className="gap-1.5" onClick={onAssignGoal}>
              <Plus size={13} /> Assign Development Goal
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={onAddNote}>
              <FileText size={13} /> Add Coaching Note
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={onViewTimeline}>
              <Clock size={13} /> View Full Timeline
            </Button>
          </div>
        </section>
      )}

    </div>
  );
}

// ── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  view,
  canEdit,
  supportingReviews,
  onEdit,
  onComplete,
  onArchive,
  onReopen,
  onDelete,
}: {
  view: RefereeGoalView;
  canEdit: boolean;
  supportingReviews: ReviewRecord[];
  onEdit: (view: RefereeGoalView) => void;
  onComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <>
    <Card className="grid gap-2.5">
      <div className="flex flex-wrap items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold leading-tight text-text">{view.title}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <StatusBadge status={view.status} />
          <PriorityBadge priority={view.priority} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip category={view.category} />
        <span className="text-xs text-muted">Created {fmtDate(view.createdAt)}</span>
        {view.targetReviewDate && <span className="text-xs text-muted">· Target review {fmtDate(view.targetReviewDate)}</span>}
        {view.completedAt && <span className="text-xs text-good">· Completed {fmtDate(view.completedAt)}</span>}
      </div>

      {view.description && <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{view.description}</p>}

      {view.notes && (
        <div className="rounded-lg border border-accent/20 bg-accent/[.07] px-3 py-2">
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-muted">Notes</p>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text">{view.notes}</p>
        </div>
      )}

      {supportingReviews.length > 0 && (
        <div className="rounded-lg border border-[#bf5af2]/20 bg-[#bf5af2]/[.06] px-3 py-2">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Supporting Reviews ({supportingReviews.length})</p>
          <div className="grid gap-1">
            {supportingReviews.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span>🎬</span>
                <span className="font-semibold text-text">{r.game || "Untitled"}</span>
                <span className="text-muted">{fmtDate(r.submittedAt ?? r.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {canEdit && (
        <div className="mt-0.5 flex flex-wrap gap-1.5 border-t border-border pt-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => onEdit(view)}>
            <Pencil size={12} /> Edit
          </Button>
          {view.status === "Active" && (
            <>
              <Button variant="good" size="sm" className="gap-1.5" onClick={() => onComplete(view.id)}>
                <CheckCircle size={12} /> Complete
              </Button>
              <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => onArchive(view.id)}>
                <Archive size={12} /> Archive
              </Button>
            </>
          )}
          {(view.status === "Completed" || view.status === "Archived") && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => onReopen(view.id)}>
              <RotateCcw size={12} /> Reopen
            </Button>
          )}
          {view.status === "Active" && (
            <Button variant="danger" size="sm" className="ml-auto gap-1.5" onClick={() => setConfirmingDelete(true)}>
              <Trash2 size={12} /> Delete
            </Button>
          )}
        </div>
      )}
    </Card>
    {confirmingDelete && (
      <ConfirmModal
        title={`Delete goal "${view.title}"?`}
        message="This removes only this referee's copy."
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={false}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => { onDelete(view.id); setConfirmingDelete(false); }}
      />
    )}
    </>
  );
}

// ── Note Card ─────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  linkedGoalTitle,
  canEdit,
  onEdit,
  onDelete,
}: {
  note: DevelopmentNote;
  linkedGoalTitle: string | null;
  canEdit: boolean;
  onEdit: (note: DevelopmentNote) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <>
    <Card className="grid gap-2.5">
      <div className="flex flex-wrap items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold leading-tight text-text">{note.title}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <VisibilityBadge visibility={note.visibility} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <NoteTypeBadge type={note.noteType} />
        <span className="text-xs text-muted">{fmtDate(note.createdAt)}</span>
        {note.updatedAt !== note.createdAt && <span className="text-xs text-muted">· edited {fmtDate(note.updatedAt)}</span>}
      </div>

      {linkedGoalTitle && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Linked goal</span>
          <span className="font-semibold text-accent">{linkedGoalTitle}</span>
        </div>
      )}

      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text">{note.body}</p>

      {canEdit && (
        <div className="mt-0.5 flex gap-1.5 border-t border-border pt-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => onEdit(note)}>
            <Pencil size={12} /> Edit
          </Button>
          <Button variant="danger" size="sm" className="ml-auto gap-1.5" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={12} /> Delete
          </Button>
        </div>
      )}
    </Card>
    {confirmingDelete && (
      <ConfirmModal
        title={`Delete note "${note.title}"?`}
        message="This cannot be undone."
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={false}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => { onDelete(note.id); setConfirmingDelete(false); }}
      />
    )}
    </>
  );
}

// ── Goal filter tabs ──────────────────────────────────────────────────────────

function GoalFilterTabs({ active, counts, onChange }: { active: GoalStatus; counts: Record<GoalStatus, number>; onChange: (s: GoalStatus) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(["Active", "Completed", "Archived"] as GoalStatus[]).map(s => {
        const isActive = active === s;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "rounded-lg border px-3.5 py-1 text-[13px] transition-colors",
              isActive ? cn("border-current", STATUS_TEXT[s], "bg-current/10 font-bold") : "border-border text-muted"
            )}
          >
            {s} {counts[s] > 0 ? <span className="opacity-70">({counts[s]})</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// ── Goal form modal ───────────────────────────────────────────────────────────

type GoalFormMode =
  | { type: "create"; defaultRefereeId: string }
  | { type: "edit"; view: RefereeGoalView };

const ASSIGN_TYPE_OPTIONS: { value: GoalAssignmentType; label: string; icon: React.ReactNode }[] = [
  { value: "Individual",       label: "Individual",        icon: <User size={14} /> },
  { value: "SelectedReferees", label: "Selected Referees", icon: <UserCheck size={14} /> },
  { value: "Everyone",         label: "Everyone",          icon: <Users size={14} /> },
];

function GoalFormModal({
  mode,
  refereeMembers,
  totalRefereeCount,
  onSave,
  onClose,
}: {
  mode: GoalFormMode;
  refereeMembers: MemberRecord[];
  totalRefereeCount: number;
  onSave: (
    defPatch: Pick<DevGoalDef, "title" | "description" | "category" | "priority">,
    rgPatch: Pick<RefereeGoal, "targetReviewDate" | "notes">,
    assignInput?: AssignGoalInput,
  ) => void;
  onClose: () => void;
}) {
  const existing = mode.type === "edit" ? mode.view : null;
  const [title, setTitle]             = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory]       = useState<string>(existing?.category ?? GOAL_CATEGORIES[0]);
  const [priority, setPriority]       = useState<string>(existing?.priority ?? "Medium");
  const [targetDate, setTargetDate]   = useState(existing?.targetReviewDate ?? "");
  const [notes, setNotes]             = useState(existing?.notes ?? "");
  const [assignType, setAssignType]   = useState<GoalAssignmentType>("Individual");
  const [selectedOne, setSelectedOne] = useState(mode.type === "create" ? mode.defaultRefereeId : "");
  const [selectedMany, setSelectedMany] = useState<Set<string>>(
    mode.type === "create" ? new Set([mode.defaultRefereeId]) : new Set(),
  );
  const [error, setError] = useState("");
  const isCreate = mode.type === "create";

  function toggleMany(id: string) {
    setSelectedMany(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (isCreate) {
      if (assignType === "Individual" && !selectedOne) { setError("Please select a referee."); return; }
      if (assignType === "SelectedReferees" && selectedMany.size === 0) { setError("Please select at least one referee."); return; }
    }
    setError("");
    const defPatch = { title: title.trim(), description: description.trim(), category: category as DevGoalDef["category"], priority: priority as DevGoalDef["priority"] };
    const rgPatch  = { targetReviewDate: targetDate || null, notes: notes.trim() };
    if (isCreate) {
      const assignedRefereeIds = assignType === "Individual" ? [selectedOne] : assignType === "SelectedReferees" ? Array.from(selectedMany) : [];
      onSave(defPatch, rgPatch, { ...defPatch, assignmentType: assignType, assignedRefereeIds, targetReviewDate: targetDate || null });
    } else {
      onSave(defPatch, rgPatch);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">Development Goal</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>{isCreate ? "Assign Goal" : "Edit Goal"}</h1>
          </div>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="mt-4 grid gap-3.5">
          {isCreate && (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-text">Assign to</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {ASSIGN_TYPE_OPTIONS.map(opt => {
                  const isActive = assignType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setAssignType(opt.value); setError(""); }}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-[13px] transition-colors",
                        isActive ? "border-accent/40 bg-accent/10 font-bold text-accent" : "border-border text-muted"
                      )}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  );
                })}
              </div>
              {assignType === "Individual" && (
                <Select value={selectedOne} onChange={e => setSelectedOne(e.target.value)}>
                  <option value="">Select referee…</option>
                  {refereeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              )}
              {assignType === "SelectedReferees" && (
                <div className="max-h-[180px] overflow-y-auto rounded-lg border border-border py-1">
                  {refereeMembers.length === 0 && <p className="px-3.5 py-2 text-[13px] text-muted">No referees in this organisation.</p>}
                  {refereeMembers.map(m => (
                    <label key={m.id} className={cn("flex cursor-pointer items-center gap-2.5 px-3.5 py-2", selectedMany.has(m.id) && "bg-accent/[.06]")}>
                      <input type="checkbox" checked={selectedMany.has(m.id)} onChange={() => toggleMany(m.id)} className="w-auto shrink-0" />
                      <span className="text-[13px]">{m.name}</span>
                      <span className="ml-auto text-xs text-muted">{m.email}</span>
                    </label>
                  ))}
                </div>
              )}
              {assignType === "Everyone" && (
                <p className="text-[13px] text-muted">
                  This goal will be assigned to all {totalRefereeCount} referee{totalRefereeCount !== 1 ? "s" : ""} in your organisation.
                </p>
              )}
            </div>
          )}
          {!isCreate && (
            <p className="rounded-lg border border-accent/20 bg-accent/[.07] px-3 py-1.5 text-xs text-muted">
              Changes to title, description, category and priority apply to all referees assigned this goal.
            </p>
          )}
          <label>Title <span className="text-red-300">*</span>
            <Input value={title} onChange={e => { setTitle(e.target.value); setError(""); }} placeholder="e.g. Improve lead-foot positioning in the paint" autoFocus={!isCreate} className="mt-1" />
          </label>
          <label>Description
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Additional context, coaching notes, or specific behaviours to target…" className="mt-1" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>Category<Select value={category} onChange={e => setCategory(e.target.value)} className="mt-1">{GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</Select></label>
            <label>Priority<Select value={priority} onChange={e => setPriority(e.target.value)} className="mt-1">{GOAL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</Select></label>
          </div>
          <label>Target review date <span className="text-xs text-muted">(optional)</span>
            <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="mt-1" />
          </label>
          {!isCreate && (
            <label>Coaching notes <span className="text-xs text-muted">(visible to educators only)</span>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Private notes about this referee's progress…" className="mt-1" />
            </label>
          )}
          {error && <p className="text-[13px] text-red-300">{error}</p>}
        </div>
        <div className="action-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit}>{isCreate ? "Assign Goal" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Note form modal ───────────────────────────────────────────────────────────

type NoteFormMode =
  | { type: "create"; refereeId: string }
  | { type: "edit"; note: DevelopmentNote };

function NoteFormModal({
  mode,
  refereeGoalViews,
  onSave,
  onClose,
}: {
  mode: NoteFormMode;
  refereeGoalViews: RefereeGoalView[];
  onSave: (data: CreateNoteInput | Partial<DevelopmentNote>, id?: string) => void;
  onClose: () => void;
}) {
  const existing = mode.type === "edit" ? mode.note : null;
  const [title, setTitle]           = useState(existing?.title ?? "");
  const [body, setBody]             = useState(existing?.body ?? "");
  const [noteType, setNoteType]     = useState<NoteType>(existing?.noteType ?? "General");
  const [visibility, setVisibility] = useState<NoteVisibility>(existing?.visibility ?? "Educator Only");
  const [linkedGoalId, setLinkedGoalId] = useState<string>(existing?.linkedGoalId ?? "");
  const [error, setError]           = useState("");

  const isCreate = mode.type === "create";
  const refereeId = isCreate ? mode.refereeId : existing!.refereeId;
  const linkableGoals = refereeGoalViews.filter(v => v.refereeId === refereeId && v.status === "Active");

  function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!body.trim())  { setError("Body is required.");  return; }
    setError("");
    if (isCreate) {
      onSave({ refereeId, title: title.trim(), body: body.trim(), noteType, visibility, linkedGoalId: linkedGoalId || null } satisfies CreateNoteInput);
    } else {
      onSave({ title: title.trim(), body: body.trim(), noteType, visibility, linkedGoalId: linkedGoalId || null }, existing!.id);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">Development Note</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>{isCreate ? "Add Note" : "Edit Note"}</h1>
          </div>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="mt-4 grid gap-3.5">
          <label>
            Title <span className="text-red-300">*</span>
            <Input value={title} onChange={e => { setTitle(e.target.value); setError(""); }} placeholder="e.g. Post-game debrief — Round 7" autoFocus className="mt-1" />
          </label>
          <label>
            Note <span className="text-red-300">*</span>
            <Textarea value={body} onChange={e => { setBody(e.target.value); setError(""); }} rows={5} placeholder="Record observations, coaching points, or conversation highlights…" className="mt-1" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>Note type<Select value={noteType} onChange={e => setNoteType(e.target.value as NoteType)} className="mt-1">{NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</Select></label>
            <label>Visibility<Select value={visibility} onChange={e => setVisibility(e.target.value as NoteVisibility)} className="mt-1">{NOTE_VISIBILITIES.map(v => <option key={v} value={v}>{v}</option>)}</Select></label>
          </div>
          <label>
            Linked goal <span className="text-xs text-muted">(optional)</span>
            <Select value={linkedGoalId} onChange={e => setLinkedGoalId(e.target.value)} className="mt-1">
              <option value="">No linked goal</option>
              {linkableGoals.map(v => <option key={v.goalId} value={v.goalId}>{v.title}</option>)}
            </Select>
          </label>
          {error && <p className="text-[13px] text-red-300">{error}</p>}
        </div>
        <div className="action-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit}>{isCreate ? "Add Note" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Props and main screen ─────────────────────────────────────────────────────

export interface RefereeDevelopmentScreenProps {
  session: RefEvalSession;
  referee: MemberRecord;
  refereeMembers: MemberRecord[];
  goalViews: RefereeGoalView[];
  notes: DevelopmentNote[];
  completedReviews: ReviewRecord[];
  reviewGoalLinks: ReviewGoalLink[];
  allReviews: ReviewRecord[];
  onAssignGoal: (input: AssignGoalInput) => void;
  onUpdateGoalDef: (goalId: string, patch: Partial<Pick<DevGoalDef, "title" | "description" | "category" | "priority">>) => void;
  onUpdateRefereeGoal: (id: string, patch: Partial<Pick<RefereeGoal, "targetReviewDate" | "notes">>) => void;
  onCompleteGoal: (id: string) => void;
  onArchiveGoal: (id: string) => void;
  onReopenGoal: (id: string) => void;
  onDeleteGoal: (id: string) => void;
  onCreateNote: (input: CreateNoteInput) => void;
  onUpdateNote: (id: string, patch: Partial<DevelopmentNote>) => void;
  onDeleteNote: (id: string) => void;
  onBack: () => void;
}

type DevPage = "overview" | "goals" | "notes" | "timeline";

export function RefereeDevelopmentScreen({
  session, referee, refereeMembers, goalViews, notes, completedReviews,
  reviewGoalLinks, allReviews,
  onAssignGoal, onUpdateGoalDef, onUpdateRefereeGoal,
  onCompleteGoal, onArchiveGoal, onReopenGoal, onDeleteGoal,
  onCreateNote, onUpdateNote, onDeleteNote,
  onBack,
}: RefereeDevelopmentScreenProps) {
  const [devPage, setDevPage]           = useState<DevPage>("overview");
  const [goalFilter, setGoalFilter]     = useState<GoalStatus>("Active");
  const [goalFormMode, setGoalFormMode] = useState<GoalFormMode | null>(null);
  const [noteFormMode, setNoteFormMode] = useState<NoteFormMode | null>(null);

  const canEdit =
    session.activeRole === "educator" ||
    session.activeRole === "admin" ||
    session.activeRole === "super_admin";

  // ── Derived data ──────────────────────────────────────────────────────────
  const goalCounts: Record<GoalStatus, number> = useMemo(() => ({
    Active:    goalViews.filter(v => v.status === "Active").length,
    Completed: goalViews.filter(v => v.status === "Completed").length,
    Archived:  goalViews.filter(v => v.status === "Archived").length,
  }), [goalViews]);

  const visibleGoals = useMemo(
    () => goalViews.filter(v => v.status === goalFilter),
    [goalViews, goalFilter],
  );

  const timelineEvents = useMemo(
    () => buildTimeline(goalViews, notes, completedReviews, reviewGoalLinks),
    [goalViews, notes, completedReviews, reviewGoalLinks],
  );

  // Supporting reviews per goal — find all reviews linked to each goalDef for this referee
  const allReviewsById = useMemo(() => new Map(allReviews.map(r => [r.id, r])), [allReviews]);
  const supportingReviewsForGoal = useCallback(
    (goalId: string) => {
      const linkedReviewIds = reviewGoalLinks
        .filter(l => l.goalDefId === goalId && l.refereeId === referee.id)
        .map(l => l.reviewId);
      return linkedReviewIds.flatMap(id => { const r = allReviewsById.get(id); return r ? [r] : []; });
    },
    [reviewGoalLinks, allReviewsById, referee.id],
  );

  const goalTitleById = useMemo(
    () => new Map(goalViews.map(v => [v.goalId, v.title])),
    [goalViews],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleGoalSave = useCallback(
    (
      defPatch: Pick<DevGoalDef, "title" | "description" | "category" | "priority">,
      rgPatch:  Pick<RefereeGoal, "targetReviewDate" | "notes">,
      assignInput?: AssignGoalInput,
    ) => {
      if (assignInput) {
        onAssignGoal(assignInput);
      } else if (goalFormMode?.type === "edit") {
        onUpdateGoalDef(goalFormMode.view.goalId, defPatch);
        onUpdateRefereeGoal(goalFormMode.view.id, rgPatch);
      }
      setGoalFormMode(null);
    },
    [goalFormMode, onAssignGoal, onUpdateGoalDef, onUpdateRefereeGoal],
  );

  const handleNoteSave = useCallback(
    (data: CreateNoteInput | Partial<DevelopmentNote>, id?: string) => {
      if (id) {
        onUpdateNote(id, data as Partial<DevelopmentNote>);
      } else {
        onCreateNote(data as CreateNoteInput);
      }
      setNoteFormMode(null);
    },
    [onCreateNote, onUpdateNote],
  );

  // Shortcuts used by OverviewTab callbacks
  const openGoalForm  = useCallback(() => setGoalFormMode({ type: "create", defaultRefereeId: referee.id }), [referee.id]);
  const openNoteForm  = useCallback(() => setNoteFormMode({ type: "create", refereeId: referee.id }), [referee.id]);
  const navGoals      = useCallback(() => setDevPage("goals"), []);
  const navNotes      = useCallback(() => setDevPage("notes"), []);
  const navTimeline   = useCallback(() => setDevPage("timeline"), []);

  const initials = referee.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const totalGoalCount = goalCounts.Active + goalCounts.Completed + goalCounts.Archived;

  const goalsTabContent = (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <GoalFilterTabs active={goalFilter} counts={goalCounts} onChange={setGoalFilter} />
        <span className="text-xs text-muted">{visibleGoals.length} goal{visibleGoals.length !== 1 ? "s" : ""}</span>
      </div>
      {visibleGoals.length === 0 ? (
        <EmptyState
          icon={<span className="text-3xl">{goalFilter === "Active" ? "🎯" : goalFilter === "Completed" ? "✅" : "📦"}</span>}
          title={goalFilter === "Active" ? "No active development goals" : goalFilter === "Completed" ? "No completed goals yet" : "No archived goals"}
          description={
            goalFilter === "Active"
              ? (canEdit ? "Create this referee's first development goal to start building their long-term coaching record." : "No active development goals have been set yet.")
              : goalFilter === "Completed" ? "Completed goals will appear here once a referee achieves them."
              : "Goals that are no longer active but not yet completed are archived here."
          }
          action={goalFilter === "Active" && canEdit ? (
            <Button variant="primary" size="sm" className="gap-1.5" onClick={openGoalForm}>
              <Plus size={14} /> Assign Goal
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-2.5">
          {visibleGoals.map(view => (
            <GoalCard
              key={view.id}
              view={view}
              canEdit={canEdit}
              supportingReviews={supportingReviewsForGoal(view.goalId)}
              onEdit={v => setGoalFormMode({ type: "edit", view: v })}
              onComplete={onCompleteGoal}
              onArchive={onArchiveGoal}
              onReopen={onReopenGoal}
              onDelete={onDeleteGoal}
            />
          ))}
        </div>
      )}
    </div>
  );

  const notesTabContent = (
    <div className="grid gap-2.5">
      {notes.length === 0 ? (
        <EmptyState
          icon={<span className="text-3xl">📝</span>}
          title="No development notes yet"
          description={canEdit
            ? "Record coaching conversations, sideline observations and check-in notes here. Notes stay private unless you share them with the referee."
            : "No development notes have been recorded for this referee yet."}
          action={canEdit ? (
            <Button variant="primary" size="sm" className="gap-1.5" onClick={openNoteForm}>
              <Plus size={14} /> Add Note
            </Button>
          ) : undefined}
        />
      ) : (
        <>
          <div className="flex justify-end">
            <span className="text-xs text-muted">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
          </div>
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              linkedGoalTitle={note.linkedGoalId ? (goalTitleById.get(note.linkedGoalId) ?? null) : null}
              canEdit={canEdit}
              onEdit={n => setNoteFormMode({ type: "edit", note: n })}
              onDelete={onDeleteNote}
            />
          ))}
        </>
      )}
    </div>
  );

  const tabItems: TabItem[] = [
    { id: "overview", label: "Overview", content: (
      <OverviewTab
        goalViews={goalViews}
        notes={notes}
        timelineEvents={timelineEvents}
        completedReviews={completedReviews}
        canEdit={canEdit}
        onAssignGoal={openGoalForm}
        onAddNote={openNoteForm}
        onViewGoals={navGoals}
        onViewNotes={navNotes}
        onViewTimeline={navTimeline}
      />
    ) },
    { id: "goals", label: `Goals${totalGoalCount > 0 ? ` (${totalGoalCount})` : ""}`, content: goalsTabContent },
    { id: "notes", label: `Notes${notes.length > 0 ? ` (${notes.length})` : ""}`, content: notesTabContent },
    { id: "timeline", label: `Timeline${timelineEvents.length > 0 ? ` (${timelineEvents.length})` : ""}`, content: (
      <TimelineTab events={timelineEvents} hasReviews={completedReviews.length > 0} />
    ) },
  ];

  return (
    <div className="mx-auto max-w-[900px] px-4 py-7 sm:px-6">

      {/* Back nav */}
      <button onClick={onBack} className="mb-5 flex items-center gap-1.5 border-none bg-none p-0 text-[13px] text-muted">
        <ChevronLeft size={16} /> Back
      </button>

      {/* Page header */}
      <PageFrame
        className="p-0"
        eyebrow="Referee Development"
        title={referee.name}
        description={referee.email}
        actions={
          canEdit && (devPage === "overview" || devPage === "goals") ? (
            <Button variant="primary" className="gap-1.5" onClick={openGoalForm}>
              <Plus size={14} /> Assign Goal
            </Button>
          ) : canEdit && devPage === "notes" ? (
            <Button variant="primary" className="gap-1.5" onClick={openNoteForm}>
              <FileText size={14} /> Add Note
            </Button>
          ) : undefined
        }
      >
        {/* Persistent stats strip */}
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))" }}>
          {[
            { label: "Active Goals",      value: goalCounts.Active,        colour: STATUS_TEXT.Active,    onClick: () => { navGoals(); setGoalFilter("Active"); } },
            { label: "Completed Goals",   value: goalCounts.Completed,     colour: STATUS_TEXT.Completed, onClick: () => { navGoals(); setGoalFilter("Completed"); } },
            { label: "Coaching Notes",    value: notes.length,             colour: "text-[#bf5af2]",      onClick: navNotes },
            { label: "Reviews",           value: completedReviews.length,  colour: "text-good",           onClick: navTimeline },
            { label: "Timeline Events",   value: timelineEvents.length,    colour: "text-accent",         onClick: navTimeline },
          ].map(({ label, value, colour, onClick }) => (
            <button key={label} onClick={onClick} className="rounded-2xl border border-border bg-panel p-3.5 text-left">
              <div className={cn("text-2xl font-extrabold leading-none", colour)}>{value}</div>
              <div className="mt-1 text-xs text-muted">{label}</div>
            </button>
          ))}
        </div>
      </PageFrame>

      {/* Referee identity chip */}
      <div className="mb-2 mt-6 flex items-center gap-2 text-sm text-muted">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-info/30 bg-info/10 text-sm font-extrabold text-info">
          {initials}
        </div>
      </div>

      {/* Tab bar */}
      <Tabs ariaLabel="Referee development" tabs={tabItems} activeId={devPage} onChange={(id) => setDevPage(id as DevPage)} />

      {/* Modals */}
      {goalFormMode && (
        <GoalFormModal
          mode={goalFormMode}
          refereeMembers={refereeMembers}
          totalRefereeCount={refereeMembers.length}
          onSave={handleGoalSave}
          onClose={() => setGoalFormMode(null)}
        />
      )}
      {noteFormMode && (
        <NoteFormModal
          mode={noteFormMode}
          refereeGoalViews={goalViews}
          onSave={handleNoteSave}
          onClose={() => setNoteFormMode(null)}
        />
      )}
    </div>
  );
}
