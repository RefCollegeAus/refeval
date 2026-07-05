"use client";

import { useState } from "react";
import { Shield, User } from "lucide-react";
import {
  adminUpdateUserProfile,
  adminUpdateUserPassword,
  updateMemberRole,
} from "@/lib/services/memberships";
import type { EnrichedMember } from "@/lib/types/members";
import type { Role, RefEvalSession } from "@/lib/types/auth";

const ROLE_LABELS: Record<Role, string> = {
  viewer:      "Viewer",
  referee:     "Referee",
  educator:    "Educator",
  admin:       "Org Admin",
  super_admin: "Super Admin",
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Full platform access — all features, settings, and role assignment.",
  admin:       "Organisation management — members, settings, and all tools.",
  educator:    "Creates reviews, manages learning assignments, and coaches referees.",
  referee:     "Views own reviews, completes assigned learning, tracks development goals.",
  viewer:      "No default access — permissions can be assigned individually.",
};

type Section = "profile" | "security";

interface Props {
  member: EnrichedMember;
  session: RefEvalSession;
  onClose: () => void;
  onRefresh: () => void;
}

export function ManageUserModal({ member, session, onClose, onRefresh }: Props) {
  const orgId = session.activeOrganisation?.id || "";
  const isSuperAdmin = session.activeRole === "super_admin";
  const isSelf = member.id === session.user.id;

  const [section, setSection] = useState<Section>("profile");

  // ── Profile state ──────────────────────────────────────────────────────────
  const [editName, setEditName] = useState(member.name);
  const [editEmail, setEditEmail] = useState(member.email);
  const [editRole, setEditRole] = useState<Role>(member.role);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // ── Security state ─────────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ── Profile save ───────────────────────────────────────────────────────────
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    const nameChanged = editName.trim() !== member.name;
    const emailChanged = isSuperAdmin && editEmail.trim() !== member.email;
    const roleChanged = editRole !== member.role;

    if (!editName.trim()) { setProfileError("Name is required."); return; }
    if (isSuperAdmin && !editEmail.trim()) { setProfileError("Email is required."); return; }

    setProfileLoading(true);

    if (nameChanged || emailChanged) {
      const params: { userId: string; organisationId: string; name?: string; email?: string } = {
        userId: member.id,
        organisationId: orgId,
      };
      if (nameChanged) params.name = editName.trim();
      if (emailChanged) params.email = editEmail.trim();

      const result = await adminUpdateUserProfile(params);
      if ("error" in result) {
        setProfileLoading(false);
        setProfileError(result.error);
        return;
      }
    }

    if (roleChanged && !isSelf) {
      const result = await updateMemberRole({ userId: member.id, organisationId: orgId, role: editRole });
      if ("error" in result) {
        setProfileLoading(false);
        setProfileError(result.error);
        return;
      }
    }

    setProfileLoading(false);
    setProfileSuccess("Profile updated successfully.");
    onRefresh();
  }

  // ── Password save ──────────────────────────────────────────────────────────
  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (!confirm(`Change password for ${member.name}? They will need to use the new password on their next login.`)) {
      return;
    }

    setPasswordLoading(true);
    const result = await adminUpdateUserPassword({
      userId: member.id,
      organisationId: orgId,
      newPassword,
    });
    setPasswordLoading(false);

    if ("error" in result) {
      setPasswordError(result.error);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordSuccess("Password updated successfully.");
  }

  const assignableRoles: Role[] = isSuperAdmin
    ? ["viewer", "referee", "educator", "admin", "super_admin"]
    : ["viewer", "referee", "educator"];

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }}>

        {/* Header */}
        <div className="modal-title">
          <div>
            <p className="eyebrow">User Management</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>{member.name}</h1>
            <p className="hint" style={{ margin: "2px 0 0", fontSize: 12 }}>{member.email}</p>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          <button
            className={section === "profile" ? "primary" : ""}
            onClick={() => setSection("profile")}
            style={{ fontSize: 13, padding: "7px 14px", borderRadius: "10px 10px 0 0", borderBottom: "none" }}
          >
            <User size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
            Profile
          </button>
          {isSuperAdmin && (
            <button
              className={section === "security" ? "primary" : ""}
              onClick={() => setSection("security")}
              style={{ fontSize: 13, padding: "7px 14px", borderRadius: "10px 10px 0 0", borderBottom: "none" }}
            >
              <Shield size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
              Security
            </button>
          )}
        </div>

        {/* ── Profile section ── */}
        {section === "profile" && (
          <form onSubmit={handleSaveProfile}>
            <div className="form-stack">

              <label>
                Display name
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </label>

              {isSuperAdmin ? (
                <label>
                  Email address
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                  <span className="hint" style={{ fontSize: 11, marginTop: 2 }}>
                    Changing email updates the user's login credential.
                  </span>
                </label>
              ) : (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", margin: "0 0 4px" }}>Email</p>
                  <p style={{ margin: 0, fontSize: 14 }}>{member.email}</p>
                  <p className="hint" style={{ fontSize: 11, marginTop: 2 }}>Email can only be changed by a Super Admin.</p>
                </div>
              )}

              <label>
                Role
                {isSelf ? (
                  <>
                    <span className={`role-badge role-${member.role}`} style={{ display: "inline-block", marginTop: 4 }}>
                      {ROLE_LABELS[member.role]}
                    </span>
                    <span className="hint" style={{ fontSize: 11, marginTop: 4, display: "block" }}>You cannot change your own role.</span>
                  </>
                ) : (
                  <>
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value as Role)}
                      style={{ width: "auto", padding: "7px 10px", fontSize: 13 }}
                    >
                      {assignableRoles.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <span className="hint" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
                      {ROLE_DESCRIPTIONS[editRole]}
                    </span>
                  </>
                )}
              </label>

              <div style={{ paddingTop: 4, borderTop: "1px solid var(--border)" }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)" }}>
                  Member since {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "—"} ·
                  Last sign-in {member.lastSignInAt ? new Date(member.lastSignInAt).toLocaleDateString() : "—"} ·
                  Status <span className={`status-badge status-${member.invitationStatus}`}>{member.invitationStatus}</span>
                </p>
              </div>

              {profileError && <div className="danger-text">{profileError}</div>}
              {profileSuccess && <div className="success-banner">{profileSuccess}</div>}

              <div className="action-row" style={{ marginTop: 4 }}>
                <button type="button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary" disabled={profileLoading}>
                  {profileLoading ? "Saving…" : "Save Profile"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── Security section (super_admin only) ── */}
        {section === "security" && isSuperAdmin && (
          <form onSubmit={handleSavePassword} autoComplete="off">
            <div className="form-stack">

              <div style={{ background: "rgba(165,106,27,.07)", border: "1px solid rgba(165,106,27,.2)", borderRadius: 12, padding: "10px 14px" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Set new password for {member.name}</p>
                <p className="hint" style={{ margin: "3px 0 0", fontSize: 12 }}>
                  The user will use this password on their next login. This action is logged.
                </p>
              </div>

              <label>
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  required
                />
              </label>

              <label>
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Re-enter password"
                  required
                />
              </label>

              {passwordError && <div className="danger-text">{passwordError}</div>}
              {passwordSuccess && <div className="success-banner">{passwordSuccess}</div>}

              <div className="action-row" style={{ marginTop: 4 }}>
                <button type="button" onClick={onClose}>Cancel</button>
                <button type="submit" className="warn" disabled={passwordLoading}>
                  {passwordLoading ? "Saving…" : "Set Password"}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
