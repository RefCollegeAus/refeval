"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, CheckCircle, Archive, RotateCcw, Pencil, Trash2, ChevronLeft, Users, User, UserCheck } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { MemberRecord } from "@/lib/types/members";
import type { DevGoalDef, RefereeGoal, RefereeGoalView, GoalStatus, AssignGoalInput, GoalAssignmentType } from "@/lib/types/developmentGoals";
import { GOAL_CATEGORIES, GOAL_PRIORITIES } from "@/lib/types/developmentGoals";

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

// ── Small shared components ───────────────────────────────────────────────────

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
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
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{view.title}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
          <StatusBadge status={view.status} />
          <PriorityBadge priority={view.priority} />
        </div>
      </div>

      {/* Meta chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <CategoryChip category={view.category} />
        <span className="hint" style={{ fontSize: 12 }}>Created {fmtDate(view.createdAt)}</span>
        {view.targetReviewDate && (
          <span className="hint" style={{ fontSize: 12 }}>
            · Target review {fmtDate(view.targetReviewDate)}
          </span>
        )}
        {view.completedAt && (
          <span style={{ fontSize: 12, color: STATUS_COLOR.Completed }}>
            · Completed {fmtDate(view.completedAt)}
          </span>
        )}
      </div>

      {/* Description */}
      {view.description && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {view.description}
        </p>
      )}

      {/* Referee notes */}
      {view.notes && (
        <div style={{ background: "rgba(165,106,27,.07)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(165,106,27,.2)" }}>
          <p className="hint" style={{ margin: "0 0 2px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{view.notes}</p>
        </div>
      )}

      {/* Actions */}
      {canEdit && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 2 }}>
          <button
            style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
            onClick={() => onEdit(view)}
          >
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

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ status, canEdit, onCreateGoal }: { status: GoalStatus; canEdit: boolean; onCreateGoal?: () => void }) {
  const messages: Record<GoalStatus, { icon: string; heading: string; body: string }> = {
    Active: {
      icon: "🎯",
      heading: "No active development goals",
      body: canEdit
        ? "Create this referee's first development goal to start building their long-term coaching record."
        : "No active development goals have been set yet.",
    },
    Completed: {
      icon: "✅",
      heading: "No completed goals yet",
      body: "Completed goals will appear here once a referee achieves them.",
    },
    Archived: {
      icon: "📦",
      heading: "No archived goals",
      body: "Goals that are no longer active but not yet completed are archived here.",
    },
  };

  const m = messages[status];

  return (
    <div className="panel" style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 36 }}>{m.icon}</span>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{m.heading}</p>
      <p className="hint" style={{ margin: 0, maxWidth: 420, fontSize: 13 }}>{m.body}</p>
      {status === "Active" && canEdit && onCreateGoal && (
        <button className="primary" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }} onClick={onCreateGoal}>
          <Plus size={14} /> Create Goal
        </button>
      )}
    </div>
  );
}

// ── Assign / Edit goal form modal ─────────────────────────────────────────────

type FormMode =
  | { type: "create"; defaultRefereeId: string }
  | { type: "edit"; view: RefereeGoalView };

const ASSIGN_TYPE_OPTIONS: { value: GoalAssignmentType; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: "Individual",       label: "Individual",        hint: "One referee",          icon: <User size={14} /> },
  { value: "SelectedReferees", label: "Selected Referees", hint: "Choose from the list", icon: <UserCheck size={14} /> },
  { value: "Everyone",         label: "Everyone",          hint: "All referees in your organisation", icon: <Users size={14} /> },
];

function GoalFormModal({
  mode,
  refereeMembers,
  totalRefereeCount,
  onSave,
  onClose,
}: {
  mode: FormMode;
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

  const [title, setTitle]       = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState<string>(existing?.category ?? GOAL_CATEGORIES[0]);
  const [priority, setPriority] = useState<string>(existing?.priority ?? "Medium");
  const [targetReviewDate, setTargetReviewDate] = useState(existing?.targetReviewDate ?? "");
  const [notes, setNotes]       = useState(existing?.notes ?? "");

  // Create-only: assignment type
  const [assignType, setAssignType] = useState<GoalAssignmentType>("Individual");
  const [selectedIndividual, setSelectedIndividual] = useState<string>(
    mode.type === "create" ? mode.defaultRefereeId : "",
  );
  const [selectedMultiple, setSelectedMultiple] = useState<Set<string>>(
    mode.type === "create" ? new Set([mode.defaultRefereeId]) : new Set(),
  );

  const [error, setError] = useState("");

  function toggleMulti(id: string) {
    setSelectedMultiple(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function submit() {
    if (!title.trim()) { setError("Title is required."); return; }

    if (mode.type === "create") {
      if (assignType === "Individual" && !selectedIndividual) {
        setError("Please select a referee."); return;
      }
      if (assignType === "SelectedReferees" && selectedMultiple.size === 0) {
        setError("Please select at least one referee."); return;
      }
    }

    setError("");

    const defPatch = {
      title: title.trim(),
      description: description.trim(),
      category: category as DevGoalDef["category"],
      priority: priority as DevGoalDef["priority"],
    };
    const rgPatch = {
      targetReviewDate: targetReviewDate || null,
      notes: notes.trim(),
    };

    if (mode.type === "create") {
      const assignedRefereeIds =
        assignType === "Individual"       ? [selectedIndividual] :
        assignType === "SelectedReferees" ? Array.from(selectedMultiple) :
        [];
      onSave(defPatch, rgPatch, {
        ...defPatch,
        assignmentType: assignType,
        assignedRefereeIds,
        targetReviewDate: targetReviewDate || null,
      });
    } else {
      onSave(defPatch, rgPatch);
    }
  }

  const isCreate = mode.type === "create";

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

          {/* ── Assign-to section (create only) ── */}
          {isCreate && (
            <div>
              <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13 }}>Assign to</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {ASSIGN_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setAssignType(opt.value); setError(""); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      fontSize: 13, padding: "6px 14px", borderRadius: 8,
                      background: assignType === opt.value ? "rgba(10,132,255,.12)" : "transparent",
                      color: assignType === opt.value ? "#0a84ff" : "var(--muted)",
                      border: `1px solid ${assignType === opt.value ? "#0a84ff55" : "var(--border)"}`,
                      fontWeight: assignType === opt.value ? 700 : 400,
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>

              {/* Individual selector */}
              {assignType === "Individual" && (
                <select
                  value={selectedIndividual}
                  onChange={e => setSelectedIndividual(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box" }}
                >
                  <option value="">Select referee…</option>
                  {refereeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              )}

              {/* Multi-select */}
              {assignType === "SelectedReferees" && (
                <div style={{
                  border: "1px solid var(--border)", borderRadius: 8,
                  maxHeight: 180, overflowY: "auto", padding: "4px 0",
                }}>
                  {refereeMembers.length === 0 && (
                    <p className="hint" style={{ padding: "8px 14px", margin: 0, fontSize: 13 }}>No referees in this organisation.</p>
                  )}
                  {refereeMembers.map(m => (
                    <label
                      key={m.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 14px", cursor: "pointer",
                        background: selectedMultiple.has(m.id) ? "rgba(10,132,255,.06)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMultiple.has(m.id)}
                        onChange={() => toggleMulti(m.id)}
                        style={{ flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13 }}>{m.name}</span>
                      <span className="hint" style={{ fontSize: 12, marginLeft: "auto" }}>{m.email}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Everyone hint */}
              {assignType === "Everyone" && (
                <p className="hint" style={{ fontSize: 13, margin: 0 }}>
                  This goal will be assigned to all {totalRefereeCount} referee{totalRefereeCount !== 1 ? "s" : ""} in your organisation. Each will track their own progress independently.
                </p>
              )}
            </div>
          )}

          {/* Edit-mode note */}
          {!isCreate && (
            <p className="hint" style={{ fontSize: 12, margin: 0, padding: "6px 12px", background: "rgba(165,106,27,.07)", borderRadius: 8, border: "1px solid rgba(165,106,27,.2)" }}>
              Changes to title, description, category and priority apply to all referees assigned this goal.
            </p>
          )}

          {/* ── Definition fields ── */}
          <label>
            Title <span style={{ color: "#ff453a" }}>*</span>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setError(""); }}
              placeholder="e.g. Improve lead-foot positioning in the paint"
              autoFocus={!isCreate}
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Additional context, coaching notes, or specific behaviours to target…"
              style={{ resize: "vertical", minHeight: 80 }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              Category
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              Priority
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                {GOAL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>

          {/* ── Per-referee fields ── */}
          <label>
            Target review date <span className="hint" style={{ fontSize: 12 }}>(optional)</span>
            <input
              type="date"
              value={targetReviewDate}
              onChange={e => setTargetReviewDate(e.target.value)}
            />
          </label>

          {!isCreate && (
            <label>
              Coaching notes <span className="hint" style={{ fontSize: 12 }}>(visible to educators only)</span>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Private notes about this referee's progress…"
                style={{ resize: "vertical" }}
              />
            </label>
          )}

          {error && <p style={{ margin: 0, color: "#ff453a", fontSize: 13 }}>{error}</p>}
        </div>

        <div className="action-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit}>
            {isCreate ? "Assign Goal" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filter tab bar ────────────────────────────────────────────────────────────

function FilterTabs({
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

// ── Props and main screen ─────────────────────────────────────────────────────

export interface RefereeDevelopmentScreenProps {
  session: RefEvalSession;
  referee: MemberRecord;
  refereeMembers: MemberRecord[];
  goalViews: RefereeGoalView[];
  onAssignGoal: (input: AssignGoalInput) => void;
  onUpdateGoalDef: (goalId: string, patch: Partial<Pick<DevGoalDef, "title" | "description" | "category" | "priority">>) => void;
  onUpdateRefereeGoal: (id: string, patch: Partial<Pick<RefereeGoal, "targetReviewDate" | "notes">>) => void;
  onCompleteGoal: (id: string) => void;
  onArchiveGoal: (id: string) => void;
  onReopenGoal: (id: string) => void;
  onDeleteGoal: (id: string) => void;
  onBack: () => void;
}

export function RefereeDevelopmentScreen({
  session,
  referee,
  refereeMembers,
  goalViews,
  onAssignGoal,
  onUpdateGoalDef,
  onUpdateRefereeGoal,
  onCompleteGoal,
  onArchiveGoal,
  onReopenGoal,
  onDeleteGoal,
  onBack,
}: RefereeDevelopmentScreenProps) {
  const [filterStatus, setFilterStatus] = useState<GoalStatus>("Active");
  const [formMode, setFormMode] = useState<FormMode | null>(null);

  const canEdit =
    session.activeRole === "educator" ||
    session.activeRole === "admin" ||
    session.activeRole === "super_admin";

  const counts: Record<GoalStatus, number> = useMemo(() => ({
    Active:    goalViews.filter(v => v.status === "Active").length,
    Completed: goalViews.filter(v => v.status === "Completed").length,
    Archived:  goalViews.filter(v => v.status === "Archived").length,
  }), [goalViews]);

  const visible = useMemo(
    () => goalViews.filter(v => v.status === filterStatus),
    [goalViews, filterStatus],
  );

  const handleSaveForm = useCallback(
    (
      defPatch: Pick<DevGoalDef, "title" | "description" | "category" | "priority">,
      rgPatch: Pick<RefereeGoal, "targetReviewDate" | "notes">,
      assignInput?: AssignGoalInput,
    ) => {
      if (assignInput) {
        // Create mode: create def + assignment + referee goals
        onAssignGoal(assignInput);
      } else if (formMode?.type === "edit") {
        // Edit mode: update def and referee goal separately
        onUpdateGoalDef(formMode.view.goalId, defPatch);
        onUpdateRefereeGoal(formMode.view.id, rgPatch);
      }
      setFormMode(null);
    },
    [formMode, onAssignGoal, onUpdateGoalDef, onUpdateRefereeGoal],
  );

  const activeCount    = counts.Active;
  const completedCount = counts.Completed;
  const highPriCount   = goalViews.filter(v => v.status === "Active" && v.priority === "High").length;

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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
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
        {canEdit && (
          <button
            className="primary"
            style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
            onClick={() => setFormMode({ type: "create", defaultRefereeId: referee.id })}
          >
            <Plus size={14} /> Assign Goal
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 28 }}>
        {[
          { label: "Active Goals",    value: activeCount,    colour: STATUS_COLOR.Active },
          { label: "Completed Goals", value: completedCount, colour: STATUS_COLOR.Completed },
          { label: "High Priority",   value: highPriCount,   colour: PRIORITY_COLOR.High },
        ].map(({ label, value, colour }) => (
          <div key={label} className="ed-summary-card">
            <div className="ed-summary-number" style={{ color: colour }}>{value}</div>
            <div className="ed-summary-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs + goal list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <FilterTabs active={filterStatus} counts={counts} onChange={setFilterStatus} />
          <span className="hint" style={{ fontSize: 12 }}>
            {visible.length} goal{visible.length !== 1 ? "s" : ""}
          </span>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            status={filterStatus}
            canEdit={canEdit}
            onCreateGoal={() => setFormMode({ type: "create", defaultRefereeId: referee.id })}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visible.map(view => (
              <GoalCard
                key={view.id}
                view={view}
                canEdit={canEdit}
                onEdit={v => setFormMode({ type: "edit", view: v })}
                onComplete={onCompleteGoal}
                onArchive={onArchiveGoal}
                onReopen={onReopenGoal}
                onDelete={onDeleteGoal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Goal form modal */}
      {formMode && (
        <GoalFormModal
          mode={formMode}
          refereeMembers={refereeMembers}
          totalRefereeCount={refereeMembers.length}
          onSave={handleSaveForm}
          onClose={() => setFormMode(null)}
        />
      )}
    </div>
  );
}
