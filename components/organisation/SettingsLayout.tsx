"use client";

import type { ReactNode } from "react";

// ── SettingsPage ──────────────────────────────────────────────────────────────
// Top-level wrapper for a settings page. Provides consistent padding and
// optional back/action area.
export function SettingsPage({
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          {eyebrow && <p className="eyebrow" style={{ margin: "0 0 4px" }}>{eyebrow}</p>}
          <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
          {description && (
            <p className="hint" style={{ margin: "6px 0 0", maxWidth: 540 }}>{description}</p>
          )}
        </div>
        {actions && <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// ── SettingsSection ───────────────────────────────────────────────────────────
// Groups related settings cards under a labelled section heading.
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <p className="ed-section-title" style={{ margin: 0 }}>{title}</p>
        {description && <p className="hint" style={{ margin: "3px 0 0", fontSize: 12 }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ── SettingsCard ──────────────────────────────────────────────────────────────
// A panel card containing one or more settings rows.
export function SettingsCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="panel" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
      {(title || description) && (
        <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
          {title && <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{title}</p>}
          {description && <p className="hint" style={{ margin: "3px 0 0", fontSize: 12 }}>{description}</p>}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ── SettingsRow ───────────────────────────────────────────────────────────────
// A single labelled setting row — label on left, control/value on right.
export function SettingsRow({
  label,
  description,
  children,
  last,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
        padding: "12px 0",
        borderBottom: last ? "none" : "1px solid var(--border)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 160 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{label}</p>
        {description && <p className="hint" style={{ margin: "2px 0 0", fontSize: 12 }}>{description}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── SettingsPlaceholder ───────────────────────────────────────────────────────
// Used for settings pages that are planned but not yet built.
export function SettingsPlaceholder({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <div
      style={{
        background: "var(--panel2)",
        border: "1px dashed var(--border)",
        borderRadius: 16,
        padding: "36px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          background: "rgba(165,106,27,.12)",
          border: "1px solid rgba(165,106,27,.25)",
          borderRadius: 8,
          padding: "3px 10px",
          fontSize: 11,
          fontWeight: 800,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Coming soon
      </div>
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      <p className="hint" style={{ margin: 0, maxWidth: 480, lineHeight: 1.55 }}>{description}</p>
      {items && items.length > 0 && (
        <ul style={{ margin: "4px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((item) => (
            <li key={item} className="hint" style={{ fontSize: 13 }}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
