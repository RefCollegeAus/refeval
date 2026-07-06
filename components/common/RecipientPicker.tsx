"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
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

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Assign To *</div>

      {alreadyAssignedIds && (
        <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: 12 }}>
          <span style={{ color: "var(--muted)" }}>Already assigned: <strong>{alreadyCount}</strong></span>
          <span style={{ color: "var(--accent)" }}>Available to add: <strong>{eligibleCount}</strong></span>
        </div>
      )}

      <div className="assign-tabs">
        <button className={"assign-tab" + (tab === "users"  ? " assign-tab--active" : "")} onClick={() => { setTab("users");  setQuery(""); }}>Users</button>
        {groups.length > 0 && (
          <button className={"assign-tab" + (tab === "groups" ? " assign-tab--active" : "")} onClick={() => { setTab("groups"); setQuery(""); }}>Groups</button>
        )}
        <button className={"assign-tab" + (tab === "org"   ? " assign-tab--active" : "")} onClick={() => { setTab("org");   setQuery(""); }}>Organisation</button>
      </div>

      {tab === "users" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 6, alignItems: "center" }}>
            {selected.size > 0 && <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 12 }}>{selected.size} selected</span>}
            <button type="button" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setSelected(new Set(filteredUsers.map(m => m.id)))}>Select All</button>
            <button type="button" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setSelected(new Set())}>Clear All</button>
          </div>
          <div style={{ position: "relative", marginBottom: 6 }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search referees…" style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }} />
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, maxHeight: 200, overflowY: "auto" }}>
            {filteredUsers.length === 0 && (
              <p className="hint" style={{ padding: "10px 12px", margin: 0 }}>
                {alreadyAssignedIds && eligibleReferees.length === 0 ? "All referees are already assigned." : "No referees found."}
              </p>
            )}
            {filteredUsers.map(m => (
              <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: selected.has(m.id) ? "var(--panel2)" : undefined }}>
                <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleUser(m.id)} style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name || m.email}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.email}</div>
                </div>
              </label>
            ))}
          </div>
        </>
      )}

      {tab === "groups" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 6, alignItems: "center" }}>
            {selGroups.size > 0 && <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 12 }}>{selGroups.size} group{selGroups.size !== 1 ? "s" : ""} selected</span>}
            <button type="button" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setSelGroups(new Set(filteredGroups.map(g => g.id)))}>Select All</button>
            <button type="button" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setSelGroups(new Set())}>Clear All</button>
          </div>
          <div style={{ position: "relative", marginBottom: 6 }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search groups…" style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }} />
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, maxHeight: 200, overflowY: "auto" }}>
            {filteredGroups.length === 0 && <p className="hint" style={{ padding: "10px 12px", margin: 0 }}>No groups found.</p>}
            {filteredGroups.map(g => {
              const totalMembers    = g.members.length;
              const eligibleMembers = alreadyAssignedIds
                ? g.members.filter(gm => !alreadyAssignedIds.has(gm.userId)).length
                : totalMembers;
              const assignedMembers = totalMembers - eligibleMembers;
              return (
                <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)", background: selGroups.has(g.id) ? "var(--panel2)" : undefined }}>
                  <input type="checkbox" checked={selGroups.has(g.id)} onChange={() => toggleGroup(g.id)} style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }} />
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: g.colour, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</div>
                    {alreadyAssignedIds ? (
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {totalMembers} member{totalMembers !== 1 ? "s" : ""}
                        {" · "}<span style={{ color: "var(--accent)" }}>{eligibleMembers} eligible</span>
                        {assignedMembers > 0 && ` · ${assignedMembers} already assigned`}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {totalMembers} member{totalMembers !== 1 ? "s" : ""}{g.description ? ` · ${g.description}` : ""}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </>
      )}

      {tab === "org" && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", background: "var(--panel2)" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Assign to entire organisation</p>
          {alreadyAssignedIds ? (
            <p className="hint" style={{ margin: "4px 0 0", fontSize: 12 }}>
              {referees.length} referee{referees.length !== 1 ? "s" : ""} total
              {" · "}<span style={{ color: "var(--accent)" }}>{eligibleCount} eligible</span>
              {alreadyCount > 0 && ` · ${alreadyCount} already assigned`}
            </p>
          ) : (
            <p className="hint" style={{ margin: "4px 0 0", fontSize: 12 }}>
              All {referees.length} referee{referees.length !== 1 ? "s" : ""} in your organisation. Duplicates will be skipped automatically.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
