"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  Building2, User, Palette, SlidersHorizontal, Film, BookOpen,
  Bell, Shield, Users, FolderOpen, ChevronRight, Globe, Clock,
} from "lucide-react";
import type { OrganisationSettings } from "@/lib/types/organisationSettings";
import type { OrganisationRecord } from "@/lib/types/organisations";
import type { MemberRecord } from "@/lib/types/members";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { Assignment } from "@/lib/types/assignments";
import type { RefEvalSession } from "@/lib/types/auth";
import {
  SettingsPage, SettingsSection, SettingsCard, SettingsPlaceholder,
} from "./SettingsLayout";

// ── Sub-page routing ──────────────────────────────────────────────────────────

type OrgPage =
  | "dashboard"
  | "profile"
  | "branding"
  | "preferences"
  | "reviews"
  | "learning"
  | "notifications"
  | "security"
  | "members"
  | "resources";

const NAV_ITEMS: { page: OrgPage; label: string; icon: ReactNode }[] = [
  { page: "dashboard",     label: "Dashboard",     icon: <Building2 size={15} /> },
  { page: "profile",       label: "Profile",        icon: <User size={15} /> },
  { page: "branding",      label: "Branding",       icon: <Palette size={15} /> },
  { page: "preferences",   label: "Preferences",    icon: <SlidersHorizontal size={15} /> },
  { page: "reviews",       label: "Reviews",        icon: <Film size={15} /> },
  { page: "learning",      label: "Learning",       icon: <BookOpen size={15} /> },
  { page: "notifications", label: "Notifications",  icon: <Bell size={15} /> },
  { page: "security",      label: "Security",       icon: <Shield size={15} /> },
  { page: "members",       label: "Members",        icon: <Users size={15} /> },
  { page: "resources",     label: "Resources",      icon: <FolderOpen size={15} /> },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  session: RefEvalSession;
  org: OrganisationRecord | null;
  members: MemberRecord[];
  reviews: ReviewRecord[];
  assignments: Assignment[];
  settings: OrganisationSettings;
  onBack: () => void;
  onNavigateMembers: () => void;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function OrganisationScreen({
  session, org, members, reviews, assignments,
  settings, onBack, onNavigateMembers,
}: Props) {
  const [currentPage, setCurrentPage] = useState<OrgPage>("dashboard");

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 73px)" }}>

      {/* ── Sidebar nav ── */}
      <nav
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          padding: "20px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          background: "var(--panel)",
        }}
      >
        <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Organisation</p>
          <p style={{ margin: "3px 0 0", fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {org?.name ?? "Settings"}
          </p>
        </div>

        {NAV_ITEMS.map(({ page, label, icon }) => {
          const active = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${active ? "rgba(165,106,27,.3)" : "transparent"}`,
                background: active ? "rgba(165,106,27,.14)" : "none",
                color: active ? "var(--accent)" : "var(--text)",
                fontWeight: active ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "none",
              }}
            >
              <span style={{ color: active ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}>
                {icon}
              </span>
              {label}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onBack}
            style={{
              width: "100%",
              fontSize: 12,
              padding: "6px 10px",
              color: "var(--muted)",
              background: "none",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              boxShadow: "none",
            }}
          >
            ← Back to app
          </button>
        </div>
      </nav>

      {/* ── Page content ── */}
      <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
        {renderPage(currentPage, {
          session, org, members, reviews, assignments,
          settings, setCurrentPage, onNavigateMembers,
        })}
      </div>
    </div>
  );
}

// ── Page context ──────────────────────────────────────────────────────────────

interface PageCtx {
  session: RefEvalSession;
  org: OrganisationRecord | null;
  members: MemberRecord[];
  reviews: ReviewRecord[];
  assignments: Assignment[];
  settings: OrganisationSettings;
  setCurrentPage: (page: OrgPage) => void;
  onNavigateMembers: () => void;
}

function renderPage(page: OrgPage, ctx: PageCtx): ReactNode {
  switch (page) {
    case "dashboard":     return <DashboardPage {...ctx} />;
    case "profile":       return <ProfilePage />;
    case "branding":      return <BrandingPage />;
    case "preferences":   return <PreferencesPage />;
    case "reviews":       return <ReviewsPage />;
    case "learning":      return <LearningPage />;
    case "notifications": return <NotificationsPage />;
    case "security":      return <SecurityPage />;
    case "members":       return <MembersPage onNavigateMembers={ctx.onNavigateMembers} />;
    case "resources":     return <ResourcesPage />;
  }
}

// ── Dashboard page ────────────────────────────────────────────────────────────

function DashboardPage({ org, members, reviews, assignments, settings, setCurrentPage }: PageCtx) {
  const refereeCount  = members.filter(m => m.role === "referee").length;
  const educatorCount = members.filter(m => m.role === "educator").length;

  const stats: { label: string; value: number; hint: string }[] = [
    { label: "Members",     value: members.length,    hint: "All users" },
    { label: "Referees",    value: refereeCount,       hint: "Active referees" },
    { label: "Educators",   value: educatorCount,      hint: "Review educators" },
    { label: "Reviews",     value: reviews.length,     hint: "Total evaluations" },
    { label: "Assignments", value: assignments.length, hint: "Learning assignments" },
  ];

  const quickLinks: { page: OrgPage; label: string; hint: string; icon: ReactNode }[] = [
    { page: "profile",     label: "Profile",           hint: "Name, sport, contact",          icon: <User size={18} /> },
    { page: "branding",    label: "Branding",           hint: "Colours and logo",               icon: <Palette size={18} /> },
    { page: "preferences", label: "Preferences",        hint: "Date format and defaults",       icon: <SlidersHorizontal size={18} /> },
    { page: "reviews",     label: "Review Defaults",    hint: "Timestamp offset, required fields", icon: <Film size={18} /> },
    { page: "learning",    label: "Learning Defaults",  hint: "Assignment and reminder rules",  icon: <BookOpen size={18} /> },
    { page: "resources",   label: "Resources",          hint: "Learning documents",             icon: <FolderOpen size={18} /> },
  ];

  return (
    <SettingsPage eyebrow="Organisation" title={org?.name ?? "Organisation"}>

      {/* Org identity strip */}
      <div className="panel" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg,rgba(165,106,27,.25),rgba(165,106,27,.1))",
            border: "1px solid rgba(165,106,27,.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent)",
          }}
        >
          <Building2 size={24} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{org?.name ?? "—"}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 5 }}>
            <span className="hint" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <span style={{ color: "var(--accent)", fontSize: 9 }}>●</span>
              {settings.profile.sport}
            </span>
            <span className="hint" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <Clock size={11} />
              {settings.profile.timezone}
            </span>
            <span className="hint" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <Globe size={11} />
              {settings.profile.locale} · {settings.profile.country}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setCurrentPage("profile")}>
            Edit Profile
          </button>
          <button style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setCurrentPage("branding")}>
            Branding
          </button>
        </div>
      </div>

      {/* Stats */}
      <SettingsSection title="Overview">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
          {stats.map(({ label, value, hint }) => (
            <div key={label} className="ed-summary-card">
              <div className="ed-summary-number">{value}</div>
              <div className="ed-summary-label">{label}</div>
              <p className="hint" style={{ margin: "4px 0 0", fontSize: 11 }}>{hint}</p>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Quick links */}
      <SettingsSection title="Settings" description="Jump to a settings area to configure your organisation.">
        <div className="ed-hero-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
          {quickLinks.map(({ page, label, hint, icon }) => (
            <button key={page} className="ed-hero-card" onClick={() => setCurrentPage(page)}>
              <span className="ed-hero-icon">{icon}</span>
              <span className="ed-hero-text">
                <span className="ed-hero-label">{label}</span>
                <span className="ed-hero-hint">{hint}</span>
              </span>
              <ChevronRight size={14} className="ed-hero-chevron" />
            </button>
          ))}
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

// ── Placeholder pages ─────────────────────────────────────────────────────────

function ProfilePage() {
  return (
    <SettingsPage eyebrow="Organisation" title="Profile" description="Basic identity information for your organisation.">
      <SettingsSection title="Organisation identity">
        <SettingsPlaceholder
          title="Profile settings"
          description="Configure your organisation's identity, including name, short name, sport, website, contact email, timezone, locale, and country."
          items={[
            "Organisation name and short name",
            "Sport: Basketball",
            "Website and contact email",
            "Timezone and locale",
            "Country / region",
          ]}
        />
      </SettingsSection>
    </SettingsPage>
  );
}

function BrandingPage() {
  return (
    <SettingsPage eyebrow="Organisation" title="Branding" description="Visual identity used across the RefCoach platform for your organisation.">
      <SettingsSection title="Visual identity">
        <SettingsPlaceholder
          title="Branding settings"
          description="Customise the visual identity of your organisation within RefCoach, including primary colour and logo."
          items={[
            "Primary brand colour",
            "Organisation logo (used in the app header and reports)",
            "Email template branding (future)",
          ]}
        />
      </SettingsSection>
    </SettingsPage>
  );
}

function PreferencesPage() {
  return (
    <SettingsPage eyebrow="Organisation" title="Preferences" description="Default platform behaviour for all members of your organisation.">
      <SettingsSection title="Platform defaults">
        <SettingsPlaceholder
          title="Preferences settings"
          description="Control date formatting, week start day, and default review visibility for your organisation."
          items={[
            "Date format (DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD)",
            "Week starts on (Monday or Sunday)",
            "Default review visibility (educators only, or assigned referees)",
          ]}
        />
      </SettingsSection>
    </SettingsPage>
  );
}

function ReviewsPage() {
  return (
    <SettingsPage eyebrow="Organisation" title="Review Defaults" description="Default behaviour applied to all new evaluations in your organisation.">
      <SettingsSection title="Tagging defaults">
        <SettingsPlaceholder
          title="Review default settings"
          description="Set the default timestamp offset and control which coding fields are required when tagging a moment."
          items={[
            "Default timestamp offset (seconds)",
            "Require outcome, coverage, position, category, and specific tag",
          ]}
        />
      </SettingsSection>
    </SettingsPage>
  );
}

function LearningPage() {
  return (
    <SettingsPage eyebrow="Organisation" title="Learning Defaults" description="Default settings for learning assignments and referee engagement.">
      <SettingsSection title="Assignment defaults">
        <SettingsPlaceholder
          title="Learning default settings"
          description="Configure default assignment rules and reminder behaviour for your organisation."
          items={[
            "Default assignment due period (days)",
            "Send due-date reminder emails",
            "Reminder lead time (days before due)",
            "Allow referee comments on clips",
          ]}
        />
      </SettingsSection>
    </SettingsPage>
  );
}

function NotificationsPage() {
  return (
    <SettingsPage eyebrow="Organisation" title="Notifications" description="Control which events trigger notifications across your organisation.">
      <SettingsSection title="Email notifications">
        <SettingsPlaceholder
          title="Notification settings"
          description="Choose which events send email notifications to educators and referees in your organisation."
          items={[
            "New review assigned to referee",
            "Review completed by educator",
            "Learning assignment due soon",
            "Learning assignment completed",
            "Comment received on a clip",
          ]}
        />
      </SettingsSection>
    </SettingsPage>
  );
}

function SecurityPage() {
  return (
    <SettingsPage eyebrow="Organisation" title="Security" description="Authentication and session security settings for your organisation.">
      <SettingsSection title="Access control">
        <SettingsPlaceholder
          title="Security settings"
          description="Configure authentication requirements and session management for your organisation members."
          items={[
            "Require email verification before access",
            "Session timeout duration",
          ]}
        />
      </SettingsSection>
    </SettingsPage>
  );
}

function MembersPage({ onNavigateMembers }: { onNavigateMembers: () => void }) {
  return (
    <SettingsPage eyebrow="Organisation" title="Members" description="Manage who has access to your organisation and what roles they hold.">
      <SettingsSection title="Member management">
        <SettingsCard description="Full member management — invite users, assign roles, and manage access — is available in the Admin Dashboard.">
          <div style={{ paddingTop: 8 }}>
            <button className="primary" onClick={onNavigateMembers}>
              <Users size={15} /> Go to Member Management
            </button>
          </div>
        </SettingsCard>
      </SettingsSection>
    </SettingsPage>
  );
}

function ResourcesPage() {
  return (
    <SettingsPage eyebrow="Organisation" title="Resources" description="Learning documents and reference materials for your organisation's referees.">
      <SettingsSection title="Learning documents">
        <SettingsPlaceholder
          title="Resources"
          description="Upload and manage learning documents that referees can access alongside their assignments. Video content remains link-based via YouTube, Hudl, GloryLeague, or external URLs — this section is for documents and reference materials only."
          items={[
            "PDF rulebooks and officiating guides",
            "Case studies and referee development notes",
            "Organisation-specific resources",
          ]}
        />
      </SettingsSection>
    </SettingsPage>
  );
}
