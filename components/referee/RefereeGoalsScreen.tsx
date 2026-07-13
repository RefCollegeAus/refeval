"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft, Target, CheckCircle, Archive, ChevronDown, ChevronUp,
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

// ── Colour tokens (mirrors RefereeDevelopmentScreen) ─────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  Low: "#636366", Medium: "#ff9f0a", High: "#ff453a",
};
const PRIORITY_BG: Record<string, string> = {
  Low: "rgba(99,99,102,.15)", Medium: "rgba(255,159,10,.12)", High: "rgba(255,69,58,.12)",
};
const STATUS_COLOR: Record<GoalStatus, string> = {
  Active: "#0a84ff", Completed: "#30d158", Archived: "#636366",
};
const STATUS_BG: Record<GoalStatus, string> = {
  Active: "rgba(10,132,255,.1)", Completed: "rgba(48,209,88,.1)", Archived: "rgba(99,99,102,.12)",
};

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

// ── Badge components ──────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
      background: PRIORITY_BG[priority] ?? "rgba(99,99,102,.15)",
      color: PRIORITY_COLOR[priority] ?? "var(--muted)",
      border: `1px solid ${(PRIORITY_COLOR[priority] ?? "#636366")}44`,
      textTransform: "uppercase" as const, letterSpacing: "0.05em",
    }}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: GoalStatus }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
      background: STATUS_BG[status], color: STATUS_COLOR[status],
      border: `1px solid ${STATUS_COLOR[status]}44`,
      textTransform: "uppercase" as const, letterSpacing: "0.05em",
    }}>
      {status}
    </span>
  );
}

function CategoryChip({ category }: { category: string }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 9px", borderRadius: 999,
      background: "rgba(165,106,27,.1)", color: "var(--accent)",
      border: "1px solid rgba(165,106,27,.25)", fontWeight: 600,
    }}>
      {category}
    </span>
  );
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
    <div style={{
      background: "var(--panel3)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "14px 16px", marginTop: 10,
    }}>
      <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 13 }}>
        {existing ? "Edit reflection" : "Add a self-reflection note"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title…"
          style={{ width: "100%", boxSizing: "border-box" }}
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          placeholder="What did you observe, learn or reflect on?…"
          style={{ resize: "vertical", width: "100%", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            Type
            <select value={noteType} onChange={e => setNoteType(e.target.value as NoteType)}>
              {REFEREE_NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {activeGoals.length > 0 && (
            <label style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              Link to goal (optional)
              <select value={linkedGoal} onChange={e => setLinkedGoal(e.target.value)}>
                <option value="">— None —</option>
                {activeGoals.map(gv => (
                  <option key={gv.id} value={gv.goalId}>{gv.title}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onCancel} style={{ fontSize: 13 }}>Cancel</button>
          <button
            className="primary"
            onClick={handleSave}
            disabled={!title.trim() || !body.trim()}
            style={{ fontSize: 13 }}
          >
            Save reflection
          </button>
        </div>
      </div>
    </div>
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

  const allNotes = useMemo(() => {
    const combined = [...visibleNotes, ...selfNotes];
    combined.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return combined;
  }, [visibleNotes, selfNotes]);

  return (
    <div style={{
      borderTop: "1px solid var(--border)",
      padding: "14px 0 2px",
      marginTop: 10,
    }}>
      {/* Meta row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, fontSize: 13 }}>
        <span style={{ color: "var(--muted)" }}>
          <User size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Assigned by <strong>{assignedByName}</strong>
        </span>
        {goalView.targetReviewDate && (
          <span style={{
            color: isOverdue(goalView.targetReviewDate) ? "#ff453a"
              : isDueSoon(goalView.targetReviewDate) ? "#ff9f0a" : "var(--muted)",
          }}>
            <Calendar size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Target review {fmtDate(goalView.targetReviewDate)}
            {isOverdue(goalView.targetReviewDate) && " · Overdue"}
            {!isOverdue(goalView.targetReviewDate) && isDueSoon(goalView.targetReviewDate) && " · Due soon"}
          </span>
        )}
        {linkedReviews.length > 0 && (
          <span style={{ color: "var(--muted)" }}>
            <Link2 size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {linkedReviews.length} linked review{linkedReviews.length !== 1 ? "s" : ""}
          </span>
        )}
        {linkedClipCount > 0 && (
          <span style={{ color: "var(--muted)" }}>
            {linkedClipCount} linked clip{linkedClipCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Description */}
      {goalView.description && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Description</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>{goalView.description}</p>
        </div>
      )}

      {/* Educator notes visible to this referee */}
      {visibleNotes.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <BookOpen size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Coaching notes
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {visibleNotes.map(note => {
              const author = members.find(m => m.id === note.createdBy);
              return (
                <div key={note.id} style={{
                  background: "var(--panel3)", border: "1px solid var(--border)",
                  borderLeft: "3px solid var(--accent)", borderRadius: 8, padding: "8px 12px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{note.title}</p>
                    <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {fmtDate(note.createdAt)}
                    </span>
                  </div>
                  {author && (
                    <p style={{ margin: "1px 0 4px", fontSize: 11, color: "var(--muted)" }}>{author.name}</p>
                  )}
                  <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>{note.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Self-reflection notes */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <FileText size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
            My reflections
          </p>
          {!showNoteForm && !editingNoteId && (
            <button
              onClick={() => setShowNoteForm(true)}
              style={{ fontSize: 12, padding: "3px 10px", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        {selfNotes.length === 0 && !showNoteForm && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
            No reflections yet. Record your thoughts, observations or self-assessment here.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                <div style={{
                  background: "var(--panel3)", border: "1px solid var(--border)",
                  borderLeft: "3px solid #5e5ce6", borderRadius: 8, padding: "8px 12px",
                  position: "relative",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{note.title}</p>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => setEditingNoteId(note.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--muted)" }}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteNote(note.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "#ff453a" }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>
                    {note.noteType} · {fmtDate(note.createdAt)}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>{note.body}</p>
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
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Linked reviews
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {linkedReviews.map(review => (
              <div key={review.id} style={{
                background: "var(--panel3)", border: "1px solid var(--border)",
                borderRadius: 7, padding: "6px 12px",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{review.game}</span>
                <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {fmtDate(review.gameDate || review.createdAt)}
                </span>
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
}

export function RefereeGoalsScreen({
  session, goalViews, goalDefs, notes, completedReviews,
  reviewGoalLinks, clipGoalLinks, members,
  onCreateNote, onUpdateNote, onDeleteNote, onBack,
}: RefereeGoalsScreenProps) {
  const [tab, setTab]             = useState<TabKey>("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const visibleGoals = byTab[tab];

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

  return (
    <div className="layout">
      <section className="panel">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 2px", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}
          >
            <ChevronLeft size={18} /> Back
          </button>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>My Development</p>
            <h2 style={{ margin: "2px 0 0" }}>Development Goals</h2>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {(["active", "completed", "archived"] as TabKey[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setExpandedId(null); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 14px", fontSize: 13, fontWeight: tab === t ? 700 : 400,
                color: tab === t ? "var(--accent)" : "var(--muted)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
                textTransform: "capitalize" as const,
              }}
            >
              {t}
              {byTab[t].length > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 11, padding: "1px 6px", borderRadius: 999,
                  background: tab === t ? "var(--accent)" : "var(--border)",
                  color: tab === t ? "#fff" : "var(--muted)",
                }}>
                  {byTab[t].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {visibleGoals.length === 0 && (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <Target size={32} style={{ color: "var(--muted)", marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>
              {tab === "active" ? "No active development goals" : tab === "completed" ? "No completed goals yet" : "No archived goals"}
            </p>
            <p className="hint" style={{ margin: "4px 0 0" }}>
              {tab === "active" ? "Your educator will assign goals to track your long-term development." : ""}
            </p>
          </div>
        )}

        {/* Goal cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visibleGoals.map(gv => {
            const isExpanded = expandedId === gv.id;
            const goalDef = goalDefs.find(d => d.id === gv.goalId);
            const latestNote = latestEducatorNoteForGoal(gv.goalId);

            const goalReviewLinks = reviewGoalLinks.filter(l => l.goalDefId === gv.goalId && l.refereeId === myId);
            const linkedRevIds = new Set(goalReviewLinks.map(l => l.reviewId));
            const linkedReviews = completedReviews.filter(r => linkedRevIds.has(r.id));

            const clipCount = clipGoalLinks.filter(l => l.goalDefId === gv.goalId && l.refereeId === myId).length;

            const goalVisibleNotes = visibleEducatorNotes.filter(n => n.linkedGoalId === gv.goalId);
            const goalSelfNotes    = selfReflectionNotes.filter(n => n.linkedGoalId === gv.goalId || (n.linkedGoalId === null && false));

            const targetOverdue = gv.status === "Active" && isOverdue(gv.targetReviewDate);
            const targetSoon    = gv.status === "Active" && isDueSoon(gv.targetReviewDate);

            return (
              <div
                key={gv.id}
                style={{
                  background: "var(--panel2)",
                  border: `1px solid ${isExpanded ? "var(--accent)" : "var(--border)"}`,
                  borderLeft: `3px solid ${PRIORITY_COLOR[gv.priority] ?? "var(--border)"}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onClick={() => toggleExpand(gv.id)}
              >
                {/* Card header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 5px", fontWeight: 700, fontSize: 14 }}>{gv.title}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <StatusBadge status={gv.status} />
                      <PriorityBadge priority={gv.priority} />
                      <CategoryChip category={gv.category} />
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} style={{ color: "var(--muted)", flexShrink: 0, marginTop: 2 }} />
                              : <ChevronDown size={16} style={{ color: "var(--muted)", flexShrink: 0, marginTop: 2 }} />}
                </div>

                {/* Card summary (collapsed) */}
                {!isExpanded && (
                  <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}>
                    {gv.targetReviewDate && (
                      <span style={{ color: targetOverdue ? "#ff453a" : targetSoon ? "#ff9f0a" : "var(--muted)" }}>
                        <Calendar size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        {targetOverdue ? "Overdue · " : targetSoon ? "Due soon · " : "Target "}
                        {fmtDate(gv.targetReviewDate)}
                      </span>
                    )}
                    {linkedReviews.length > 0 && (
                      <span><Link2 size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />{linkedReviews.length} review{linkedReviews.length !== 1 ? "s" : ""}</span>
                    )}
                    {clipCount > 0 && (
                      <span>{clipCount} clip{clipCount !== 1 ? "s" : ""}</span>
                    )}
                    {latestNote && (
                      <span style={{ fontStyle: "italic" }}>
                        <BookOpen size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        {latestNote.title}
                      </span>
                    )}
                    {gv.completedAt && (
                      <span style={{ color: STATUS_COLOR.Completed }}>
                        <CheckCircle size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        Completed {fmtDate(gv.completedAt)}
                      </span>
                    )}
                    {gv.archivedAt && (
                      <span>
                        <Archive size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        Archived {fmtDate(gv.archivedAt)}
                      </span>
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
      </section>

      {/* Sidebar */}
      <aside className="panel side-panel">
        <div className="analytics-card">
          <h3 style={{ margin: "0 0 10px" }}>Overview</h3>
          <div className="metric-grid">
            <div className="metric-tile">
              <div className="number" style={{ color: STATUS_COLOR.Active }}>{byTab.active.length}</div>
              <div className="hint">Active</div>
            </div>
            <div className="metric-tile">
              <div className="number" style={{ color: STATUS_COLOR.Completed }}>{byTab.completed.length}</div>
              <div className="hint">Completed</div>
            </div>
          </div>
          {totalActive > 0 && (() => {
            const overdue = byTab.active.filter(gv => isOverdue(gv.targetReviewDate)).length;
            const soon    = byTab.active.filter(gv => isDueSoon(gv.targetReviewDate)).length;
            return (overdue > 0 || soon > 0) ? (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                {overdue > 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "#ff453a" }}>
                    ⚠ {overdue} goal{overdue !== 1 ? "s" : ""} overdue for review
                  </p>
                )}
                {soon > 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "#ff9f0a" }}>
                    ● {soon} goal{soon !== 1 ? "s" : ""} due for review soon
                  </p>
                )}
              </div>
            ) : null;
          })()}
        </div>

        {/* Self-reflection notes sidebar */}
        <div className="analytics-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>My Reflections</h3>
            <button
              onClick={() => setShowAddNote(v => !v)}
              style={{ fontSize: 12, padding: "3px 10px", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Plus size={12} /> Add
            </button>
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
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
              No reflections yet. Add a self-reflection note to record your thoughts and observations.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: showAddNote ? 8 : 0 }}>
            {selfReflectionNotes.slice(0, 5).map(note => (
              <div key={note.id} style={{
                background: "var(--panel3)", border: "1px solid var(--border)",
                borderLeft: "3px solid #5e5ce6", borderRadius: 8, padding: "8px 10px",
              }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{note.title}</p>
                <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--muted)" }}>
                  {note.noteType} · {fmtDate(note.createdAt)}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>
                  {note.body.length > 120 ? note.body.slice(0, 117) + "…" : note.body}
                </p>
              </div>
            ))}
            {selfReflectionNotes.length > 5 && (
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                + {selfReflectionNotes.length - 5} more — expand a goal to view all
              </p>
            )}
          </div>
        </div>

        {/* Educator notes visible to this referee */}
        {visibleEducatorNotes.length > 0 && (
          <div className="analytics-card">
            <h3 style={{ margin: "0 0 8px" }}>
              <BookOpen size={14} style={{ verticalAlign: "middle", marginRight: 5 }} />
              Coaching notes
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {visibleEducatorNotes.slice(0, 3).map(note => {
                const author = members.find(m => m.id === note.createdBy);
                return (
                  <div key={note.id} style={{
                    background: "var(--panel3)", border: "1px solid var(--border)",
                    borderLeft: "3px solid var(--accent)", borderRadius: 8, padding: "8px 10px",
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{note.title}</p>
                    {author && (
                      <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--muted)" }}>{author.name} · {fmtDate(note.createdAt)}</p>
                    )}
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>
                      {note.body.length > 100 ? note.body.slice(0, 97) + "…" : note.body}
                    </p>
                  </div>
                );
              })}
              {visibleEducatorNotes.length > 3 && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                  + {visibleEducatorNotes.length - 3} more — expand a goal to view all
                </p>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
