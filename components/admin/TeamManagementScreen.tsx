"use client";

import { useState } from "react";
import { Users, Shield, Search } from "lucide-react";
import type { RefEvalSession, Role } from "@/lib/types/auth";
import type { MemberRecord } from "@/lib/types/members";
import { PERMISSION_GROUPS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/types/permissions";
import { defaultPermsForRole } from "@/lib/utils/permissions";
import { useModalA11y } from "@/lib/hooks/useModalA11y";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, EmptyState, Input, Spinner, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { ROLE_TONE } from "@/lib/utils/roleTone";
import { cn } from "@/lib/utils/cn";

interface Props {
  session: RefEvalSession;
  members: MemberRecord[];
  permissionMap: Map<string, Set<string>>;
  permissionsLoading: boolean;
  onSavePerms: (userId: string, perms: Set<string>) => Promise<void>;
  onBack: () => void;
}

const ROLE_LABELS: Record<Role, string> = {
  viewer:      "Viewer",
  referee:     "Referee",
  educator:    "Educator",
  admin:       "Administrator",
  super_admin: "Super Admin",
};

// ── Edit Permissions Modal ────────────────────────────────────────────────────

interface EditModalProps {
  member: MemberRecord;
  currentPerms: Set<string> | null; // null = using role defaults
  onSave: (perms: Set<string>) => Promise<void>;
  onClose: () => void;
}

function EditPermissionsModal({ member, currentPerms, onSave, onClose }: EditModalProps) {
  // Initialise checkboxes: if custom perms exist use those, otherwise use role defaults
  const [checked, setChecked] = useState<Set<string>>(
    () => currentPerms != null ? new Set(currentPerms) : defaultPermsForRole(member.role)
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose);

  function toggle(key: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function restoreDefaults() {
    setChecked(defaultPermsForRole(member.role));
  }

  function selectAll() {
    const all = new Set<string>();
    for (const g of PERMISSION_GROUPS) for (const p of g.permissions) all.add(p.key);
    setChecked(all);
  }

  function clearAll() {
    setChecked(new Set());
  }

  async function handleSave() {
    setSaving(true);
    setErr("");
    try {
      await onSave(checked);
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to save permissions.");
      setSaving(false);
    }
  }

  const defaultSet = defaultPermsForRole(member.role);
  const isDefaultState = checked.size === defaultSet.size && Array.from(checked).every(k => defaultSet.has(k));
  const totalGranted = checked.size;
  const totalAvailable = PERMISSION_GROUPS.reduce((n, g) => n + g.permissions.length, 0);
  const tone = ROLE_TONE[member.role] ?? ROLE_TONE.viewer;

  return (
    <div className="modal-backdrop">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Edit Permissions — ${member.name || member.email}`} tabIndex={-1} className="modal flex flex-col" style={{ maxWidth: 600, maxHeight: "90vh" }}>

        {/* Modal header */}
        <div className="modal-title shrink-0">
          <div>
            <p className="eyebrow">Edit Permissions</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>{member.name || member.email}</h1>
          </div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Role + actions row */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted">Role:</span>
            <Badge tone="neutral" className={tone.text}>{ROLE_LABELS[member.role]}</Badge>
            <span className="text-xs text-muted">
              {totalGranted} / {totalAvailable} permissions granted
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="secondary" size="sm" onClick={restoreDefaults} title={`Reset to ${ROLE_LABELS[member.role]} defaults`}>
              Restore Role Defaults
            </Button>
            <Button variant="secondary" size="sm" onClick={selectAll}>All</Button>
            <Button variant="secondary" size="sm" onClick={clearAll}>None</Button>
          </div>
        </div>

        {/* Custom indicator */}
        {!isDefaultState && (
          <div className="shrink-0 pt-1.5 text-xs text-accent">
            ✦ Custom permissions (differs from {ROLE_LABELS[member.role]} defaults)
          </div>
        )}

        {/* Permission groups — scrollable */}
        <div className="flex-1 overflow-y-auto pb-1 pt-3">
          {PERMISSION_GROUPS.map(group => (
            <div key={group.label} className="mb-4">
              <p className="mb-1.5 text-[13px] font-bold uppercase tracking-wide text-muted">
                {group.label}
              </p>
              <div className="grid gap-1">
                {group.permissions.map(({ key, label }) => {
                  const isChecked = checked.has(key);
                  const isDefault = defaultSet.has(key);
                  return (
                    <label
                      key={key}
                      className={cn("flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-1.5", isChecked ? "border-border bg-panel-2" : "border-transparent")}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(key)}
                        className="h-[15px] w-[15px] shrink-0 cursor-pointer accent-accent"
                      />
                      <span className="flex-1 text-[13px] text-text">{label}</span>
                      {isDefault && !isChecked && (
                        <span className="text-[10px] text-muted opacity-60">default ✓</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {err && <p className="shrink-0 pt-1.5 text-[13px] text-red-300">{err}</p>}

        {/* Footer */}
        <div className="action-row mt-3 shrink-0 border-t border-border pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Team Management Screen ────────────────────────────────────────────────────

export function TeamManagementScreen({ session, members, permissionMap, permissionsLoading, onSavePerms, onBack }: Props) {
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [query, setQuery] = useState("");

  // Sort: self last, then alphabetically
  const sorted = [...members].sort((a, b) => {
    if (a.id === session.user.id) return 1;
    if (b.id === session.user.id) return -1;
    return (a.name || a.email).localeCompare(b.name || b.email);
  });

  // Filter by name, email, or role label (case-insensitive)
  const q = query.trim().toLowerCase();
  const filtered = q
    ? sorted.filter(m =>
        (m.name || "").toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        ROLE_LABELS[m.role].toLowerCase().includes(q)
      )
    : sorted;

  const canEditPerms =
    session.activeRole === "admin" || session.activeRole === "super_admin";

  return (
    <PageFrame
      className="mx-auto max-w-[1100px]"
      eyebrow="Organisation"
      title="Team Management"
      description="Customise individual permissions for team members, or restore their role defaults."
      actions={<Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>}
    >
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-info/25 bg-info/[.08] p-3.5 text-[13px] text-blue-300">
        <Shield size={15} className="mt-0.5 shrink-0" />
        <span>
          Permissions extend the base role. If a member has no custom permissions set, their role defaults apply.
          Custom permissions override the role entirely for that member. To see what each role includes by default, visit <strong>Roles &amp; Permissions</strong> in Organisation Settings.
        </span>
      </div>

      {/* Loading */}
      {permissionsLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Spinner size={16} /> Loading permissions…
        </div>
      )}

      {/* Search + result count */}
      {members.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative max-w-[360px] flex-[1_1_260px]">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search team members…" className="pl-8" />
          </div>
          <span className="whitespace-nowrap text-[13px] text-muted">
            {q
              ? `Showing ${filtered.length} of ${members.length} team member${members.length !== 1 ? "s" : ""}`
              : `${members.length} team member${members.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      )}

      {/* Member table */}
      {!permissionsLoading && members.length === 0 && (
        <EmptyState
          icon={<Users size={28} />}
          title="No members yet"
          description="Invite your first members via Member Management, then return here to set custom permissions."
        />
      )}

      {members.length > 0 && filtered.length === 0 && (
        <p className="py-4 text-sm text-muted">No team members match your search.</p>
      )}

      {filtered.length > 0 && (
        <Card className="!p-0">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Permissions</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(m => {
                const customPerms = permissionMap.get(m.id) ?? null;
                const hasCustom = customPerms !== null;
                const grantedCount = hasCustom
                  ? customPerms.size
                  : ROLE_DEFAULT_PERMISSIONS[m.role]?.length ?? 0;
                const isSelf = m.id === session.user.id;
                const tone = ROLE_TONE[m.role] ?? ROLE_TONE.viewer;
                return (
                  <TableRow key={m.id}>
                    <TableCell data-label="Name" className="font-semibold text-text">
                      {m.name || "—"}
                      {isSelf && <span className="ml-1.5 text-[11px] font-normal text-muted">(you)</span>}
                    </TableCell>
                    <TableCell data-label="Email" className="text-muted">{m.email}</TableCell>
                    <TableCell data-label="Role">
                      <Badge tone="neutral" className={tone.text}>{ROLE_LABELS[m.role]}</Badge>
                    </TableCell>
                    <TableCell data-label="Permissions">
                      {hasCustom ? (
                        <span className="flex items-center gap-1.5 text-xs text-accent">
                          <Shield size={12} />
                          Custom · {grantedCount} granted
                        </span>
                      ) : (
                        <span className="text-xs text-muted">
                          Role defaults · {grantedCount} granted
                        </span>
                      )}
                    </TableCell>
                    <TableCell data-label="" className="text-right">
                      {canEditPerms && (
                        <Button variant="secondary" size="sm" className="gap-1" onClick={() => setEditingMember(m)}>
                          <Shield size={12} /> Edit Permissions
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit modal */}
      {editingMember && (
        <EditPermissionsModal
          member={editingMember}
          currentPerms={permissionMap.get(editingMember.id) ?? null}
          onSave={(perms) => onSavePerms(editingMember.id, perms)}
          onClose={() => setEditingMember(null)}
        />
      )}
    </PageFrame>
  );
}
