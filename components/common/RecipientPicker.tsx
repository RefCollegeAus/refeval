"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils/cn";
import type { MemberRecord } from "@/lib/types/members";
import type { Group } from "@/lib/types/groups";

export type AssignTab = "users" | "groups" | "org";

export function RecipientPicker({
  members,
  groups,
  tab,
  setTab,
  selected,
  setSelected,
  selGroups,
  setSelGroups,
  alreadyAssignedIds,
}: {
  members: MemberRecord[];
  groups: Group[];
  tab: AssignTab;
  setTab: (t: AssignTab) => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  selGroups: Set<string>;
  setSelGroups: (s: Set<string>) => void;
  alreadyAssignedIds?: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const referees = useMemo(() => members.filter(m => m.role === "referee"), [members]);

  const eligibleReferees = useMemo(
    () => alreadyAssignedIds ? referees.filter(m => !alreadyAssignedIds.has(m.id)) : referees,
    [referees, alreadyAssignedIds],
  );

  const q = query.trim().toLowerCase();
  const filteredUsers  = q ? eligibleReferees.filter(m => (m.name || "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q)) : eligibleReferees;
  const filteredGroups = q ? groups.filter(g => g.name.toLowerCase().includes(q) || (g.description || "").toLowerCase().includes(q)) : groups;

  function toggleUser(id: string)  { setSelected((prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })(selected)); }
  function toggleGroup(id: string) { setSelGroups((prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })(selGroups)); }

  const alreadyCount  = alreadyAssignedIds ? alreadyAssignedIds.size : 0;
  const eligibleCount = eligibleReferees.length;

  const usersTabContent = (
    <>
      <div className="mb-1.5 flex items-center justify-end gap-2">
        {selected.size > 0 && <span className="text-xs font-bold text-accent">{selected.size} selected</span>}
        <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set(filteredUsers.map(m => m.id)))}>Select All</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear All</Button>
      </div>
      <div className="relative mb-1.5">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search referees…" className="pl-7 text-sm" />
      </div>
      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border">
        {filteredUsers.length === 0 && (
          <p className="m-0 px-3 py-2.5 text-xs text-muted">
            {alreadyAssignedIds && eligibleReferees.length === 0 ? "All referees are already assigned." : "No referees found."}
          </p>
        )}
        {filteredUsers.map(m => (
          <label
            key={m.id}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2",
              selected.has(m.id) && "bg-panel-3"
            )}
          >
            <input
              type="checkbox"
              checked={selected.has(m.id)}
              onChange={() => toggleUser(m.id)}
              className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-accent"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-text">{m.name || m.email}</div>
              <div className="text-[11px] text-muted">{m.email}</div>
            </div>
          </label>
        ))}
      </div>
    </>
  );

  const groupsTabContent = (
    <>
      <div className="mb-1.5 flex items-center justify-end gap-2">
        {selGroups.size > 0 && <span className="text-xs font-bold text-accent">{selGroups.size} group{selGroups.size !== 1 ? "s" : ""} selected</span>}
        <Button type="button" variant="ghost" size="sm" onClick={() => setSelGroups(new Set(filteredGroups.map(g => g.id)))}>Select All</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setSelGroups(new Set())}>Clear All</Button>
      </div>
      <div className="relative mb-1.5">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search groups…" className="pl-7 text-sm" />
      </div>
      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border">
        {filteredGroups.length === 0 && <p className="m-0 px-3 py-2.5 text-xs text-muted">No groups found.</p>}
        {filteredGroups.map(g => {
          const totalMembers    = g.members.length;
          const eligibleMembers = alreadyAssignedIds
            ? g.members.filter(gm => !alreadyAssignedIds.has(gm.userId)).length
            : totalMembers;
          const assignedMembers = totalMembers - eligibleMembers;
          return (
            <label
              key={g.id}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2",
                selGroups.has(g.id) && "bg-panel-3"
              )}
            >
              <input
                type="checkbox"
                checked={selGroups.has(g.id)}
                onChange={() => toggleGroup(g.id)}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-accent"
              />
              <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.colour }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text">{g.name}</div>
                {alreadyAssignedIds ? (
                  <div className="text-[11px] text-muted">
                    {totalMembers} member{totalMembers !== 1 ? "s" : ""}
                    {" · "}<span className="text-accent">{eligibleMembers} eligible</span>
                    {assignedMembers > 0 && ` · ${assignedMembers} already assigned`}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted">
                    {totalMembers} member{totalMembers !== 1 ? "s" : ""}{g.description ? ` · ${g.description}` : ""}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </>
  );

  const orgTabContent = (
    <div className="rounded-xl border border-border bg-panel-2 p-3.5">
      <p className="m-0 text-sm font-bold text-text">Assign to entire organisation</p>
      {alreadyAssignedIds ? (
        <p className="mt-1 mb-0 text-xs text-muted">
          {referees.length} referee{referees.length !== 1 ? "s" : ""} total
          {" · "}<span className="text-accent">{eligibleCount} eligible</span>
          {alreadyCount > 0 && ` · ${alreadyCount} already assigned`}
        </p>
      ) : (
        <p className="mt-1 mb-0 text-xs text-muted">
          All {referees.length} referee{referees.length !== 1 ? "s" : ""} in your organisation. Duplicates will be skipped automatically.
        </p>
      )}
    </div>
  );

  const tabs: TabItem[] = [
    { id: "users", label: "Users", content: usersTabContent },
    ...(groups.length > 0 ? [{ id: "groups", label: "Groups", content: groupsTabContent }] : []),
    { id: "org", label: "Organisation", content: orgTabContent },
  ];

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-text">Assign To *</div>

      {alreadyAssignedIds && (
        <div className="mb-2.5 flex gap-3.5 text-xs">
          <span className="text-muted">Already assigned: <strong>{alreadyCount}</strong></span>
          <span className="text-accent">Available to add: <strong>{eligibleCount}</strong></span>
        </div>
      )}

      <Tabs
        tabs={tabs}
        ariaLabel="Assign to"
        activeId={tab}
        onChange={(id) => { setTab(id as AssignTab); setQuery(""); }}
      />
    </div>
  );
}
