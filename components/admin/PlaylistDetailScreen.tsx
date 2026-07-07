"use client";

import { useEffect, useMemo, useState } from "react";
import { ListVideo, ChevronLeft, ChevronUp, ChevronDown, CheckCircle2, Trash2, Edit2, Users, BookOpen, MessageSquare, AlertTriangle, HelpCircle } from "lucide-react";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import type { Playlist, PlaylistItem } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import type { Assignment, CreateAssignmentInput, ReflectionQuestion, QuizQuestion } from "@/lib/types/assignments";
import { REQUIRED_BADGE_STYLE, STATUS_COLORS } from "@/lib/types/assignments";
import type { Group } from "@/lib/types/groups";
import { RecipientPicker } from "@/components/common/RecipientPicker";
import type { AssignTab } from "@/components/common/RecipientPicker";
import { ClipPreview, ClipRow, splitCategory, slotName, outcomeClass } from "@/components/common/ClipPreview";
import QuizEditor from "@/components/learning/QuizEditor";

interface Props {
  playlist: Playlist;
  reviews: ReviewRecord[];
  tags: CodedTag[];
  onBack: () => void;
  onOpenReview: (reviewId: string) => void;
  onUpdateMeta: (id: string, title: string, description: string) => Promise<void>;
  onUpdatePositions: (items: PlaylistItem[]) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  canEdit?: boolean;
  canDelete?: boolean;
  // Assign playlist
  members?: MemberRecord[];
  groups?: Group[];
  canAssign?: boolean;
  onCreateAssignment?: (input: CreateAssignmentInput) => Promise<void>;
  onAddToAssignment?: (assignmentId: string, userIds: string[]) => Promise<{ added: number; skipped: number }>;
  // Assignment history (read-only list, management only)
  assignments?: Assignment[];
  onViewAssignment?: (assignmentId: string) => void;
  // Per-clip learning note editing
  onUpdateItemNote?: (itemId: string, note: string | null) => Promise<void>;
}

// ── Edit metadata modal ───────────────────────────────────────────────────────

function EditMetaModal({
  playlist,
  onSave,
  onClose,
}: {
  playlist: Playlist;
  onSave: (title: string, description: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave() {
    if (!title.trim()) { setErr("Title is required."); return; }
    setSaving(true);
    setErr("");
    try {
      await onSave(title.trim(), description.trim());
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">Edit Playlist</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>Update details</h1>
          </div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          <label>
            Title *
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </label>
          <label>
            Description <span className="hint">(optional)</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
          </label>
          {err && <p className="danger-text">{err}</p>}
        </div>
        <div className="action-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign Playlist Modal ─────────────────────────────────────────────────────

type AssignMode = "new" | "existing";



function AssignModal({
  playlist,
  members,
  groups,
  assignments,
  onSave,
  onAddToExisting,
  onClose,
}: {
  playlist: Playlist;
  members: MemberRecord[];
  groups: Group[];
  assignments: Assignment[];
  onSave: (input: CreateAssignmentInput) => Promise<void>;
  onAddToExisting: (assignmentId: string, userIds: string[]) => Promise<{ added: number; skipped: number }>;
  onClose: () => void;
}) {
  const hasExisting = assignments.length > 0;
  const [mode, setMode]           = useState<AssignMode>("new");

  // New assignment fields
  const [title, setTitle]         = useState(playlist.title);
  const [instructions, setInst]   = useState("");
  const [dueDate, setDueDate]     = useState("");
  const [required, setRequired]         = useState(false);
  const [questions, setQuestions]       = useState<ReflectionQuestion[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

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

  // Existing assignment fields
  const [selAssignment, setSelAssignment] = useState<string>("");

  // Shared recipient state
  const [tab, setTab]             = useState<AssignTab>("users");
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [selGroups, setSelGroups] = useState<Set<string>>(new Set());

  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");
  const [success, setSuccess]     = useState("");

  const referees = useMemo(() => members.filter(m => m.role === "referee"), [members]);

  // IDs already assigned to the selected existing assignment.
  const alreadyAssignedIds = useMemo<Set<string> | undefined>(() => {
    if (mode !== "existing" || !selAssignment) return undefined;
    const a = assignments.find(x => x.id === selAssignment);
    return a ? new Set(a.assignmentUsers.map(u => u.userId)) : new Set();
  }, [mode, selAssignment, assignments]);

  function resolveUserIds(): string[] {
    const ids = new Set<string>();
    selected.forEach(id => ids.add(id));
    // In existing mode, only add eligible group members (skip already-assigned).
    groups.filter(g => selGroups.has(g.id)).forEach(g =>
      g.members.forEach(m => {
        if (!alreadyAssignedIds || !alreadyAssignedIds.has(m.userId)) ids.add(m.userId);
      }),
    );
    if (tab === "org") {
      referees.forEach(m => {
        if (!alreadyAssignedIds || !alreadyAssignedIds.has(m.id)) ids.add(m.id);
      });
    }
    return Array.from(ids);
  }

  function resetRecipients() {
    setTab("users");
    setSelected(new Set());
    setSelGroups(new Set());
  }

  function switchMode(m: AssignMode) {
    setMode(m);
    setErr("");
    setSuccess("");
    resetRecipients();
  }

  async function handleSave() {
    setErr(""); setSuccess("");
    if (mode === "new") {
      if (!title.trim()) { setErr("Title is required."); return; }
      const userIds = resolveUserIds();
      if (userIds.length === 0) { setErr("No referees selected."); return; }
      setSaving(true);
      try {
        await onSave({ playlistId: playlist.id, simulatorSessionId: null, title: title.trim(), instructions: instructions.trim(), dueDate: dueDate || null, required, quizAllowRetakes: true, questions: questions.filter(q => q.text.trim()), quizQuestions, userIds });
        onClose();
      } catch (e: any) {
        setErr(e?.message || "Failed to create assignment.");
        setSaving(false);
      }
    } else {
      if (!selAssignment) { setErr("Please select an existing assignment."); return; }
      const userIds = resolveUserIds();
      if (userIds.length === 0) { setErr("No referees selected."); return; }
      setSaving(true);
      try {
        const { added, skipped } = await onAddToExisting(selAssignment, userIds);
        resetRecipients();
        setSaving(false);
        const msg = skipped > 0
          ? `Added ${added} referee${added !== 1 ? "s" : ""}. ${skipped} were already assigned.`
          : `Added ${added} referee${added !== 1 ? "s" : ""}.`;
        setSuccess(msg);
      } catch (e: any) {
        setErr(e?.message || "Failed to add users.");
        setSaving(false);
      }
    }
  }

  const resolvedCount = resolveUserIds().length;

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-title" style={{ flexShrink: 0 }}>
          <div>
            <p className="eyebrow">Playlist</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>Assign Playlist</h1>
          </div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Mode toggle — only shown when existing assignments exist */}
        {hasExisting && (
          <div style={{ flexShrink: 0, display: "flex", gap: 6, marginTop: 12, marginBottom: 4 }}>
            <button
              style={{ fontSize: 12, padding: "5px 14px", background: mode === "new" ? "var(--accent)" : undefined, color: mode === "new" ? "#fff" : undefined }}
              onClick={() => switchMode("new")}
            >
              Create new assignment
            </button>
            <button
              style={{ fontSize: 12, padding: "5px 14px", background: mode === "existing" ? "var(--accent)" : undefined, color: mode === "existing" ? "#fff" : undefined }}
              onClick={() => switchMode("existing")}
            >
              Add to existing assignment
            </button>
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1, paddingTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>

            {/* ── Create new mode ── */}
            {mode === "new" && (
              <>
                <label>
                  Assignment Title *
                  <input value={title} onChange={e => setTitle(e.target.value)} autoFocus={!hasExisting} />
                </label>
                <label>
                  Instructions <span className="hint">(optional)</span>
                  <textarea value={instructions} onChange={e => setInst(e.target.value)} rows={3} placeholder="What should the referee focus on?" style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }} />
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
                    <p className="hint" style={{ fontSize: 12, margin: 0 }}>No questions — referees complete after watching all clips.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {questions.map((q, i) => (
                        <div key={q.id} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          {/* Reorder */}
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
                          {/* Required toggle */}
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
                {/* Knowledge quiz */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                    <HelpCircle size={13} /> Knowledge Quiz <span className="hint" style={{ fontWeight: 400 }}>(optional)</span>
                  </div>
                  <QuizEditor questions={quizQuestions} onChange={setQuizQuestions} />
                </div>
              </>
            )}

            {/* ── Add to existing mode ── */}
            {mode === "existing" && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Select Assignment *</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", marginBottom: 4, paddingRight: 2 }}>
                  {assignments.map(a => {
                    const completedCount = a.assignmentUsers.filter(u => u.status === "Completed").length;
                    const totalUsers     = a.assignmentUsers.length;
                    const isSelected     = selAssignment === a.id;
                    const displayTitle   = a.title.trim() || `Assignment created ${fmtShort(a.createdAt)}`;
                    return (
                      <div
                        key={a.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelAssignment(a.id); resetRecipients(); setErr(""); setSuccess(""); }}
                        onKeyDown={e => e.key === "Enter" && setSelAssignment(a.id)}
                        style={{
                          border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                          borderRadius: 10,
                          padding: "10px 14px",
                          cursor: "pointer",
                          background: isSelected ? "rgba(165,106,27,.06)" : "var(--panel2)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          outline: "none",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayTitle}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 11, color: "var(--muted)" }}>
                          <span>{totalUsers} user{totalUsers !== 1 ? "s" : ""} assigned</span>
                          <span>{completedCount}/{totalUsers} completed</span>
                          {a.dueDate && <span>Due {fmtShort(a.dueDate)}</span>}
                          <span>Created {fmtShort(a.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {success && (
                  <div style={{ background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.3)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#22c55e", marginTop: 4 }}>
                    {success}
                  </div>
                )}
              </div>
            )}

            {/* Recipient picker — shared by both modes; in existing mode filters to eligible only */}
            <RecipientPicker
              members={members}
              groups={groups}
              tab={tab}
              setTab={setTab}
              selected={selected}
              setSelected={setSelected}
              selGroups={selGroups}
              setSelGroups={setSelGroups}
              alreadyAssignedIds={alreadyAssignedIds}
            />
          </div>
        </div>

        <div style={{ flexShrink: 0, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          {err && <p className="danger-text" style={{ margin: "0 0 10px" }}>{err}</p>}
          <div className="action-row">
            <button onClick={onClose}>{success ? "Done" : "Cancel"}</button>
            {!success && (
              <button className="primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? mode === "new" ? "Assigning…" : "Adding…"
                  : mode === "new"
                    ? `Assign to ${resolvedCount > 0 ? resolvedCount : ""} referee${resolvedCount !== 1 ? "s" : ""}`
                    : `Add ${resolvedCount > 0 ? resolvedCount : ""} referee${resolvedCount !== 1 ? "s" : ""}`
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assignment History Modal ──────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShort(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function AssignmentsHistoryModal({
  playlistTitle,
  assignments,
  onViewAssignment,
  onClose,
}: {
  playlistTitle: string;
  assignments: Assignment[];
  onViewAssignment?: (assignmentId: string) => void;
  onClose: () => void;
}) {
  // Most-recently-created first
  const sorted = useMemo(
    () => [...assignments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [assignments],
  );

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-title" style={{ flexShrink: 0 }}>
          <div>
            <p className="eyebrow">Playlist</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>Assignments — {playlistTitle}</h1>
            <p className="hint" style={{ margin: "2px 0 0" }}>
              {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} created from this playlist
            </p>
          </div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginTop: 12 }}>
          {sorted.length === 0 ? (
            <p className="hint" style={{ padding: "16px 0", margin: 0 }}>No assignments yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sorted.map(a => {
                const completedCount = a.assignmentUsers.filter(u => u.status === "Completed").length;
                const totalUsers     = a.assignmentUsers.length;
                const allDone        = totalUsers > 0 && completedCount === totalUsers;
                return (
                  <div
                    key={a.id}
                    style={{
                      background: "var(--panel2)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.title}
                        {a.required && (
                          <span style={{ ...REQUIRED_BADGE_STYLE, marginLeft: 6, verticalAlign: "middle" }}>Required</span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 16px", marginTop: 4 }}>
                        <span className="hint" style={{ fontSize: 11 }}>
                          {totalUsers} user{totalUsers !== 1 ? "s" : ""}
                        </span>
                        <span style={{ fontSize: 11, color: allDone ? "#22c55e" : "var(--muted)" }}>
                          {completedCount}/{totalUsers} completed
                        </span>
                        {a.dueDate && (
                          <span className="hint" style={{ fontSize: 11 }}>Due {fmt(a.dueDate)}</span>
                        )}
                        <span className="hint" style={{ fontSize: 11 }}>Created {fmt(a.createdAt)}</span>
                      </div>
                    </div>
                    {onViewAssignment && (
                      <button
                        style={{ fontSize: 12, padding: "5px 12px", flexShrink: 0, whiteSpace: "nowrap" }}
                        onClick={() => { onViewAssignment(a.id); onClose(); }}
                      >
                        View Assignment
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="action-row" style={{ flexShrink: 0, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Playlist Detail Screen ────────────────────────────────────────────────────

type PlaylistClipRow = ClipRow & { itemId: string; creatorNote: string | null };

export function PlaylistDetailScreen({
  playlist,
  reviews,
  tags,
  onBack,
  onOpenReview,
  onUpdateMeta,
  onUpdatePositions,
  onRemoveItem,
  onDelete,
  onArchive,
  canEdit = true,
  canDelete = true,
  members,
  groups = [],
  canAssign = false,
  onCreateAssignment,
  onAddToAssignment,
  onViewAssignment,
  assignments = [],
  onUpdateItemNote,
}: Props) {
  // Local ordered items — sync from playlist prop
  const [localItems, setLocalItems] = useState<PlaylistItem[]>(playlist.items);
  useEffect(() => {
    setLocalItems(playlist.items);
  }, [playlist.items]);

  const [previewIndex, setPreviewIndex] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignedUsersOpen, setAssignedUsersOpen] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingRemoveItem, setPendingRemoveItem] = useState<{ itemId: string; idx: number } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  // Build lookup maps
  const reviewMap = useMemo(() => {
    const m = new Map<string, ReviewRecord>();
    for (const r of reviews) m.set(r.id, r);
    return m;
  }, [reviews]);

  const tagMap = useMemo(() => {
    const m = new Map<string, CodedTag>();
    for (const t of tags) m.set(t.id, t);
    return m;
  }, [tags]);

  // Derive ClipRows from local item order
  const clipRows = useMemo<PlaylistClipRow[]>(() => {
    const rows: PlaylistClipRow[] = [];
    for (const item of localItems) {
      const review = reviewMap.get(item.reviewId);
      const tag = tagMap.get(item.tagId);
      if (!review || !tag) continue;
      const refName = tag.refereeTarget !== "All Referees"
        ? slotName(tag.refereeTarget, review)
        : [review.referee1Name, review.referee2Name, review.referee3Name].filter(Boolean).join(", ") || "All Officials";
      const [categoryGroup, subtype] = splitCategory(tag.category);
      rows.push({ tag, review, refereeName: refName, categoryGroup, subtype, itemId: item.id, creatorNote: item.creatorNote ?? null });
    }
    return rows;
  }, [localItems, reviewMap, tagMap]);

  const duplicateTagIds = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const item of localItems) {
      if (seen.has(item.tagId)) dupes.add(item.tagId);
      else seen.add(item.tagId);
    }
    return dupes;
  }, [localItems]);

  const safePreviewIndex = Math.min(previewIndex, Math.max(0, clipRows.length - 1));
  const previewClip = clipRows.length > 0 ? clipRows[safePreviewIndex] : null;

  // Sync note textarea when selected clip changes
  useEffect(() => {
    setNoteText(previewClip?.creatorNote ?? "");
  }, [previewClip?.itemId]);

  // ── Reorder ──────────────────────────────────────────────────────────────────

  async function moveItem(idx: number, dir: -1 | 1) {
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= localItems.length) return;
    const next = [...localItems];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setLocalItems(next);
    if (previewIndex === idx) setPreviewIndex(swapIdx);
    else if (previewIndex === swapIdx) setPreviewIndex(idx);
    setSaving(true);
    try { await onUpdatePositions(next); } finally { setSaving(false); }
  }

  // ── Remove ────────────────────────────────────────────────────────────────────

  async function handleRemove(itemId: string, idx: number) {
    setPendingRemoveItem(null);
    setSaving(true);
    // Optimistic removal
    const next = localItems.filter(it => it.id !== itemId);
    setLocalItems(next);
    if (previewIndex >= next.length) setPreviewIndex(Math.max(0, next.length - 1));
    try { await onRemoveItem(itemId); } catch { setLocalItems(localItems); } finally { setSaving(false); }
  }

  // ── Delete playlist ───────────────────────────────────────────────────────────

  const activeAssignmentCount = assignments.length;

  async function handleDelete() {
    setConfirmDelete(false);
    setSaving(true);
    try {
      if (activeAssignmentCount > 0) {
        await onArchive(playlist.id);
      } else {
        await onDelete(playlist.id);
      }
    } finally { setSaving(false); }
  }

  return (
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>

      {/* Header */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="table-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ListVideo size={20} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Playlist</p>
              <h1 style={{ margin: 0, fontSize: 22 }}>{playlist.title}</h1>
              <p className="hint" style={{ margin: "2px 0 0" }}>
                {clipRows.length} clip{clipRows.length !== 1 ? "s" : ""}
                {playlist.description ? ` · ${playlist.description}` : ""}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saving && <span className="hint" style={{ fontSize: 12 }}>Saving…</span>}
            {assignments.length > 0 && (
              <button
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
                onClick={() => setAssignedUsersOpen(true)}
              >
                <BookOpen size={13} />
                Assignments ({assignments.length})
              </button>
            )}
            {canAssign && members && onCreateAssignment && onAddToAssignment && (
              <button
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
                onClick={() => setAssignModalOpen(true)}
              >
                <Users size={13} /> Assign Playlist
              </button>
            )}
            {canEdit && (
              <button
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
                onClick={() => setEditModalOpen(true)}
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            {canDelete && (
              <button
                className="danger"
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
              >
                <Trash2 size={13} /> {activeAssignmentCount > 0 ? "Archive" : "Delete"}
              </button>
            )}
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}><ChevronLeft size={15} /> Back</button>
          </div>
        </div>
      </div>

      {/* Duplicate clip warning */}
      {duplicateTagIds.size > 0 && canEdit && (
        <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", color: "#fde68a", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          This playlist contains {duplicateTagIds.size} duplicate clip{duplicateTagIds.size !== 1 ? "s" : ""}. Consider removing the duplicates to avoid repetition.
        </div>
      )}

      {/* Assignment success banner */}
      {assignSuccess && (
        <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8, background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: STATUS_COLORS.Completed, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> Assignment created successfully. Assigned referees will see it in My Learning.
        </div>
      )}

      {/* Empty state */}
      {clipRows.length === 0 && (
        <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
          <ListVideo size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>This playlist is empty</p>
          <p className="hint" style={{ margin: "6px 0 0" }}>
            Clips may have been removed from their source reviews, or none have been added yet.
          </p>
        </div>
      )}

      {/* Master–detail split */}
      {clipRows.length > 0 && (
        <div className="lh-clip-split">

          {/* Left: ordered clip list */}
          <div className="lh-clip-split__list" style={{ maxHeight: "72vh", overflowY: "auto", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 1, padding: "8px 10px", background: "var(--panel2)", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {clipRows.length} clip{clipRows.length !== 1 ? "s" : ""}
            </div>

            {clipRows.map((row, i) => {
              const isPreviewing = i === safePreviewIndex;
              return (
                <div
                  key={row.itemId}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isPreviewing}
                  aria-label={`Clip ${i + 1}: ${row.categoryGroup}${row.subtype ? ` – ${row.subtype}` : ""}`}
                  onClick={() => setPreviewIndex(i)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPreviewIndex(i); } }}
                  style={{ display: "flex", gap: 8, padding: "10px 8px 10px 10px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: isPreviewing ? "var(--panel2)" : undefined, borderLeft: isPreviewing ? "3px solid var(--accent)" : "3px solid transparent" }}
                >
                  {/* Reorder controls */}
                  {canEdit && (
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); moveItem(i, -1); }}
                        disabled={i === 0 || saving}
                        style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: "1px 2px", color: "var(--muted)", opacity: i === 0 ? 0.3 : 1 }}
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); moveItem(i, 1); }}
                        disabled={i === clipRows.length - 1 || saving}
                        style={{ background: "none", border: "none", cursor: i === clipRows.length - 1 ? "default" : "pointer", padding: "1px 2px", color: "var(--muted)", opacity: i === clipRows.length - 1 ? 0.3 : 1 }}
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  )}

                  {/* Clip info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
                      {row.tag.outcome && <span className={outcomeClass(row.tag.outcome)} style={{ fontSize: 11, padding: "1px 6px" }}>{row.tag.outcome}</span>}
                      {row.categoryGroup && <span className="chip" style={{ fontSize: 11 }}>{row.categoryGroup}</span>}
                      {duplicateTagIds.has(row.tag.id) && (
                        <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 999, background: "rgba(245,158,11,.15)", color: "#fde68a", border: "1px solid rgba(245,158,11,.3)", fontWeight: 700 }}>Dup</span>
                      )}
                      <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--muted)", marginLeft: "auto" }}>{row.tag.adjustedTime}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.refereeName}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.review.game || "Untitled game"}</div>
                    {row.subtype && <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{row.subtype}</div>}
                    {row.creatorNote && (
                      <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                        <MessageSquare size={10} /> Note
                      </div>
                    )}
                  </div>

                  {/* Remove */}
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); setPendingRemoveItem({ itemId: row.itemId, idx: i }); }}
                      disabled={saving}
                      style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px 4px", alignSelf: "center" }}
                      title="Remove from playlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: sticky preview */}
          <div style={{ flex: 1, position: "sticky", top: 20 }}>
            <div className="panel">
              <ClipPreview
                clip={previewClip}
                index={safePreviewIndex}
                total={clipRows.length}
                onPrev={() => setPreviewIndex(i => Math.max(0, i - 1))}
                onNext={() => setPreviewIndex(i => Math.min(clipRows.length - 1, i + 1))}
                onOpenReview={onOpenReview}
                learningMode={false}
              />

              {/* Learning note (editable for educators) */}
              {canEdit && onUpdateItemNote ? (
                <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Learning Note
                  </p>
                  {canEdit && onUpdateItemNote ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Add a focus note for referees viewing this clip…"
                        rows={3}
                        style={{ width: "100%", boxSizing: "border-box", fontSize: 13, resize: "vertical" }}
                      />
                      {noteText !== (previewClip?.creatorNote ?? "") && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button style={{ fontSize: 12 }} onClick={() => setNoteText(previewClip?.creatorNote ?? "")}>
                            Cancel
                          </button>
                          <button
                            className="primary"
                            style={{ fontSize: 12 }}
                            disabled={noteSaving || !previewClip}
                            onClick={async () => {
                              if (!previewClip) return;
                              setNoteSaving(true);
                              try { await onUpdateItemNote(previewClip.itemId, noteText.trim() || null); } finally { setNoteSaving(false); }
                            }}
                          >
                            {noteSaving ? "Saving…" : "Save Note"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Edit metadata modal */}
      {canEdit && editModalOpen && (
        <EditMetaModal
          playlist={playlist}
          onSave={(title, description) => onUpdateMeta(playlist.id, title, description)}
          onClose={() => setEditModalOpen(false)}
        />
      )}

      {/* Assign playlist modal */}
      {canAssign && assignModalOpen && members && onCreateAssignment && onAddToAssignment && (
        <AssignModal
          playlist={playlist}
          members={members}
          groups={groups}
          assignments={assignments}
          onSave={async (input) => {
            await onCreateAssignment(input);
            setAssignSuccess(true);
            setTimeout(() => setAssignSuccess(false), 4000);
          }}
          onAddToExisting={onAddToAssignment}
          onClose={() => setAssignModalOpen(false)}
        />
      )}

      {/* Assignments history modal */}
      {assignedUsersOpen && (
        <AssignmentsHistoryModal
          playlistTitle={playlist.title}
          assignments={assignments}
          onViewAssignment={onViewAssignment}
          onClose={() => setAssignedUsersOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={activeAssignmentCount > 0 ? "Archive Playlist" : "Delete Playlist"}
          message={
            activeAssignmentCount > 0
              ? `This playlist has ${activeAssignmentCount} active assignment${activeAssignmentCount !== 1 ? "s" : ""}. Deleting it would permanently destroy all referee progress.\n\nArchiving hides it from new assignments while preserving all existing assignment data and referee progress.`
              : "Permanently delete this playlist and all its clips? This cannot be undone."
          }
          confirmLabel={activeAssignmentCount > 0 ? "Archive Playlist" : "Yes, Delete"}
          busy={saving}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {pendingRemoveItem && (
        <ConfirmModal
          title="Remove Clip"
          message="Remove this clip from the playlist? The original clip in the review library will not be affected."
          confirmLabel="Yes, Remove"
          busyLabel="Removing…"
          busy={saving}
          onConfirm={() => handleRemove(pendingRemoveItem.itemId, pendingRemoveItem.idx)}
          onCancel={() => setPendingRemoveItem(null)}
        />
      )}
    </div>
  );
}
