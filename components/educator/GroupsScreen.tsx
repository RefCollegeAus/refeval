"use client";

import { useState, useMemo } from "react";
import {
  Users, Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight,
  X, Check, ArrowUpDown,
} from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { Group, CreateGroupInput, UpdateGroupInput } from "@/lib/types/groups";
import { GROUP_COLOURS } from "@/lib/types/groups";
import type { MemberRecord } from "@/lib/types/members";
import { fmtDate } from "@/lib/utils/time";

// ── helpers ───────────────────────────────────────────────────────────────────

function ColourPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
      {GROUP_COLOURS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{
            width: 28, height: 28, borderRadius: "50%", background: c, border: "none",
            cursor: "pointer", outline: value === c ? `3px solid var(--text)` : "none",
            outlineOffset: 2, flexShrink: 0,
          }}
          title={c}
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
  const [editOpen, setEditOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [delConfirm, setDelConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

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
      <div className="panel" style={{ borderLeft: `4px solid ${group.colour}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <p className="eyebrow" style={{ margin: "0 0 2px" }}>Group</p>
            <h2 style={{ margin: 0, fontSize: 20 }}>{group.name}</h2>
            {group.description && (
              <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>{group.description}</p>
            )}
            <p className="hint" style={{ margin: "6px 0 0", fontSize: 12 }}>
              {group.members.length} member{group.members.length !== 1 ? "s" : ""} · Created {fmtDate(group.createdAt)}
            </p>
          </div>
          <button onClick={onClose} title="Close"><X size={14} /></button>
        </div>

        {canEdit && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => setEditOpen(true)}>
              <Pencil size={12} /> Edit
            </button>
            {canDelete && !delConfirm && (
              <button className="danger" style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => setDelConfirm(true)}>
                <Trash2 size={12} /> Delete
              </button>
            )}
            {delConfirm && (
              <>
                <span className="hint" style={{ fontSize: 12, alignSelf: "center" }}>Confirm delete?</span>
                <button className="danger" style={{ fontSize: 12, padding: "4px 12px" }} onClick={handleDelete} disabled={busy}>
                  {busy ? "Deleting…" : "Yes, Delete"}
                </button>
                <button style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => setDelConfirm(false)}>Cancel</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Member list */}
      <div className="panel">
        <h3 className="ed-section-title" style={{ marginBottom: 10 }}>
          Members ({group.members.length})
        </h3>
        {group.members.length > 0 && (
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
            <input
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search members…"
              style={{ paddingLeft: 26, fontSize: 12, width: "100%", boxSizing: "border-box" }}
            />
          </div>
        )}
        {group.members.length === 0 ? (
          <div className="empty-state" style={{ padding: "16px 10px" }}>
            <p className="hint" style={{ margin: 0, fontSize: 13 }}>No members yet.</p>
            {canEdit && (
              <button style={{ marginTop: 8, fontSize: 12 }} onClick={() => setEditOpen(true)}>
                Add Members
              </button>
            )}
          </div>
        ) : filteredMembers.length === 0 ? (
          <p className="hint" style={{ fontSize: 13, padding: "8px 0" }}>No members match your search.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {filteredMembers.map(({ gm, member: m }) => (
              <div key={gm.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: "var(--panel2)", border: "1px solid var(--border)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m!.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{m!.email}</div>
                </div>
                {canEdit && (
                  <button
                    title="Remove from group"
                    style={{ padding: "2px 6px", flexShrink: 0 }}
                    onClick={() => handleRemoveMember(m!.id)}
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
  const [search, setSearch]           = useState("");
  const [sort, setSort]               = useState<SortKey>("name");
  const [sortAsc, setSortAsc]         = useState(true);
  const [createOpen, setCreateOpen]   = useState(false);
  const [selectedId, setSelectedId]   = useState<string | null>(null);

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

        {/* Header */}
        <div className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
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

        {/* Search + sort bar */}
        <div className="panel" style={{ padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search groups…"
              style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
            />
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
            <span className="hint" style={{ fontSize: 12 }}>Sort:</span>
            <SortBtn col="name" label="Name" />
            <SortBtn col="members" label="Members" />
            <SortBtn col="created" label="Date" />
          </div>
        </div>

        {/* Error */}
        {error && <div className="panel"><p className="danger-text" style={{ margin: 0 }}>{error}</p></div>}

        {/* Loading */}
        {loading && (
          <div className="panel empty-state"><p className="hint">Loading groups…</p></div>
        )}

        {/* Empty state */}
        {!loading && groups.length === 0 && (
          <div className="panel empty-state">
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
          <div className="panel empty-state">
            <p className="hint">No groups match your search.</p>
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
                  {canEdit && (
                    <button
                      style={{ fontSize: 12, padding: "3px 10px" }}
                      onClick={() => setSelectedId(g.id)}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="danger"
                      style={{ fontSize: 12, padding: "3px 10px" }}
                      onClick={async () => {
                        if (!confirm(`Delete group "${g.name}"? This cannot be undone.`)) return;
                        try { await onDeleteGroup(g.id); if (selectedId === g.id) setSelectedId(null); }
                        catch (e: any) { alert(e?.message || "Failed to delete group."); }
                      }}
                    >
                      <Trash2 size={12} />
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
          <div className="panel" style={{ textAlign: "center", padding: "32px 20px" }}>
            <Users size={28} style={{ opacity: 0.25, marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Select a group</p>
            <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Click a group card to view members and manage the group.
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="panel">
          <h3 className="ed-section-title" style={{ marginBottom: 8 }}>Summary</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span className="hint">Total Groups</span>
              <strong>{groups.length}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span className="hint">Total Members</span>
              <strong>{new Set(groups.flatMap(g => g.members.map(m => m.userId))).size}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
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
    </div>
  );
}
