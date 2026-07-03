"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Target, CheckCircle, Archive, RotateCcw, Pencil, Trash2, ChevronLeft } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { MemberRecord } from "@/lib/types/members";
import type { DevelopmentGoal, GoalStatus, CreateGoalInput } from "@/lib/types/developmentGoals";
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
  goal,
  canEdit,
  onEdit,
  onComplete,
  onArchive,
  onReopen,
  onDelete,
}: {
  goal: DevelopmentGoal;
  canEdit: boolean;
  onEdit: (goal: DevelopmentGoal) => void;
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
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{goal.title}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
          <StatusBadge status={goal.status} />
          <PriorityBadge priority={goal.priority} />
        </div>
      </div>

      {/* Meta chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <CategoryChip category={goal.category} />
        <span className="hint" style={{ fontSize: 12 }}>Created {fmtDate(goal.createdAt)}</span>
        {goal.targetReviewDate && (
          <span className="hint" style={{ fontSize: 12 }}>
            · Target review {fmtDate(goal.targetReviewDate)}
          </span>
        )}
        {goal.completedAt && (
          <span style={{ fontSize: 12, color: STATUS_COLOR.Completed }}>
            · Completed {fmtDate(goal.completedAt)}
          </span>
        )}
      </div>

      {/* Description */}
      {goal.description && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {goal.description}
        </p>
      )}

      {/* Actions */}
      {canEdit && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 2 }}>
          <button style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }} onClick={() => onEdit(goal)}>
            <Pencil size={12} /> Edit
          </button>
          {goal.status === "Active" && (
            <>
              <button
                style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: STATUS_COLOR.Completed }}
                onClick={() => onComplete(goal.id)}
              >
                <CheckCircle size={12} /> Complete
              </button>
              <button
                style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: "var(--muted)" }}
                onClick={() => onArchive(goal.id)}
              >
                <Archive size={12} /> Archive
              </button>
            </>
          )}
          {(goal.status === "Completed" || goal.status === "Archived") && (
            <button
              style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: STATUS_COLOR.Active }}
              onClick={() => onReopen(goal.id)}
            >
              <RotateCcw size={12} /> Reopen
            </button>
          )}
          {goal.status === "Active" && (
            <button
              style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: "#ff453a", marginLeft: "auto" }}
              onClick={() => {
                if (window.confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) {
                  onDelete(goal.id);
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

// ── Goal form modal ───────────────────────────────────────────────────────────

type GoalFormMode = { type: "create"; refereeId: string } | { type: "edit"; goal: DevelopmentGoal };

function GoalFormModal({
  mode,
  onSave,
  onClose,
}: {
  mode: GoalFormMode;
  onSave: (input: CreateGoalInput | Partial<DevelopmentGoal>, id?: string) => void;
  onClose: () => void;
}) {
  const existing = mode.type === "edit" ? mode.goal : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState<string>(existing?.category ?? GOAL_CATEGORIES[0]);
  const [priority, setPriority] = useState<string>(existing?.priority ?? "Medium");
  const [targetReviewDate, setTargetReviewDate] = useState(existing?.targetReviewDate ?? "");
  const [error, setError] = useState("");

  function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    setError("");

    if (mode.type === "create") {
      onSave({
        refereeId: mode.refereeId,
        title: title.trim(),
        description: description.trim(),
        category: category as CreateGoalInput["category"],
        priority: priority as CreateGoalInput["priority"],
        targetReviewDate: targetReviewDate || null,
      } satisfies CreateGoalInput);
    } else {
      onSave({
        title: title.trim(),
        description: description.trim(),
        category: category as DevelopmentGoal["category"],
        priority: priority as DevelopmentGoal["priority"],
        targetReviewDate: targetReviewDate || null,
      }, existing!.id);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">Development Goal</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>{mode.type === "create" ? "Create Goal" : "Edit Goal"}</h1>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          <label>
            Title <span style={{ color: "#ff453a" }}>*</span>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setError(""); }}
              placeholder="e.g. Improve lead-foot positioning in the paint"
              autoFocus
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

          <label>
            Target review date <span className="hint" style={{ fontSize: 12 }}>(optional)</span>
            <input
              type="date"
              value={targetReviewDate}
              onChange={e => setTargetReviewDate(e.target.value)}
            />
          </label>

          {error && <p style={{ margin: 0, color: "#ff453a", fontSize: 13 }}>{error}</p>}
        </div>

        <div className="action-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit}>
            {mode.type === "create" ? "Create Goal" : "Save Changes"}
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
  goals: DevelopmentGoal[];
  onCreateGoal: (input: CreateGoalInput) => void;
  onUpdateGoal: (id: string, patch: Partial<DevelopmentGoal>) => void;
  onCompleteGoal: (id: string) => void;
  onArchiveGoal: (id: string) => void;
  onReopenGoal: (id: string) => void;
  onDeleteGoal: (id: string) => void;
  onBack: () => void;
}

export function RefereeDevelopmentScreen({
  session,
  referee,
  goals,
  onCreateGoal,
  onUpdateGoal,
  onCompleteGoal,
  onArchiveGoal,
  onReopenGoal,
  onDeleteGoal,
  onBack,
}: RefereeDevelopmentScreenProps) {
  const [filterStatus, setFilterStatus] = useState<GoalStatus>("Active");
  const [formMode, setFormMode] = useState<GoalFormMode | null>(null);

  const canEdit =
    session.activeRole === "educator" ||
    session.activeRole === "admin" ||
    session.activeRole === "super_admin";

  const refGoals = useMemo(
    () => goals.filter(g => g.refereeId === referee.id),
    [goals, referee.id],
  );

  const counts: Record<GoalStatus, number> = useMemo(() => ({
    Active:    refGoals.filter(g => g.status === "Active").length,
    Completed: refGoals.filter(g => g.status === "Completed").length,
    Archived:  refGoals.filter(g => g.status === "Archived").length,
  }), [refGoals]);

  const visible = useMemo(
    () => refGoals.filter(g => g.status === filterStatus),
    [refGoals, filterStatus],
  );

  const handleSaveForm = useCallback(
    (input: CreateGoalInput | Partial<DevelopmentGoal>, id?: string) => {
      if (id) {
        onUpdateGoal(id, input as Partial<DevelopmentGoal>);
      } else {
        onCreateGoal(input as CreateGoalInput);
      }
      setFormMode(null);
    },
    [onCreateGoal, onUpdateGoal],
  );

  const activeCount    = counts.Active;
  const completedCount = counts.Completed;
  const highPriCount   = refGoals.filter(g => g.status === "Active" && g.priority === "High").length;

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
            onClick={() => setFormMode({ type: "create", refereeId: referee.id })}
          >
            <Plus size={14} /> Create Goal
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 28 }}>
        {[
          { label: "Active Goals",     value: activeCount,    colour: STATUS_COLOR.Active },
          { label: "Completed Goals",  value: completedCount, colour: STATUS_COLOR.Completed },
          { label: "High Priority",    value: highPriCount,   colour: PRIORITY_COLOR.High },
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
            onCreateGoal={() => setFormMode({ type: "create", refereeId: referee.id })}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visible.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                canEdit={canEdit}
                onEdit={g => setFormMode({ type: "edit", goal: g })}
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
          onSave={handleSaveForm}
          onClose={() => setFormMode(null)}
        />
      )}
    </div>
  );
}
