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
import { useModalA11y } from "@/lib/hooks/useModalA11y";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, EmptyState, Input, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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
    <div className="mt-1.5 flex flex-wrap gap-2">
      {GROUP_COLOURS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={COLOUR_NAMES[c] ?? c}
          aria-pressed={value === c}
          className="h-7 w-7 shrink-0 rounded-full border-none"
          style={{ background: c, outline: value === c ? "3px solid var(--text)" : "none", outlineOffset: 2 }}
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
      <div className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-text">
        <span>Members <span className="font-normal text-muted">(referees only)</span></span>
        <div className="flex items-center gap-2">
          {selected.size > 0 && <span className="text-xs font-bold text-accent">{selected.size} selected</span>}
          <Button type="button" variant="secondary" size="sm" onClick={() => onChange(new Set(filtered.map(m => m.id)))}>
            Select All
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => onChange(new Set())}>
            Clear All
          </Button>
        </div>
      </div>
      <div className="relative mb-1.5">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search referees…" className="pl-8" />
      </div>
      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border">
        {referees.length === 0 ? (
          <p className="p-3 text-sm text-muted">No referees in this organisation.</p>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted">No matches.</p>
        ) : (
          filtered.map(m => (
            <label
              key={m.id}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 last:border-b-0",
                selected.has(m.id) && "bg-panel-2"
              )}
            >
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                onChange={() => toggle(m.id)}
                className="h-3.5 w-3.5 shrink-0 accent-accent"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text">{m.name}</div>
                <div className="truncate text-[11px] text-muted">{m.email}</div>
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
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose);

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={mode === "create" ? "Create Group" : "Edit Group"} tabIndex={-1} className="flex w-full max-w-lg flex-col rounded-2xl border border-border bg-panel p-5 shadow-xl focus:outline-none" style={{ maxHeight: "92vh" }}>
        <div className="modal-title shrink-0">
          <div>
            <p className="eyebrow">{mode === "create" ? "New Group" : "Edit Group"}</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>{mode === "create" ? "Create Group" : "Edit Group"}</h1>
          </div>
          <button aria-label="Close" onClick={onClose}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto pt-1">
          <div className="mt-3 grid gap-3.5">
            <label className="grid gap-1 text-sm font-semibold text-text">
              Group Name *
              <Input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g. Development Squad" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-text">
              Description <span className="text-xs font-normal text-muted">(optional)</span>
              <Textarea value={description} onChange={e => setDesc(e.target.value)} rows={2} placeholder="What is this group for?" />
            </label>
            <div>
              <div className="text-[13px] font-semibold text-text">Colour</div>
              <ColourPicker value={colour} onChange={setColour} />
            </div>
            <MemberPicker members={members} selected={selected} onChange={setSelected} />
          </div>
        </div>

        <div className="mt-4 shrink-0 border-t border-border pt-3">
          {err && <p className="mb-2.5 text-[13px] text-red-300">{err}</p>}
          <div className="action-row">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? `Create Group${selected.size > 0 ? ` (${selected.size})` : ""}` : "Save Changes"}
            </Button>
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
      <Card className="border-l-4" style={{ borderLeftColor: group.colour }}>

        {/* Group header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-accent">Group</p>
            <h2 className="text-lg font-bold text-text">{group.name}</h2>
            {group.description && <p className="mt-1 text-[13px] text-muted">{group.description}</p>}
            <p className="mt-1.5 text-xs text-muted">
              {group.members.length} member{group.members.length !== 1 ? "s" : ""} · Created {fmtDate(group.createdAt)}
            </p>
          </div>
          <button onClick={onClose} title="Close" aria-label="Close" className="shrink-0 rounded-lg p-1 text-muted hover:bg-panel-3"><X size={14} /></button>
        </div>

        {/* Edit / Delete actions */}
        {canEdit && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="gap-1" onClick={() => setEditOpen(true)}>
              <Pencil size={12} /> Edit
            </Button>
            {canDelete && (
              <Button variant="danger" size="sm" className="gap-1" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={12} /> Delete
              </Button>
            )}
          </div>
        )}

        {/* Members section */}
        <div className="mt-4 border-t border-border pt-3.5">
          <h3 className="mb-2.5 text-sm font-bold text-text">
            Members ({group.members.length})
          </h3>

          {/* Member search */}
          {group.members.length > 0 && (
            <div className="mb-2 flex items-center gap-1">
              <div className="relative flex-1">
                <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
                <Input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search members…" className="py-1.5 pl-6 text-xs" />
              </div>
              {memberSearch && (
                <button onClick={() => setMemberSearch("")} aria-label="Clear search" className="shrink-0 rounded-lg border-none bg-none p-1.5 text-muted">
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Member list */}
          {group.members.length === 0 ? (
            <EmptyState
              title="No members yet."
              action={
                canEdit ? (
                  <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>Add Members</Button>
                ) : (
                  <p className="text-xs text-muted">Contact an administrator to add members to this group.</p>
                )
              }
            />
          ) : filteredMembers.length === 0 ? (
            <p className="py-2 text-[13px] text-muted">No members match your search.</p>
          ) : (
            <div>
              {filteredMembers.map(({ gm, member: m }) => (
                <div key={gm.id} className="flex items-center gap-2 border-b border-border py-2.5 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-text">{m!.name}</div>
                    <div className="text-[11px] text-muted">{m!.email}</div>
                  </div>
                  {canEdit && (
                    <button
                      title="Remove from group"
                      aria-label={`Remove ${m!.name} from group`}
                      className="shrink-0 rounded-lg p-1 text-muted hover:bg-panel-3"
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
      </Card>

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
  eyebrow,
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
  eyebrow?: string;
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
      <Button variant="secondary" size="sm" className={cn("gap-1", sort === col && "bg-panel-2")} onClick={() => toggleSort(col)}>
        {label} <ArrowUpDown size={11} className={sort === col ? "opacity-100" : "opacity-40"} />
      </Button>
    );
  }

  return (
    <PageFrame
      className="p-0"
      eyebrow={eyebrow ?? "Learning Hub"}
      title="Groups"
      actions={
        <>
          {canCreate && (
            <Button variant="primary" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> New Group
            </Button>
          )}
          <Button variant="secondary" className="gap-1.5" onClick={onBack}><ChevronLeft size={15} /> Back</Button>
        </>
      }
    >
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">

          {/* ── Main column ── */}
          <div className="grid grid-cols-1 gap-3.5">

            {/* Search/sort toolbar — only when groups exist, kept outside any Card */}
            {!loading && groups.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative flex-[1_1_200px]">
                  <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups…" aria-label="Search groups" className="pl-8" />
                </div>
                {search && (
                  <button onClick={() => setSearch("")} aria-label="Clear search" className="shrink-0 rounded-lg border-none bg-none p-1.5 text-muted">
                    <X size={13} />
                  </button>
                )}
                <span className="ml-auto whitespace-nowrap text-xs text-muted">
                  {search ? `${filtered.length} of ${groups.length}` : groups.length} group{groups.length !== 1 ? "s" : ""}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-xs text-muted">Sort:</span>
                  <SortBtn col="name" label="Name" />
                  <SortBtn col="members" label="Members" />
                  <SortBtn col="created" label="Date" />
                </div>
              </div>
            )}

            {/* Error */}
            {error && <p className="text-[13px] text-red-300">{error}</p>}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
                <Spinner size={16} /> Loading groups…
              </div>
            )}

            {/* Empty state — no groups yet */}
            {!loading && groups.length === 0 && !error && (
              <EmptyState
                icon={<Users size={28} />}
                title="No groups yet"
                description="Create a group to organise referees into cohorts."
                action={canCreate ? <Button variant="primary" className="gap-1.5" onClick={() => setCreateOpen(true)}><Plus size={14} /> New Group</Button> : undefined}
              />
            )}

            {/* No search results */}
            {!loading && groups.length > 0 && filtered.length === 0 && (
              <EmptyState
                icon={<Search size={28} />}
                title="No groups match your search"
                action={<Button variant="secondary" size="sm" onClick={() => setSearch("")}>Clear search</Button>}
              />
            )}

            {/* Groups grid */}
            {!loading && filtered.length > 0 && (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                {filtered.map(g => (
                  <Card
                    key={g.id}
                    onClick={() => setSelectedId(prev => prev === g.id ? null : g.id)}
                    className={cn(
                      "cursor-pointer border-t-[3px] transition-colors",
                      selectedId === g.id ? "border-accent/60 bg-accent/[.05]" : "hover:bg-panel-2"
                    )}
                    style={{ borderTopColor: g.colour }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.colour }} />
                      <div className="min-w-0 flex-1 truncate text-sm font-bold text-text">{g.name}</div>
                      {g.members.length === 0 && <Badge tone="warn" className="shrink-0">Empty</Badge>}
                    </div>
                    {g.description && <p className="mt-1.5 line-clamp-2 text-xs text-muted">{g.description}</p>}
                    <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
                      <span className="flex items-center gap-1"><Users size={11} /> {g.members.length} member{g.members.length !== 1 ? "s" : ""}</span>
                      <span>{fmtDate(g.createdAt)}</span>
                    </div>
                    <div className="mt-2.5 flex gap-1.5" onClick={e => e.stopPropagation()}>
                      <Button variant="secondary" size="sm" className="gap-1" onClick={() => setSelectedId(prev => prev === g.id ? null : g.id)}>
                        <ChevronRight size={12} /> View
                      </Button>
                      {canDelete && (
                        <Button variant="danger" size="sm" className="gap-1" onClick={() => setPendingDeleteId(g.id)}>
                          <Trash2 size={12} /> Delete
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="grid grid-cols-1 gap-3.5">
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
              <EmptyState
                icon={<Users size={26} />}
                title="Select a group"
                description="Click a group card to view members and manage the group."
              />
            )}

            {/* Summary */}
            <Card className="shadow-none">
              <h3 className="mb-2.5 text-sm font-bold text-text">Summary</h3>
              <div className="grid">
                <div className="flex items-center justify-between border-b border-border py-1.5 text-[13px]">
                  <span className="text-muted">Total Groups</span>
                  <strong className="text-text">{groups.length}</strong>
                </div>
                <div className="flex items-center justify-between border-b border-border py-1.5 text-[13px]">
                  <span className="text-muted">Unique Members</span>
                  <strong className="text-text">{new Set(groups.flatMap(g => g.members.map(m => m.userId))).size}</strong>
                </div>
                <div className="flex items-center justify-between py-1.5 text-[13px]">
                  <span className="text-muted">Avg Size</span>
                  <strong className="text-text">
                    {groups.length > 0
                      ? Math.round(groups.reduce((s, g) => s + g.members.length, 0) / groups.length)
                      : 0}
                  </strong>
                </div>
              </div>
            </Card>
          </aside>
        </div>

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
    </PageFrame>
  );
}
