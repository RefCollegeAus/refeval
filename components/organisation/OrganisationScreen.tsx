"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import {
  Building2, User, Palette, SlidersHorizontal, Film, BookOpen,
  Bell, Shield, Users, FolderOpen, ChevronRight, Globe, Clock,
  CheckCircle, AlertCircle,
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
  { page: "reviews",       label: "Review Defaults", icon: <Film size={15} /> },
  { page: "learning",      label: "Learning",       icon: <BookOpen size={15} /> },
  { page: "notifications", label: "Notifications",  icon: <Bell size={15} /> },
  { page: "security",      label: "Security",       icon: <Shield size={15} /> },
  { page: "members",       label: "Members",        icon: <Users size={15} /> },
  { page: "resources",     label: "Resources",      icon: <FolderOpen size={15} /> },
];

// ── Validation helpers ────────────────────────────────────────────────────────

function isValidEmail(v: string): boolean {
  return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidUrl(v: string): boolean {
  return !v || /^https?:\/\/.+/.test(v);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  session: RefEvalSession;
  org: OrganisationRecord | null;
  members: MemberRecord[];
  reviews: ReviewRecord[];
  assignments: Assignment[];
  settings: OrganisationSettings;
  onUpdateSettings: (patch: Partial<OrganisationSettings>) => void;
  onBack: () => void;
  onNavigateMembers: () => void;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function OrganisationScreen({
  session, org, members, reviews, assignments,
  settings, onUpdateSettings, onBack, onNavigateMembers,
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
          settings, onUpdateSettings, setCurrentPage, onNavigateMembers,
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
  onUpdateSettings: (patch: Partial<OrganisationSettings>) => void;
  setCurrentPage: (page: OrgPage) => void;
  onNavigateMembers: () => void;
}

function renderPage(page: OrgPage, ctx: PageCtx): ReactNode {
  switch (page) {
    case "dashboard":     return <DashboardPage {...ctx} />;
    case "profile":       return <ProfilePage {...ctx} />;
    case "branding":      return <BrandingPage />;
    case "preferences":   return <PreferencesPage {...ctx} />;
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
              {settings.preferences.timezone}
            </span>
            <span className="hint" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <Globe size={11} />
              {settings.preferences.locale} · {settings.preferences.country}
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

// ── Shared form feedback banner ───────────────────────────────────────────────

function FeedbackBanner({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 10,
        background: type === "success" ? "rgba(52,199,89,.12)" : "rgba(255,69,58,.12)",
        border: `1px solid ${type === "success" ? "rgba(52,199,89,.3)" : "rgba(255,69,58,.3)"}`,
        color: type === "success" ? "#34c759" : "#ff453a",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
}

// ── Profile page ──────────────────────────────────────────────────────────────

function ProfilePage({ settings, onUpdateSettings }: PageCtx) {
  const [draft, setDraft] = useState(() => ({ ...settings.profile }));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const saved = settings.profile;
  const dirty =
    draft.name !== saved.name ||
    draft.shortName !== saved.shortName ||
    draft.contactEmail !== saved.contactEmail ||
    draft.phone !== saved.phone ||
    draft.website !== saved.website ||
    draft.address !== saved.address;

  const patch = useCallback(<K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  const save = useCallback(() => {
    if (!draft.name.trim()) {
      setFeedback({ type: "error", message: "Organisation name is required." });
      return;
    }
    if (!isValidEmail(draft.contactEmail)) {
      setFeedback({ type: "error", message: "Contact email is not a valid email address." });
      return;
    }
    if (!isValidUrl(draft.website)) {
      setFeedback({ type: "error", message: "Website must start with http:// or https://." });
      return;
    }
    onUpdateSettings({ profile: { ...draft } });
    setFeedback({ type: "success", message: "Profile saved." });
  }, [draft, onUpdateSettings]);

  const discard = useCallback(() => {
    setDraft({ ...saved });
    setFeedback(null);
  }, [saved]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
  };

  const disabledInputStyle: React.CSSProperties = {
    ...inputStyle,
    opacity: 0.5,
    cursor: "not-allowed",
  };

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Profile"
      description="Basic identity information for your organisation."
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && (
            <button onClick={discard} style={{ fontSize: 13 }}>
              Discard
            </button>
          )}
          <button
            className="primary"
            onClick={save}
            disabled={!dirty}
            style={{ fontSize: 13, opacity: dirty ? 1 : 0.45 }}
          >
            Save changes
          </button>
        </div>
      }
    >
      {feedback && <FeedbackBanner {...feedback} />}

      <SettingsSection title="Organisation identity">
        <SettingsCard>
          <div className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>
                  Organisation name <span style={{ color: "#ff453a" }}>*</span>
                </span>
                <input
                  style={inputStyle}
                  value={draft.name}
                  onChange={e => patch("name", e.target.value)}
                  placeholder="e.g. Basketball Australia"
                />
              </label>
              <label>
                <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>
                  Short name
                </span>
                <input
                  style={inputStyle}
                  value={draft.shortName}
                  onChange={e => patch("shortName", e.target.value)}
                  placeholder="e.g. BA"
                />
              </label>
            </div>

            <label>
              <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>
                Sport
              </span>
              <input style={disabledInputStyle} value="Basketball" disabled />
            </label>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Contact details">
        <SettingsCard>
          <div className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>
                  Contact email
                </span>
                <input
                  style={inputStyle}
                  type="email"
                  value={draft.contactEmail}
                  onChange={e => patch("contactEmail", e.target.value)}
                  placeholder="admin@example.com"
                />
              </label>
              <label>
                <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>
                  Phone
                </span>
                <input
                  style={inputStyle}
                  type="tel"
                  value={draft.phone}
                  onChange={e => patch("phone", e.target.value)}
                  placeholder="+61 2 0000 0000"
                />
              </label>
            </div>

            <label>
              <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>
                Website
              </span>
              <input
                style={inputStyle}
                type="url"
                value={draft.website}
                onChange={e => patch("website", e.target.value)}
                placeholder="https://example.com"
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>
                Address
              </span>
              <textarea
                style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
                value={draft.address}
                onChange={e => patch("address", e.target.value)}
                rows={2}
                placeholder="123 Main Street, Sydney NSW 2000"
              />
            </label>
          </div>
        </SettingsCard>
      </SettingsSection>
    </SettingsPage>
  );
}

// ── Preferences page ──────────────────────────────────────────────────────────

const TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Hobart",
  "Australia/Darwin",
  "Pacific/Auckland",
  "Asia/Singapore",
  "UTC",
];

const LOCALES: { value: string; label: string }[] = [
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-NZ", label: "English (New Zealand)" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
];

const COUNTRIES = [
  "Australia",
  "New Zealand",
  "United States",
  "United Kingdom",
  "Canada",
];

function PreferencesPage({ settings, onUpdateSettings }: PageCtx) {
  const [draft, setDraft] = useState(() => ({ ...settings.preferences }));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const saved = settings.preferences;
  const dirty =
    draft.timezone !== saved.timezone ||
    draft.locale !== saved.locale ||
    draft.dateFormat !== saved.dateFormat ||
    draft.timeFormat !== saved.timeFormat ||
    draft.weekStartsOn !== saved.weekStartsOn ||
    draft.country !== saved.country ||
    draft.defaultReviewVisibility !== saved.defaultReviewVisibility;

  const patch = useCallback(<K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  const save = useCallback(() => {
    onUpdateSettings({ preferences: { ...draft } });
    setFeedback({ type: "success", message: "Preferences saved." });
  }, [draft, onUpdateSettings]);

  const discard = useCallback(() => {
    setDraft({ ...saved });
    setFeedback(null);
  }, [saved]);

  const selectStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Preferences"
      description="Default platform behaviour for all members of your organisation."
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && (
            <button onClick={discard} style={{ fontSize: 13 }}>
              Discard
            </button>
          )}
          <button
            className="primary"
            onClick={save}
            disabled={!dirty}
            style={{ fontSize: 13, opacity: dirty ? 1 : 0.45 }}
          >
            Save changes
          </button>
        </div>
      }
    >
      {feedback && <FeedbackBanner {...feedback} />}

      <SettingsSection title="Regional settings">
        <SettingsCard>
          <div className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Timezone</span>
                <select style={selectStyle} value={draft.timezone} onChange={e => patch("timezone", e.target.value)}>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </label>
              <label>
                <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Language / locale</span>
                <select style={selectStyle} value={draft.locale} onChange={e => patch("locale", e.target.value)}>
                  {LOCALES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </label>
            </div>

            <label>
              <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Country / region</span>
              <select style={selectStyle} value={draft.country} onChange={e => patch("country", e.target.value)}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Date &amp; time format">
        <SettingsCard>
          <div className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Date format</span>
                <select
                  style={selectStyle}
                  value={draft.dateFormat}
                  onChange={e => patch("dateFormat", e.target.value as typeof draft.dateFormat)}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (3 Jul 2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (Jul 3 2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-07-03)</option>
                </select>
              </label>
              <label>
                <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Time format</span>
                <select
                  style={selectStyle}
                  value={draft.timeFormat}
                  onChange={e => patch("timeFormat", e.target.value as typeof draft.timeFormat)}
                >
                  <option value="12h">12-hour (2:30 PM)</option>
                  <option value="24h">24-hour (14:30)</option>
                </select>
              </label>
            </div>

            <label>
              <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Week starts on</span>
              <select
                style={selectStyle}
                value={draft.weekStartsOn}
                onChange={e => patch("weekStartsOn", Number(e.target.value) as 0 | 1)}
              >
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
              </select>
            </label>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Review defaults">
        <SettingsCard>
          <div className="form-stack">
            <label>
              <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Default review visibility</span>
              <select
                style={selectStyle}
                value={draft.defaultReviewVisibility}
                onChange={e => patch("defaultReviewVisibility", e.target.value as typeof draft.defaultReviewVisibility)}
              >
                <option value="assigned-referees">Assigned referees can view their own review</option>
                <option value="educators-only">Educators only (referees cannot view)</option>
              </select>
            </label>
          </div>
        </SettingsCard>
      </SettingsSection>
    </SettingsPage>
  );
}

// ── Placeholder pages ─────────────────────────────────────────────────────────

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
