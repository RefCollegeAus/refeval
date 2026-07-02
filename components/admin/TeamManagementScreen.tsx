"use client";

import { useState } from "react";
import { Users, Shield, Search } from "lucide-react";
import type { RefEvalSession, Role } from "@/lib/types/auth";
import type { MemberRecord } from "@/lib/types/members";
import { PERMISSION_GROUPS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/types/permissions";
import { defaultPermsForRole } from "@/lib/utils/permissions";

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
  admin:       "Admin",
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

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Modal header */}
        <div className="modal-title" style={{ flexShrink: 0 }}>
          <div>
            <p className="eyebrow">Edit Permissions</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>{member.name || member.email}</h1>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Role + actions row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Role:</span>
            <span className={`role-badge role-${member.role}`}>{ROLE_LABELS[member.role]}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {totalGranted} / {totalAvailable} permissions granted
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ fontSize: 12, padding: "3px 10px" }} onClick={restoreDefaults} title={`Reset to ${ROLE_LABELS[member.role]} defaults`}>
              Restore Role Defaults
            </button>
            <button style={{ fontSize: 12, padding: "3px 10px" }} onClick={selectAll}>All</button>
            <button style={{ fontSize: 12, padding: "3px 10px" }} onClick={clearAll}>None</button>
          </div>
        </div>

        {/* Custom indicator */}
        {!isDefaultState && (
          <div style={{ padding: "6px 0 0", fontSize: 12, color: "var(--accent)", flexShrink: 0 }}>
            ✦ Custom permissions (differs from {ROLE_LABELS[member.role]} defaults)
          </div>
        )}

        {/* Permission groups — scrollable */}
        <div style={{ overflowY: "auto", flex: 1, paddingTop: 12, paddingBottom: 4 }}>
          {PERMISSION_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 18 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                {group.label}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {group.permissions.map(({ key, label }) => {
                  const isChecked = checked.has(key);
                  const isDefault = defaultSet.has(key);
                  return (
                    <label
                      key={key}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 6, cursor: "pointer", background: isChecked ? "var(--panel2)" : undefined, border: "1px solid transparent", borderColor: isChecked ? "var(--border)" : "transparent" }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(key)}
                        style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, flex: 1 }}>{label}</span>
                      {isDefault && !isChecked && (
                        <span style={{ fontSize: 10, color: "var(--muted)", opacity: 0.6 }}>default ✓</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {err && <p className="danger-text" style={{ flexShrink: 0, margin: "6px 0 0" }}>{err}</p>}

        {/* Footer */}
        <div className="action-row" style={{ flexShrink: 0, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
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
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>
      <div className="panel">

        {/* Header */}
        <div className="table-head" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={20} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Organisation</p>
              <h1 style={{ margin: 0, fontSize: 22 }}>Team Management</h1>
              <p className="hint" style={{ margin: "2px 0 0" }}>
                Manage individual permissions for each team member
              </p>
            </div>
          </div>
          <button onClick={onBack}>← Back</button>
        </div>

        {/* Info banner */}
        <div style={{ padding: "10px 14px", background: "var(--panel2)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, color: "var(--muted)", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Shield size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Permissions extend the base role. If a member has no custom permissions set, their role defaults apply.
            Custom permissions override the role entirely for that member.
          </span>
        </div>

        {/* Loading */}
        {permissionsLoading && <p className="hint">Loading permissions…</p>}

        {/* Search + result count */}
        {members.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search team members…"
                style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
              />
            </div>
            <span style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>
              {q
                ? `Showing ${filtered.length} of ${members.length} team member${members.length !== 1 ? "s" : ""}`
                : `${members.length} team member${members.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}

        {/* Member table */}
        {!permissionsLoading && members.length === 0 && (
          <p className="hint">No members found in this organisation.</p>
        )}

        {members.length > 0 && filtered.length === 0 && (
          <p className="hint" style={{ padding: "16px 0" }}>No team members match your search.</p>
        )}

        {filtered.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Email</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Role</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Permissions</th>
                  <th style={{ padding: "6px 10px" }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const customPerms = permissionMap.get(m.id) ?? null;
                  const hasCustom = customPerms !== null;
                  const grantedCount = hasCustom
                    ? customPerms.size
                    : ROLE_DEFAULT_PERMISSIONS[m.role]?.length ?? 0;
                  const isSelf = m.id === session.user.id;
                  return (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 10px", fontWeight: 600 }}>
                        {m.name || "—"}
                        {isSelf && <span className="hint" style={{ marginLeft: 6, fontSize: 11, fontWeight: 400 }}>(you)</span>}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)" }}>{m.email}</td>
                      <td style={{ padding: "10px 10px" }}>
                        <span className={`role-badge role-${m.role}`}>{ROLE_LABELS[m.role]}</span>
                      </td>
                      <td style={{ padding: "10px 10px" }}>
                        {hasCustom ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent)", fontSize: 12 }}>
                            <Shield size={12} />
                            Custom · {grantedCount} granted
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>
                            Role defaults · {grantedCount} granted
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "right" }}>
                        {canEditPerms && (
                          <button
                            style={{ fontSize: 12, padding: "3px 12px", display: "flex", alignItems: "center", gap: 4 }}
                            onClick={() => setEditingMember(m)}
                          >
                            <Shield size={12} /> Edit Permissions
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingMember && (
        <EditPermissionsModal
          member={editingMember}
          currentPerms={permissionMap.get(editingMember.id) ?? null}
          onSave={(perms) => onSavePerms(editingMember.id, perms)}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  );
}
