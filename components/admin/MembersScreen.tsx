"use client";

import { useState, useEffect, useMemo } from "react";
import { UserPlus, RefreshCw, X, ChevronUp, ChevronDown, Search } from "lucide-react";
import {
  getEnrichedMembers, inviteMember, resendInvitation,
  updateMemberRole, removeMember,
} from "@/lib/services/memberships";
import type { EnrichedMember } from "@/lib/types/members";
import type { Role, RefEvalSession } from "@/lib/types/auth";

const ROLE_LABELS: Record<Role, string> = {
  referee: "Referee",
  educator: "Educator",
  admin: "Org Admin",
  super_admin: "Super Admin",
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

type SortField = "name" | "email" | "role" | "invitationStatus" | "joinedAt" | "lastSignInAt";

function sortValue(m: EnrichedMember, f: SortField): string {
  const v = m[f];
  return (v ?? "").toString().toLowerCase();
}

export function MembersScreen({
  session,
  onNavigateSettings,
  onRefreshOrgMembers,
}: {
  session: RefEvalSession;
  onNavigateSettings: () => void;
  onRefreshOrgMembers: () => void;
}) {
  const orgId = session.activeOrganisation?.id || "";
  const isSuperAdmin = session.activeRole === "super_admin";
  const assignableRoles: Role[] = isSuperAdmin
    ? ["referee", "educator", "admin", "super_admin"]
    : ["referee", "educator"];

  const [members, setMembers] = useState<EnrichedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("referee");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  async function load() {
    setLoading(true);
    setPageError("");
    try {
      const data = await getEnrichedMembers(orgId);
      setMembers(data);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? members.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      : members;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortField);
      const bv = sortValue(b, sortField);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [members, search, sortField, sortDir]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteLoading(true);
    const result = await inviteMember({
      email: inviteEmail.trim(), name: inviteName.trim(),
      role: inviteRole, organisationId: orgId,
    });
    setInviteLoading(false);
    if ("error" in result) { setInviteError(result.error); return; }
    setInviteEmail(""); setInviteName(""); setInviteRole("referee");
    flash(`Invitation sent to ${inviteEmail.trim()}.`);
    load();
    onRefreshOrgMembers();
  }

  async function handleRoleChange(member: EnrichedMember, role: Role) {
    setActionLoading(member.id);
    const result = await updateMemberRole({ userId: member.id, organisationId: orgId, role });
    setActionLoading(null);
    if ("error" in result) { setPageError(result.error); return; }
    setMembers(ms => ms.map(m => m.id === member.id ? { ...m, role } : m));
    onRefreshOrgMembers();
    flash(`${member.name}'s role updated to ${ROLE_LABELS[role]}.`);
  }

  async function handleResend(member: EnrichedMember) {
    setActionLoading(member.id);
    const result = await resendInvitation({ email: member.email, organisationId: orgId });
    setActionLoading(null);
    if ("error" in result) { setPageError(result.error); return; }
    flash(`Invitation resent to ${member.email}.`);
  }

  async function handleRemove(member: EnrichedMember) {
    if (!confirm(`Remove ${member.name} from this organisation?\n\nThis cannot be undone.`)) return;
    setActionLoading(member.id);
    const result = await removeMember({ userId: member.id, organisationId: orgId });
    setActionLoading(null);
    if ("error" in result) { setPageError(result.error); return; }
    setMembers(ms => ms.filter(m => m.id !== member.id));
    onRefreshOrgMembers();
    flash(`${member.name} has been removed.`);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span style={{ opacity: 0.25, fontSize: 11 }}>↕</span>;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  const pendingCount = members.filter(m => m.invitationStatus === "pending").length;

  return (
    <div className="layout one-col">
      <section className="panel">
        <div className="table-head" style={{ marginBottom: 18 }}>
          <div>
            <p className="eyebrow">{session.activeOrganisation?.name || "Organisation"}</p>
            <h1 style={{ marginBottom: 0 }}>Member Management</h1>
            <p className="hint" style={{ marginTop: 6 }}>
              {loading ? "Loading…" : `${members.length} member${members.length !== 1 ? "s" : ""}`}
              {!loading && pendingCount > 0 && ` · ${pendingCount} pending invitation${pendingCount !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="export-row">
            <button onClick={load} title="Refresh member list">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={onNavigateSettings}>Organisation Settings</button>
          </div>
        </div>

        {successMsg && <div className="success-banner">{successMsg}</div>}
        {pageError && (
          <p className="danger-text">
            {pageError}{" "}
            <button
              style={{ all: "unset", cursor: "pointer", textDecoration: "underline" }}
              onClick={() => setPageError("")}
            >
              Dismiss
            </button>
          </p>
        )}

        {/* ── Invite form ── */}
        <div className="analytics-card" style={{ marginTop: 14, marginBottom: 18 }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserPlus size={16} /> Invite New Member
          </h2>
          <form className="setup-grid" onSubmit={handleInvite} style={{ marginTop: 0, alignItems: "end" }}>
            <label>
              Full name
              <input
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </label>
            <label>
              Role
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}>
                {assignableRoles.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </label>
            <div style={{ display: "grid", gap: 8 }}>
              {inviteError && <p className="danger-text" style={{ margin: 0 }}>{inviteError}</p>}
              <button type="submit" className="primary" disabled={inviteLoading}>
                {inviteLoading ? "Sending…" : "Send Invitation"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Search ── */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <Search
            size={14}
            style={{
              position: "absolute", left: 13, top: "50%",
              transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none",
            }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ paddingLeft: 38 }}
          />
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="empty-state">Loading members…</div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            {search
              ? "No members match your search."
              : "No members yet. Send the first invitation above."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  {(
                    [
                      ["name", "Name"],
                      ["email", "Email"],
                      ["role", "Role"],
                      ["invitationStatus", "Status"],
                      ["joinedAt", "Date Added"],
                      ["lastSignInAt", "Last Sign In"],
                    ] as [SortField, string][]
                  ).map(([field, label]) => (
                    <th
                      key={field}
                      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                      onClick={() => toggleSort(field)}
                    >
                      {label} <SortIcon field={field} />
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(member => {
                  const isSelf = member.id === session.user.id;
                  const busy = actionLoading === member.id;
                  const canEditRole =
                    !isSelf &&
                    (isSuperAdmin ||
                      (session.activeRole === "admin" &&
                        member.role !== "admin" &&
                        member.role !== "super_admin"));

                  return (
                    <tr key={member.id} style={{ opacity: busy ? 0.5 : 1 }}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatar-initials" aria-hidden>
                            {member.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{member.name}</div>
                            {isSelf && <div className="hint" style={{ fontSize: 11 }}>You</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 13 }}>{member.email}</td>
                      <td>
                        {canEditRole ? (
                          <select
                            value={member.role}
                            disabled={busy}
                            onChange={e => handleRoleChange(member, e.target.value as Role)}
                            style={{ width: "auto", padding: "5px 8px", fontSize: 13 }}
                          >
                            {(isSuperAdmin
                              ? (["referee", "educator", "admin", "super_admin"] as Role[])
                              : (["referee", "educator"] as Role[])
                            ).map(r => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`role-badge role-${member.role}`}>
                            {ROLE_LABELS[member.role]}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${member.invitationStatus}`}>
                          {member.invitationStatus === "pending" ? "Pending" : "Active"}
                        </span>
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 13, whiteSpace: "nowrap" }}>
                        {fmt(member.joinedAt)}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 13, whiteSpace: "nowrap" }}>
                        {fmt(member.lastSignInAt)}
                      </td>
                      <td>
                        <div className="export-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                          {member.invitationStatus === "pending" && (
                            <button
                              onClick={() => handleResend(member)}
                              disabled={busy}
                              style={{ fontSize: 12, padding: "5px 10px" }}
                              title="Resend invitation email"
                            >
                              Resend
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              className="danger"
                              onClick={() => handleRemove(member)}
                              disabled={busy}
                              style={{ fontSize: 12, padding: "5px 10px" }}
                              title="Remove from organisation"
                            >
                              <X size={12} /> Remove
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
      </section>
    </div>
  );
}
