"use client";

import { useState, useMemo } from "react";
import { BookOpen, UserPlus, Trash2, Edit2, Search, X } from "lucide-react";
import type { Assignment, AssignmentStatus } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";

interface Props {
  assignment: Assignment;
  playlist: Playlist | null;
  members: MemberRecord[];
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onUpdate: (id: string, data: { title: string; instructions: string | null; dueDate: string | null; required: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddUsers: (assignmentId: string, userIds: string[]) => Promise<void>;
  onRemoveUser: (assignmentUserId: string) => Promise<void>;
}

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  Assigned:  "var(--muted)",
  Started:   "#fde68a",
  Completed: "#bbf7d0",
};

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
  onSave: (data: { title: string; instructions: string | null; dueDate: string | null; required: boolean }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle]         = useState(assignment.title);
  const [instructions, setInstr]  = useState(assignment.instructions || "");
  const [dueDate, setDueDate]     = useState(assignment.dueDate || "");
  const [required, setRequired]   = useState(assignment.required);
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");

  async function handleSave() {
    if (!title.trim()) { setErr("Title is required."); return; }
    setSaving(true); setErr("");
    try {
      await onSave({
        title: title.trim(),
        instructions: instructions.trim() || null,
        dueDate: dueDate || null,
        required,
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">Edit Assignment</p>
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

// ── Add Users Panel ───────────────────────────────────────────────────────────

function AddUsersPanel({
  assignment,
  members,
  onAdd,
}: {
  assignment: Assignment;
  members: MemberRecord[];
  onAdd: (userIds: string[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const assignedIds = new Set(assignment.assignmentUsers.map(u => u.userId));

  const q = query.trim().toLowerCase();
  const unassigned = members.filter(m => !assignedIds.has(m.id));
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
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
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
  onBack, onUpdate, onDelete, onAddUsers, onRemoveUser,
}: Props) {
  const [editOpen, setEditOpen]   = useState(false);
  const [removing, setRemoving]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const assignedIds = useMemo(
    () => new Set(assignment.assignmentUsers.map(u => u.userId)),
    [assignment.assignmentUsers],
  );

  function memberOf(userId: string) {
    return members.find(m => m.id === userId);
  }

  async function handleRemove(assignmentUserId: string) {
    setRemoving(assignmentUserId);
    try { await onRemoveUser(assignmentUserId); } finally { setRemoving(null); }
  }

  async function handleDelete() {
    if (!confirm(`Delete assignment "${assignment.title}"?\n\nThis will remove all user progress. This cannot be undone.`)) return;
    setDeleting(true);
    try { await onDelete(assignment.id); } finally { setDeleting(false); }
  }

  const completedCount = assignment.assignmentUsers.filter(u => u.status === "Completed").length;
  const total = assignment.assignmentUsers.length;

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
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(239,68,68,.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,.3)", fontWeight: 700 }}>
                    Required
                  </span>
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
              <button className="danger" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }} onClick={handleDelete} disabled={deleting}>
                <Trash2 size={13} /> {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <button onClick={onBack}>← Back</button>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 14, padding: "12px 14px", background: "var(--panel2)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Playlist</div>
            <div style={{ fontWeight: 600 }}>{playlist?.title ?? "Unknown playlist"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Due Date</div>
            <div style={{ fontWeight: 600 }}>{fmt(assignment.dueDate)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Progress</div>
            <div style={{ fontWeight: 600, color: completedCount === total && total > 0 ? "#bbf7d0" : "var(--text)" }}>
              {completedCount}/{total} Completed
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Clips</div>
            <div style={{ fontWeight: 600 }}>{playlist?.items.length ?? "—"}</div>
          </div>
        </div>

        {/* Instructions */}
        {assignment.instructions && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--panel2)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Instructions</div>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{assignment.instructions}</p>
          </div>
        )}
      </div>

      {/* Users panel */}
      <div className="panel">
        <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>Assigned Members</h2>

        {assignment.assignmentUsers.length === 0 ? (
          <p className="hint">No members assigned yet. Use the section below to add members.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Email</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Role</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Started</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Completed</th>
                  {canEdit && <th style={{ padding: "6px 10px" }} />}
                </tr>
              </thead>
              <tbody>
                {assignment.assignmentUsers.map(au => {
                  const m = memberOf(au.userId);
                  return (
                    <tr key={au.id} style={{ borderBottom: "1px solid var(--border)", opacity: removing === au.id ? 0.5 : 1 }}>
                      <td style={{ padding: "10px 10px", fontWeight: 600 }}>{m?.name || "Unknown"}</td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)" }}>{m?.email || "—"}</td>
                      <td style={{ padding: "10px 10px" }}>
                        {m && <span className={`role-badge role-${m.role}`}>{m.role}</span>}
                      </td>
                      <td style={{ padding: "10px 10px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS[au.status] }}>
                          {au.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {fmt(au.startedAt)}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {fmt(au.completedAt)}
                      </td>
                      {canEdit && (
                        <td style={{ padding: "10px 10px", textAlign: "right" }}>
                          <button
                            onClick={() => handleRemove(au.id)}
                            disabled={removing === au.id}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px 4px", display: "flex", alignItems: "center" }}
                            title="Remove from assignment"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
    </div>
  );
}
