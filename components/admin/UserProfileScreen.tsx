"use client";

import { useState } from "react";
import { updateProfileName } from "@/lib/services/memberships";
import { getSupabaseClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";
import type { RefEvalSession, Role } from "@/lib/types/auth";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { ROLE_TONE } from "@/lib/utils/roleTone";
import { cn } from "@/lib/utils/cn";

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
    <PageFrame
      className="mx-auto max-w-[900px]"
      eyebrow="Account"
      title="Your Profile"
      description={session.profile.email}
      actions={<Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* ── Display name ── */}
        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Display Name</h2>
          <form className="grid gap-3" onSubmit={handleNameSave}>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Name
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your display name" required />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Email
              <Input value={session.profile.email} disabled />
            </label>
            <Button type="submit" variant="primary" disabled={nameSaving} className="w-fit">
              {nameSaving ? "Saving…" : "Save Name"}
            </Button>
          </form>
        </Card>

        {/* ── Password ── */}
        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Change Password</h2>
          <form className="grid gap-3" onSubmit={handlePasswordSave}>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              New password
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Confirm new password
              <Input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </label>
            <Button type="submit" variant="primary" disabled={pwSaving} className="w-fit">
              {pwSaving ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </Card>
      </div>

      {/* ── Organisations ── */}
      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Your Organisations</h2>
        {session.memberships.length === 0 ? (
          <p className="text-sm text-muted">You are not a member of any organisations.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Organisation</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {session.memberships.map(m => {
                const isActive = m.organisationId === session.activeOrganisation?.id;
                const tone = ROLE_TONE[m.role] ?? ROLE_TONE.viewer;
                return (
                  <TableRow key={m.organisationId}>
                    <TableCell data-label="Organisation" className={cn(isActive ? "font-bold" : "font-normal", "text-text")}>
                      {m.organisationName}
                      {isActive && <span className="ml-2 text-[11px] text-muted">Current</span>}
                    </TableCell>
                    <TableCell data-label="Role">
                      <Badge tone="neutral" className={tone.text}>{ROLE_LABELS[m.role]}</Badge>
                    </TableCell>
                    <TableCell data-label="">
                      {!isActive && multipleOrgs && (
                        <Button variant="secondary" size="sm" onClick={() => onSwitchOrg(m)}>
                          Switch to this org
                        </Button>
                      )}
                      {isActive && <span className="text-xs text-muted">Active</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageFrame>
  );
}
