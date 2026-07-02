"use client";

import { useState, useMemo } from "react";
import {
  Users, Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight,
  X, ArrowUpDown,
} from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { Group, CreateGroupInput, UpdateGroupInput } from "@/lib/types/groups";
import { GROUP_COLOURS } from "@/lib/types/groups";
import type { MemberRecord } from "@/lib/types/members";
import { fmtDate } from "@/lib/utils/time";
import { ConfirmModal } from "@/components/common/ConfirmModal";

// ── helpers ───────────────────────────────────────────────────────────────────

const COLOUR_NAMES: Record<string, string> = {
  "#3b82f6": "Blue",
  "#22c55e": "Green",
  "#f59e0b": "Amber",
  "#ef4444": "Red",
  "#8b5cf6": "Purple",
  "#06b6d4": "Cyan",
  "#f97316": "Orange",
  "#ec4899": "Pink",
  "#14b8a6": "Teal",
  "#6366f1": "Indigo",
};

function ColourPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
      {GROUP_COLOURS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={COLOUR_NAMES[c] ?? c}
          aria-pressed={value === c}
          style={{
            width: 28, height: 28, borderRadius: "50%", background: c, border: "none",
            cursor: "pointer", outline: value === c ? `3px solid var(--text)` : "none",
            outlineOffset: 2, flexShrink: 0,
          }}
          title={COLOUR_NAMES[c] ?? c}
        />
      ))}
    </div>
  );
}

// ── Member picker (shared by create + edit) ───────────────────────────────────

function MemberPicker({
  members,
  selected,
  onChange,
}: {
  members: MemberRecord[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  const [q, setQ] = useState("");
  const referees = members.filter(m => m.role === "referee");
  const filtered = q
    ? referees.filter(m =>
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.email.toLowerCase().includes(q.toLowerCase())
      )
    : referees;

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Members <span className="hint" style={{ fontWeight: 400 }}>(referees only)</span></span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selected.size > 0 && (
            <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 12 }}>{selected.size} selected</span>
          )}
          <button type="button" style={{ fontSize: 11, padding: "2px 8px" }}
            onClick={() => onChange(new Set(filtered.map(m => m.id)))}>
            Select All
          </button>
          <button type="button" style={{ fontSize: 11, padding: "2px 8px" }}
            onClick={() => onChange(new Set())}>
            Clear All
          </button>
        </div>
      </div>
      <div style={{ position: "relative", marginBottom: 6 }}>
        <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search referees…"
          style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
        />
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, maxHeight: 200, overflowY: "auto" }}>
        {referees.length === 0 ? (
          <p className="hint" style={{ padding: "10px 12px", margin: 0 }}>No referees in this organisation.</p>
        ) : filtered.length === 0 ? (
          <p className="hint" style={{ padding: "10px 12px", margin: 0 }}>No matches.</p>
        ) : (
          filtered.map(m => (
            <label
              key={m.id}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer",
                borderBottom: "1px solid var(--border)", background: selected.has(m.id) ? "var(--panel2)" : undefined,
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                onChange={() => toggle(m.id)}
                style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

// ── Create / Edit modal ───────────────────────────────────────────────────────

function GroupModal({
  mode,
  initial,
  members,
  onSave,
  onClose,
}: {
  mode: "create" | "edit";
  initial?: Group;
  members: MemberRecord[];
  onSave: (name: string, description: string, colour: string, memberIds: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName]           = useState(initial?.name ?? "");
  const [description, setDesc]    = useState(initial?.description ?? "");
  const [colour, setColour]       = useState(initial?.colour ?? GROUP_COLOURS[0]);
  const [selected, setSelected]   = useState<Set<string>>(
    new Set(initial?.members.map(m => m.userId) ?? [])
  );
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");

  async function handleSave() {
    if (!name.trim()) { setErr("Group name is required."); return; }
    setSaving(true); setErr("");
    try {
      await onSave(name.trim(), description.trim(), colour, Array.from(selected));
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to save group.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 520, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-title" style={{ flexShrink: 0 }}>
          <div>
            <p className="eyebrow">{mode === "create" ? "New Group" : "Edit Group"}</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>{mode === "create" ? "Create Group" : "Edit Group"}</h1>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
            <label>
              Group Name *
              <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g. Development Squad" />
            </label>
            <label>
              Description <span className="hint">(optional)</span>
              <textarea
                value={description}
                onChange={e => setDesc(e.target.value)}
                rows={2}
                placeholder="What is this group for?"
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
              />
            </label>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Colour</div>
              <ColourPicker value={colour} onChange={setColour} />
            </div>
            <MemberPicker members={members} selected={selected} onChange={setSelected} />
          </div>
        </div>

        <div style={{ flexShrink: 0, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          {err && <p className="danger-text" style={{ margin: "0 0 10px" }}>{err}</p>}
          <div className="action-row">
            <button onClick={onClose}>Cancel</button>
            <button className="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? `Create Group${selected.size > 0 ? ` (${selected.size})` : ""}` : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Group Detail panel ────────────────────────────────────────────────────────

function GroupDetail({
  group,
  members,
  canEdit,
  canDelete,
  onUpdate,
  onDelete,
  onSetMembers,
  onClose,
}: {
  group: Group;
  members: MemberRecord[];
  canEdit: boolean;
  canDelete: boolean;
  onUpdate: (id: string, input: UpdateGroupInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetMembers: (groupId: string, userIds: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [editOpen, setEditOpen]               = useState(false);
  const [memberSearch, setMemberSearch]       = useState("");
  const [confirmDelete, setConfirmDelete]     = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [busy, setBusy]                       = useState(false);

  const memberIds = useMemo(() => new Set(group.members.map(m => m.userId)), [group.members]);

  const enriched = useMemo(
    () => group.members
      .map(gm => ({ gm, member: members.find(m => m.id === gm.userId) }))
      .filter(x => !!x.member)
      .sort((a, b) => (a.member!.name || "").localeCompare(b.member!.name || "")),
    [group.members, members]
  );

  const filteredMembers = memberSearch
    ? enriched.filter(({ member: m }) =>
        m!.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m!.email.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : enriched;

  async function handleRemoveMember(userId: string) {
    setBusy(true);
    setPendingRemoveId(null);
    try {
      const next = Array.from(memberIds).filter(id => id !== userId);
      await onSetMembers(group.id, next);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await onDelete(group.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Single panel for both header and member list */}
      <div className="panel" style={{ borderLeft: `4px solid ${group.colour}` }}>

        {/* Group header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <p className="eyebrow" style={{ margin: "0 0 2px" }}>Group</p>
            <h2 style={{ margin: 0, fontSize: 18 }}>{group.name}</h2>
            {group.description && (
              <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>{group.description}</p>
            )}
            <p className="hint" style={{ margin: "6px 0 0", fontSize: 12 }}>
              {group.members.length} member{group.members.length !== 1 ? "s" : ""} · Created {fmtDate(group.createdAt)}
            </p>
          </div>
          <button onClick={onClose} title="Close" style={{ padding: "4px 8px", flexShrink: 0 }}><X size={14} /></button>
        </div>

        {/* Edit / Delete actions */}
        {canEdit && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => setEditOpen(true)}>
              <Pencil size={12} /> Edit
            </button>
            {canDelete && (
              <button className="danger" style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => setConfirmDelete(true)}>
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
        )}

        {/* Section divider — full-bleed within panel */}
        <div style={{ margin: "14px -18px 0", borderTop: "1px solid var(--border)" }} />

        {/* Members section */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 className="ed-section-title" style={{ margin: 0 }}>
              Members ({group.members.length})
            </h3>
          </div>

          {/* Member search */}
          {group.members.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginBottom: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                <input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search members…"
                  style={{ paddingLeft: 26, fontSize: 12, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              {memberSearch && (
                <button
                  onClick={() => setMemberSearch("")}
                  aria-label="Clear search"
                  style={{ border: "none", background: "none", padding: "4px 5px", cursor: "pointer", flexShrink: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Member list */}
          {group.members.length === 0 ? (
            <div className="empty-state" style={{ padding: "16px 10px" }}>
              <p className="hint" style={{ margin: 0, fontSize: 13 }}>No members yet.</p>
              {canEdit ? (
                <button style={{ marginTop: 8, fontSize: 12 }} onClick={() => setEditOpen(true)}>
                  Add Members
                </button>
              ) : (
                <p className="hint" style={{ margin: "4px 0 0", fontSize: 12 }}>
                  Contact an administrator to add members to this group.
                </p>
              )}
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="hint" style={{ fontSize: 13, padding: "8px 0", margin: 0 }}>No members match your search.</p>
          ) : (
            <div>
              {filteredMembers.map(({ gm, member: m }, i) => (
                <div
                  key={gm.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 0",
                    borderBottom: i < filteredMembers.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m!.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{m!.email}</div>
                  </div>
                  {canEdit && (
                    <button
                      title="Remove from group"
                      style={{ padding: "2px 6px", flexShrink: 0 }}
                      onClick={() => setPendingRemoveId(m!.id)}
                      disabled={busy}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editOpen && (
        <GroupModal
          mode="edit"
          initial={group}
          members={members}
          onSave={async (name, description, colour, memberIds) => {
            await onUpdate(group.id, { name, description, colour });
            await onSetMembers(group.id, memberIds);
          }}
          onClose={() => setEditOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Group"
          message={`Delete "${group.name}"? This will remove all members from the group. This cannot be undone.`}
          confirmLabel="Yes, Delete"
          busy={busy}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {pendingRemoveId && (() => {
        const m = members.find(x => x.id === pendingRemoveId);
        return (
          <ConfirmModal
            title="Remove Member"
            message={`Remove ${m?.name || "this member"} from "${group.name}"?`}
            confirmLabel="Yes, Remove"
            busyLabel="Removing…"
            busy={busy}
            onConfirm={() => handleRemoveMember(pendingRemoveId)}
            onCancel={() => setPendingRemoveId(null)}
          />
        );
      })()}
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type SortKey = "name" | "members" | "created";

export function GroupsScreen({
  session,
  groups,
  members,
  loading,
  error,
  canCreate,
  canEdit,
  canDelete,
  onBack,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onSetGroupMembers,
}: {
  session: RefEvalSession;
  groups: Group[];
  members: MemberRecord[];
  loading: boolean;
  error: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onCreateGroup: (input: CreateGroupInput) => Promise<void>;
  onUpdateGroup: (id: string, input: UpdateGroupInput) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
  onSetGroupMembers: (groupId: string, userIds: string[]) => Promise<void>;
}) {
  const [search, setSearch]                   = useState("");
  const [sort, setSort]                       = useState<SortKey>("name");
  const [sortAsc, setSortAsc]                 = useState(true);
  const [createOpen, setCreateOpen]           = useState(false);
  const [selectedId, setSelectedId]           = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (sort === key) setSortAsc(a => !a);
    else { setSort(key); setSortAsc(true); }
  }

  const filtered = useMemo(() => {
    let out = groups;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(g =>
        g.name.toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q)
      );
    }
    out = [...out].sort((a, b) => {
      let cmp = 0;
      if (sort === "name")    cmp = a.name.localeCompare(b.name);
      if (sort === "members") cmp = a.members.length - b.members.length;
      if (sort === "created") cmp = a.createdAt.localeCompare(b.createdAt);
      return sortAsc ? cmp : -cmp;
    });
    return out;
  }, [groups, search, sort, sortAsc]);

  const selectedGroup = selectedId ? groups.find(g => g.id === selectedId) ?? null : null;

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    return (
      <button
        style={{ fontSize: 12, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 4, background: sort === col ? "var(--panel2)" : undefined }}
        onClick={() => toggleSort(col)}
      >
        {label} <ArrowUpDown size={11} style={{ opacity: sort === col ? 1 : 0.4 }} />
      </button>
    );
  }

  return (
    <div className="lh-layout">

      {/* ── Main column ── */}
      <div className="lh-main">

        {/* Header + search bar in one panel */}
        <div className="panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Learning Hub</p>
              <h1 style={{ margin: 0, fontSize: 22 }}>Groups</h1>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {canCreate && (
                <button className="primary" onClick={() => setCreateOpen(true)}>
                  <Plus size={14} /> New Group
                </button>
              )}
              <button onClick={onBack}><ChevronLeft size={15} /> Back</button>
            </div>
          </div>

          {/* Inline search/sort — only when groups exist */}
          {!loading && groups.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 200px" }}>
                <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search groups…"
                  aria-label="Search groups"
                  style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
                />
              </div>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  style={{ border: "none", background: "none", padding: "4px 6px", cursor: "pointer", flexShrink: 0 }}
                >
                  <X size={13} />
                </button>
              )}
              <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", marginLeft: "auto" }}>
                {search ? `${filtered.length} of ${groups.length}` : groups.length} group{groups.length !== 1 ? "s" : ""}
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                <span className="hint" style={{ fontSize: 12 }}>Sort:</span>
                <SortBtn col="name" label="Name" />
                <SortBtn col="members" label="Members" />
                <SortBtn col="created" label="Date" />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && <p className="danger-text" style={{ margin: 0 }}>{error}</p>}

        {/* Loading */}
        {loading && (
          <div className="empty-state"><p className="hint" style={{ margin: 0 }}>Loading groups…</p></div>
        )}

        {/* Empty state — no groups yet */}
        {!loading && groups.length === 0 && !error && (
          <div className="empty-state">
            <Users size={32} style={{ opacity: 0.25, marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No groups yet</p>
            <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Create a group to organise referees into cohorts.
            </p>
            {canCreate && (
              <button className="primary" style={{ marginTop: 12 }} onClick={() => setCreateOpen(true)}>
                <Plus size={14} /> New Group
              </button>
            )}
          </div>
        )}

        {/* No search results */}
        {!loading && groups.length > 0 && filtered.length === 0 && (
          <div className="empty-state">
            <Search size={28} style={{ opacity: 0.25, marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No groups match your search</p>
            <button style={{ marginTop: 10, fontSize: 13 }} onClick={() => setSearch("")}>Clear search</button>
          </div>
        )}

        {/* Groups grid */}
        {!loading && filtered.length > 0 && (
          <div className="groups-grid">
            {filtered.map(g => (
              <div
                key={g.id}
                className={"groups-card" + (selectedId === g.id ? " groups-card--selected" : "")}
                style={{ borderTop: `3px solid ${g.colour}` }}
                onClick={() => setSelectedId(prev => prev === g.id ? null : g.id)}
              >
                <div className="groups-card-header">
                  <div className="groups-card-dot" style={{ background: g.colour }} />
                  <div className="groups-card-name">{g.name}</div>
                  {g.members.length === 0 && (
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(245,158,11,.15)", color: "#fde68a", border: "1px solid rgba(245,158,11,.3)", fontWeight: 700, marginLeft: 4, flexShrink: 0 }}>
                      Empty
                    </span>
                  )}
                </div>
                {g.description && (
                  <p className="groups-card-desc">{g.description}</p>
                )}
                <div className="groups-card-meta">
                  <span><Users size={11} /> {g.members.length} member{g.members.length !== 1 ? "s" : ""}</span>
                  <span>{fmtDate(g.createdAt)}</span>
                </div>
                <div className="groups-card-actions" onClick={e => e.stopPropagation()}>
                  <button
                    style={{ fontSize: 12, padding: "3px 10px" }}
                    onClick={() => setSelectedId(prev => prev === g.id ? null : g.id)}
                  >
                    <ChevronRight size={12} /> View
                  </button>
                  {canDelete && (
                    <button
                      className="danger"
                      style={{ fontSize: 12, padding: "3px 10px" }}
                      onClick={() => setPendingDeleteId(g.id)}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sidebar ── */}
      <aside className="lh-sidebar">
        {selectedGroup ? (
          <GroupDetail
            group={selectedGroup}
            members={members}
            canEdit={canEdit}
            canDelete={canDelete}
            onUpdate={onUpdateGroup}
            onDelete={onDeleteGroup}
            onSetMembers={onSetGroupMembers}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="empty-state" style={{ textAlign: "center", padding: "28px 20px" }}>
            <Users size={26} style={{ opacity: 0.2, marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Select a group</p>
            <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Click a group card to view members and manage the group.
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="panel" style={{ boxShadow: "none" }}>
          <h3 className="ed-section-title" style={{ marginBottom: 10 }}>Summary</h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="hint">Total Groups</span>
              <strong>{groups.length}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="hint">Unique Members</span>
              <strong>{new Set(groups.flatMap(g => g.members.map(m => m.userId))).size}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "7px 0" }}>
              <span className="hint">Avg Size</span>
              <strong>
                {groups.length > 0
                  ? Math.round(groups.reduce((s, g) => s + g.members.length, 0) / groups.length)
                  : 0}
              </strong>
            </div>
          </div>
        </div>
      </aside>

      {/* Create modal */}
      {createOpen && (
        <GroupModal
          mode="create"
          members={members}
          onSave={async (name, description, colour, memberIds) => {
            await onCreateGroup({ name, description, colour, memberIds });
          }}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {pendingDeleteId && (() => {
        const g = groups.find(x => x.id === pendingDeleteId);
        return (
          <ConfirmModal
            title="Delete Group"
            message={`Delete "${g?.name ?? "this group"}"? This will remove all members from the group. This cannot be undone.`}
            confirmLabel="Yes, Delete"
            busy={deletingId === pendingDeleteId}
            onConfirm={async () => {
              setDeletingId(pendingDeleteId);
              try {
                await onDeleteGroup(pendingDeleteId);
                if (selectedId === pendingDeleteId) setSelectedId(null);
              } finally {
                setDeletingId(null);
                setPendingDeleteId(null);
              }
            }}
            onCancel={() => setPendingDeleteId(null)}
          />
        );
      })()}
    </div>
  );
}
