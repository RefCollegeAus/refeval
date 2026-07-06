"use client";

import { useState, useMemo } from "react";
import { BookOpen, Trash2, Eye, Search, ArrowUpDown, ChevronLeft, X, HelpCircle, ChevronUp, ChevronDown } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Assignment, CreateAssignmentInput, ReflectionQuestion, QuizQuestion } from "@/lib/types/assignments";
import { REQUIRED_BADGE_STYLE, learningPctColor } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import type { Group } from "@/lib/types/groups";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { RecipientPicker } from "@/components/common/RecipientPicker";
import type { AssignTab } from "@/components/common/RecipientPicker";
import QuizEditor from "@/components/learning/QuizEditor";

interface Props {
  session: RefEvalSession;
  assignments: Assignment[];
  playlists: Playlist[];
  members: MemberRecord[];
  groups: Group[];
  loading: boolean;
  error: string;
  canDelete: boolean;
  onView: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onCreate: (input: CreateAssignmentInput) => Promise<void>;
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

// ── Standalone Quiz Creation Modal ────────────────────────────────────────────

function CreateStandaloneQuizModal({
  members,
  groups,
  onSave,
  onClose,
}: {
  members: MemberRecord[];
  groups: Group[];
  onSave: (input: CreateAssignmentInput) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle]               = useState("");
  const [instructions, setInst]         = useState("");
  const [dueDate, setDueDate]           = useState("");
  const [required, setRequired]         = useState(false);
  const [questions, setQuestions]       = useState<ReflectionQuestion[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const [tab, setTab]           = useState<AssignTab>("users");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selGroups, setSelGroups] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const referees = useMemo(() => members.filter(m => m.role === "referee"), [members]);

  function resolveUserIds(): string[] {
    const ids = new Set<string>();
    selected.forEach(id => ids.add(id));
    groups.filter(g => selGroups.has(g.id)).forEach(g => g.members.forEach(m => ids.add(m.userId)));
    if (tab === "org") referees.forEach(m => ids.add(m.id));
    return Array.from(ids);
  }

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
    setErr("");
    if (!title.trim()) { setErr("Title is required."); return; }
    if (quizQuestions.length === 0) { setErr("Add at least one quiz question."); return; }
    const userIds = resolveUserIds();
    if (userIds.length === 0) { setErr("No referees selected."); return; }
    setSaving(true);
    try {
      await onSave({
        playlistId: null,
        title: title.trim(),
        instructions: instructions.trim(),
        dueDate: dueDate || null,
        required,
        questions: questions.filter(q => q.text.trim()),
        quizQuestions,
        userIds,
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to create quiz assignment.");
      setSaving(false);
    }
  }

  const resolvedCount = resolveUserIds().length;

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 580, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-title" style={{ flexShrink: 0 }}>
          <div>
            <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <HelpCircle size={12} /> Standalone Quiz
            </p>
            <h1 style={{ fontSize: 20, margin: 0 }}>New Quiz Assignment</h1>
          </div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>

            <label>
              Assignment Title *
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Offside Rule Quiz" autoFocus />
            </label>

            <label>
              Instructions <span className="hint">(optional)</span>
              <textarea
                value={instructions}
                onChange={e => setInst(e.target.value)}
                rows={3}
                placeholder="What should the referee focus on?"
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "end" }}>
              <label>
                Due Date <span className="hint">(optional)</span>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", paddingBottom: 8 }}>
                <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }} />
                <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>Required</span>
              </label>
            </div>

            {/* Reflection questions */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Reflection Questions <span className="hint" style={{ fontWeight: 400 }}>(optional)</span>
                </div>
                <button type="button" style={{ fontSize: 12, padding: "3px 10px", display: "flex", alignItems: "center", gap: 4 }} onClick={addQuestion}>
                  + Add
                </button>
              </div>
              {questions.length === 0 ? (
                <p className="hint" style={{ fontSize: 12, margin: 0 }}>No reflection questions — referees go straight to the quiz.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {questions.map((q, i) => (
                    <div key={q.id} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 }}>
                        <button type="button" onClick={() => moveQuestion(q.id, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: "1px 2px", color: "var(--muted)", opacity: i === 0 ? 0.3 : 1 }} title="Move up"><ChevronUp size={11} /></button>
                        <button type="button" onClick={() => moveQuestion(q.id, 1)} disabled={i === questions.length - 1} style={{ background: "none", border: "none", cursor: i === questions.length - 1 ? "default" : "pointer", padding: "1px 2px", color: "var(--muted)", opacity: i === questions.length - 1 ? 0.3 : 1 }} title="Move down"><ChevronDown size={11} /></button>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}.</span>
                      <input
                        value={q.text}
                        onChange={e => updateQuestion(q.id, e.target.value)}
                        placeholder={`Question ${i + 1}…`}
                        style={{ flex: 1, fontSize: 13 }}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", flexShrink: 0, fontSize: 11, color: q.required ? "#fca5a5" : "var(--muted)", whiteSpace: "nowrap" }} title="Mark as required">
                        <input type="checkbox" checked={q.required} onChange={() => toggleRequired(q.id)} style={{ width: 11, height: 11, accentColor: "var(--accent)", cursor: "pointer" }} />
                        Req
                      </label>
                      <button type="button" onClick={() => removeQuestion(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px", flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quiz questions — required for standalone */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                <HelpCircle size={13} /> Quiz Questions *
              </div>
              {quizQuestions.length === 0 && (
                <p className="hint" style={{ fontSize: 12, margin: "0 0 8px" }}>Add at least one question.</p>
              )}
              <QuizEditor questions={quizQuestions} onChange={setQuizQuestions} />
            </div>

            <RecipientPicker
              members={members}
              groups={groups}
              tab={tab}
              setTab={setTab}
              selected={selected}
              setSelected={setSelected}
              selGroups={selGroups}
              setSelGroups={setSelGroups}
            />
          </div>
        </div>

        <div style={{ flexShrink: 0, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          {err && <p className="danger-text" style={{ margin: "0 0 10px" }}>{err}</p>}
          <div className="action-row">
            <button onClick={onClose}>Cancel</button>
            <button className="primary" onClick={handleSave} disabled={saving}>
              {saving
                ? "Creating…"
                : `Create & assign to ${resolvedCount > 0 ? resolvedCount : ""} referee${resolvedCount !== 1 ? "s" : ""}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AssignmentsScreen({
  session, assignments, playlists, members, groups, loading, error,
  canDelete, onView, onDelete, onCreate, onBack,
}: Props) {
  const [deleting, setDeleting]               = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen]           = useState(false);
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
      return {
        ...a,
        _playlistTitle: playlistTitle(a.playlistId, playlists),
        _userCount: total,
        _completed: completed,
        _pct: pct,
        _statusFilter: sf,
      };
    }),
  [assignments, playlists, now]);

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
      <th
        style={{ textAlign: right ? "right" : "left", padding: "8px 10px", fontWeight: 600, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
        onClick={() => handleSort(col)}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <ArrowUpDown size={11} style={{ opacity: active ? 1 : 0.3, color: active ? "var(--accent)" : undefined }} />
        </span>
      </th>
    );
  }

  const STATUSES: { key: StatusFilter; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "active",    label: "Active" },
    { key: "overdue",   label: "Overdue" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>
      <div className="panel">

        {/* Header */}
        <div className="table-head" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BookOpen size={20} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Organisation</p>
              <h1 style={{ margin: 0, fontSize: 22 }}>Learning Assignments</h1>
              <p className="hint" style={{ margin: "2px 0 0" }}>
                Playlists and standalone quizzes assigned to team members
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {canCreate && (
              <button
                className="primary"
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, padding: "7px 14px" }}
                onClick={() => setCreateOpen(true)}
              >
                <HelpCircle size={13} /> New Quiz
              </button>
            )}
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronLeft size={15} /> Back
            </button>
          </div>
        </div>

        {error && <p className="danger-text">{error}</p>}
        {loading && <div className="loading-state"><span className="loading-spinner" />Loading…</div>}

        {/* Filter bar */}
        {!loading && assignments.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 340 }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search assignments…"
                aria-label="Search assignments"
                style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
              />
            </div>
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" style={{ border: "none", background: "none", padding: "4px 6px", cursor: "pointer" }}>
                <X size={13} />
              </button>
            )}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {STATUSES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={statusFilter === key ? "selected" : ""}
                  style={{
                    fontSize: 12, padding: "5px 10px", borderRadius: 8,
                    color: key === "overdue" && statusFilter === key ? "#ef4444" : undefined,
                  }}
                >
                  {label}
                  {statusCounts[key] > 0 && statusFilter !== key && (
                    <span style={{ marginLeft: 5, fontSize: 11, color: "var(--muted)" }}>{statusCounts[key]}</span>
                  )}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", marginLeft: "auto" }}>
              {filtered.length} of {assignments.length}
            </span>
          </div>
        )}

        {/* Empty states */}
        {!loading && assignments.length === 0 && (
          <div className="empty-state">
            <BookOpen size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No assignments yet</p>
            <p className="hint" style={{ margin: "6px 0 0" }}>
              Open a playlist and click &ldquo;Assign Playlist&rdquo; to create a learning assignment,
              or use <strong>New Quiz</strong> above to create a standalone knowledge quiz.
            </p>
          </div>
        )}

        {!loading && assignments.length > 0 && filtered.length === 0 && (
          <p className="hint" style={{ padding: "16px 0" }}>No assignments match your filters.</p>
        )}

        {filtered.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <SortTh col="title"    label="Assignment" />
                  <SortTh col="playlist" label="Playlist" />
                  <SortTh col="users"    label="Users" right />
                  <SortTh col="pct"      label="Progress" />
                  <SortTh col="due"      label="Due" />
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>Created by</th>
                  <SortTh col="created"  label="Created" />
                  <th style={{ padding: "8px 10px" }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const isOverdue = a._statusFilter === "overdue";
                  const isDone    = a._statusFilter === "completed";
                  const pctColor  = learningPctColor(isDone ? 100 : a._pct);
                  const isQuizOnly = !a.playlistId;
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600 }}>{a.title}</span>
                          {a.required && (
                            <span style={REQUIRED_BADGE_STYLE}>Required</span>
                          )}
                          {isQuizOnly && (
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(99,102,241,.12)", color: "var(--accent)", border: "1px solid rgba(99,102,241,.3)", fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 3 }}>
                              <HelpCircle size={9} /> Quiz
                            </span>
                          )}
                          {isOverdue && (
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(239,68,68,.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,.3)", fontWeight: 700, whiteSpace: "nowrap" }}>
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isQuizOnly
                          ? <span style={{ fontStyle: "italic", color: "var(--muted)", fontSize: 12 }}>Standalone quiz</span>
                          : a._playlistTitle}
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "center" }}>
                        {a._userCount > 0
                          ? <span className="chip" style={{ fontSize: 11 }}>{a._userCount}</span>
                          : <span className="hint">—</span>}
                      </td>
                      <td style={{ padding: "10px 10px", minWidth: 130 }}>
                        {a._userCount > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="lh-progress-bar" style={{ flex: 1 }} aria-hidden="true">
                              <div className="lh-progress-fill" style={{ width: `${a._pct}%`, background: pctColor }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 34, color: pctColor }}>{a._pct}%</span>
                          </div>
                        ) : <span className="hint">—</span>}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap", color: isOverdue ? "#ef4444" : "var(--muted)" }}>
                        {fmt(a.dueDate)}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {memberName(a.assignedBy, members)}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {fmt(a.createdAt)}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <button
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px" }}
                            onClick={() => onView(a.id)}
                          >
                            <Eye size={12} /> View
                          </button>
                          {canDelete && (
                            <button
                              className="danger"
                              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px" }}
                              onClick={() => setPendingDeleteId(a.id)}
                              disabled={deleting === a.id}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateStandaloneQuizModal
          members={members}
          groups={groups}
          onSave={onCreate}
          onClose={() => setCreateOpen(false)}
        />
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
    </div>
  );
}
