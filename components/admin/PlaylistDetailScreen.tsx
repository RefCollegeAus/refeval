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
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, EmptyState, FormField, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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

// ── Modal shell ───────────────────────────────────────────────────────────────
// Shared visual shell for this screen's local modals — deliberately custom
// (not the shared Modal component) since none of them close on backdrop
// click, and that behaviour is preserved as-is.

function ModalShell({ maxWidth, children }: { maxWidth: number; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
      <div
        className="flex max-h-[90vh] w-full flex-col rounded-2xl border border-border bg-panel p-5 shadow-xl"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalTitle({ eyebrow, title, onClose }: { eyebrow: string; title: React.ReactNode; onClose: () => void }) {
  return (
    <div className="mb-1 flex shrink-0 items-start justify-between gap-3">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">{eyebrow}</p>
        <h1 className="text-lg font-semibold text-text">{title}</h1>
      </div>
      <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-panel-3 hover:text-text">✕</button>
    </div>
  );
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
    <ModalShell maxWidth={460}>
      <ModalTitle eyebrow="Edit Playlist" title="Update details" onClose={onClose} />
      <div className="mt-4 grid gap-3.5">
        <FormField label="Title" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Description" hint="Optional">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        </FormField>
        {err && <p className="text-xs font-medium text-red-400">{err}</p>}
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </ModalShell>
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
    <ModalShell maxWidth={560}>
      <ModalTitle eyebrow="Playlist" title="Assign Playlist" onClose={onClose} />

      {/* Mode toggle — only shown when existing assignments exist */}
      {hasExisting && (
        <div className="mb-1 mt-3 flex shrink-0 gap-1.5">
          <Button
            size="sm"
            variant={mode === "new" ? "primary" : "secondary"}
            onClick={() => switchMode("new")}
          >
            Create new assignment
          </Button>
          <Button
            size="sm"
            variant={mode === "existing" ? "primary" : "secondary"}
            onClick={() => switchMode("existing")}
          >
            Add to existing assignment
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-1">
        <div className="mt-3 grid gap-3.5">

          {/* ── Create new mode ── */}
          {mode === "new" && (
            <>
              <FormField label="Assignment Title" required>
                <Input value={title} onChange={e => setTitle(e.target.value)} autoFocus={!hasExisting} />
              </FormField>
              <FormField label="Instructions" hint="Optional">
                <Textarea value={instructions} onChange={e => setInst(e.target.value)} rows={3} placeholder="What should the referee focus on?" />
              </FormField>
              <div className="grid grid-cols-[1fr_auto] items-end gap-3.5">
                <FormField label="Due Date" hint="Optional">
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </FormField>
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-text">
                  <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className="h-3.5 w-3.5 cursor-pointer accent-accent" />
                  <span className="whitespace-nowrap">Required</span>
                </label>
              </div>
              {/* Reflection questions */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="text-sm font-semibold text-text">
                    Reflection Questions <span className="font-normal text-muted">(optional)</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={addQuestion}>
                    + Add
                  </Button>
                </div>
                {questions.length === 0 ? (
                  <p className="text-xs text-muted">No questions — referees complete after watching all clips.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {questions.map((q, i) => (
                      <div key={q.id} className="flex items-center gap-1.5">
                        {/* Reorder */}
                        <div className="flex shrink-0 flex-col">
                          <button
                            type="button"
                            onClick={() => moveQuestion(q.id, -1)}
                            disabled={i === 0}
                            className={cn("px-0.5 py-px text-muted", i === 0 ? "cursor-default opacity-30" : "cursor-pointer")}
                            title="Move up"
                          >
                            <ChevronUp size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveQuestion(q.id, 1)}
                            disabled={i === questions.length - 1}
                            className={cn("px-0.5 py-px text-muted", i === questions.length - 1 ? "cursor-default opacity-30" : "cursor-pointer")}
                            title="Move down"
                          >
                            <ChevronDown size={11} />
                          </button>
                        </div>
                        <span className="w-3.5 shrink-0 text-right text-xs text-muted">{i + 1}.</span>
                        <Input
                          value={q.text}
                          onChange={e => updateQuestion(q.id, e.target.value)}
                          placeholder={`Question ${i + 1}…`}
                          className="flex-1 text-sm"
                        />
                        {/* Required toggle */}
                        <label
                          className={cn("flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-[11px]", q.required ? "text-red-300" : "text-muted")}
                          title="Mark as required"
                        >
                          <input type="checkbox" checked={q.required} onChange={() => toggleRequired(q.id)} className="h-[11px] w-[11px] cursor-pointer accent-accent" />
                          Req
                        </label>
                        <button type="button" onClick={() => removeQuestion(q.id)} className="shrink-0 p-1 text-muted hover:text-text">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Knowledge quiz */}
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-text">
                  <HelpCircle size={13} /> Knowledge Quiz <span className="font-normal text-muted">(optional)</span>
                </div>
                <QuizEditor questions={quizQuestions} onChange={setQuizQuestions} />
              </div>
            </>
          )}

          {/* ── Add to existing mode ── */}
          {mode === "existing" && (
            <div>
              <div className="mb-1.5 text-sm font-semibold text-text">Select Assignment *</div>
              <div className="mb-1 grid max-h-[220px] gap-1.5 overflow-y-auto pr-0.5">
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
                      className={cn(
                        "grid gap-1 rounded-lg border px-3.5 py-2.5 outline-none",
                        isSelected ? "border-accent bg-accent/5" : "border-border bg-panel-2"
                      )}
                    >
                      <div className="truncate text-sm font-semibold text-text">{displayTitle}</div>
                      <div className="flex flex-wrap gap-x-3.5 gap-y-0.5 text-[11px] text-muted">
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
                <div className="mt-1 rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-sm text-good">
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

      <div className="mt-4 shrink-0 border-t border-border pt-3">
        {err && <p className="mb-2.5 text-xs font-medium text-red-400">{err}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{success ? "Done" : "Cancel"}</Button>
          {!success && (
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? mode === "new" ? "Assigning…" : "Adding…"
                : mode === "new"
                  ? `Assign to ${resolvedCount > 0 ? resolvedCount : ""} referee${resolvedCount !== 1 ? "s" : ""}`
                  : `Add ${resolvedCount > 0 ? resolvedCount : ""} referee${resolvedCount !== 1 ? "s" : ""}`
              }
            </Button>
          )}
        </div>
      </div>
    </ModalShell>
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
    <ModalShell maxWidth={640}>
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">Playlist</p>
          <h1 className="text-lg font-semibold text-text">Assignments — {playlistTitle}</h1>
          <p className="mt-0.5 text-xs text-muted">
            {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} created from this playlist
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-panel-3 hover:text-text">✕</button>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="py-4 text-sm text-muted">No assignments yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {sorted.map(a => {
              const completedCount = a.assignmentUsers.filter(u => u.status === "Completed").length;
              const totalUsers     = a.assignmentUsers.length;
              const allDone        = totalUsers > 0 && completedCount === totalUsers;
              return (
                <div key={a.id} className="flex items-center gap-3.5 rounded-lg border border-border bg-panel-2 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-text">
                      {a.title}
                      {a.required && (
                        <Badge className="ml-1.5 align-middle" style={REQUIRED_BADGE_STYLE}>Required</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                      <span className="text-[11px] text-muted">
                        {totalUsers} user{totalUsers !== 1 ? "s" : ""}
                      </span>
                      <span className={cn("text-[11px]", allDone ? "text-good" : "text-muted")}>
                        {completedCount}/{totalUsers} completed
                      </span>
                      {a.dueDate && (
                        <span className="text-[11px] text-muted">Due {fmt(a.dueDate)}</span>
                      )}
                      <span className="text-[11px] text-muted">Created {fmt(a.createdAt)}</span>
                    </div>
                  </div>
                  {onViewAssignment && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0 whitespace-nowrap"
                      onClick={() => { onViewAssignment(a.id); onClose(); }}
                    >
                      View Assignment
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex shrink-0 justify-end border-t border-border pt-3">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </ModalShell>
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
    <PageFrame
      className="p-0"
      eyebrow="Playlist"
      title={playlist.title}
      description={`${clipRows.length} clip${clipRows.length !== 1 ? "s" : ""}${playlist.description ? ` · ${playlist.description}` : ""}`}
      actions={
        <>
          {saving && <span className="self-center text-xs text-muted">Saving…</span>}
          {assignments.length > 0 && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setAssignedUsersOpen(true)}>
              <BookOpen size={13} />
              Assignments ({assignments.length})
            </Button>
          )}
          {canAssign && members && onCreateAssignment && onAddToAssignment && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setAssignModalOpen(true)}>
              <Users size={13} /> Assign Playlist
            </Button>
          )}
          {canEdit && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setEditModalOpen(true)}>
              <Edit2 size={13} /> Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" size="sm" className="gap-1.5" onClick={() => setConfirmDelete(true)} disabled={saving}>
              <Trash2 size={13} /> {activeAssignmentCount > 0 ? "Archive" : "Delete"}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
            <ChevronLeft size={15} /> Back
          </Button>
        </>
      }
    >

      {/* Duplicate clip warning */}
      {duplicateTagIds.size > 0 && canEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-yellow-200">
          <AlertTriangle size={14} className="shrink-0" />
          This playlist contains {duplicateTagIds.size} duplicate clip{duplicateTagIds.size !== 1 ? "s" : ""}. Consider removing the duplicates to avoid repetition.
        </div>
      )}

      {/* Assignment success banner */}
      {assignSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-good/30 bg-good/15 px-4 py-2.5 text-sm font-semibold" style={{ color: STATUS_COLORS.Completed }}>
          <CheckCircle2 size={14} className="shrink-0" /> Assignment created successfully. Assigned referees will see it in My Learning.
        </div>
      )}

      {/* Empty state */}
      {clipRows.length === 0 && (
        <EmptyState
          icon={<ListVideo size={36} />}
          title="This playlist is empty"
          description="Clips may have been removed from their source reviews, or none have been added yet."
        />
      )}

      {/* Master–detail split */}
      {clipRows.length > 0 && (
        <div className="flex items-start gap-4">

          {/* Left: ordered clip list */}
          <div className="max-h-[72vh] flex-[0_0_38%] overflow-y-auto rounded-lg border border-border bg-panel">
            <div className="sticky top-0 z-10 border-b border-border bg-panel-2 px-2.5 py-2 text-xs uppercase tracking-wide text-muted">
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
                  className={cn(
                    "flex cursor-pointer gap-2 border-b border-border border-l-[3px] py-2.5 pl-2.5 pr-2",
                    isPreviewing ? "border-l-accent bg-panel-2" : "border-l-transparent"
                  )}
                >
                  {/* Reorder controls */}
                  {canEdit && (
                    <div onClick={e => e.stopPropagation()} className="flex shrink-0 flex-col gap-0.5">
                      <button
                        onClick={e => { e.stopPropagation(); moveItem(i, -1); }}
                        disabled={i === 0 || saving}
                        className={cn("px-0.5 py-px text-muted", i === 0 ? "cursor-default opacity-30" : "cursor-pointer")}
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); moveItem(i, 1); }}
                        disabled={i === clipRows.length - 1 || saving}
                        className={cn("px-0.5 py-px text-muted", i === clipRows.length - 1 ? "cursor-default opacity-30" : "cursor-pointer")}
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  )}

                  {/* Clip info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                      {row.tag.outcome && <span className={outcomeClass(row.tag.outcome)}>{row.tag.outcome}</span>}
                      {row.categoryGroup && <Badge>{row.categoryGroup}</Badge>}
                      {duplicateTagIds.has(row.tag.id) && <Badge tone="warn">Dup</Badge>}
                      <span className="ml-auto text-[11px] tabular-nums text-muted">{row.tag.adjustedTime}</span>
                    </div>
                    <div className="truncate text-sm font-semibold text-text">{row.refereeName}</div>
                    <div className="truncate text-xs text-muted">{row.review.game || "Untitled game"}</div>
                    {row.subtype && <div className="mt-px truncate text-[11px] text-muted">{row.subtype}</div>}
                    {row.creatorNote && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-accent">
                        <MessageSquare size={10} /> Note
                      </div>
                    )}
                  </div>

                  {/* Remove */}
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); setPendingRemoveItem({ itemId: row.itemId, idx: i }); }}
                      disabled={saving}
                      className="shrink-0 self-center p-1 text-muted hover:text-text"
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
          <div className="sticky top-5 flex-1">
            <Card>
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
              {canEdit && onUpdateItemNote && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">
                    Learning Note
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <Textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add a focus note for referees viewing this clip…"
                      rows={3}
                      className="text-sm"
                    />
                    {noteText !== (previewClip?.creatorNote ?? "") && (
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setNoteText(previewClip?.creatorNote ?? "")}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={noteSaving || !previewClip}
                          onClick={async () => {
                            if (!previewClip) return;
                            setNoteSaving(true);
                            try { await onUpdateItemNote(previewClip.itemId, noteText.trim() || null); } finally { setNoteSaving(false); }
                          }}
                        >
                          {noteSaving ? "Saving…" : "Save Note"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
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
    </PageFrame>
  );
}
