"use client";

import { useState, useEffect } from "react";
import { updateOrganisation } from "@/lib/services/organisations";
import type { OrganisationRecord } from "@/lib/types/organisations";
import type { RefEvalSession } from "@/lib/types/auth";

const TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Hobart",
  "Australia/Darwin",
  "Pacific/Auckland",
  "UTC",
];

export function OrgSettingsScreen({
  session,
  org,
  onSaved,
  onNavigateMembers,
}: {
  session: RefEvalSession;
  org: OrganisationRecord;
  onSaved: (updated: OrganisationRecord) => void;
  onNavigateMembers: () => void;
}) {
  const [name, setName] = useState(org.name);
  const [timezone, setTimezone] = useState(org.timezone);
  const [brandColour, setBrandColour] = useState(org.brandColour);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Reset form if the org record changes (e.g. on org switch).
  useEffect(() => {
    setName(org.name);
    setTimezone(org.timezone);
    setBrandColour(org.brandColour);
    setError("");
    setSuccessMsg("");
  }, [org.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Organisation name cannot be empty."); return; }
    setSaving(true);
    setError("");
    const result = await updateOrganisation({
      organisationId: org.id,
      name: name.trim(),
      timezone,
      brandColour,
    });
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      setSuccessMsg("Settings saved.");
      setTimeout(() => setSuccessMsg(""), 3000);
      onSaved({ ...org, name: name.trim(), timezone, brandColour });
    }
  }

  return (
    <div className="layout one-col">
      <section className="panel">
        <div className="table-head" style={{ marginBottom: 18 }}>
          <div>
            <p className="eyebrow">{org.name}</p>
            <h1 style={{ marginBottom: 0 }}>Organisation Settings</h1>
            <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Update your organisation name, timezone, and brand colour.
            </p>
          </div>
          <button onClick={onNavigateMembers}>← Member Management</button>
        </div>

        {successMsg && <div className="success-banner" style={{ marginBottom: 14 }}>{successMsg}</div>}
        {error && <p className="danger-text" style={{ marginBottom: 14 }}>{error}</p>}

        <form className="form-stack" style={{ maxWidth: 520 }} onSubmit={handleSave}>
          <label>
            Organisation name
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
              placeholder="Organisation name"
              required
            />
          </label>

          <label>
            Timezone
            <select value={timezone} onChange={e => setTimezone(e.target.value)}>
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </label>

          <label>
            Brand colour
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="color"
                value={brandColour}
                onChange={e => setBrandColour(e.target.value)}
                style={{ width: 48, height: 42, padding: 3, borderRadius: 8, cursor: "pointer", flexShrink: 0 }}
              />
              <input
                value={brandColour}
                onChange={e => setBrandColour(e.target.value)}
                placeholder="#a56a1b"
                pattern="^#[0-9a-fA-F]{6}$"
                title="Hex colour, e.g. #a56a1b"
                style={{ flex: 1 }}
              />
            </div>
          </label>

          <label>
            Organisation logo
            <div
              style={{
                background: "var(--panel2)",
                border: "1px dashed var(--border)",
                borderRadius: 14,
                padding: "14px 16px",
              }}
            >
              <p className="hint" style={{ margin: 0 }}>
                Logo upload is not yet available. For a full branding experience — including logo URL and colour customisation — visit <strong>Organisation → Branding</strong>.
              </p>
            </div>
          </label>

          <div style={{ marginTop: 4 }}>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
