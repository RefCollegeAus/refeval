"use client";

import { useState, useEffect, useMemo } from "react";
import { UserPlus, RefreshCw, X, ChevronUp, ChevronDown, Search, Settings, Shield } from "lucide-react";
import {
  getEnrichedMembers, inviteMember, resendInvitation,
  updateMemberRole, removeMember,
} from "@/lib/services/memberships";
import { ManageUserModal } from "@/components/admin/ManageUserModal";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { showToast } from "@/lib/toast";
import type { EnrichedMember } from "@/lib/types/members";
import type { Role, RefEvalSession } from "@/lib/types/auth";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, EmptyState, Input, Select, Spinner, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { ROLE_TONE } from "@/lib/utils/roleTone";
import { cn } from "@/lib/utils/cn";

const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  referee: "Referee",
  educator: "Educator",
  admin: "Administrator",
  super_admin: "Super Admin",
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Full platform access — all features, settings, and role assignment.",
  admin:       "Organisation management — invite members, configure settings, and access all tools.",
  educator:    "Creates reviews, manages learning assignments, and coaches referees.",
  referee:     "Views their own reviews, completes assigned learning, and tracks development goals.",
  viewer:      "No default access — permissions can be assigned individually.",
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [managingMember, setManagingMember] = useState<EnrichedMember | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<EnrichedMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

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
    try {
      const data = await getEnrichedMembers(orgId);
      setMembers(data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load members.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    showToast(`Invitation sent to ${inviteEmail.trim()}.`, "success");
    load();
    onRefreshOrgMembers();
  }

  async function handleRoleChange(member: EnrichedMember, role: Role) {
    setActionLoading(member.id);
    const result = await updateMemberRole({ userId: member.id, organisationId: orgId, role });
    setActionLoading(null);
    if ("error" in result) { showToast(result.error, "error"); return; }
    setMembers(ms => ms.map(m => m.id === member.id ? { ...m, role } : m));
    onRefreshOrgMembers();
    showToast(`${member.name}'s role updated to ${ROLE_LABELS[role]}.`, "success");
  }

  async function handleResend(member: EnrichedMember) {
    setActionLoading(member.id);
    const result = await resendInvitation({ email: member.email, organisationId: orgId });
    setActionLoading(null);
    if ("error" in result) { showToast(result.error, "error"); return; }
    showToast(`Invitation resent to ${member.email}.`, "success");
  }

  function handleRemove(member: EnrichedMember) {
    setConfirmRemoveMember(member);
  }

  async function confirmRemove(member: EnrichedMember) {
    setRemovingMember(true);
    const result = await removeMember({ userId: member.id, organisationId: orgId });
    setRemovingMember(false);
    setConfirmRemoveMember(null);
    if ("error" in result) { showToast(result.error, "error"); return; }
    setMembers(ms => ms.filter(m => m.id !== member.id));
    onRefreshOrgMembers();
    showToast(`${member.name} has been removed.`, "success");
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="opacity-25 text-[11px]">↕</span>;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  const pendingCount   = members.filter(m => m.invitationStatus === "pending").length;
  const refereeCount   = members.filter(m => m.role === "referee").length;
  const educatorCount  = members.filter(m => m.role === "educator").length;
  const adminCount     = members.filter(m => m.role === "admin" || m.role === "super_admin").length;

  return (
    <PageFrame
      className="mx-auto max-w-[1200px]"
      eyebrow={session.activeOrganisation?.name || "Organisation"}
      title="Member Management"
      description={
        loading
          ? "Loading members…"
          : `${members.length} member${members.length !== 1 ? "s" : ""}${pendingCount > 0 ? ` · ${pendingCount} pending invitation${pendingCount !== 1 ? "s" : ""}` : ""}`
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={load}>
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={onNavigateSettings}>Org Settings</Button>
          {onNavigateTeam && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={onNavigateTeam}>
              <Shield size={13} /> Permissions
            </Button>
          )}
        </div>
      }
    >
      {/* ── Role stats ── */}
      {!loading && members.length > 0 && (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
          <div className="ed-summary-card"><div className="ed-summary-number">{members.length}</div><div className="ed-summary-label">Total</div></div>
          <div className="ed-summary-card"><div className="ed-summary-number">{refereeCount}</div><div className="ed-summary-label">Referees</div></div>
          <div className="ed-summary-card"><div className="ed-summary-number">{educatorCount}</div><div className="ed-summary-label">Educators</div></div>
          <div className="ed-summary-card"><div className="ed-summary-number">{adminCount}</div><div className="ed-summary-label">Admins</div></div>
          <div className="ed-summary-card"><div className={cn("ed-summary-number", pendingCount > 0 && "text-warn")}>{pendingCount}</div><div className="ed-summary-label">Pending</div></div>
        </div>
      )}

      {/* ── Invite form ── */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
          <UserPlus size={15} className="text-accent" />
          Invite New Member
        </h2>
        <form className="setup-grid items-end" onSubmit={handleInvite}>
          <label className="grid gap-1 text-xs font-semibold text-muted">
            Full name
            <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Jane Smith" required />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted">
            Email address
            <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="jane@example.com" required />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted">
            Role
            <Select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}>
              {assignableRoles.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </Select>
            <span className="text-[11px] font-normal text-muted">{ROLE_DESCRIPTIONS[inviteRole]}</span>
          </label>
          <div className="grid gap-2">
            {inviteError && <p className="text-[13px] text-red-300">{inviteError}</p>}
            <Button type="submit" variant="primary" disabled={inviteLoading}>
              {inviteLoading ? "Sending…" : "Send Invitation"}
            </Button>
          </div>
        </form>
        {!isSuperAdmin && (
          <p className="mt-2.5 text-xs text-muted">
            Admin and Super Admin roles can only be assigned by a Super Admin.
          </p>
        )}
      </Card>

      {/* ── Member list ── */}
      <Card>
        {/* Search + count */}
        {members.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <div className="relative max-w-[380px] flex-[1_1_260px]">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-8" />
            </div>
            <span className="whitespace-nowrap text-xs text-muted">
              {search
                ? `${displayed.length} of ${members.length} member${members.length !== 1 ? "s" : ""}`
                : `${members.length} member${members.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
            <Spinner size={16} /> Loading members…
          </div>
        )}

        {!loading && members.length === 0 && (
          <EmptyState
            icon={<UserPlus size={28} />}
            title="No members yet"
            description="Send the first invitation above to add people to your organisation."
          />
        )}

        {!loading && members.length > 0 && displayed.length === 0 && (
          <EmptyState title="No members match your search" description="Try a different name or email." />
        )}

        {!loading && displayed.length > 0 && (
          <Table>
            <TableHead>
              <TableRow>
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
                  <TableHeaderCell key={field} className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(field)}>
                    {label} <SortIcon field={field} />
                  </TableHeaderCell>
                ))}
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayed.map(member => {
                const isSelf    = member.id === session.user.id;
                const busy      = actionLoading === member.id;
                const tone      = ROLE_TONE[member.role] ?? ROLE_TONE.viewer;
                const canEditRole =
                  !isSelf &&
                  (isSuperAdmin ||
                    (session.activeRole === "admin" &&
                      member.role !== "admin" &&
                      member.role !== "super_admin"));

                return (
                  <TableRow key={member.id} className={busy ? "opacity-50" : undefined}>
                    <TableCell data-label="Name">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-black", tone.bg, tone.border, tone.text)}>
                          {member.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-text">{member.name}</div>
                          {isSelf && <div className="text-[11px] text-muted">You</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell data-label="Email" className="text-[13px] text-muted">{member.email}</TableCell>
                    <TableCell data-label="Role">
                      {canEditRole ? (
                        <Select value={member.role} disabled={busy} onChange={e => handleRoleChange(member, e.target.value as Role)} className="w-auto py-1.5 text-[13px]">
                          {assignableRoles.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </Select>
                      ) : (
                        <Badge tone="neutral" className={tone.text}>{ROLE_LABELS[member.role]}</Badge>
                      )}
                    </TableCell>
                    <TableCell data-label="Status">
                      <Badge tone={member.invitationStatus === "pending" ? "warn" : "good"}>
                        {member.invitationStatus === "pending" ? "Pending" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell data-label="Date Added" className="whitespace-nowrap text-[13px] text-muted">{fmt(member.joinedAt)}</TableCell>
                    <TableCell data-label="Last Sign In" className="whitespace-nowrap text-[13px] text-muted">{fmt(member.lastSignInAt)}</TableCell>
                    <TableCell data-label="">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button variant="secondary" size="sm" className="gap-1" onClick={() => setManagingMember(member)} disabled={busy} title="Manage user profile and security">
                          <Settings size={12} /> Manage
                        </Button>
                        {member.invitationStatus === "pending" && (
                          <Button variant="secondary" size="sm" onClick={() => handleResend(member)} disabled={busy} title="Resend invitation email">
                            Resend
                          </Button>
                        )}
                        {!isSelf && (
                          <Button variant="danger" size="sm" className="gap-1" onClick={() => handleRemove(member)} disabled={busy} title="Remove from organisation">
                            <X size={12} /> Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {managingMember && (
        <ManageUserModal
          member={managingMember}
          session={session}
          onClose={() => setManagingMember(null)}
          onRefresh={() => { load(); onRefreshOrgMembers(); setManagingMember(null); }}
        />
      )}

      {confirmRemoveMember && (
        <ConfirmModal
          title={`Remove ${confirmRemoveMember.name}?`}
          message="This will remove them from the organisation. They will lose access immediately. This cannot be undone."
          confirmLabel="Remove"
          busyLabel="Removing…"
          busy={removingMember}
          onCancel={() => setConfirmRemoveMember(null)}
          onConfirm={() => confirmRemove(confirmRemoveMember)}
        />
      )}
    </PageFrame>
  );
}
