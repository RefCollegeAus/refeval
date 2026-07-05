"use client";

import { useState, useEffect, useMemo } from "react";
import { UserPlus, RefreshCw, X, ChevronUp, ChevronDown, Search, Settings, Shield } from "lucide-react";
import {
  getEnrichedMembers, inviteMember, resendInvitation,
  updateMemberRole, removeMember,
} from "@/lib/services/memberships";
import { ManageUserModal } from "@/components/admin/ManageUserModal";
import type { EnrichedMember } from "@/lib/types/members";
import type { Role, RefEvalSession } from "@/lib/types/auth";

const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  referee: "Referee",
  educator: "Educator",
  admin: "Org Admin",
  super_admin: "Super Admin",
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Full platform access — all features, settings, and role assignment.",
  admin:       "Organisation management — invite members, configure settings, and access all tools.",
  educator:    "Creates reviews, manages learning assignments, and coaches referees.",
  referee:     "Views their own reviews, completes assigned learning, and tracks development goals.",
  viewer:      "No default access — permissions can be assigned individually.",
};

const ROLE_COLOR: Record<Role, string> = {
  referee:     "#30d158",
  educator:    "#6fb8ff",
  admin:       "#ff9f0a",
  super_admin: "#c4b5fd",
  viewer:      "#636366",
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
  onNavigateTeam,
  onRefreshOrgMembers,
}: {
  session: RefEvalSession;
  onNavigateSettings: () => void;
  onNavigateTeam?: () => void;
  onRefreshOrgMembers: () => void;
}) {
  const orgId = session.activeOrganisation?.id || "";
  const isSuperAdmin = session.activeRole === "super_admin";
  const assignableRoles: Role[] = isSuperAdmin
    ? ["viewer", "referee", "educator", "admin", "super_admin"]
    : ["viewer", "referee", "educator"];

  const [members, setMembers] = useState<EnrichedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [managingMember, setManagingMember] = useState<EnrichedMember | null>(null);

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

  const pendingCount   = members.filter(m => m.invitationStatus === "pending").length;
  const refereeCount   = members.filter(m => m.role === "referee").length;
  const educatorCount  = members.filter(m => m.role === "educator").length;
  const adminCount     = members.filter(m => m.role === "admin" || m.role === "super_admin").length;

  return (
    <div className="layout one-col">

      {/* ── Page header ── */}
      <div className="panel" style={{ padding: "20px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>{session.activeOrganisation?.name || "Organisation"}</p>
          <h1 style={{ margin: "3px 0 0", fontSize: 24 }}>Member Management</h1>
          <p className="hint" style={{ margin: "5px 0 0" }}>
            {loading ? "Loading members…" : `${members.length} member${members.length !== 1 ? "s" : ""}`}
            {!loading && pendingCount > 0 && (
              <span style={{ marginLeft: 8, color: "#ff9f0a" }}>
                · {pendingCount} pending invitation{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={load} title="Refresh member list" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={onNavigateSettings} style={{ fontSize: 13 }}>Org Settings</button>
          {onNavigateTeam && (
            <button onClick={onNavigateTeam} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
              <Shield size={13} /> Permissions
            </button>
          )}
        </div>
      </div>

      {/* ── Role stats ── */}
      {!loading && members.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
          {[
            { label: "Total",     value: members.length,   color: "var(--accent)" },
            { label: "Referees",  value: refereeCount,     color: "#30d158" },
            { label: "Educators", value: educatorCount,    color: "#6fb8ff" },
            { label: "Admins",    value: adminCount,       color: "#ff9f0a" },
            { label: "Pending",   value: pendingCount,     color: pendingCount > 0 ? "#ff9f0a" : "var(--muted)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="ed-summary-card">
              <div className="ed-summary-number" style={{ color }}>{value}</div>
              <div className="ed-summary-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Banners ── */}
      {successMsg && <div className="success-banner">{successMsg}</div>}
      {pageError && (
        <p className="danger-text" style={{ margin: 0 }}>
          {pageError}{" "}
          <button style={{ all: "unset", cursor: "pointer", textDecoration: "underline" }} onClick={() => setPageError("")}>
            Dismiss
          </button>
        </p>
      )}

      {/* ── Invite form ── */}
      <div className="panel" style={{ padding: "20px 22px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, letterSpacing: "-0.01em" }}>
          <UserPlus size={15} style={{ color: "var(--accent)" }} />
          Invite New Member
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
            <span className="hint" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
              {ROLE_DESCRIPTIONS[inviteRole]}
            </span>
          </label>
          <div style={{ display: "grid", gap: 8 }}>
            {inviteError && <p className="danger-text" style={{ margin: 0, fontSize: 13 }}>{inviteError}</p>}
            <button type="submit" className="primary" disabled={inviteLoading}>
              {inviteLoading ? "Sending…" : "Send Invitation"}
            </button>
          </div>
        </form>
        {!isSuperAdmin && (
          <p className="hint" style={{ margin: "10px 0 0", fontSize: 12 }}>
            Admin and Super Admin roles can only be assigned by a Super Admin.
          </p>
        )}
      </div>

      {/* ── Member list ── */}
      <div className="panel" style={{ padding: "20px 22px" }}>

        {/* Search + count */}
        {members.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                style={{ paddingLeft: 30, width: "100%", boxSizing: "border-box", fontSize: 13 }}
              />
            </div>
            <span className="hint" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              {search
                ? `${displayed.length} of ${members.length} member${members.length !== 1 ? "s" : ""}`
                : `${members.length} member${members.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}

        {/* Loading */}
        {loading && <div className="loading-state" style={{ justifyContent: "center", padding: "32px 0" }}><span className="loading-spinner" />Loading members…</div>}

        {/* Empty state — no members */}
        {!loading && members.length === 0 && (
          <div style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(165,106,27,.1)", border: "1px solid rgba(165,106,27,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={22} style={{ color: "var(--accent)" }} />
            </div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>No members yet</p>
            <p className="hint" style={{ margin: 0, maxWidth: 380, fontSize: 13 }}>
              Send the first invitation above to add people to your organisation.
            </p>
          </div>
        )}

        {/* Empty state — no search match */}
        {!loading && members.length > 0 && displayed.length === 0 && (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>No members match your search</p>
            <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>Try a different name or email.</p>
          </div>
        )}

        {/* Table */}
        {!loading && displayed.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  {(
                    [
                      ["name",             "Name"],
                      ["email",            "Email"],
                      ["role",             "Role"],
                      ["invitationStatus", "Status"],
                      ["joinedAt",         "Date Added"],
                      ["lastSignInAt",     "Last Sign In"],
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
                  const isSelf    = member.id === session.user.id;
                  const busy      = actionLoading === member.id;
                  const roleColor = ROLE_COLOR[member.role] ?? "#636366";
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
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                            background: `${roleColor}20`,
                            border: `1.5px solid ${roleColor}40`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 900, color: roleColor,
                          }}>
                            {member.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{member.name}</div>
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
                        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", alignItems: "center" }}>
                          <button
                            onClick={() => setManagingMember(member)}
                            disabled={busy}
                            style={{ fontSize: 12, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}
                            title="Manage user profile and security"
                          >
                            <Settings size={12} /> Manage
                          </button>
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
                              style={{ fontSize: 12, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}
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
      </div>

      {managingMember && (
        <ManageUserModal
          member={managingMember}
          session={session}
          onClose={() => setManagingMember(null)}
          onRefresh={() => { load(); onRefreshOrgMembers(); setManagingMember(null); }}
        />
      )}
    </div>
  );
}
