"use client";

import { useState } from "react";
import { updateProfileName } from "@/lib/services/memberships";
import { getSupabaseClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";
import type { RefEvalSession, Role } from "@/lib/types/auth";

const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  referee: "Referee",
  educator: "Educator",
  admin: "Administrator",
  super_admin: "Super Admin",
};

export function UserProfileScreen({
  session,
  onBack,
  onSwitchOrg,
  onProfileNameSaved,
}: {
  session: RefEvalSession;
  onBack: () => void;
  onSwitchOrg: (membership: RefEvalSession["memberships"][number]) => void;
  onProfileNameSaved: (name: string) => void;
}) {
  const [name, setName] = useState(session.profile.name);
  const [nameSaving, setNameSaving] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { showToast("Name cannot be empty.", "error"); return; }
    setNameSaving(true);
    const result = await updateProfileName(name.trim());
    setNameSaving(false);
    if ("error" in result) {
      showToast(result.error, "error");
    } else {
      showToast("Name updated.", "success");
      onProfileNameSaved(name.trim());
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { showToast("Password must be at least 8 characters.", "error"); return; }
    if (password !== confirmPw) { showToast("Passwords do not match.", "error"); return; }
    setPwSaving(true);
    const { error } = await getSupabaseClient().auth.updateUser({ password });
    setPwSaving(false);
    if (error) {
      showToast(error.message, "error");
    } else {
      setPassword(""); setConfirmPw("");
      showToast("Password updated.", "success");
    }
  }

  const multipleOrgs = session.memberships.length > 1;

  return (
    <div className="layout one-col">
      <section className="panel">
        <div className="table-head" style={{ marginBottom: 18 }}>
          <div>
            <p className="eyebrow">Account</p>
            <h1 style={{ marginBottom: 0 }}>Your Profile</h1>
            <p className="hint" style={{ marginTop: 6 }}>{session.profile.email}</p>
          </div>
          <button onClick={onBack}>← Back</button>
        </div>

        <div className="profile-grid">
          {/* ── Display name ── */}
          <div className="analytics-card">
            <h2>Display Name</h2>
            <form className="form-stack" onSubmit={handleNameSave}>
              <label>
                Name
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your display name"
                  required
                />
              </label>
              <label>
                Email
                <input value={session.profile.email} disabled />
              </label>
              <button type="submit" className="primary" disabled={nameSaving}>
                {nameSaving ? "Saving…" : "Save Name"}
              </button>
            </form>
          </div>

          {/* ── Password ── */}
          <div className="analytics-card">
            <h2>Change Password</h2>
            <form className="form-stack" onSubmit={handlePasswordSave}>
              <label>
                New password
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </label>
              <button type="submit" className="primary" disabled={pwSaving}>
                {pwSaving ? "Updating…" : "Update Password"}
              </button>
            </form>
          </div>
        </div>

        {/* ── Organisations ── */}
        <div className="analytics-card" style={{ marginTop: 18 }}>
          <h2>Your Organisations</h2>
          {session.memberships.length === 0 ? (
            <p className="hint">You are not a member of any organisations.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {session.memberships.map(m => {
                  const isActive = m.organisationId === session.activeOrganisation?.id;
                  return (
                    <tr key={m.organisationId}>
                      <td style={{ fontWeight: isActive ? 700 : undefined }}>
                        {m.organisationName}
                        {isActive && (
                          <span className="hint" style={{ marginLeft: 8, fontSize: 11 }}>Current</span>
                        )}
                      </td>
                      <td>
                        <span className={`role-badge role-${m.role}`}>{ROLE_LABELS[m.role]}</span>
                      </td>
                      <td>
                        {!isActive && multipleOrgs && (
                          <button
                            style={{ fontSize: 12, padding: "5px 10px" }}
                            onClick={() => onSwitchOrg(m)}
                          >
                            Switch to this org
                          </button>
                        )}
                        {isActive && <span className="hint" style={{ fontSize: 12 }}>Active</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
