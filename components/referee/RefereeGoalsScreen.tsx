"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Target, CheckCircle, Archive, ChevronDown, ChevronUp,
  Plus, Pencil, Trash2, Calendar, BookOpen, Link2, FileText, User,
} from "lucide-react";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import type { RefEvalSession } from "@/lib/types/auth";
import type {
  RefereeGoalView, DevGoalDef, GoalStatus,
} from "@/lib/types/developmentGoals";
import type {
  DevelopmentNote, CreateNoteInput, NoteType,
} from "@/lib/types/developmentNotes";
import { NOTE_TYPES } from "@/lib/types/developmentNotes";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { ReviewGoalLink, ClipGoalLink } from "@/lib/types/reviewGoalLinks";
import type { MemberRecord } from "@/lib/types/members";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, type BadgeTone, Button, Card, EmptyState, Tabs, type TabItem, Textarea, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

// ── Tone tokens ────────────────────────────────────────────────────────────────

const PRIORITY_TONE: Record<string, BadgeTone> = { Low: "neutral", Medium: "warn", High: "danger" };
const PRIORITY_BORDER: Record<string, string> = { Low: "border-l-border", Medium: "border-l-warn", High: "border-l-danger" };
const STATUS_TONE: Record<GoalStatus, BadgeTone> = { Active: "accent", Completed: "good", Archived: "neutral" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(iso: string | null | undefined) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

function isDueSoon(iso: string | null | undefined) {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 14 * 24 * 60 * 60 * 1000;
}

function CategoryChip({ category }: { category: string }) {
  return <Badge tone="accent">{category}</Badge>;
}

// ── Note form (create / edit a self-reflection) ───────────────────────────────

const REFEREE_NOTE_TYPES: NoteType[] = ["General", "Review Follow-up", "Sideline Feedback", "Training", "Other"];

interface NoteFormProps {
  refereeId: string;
  linkedGoalId: string | null;
  existing?: DevelopmentNote;
  goalViews: RefereeGoalView[];
  onSave: (input: CreateNoteInput) => void;
  onSaveEdit: (patch: Partial<DevelopmentNote>, id: string) => void;
  onCancel: () => void;
}

function NoteForm({ refereeId, linkedGoalId, existing, goalViews, onSave, onSaveEdit, onCancel }: NoteFormProps) {
  const [title, setTitle]       = useState(existing?.title ?? "");
  const [body, setBody]         = useState(existing?.body ?? "");
  const [noteType, setNoteType] = useState<NoteType>(existing?.noteType ?? "General");
  const [linkedGoal, setLinkedGoal] = useState<string>(existing?.linkedGoalId ?? linkedGoalId ?? "");

  function handleSave() {
    if (!title.trim() || !body.trim()) return;
    if (existing) {
      onSaveEdit(
        { title: title.trim(), body: body.trim(), noteType, linkedGoalId: linkedGoal || null },
        existing.id,
      );
    } else {
      onSave({
        refereeId,
        title: title.trim(),
        body: body.trim(),
        noteType,
        visibility: "Visible to Referee",
        linkedGoalId: linkedGoal || null,
      });
    }
  }

  const activeGoals = goalViews.filter(gv => gv.status === "Active");

  return (
    <Card className="mt-2.5 grid gap-2 bg-panel-2">
      <p className="text-[13px] font-bold text-text">{existing ? "Edit reflection" : "Add a self-reflection note"}</p>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title…" />
      <Textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="What did you observe, learn or reflect on?…" />
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-1 basis-[140px] flex-col gap-1 text-xs">
          Type
          <Select value={noteType} onChange={e => setNoteType(e.target.value as NoteType)}>
            {REFEREE_NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </label>
        {activeGoals.length > 0 && (
          <label className="flex flex-1 basis-[180px] flex-col gap-1 text-xs">
            Link to goal (optional)
            <Select value={linkedGoal} onChange={e => setLinkedGoal(e.target.value)}>
              <option value="">— None —</option>
              {activeGoals.map(gv => (
                <option key={gv.id} value={gv.goalId}>{gv.title}</option>
              ))}
            </Select>
          </label>
        )}
      </div>
      <div className="mt-1 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!title.trim() || !body.trim()}>
          Save reflection
        </Button>
      </div>
    </Card>
  );
}

// ── Goal detail panel (expanded inline) ──────────────────────────────────────

interface GoalDetailProps {
  goalView: RefereeGoalView;
  goalDef: DevGoalDef | undefined;
  visibleNotes: DevelopmentNote[];
  selfNotes: DevelopmentNote[];
  linkedReviews: ReviewRecord[];
  linkedClipCount: number;
  members: MemberRecord[];
  session: RefEvalSession;
  goalViews: RefereeGoalView[];
  onCreateNote: (input: CreateNoteInput) => void;
  onUpdateNote: (patch: Partial<DevelopmentNote>, id: string) => void;
  onDeleteNote: (id: string) => void;
}

function GoalDetailPanel({
  goalView, goalDef, visibleNotes, selfNotes,
  linkedReviews, linkedClipCount, members, session, goalViews,
  onCreateNote, onUpdateNote, onDeleteNote,
}: GoalDetailProps) {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<string | null>(null);

  const assignedByMember = goalDef ? members.find(m => m.id === goalDef.createdBy) : undefined;
  const assignedByName = assignedByMember?.name ?? "Your educator";

  return (
    <div className="mt-2.5 border-t border-border pt-3.5">
      {/* Meta row */}
      <div className="mb-3 flex flex-wrap gap-3 text-[13px]">
        <span className="text-muted">
          <User size={13} className="mr-1 inline align-middle" />
          Assigned by <strong className="text-text">{assignedByName}</strong>
        </span>
        {goalView.targetReviewDate && (
          <span className={isOverdue(goalView.targetReviewDate) ? "text-red-300" : isDueSoon(goalView.targetReviewDate) ? "text-yellow-300" : "text-muted"}>
            <Calendar size={13} className="mr-1 inline align-middle" />
            Target review {fmtDate(goalView.targetReviewDate)}
            {isOverdue(goalView.targetReviewDate) && " · Overdue"}
            {!isOverdue(goalView.targetReviewDate) && isDueSoon(goalView.targetReviewDate) && " · Due soon"}
          </span>
        )}
        {linkedReviews.length > 0 && (
          <span className="text-muted">
            <Link2 size={13} className="mr-1 inline align-middle" />
            {linkedReviews.length} linked review{linkedReviews.length !== 1 ? "s" : ""}
          </span>
        )}
        {linkedClipCount > 0 && <span className="text-muted">{linkedClipCount} linked clip{linkedClipCount !== 1 ? "s" : ""}</span>}
      </div>

      {/* Description */}
      {goalView.description && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Description</p>
          <p className="text-[13px] leading-relaxed text-text">{goalView.description}</p>
        </div>
      )}

      {/* Educator notes visible to this referee */}
      {visibleNotes.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            <BookOpen size={12} className="mr-1 inline align-middle" />
            Coaching notes
          </p>
          <div className="grid gap-1.5">
            {visibleNotes.map(note => {
              const author = members.find(m => m.id === note.createdBy);
              return (
                <div key={note.id} className="rounded-lg border border-border border-l-4 border-l-accent bg-panel-2 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-bold text-text">{note.title}</p>
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">{fmtDate(note.createdAt)}</span>
                  </div>
                  {author && <p className="mt-0.5 text-[11px] text-muted">{author.name}</p>}
                  <p className="mt-1 text-[13px] leading-relaxed text-text">{note.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Self-reflection notes */}
      <div className="mb-2">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            <FileText size={12} className="mr-1 inline align-middle" />
            My reflections
          </p>
          {!showNoteForm && !editingNoteId && (
            <Button variant="secondary" size="sm" className="gap-1" onClick={() => setShowNoteForm(true)}>
              <Plus size={12} /> Add
            </Button>
          )}
        </div>

        {selfNotes.length === 0 && !showNoteForm && (
          <p className="text-xs italic text-muted">No reflections yet. Record your thoughts, observations or self-assessment here.</p>
        )}

        <div className="grid gap-1.5">
          {selfNotes.map(note => (
            <div key={note.id}>
              {editingNoteId === note.id ? (
                <NoteForm
                  refereeId={session.user.id}
                  linkedGoalId={goalView.goalId}
                  existing={note}
                  goalViews={goalViews}
                  onSave={onCreateNote}
                  onSaveEdit={(patch, id) => { onUpdateNote(patch, id); setEditingNoteId(null); }}
                  onCancel={() => setEditingNoteId(null)}
                />
              ) : (
                <div className="rounded-lg border border-border border-l-4 border-l-[#5e5ce6] bg-panel-2 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-bold text-text">{note.title}</p>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => setEditingNoteId(note.id)} className="border-none bg-none p-0.5 text-muted" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDeleteNote(note.id)} className="border-none bg-none p-0.5 text-red-300" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">{note.noteType} · {fmtDate(note.createdAt)}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text">{note.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {showNoteForm && (
          <NoteForm
            refereeId={session.user.id}
            linkedGoalId={goalView.goalId}
            goalViews={goalViews}
            onSave={(input) => { onCreateNote(input); setShowNoteForm(false); }}
            onSaveEdit={(patch, id) => { onUpdateNote(patch, id); setShowNoteForm(false); }}
            onCancel={() => setShowNoteForm(false)}
          />
        )}
      </div>

      {/* Linked reviews */}
      {linkedReviews.length > 0 && (
        <div className="mt-2.5">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Linked reviews</p>
          <div className="grid gap-1">
            {linkedReviews.map(review => (
              <div key={review.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-panel-2 px-3 py-1.5">
                <span className="text-[13px] font-semibold text-text">{review.game}</span>
                <span className="whitespace-nowrap text-[11px] text-muted">{fmtDate(review.gameDate || review.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmDeleteNote && (
        <ConfirmModal
          title="Delete reflection"
          message="Delete this reflection? This cannot be undone."
          onConfirm={() => { onDeleteNote(confirmDeleteNote); setConfirmDeleteNote(null); }}
          onCancel={() => setConfirmDeleteNote(null)}
        />
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type TabKey = "active" | "completed" | "archived";

export interface RefereeGoalsScreenProps {
  session: RefEvalSession;
  goalViews: RefereeGoalView[];
  goalDefs: DevGoalDef[];
  notes: DevelopmentNote[];
  completedReviews: ReviewRecord[];
  reviewGoalLinks: ReviewGoalLink[];
  clipGoalLinks: ClipGoalLink[];
  members: MemberRecord[];
  onCreateNote: (input: CreateNoteInput) => void;
  onUpdateNote: (patch: Partial<DevelopmentNote>, id: string) => void;
  onDeleteNote: (id: string) => void;
  onBack: () => void;
  /** referee_goals.id to auto-expand on mount (from notification deep-link) */
  initialGoalId?: string | null;
}

export function RefereeGoalsScreen({
  session, goalViews, goalDefs, notes, completedReviews,
  reviewGoalLinks, clipGoalLinks, members,
  onCreateNote, onUpdateNote, onDeleteNote, onBack,
  initialGoalId,
}: RefereeGoalsScreenProps) {
  const [tab, setTab]             = useState<TabKey>("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auto-expand the goal specified by a notification deep-link.
  // Switches to the correct tab (active/completed/archived) and expands the card.
  // Ignores the id if it doesn't belong to this referee (safety guard).
  useEffect(() => {
    if (!initialGoalId) return;
    const target = goalViews.find(gv => gv.id === initialGoalId);
    if (!target) return; // not found or doesn't belong to this referee — fall back gracefully
    const targetTab = target.status === "Completed" ? "completed"
      : target.status === "Archived" ? "archived" : "active";
    setTab(targetTab as TabKey);
    setExpandedId(initialGoalId);
  // Run once on mount only — intentional; subsequent navigation handled by re-mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showAddNote, setShowAddNote] = useState(false);

  const myId = session.user.id;

  // Educator notes that are visible to this referee
  const visibleEducatorNotes = useMemo(
    () => notes.filter(n => n.refereeId === myId && n.visibility === "Visible to Referee" && n.createdBy !== myId),
    [notes, myId],
  );

  // Self-reflection notes (created by the referee themselves)
  const selfReflectionNotes = useMemo(
    () => notes.filter(n => n.refereeId === myId && n.createdBy === myId),
    [notes, myId],
  );

  const byTab: Record<TabKey, RefereeGoalView[]> = useMemo(() => ({
    active:    goalViews.filter(gv => gv.status === "Active"),
    completed: goalViews.filter(gv => gv.status === "Completed"),
    archived:  goalViews.filter(gv => gv.status === "Archived"),
  }), [goalViews]);

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  // Latest educator note overall (for "latest note" summary in collapsed card)
  function latestEducatorNoteForGoal(goalDefId: string): DevelopmentNote | null {
    const matches = visibleEducatorNotes
      .filter(n => n.linkedGoalId === goalDefId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return matches[0] ?? null;
  }

  const totalActive = byTab.active.length;
  const overdueActive = byTab.active.filter(gv => isOverdue(gv.targetReviewDate)).length;
  const soonActive = byTab.active.filter(gv => isDueSoon(gv.targetReviewDate)).length;

  function renderGoalList(goals: RefereeGoalView[], emptyLabel: string, emptyHint: string) {
    if (goals.length === 0) {
      return <EmptyState icon={<Target size={28} />} title={emptyLabel} description={emptyHint} />;
    }
    return (
      <div className="grid gap-2">
        {goals.map(gv => {
          const isExpanded = expandedId === gv.id;
          const goalDef = goalDefs.find(d => d.id === gv.goalId);
          const latestNote = latestEducatorNoteForGoal(gv.goalId);

          const goalReviewLinks = reviewGoalLinks.filter(l => l.goalDefId === gv.goalId && l.refereeId === myId);
          const linkedRevIds = new Set(goalReviewLinks.map(l => l.reviewId));
          const linkedReviews = completedReviews.filter(r => linkedRevIds.has(r.id));

          const clipCount = clipGoalLinks.filter(l => l.goalDefId === gv.goalId && l.refereeId === myId).length;

          const goalVisibleNotes = visibleEducatorNotes.filter(n => n.linkedGoalId === gv.goalId);
          const goalSelfNotes    = selfReflectionNotes.filter(n => n.linkedGoalId === gv.goalId);

          const targetOverdue = gv.status === "Active" && isOverdue(gv.targetReviewDate);
          const targetSoon    = gv.status === "Active" && isDueSoon(gv.targetReviewDate);

          return (
            <div
              key={gv.id}
              onClick={() => toggleExpand(gv.id)}
              className={cn(
                "cursor-pointer rounded-xl border bg-panel-2 border-l-4 p-3.5 transition-colors",
                isExpanded ? "border-accent" : "border-border",
                PRIORITY_BORDER[gv.priority] ?? "border-l-border",
              )}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-sm font-bold text-text">{gv.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={STATUS_TONE[gv.status]}>{gv.status}</Badge>
                    <Badge tone={PRIORITY_TONE[gv.priority] ?? "neutral"}>{gv.priority}</Badge>
                    <CategoryChip category={gv.category} />
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="mt-0.5 shrink-0 text-muted" /> : <ChevronDown size={16} className="mt-0.5 shrink-0 text-muted" />}
              </div>

              {/* Card summary (collapsed) */}
              {!isExpanded && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                  {gv.targetReviewDate && (
                    <span className={targetOverdue ? "text-red-300" : targetSoon ? "text-yellow-300" : "text-muted"}>
                      <Calendar size={11} className="mr-0.5 inline align-middle" />
                      {targetOverdue ? "Overdue · " : targetSoon ? "Due soon · " : "Target "}
                      {fmtDate(gv.targetReviewDate)}
                    </span>
                  )}
                  {linkedReviews.length > 0 && (
                    <span><Link2 size={11} className="mr-0.5 inline align-middle" />{linkedReviews.length} review{linkedReviews.length !== 1 ? "s" : ""}</span>
                  )}
                  {clipCount > 0 && <span>{clipCount} clip{clipCount !== 1 ? "s" : ""}</span>}
                  {latestNote && (
                    <span className="italic">
                      <BookOpen size={11} className="mr-0.5 inline align-middle" />
                      {latestNote.title}
                    </span>
                  )}
                  {gv.completedAt && (
                    <span className="text-good">
                      <CheckCircle size={11} className="mr-0.5 inline align-middle" />
                      Completed {fmtDate(gv.completedAt)}
                    </span>
                  )}
                  {gv.archivedAt && (
                    <span><Archive size={11} className="mr-0.5 inline align-middle" />Archived {fmtDate(gv.archivedAt)}</span>
                  )}
                </div>
              )}

              {/* Expanded detail */}
              {isExpanded && (
                <div onClick={e => e.stopPropagation()}>
                  <GoalDetailPanel
                    goalView={gv}
                    goalDef={goalDef}
                    visibleNotes={goalVisibleNotes}
                    selfNotes={goalSelfNotes}
                    linkedReviews={linkedReviews}
                    linkedClipCount={clipCount}
                    members={members}
                    session={session}
                    goalViews={goalViews}
                    onCreateNote={onCreateNote}
                    onUpdateNote={onUpdateNote}
                    onDeleteNote={onDeleteNote}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const tabItems: TabItem[] = [
    {
      id: "active",
      label: "Active",
      badge: byTab.active.length > 0 ? <Badge tone="neutral">{byTab.active.length}</Badge> : undefined,
      content: renderGoalList(byTab.active, "No active development goals", "Your educator will assign goals to track your long-term development."),
    },
    {
      id: "completed",
      label: "Completed",
      badge: byTab.completed.length > 0 ? <Badge tone="neutral">{byTab.completed.length}</Badge> : undefined,
      content: renderGoalList(byTab.completed, "No completed goals yet", "Goals you complete will appear here."),
    },
    {
      id: "archived",
      label: "Archived",
      badge: byTab.archived.length > 0 ? <Badge tone="neutral">{byTab.archived.length}</Badge> : undefined,
      content: renderGoalList(byTab.archived, "No archived goals", "Goals that are no longer active but not yet completed are archived here."),
    },
  ];

  return (
    <div className="layout">
      <div className="grid gap-4">
        <PageFrame
          className="p-0"
          eyebrow="My Development"
          title="Development Goals"
          actions={<Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>}
        />
        <Card>
          <Tabs
            ariaLabel="Development goals"
            tabs={tabItems}
            activeId={tab}
            onChange={(id) => { setTab(id as TabKey); setExpandedId(null); }}
          />
        </Card>
      </div>

      {/* Sidebar */}
      <aside className="panel side-panel grid gap-4 border-0 bg-transparent p-0 shadow-none">
        <Card>
          <h3 className="mb-2.5 text-sm font-bold text-text">Overview</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-border bg-panel-2 p-3 text-center">
              <div className="text-xl font-extrabold text-accent">{byTab.active.length}</div>
              <div className="text-xs text-muted">Active</div>
            </div>
            <div className="rounded-lg border border-border bg-panel-2 p-3 text-center">
              <div className="text-xl font-extrabold text-good">{byTab.completed.length}</div>
              <div className="text-xs text-muted">Completed</div>
            </div>
          </div>
          {totalActive > 0 && (overdueActive > 0 || soonActive > 0) && (
            <div className="mt-2.5 grid gap-1">
              {overdueActive > 0 && (
                <p className="text-xs text-red-300">⚠ {overdueActive} goal{overdueActive !== 1 ? "s" : ""} overdue for review</p>
              )}
              {soonActive > 0 && (
                <p className="text-xs text-yellow-300">● {soonActive} goal{soonActive !== 1 ? "s" : ""} due for review soon</p>
              )}
            </div>
          )}
        </Card>

        {/* Self-reflection notes sidebar */}
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">My Reflections</h3>
            <Button variant="secondary" size="sm" className="gap-1" onClick={() => setShowAddNote(v => !v)}>
              <Plus size={12} /> Add
            </Button>
          </div>

          {showAddNote && (
            <NoteForm
              refereeId={myId}
              linkedGoalId={null}
              goalViews={goalViews}
              onSave={(input) => { onCreateNote(input); setShowAddNote(false); }}
              onSaveEdit={(patch, id) => { onUpdateNote(patch, id); setShowAddNote(false); }}
              onCancel={() => setShowAddNote(false)}
            />
          )}

          {selfReflectionNotes.length === 0 && !showAddNote && (
            <p className="text-xs italic text-muted">No reflections yet. Add a self-reflection note to record your thoughts and observations.</p>
          )}

          <div className={cn("grid gap-1.5", showAddNote && "mt-2")}>
            {selfReflectionNotes.slice(0, 5).map(note => (
              <div key={note.id} className="rounded-lg border border-border border-l-4 border-l-[#5e5ce6] bg-panel-2 px-2.5 py-2">
                <p className="text-xs font-bold text-text">{note.title}</p>
                <p className="mt-0.5 text-[11px] text-muted">{note.noteType} · {fmtDate(note.createdAt)}</p>
                <p className="mt-1 text-xs leading-relaxed text-text">
                  {note.body.length > 120 ? note.body.slice(0, 117) + "…" : note.body}
                </p>
              </div>
            ))}
            {selfReflectionNotes.length > 5 && (
              <p className="text-center text-xs text-muted">+ {selfReflectionNotes.length - 5} more — expand a goal to view all</p>
            )}
          </div>
        </Card>

        {/* Educator notes visible to this referee */}
        {visibleEducatorNotes.length > 0 && (
          <Card>
            <h3 className="mb-2 text-sm font-bold text-text">
              <BookOpen size={14} className="mr-1 inline align-middle" />
              Coaching notes
            </h3>
            <div className="grid gap-1.5">
              {visibleEducatorNotes.slice(0, 3).map(note => {
                const author = members.find(m => m.id === note.createdBy);
                return (
                  <div key={note.id} className="rounded-lg border border-border border-l-4 border-l-accent bg-panel-2 px-2.5 py-2">
                    <p className="text-xs font-bold text-text">{note.title}</p>
                    {author && <p className="mt-0.5 text-[11px] text-muted">{author.name} · {fmtDate(note.createdAt)}</p>}
                    <p className="mt-1 text-xs leading-relaxed text-text">
                      {note.body.length > 100 ? note.body.slice(0, 97) + "…" : note.body}
                    </p>
                  </div>
                );
              })}
              {visibleEducatorNotes.length > 3 && (
                <p className="text-center text-xs text-muted">+ {visibleEducatorNotes.length - 3} more — expand a goal to view all</p>
              )}
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
}
