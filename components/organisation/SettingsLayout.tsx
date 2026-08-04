"use client";

import type { ReactNode } from "react";
import { PageFrame } from "@/components/shell/PageFrame";
import { Card, Badge } from "@/components/ui";

// ── SettingsPage ──────────────────────────────────────────────────────────────
// Top-level wrapper for a settings page. Thin wrapper over the shared
// PageFrame — `className="p-0"` since every settings page already sits
// inside `.org-content`'s own padding (see OrganisationScreen.tsx).
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
    <PageFrame className="p-0" title={title} eyebrow={eyebrow} description={description} actions={actions}>
      {children}
    </PageFrame>
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
    <div className="grid gap-2.5">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-muted">{title}</p>
        {description && <p className="mt-1 text-xs text-muted">{description}</p>}
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
    <Card>
      {(title || description) && (
        <div className="mb-3.5 border-b border-border pb-3">
          {title && <p className="text-sm font-bold text-text">{title}</p>}
          {description && <p className="mt-1 text-xs text-muted">{description}</p>}
        </div>
      )}
      <div className="grid">{children}</div>
    </Card>
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
    <div className={`flex flex-wrap items-center justify-between gap-5 py-3 ${last ? "" : "border-b border-border"}`}>
      <div className="min-w-[160px] flex-1">
        <p className="text-sm font-semibold text-text">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
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
    <div className="grid items-start gap-3 rounded-2xl border border-dashed border-border bg-panel-2 p-8">
      <Badge tone="accent" className="w-fit">Coming soon</Badge>
      <h2 className="text-lg font-bold text-text">{title}</h2>
      <p className="max-w-[480px] text-sm leading-relaxed text-muted">{description}</p>
      {items && items.length > 0 && (
        <ul className="mt-1 grid list-disc gap-1 pl-[18px]">
          {items.map((item) => (
            <li key={item} className="text-[13px] text-muted">{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
