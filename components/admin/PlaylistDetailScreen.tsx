"use client";

import { useEffect, useMemo, useState } from "react";
import { ListVideo, ChevronUp, ChevronDown, Trash2, Edit2, Users, Search, AlertCircle } from "lucide-react";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import type { Playlist, PlaylistItem } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import type { Assignment, AssignmentUser, CreateAssignmentInput } from "@/lib/types/assignments";
import { ClipPreview, ClipRow, splitCategory, slotName, outcomeClass } from "@/components/common/ClipPreview";

export type LearningContext = {
  assignmentUser: AssignmentUser;
  assignedByName: string | null;
  instructions: string | null;
  dueDate: string | null;
  onMarkComplete: () => Promise<void>;
};

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
  canEdit?: boolean;
  canDelete?: boolean;
  // Assign playlist
  members?: MemberRecord[];
  canAssign?: boolean;
  onCreateAssignment?: (input: CreateAssignmentInput) => Promise<void>;
  // Assigned users visibility (admin)
  assignments?: Assignment[];
  // Per-clip learning note editing
  onUpdateItemNote?: (itemId: string, note: string | null) => Promise<void>;
  // Referee learning context (read-only view with complete button)
  learningContext?: LearningContext;
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
          <button onClick={onClose}>✕</button>
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

function AssignModal({
  playlist,
  members,
  onSave,
  onClose,
}: {
  playlist: Playlist;
  members: MemberRecord[];
  onSave: (input: CreateAssignmentInput) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle]       = useState(playlist.title);
  const [instructions, setInst] = useState("");
  const [dueDate, setDueDate]   = useState("");
  const [required, setRequired] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? members.filter(m =>
        (m.name || "").toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
      )
    : members;

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!title.trim()) { setErr("Title is required."); return; }
    if (selected.size === 0) { setErr("Select at least one team member."); return; }
    setSaving(true); setErr("");
    try {
      await onSave({
        playlistId: playlist.id,
        title: title.trim(),
        instructions: instructions.trim(),
        dueDate: dueDate || null,
        required,
        userIds: Array.from(selected),
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to create assignment.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-title" style={{ flexShrink: 0 }}>
          <div>
            <p className="eyebrow">New Assignment</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>Assign Playlist</h1>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
            <label>
              Assignment Title *
              <input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
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
                <input
                  type="checkbox"
                  checked={required}
                  onChange={e => setRequired(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }}
                />
                <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>Required</span>
              </label>
            </div>

            {/* Assign To */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Assign To *</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {selected.size > 0 && (
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>{selected.size} selected</span>
                  )}
                  <button
                    type="button"
                    style={{ fontSize: 11, padding: "2px 8px" }}
                    onClick={() => setSelected(new Set(filtered.map(m => m.id)))}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    style={{ fontSize: 11, padding: "2px 8px" }}
                    onClick={() => setSelected(new Set())}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div style={{ position: "relative", marginBottom: 6 }}>
                <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search team members…"
                  style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
                />
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, maxHeight: 200, overflowY: "auto" }}>
                {filtered.length === 0 && (
                  <p className="hint" style={{ padding: "10px 12px", margin: 0 }}>No members found.</p>
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
            </div>
          </div>
        </div>

        <div style={{ flexShrink: 0, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          {err && <p className="danger-text" style={{ margin: "0 0 10px" }}>{err}</p>}
          <div className="action-row">
            <button onClick={onClose}>Cancel</button>
            <button className="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Assigning…" : `Assign to ${selected.size > 0 ? selected.size : ""} member${selected.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assigned Users Modal ──────────────────────────────────────────────────────

type AssignedRow = {
  assignmentId: string;
  assignmentTitle: string;
  required: boolean;
  dueDate: string | null;
  assignmentUser: AssignmentUser;
  memberName: string;
  memberEmail: string;
};

type AssignedFilter = "All" | "Assigned" | "Started" | "Completed" | "Overdue";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "Completed") return false;
  return new Date(dueDate).getTime() < Date.now();
}

function AssignedUsersModal({
  playlistTitle,
  assignments,
  members,
  onClose,
}: {
  playlistTitle: string;
  assignments: Assignment[];
  members: MemberRecord[];
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<AssignedFilter>("All");
  const [query, setQuery]   = useState("");

  const memberMap = useMemo(() => {
    const m = new Map<string, MemberRecord>();
    for (const mb of members) m.set(mb.id, mb);
    return m;
  }, [members]);

  const allRows = useMemo<AssignedRow[]>(() => {
    const rows: AssignedRow[] = [];
    for (const a of assignments) {
      for (const au of a.assignmentUsers) {
        const mb = memberMap.get(au.userId);
        rows.push({
          assignmentId:    a.id,
          assignmentTitle: a.title,
          required:        a.required,
          dueDate:         a.dueDate,
          assignmentUser:  au,
          memberName:      mb?.name || mb?.email || "Unknown",
          memberEmail:     mb?.email || "",
        });
      }
    }
    // Sort: overdue first, then Assigned/Started before Completed, then name
    rows.sort((a, b) => {
      const ao = isOverdue(a.dueDate, a.assignmentUser.status);
      const bo = isOverdue(b.dueDate, b.assignmentUser.status);
      if (ao !== bo) return ao ? -1 : 1;
      const order: Record<string, number> = { Assigned: 0, Started: 1, Completed: 2 };
      const sd = (order[a.assignmentUser.status] ?? 0) - (order[b.assignmentUser.status] ?? 0);
      if (sd !== 0) return sd;
      return a.memberName.localeCompare(b.memberName);
    });
    return rows;
  }, [assignments, memberMap]);

  const counts = useMemo(() => ({
    All:       allRows.length,
    Assigned:  allRows.filter(r => r.assignmentUser.status === "Assigned").length,
    Started:   allRows.filter(r => r.assignmentUser.status === "Started").length,
    Completed: allRows.filter(r => r.assignmentUser.status === "Completed").length,
    Overdue:   allRows.filter(r => isOverdue(r.dueDate, r.assignmentUser.status)).length,
  }), [allRows]);

  const q = query.trim().toLowerCase();
  const filtered = allRows.filter(r => {
    if (filter === "Overdue"   && !isOverdue(r.dueDate, r.assignmentUser.status)) return false;
    if (filter !== "All" && filter !== "Overdue" && r.assignmentUser.status !== filter) return false;
    if (q) {
      return (
        r.memberName.toLowerCase().includes(q) ||
        r.memberEmail.toLowerCase().includes(q) ||
        r.assignmentTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const STATUS_COLOR: Record<string, string> = {
    Assigned:  "var(--muted)",
    Started:   "#fde68a",
    Completed: "#bbf7d0",
  };

  const FILTER_TABS: AssignedFilter[] = ["All", "Assigned", "Started", "Completed", "Overdue"];

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-title" style={{ flexShrink: 0 }}>
          <div>
            <p className="eyebrow">Playlist</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>Assigned Users — {playlistTitle}</h1>
            <p className="hint" style={{ margin: "2px 0 0" }}>{allRows.length} assignment{allRows.length !== 1 ? "s" : ""} across {assignments.length} assignment group{assignments.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Filter tabs */}
        <div style={{ flexShrink: 0, display: "flex", gap: 6, flexWrap: "wrap", padding: "12px 0 8px" }}>
          {FILTER_TABS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 12, padding: "3px 10px",
                background: filter === f ? "var(--accent)" : undefined,
                color:      filter === f ? "#fff" : undefined,
                opacity:    counts[f] === 0 ? 0.45 : 1,
              }}
            >
              {f} {counts[f] > 0 ? `· ${counts[f]}` : ""}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ flexShrink: 0, position: "relative", marginBottom: 10 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, email or assignment title…"
            style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
          />
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <p className="hint" style={{ padding: "16px 0", margin: 0 }}>No results match the current filter.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "5px 8px", fontWeight: 600 }}>Referee</th>
                  <th style={{ textAlign: "left", padding: "5px 8px", fontWeight: 600 }}>Assignment</th>
                  <th style={{ textAlign: "left", padding: "5px 8px", fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: "left", padding: "5px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>Assigned</th>
                  <th style={{ textAlign: "left", padding: "5px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>Due</th>
                  <th style={{ textAlign: "left", padding: "5px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const overdue = isOverdue(r.dueDate, r.assignmentUser.status);
                  return (
                    <tr
                      key={`${r.assignmentId}-${r.assignmentUser.userId}`}
                      style={{ borderBottom: "1px solid var(--border)", background: overdue ? "rgba(239,68,68,.04)" : undefined }}
                    >
                      <td style={{ padding: "9px 8px" }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{r.memberName}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.memberEmail}</div>
                      </td>
                      <td style={{ padding: "9px 8px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{r.assignmentTitle}</div>
                        {r.required && (
                          <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 999, background: "rgba(239,68,68,.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,.3)", fontWeight: 700 }}>
                            Required
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "9px 8px", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, color: STATUS_COLOR[r.assignmentUser.status] ?? "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                          {overdue && <AlertCircle size={12} style={{ color: "#fca5a5", flexShrink: 0 }} />}
                          {r.assignmentUser.status}
                          {overdue && <span style={{ fontSize: 10, color: "#fca5a5", fontWeight: 400 }}>Overdue</span>}
                        </span>
                      </td>
                      <td style={{ padding: "9px 8px", color: "var(--muted)", whiteSpace: "nowrap", fontSize: 12 }}>
                        {fmt(r.assignmentUser.assignedAt)}
                      </td>
                      <td style={{ padding: "9px 8px", whiteSpace: "nowrap", fontSize: 12 }}>
                        <span style={{ color: overdue ? "#fca5a5" : "var(--muted)" }}>
                          {fmt(r.dueDate)}
                        </span>
                      </td>
                      <td style={{ padding: "9px 8px", color: "#bbf7d0", whiteSpace: "nowrap", fontSize: 12 }}>
                        {r.assignmentUser.completedAt ? fmt(r.assignmentUser.completedAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
  canEdit = true,
  canDelete = true,
  members,
  canAssign = false,
  onCreateAssignment,
  assignments = [],
  onUpdateItemNote,
  learningContext,
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
  const [completing, setCompleting] = useState(false);
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
    if (!confirm("Remove this clip from the playlist?")) return;
    setSaving(true);
    // Optimistic removal
    const next = localItems.filter(it => it.id !== itemId);
    setLocalItems(next);
    if (previewIndex >= next.length) setPreviewIndex(Math.max(0, next.length - 1));
    try { await onRemoveItem(itemId); } catch { setLocalItems(localItems); } finally { setSaving(false); }
  }

  // ── Delete playlist ───────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!confirm(`Delete "${playlist.title}"? This cannot be undone.`)) return;
    setSaving(true);
    try { await onDelete(playlist.id); } finally { setSaving(false); }
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
              {playlist.description && (
                <p className="hint" style={{ margin: "2px 0 0" }}>{playlist.description}</p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saving && <span className="hint" style={{ fontSize: 12 }}>Saving…</span>}
            {!learningContext && assignments.length > 0 && members && (
              <button
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, position: "relative" }}
                onClick={() => setAssignedUsersOpen(true)}
              >
                <Users size={13} />
                Assigned Users
                <span style={{ fontSize: 10, background: "var(--accent)", color: "#fff", borderRadius: 999, padding: "1px 5px", marginLeft: 2 }}>
                  {assignments.reduce((n, a) => n + a.assignmentUsers.length, 0)}
                </span>
              </button>
            )}
            {canAssign && members && onCreateAssignment && (
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
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button onClick={onBack}>← Back</button>
          </div>
        </div>
      </div>

      {/* Learning context banner (referee view) */}
      {learningContext && (() => {
        const isCompleted = learningContext.assignmentUser.status === "Completed";
        const overdueLC   = isOverdue(learningContext.dueDate, learningContext.assignmentUser.status);
        return (
          <div
            className="panel"
            style={{
              marginBottom: 16,
              padding: "16px 18px",
              borderLeft: isCompleted
                ? "4px solid rgba(34,197,94,.5)"
                : overdueLC
                ? "4px solid rgba(239,68,68,.5)"
                : "4px solid var(--accent)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="eyebrow" style={{ margin: "0 0 4px" }}>My Learning</p>
                {learningContext.instructions && (
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                    {learningContext.instructions}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--muted)", alignItems: "center" }}>
                  {learningContext.assignedByName && (
                    <span>Assigned by {learningContext.assignedByName}</span>
                  )}
                  {learningContext.dueDate && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: overdueLC ? "#fca5a5" : "var(--muted)" }}>
                      {overdueLC && <AlertCircle size={12} />}
                      Due {new Date(learningContext.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      {overdueLC && " — Overdue"}
                    </span>
                  )}
                  <span style={{ fontWeight: 700, color: isCompleted ? "#bbf7d0" : learningContext.assignmentUser.status === "Started" ? "#fde68a" : "var(--muted)" }}>
                    {learningContext.assignmentUser.status}
                  </span>
                </div>
              </div>

              {/* Mark Complete / Completed state */}
              {isCompleted ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 15, color: "#bbf7d0", fontWeight: 700 }}>✓ Completed</span>
                  {learningContext.assignmentUser.completedAt && (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {new Date(learningContext.assignmentUser.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              ) : (
                <button
                  className="primary"
                  style={{ fontSize: 14, padding: "9px 20px", whiteSpace: "nowrap", flexShrink: 0 }}
                  disabled={completing}
                  onClick={async () => {
                    setCompleting(true);
                    try { await learningContext.onMarkComplete(); } finally { setCompleting(false); }
                  }}
                >
                  {completing ? "Saving…" : "✓ Mark as Complete"}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Assignment success banner */}
      {assignSuccess && (
        <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8, background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#bbf7d0", fontSize: 13, fontWeight: 600 }}>
          ✓ Assignment created successfully. Assigned referees will see it in My Learning.
        </div>
      )}

      {/* Empty state */}
      {clipRows.length === 0 && (
        <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
          <ListVideo size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>This playlist is empty</p>
          <p className="hint" style={{ margin: "6px 0 0" }}>
            Clips may have been removed from their reviews, or the playlist has no items.
          </p>
        </div>
      )}

      {/* Master–detail split */}
      {clipRows.length > 0 && (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

          {/* Left: ordered clip list */}
          <div style={{ flex: "0 0 38%", maxHeight: "72vh", overflowY: "auto", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 1, padding: "8px 10px", background: "var(--panel2)", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {clipRows.length} clip{clipRows.length !== 1 ? "s" : ""}
            </div>

            {clipRows.map((row, i) => {
              const isPreviewing = i === safePreviewIndex;
              return (
                <div
                  key={row.itemId}
                  onClick={() => setPreviewIndex(i)}
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
                      <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--muted)", marginLeft: "auto" }}>{row.tag.adjustedTime}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.refereeName}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.review.game || "Untitled game"}</div>
                    {row.subtype && <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{row.subtype}</div>}
                  </div>

                  {/* Remove */}
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(row.itemId, i); }}
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
                learningMode={!!learningContext}
              />

              {/* Learning note: editable for admins, read-only in learning mode */}
              {(canEdit && onUpdateItemNote) || (learningContext && previewClip?.creatorNote) ? (
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
                  ) : previewClip?.creatorNote ? (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text)", whiteSpace: "pre-wrap" }}>{previewClip.creatorNote}</p>
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
      {canAssign && assignModalOpen && members && onCreateAssignment && (
        <AssignModal
          playlist={playlist}
          members={members}
          onSave={onCreateAssignment}
          onClose={() => {
            setAssignModalOpen(false);
            setAssignSuccess(true);
            setTimeout(() => setAssignSuccess(false), 4000);
          }}
        />
      )}

      {/* Assigned users modal */}
      {assignedUsersOpen && members && (
        <AssignedUsersModal
          playlistTitle={playlist.title}
          assignments={assignments}
          members={members}
          onClose={() => setAssignedUsersOpen(false)}
        />
      )}
    </div>
  );
}
