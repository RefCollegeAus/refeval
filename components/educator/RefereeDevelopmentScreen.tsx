"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Plus, CheckCircle, Archive, RotateCcw, Pencil, Trash2,
  ChevronLeft, Users, User, UserCheck, FileText, Lock, Eye,
} from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { MemberRecord } from "@/lib/types/members";
import type {
  DevGoalDef, RefereeGoal, RefereeGoalView,
  GoalStatus, AssignGoalInput,  GoalAssignmentType,
} from "@/lib/types/developmentGoals";
import { GOAL_CATEGORIES, GOAL_PRIORITIES } from "@/lib/types/developmentGoals";
import type { DevelopmentNote, CreateNoteInput, NoteType, NoteVisibility } from "@/lib/types/developmentNotes";
import { NOTE_TYPES, NOTE_VISIBILITIES } from "@/lib/types/developmentNotes";

// ── Colour tokens ─────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  Low:    "#636366",
  Medium: "#ff9f0a",
  High:   "#ff453a",
};

const PRIORITY_BG: Record<string, string> = {
  Low:    "rgba(99,99,102,.15)",
  Medium: "rgba(255,159,10,.12)",
  High:   "rgba(255,69,58,.12)",
};

const STATUS_COLOR: Record<GoalStatus, string> = {
  Active:    "#0a84ff",
  Completed: "#30d158",
  Archived:  "#636366",
};

const STATUS_BG: Record<GoalStatus, string> = {
  Active:    "rgba(10,132,255,.1)",
  Completed: "rgba(48,209,88,.1)",
  Archived:  "rgba(99,99,102,.12)",
};

// ── Shared display helpers ────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
      background: PRIORITY_BG[priority] ?? "rgba(99,99,102,.15)",
      color: PRIORITY_COLOR[priority] ?? "var(--muted)",
      border: `1px solid ${(PRIORITY_COLOR[priority] ?? "#636366")}44`,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: GoalStatus }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
      background: STATUS_BG[status],
      color: STATUS_COLOR[status],
      border: `1px solid ${STATUS_COLOR[status]}44`,
      textTransform: "uppercase", letterSpacing: "0.05em",
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

function NoteTypeBadge({ type }: { type: NoteType }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
      background: "rgba(99,99,102,.12)",
      color: "var(--muted)",
      border: "1px solid rgba(99,99,102,.2)",
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {type}
    </span>
  );
}

function VisibilityBadge({ visibility }: { visibility: NoteVisibility }) {
  const isPrivate = visibility === "Educator Only";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
      display: "inline-flex", alignItems: "center", gap: 4,
      background: isPrivate ? "rgba(255,159,10,.1)" : "rgba(48,209,88,.1)",
      color: isPrivate ? "#ff9f0a" : "#30d158",
      border: `1px solid ${isPrivate ? "rgba(255,159,10,.3)" : "rgba(48,209,88,.3)"}`,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {isPrivate ? <Lock size={9} /> : <Eye size={9} />}
      {visibility}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ── Page-level tab switcher ───────────────────────────────────────────────────

type DevPage = "goals" | "notes";

function PageTabs({
  active,
  goalCount,
  noteCount,
  onChange,
}: {
  active: DevPage;
  goalCount: number;
  noteCount: number;
  onChange: (p: DevPage) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
      {(["goals", "notes"] as DevPage[]).map(page => {
        const label = page === "goals" ? `Goals${goalCount > 0 ? ` (${goalCount})` : ""}` : `Notes${noteCount > 0 ? ` (${noteCount})` : ""}`;
        const isActive = active === page;
        return (
          <button
            key={page}
            onClick={() => onChange(page)}
            style={{
              fontSize: 14, fontWeight: isActive ? 700 : 400,
              padding: "10px 20px", borderRadius: 0, background: "transparent",
              color: isActive ? "var(--text)" : "var(--muted)",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  view,
  canEdit,
  onEdit,
  onComplete,
  onArchive,
  onReopen,
  onDelete,
}: {
  view: RefereeGoalView;
  canEdit: boolean;
  onEdit: (view: RefereeGoalView) => void;
  onComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="panel" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{view.title}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
          <StatusBadge status={view.status} />
          <PriorityBadge priority={view.priority} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <CategoryChip category={view.category} />
        <span className="hint" style={{ fontSize: 12 }}>Created {fmtDate(view.createdAt)}</span>
        {view.targetReviewDate && (
          <span className="hint" style={{ fontSize: 12 }}>· Target review {fmtDate(view.targetReviewDate)}</span>
        )}
        {view.completedAt && (
          <span style={{ fontSize: 12, color: STATUS_COLOR.Completed }}>· Completed {fmtDate(view.completedAt)}</span>
        )}
      </div>

      {view.description && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {view.description}
        </p>
      )}

      {view.notes && (
        <div style={{ background: "rgba(165,106,27,.07)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(165,106,27,.2)" }}>
          <p className="hint" style={{ margin: "0 0 2px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{view.notes}</p>
        </div>
      )}

      {canEdit && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 2 }}>
          <button style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }} onClick={() => onEdit(view)}>
            <Pencil size={12} /> Edit
          </button>
          {view.status === "Active" && (
            <>
              <button
                style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: STATUS_COLOR.Completed }}
                onClick={() => onComplete(view.id)}
              >
                <CheckCircle size={12} /> Complete
              </button>
              <button
                style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: "var(--muted)" }}
                onClick={() => onArchive(view.id)}
              >
                <Archive size={12} /> Archive
              </button>
            </>
          )}
          {(view.status === "Completed" || view.status === "Archived") && (
            <button
              style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: STATUS_COLOR.Active }}
              onClick={() => onReopen(view.id)}
            >
              <RotateCcw size={12} /> Reopen
            </button>
          )}
          {view.status === "Active" && (
            <button
              style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: "#ff453a", marginLeft: "auto" }}
              onClick={() => {
                if (window.confirm(`Delete goal "${view.title}"? This removes only this referee's copy.`)) {
                  onDelete(view.id);
                }
              }}
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
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
  return (
    <div className="panel" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{note.title}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
          <VisibilityBadge visibility={note.visibility} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <NoteTypeBadge type={note.noteType} />
        <span className="hint" style={{ fontSize: 12 }}>{fmtDate(note.createdAt)}</span>
        {note.updatedAt !== note.createdAt && (
          <span className="hint" style={{ fontSize: 12 }}>· edited {fmtDate(note.updatedAt)}</span>
        )}
      </div>

      {linkedGoalTitle && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--accent)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Linked goal</span>
          <span style={{ fontWeight: 600 }}>{linkedGoalTitle}</span>
        </div>
      )}

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--text)" }}>
        {note.body}
      </p>

      {canEdit && (
        <div style={{ display: "flex", gap: 6, paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 2 }}>
          <button
            style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
            onClick={() => onEdit(note)}
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: "#ff453a", marginLeft: "auto" }}
            onClick={() => {
              if (window.confirm(`Delete note "${note.title}"? This cannot be undone.`)) {
                onDelete(note.id);
              }
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function GoalEmptyState({ status, canEdit, onCreateGoal }: { status: GoalStatus; canEdit: boolean; onCreateGoal?: () => void }) {
  const messages: Record<GoalStatus, { icon: string; heading: string; body: string }> = {
    Active: {
      icon: "🎯",
      heading: "No active development goals",
      body: canEdit
        ? "Create this referee's first development goal to start building their long-term coaching record."
        : "No active development goals have been set yet.",
    },
    Completed: { icon: "✅", heading: "No completed goals yet", body: "Completed goals will appear here once a referee achieves them." },
    Archived:  { icon: "📦", heading: "No archived goals",      body: "Goals that are no longer active but not yet completed are archived here." },
  };
  const m = messages[status];
  return (
    <div className="panel" style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 36 }}>{m.icon}</span>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{m.heading}</p>
      <p className="hint" style={{ margin: 0, maxWidth: 420, fontSize: 13 }}>{m.body}</p>
      {status === "Active" && canEdit && onCreateGoal && (
        <button className="primary" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }} onClick={onCreateGoal}>
          <Plus size={14} /> Assign Goal
        </button>
      )}
    </div>
  );
}

function NoteEmptyState({ canEdit, onCreateNote }: { canEdit: boolean; onCreateNote?: () => void }) {
  return (
    <div className="panel" style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 36 }}>📝</span>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>No development notes yet</p>
      <p className="hint" style={{ margin: 0, maxWidth: 440, fontSize: 13 }}>
        {canEdit
          ? "Record coaching conversations, sideline observations and check-in notes here. Notes stay private unless you share them with the referee."
          : "No development notes have been recorded for this referee yet."}
      </p>
      {canEdit && onCreateNote && (
        <button className="primary" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }} onClick={onCreateNote}>
          <Plus size={14} /> Add Note
        </button>
      )}
    </div>
  );
}

// ── Goal filter tabs ──────────────────────────────────────────────────────────

function GoalFilterTabs({
  active,
  counts,
  onChange,
}: {
  active: GoalStatus;
  counts: Record<GoalStatus, number>;
  onChange: (s: GoalStatus) => void;
}) {
  const tabs: GoalStatus[] = ["Active", "Completed", "Archived"];
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {tabs.map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          style={{
            fontSize: 13, padding: "5px 14px", borderRadius: 8,
            background: active === s ? STATUS_BG[s] : "transparent",
            color: active === s ? STATUS_COLOR[s] : "var(--muted)",
            border: `1px solid ${active === s ? STATUS_COLOR[s] + "55" : "var(--border)"}`,
            fontWeight: active === s ? 700 : 400,
          }}
        >
          {s} {counts[s] > 0 ? <span style={{ opacity: 0.7 }}>({counts[s]})</span> : null}
        </button>
      ))}
    </div>
  );
}

// ── Goal form modal ───────────────────────────────────────────────────────────

type GoalFormMode =
  | { type: "create"; defaultRefereeId: string }
  | { type: "edit"; view: RefereeGoalView };

const ASSIGN_TYPE_OPTIONS: { value: GoalAssignmentType; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: "Individual",       label: "Individual",        hint: "One referee",          icon: <User size={14} /> },
  { value: "SelectedReferees", label: "Selected Referees", hint: "Choose from the list", icon: <UserCheck size={14} /> },
  { value: "Everyone",         label: "Everyone",          hint: "All referees",         icon: <Users size={14} /> },
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
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          {isCreate && (
            <div>
              <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13 }}>Assign to</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {ASSIGN_TYPE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => { setAssignType(opt.value); setError(""); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 14px", borderRadius: 8,
                      background: assignType === opt.value ? "rgba(10,132,255,.12)" : "transparent",
                      color: assignType === opt.value ? "#0a84ff" : "var(--muted)",
                      border: `1px solid ${assignType === opt.value ? "#0a84ff55" : "var(--border)"}`,
                      fontWeight: assignType === opt.value ? 700 : 400,
                    }}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
              {assignType === "Individual" && (
                <select value={selectedOne} onChange={e => setSelectedOne(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
                  <option value="">Select referee…</option>
                  {refereeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              {assignType === "SelectedReferees" && (
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, maxHeight: 180, overflowY: "auto", padding: "4px 0" }}>
                  {refereeMembers.length === 0 && <p className="hint" style={{ padding: "8px 14px", margin: 0, fontSize: 13 }}>No referees in this organisation.</p>}
                  {refereeMembers.map(m => (
                    <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", background: selectedMany.has(m.id) ? "rgba(10,132,255,.06)" : "transparent" }}>
                      <input type="checkbox" checked={selectedMany.has(m.id)} onChange={() => toggleMany(m.id)} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13 }}>{m.name}</span>
                      <span className="hint" style={{ fontSize: 12, marginLeft: "auto" }}>{m.email}</span>
                    </label>
                  ))}
                </div>
              )}
              {assignType === "Everyone" && (
                <p className="hint" style={{ fontSize: 13, margin: 0 }}>
                  This goal will be assigned to all {totalRefereeCount} referee{totalRefereeCount !== 1 ? "s" : ""} in your organisation. Each will track their own progress independently.
                </p>
              )}
            </div>
          )}
          {!isCreate && (
            <p className="hint" style={{ fontSize: 12, margin: 0, padding: "6px 12px", background: "rgba(165,106,27,.07)", borderRadius: 8, border: "1px solid rgba(165,106,27,.2)" }}>
              Changes to title, description, category and priority apply to all referees assigned this goal.
            </p>
          )}
          <label>Title <span style={{ color: "#ff453a" }}>*</span>
            <input value={title} onChange={e => { setTitle(e.target.value); setError(""); }} placeholder="e.g. Improve lead-foot positioning in the paint" autoFocus={!isCreate} />
          </label>
          <label>Description
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Additional context, coaching notes, or specific behaviours to target…" style={{ resize: "vertical", minHeight: 80 }} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <label>Priority<select value={priority} onChange={e => setPriority(e.target.value)}>{GOAL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
          </div>
          <label>Target review date <span className="hint" style={{ fontSize: 12 }}>(optional)</span>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </label>
          {!isCreate && (
            <label>Coaching notes <span className="hint" style={{ fontSize: 12 }}>(visible to educators only)</span>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Private notes about this referee's progress…" style={{ resize: "vertical" }} />
            </label>
          )}
          {error && <p style={{ margin: 0, color: "#ff453a", fontSize: 13 }}>{error}</p>}
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

  // Only show Active goals in the link dropdown
  const linkableGoals = refereeGoalViews.filter(v => v.refereeId === refereeId && v.status === "Active");

  function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!body.trim())  { setError("Body is required.");  return; }
    setError("");

    if (isCreate) {
      onSave({
        refereeId,
        title: title.trim(),
        body: body.trim(),
        noteType,
        visibility,
        linkedGoalId: linkedGoalId || null,
      } satisfies CreateNoteInput);
    } else {
      onSave({
        title: title.trim(),
        body: body.trim(),
        noteType,
        visibility,
        linkedGoalId: linkedGoalId || null,
      }, existing!.id);
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

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          <label>
            Title <span style={{ color: "#ff453a" }}>*</span>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setError(""); }}
              placeholder="e.g. Post-game debrief — Round 7"
              autoFocus
            />
          </label>

          <label>
            Note <span style={{ color: "#ff453a" }}>*</span>
            <textarea
              value={body}
              onChange={e => { setBody(e.target.value); setError(""); }}
              rows={5}
              placeholder="Record observations, coaching points, or conversation highlights…"
              style={{ resize: "vertical", minHeight: 110 }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              Note type
              <select value={noteType} onChange={e => setNoteType(e.target.value as NoteType)}>
                {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>
              Visibility
              <select value={visibility} onChange={e => setVisibility(e.target.value as NoteVisibility)}>
                {NOTE_VISIBILITIES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>

          <label>
            Linked goal <span className="hint" style={{ fontSize: 12 }}>(optional)</span>
            <select value={linkedGoalId} onChange={e => setLinkedGoalId(e.target.value)}>
              <option value="">No linked goal</option>
              {linkableGoals.map(v => <option key={v.goalId} value={v.goalId}>{v.title}</option>)}
            </select>
          </label>

          {error && <p style={{ margin: 0, color: "#ff453a", fontSize: 13 }}>{error}</p>}
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

export function RefereeDevelopmentScreen({
  session, referee, refereeMembers, goalViews, notes,
  onAssignGoal, onUpdateGoalDef, onUpdateRefereeGoal,
  onCompleteGoal, onArchiveGoal, onReopenGoal, onDeleteGoal,
  onCreateNote, onUpdateNote, onDeleteNote,
  onBack,
}: RefereeDevelopmentScreenProps) {
  const [devPage, setDevPage]           = useState<DevPage>("goals");
  const [goalFilter, setGoalFilter]     = useState<GoalStatus>("Active");
  const [goalFormMode, setGoalFormMode] = useState<GoalFormMode | null>(null);
  const [noteFormMode, setNoteFormMode] = useState<NoteFormMode | null>(null);

  const canEdit =
    session.activeRole === "educator" ||
    session.activeRole === "admin" ||
    session.activeRole === "super_admin";

  // ── Goal counts ──────────────────────────────────────────────────────────
  const goalCounts: Record<GoalStatus, number> = useMemo(() => ({
    Active:    goalViews.filter(v => v.status === "Active").length,
    Completed: goalViews.filter(v => v.status === "Completed").length,
    Archived:  goalViews.filter(v => v.status === "Archived").length,
  }), [goalViews]);

  const visibleGoals = useMemo(
    () => goalViews.filter(v => v.status === goalFilter),
    [goalViews, goalFilter],
  );

  const highPriCount = goalViews.filter(v => v.status === "Active" && v.priority === "High").length;

  // ── Goal form save handler ───────────────────────────────────────────────
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

  // ── Note form save handler ───────────────────────────────────────────────
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

  // ── Goal linked title lookup ─────────────────────────────────────────────
  const goalTitleById = useMemo(
    () => new Map(goalViews.map(v => [v.goalId, v.title])),
    [goalViews],
  );

  const initials = referee.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="layout" style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }}>

      {/* Back nav */}
      <button
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", marginBottom: 20, background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          background: "rgba(10,132,255,.12)", border: "2px solid rgba(10,132,255,.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: "#0a84ff",
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Referee Development</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 24 }}>{referee.name}</h1>
          <p className="hint" style={{ margin: "2px 0 0", fontSize: 13 }}>{referee.email}</p>
        </div>
        {canEdit && devPage === "goals" && (
          <button
            className="primary"
            style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
            onClick={() => setGoalFormMode({ type: "create", defaultRefereeId: referee.id })}
          >
            <Plus size={14} /> Assign Goal
          </button>
        )}
        {canEdit && devPage === "notes" && (
          <button
            className="primary"
            style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
            onClick={() => setNoteFormMode({ type: "create", refereeId: referee.id })}
          >
            <FileText size={14} /> Add Note
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Active Goals",       value: goalCounts.Active,    colour: STATUS_COLOR.Active,    onClick: () => { setDevPage("goals"); setGoalFilter("Active"); } },
          { label: "Completed Goals",    value: goalCounts.Completed, colour: STATUS_COLOR.Completed, onClick: () => { setDevPage("goals"); setGoalFilter("Completed"); } },
          { label: "High Priority",      value: highPriCount,         colour: PRIORITY_COLOR.High,    onClick: () => { setDevPage("goals"); setGoalFilter("Active"); } },
          { label: "Development Notes",  value: notes.length,         colour: "#bf5af2",              onClick: () => setDevPage("notes") },
        ].map(({ label, value, colour, onClick }) => (
          <button
            key={label}
            className="ed-summary-card"
            onClick={onClick}
            style={{ cursor: "pointer", textAlign: "left", width: "100%", background: "var(--panel)", border: "1px solid var(--border)" }}
          >
            <div className="ed-summary-number" style={{ color: colour }}>{value}</div>
            <div className="ed-summary-label">{label}</div>
          </button>
        ))}
      </div>

      {/* Page tabs */}
      <PageTabs
        active={devPage}
        goalCount={goalCounts.Active + goalCounts.Completed + goalCounts.Archived}
        noteCount={notes.length}
        onChange={setDevPage}
      />

      {/* ── Goals tab ── */}
      {devPage === "goals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <GoalFilterTabs active={goalFilter} counts={goalCounts} onChange={setGoalFilter} />
            <span className="hint" style={{ fontSize: 12 }}>{visibleGoals.length} goal{visibleGoals.length !== 1 ? "s" : ""}</span>
          </div>
          {visibleGoals.length === 0 ? (
            <GoalEmptyState
              status={goalFilter}
              canEdit={canEdit}
              onCreateGoal={() => setGoalFormMode({ type: "create", defaultRefereeId: referee.id })}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visibleGoals.map(view => (
                <GoalCard
                  key={view.id}
                  view={view}
                  canEdit={canEdit}
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
      )}

      {/* ── Notes tab ── */}
      {devPage === "notes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notes.length === 0 ? (
            <NoteEmptyState
              canEdit={canEdit}
              onCreateNote={() => setNoteFormMode({ type: "create", refereeId: referee.id })}
            />
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span className="hint" style={{ fontSize: 12 }}>{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
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
      )}

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
