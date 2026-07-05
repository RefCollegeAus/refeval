"use client";

import React, { useState, useMemo } from "react";
import { BookOpen, UserPlus, Trash2, Edit2, Search, X, ChevronLeft, ChevronDown, ChevronUp, CheckCircle2, ArrowUpDown, MessageSquare, Plus, HelpCircle } from "lucide-react";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import type { Assignment, AssignmentStatus, ReflectionQuestion, QuizQuestion } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import { ASSIGNMENT_STATUSES as ALL_STATUSES, STATUS_COLORS, STATUS_BG, STATUS_BORDER, REQUIRED_BADGE_STYLE, learningPctColor } from "@/lib/types/assignments";
import QuizEditor from "@/components/learning/QuizEditor";

interface Props {
  assignment: Assignment;
  playlist: Playlist | null;
  members: MemberRecord[];
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onUpdate: (id: string, data: { title: string; instructions: string | null; dueDate: string | null; required: boolean; questions?: ReflectionQuestion[]; quizQuestions?: QuizQuestion[] }) => Promise<void>;
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
  onSave,
  onClose,
}: {
  assignment: Assignment;
  onSave: (data: { title: string; instructions: string | null; dueDate: string | null; required: boolean; questions: ReflectionQuestion[]; quizQuestions: QuizQuestion[] }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle]               = useState(assignment.title);
  const [instructions, setInstr]        = useState(assignment.instructions || "");
  const [dueDate, setDueDate]           = useState(assignment.dueDate || "");
  const [required, setRequired]         = useState(assignment.required);
  const [questions, setQuestions]       = useState<ReflectionQuestion[]>(assignment.questions ?? []);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(assignment.quizQuestions ?? []);
  const [saving, setSaving]             = useState(false);
  const [err, setErr]                   = useState("");

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
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 520, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-title" style={{ flexShrink: 0 }}>
          <div>
            <p className="eyebrow">Edit Assignment</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>Update details</h1>
          </div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          <label>
            Title *
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </label>
          <label>
            Instructions <span className="hint">(optional)</span>
            <textarea
              value={instructions}
              onChange={e => setInstr(e.target.value)}
              rows={4}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
          </label>
          <label>
            Due Date <span className="hint">(optional)</span>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={required}
              onChange={e => setRequired(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13 }}>Required assignment</span>
          </label>

          {/* Reflection questions */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Reflection Questions <span className="hint" style={{ fontWeight: 400 }}>(optional)</span>
              </div>
              <button type="button" style={{ fontSize: 12, padding: "3px 10px", display: "flex", alignItems: "center", gap: 4 }} onClick={addQuestion}>
                <Plus size={12} /> Add Question
              </button>
            </div>
            {questions.length === 0 ? (
              <p className="hint" style={{ fontSize: 12, margin: 0 }}>
                No reflection questions. Referees will be able to complete the assignment after watching all clips.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    {/* Reorder */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingTop: 4, flexShrink: 0 }}>
                      <button type="button" onClick={() => moveQuestion(q.id, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: "1px 3px", color: "var(--muted)", opacity: i === 0 ? 0.3 : 1 }} title="Move up"><ChevronUp size={12} /></button>
                      <button type="button" onClick={() => moveQuestion(q.id, 1)} disabled={i === questions.length - 1} style={{ background: "none", border: "none", cursor: i === questions.length - 1 ? "default" : "pointer", padding: "1px 3px", color: "var(--muted)", opacity: i === questions.length - 1 ? 0.3 : 1 }} title="Move down"><ChevronDown size={12} /></button>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--muted)", paddingTop: 10, minWidth: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}.</span>
                    <input
                      value={q.text}
                      onChange={e => updateQuestion(q.id, e.target.value)}
                      placeholder={`Question ${i + 1}…`}
                      style={{ flex: 1, fontSize: 13 }}
                    />
                    {/* Required toggle */}
                    <label style={{ display: "flex", alignItems: "center", gap: 3, paddingTop: 9, cursor: "pointer", flexShrink: 0, fontSize: 11, color: q.required ? "#fca5a5" : "var(--muted)", whiteSpace: "nowrap" }} title="Mark as required">
                      <input type="checkbox" checked={q.required} onChange={() => toggleRequired(q.id)} style={{ width: 12, height: 12, accentColor: "var(--accent)", cursor: "pointer" }} />
                      Req
                    </label>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "6px 4px", flexShrink: 0 }}
                      title="Remove question"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Knowledge quiz */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <HelpCircle size={13} /> Knowledge Quiz <span className="hint" style={{ fontWeight: 400 }}>(optional)</span>
            </div>
            <QuizEditor questions={quizQuestions} onChange={setQuizQuestions} />
          </div>

          {err && <p className="danger-text">{err}</p>}
        </div>
        <div className="action-row" style={{ flexShrink: 0, marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Users Panel ───────────────────────────────────────────────────────────

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
    <div style={{ marginTop: 20 }}>
      <h3 className="ed-section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <UserPlus size={14} /> Add Team Members
      </h3>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search team members…"
          style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
        />
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
        {filtered.length === 0 && (
          <p className="hint" style={{ padding: "10px 12px", margin: 0 }}>No members to add.</p>
        )}
        {filtered.map(m => (
          <label
            key={m.id}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: selected.has(m.id) ? "var(--panel2)" : undefined }}
          >
            <input
              type="checkbox"
              checked={selected.has(m.id)}
              onChange={() => toggle(m.id)}
              style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name || m.email}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
            </div>
            <span className={`role-badge role-${m.role}`} style={{ fontSize: 10, flexShrink: 0 }}>{m.role}</span>
          </label>
        ))}
      </div>
      {err && <p className="danger-text" style={{ margin: "6px 0 0" }}>{err}</p>}
      {selected.size > 0 && (
        <button
          className="primary"
          style={{ marginTop: 10, fontSize: 13 }}
          onClick={handleAdd}
          disabled={saving}
        >
          {saving ? "Adding…" : `Add ${selected.size} member${selected.size !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}

// ── Assignment Detail Screen ──────────────────────────────────────────────────

export function AssignmentDetailScreen({
  assignment, playlist, members, canEdit, canDelete,
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

  return (
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>

      {/* Header panel */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="table-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BookOpen size={20} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Learning Assignment</p>
              <h1 style={{ margin: 0, fontSize: 22, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {assignment.title}
                {assignment.required && (
                  <span style={REQUIRED_BADGE_STYLE}>Required</span>
                )}
              </h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {canEdit && (
              <button style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }} onClick={() => setEditOpen(true)}>
                <Edit2 size={13} /> Edit
              </button>
            )}
            {canDelete && (
              <button className="danger" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }} onClick={() => setConfirmDelete(true)} disabled={deleting}>
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronLeft size={15} /> Back
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 14, padding: "12px 14px", background: "var(--panel2)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Playlist</div>
            <div style={{ fontWeight: 600 }}>{playlist?.title ?? "Unknown playlist"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Due Date</div>
            <div style={{ fontWeight: 600 }}>{fmt(assignment.dueDate)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Clips</div>
            <div style={{ fontWeight: 600 }}>{totalClips > 0 ? totalClips : "—"}</div>
          </div>
        </div>

        {/* Progress summary */}
        {total > 0 && (
          <div style={{ marginTop: 12 }}>
            {/* Stat chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {([
                { label: "Assigned",    value: total,          color: "var(--muted)",          bg: "var(--panel2)" },
                { label: "In Progress", value: inProgressCount, color: STATUS_COLORS.Started,   bg: STATUS_BG.Started },
                { label: "Not Started", value: notStartedCount, color: STATUS_COLORS.Assigned,  bg: STATUS_BG.Assigned },
                { label: "Completed",   value: completedCount,  color: STATUS_COLORS.Completed, bg: STATUS_BG.Completed },
              ] as const).map(({ label, value, color, bg }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: bg, border: "1px solid var(--border)", fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color }}>{value}</span>
                  <span style={{ color: "var(--muted)" }}>{label}</span>
                </div>
              ))}
            </div>
            {/* Overall clip progress bar */}
            {totalClips > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                  <span>Overall clip progress</span>
                  <span style={{ fontWeight: 700, color: learningPctColor(overallPct) }}>{overallPct}%</span>
                </div>
                <div className="lh-progress-bar">
                  <div className="lh-progress-fill" style={{ width: `${overallPct}%`, background: learningPctColor(overallPct) }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                  {overallWatched} of {overallPossible} clips watched across all referees
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {assignment.instructions && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--panel2)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Instructions</div>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{assignment.instructions}</p>
          </div>
        )}

        {/* Quiz summary */}
        {assignment.quizQuestions.length > 0 && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--panel2)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <HelpCircle size={11} /> Knowledge Quiz ({assignment.quizQuestions.length} question{assignment.quizQuestions.length !== 1 ? "s" : ""})
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {assignment.assignmentUsers.filter(u => u.quizSubmittedAt).length} of {assignment.assignmentUsers.length} submitted
              {(() => {
                const submitted = assignment.assignmentUsers.filter(u => u.quizScore !== null && u.quizTotal);
                if (submitted.length === 0) return null;
                const avg = Math.round(submitted.reduce((s, u) => s + (u.quizScore! / u.quizTotal!) * 100, 0) / submitted.length);
                return <span style={{ marginLeft: 8, color: learningPctColor(avg), fontWeight: 700 }}>avg {avg}%</span>;
              })()}
            </div>
          </div>
        )}

        {/* Reflection questions summary */}
        {assignment.questions.length > 0 && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--panel2)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <MessageSquare size={11} /> Reflection Questions ({assignment.questions.length})
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
              {assignment.questions.map(q => (
                <li key={q.id} style={{ fontSize: 13 }}>{q.text}</li>
              ))}
            </ol>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
              {assignment.assignmentUsers.filter(u => u.reflectionSubmittedAt).length} of {assignment.assignmentUsers.length} submitted
            </div>
          </div>
        )}
      </div>

      {/* Users panel */}
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h2 className="ed-section-title" style={{ margin: 0 }}>Assigned Members</h2>
          {assignment.assignmentUsers.length > 1 && (
            <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
              {(["status", "progress", "name"] as ProgressSort[]).map(key => (
                <button
                  key={key}
                  onClick={() => handleProgressSort(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 10px", borderRadius: 6, fontSize: 12,
                    background: progressSort === key ? "var(--panel2)" : "transparent",
                    border: `1px solid ${progressSort === key ? "var(--accent)" : "var(--border)"}`,
                    color: progressSort === key ? "var(--accent)" : "var(--muted)",
                    fontWeight: progressSort === key ? 700 : 400,
                  }}
                >
                  {key === "status" ? "Status" : key === "progress" ? "Progress" : "Name"}
                  <ArrowUpDown size={10} style={{ opacity: progressSort === key ? 1 : 0.4 }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {assignment.assignmentUsers.length === 0 ? (
          <p className="hint">No members assigned yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>Status</th>
                  {totalClips > 0 && <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, minWidth: 140 }}>Progress</th>}
                  {assignment.questions.length > 0 && <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>Reflection</th>}
                  {assignment.quizQuestions.length > 0 && <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>Quiz</th>}
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>Assigned</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>Completed</th>
                  {canEdit && <th style={{ padding: "8px 10px" }} />}
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map(au => {
                  const m = memberOf(au.userId);
                  const isUpdating = updatingStatus === au.id;
                  const isRemoving = removing === au.id;
                  const statusColor = STATUS_COLORS[au.status];
                  const statusBg = STATUS_BG[au.status];
                  const watchedCount = au.watchedClipIds.length;
                  const clipPct = totalClips > 0 ? Math.round((watchedCount / totalClips) * 100) : 0;
                  const pctColor = learningPctColor(clipPct);
                  return (
                    <React.Fragment key={au.id}>
                    <tr style={{ borderBottom: expandedResponsesId === au.id ? "none" : "1px solid var(--border)", opacity: isRemoving ? 0.5 : 1 }}>
                      <td style={{ padding: "10px 10px" }}>
                        <div style={{ fontWeight: 600 }}>{m?.name || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{m?.email || "—"}</div>
                      </td>
                      <td style={{ padding: "10px 10px" }}>
                        {canEdit && onUpdateStatus ? (
                          <div style={{ position: "relative", display: "inline-block" }}>
                            <select
                              value={pendingStatus?.auId === au.id ? pendingStatus.status : au.status}
                              disabled={isUpdating}
                              onChange={e => setPendingStatus({ auId: au.id, status: e.target.value as AssignmentStatus, memberName: m?.name || "this referee" })}
                              aria-label={`Learning status for ${m?.name || "this referee"}`}
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "4px 22px 4px 8px",
                                borderRadius: 6,
                                width: "auto",
                                color: statusColor,
                                background: statusBg,
                                border: `1px solid ${STATUS_BORDER[au.status]}`,
                                opacity: isUpdating ? 0.5 : 1,
                                cursor: isUpdating ? "default" : "pointer",
                                appearance: "none",
                                WebkitAppearance: "none",
                              }}
                            >
                              {ALL_STATUSES.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <ChevronDown
                              size={10}
                              style={{
                                position: "absolute",
                                right: 6,
                                top: "50%",
                                transform: "translateY(-50%)",
                                pointerEvents: "none",
                                color: statusColor,
                                opacity: 0.7,
                              }}
                            />
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>
                            {au.status}
                          </span>
                        )}
                      </td>
                      {totalClips > 0 && (
                        <td style={{ padding: "10px 10px", minWidth: 140 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="lh-progress-bar" style={{ flex: 1 }} aria-hidden="true">
                              <div className="lh-progress-fill" style={{ width: `${clipPct}%`, background: pctColor }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, color: pctColor }}>{clipPct}%</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                            {watchedCount} of {totalClips} clips
                          </div>
                        </td>
                      )}
                      {assignment.questions.length > 0 && (
                        <td style={{ padding: "10px 10px", whiteSpace: "nowrap", fontSize: 12 }}>
                          {au.reflectionSubmittedAt ? (
                            <button
                              style={{ fontSize: 12, padding: "3px 10px", display: "flex", alignItems: "center", gap: 4 }}
                              onClick={() => setExpandedResponsesId(expandedResponsesId === au.id ? null : au.id)}
                            >
                              <MessageSquare size={11} />
                              {expandedResponsesId === au.id ? "Hide" : "View"}
                            </button>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                      )}
                      {assignment.quizQuestions.length > 0 && (
                        <td style={{ padding: "10px 10px", whiteSpace: "nowrap", fontSize: 12 }}>
                          {au.quizSubmittedAt ? (
                            <button
                              style={{ fontSize: 12, padding: "3px 10px", display: "flex", alignItems: "center", gap: 4 }}
                              onClick={() => setExpandedQuizId(expandedQuizId === au.id ? null : au.id)}
                            >
                              <HelpCircle size={11} />
                              {au.quizScore !== null && au.quizTotal ? `${au.quizScore}/${au.quizTotal}` : "View"}
                              {expandedQuizId === au.id ? " ▲" : " ▼"}
                            </button>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                      )}
                      <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap", fontSize: 12, minWidth: 90 }}>
                        {fmt(au.assignedAt)}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap", fontSize: 12, minWidth: 90 }}>
                        {au.completedAt ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e", fontWeight: 600 }}>
                            <CheckCircle2 size={12} />
                            {fmt(au.completedAt)}
                          </span>
                        ) : (
                          <span className="hint">—</span>
                        )}
                      </td>
                      {canEdit && (
                        <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            onClick={() => setPendingRemoveId(au.id)}
                            disabled={isRemoving}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px 4px", display: "flex", alignItems: "center" }}
                            title="Remove from assignment"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                    {/* Expanded reflection responses */}
                    {expandedResponsesId === au.id && au.reflectionSubmittedAt && au.reflectionResponses && (
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--panel2)" }}>
                        <td colSpan={99} style={{ padding: "12px 14px" }}>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                            <MessageSquare size={11} />
                            Reflection submitted {fmt(au.reflectionSubmittedAt)}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {assignment.questions.map((q, qi) => {
                              const resp = au.reflectionResponses!.find(r => r.questionId === q.id);
                              return (
                                <div key={q.id}>
                                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{qi + 1}. {q.text}</div>
                                  <div style={{ fontSize: 13, color: resp?.response ? "var(--text)" : "var(--muted)", whiteSpace: "pre-wrap", paddingLeft: 14 }}>
                                    {resp?.response || <em>No response</em>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Expanded quiz review */}
                    {expandedQuizId === au.id && au.quizSubmittedAt && (
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--panel2)" }}>
                        <td colSpan={99} style={{ padding: "12px 14px" }}>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                            <HelpCircle size={11} />
                            Quiz submitted {fmt(au.quizSubmittedAt)}
                            {au.quizAttemptCount > 1 && <span>({au.quizAttemptCount} attempts)</span>}
                            {au.quizScore !== null && au.quizTotal != null && (
                              <span style={{ fontWeight: 700, color: learningPctColor(Math.round((au.quizScore / au.quizTotal) * 100)) }}>
                                {au.quizScore}/{au.quizTotal} ({Math.round((au.quizScore / au.quizTotal) * 100)}%)
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {assignment.quizQuestions.sort((a, b) => a.displayOrder - b.displayOrder).map((q, qi) => {
                              const ans = au.quizAnswers?.find(a => a.questionId === q.id);
                              const sel = ans?.selectedAnswerIndex ?? null;
                              const correct = sel === q.correctAnswerIndex;
                              return (
                                <div key={q.id}>
                                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                                    {qi + 1}. {q.prompt}
                                    {sel !== null ? (
                                      <span style={{ fontSize: 11, color: correct ? "#22c55e" : "#ef4444" }}>{correct ? "✓" : "✗"}</span>
                                    ) : (
                                      <span style={{ fontSize: 11, color: "var(--muted)" }}>no answer</span>
                                    )}
                                  </div>
                                  <div style={{ paddingLeft: 14, display: "flex", flexDirection: "column", gap: 3 }}>
                                    {q.answers.map((a, aIdx) => {
                                      const isSelected = sel === aIdx;
                                      const isCorrectAnswer = aIdx === q.correctAnswerIndex;
                                      return (
                                        <div key={aIdx} style={{
                                          fontSize: 12, padding: "3px 8px", borderRadius: 5,
                                          background: isCorrectAnswer ? "rgba(34,197,94,.1)" : isSelected && !correct ? "rgba(239,68,68,.1)" : "transparent",
                                          border: `1px solid ${isCorrectAnswer ? "rgba(34,197,94,.3)" : isSelected && !correct ? "rgba(239,68,68,.3)" : "transparent"}`,
                                          color: isSelected ? "var(--foreground)" : "var(--muted)",
                                        }}>
                                          {isSelected ? "→ " : "   "}{a}
                                          {isCorrectAnswer && <span style={{ color: "#22c55e", marginLeft: 4 }}>✓</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pending status change confirm */}
        {pendingStatus && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
              Set <strong>{pendingStatus.memberName}</strong>&apos;s status to <strong>{pendingStatus.status}</strong>? This overrides their recorded progress.
            </span>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                className="primary"
                style={{ fontSize: 12, padding: "5px 14px" }}
                disabled={!!updatingStatus}
                onClick={confirmStatusChange}
              >
                {updatingStatus ? "Saving…" : "Confirm"}
              </button>
              <button
                style={{ fontSize: 12, padding: "5px 14px" }}
                onClick={() => setPendingStatus(null)}
              >
                Cancel
              </button>
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
      </div>

      {/* Edit modal */}
      {editOpen && (
        <EditModal
          assignment={assignment}
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
    </div>
  );
}
