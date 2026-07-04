"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import {
  Building2, User, Palette, SlidersHorizontal, Film, BookOpen,
  Bell, Shield, Users, FolderOpen, ChevronRight, Globe, Clock,
  CheckCircle, AlertCircle, CreditCard,
} from "lucide-react";
import type { OrganisationSettings } from "@/lib/types/organisationSettings";
import type { OrganisationRecord } from "@/lib/types/organisations";
import type { MemberRecord } from "@/lib/types/members";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { Assignment } from "@/lib/types/assignments";
import type { RefEvalSession, Role } from "@/lib/types/auth";
import type { Group, CreateGroupInput, UpdateGroupInput } from "@/lib/types/groups";
import { ROLE_DEFAULT_PERMISSIONS, PERMISSION_GROUPS } from "@/lib/types/permissions";
import { GroupsScreen } from "@/components/educator/GroupsScreen";
import {
  SettingsPage, SettingsSection, SettingsCard, SettingsRow,
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
  | "groups"
  | "roles"
  | "resources"
  | "billing";

const NAV_ITEMS: { page: OrgPage; label: string; icon: ReactNode }[] = [
  { page: "dashboard",     label: "Dashboard",       icon: <Building2 size={15} /> },
  { page: "profile",       label: "Profile",         icon: <User size={15} /> },
  { page: "branding",      label: "Branding",        icon: <Palette size={15} /> },
  { page: "preferences",   label: "Preferences",     icon: <SlidersHorizontal size={15} /> },
  { page: "reviews",       label: "Review Defaults", icon: <Film size={15} /> },
  { page: "learning",      label: "Learning",        icon: <BookOpen size={15} /> },
  { page: "notifications", label: "Notifications",   icon: <Bell size={15} /> },
  { page: "security",      label: "Security",        icon: <Shield size={15} /> },
  { page: "members",       label: "Members",         icon: <Users size={15} /> },
  { page: "groups",        label: "Groups",          icon: <Users size={15} /> },
  { page: "roles",         label: "Roles",           icon: <Shield size={15} /> },
  { page: "resources",     label: "Resources",       icon: <FolderOpen size={15} /> },
  { page: "billing",       label: "Billing & Plan",  icon: <CreditCard size={15} /> },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

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
  groupCount?: number;
  activeGoalCount?: number;
  groups?: Group[];
  groupsLoading?: boolean;
  groupsError?: string;
  canCreateGroups?: boolean;
  canEditGroups?: boolean;
  canDeleteGroups?: boolean;
  onCreateGroup?: (input: CreateGroupInput) => Promise<void>;
  onUpdateGroup?: (id: string, input: UpdateGroupInput) => Promise<void>;
  onDeleteGroup?: (id: string) => Promise<void>;
  onSetGroupMembers?: (groupId: string, userIds: string[]) => Promise<void>;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function OrganisationScreen({
  session, org, members, reviews, assignments,
  settings, onUpdateSettings, onBack, onNavigateMembers,
  groupCount = 0, activeGoalCount = 0,
  groups = [], groupsLoading = false, groupsError = "",
  canCreateGroups = false, canEditGroups = false, canDeleteGroups = false,
  onCreateGroup, onUpdateGroup, onDeleteGroup, onSetGroupMembers,
}: Props) {
  const [currentPage, setCurrentPage] = useState<OrgPage>("dashboard");

  return (
    <div className="org-layout">

      {/* ── Sidebar nav ── */}
      <nav className="org-sidebar">
        <div className="org-sidebar-header" style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Organisation</p>
          <p style={{ margin: "3px 0 0", fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
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

        <div className="org-sidebar-footer" style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
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
      <div className="org-content">
        {renderPage(currentPage, {
          session, org, members, reviews, assignments,
          settings, onUpdateSettings, setCurrentPage, onNavigateMembers,
          groupCount, activeGoalCount,
          groups, groupsLoading, groupsError,
          canCreateGroups, canEditGroups, canDeleteGroups,
          onCreateGroup, onUpdateGroup, onDeleteGroup, onSetGroupMembers,
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
  groupCount: number;
  activeGoalCount: number;
  groups: Group[];
  groupsLoading: boolean;
  groupsError: string;
  canCreateGroups: boolean;
  canEditGroups: boolean;
  canDeleteGroups: boolean;
  onCreateGroup?: (input: CreateGroupInput) => Promise<void>;
  onUpdateGroup?: (id: string, input: UpdateGroupInput) => Promise<void>;
  onDeleteGroup?: (id: string) => Promise<void>;
  onSetGroupMembers?: (groupId: string, userIds: string[]) => Promise<void>;
}

function renderPage(page: OrgPage, ctx: PageCtx): ReactNode {
  switch (page) {
    case "dashboard":     return <DashboardPage {...ctx} />;
    case "profile":       return <ProfilePage {...ctx} />;
    case "branding":      return <BrandingPage {...ctx} />;
    case "preferences":   return <PreferencesPage {...ctx} />;
    case "reviews":       return <ReviewsPage {...ctx} />;
    case "learning":      return <LearningPage {...ctx} />;
    case "notifications": return <NotificationsPage {...ctx} />;
    case "security":      return <SecurityPage {...ctx} />;
    case "members":       return <MembersPage {...ctx} />;
    case "groups":        return <GroupsPage {...ctx} />;
    case "roles":         return <RolesPage {...ctx} />;
    case "resources":     return <ResourcesPage {...ctx} />;
    case "billing":       return <BillingPage {...ctx} />;
  }
}

// ── Dashboard page ────────────────────────────────────────────────────────────

function RolePill({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", borderRadius: 10,
      background: `${color}0f`, border: `1px solid ${color}28`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      </div>
      <span style={{ fontSize: 16, fontWeight: 800, color }}>{count}</span>
    </div>
  );
}

function SectionCard({
  title, description, action, children,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; primary?: boolean };
  children: ReactNode;
}) {
  return (
    <div className="panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{title}</p>
          {description && <p className="hint" style={{ margin: "3px 0 0", fontSize: 12 }}>{description}</p>}
        </div>
        {action && (
          <button
            className={action.primary ? "primary" : undefined}
            style={{ fontSize: 12, padding: "5px 12px", flexShrink: 0 }}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function DashboardPage({ org, members, reviews, assignments, settings, setCurrentPage, onNavigateMembers, groupCount, activeGoalCount, groups, canCreateGroups }: PageCtx) {
  const refereeCount    = members.filter(m => m.role === "referee").length;
  const educatorCount   = members.filter(m => m.role === "educator").length;
  const adminCount      = members.filter(m => m.role === "admin" || m.role === "super_admin").length;

  const completedReviews  = reviews.filter(r => r.status === "Completed").length;
  const activeAssignments = assignments.filter(a =>
    a.assignmentUsers.some(u => u.status !== "Completed"),
  ).length;

  return (
    <SettingsPage eyebrow="Organisation" title={org?.name ?? "Organisation"}>

      {/* ── Org identity header ── */}
      <div className="panel" style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <OrgLogoMark
          name={org?.name ?? ""}
          branding={settings.branding}
          size={60}
          fontSize={22}
          borderRadius={16}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{org?.name ?? "—"}</h2>
            {settings.profile.shortName && (
              <span className="hint" style={{ fontSize: 13, fontWeight: 600 }}>{settings.profile.shortName}</span>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 14px", marginTop: 6 }}>
            <span className="hint" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              {settings.profile.sport}
            </span>
            <span className="hint" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <Clock size={11} />{settings.preferences.timezone}
            </span>
            <span className="hint" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <Globe size={11} />{settings.preferences.locale} · {settings.preferences.country}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("profile")}>Edit Profile</button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("branding")}>Branding</button>
        </div>
      </div>

      {/* ── Summary metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
        {[
          { label: "Members",          value: members.length,      color: "var(--accent)", onClick: () => setCurrentPage("members") },
          { label: "Referees",         value: refereeCount,        color: "#30d158",       onClick: () => setCurrentPage("members") },
          { label: "Educators",        value: educatorCount,       color: "#0a84ff",       onClick: () => setCurrentPage("members") },
          { label: "Groups",           value: groupCount,          color: "#8b5cf6",       onClick: undefined },
          { label: "Reviews",          value: completedReviews,    color: "#bf5af2",       onClick: undefined },
          { label: "Active Goals",     value: activeGoalCount,     color: "#ff9f0a",       onClick: undefined },
        ].map(({ label, value, color, onClick }) => (
          onClick ? (
            <button
              key={label}
              className="ed-summary-card"
              onClick={onClick}
              style={{ cursor: "pointer", textAlign: "left", width: "100%", background: "var(--panel)", border: "1px solid var(--border)" }}
            >
              <div className="ed-summary-number" style={{ color }}>{value}</div>
              <div className="ed-summary-label">{label}</div>
            </button>
          ) : (
            <div key={label} className="ed-summary-card">
              <div className="ed-summary-number" style={{ color }}>{value}</div>
              <div className="ed-summary-label">{label}</div>
            </div>
          )
        ))}
      </div>

      {/* ── Members section ── */}
      <SettingsSection title="Members">
        <SectionCard
          title="Member Overview"
          description={`${members.length} user${members.length !== 1 ? "s" : ""} across all roles`}
          action={{ label: "Manage Members", onClick: onNavigateMembers, primary: true }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
            <RolePill color="#30d158" label="Referees"    count={refereeCount} />
            <RolePill color="#0a84ff" label="Educators"   count={educatorCount} />
            <RolePill color="#ff9f0a" label="Admins"      count={adminCount} />
          </div>
          {members.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>No members yet</p>
              <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>Invite users from the Admin Dashboard to populate your organisation.</p>
            </div>
          )}
          {members.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
              {members.slice(0, 5).map((m, i) => {
                const roleColor: Record<string, string> = { referee: "#30d158", educator: "#0a84ff", admin: "#ff9f0a", super_admin: "#bf5af2", viewer: "var(--muted)" };
                const roleLabel: Record<string, string> = { referee: "Referee", educator: "Educator", admin: "Admin", super_admin: "Super Admin", viewer: "Viewer" };
                const isLast = i === Math.min(members.length, 5) - 1;
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: isLast ? "none" : "1px solid var(--border)", background: "var(--panel2)" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: `${roleColor[m.role] ?? "var(--muted)"}20`, border: `1.5px solid ${roleColor[m.role] ?? "var(--muted)"}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: roleColor[m.role] ?? "var(--muted)" }}>
                      {(m.name || m.email).slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name || "—"}</p>
                      <p className="hint" style={{ margin: 0, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5, background: `${roleColor[m.role] ?? "var(--muted)"}18`, border: `1px solid ${roleColor[m.role] ?? "var(--muted)"}30`, color: roleColor[m.role] ?? "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
                      {roleLabel[m.role] ?? m.role}
                    </span>
                  </div>
                );
              })}
              {members.length > 5 && (
                <div style={{ padding: "10px 14px", background: "var(--panel2)", borderTop: "1px solid var(--border)" }}>
                  <button
                    style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
                    onClick={onNavigateMembers}
                  >
                    View all {members.length} members →
                  </button>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </SettingsSection>

      {/* ── Roles & Permissions ── */}
      <SettingsSection title="Roles &amp; Permissions" description="How access levels work in your organisation.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {[
            { color: "#30d158", label: "Referee",    count: refereeCount,  description: "Can view their own reviews and complete assigned learning." },
            { color: "#0a84ff", label: "Educator",   count: educatorCount, description: "Creates reviews, assigns learning, and coaches referees." },
            { color: "#ff9f0a", label: "Admin",       count: adminCount,    description: "Manages members, roles, and organisation settings." },
          ].map(({ color, label, count, description }) => (
            <div key={label} className="panel" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, borderLeft: `3px solid ${color}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{label}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color }}>{count}</span>
              </div>
              <p className="hint" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{description}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("roles")}>
            <Shield size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            View Roles
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("members")}>
            <Users size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            View Members
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("security")}>
            <Shield size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Security Settings
          </button>
        </div>
      </SettingsSection>

      {/* ── Groups ── */}
      <SettingsSection title="Groups" description="Organise referees into cohorts for targeted learning and coaching.">
        <div className="panel" style={{ padding: "18px 20px" }}>
          {groups.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Users size={20} style={{ color: "#8b5cf6" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>No groups yet</p>
                <p className="hint" style={{ margin: "3px 0 0", fontSize: 12 }}>Create referee groups to target learning by cohort and track development progress.</p>
              </div>
              {canCreateGroups && (
                <button style={{ fontSize: 12, flexShrink: 0 }} onClick={() => setCurrentPage("groups")}>
                  Create Group
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mini group list — up to 5 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {groups.slice(0, 5).map((g, i) => (
                  <div
                    key={g.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 0",
                      borderBottom: i < Math.min(groups.length, 5) - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: g.colour, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{g.name}</span>
                      {g.description && (
                        <span className="hint" style={{ fontSize: 12, marginLeft: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {g.description}
                        </span>
                      )}
                    </div>
                    <span className="hint" style={{ fontSize: 12, flexShrink: 0 }}>
                      {g.members.length} member{g.members.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
              {groups.length > 5 && (
                <p className="hint" style={{ margin: "8px 0 0", fontSize: 12 }}>
                  +{groups.length - 5} more group{groups.length - 5 !== 1 ? "s" : ""}
                </p>
              )}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("groups")}>
                  <Users size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  Manage Groups
                </button>
                {canCreateGroups && (
                  <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("groups")}>
                    + New Group
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

// ── Shared status badge ───────────────────────────────────────────────────────

type SettingStatus = "active" | "saved-default" | "not-enforced" | "coming-soon";

function StatusBadge({ status }: { status: SettingStatus }) {
  const styles: Record<SettingStatus, { label: string; bg: string; border: string; color: string }> = {
    "active":        { label: "Active",           bg: "rgba(52,199,89,.1)",   border: "rgba(52,199,89,.28)",   color: "#34c759" },
    "saved-default": { label: "Saved default",    bg: "rgba(10,132,255,.1)",  border: "rgba(10,132,255,.28)",  color: "#0a84ff" },
    "not-enforced":  { label: "Not enforced yet", bg: "rgba(255,159,10,.1)",  border: "rgba(255,159,10,.28)",  color: "#ff9f0a" },
    "coming-soon":   { label: "Coming soon",      bg: "rgba(165,106,27,.12)", border: "rgba(165,106,27,.28)",  color: "var(--accent)" },
  };
  const s = styles[status];
  return (
    <span style={{
      display: "inline-block",
      fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

// ── Shared info note ──────────────────────────────────────────────────────────

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div style={{
      background: "rgba(10,132,255,.06)",
      border: "1px solid rgba(10,132,255,.2)",
      borderRadius: 10,
      padding: "10px 16px",
      fontSize: 13,
      color: "var(--muted)",
      lineHeight: 1.55,
    }}>
      {children}
    </div>
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

function ProfilePage({ settings, onUpdateSettings, setCurrentPage }: PageCtx) {
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

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };
  const disabledInputStyle: React.CSSProperties = { ...inputStyle, opacity: 0.5, cursor: "not-allowed" };

  // Completeness: count filled contact fields
  const contactFields = [draft.contactEmail, draft.phone, draft.website, draft.address];
  const filledCount = contactFields.filter(v => v && v.trim()).length;

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Organisation Profile"
      description="Identity and contact details for your organisation — used in reports, reviews, and platform-wide references."
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <button onClick={discard} style={{ fontSize: 13 }}>Discard</button>}
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

      {/* ── Live identity preview ── */}
      <SettingsSection title="Preview" description="Updates live as you edit. Reflects how this organisation appears across the platform.">
        <div className="panel" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <OrgLogoMark
              name={draft.name}
              branding={settings.branding}
              size={56}
              fontSize={20}
              borderRadius={14}
            />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: 18 }}>{draft.name || <span style={{ color: "var(--muted)" }}>Organisation name</span>}</span>
                {draft.shortName && (
                  <span className="hint" style={{ fontSize: 13, fontWeight: 600 }}>{draft.shortName}</span>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6 }}>
                <span style={{
                  display: "inline-block", fontSize: 11, fontWeight: 800,
                  padding: "2px 8px", borderRadius: 5,
                  background: `${settings.branding.primaryColour}1a`,
                  border: `1px solid ${settings.branding.primaryColour}33`,
                  color: settings.branding.primaryColour,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  Basketball
                </span>
                {draft.contactEmail && (
                  <span className="hint" style={{ fontSize: 12 }}>{draft.contactEmail}</span>
                )}
                {draft.website && (
                  <span className="hint" style={{ fontSize: 12 }}>{draft.website}</span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("branding")}>
                Customise Branding →
              </button>
            </div>
          </div>
          {/* Contact completeness bar */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 999, background: "var(--panel3)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 999,
                width: `${Math.round((filledCount / contactFields.length) * 100)}%`,
                background: filledCount === contactFields.length ? "#34c759" : "var(--accent)",
                transition: "width 0.3s",
              }} />
            </div>
            <span className="hint" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              {filledCount}/{contactFields.length} contact fields filled
            </span>
          </div>
        </div>
      </SettingsSection>

      {/* ── Organisation identity ── */}
      <SettingsSection title="Organisation Identity" description="The name and short name appear in reviews, reports, and member-facing screens.">
        <SettingsCard>
          <div className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
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
              <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Sport</span>
              <input style={disabledInputStyle} value="Basketball" disabled />
            </label>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* ── Contact details ── */}
      <SettingsSection title="Contact Details" description="Used in referee-facing communications and organisation reports.">
        <SettingsCard>
          <div className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <label>
                <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Contact email</span>
                <input
                  style={inputStyle}
                  type="email"
                  value={draft.contactEmail}
                  onChange={e => patch("contactEmail", e.target.value)}
                  placeholder="admin@example.com"
                />
              </label>
              <label>
                <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Phone</span>
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
              <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Website</span>
              <input
                style={inputStyle}
                type="url"
                value={draft.website}
                onChange={e => patch("website", e.target.value)}
                placeholder="https://example.com"
              />
            </label>
            <label>
              <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Address</span>
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

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("branding")}>
            <Palette size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Branding & Colours
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("preferences")}>
            <SlidersHorizontal size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Regional Preferences
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </button>
        </div>
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

function PreferencesPage({ settings, onUpdateSettings, setCurrentPage }: PageCtx) {
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

  const selectStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

  const localeName = LOCALES.find(l => l.value === draft.locale)?.label ?? draft.locale;
  const dateExample = draft.dateFormat === "DD/MM/YYYY" ? "3 Jul 2026" : draft.dateFormat === "MM/DD/YYYY" ? "Jul 3 2026" : "2026-07-03";
  const timeExample = draft.timeFormat === "12h" ? "2:30 PM" : "14:30";

  const summaryItems = [
    { label: "Timezone",       value: draft.timezone },
    { label: "Language",       value: localeName },
    { label: "Country",        value: draft.country },
    { label: "Date format",    value: `${draft.dateFormat} · ${dateExample}` },
    { label: "Time format",    value: `${draft.timeFormat === "12h" ? "12-hour" : "24-hour"} · ${timeExample}` },
    { label: "Week starts",    value: draft.weekStartsOn === 1 ? "Monday" : "Sunday" },
    { label: "Review default", value: draft.defaultReviewVisibility === "assigned-referees" ? "Visible to referee" : "Educators only" },
  ];

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Regional Preferences"
      description="Timezone, locale, date and time formats, and review visibility defaults for all members."
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <button onClick={discard} style={{ fontSize: 13 }}>Discard</button>}
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

      {/* ── Current configuration summary ── */}
      <SettingsSection title="Current Configuration" description="A snapshot of your saved preferences. Updates live as you make changes.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {summaryItems.map(({ label, value }) => (
            <div key={label} style={{
              padding: "12px 14px", borderRadius: 10,
              background: "var(--panel)", border: "1px solid var(--border)",
            }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{value}</p>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* ── Regional identity ── */}
      <SettingsSection title="Regional Identity" description="Sets the timezone and language used across all dates, times, and member-facing text.">
        <SettingsCard>
          <div className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
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

      {/* ── Date & time format ── */}
      <SettingsSection title="Date & Time Format" description="Controls how dates and times are displayed throughout the platform for all members.">
        <SettingsCard>
          <div className="form-stack">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
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

      {/* ── Review defaults ── */}
      <SettingsSection title="Review Defaults" description="Default visibility applied when new reviews are created. Can also be configured per review in Review Defaults settings.">
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

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("reviews")}>
            <Film size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Review Defaults
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("profile")}>
            <User size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Organisation Profile
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </button>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

// ── Shared logo mark ──────────────────────────────────────────────────────────

function isValidHttpUrl(v: string): boolean {
  try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}

function orgInitials(name: string, logoText: string): string {
  if (logoText.trim()) return logoText.trim().slice(0, 2).toUpperCase();
  return (name || "??").split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "??";
}

function OrgLogoMark({
  name, branding, size, fontSize, borderRadius,
}: {
  name: string;
  branding: OrganisationSettings["branding"];
  size: number;
  fontSize: number;
  borderRadius: number;
}) {
  const showImg = !!branding.logoUrl && isValidHttpUrl(branding.logoUrl);
  const pc = branding.primaryColour;
  return (
    <div
      style={{
        width: size, height: size, borderRadius, flexShrink: 0,
        background: showImg ? "transparent" : `${pc}22`,
        border: `1.5px solid ${pc}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {showImg ? (
        <img src={branding.logoUrl!} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontWeight: 900, fontSize, color: pc, lineHeight: 1 }}>
          {orgInitials(name, branding.logoText)}
        </span>
      )}
    </div>
  );
}

// ── Branding page ─────────────────────────────────────────────────────────────

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

function ColorField({
  label, description, value, onChange,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = isValidHex(value);
  return (
    <div>
      <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>{label}</span>
      {description && <span className="hint" style={{ display: "block", marginBottom: 6, fontSize: 12 }}>{description}</span>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={e => onChange(e.target.value)}
          style={{
            width: 40, height: 36, padding: 3, flexShrink: 0,
            border: "1px solid var(--border)", borderRadius: 8,
            cursor: "pointer", background: "var(--panel2)",
          }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          style={{
            flex: 1, fontFamily: "monospace", fontSize: 13,
            borderColor: !value || valid ? undefined : "rgba(255,69,58,.6)",
          }}
        />
        {value && !valid && (
          <span style={{ fontSize: 11, color: "#ff453a", flexShrink: 0 }}>Invalid hex</span>
        )}
      </div>
    </div>
  );
}

function BrandingPreview({
  orgName, shortName, branding,
}: {
  orgName: string;
  shortName: string;
  branding: OrganisationSettings["branding"];
}) {
  const pc = isValidHex(branding.primaryColour) ? branding.primaryColour : "#a56a1b";
  const sc = isValidHex(branding.secondaryColour) ? branding.secondaryColour : "#2c2c2e";
  const ac = isValidHex(branding.accentColour) ? branding.accentColour : "#636366";

  return (
    <div
      style={{
        background: "var(--panel2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <p className="eyebrow" style={{ margin: 0 }}>Live preview</p>

      {/* Identity row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <OrgLogoMark name={orgName} branding={{ ...branding, primaryColour: pc }} size={52} fontSize={18} borderRadius={12} />
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>{orgName || "Organisation name"}</p>
          {shortName && <p className="hint" style={{ margin: "2px 0 0", fontSize: 12 }}>{shortName}</p>}
          <span
            style={{
              display: "inline-block", marginTop: 5,
              background: `${pc}22`, border: `1px solid ${pc}44`,
              borderRadius: 6, padding: "1px 8px",
              fontSize: 11, fontWeight: 800, color: pc,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}
          >
            Basketball
          </span>
        </div>
      </div>

      {/* Sample buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button
          style={{
            background: pc, color: "#fff",
            border: "none", padding: "7px 16px",
            borderRadius: 10, fontWeight: 700, fontSize: 12,
            cursor: "default", boxShadow: "none",
          }}
        >
          Primary action
        </button>
        <button
          style={{
            background: `${sc}33`, color: sc,
            border: `1px solid ${sc}55`, padding: "7px 16px",
            borderRadius: 10, fontWeight: 700, fontSize: 12,
            cursor: "default", boxShadow: "none",
          }}
        >
          Secondary
        </button>
        <span
          style={{
            background: `${ac}22`, color: ac,
            border: `1px solid ${ac}44`,
            borderRadius: 6, padding: "3px 10px",
            fontSize: 11, fontWeight: 700,
          }}
        >
          Accent badge
        </span>
      </div>
    </div>
  );
}

function BrandingPage({ settings, onUpdateSettings, setCurrentPage }: PageCtx) {
  const [draft, setDraft] = useState(() => ({ ...settings.branding }));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const saved = settings.branding;
  const dirty =
    draft.primaryColour !== saved.primaryColour ||
    draft.secondaryColour !== saved.secondaryColour ||
    draft.accentColour !== saved.accentColour ||
    draft.logoUrl !== saved.logoUrl ||
    draft.logoText !== saved.logoText;

  const patch = useCallback(<K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  const save = useCallback(() => {
    if (draft.logoUrl && !isValidHttpUrl(draft.logoUrl)) {
      setFeedback({ type: "error", message: "Logo URL must start with http:// or https://." });
      return;
    }
    if (draft.primaryColour && !isValidHex(draft.primaryColour)) {
      setFeedback({ type: "error", message: "Primary colour must be a valid 6-digit hex value (e.g. #a56a1b)." });
      return;
    }
    if (draft.secondaryColour && !isValidHex(draft.secondaryColour)) {
      setFeedback({ type: "error", message: "Secondary colour must be a valid 6-digit hex value." });
      return;
    }
    if (draft.accentColour && !isValidHex(draft.accentColour)) {
      setFeedback({ type: "error", message: "Accent colour must be a valid 6-digit hex value." });
      return;
    }
    onUpdateSettings({ branding: { ...draft } });
    setFeedback({ type: "success", message: "Branding saved." });
  }, [draft, onUpdateSettings]);

  const discard = useCallback(() => {
    setDraft({ ...saved });
    setFeedback(null);
  }, [saved]);

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

  const pcValid = isValidHex(draft.primaryColour);
  const scValid = isValidHex(draft.secondaryColour);
  const acValid = isValidHex(draft.accentColour);

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Branding"
      description="Visual identity applied across the RefCoach platform for your organisation — logo mark, colour palette, and badges."
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <button onClick={discard} style={{ fontSize: 13 }}>Discard</button>}
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

      {/* ── Live preview (top) ── */}
      <SettingsSection title="Preview" description="Updates live as you make changes.">
        <BrandingPreview
          orgName={settings.profile.name}
          shortName={settings.profile.shortName}
          branding={draft}
        />
      </SettingsSection>

      {/* ── Colour palette summary ── */}
      <SettingsSection title="Current Palette" description="Your three brand colours at a glance. Edit them in the Colours section below.">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Primary",   color: draft.primaryColour,   valid: pcValid, usage: "Buttons, logo mark, key accents" },
            { label: "Secondary", color: draft.secondaryColour, valid: scValid, usage: "Secondary buttons, surface treatments" },
            { label: "Accent",    color: draft.accentColour,    valid: acValid, usage: "Badges, labels, tertiary highlights" },
          ].map(({ label, color, valid, usage }) => (
            <div key={label} className="panel" style={{ padding: "14px 16px", flex: "1 1 160px", minWidth: 160 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: valid ? color : "var(--panel3)",
                  border: `1.5px solid ${valid ? `${color}66` : "var(--border)"}`,
                }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{label}</p>
                  <code style={{ fontSize: 11, color: valid ? "var(--text)" : "#ff453a", fontFamily: "monospace" }}>
                    {color || "—"}
                  </code>
                </div>
              </div>
              <p className="hint" style={{ margin: 0, fontSize: 11, lineHeight: 1.5 }}>{usage}</p>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* ── Logo ── */}
      <SettingsSection title="Logo" description="Provide a publicly accessible logo URL, or set a short text fallback. The logo mark is shown in headers, dashboards, and reports.">
        <SettingsCard>
          <div className="form-stack" style={{ paddingTop: 4 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <OrgLogoMark
                name={settings.profile.name}
                branding={draft}
                size={56}
                fontSize={20}
                borderRadius={14}
              />
              <div style={{ flex: 1 }}>
                <label>
                  <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Logo URL</span>
                  <span className="hint" style={{ display: "block", marginBottom: 6, fontSize: 12 }}>
                    Must be a publicly accessible image URL (PNG, SVG, or WebP recommended).
                  </span>
                  <input
                    style={inputStyle}
                    type="url"
                    value={draft.logoUrl ?? ""}
                    onChange={e => patch("logoUrl", e.target.value || null)}
                    placeholder="https://example.com/logo.png"
                  />
                </label>
              </div>
            </div>
            <label>
              <span style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700 }}>Placeholder text</span>
              <span className="hint" style={{ display: "block", marginBottom: 6, fontSize: 12 }}>
                Shown when no logo URL is set. Defaults to your organisation's initials (up to 3 characters).
              </span>
              <input
                style={{ ...inputStyle, maxWidth: 120 }}
                value={draft.logoText}
                onChange={e => patch("logoText", e.target.value)}
                placeholder="e.g. RCA"
                maxLength={3}
              />
            </label>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* ── Colours ── */}
      <SettingsSection title="Colours" description="Use 6-digit hex values (e.g. #a56a1b). The colour picker updates the hex field automatically.">
        <SettingsCard>
          <div className="form-stack" style={{ paddingTop: 4 }}>
            <ColorField
              label="Primary colour"
              description="Used for primary action buttons, the logo mark background, and key accent elements throughout the platform."
              value={draft.primaryColour}
              onChange={v => patch("primaryColour", v)}
            />
            <ColorField
              label="Secondary colour"
              description="Used for secondary buttons and supporting surface colour treatments."
              value={draft.secondaryColour}
              onChange={v => patch("secondaryColour", v)}
            />
            <ColorField
              label="Accent colour"
              description="Used for badges, labels, and tertiary accent elements such as sport tags."
              value={draft.accentColour}
              onChange={v => patch("accentColour", v)}
            />
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("profile")}>
            <User size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Organisation Profile
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </button>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

// ── Placeholder pages ─────────────────────────────────────────────────────────

// ── Toggle component (shared across review and future pages) ─────────────────

function OrgToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        width: 44, height: 26,
        borderRadius: 13,
        border: "none",
        background: checked ? "var(--accent)" : "var(--panel3)",
        cursor: "pointer",
        flexShrink: 0,
        boxShadow: "none",
        padding: 0,
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 20, height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,.4)",
        }}
      />
    </button>
  );
}

function ToggleRow({
  label, description, checked, onChange, last, badge,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
  badge?: ReactNode;
}) {
  return (
    <SettingsRow label={label} description={description} last={last}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <OrgToggle checked={checked} onChange={onChange} />
        {badge}
      </div>
    </SettingsRow>
  );
}

// ── Reviews defaults page ─────────────────────────────────────────────────────

function ReviewsPage({ settings, onUpdateSettings, setCurrentPage }: PageCtx) {
  const [draft, setDraft] = useState(() => ({ ...settings.reviewDefaults }));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const saved = settings.reviewDefaults;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const patch = useCallback(<K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  const save = useCallback(() => {
    if (draft.defaultClipLengthSeconds <= 0 || draft.defaultClipLengthSeconds > 600) {
      setFeedback({ type: "error", message: "Default clip length must be between 1 and 600 seconds." });
      return;
    }
    if (![1, 2, 3].includes(draft.defaultCrewSize)) {
      setFeedback({ type: "error", message: "Crew size must be 1, 2, or 3." });
      return;
    }
    onUpdateSettings({ reviewDefaults: { ...draft } });
    setFeedback({ type: "success", message: "Review defaults saved." });
  }, [draft, onUpdateSettings]);

  const discard = useCallback(() => {
    setDraft({ ...saved });
    setFeedback(null);
  }, [saved]);

  const selectStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };
  const numStyle: React.CSSProperties = { width: 100, boxSizing: "border-box" };

  // ── Required tagging fields summary ────────────────────────────────────────
  const taggingFields: { key: keyof typeof draft; label: string }[] = [
    { key: "requireOutcome",     label: "Outcome" },
    { key: "requireCoverage",    label: "Coverage" },
    { key: "requirePosition",    label: "Position" },
    { key: "requireCategory",    label: "Category" },
    { key: "requireSpecificTag", label: "Specific tag" },
  ];
  const requiredCount = taggingFields.filter(f => draft[f.key]).length;

  const visibilityLabel = draft.defaultVisibility === "assigned-referees"
    ? "Assigned referees"
    : "Educators only";

  // ── Live summary chips ──────────────────────────────────────────────────────
  const summaryItems: { label: string; value: string; active?: boolean }[] = [
    { label: "Crew size",       value: `${draft.defaultCrewSize} referee${draft.defaultCrewSize !== 1 ? "s" : ""}`, active: true },
    { label: "Visibility",      value: visibilityLabel,                                                               active: true },
    { label: "Draft reviews",   value: draft.allowDraftReviews ? "Allowed" : "Disabled",                             active: draft.allowDraftReviews },
    { label: "Required fields", value: `${requiredCount} of ${taggingFields.length}`,                                active: requiredCount > 0 },
    { label: "Completion notes",value: draft.requireCompletionNotes ? "Required" : "Optional",                       active: draft.requireCompletionNotes },
    { label: "Signature",       value: draft.requireEducatorSignature ? "Required" : "Optional",                     active: draft.requireEducatorSignature },
    { label: "Auto-publish",    value: draft.autoPublishCompletedReviews ? "On" : "Off",                             active: draft.autoPublishCompletedReviews },
    { label: "Notify referee",  value: draft.notifyRefereeOnCompletion ? "On" : "Off",                               active: draft.notifyRefereeOnCompletion },
  ];

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Review Defaults"
      description="Pre-fill settings applied whenever an educator creates a new review. All defaults can be overridden per review."
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <button onClick={discard} style={{ fontSize: 13 }}>Discard</button>}
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

      {/* ── Context note ── */}
      <div style={{
        padding: "12px 16px",
        background: "rgba(10,132,255,.08)", borderRadius: 10,
        border: "1px solid rgba(10,132,255,.22)",
        fontSize: 13, color: "#6fb8ff",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <Film size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          These are <strong style={{ color: "#6fb8ff" }}>saved defaults</strong> — they pre-fill settings when a new review is created, but can be overridden per review.
          Tagging field requirements are enforced in the review coding tool.
          Auto-publish and notification preferences are saved and will take effect when the notification service is connected.
        </span>
      </div>

      {/* ── Current Configuration summary ── */}
      <SettingsSection title="Current Configuration" description="A live snapshot of your saved review defaults.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {summaryItems.map(({ label, value, active }) => (
            <div key={label} style={{
              padding: "12px 14px", borderRadius: 10,
              background: "var(--panel)",
              border: `1px solid ${active ? "rgba(52,199,89,.2)" : "var(--border)"}`,
            }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                {label}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: active ? "#34c759" : "var(--border)" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text)" : "var(--muted)" }}>{value}</span>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* ── Review Creation Defaults ── */}
      <SettingsSection title="Review Creation Defaults" description="Applied when an educator creates a new review. Educators can adjust these per review.">
        <SettingsCard>
          <SettingsRow
            label="Default crew size"
            description="How many referees are assigned to a review by default."
          >
            <select
              style={{ ...selectStyle, width: 140 }}
              value={draft.defaultCrewSize}
              onChange={e => patch("defaultCrewSize", Number(e.target.value) as 1 | 2 | 3)}
            >
              <option value={1}>1 referee</option>
              <option value={2}>2 referees</option>
              <option value={3}>3 referees</option>
            </select>
          </SettingsRow>
          <SettingsRow
            label="Default visibility"
            description="Who can see a completed review by default. Educators can change this per review."
          >
            <select
              style={{ ...selectStyle, width: 220 }}
              value={draft.defaultVisibility}
              onChange={e => patch("defaultVisibility", e.target.value as typeof draft.defaultVisibility)}
            >
              <option value="assigned-referees">Assigned referees can view</option>
              <option value="educators-only">Educators only</option>
            </select>
          </SettingsRow>
          <ToggleRow
            label="Allow draft reviews"
            description="Educators can save reviews as drafts before submitting for completion."
            checked={draft.allowDraftReviews}
            onChange={v => patch("allowDraftReviews", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Clip & Video Defaults ── */}
      <SettingsSection title="Clip & Video Defaults" description="Controls how clip timestamps and durations behave in the review coding tool.">
        <SettingsCard>
          <SettingsRow
            label="Timestamp offset (seconds)"
            description="Shift all clip timestamps by this amount. Use negative values to start playback before the coded moment."
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                style={numStyle}
                value={draft.timestampOffsetSeconds}
                onChange={e => patch("timestampOffsetSeconds", Number(e.target.value))}
                step={1}
                min={-300}
                max={300}
              />
              <span className="hint" style={{ fontSize: 13 }}>sec</span>
            </div>
          </SettingsRow>
          <SettingsRow
            label="Default clip length (seconds)"
            description="Suggested clip duration for tagged moments. Does not control external video playback length."
            last
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                style={numStyle}
                value={draft.defaultClipLengthSeconds}
                onChange={e => patch("defaultClipLengthSeconds", Number(e.target.value))}
                step={5}
                min={5}
                max={600}
              />
              <span className="hint" style={{ fontSize: 13 }}>sec</span>
            </div>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* ── Required Tagging Fields ── */}
      <SettingsSection
        title="Required Tagging Fields"
        description={`Fields an educator must fill in before saving a coded moment. ${requiredCount} of ${taggingFields.length} currently required.`}
      >
        <SettingsCard>
          <ToggleRow label="Require outcome"      description="Call outcome must be selected (e.g. Correct, Incorrect)."    checked={draft.requireOutcome}     onChange={v => patch("requireOutcome", v)} />
          <ToggleRow label="Require coverage"     description="Coverage position must be selected."                          checked={draft.requireCoverage}    onChange={v => patch("requireCoverage", v)} />
          <ToggleRow label="Require position"     description="Referee position must be selected."                           checked={draft.requirePosition}    onChange={v => patch("requirePosition", v)} />
          <ToggleRow label="Require category"     description="A top-level category must be selected."                       checked={draft.requireCategory}    onChange={v => patch("requireCategory", v)} />
          <ToggleRow label="Require specific tag" description="A specific tag within the selected category must be chosen."  checked={draft.requireSpecificTag} onChange={v => patch("requireSpecificTag", v)} last />
        </SettingsCard>
      </SettingsSection>

      {/* ── Completion Rules ── */}
      <SettingsSection title="Completion Rules" description="Steps an educator must take before a review can be marked complete.">
        <SettingsCard>
          <ToggleRow
            label="Require completion notes"
            description="Educator must add summary notes before marking a review complete."
            checked={draft.requireCompletionNotes}
            onChange={v => patch("requireCompletionNotes", v)}
          />
          <ToggleRow
            label="Require educator signature"
            description="Educator must confirm their sign-off when completing a review."
            checked={draft.requireEducatorSignature}
            onChange={v => patch("requireEducatorSignature", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Publishing & Notifications ── */}
      <SettingsSection title="Publishing & Notifications" description="Control how completed reviews are shared and how referees are informed.">
        <SettingsCard>
          <ToggleRow
            label="Auto-publish completed reviews"
            description="Completed reviews are automatically made visible to the assigned referee — no manual publishing step required."
            checked={draft.autoPublishCompletedReviews}
            onChange={v => patch("autoPublishCompletedReviews", v)}
            badge={<StatusBadge status="not-enforced" />}
          />
          <ToggleRow
            label="Notify referee on completion"
            description="Send the assigned referee a notification when their review is completed and published."
            checked={draft.notifyRefereeOnCompletion}
            onChange={v => patch("notifyRefereeOnCompletion", v)}
            last
            badge={<StatusBadge status="not-enforced" />}
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("learning")}>
            <BookOpen size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Learning Defaults
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("notifications")}>
            <Bell size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Notification Preferences
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("members")}>
            <Users size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Manage Members
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </button>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

function LearningPage({ settings, onUpdateSettings, setCurrentPage }: PageCtx) {
  const [draft, setDraft] = useState(() => ({ ...settings.learningDefaults }));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const saved = settings.learningDefaults;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const patch = useCallback(<K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  const save = useCallback(() => {
    if (!Number.isInteger(draft.assignmentDueDays) || draft.assignmentDueDays < 1) {
      setFeedback({ type: "error", message: "Default due days must be a positive whole number." });
      return;
    }
    if (draft.requiredCompletionPercent < 1 || draft.requiredCompletionPercent > 100) {
      setFeedback({ type: "error", message: "Required completion % must be between 1 and 100." });
      return;
    }
    if (draft.passingPercent < 1 || draft.passingPercent > 100) {
      setFeedback({ type: "error", message: "Passing % must be between 1 and 100." });
      return;
    }
    if (draft.reminderDaysBefore < 0) {
      setFeedback({ type: "error", message: "Reminder days before due must be zero or greater." });
      return;
    }
    onUpdateSettings({ learningDefaults: { ...draft } });
    setFeedback({ type: "success", message: "Learning defaults saved." });
  }, [draft, onUpdateSettings]);

  const discard = useCallback(() => {
    setDraft({ ...saved });
    setFeedback(null);
  }, [saved]);

  const numStyle: React.CSSProperties = { width: 100, boxSizing: "border-box" };

  // ── Live summary chips ────────────────────────────────────────────────────
  const reminderLabel = draft.sendDueReminders
    ? `${draft.reminderDaysBefore} day${draft.reminderDaysBefore !== 1 ? "s" : ""} before`
    : "Off";

  const summaryItems: { label: string; value: string; active?: boolean }[] = [
    { label: "Due window",     value: `${draft.assignmentDueDays} day${draft.assignmentDueDays !== 1 ? "s" : ""}`, active: true },
    { label: "Completion",     value: `${draft.requiredCompletionPercent}% required`,                               active: true },
    { label: "Passing score",  value: `${draft.passingPercent}%`,                                                   active: true },
    { label: "Late completion",value: draft.allowLateCompletion ? "Allowed" : "Blocked",                            active: draft.allowLateCompletion },
    { label: "Reflection",     value: draft.requireReflection ? "Required" : "Optional",                           active: draft.requireReflection },
    { label: "Reminders",      value: reminderLabel,                                                                active: draft.sendDueReminders },
    { label: "Auto-notify",    value: draft.autoNotifyAssignedReferees ? "On" : "Off",                             active: draft.autoNotifyAssignedReferees },
    { label: "Show progress",  value: draft.showProgressToReferees ? "Visible" : "Hidden",                         active: draft.showProgressToReferees },
  ];

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Learning Defaults"
      description="Pre-fill settings applied whenever an educator assigns learning to a referee. All defaults can be overridden per assignment."
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <button onClick={discard} style={{ fontSize: 13 }}>Discard</button>}
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

      {/* ── Context note ── */}
      <div style={{
        padding: "12px 16px",
        background: "rgba(10,132,255,.08)", borderRadius: 10,
        border: "1px solid rgba(10,132,255,.22)",
        fontSize: 13, color: "#6fb8ff",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <BookOpen size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          These are <strong style={{ color: "#6fb8ff" }}>saved defaults</strong> — they pre-fill settings when an educator assigns learning, but can be overridden per assignment.
          {draft.enableCertificates && " Certificate generation is not yet active; your preference is saved and will take effect when the feature launches."}
        </span>
      </div>

      {/* ── Current configuration summary ── */}
      <SettingsSection title="Current Configuration" description="A live snapshot of your saved learning defaults.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {summaryItems.map(({ label, value, active }) => (
            <div key={label} style={{
              padding: "12px 14px", borderRadius: 10,
              background: "var(--panel)",
              border: `1px solid ${active ? "rgba(52,199,89,.2)" : "var(--border)"}`,
            }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                {label}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: active ? "#34c759" : "var(--border)" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text)" : "var(--muted)" }}>{value}</span>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* ── Assignment Defaults ── */}
      <SettingsSection title="Assignment Defaults" description="Applied when an educator creates a new learning assignment. Educators can adjust these per assignment.">
        <SettingsCard>
          <SettingsRow
            label="Default due days"
            description="How many days after assignment a referee has to complete the learning."
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                style={numStyle}
                value={draft.assignmentDueDays}
                onChange={e => patch("assignmentDueDays", Number(e.target.value))}
                min={1}
                step={1}
              />
              <span className="hint" style={{ fontSize: 13 }}>days</span>
            </div>
          </SettingsRow>
          <ToggleRow
            label="Allow late completion"
            description="Referees can still complete assignments after the due date has passed."
            checked={draft.allowLateCompletion}
            onChange={v => patch("allowLateCompletion", v)}
          />
          <ToggleRow
            label="Allow referee comments"
            description="Referees can leave comments on clips within their assigned learning."
            checked={draft.allowRefereeComments}
            onChange={v => patch("allowRefereeComments", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Completion Rules ── */}
      <SettingsSection title="Completion Rules" description="Define what counts as completing an assignment and whether reflections are required.">
        <SettingsCard>
          <SettingsRow
            label="Required completion %"
            description="How much of the assignment content must be viewed before it counts as complete."
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number"
                style={numStyle}
                value={draft.requiredCompletionPercent}
                onChange={e => patch("requiredCompletionPercent", Number(e.target.value))}
                min={1}
                max={100}
                step={5}
              />
              <span className="hint" style={{ fontSize: 13 }}>%</span>
            </div>
          </SettingsRow>
          <SettingsRow
            label="Passing %"
            description="Minimum score required to pass an assessed assignment."
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number"
                style={numStyle}
                value={draft.passingPercent}
                onChange={e => patch("passingPercent", Number(e.target.value))}
                min={1}
                max={100}
                step={5}
              />
              <span className="hint" style={{ fontSize: 13 }}>%</span>
            </div>
          </SettingsRow>
          <ToggleRow
            label="Require reflection"
            description="Referees must submit a written reflection before the assignment is marked complete."
            checked={draft.requireReflection}
            onChange={v => patch("requireReflection", v)}
          />
          <ToggleRow
            label="Enable certificates"
            description="Issue a completion certificate when a referee finishes an assignment. Preference is saved — certificates will be issued when the feature launches."
            checked={draft.enableCertificates}
            onChange={v => patch("enableCertificates", v)}
            last
            badge={<StatusBadge status="coming-soon" />}
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Reminders & Notifications ── */}
      <SettingsSection title="Reminders & Notifications" description="Control when and how referees are notified about new and upcoming assignments.">
        <SettingsCard>
          <ToggleRow
            label="Auto-notify assigned referees"
            description="Send referees a notification immediately when they are assigned new learning."
            checked={draft.autoNotifyAssignedReferees}
            onChange={v => patch("autoNotifyAssignedReferees", v)}
          />
          <ToggleRow
            label="Send due-date reminders"
            description="Send referees a reminder email before their assignment due date."
            checked={draft.sendDueReminders}
            onChange={v => patch("sendDueReminders", v)}
          />
          <SettingsRow
            label="Reminder days before due"
            description="How many days before the due date to send the reminder. Requires reminders to be enabled."
            last
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                style={numStyle}
                value={draft.reminderDaysBefore}
                onChange={e => patch("reminderDaysBefore", Number(e.target.value))}
                min={0}
                step={1}
                disabled={!draft.sendDueReminders}
              />
              <span className="hint" style={{ fontSize: 13, opacity: draft.sendDueReminders ? 1 : 0.45 }}>days before</span>
            </div>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* ── Referee Visibility ── */}
      <SettingsSection title="Referee Visibility" description="Control what referees can see about their own learning progress.">
        <SettingsCard>
          <ToggleRow
            label="Show progress to referees"
            description="Referees can see their own completion progress and status within an assignment."
            checked={draft.showProgressToReferees}
            onChange={v => patch("showProgressToReferees", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Default Assignment Message ── */}
      <SettingsSection title="Default Assignment Message" description="Pre-filled message sent to a referee when an educator assigns learning. Educators can edit or clear it per assignment.">
        <SettingsCard>
          <textarea
            value={draft.defaultAssignmentMessage}
            onChange={e => patch("defaultAssignmentMessage", e.target.value)}
            rows={4}
            placeholder="e.g. Please review the clips in this assignment and focus on your positioning. Reach out if you have any questions."
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 96 }}
          />
          <p className="hint" style={{ margin: "6px 0 0", fontSize: 12 }}>
            {draft.defaultAssignmentMessage.trim().length > 0
              ? `${draft.defaultAssignmentMessage.trim().length} characters`
              : "No default message set — educators will start with an empty message field."}
          </p>
        </SettingsCard>
      </SettingsSection>

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("notifications")}>
            <Bell size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Notification Preferences
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("groups")}>
            <FolderOpen size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Manage Groups
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </button>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

function NotificationsPage({ settings, onUpdateSettings, setCurrentPage }: PageCtx) {
  const [draft, setDraft] = useState(() => ({ ...settings.notifications }));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const saved = settings.notifications;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const patch = useCallback(<K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  const save = useCallback(() => {
    onUpdateSettings({ notifications: { ...draft } });
    setFeedback({ type: "success", message: "Notification settings saved." });
  }, [draft, onUpdateSettings]);

  const discard = useCallback(() => {
    setDraft({ ...saved });
    setFeedback(null);
  }, [saved]);

  const selectStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

  // Derive live counts for summary
  const reviewToggles  = [draft.notifyReviewAssigned, draft.notifyReviewCompleted, draft.notifyReviewPublished, draft.commentReceived];
  const learningToggles = [draft.notifyAssignmentAssigned, draft.notifyAssignmentCompleted, draft.notifyAssignmentOverdue];
  const systemToggles  = [draft.notifySystemAnnouncements, draft.notifyMaintenanceUpdates];
  const reviewOn  = reviewToggles.filter(Boolean).length;
  const learningOn = learningToggles.filter(Boolean).length;
  const systemOn  = systemToggles.filter(Boolean).length;

  const deliveryLabel = draft.preferredDeliveryMethod === "email" ? "Email" : "In-app";
  const reminderLabel = draft.enableReminderEmails
    ? `${draft.reminderFrequency.charAt(0).toUpperCase()}${draft.reminderFrequency.slice(1)}`
    : "Off";

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Notification Preferences"
      description="Control which events trigger notifications for referees, educators, and admins across your organisation."
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <button onClick={discard} style={{ fontSize: 13 }}>Discard</button>}
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

      {/* ── Pending activation note ── */}
      <div style={{
        padding: "12px 16px",
        background: "rgba(10,132,255,.08)", borderRadius: 10,
        border: "1px solid rgba(10,132,255,.22)",
        fontSize: 13, color: "#6fb8ff",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <Bell size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Preferences are saved now and will take effect when the notification delivery service is connected.
          No emails or in-app alerts are currently sent, but your configuration will be ready.
        </span>
      </div>

      {/* ── Status summary ── */}
      <SettingsSection title="Current Configuration" description="A live snapshot of your saved notification preferences.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {[
            { label: "Review alerts",   value: `${reviewOn} of ${reviewToggles.length} on`,   active: reviewOn > 0 },
            { label: "Learning alerts", value: `${learningOn} of ${learningToggles.length} on`, active: learningOn > 0 },
            { label: "System alerts",   value: `${systemOn} of ${systemToggles.length} on`,   active: systemOn > 0 },
            { label: "Reminders",       value: reminderLabel,                                   active: draft.enableReminderEmails },
            { label: "Weekly digest",   value: draft.weeklyDigestEnabled ? "On" : "Off",        active: draft.weeklyDigestEnabled },
            { label: "Delivery",        value: deliveryLabel,                                   active: true },
          ].map(({ label, value, active }) => (
            <div key={label} style={{
              padding: "12px 14px", borderRadius: 10,
              background: "var(--panel)",
              border: `1px solid ${active ? "rgba(52,199,89,.2)" : "var(--border)"}`,
            }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                {label}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: active ? "#34c759" : "var(--border)" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text)" : "var(--muted)" }}>{value}</span>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* ── Review notifications ── */}
      <SettingsSection title="Review Notifications" description="Sent to referees and educators when review events occur.">
        <SettingsCard>
          <ToggleRow
            label="Review assigned"
            description="Notify the assigned referee when a new review is created for them."
            checked={draft.notifyReviewAssigned}
            onChange={v => patch("notifyReviewAssigned", v)}
          />
          <ToggleRow
            label="Review completed"
            description="Notify the referee when an educator marks their review as complete."
            checked={draft.notifyReviewCompleted}
            onChange={v => patch("notifyReviewCompleted", v)}
          />
          <ToggleRow
            label="Review published"
            description="Notify the referee when a completed review is published and made visible to them."
            checked={draft.notifyReviewPublished}
            onChange={v => patch("notifyReviewPublished", v)}
          />
          <ToggleRow
            label="Comment received"
            description="Notify users when a comment is added to a clip they are involved in."
            checked={draft.commentReceived}
            onChange={v => patch("commentReceived", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Learning notifications ── */}
      <SettingsSection title="Learning Notifications" description="Sent to referees and educators when learning assignment events occur.">
        <SettingsCard>
          <ToggleRow
            label="Assignment assigned"
            description="Notify the referee when new learning is assigned to them."
            checked={draft.notifyAssignmentAssigned}
            onChange={v => patch("notifyAssignmentAssigned", v)}
          />
          <ToggleRow
            label="Assignment completed"
            description="Notify the assigning educator when a referee completes their learning."
            checked={draft.notifyAssignmentCompleted}
            onChange={v => patch("notifyAssignmentCompleted", v)}
          />
          <ToggleRow
            label="Assignment overdue"
            description="Notify the referee and the educator when an assignment passes its due date without completion."
            checked={draft.notifyAssignmentOverdue}
            onChange={v => patch("notifyAssignmentOverdue", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Reminder defaults ── */}
      <SettingsSection title="Reminder Defaults" description="Periodic emails reminding referees of outstanding reviews and assignments.">
        <SettingsCard>
          <ToggleRow
            label="Enable reminder emails"
            description="Send periodic reminder emails to referees with outstanding tasks."
            checked={draft.enableReminderEmails}
            onChange={v => patch("enableReminderEmails", v)}
          />
          <SettingsRow
            label="Reminder frequency"
            description="How often reminder emails are sent. Requires reminder emails to be enabled."
          >
            <select
              style={{ ...selectStyle, width: 160 }}
              value={draft.reminderFrequency}
              onChange={e => patch("reminderFrequency", e.target.value as typeof draft.reminderFrequency)}
              disabled={!draft.enableReminderEmails}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </SettingsRow>
          <ToggleRow
            label="Weekly digest"
            description="Send educators a weekly summary of review and assignment activity across the organisation."
            checked={draft.weeklyDigestEnabled}
            onChange={v => patch("weeklyDigestEnabled", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── System communications ── */}
      <SettingsSection title="System Communications" description="Platform-level announcements and maintenance notices from the RefCoach team.">
        <SettingsCard>
          <ToggleRow
            label="System announcements"
            description="Receive important platform updates and feature announcements."
            checked={draft.notifySystemAnnouncements}
            onChange={v => patch("notifySystemAnnouncements", v)}
          />
          <ToggleRow
            label="Maintenance updates"
            description="Receive advance notice of scheduled maintenance windows."
            checked={draft.notifyMaintenanceUpdates}
            onChange={v => patch("notifyMaintenanceUpdates", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Delivery preferences ── */}
      <SettingsSection title="Delivery Preferences" description="Primary channel for delivering notifications to your organisation's members.">
        <SettingsCard>
          <SettingsRow
            label="Preferred delivery method"
            description="Email delivers to member inboxes. In-app shows notifications within the platform."
            last
          >
            <select
              style={{ ...selectStyle, width: 160 }}
              value={draft.preferredDeliveryMethod}
              onChange={e => patch("preferredDeliveryMethod", e.target.value as typeof draft.preferredDeliveryMethod)}
            >
              <option value="email">Email</option>
              <option value="in-app">In-app</option>
            </select>
          </SettingsRow>
        </SettingsCard>
        <p className="hint" style={{ margin: "4px 0 0", fontSize: 12 }}>
          Additional channels — Push, SMS, Microsoft Teams, and Slack — will appear here when available.
        </p>
      </SettingsSection>

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("members")}>
            <Users size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Manage Members
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("learning")}>
            <BookOpen size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Learning Defaults
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </button>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

function SecurityPage({ settings, onUpdateSettings, session, members, setCurrentPage }: PageCtx) {
  const [draft, setDraft] = useState(() => ({ ...settings.security }));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const saved = settings.security;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const patch = useCallback(<K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  const save = useCallback(() => {
    if (draft.sessionTimeoutMinutes < 5 || draft.sessionTimeoutMinutes > 10080) {
      setFeedback({ type: "error", message: "Session timeout must be between 5 minutes and 10,080 minutes (7 days)." });
      return;
    }
    if (draft.restrictByOrganisationEmailDomain && draft.allowedEmailDomains.trim()) {
      const domains = draft.allowedEmailDomains.split(",").map(d => d.trim()).filter(Boolean);
      const invalid = domains.filter(d => !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(d));
      if (invalid.length > 0) {
        setFeedback({ type: "error", message: `Invalid domain${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}. Enter plain domain names separated by commas (e.g. example.com, basketball.org.au).` });
        return;
      }
    }
    onUpdateSettings({ security: { ...draft } });
    setFeedback({ type: "success", message: "Security settings saved." });
  }, [draft, onUpdateSettings]);

  const discard = useCallback(() => {
    setDraft({ ...saved });
    setFeedback(null);
  }, [saved]);

  const numStyle: React.CSSProperties = { width: 120, boxSizing: "border-box" };

  const FutureBadge = () => (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
      background: "rgba(165,106,27,.15)", border: "1px solid rgba(165,106,27,.3)",
      color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      Coming soon
    </span>
  );

  // Derive live status chips for the overview panel
  const hours = Math.floor(draft.sessionTimeoutMinutes / 60);
  const mins  = draft.sessionTimeoutMinutes % 60;
  const timeoutLabel = hours > 0
    ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`)
    : `${draft.sessionTimeoutMinutes}m`;

  const adminCount      = members.filter(m => m.role === "admin" || m.role === "super_admin").length;
  const isSuperAdmin    = session.activeRole === "super_admin";

  type StatusChip = { label: string; value: string; active: boolean; future?: boolean };
  const statusChips: StatusChip[] = [
    { label: "Session timeout",     value: timeoutLabel,                                               active: true },
    { label: "Remember me",         value: draft.allowRememberMe ? "Allowed" : "Disabled",            active: draft.allowRememberMe },
    { label: "Email verification",  value: draft.requireEmailVerification ? "Required" : "Optional",  active: draft.requireEmailVerification },
    { label: "Strong passwords",    value: draft.requireStrongPasswords ? "Required" : "Not required", active: draft.requireStrongPasswords },
    { label: "Domain restriction",  value: draft.restrictByOrganisationEmailDomain ? (draft.allowedEmailDomains.trim() || "On (no domains set)") : "Off", active: draft.restrictByOrganisationEmailDomain },
    { label: "MFA",                 value: draft.requireTwoFactorAuthentication ? "Preference saved" : "Not set", active: false, future: true },
    { label: "SSO",                 value: draft.allowSingleSignOn ? "Preference saved" : "Not set",  active: false, future: true },
    { label: "Audit logging",       value: draft.auditLoggingEnabled ? "Preference saved" : "Not set", active: false, future: true },
  ];

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Security & Access"
      description="Authentication, session, and access control settings for your organisation."
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <button onClick={discard} style={{ fontSize: 13 }}>Discard</button>}
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

      {/* ── Access context ── */}
      <div style={{
        padding: "12px 16px",
        background: "rgba(10,132,255,.08)", borderRadius: 10,
        border: "1px solid rgba(10,132,255,.22)",
        fontSize: 13, color: "#6fb8ff",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <Shield size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Only{" "}
          <button style={{ all: "unset", cursor: "pointer", textDecoration: "underline", color: "#6fb8ff" }}
            onClick={() => setCurrentPage("roles")}>Admins and Super Admins</button>
          {" "}can change security settings.{" "}
          {adminCount > 0
            ? `${adminCount} admin${adminCount !== 1 ? "s" : ""} in your organisation.`
            : "No admins are currently assigned."}
          {!isSuperAdmin && " Some role assignments require a Super Admin."}
        </span>
      </div>

      {/* ── Security overview ── */}
      <SettingsSection title="Current Configuration" description="A snapshot of your saved security preferences.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {statusChips.map(chip => (
            <div key={chip.label} style={{
              padding: "12px 14px", borderRadius: 10,
              background: "var(--panel)",
              border: `1px solid ${chip.future ? "var(--border)" : chip.active ? "rgba(52,199,89,.25)" : "var(--border)"}`,
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                {chip.label}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {chip.future ? (
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{chip.value}</span>
                ) : (
                  <>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: chip.active ? "#34c759" : "var(--muted)",
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: chip.active ? "var(--text)" : "var(--muted)" }}>
                      {chip.value}
                    </span>
                  </>
                )}
                {chip.future && (
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4,
                    background: "rgba(165,106,27,.12)", border: "1px solid rgba(165,106,27,.25)",
                    color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Soon
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <InfoNote>
          Settings marked <strong>Coming soon</strong> are saved as preferences and will be enforced when the platform-level feature is released. Session, password, and domain settings are recorded now.
        </InfoNote>
      </SettingsSection>

      {/* ── Session controls ── */}
      <SettingsSection title="Session Controls" description="Control how long members stay signed in and how sessions are managed.">
        <SettingsCard>
          <SettingsRow
            label="Session timeout"
            description="How long a member's session stays active without interaction. Between 5 and 10,080 minutes (7 days)."
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number"
                style={numStyle}
                value={draft.sessionTimeoutMinutes}
                onChange={e => patch("sessionTimeoutMinutes", Number(e.target.value))}
                min={5}
                max={10080}
                step={30}
              />
              <span className="hint" style={{ fontSize: 13 }}>min</span>
            </div>
          </SettingsRow>
          <ToggleRow
            label="Allow remember me"
            description="Members can choose to stay signed in across browser sessions."
            checked={draft.allowRememberMe}
            onChange={v => patch("allowRememberMe", v)}
          />
          <ToggleRow
            label="Require email verification"
            description="New accounts must verify their email address before accessing the platform."
            checked={draft.requireEmailVerification}
            onChange={v => patch("requireEmailVerification", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Password policy ── */}
      <SettingsSection title="Password Policy" description="Set minimum standards for member account passwords.">
        <SettingsCard>
          <ToggleRow
            label="Require strong passwords"
            description="Members must use passwords with minimum length, mixed case, numbers, and symbols."
            checked={draft.requireStrongPasswords}
            onChange={v => patch("requireStrongPasswords", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Email domain restriction ── */}
      <SettingsSection title="Email Domain Restriction" description="Limit who can join this organisation based on their email address domain.">
        <SettingsCard>
          <ToggleRow
            label="Restrict by email domain"
            description="Only allow users with approved email domains to join this organisation."
            checked={draft.restrictByOrganisationEmailDomain}
            onChange={v => patch("restrictByOrganisationEmailDomain", v)}
          />
          <SettingsRow
            label="Allowed domains"
            description="Comma-separated list of permitted domains (e.g. basketball.org.au, example.com). Leave empty to allow any domain."
            last
          >
            <input
              type="text"
              style={{ width: 260, boxSizing: "border-box" }}
              value={draft.allowedEmailDomains}
              onChange={e => patch("allowedEmailDomains", e.target.value)}
              placeholder="example.com, basketball.org.au"
              disabled={!draft.restrictByOrganisationEmailDomain}
            />
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* ── Advanced authentication (future) ── */}
      <SettingsSection
        title="Advanced Authentication"
        description="Save your preferences now. These controls will be enforced when the platform-level feature is available."
      >
        <SettingsCard>
          <SettingsRow
            label="Multi-factor authentication (MFA)"
            description="Require all organisation members to use a second authentication factor when signing in."
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <OrgToggle
                checked={draft.requireTwoFactorAuthentication}
                onChange={v => patch("requireTwoFactorAuthentication", v)}
              />
              <FutureBadge />
            </div>
          </SettingsRow>
          <SettingsRow
            label="Single sign-on (SSO)"
            description="Allow members to sign in using your organisation's identity provider (e.g. Azure AD, Google Workspace, Okta)."
            last
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <OrgToggle
                checked={draft.allowSingleSignOn}
                onChange={v => patch("allowSingleSignOn", v)}
              />
              <FutureBadge />
            </div>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* ── Audit logging (future) ── */}
      <SettingsSection
        title="Audit Logging"
        description="Capture sign-in events, role changes, and data access for compliance and review."
      >
        <SettingsCard>
          <SettingsRow
            label="Enable audit logging"
            description="Record security-relevant events for this organisation. Logs will be viewable by Super Admins when the feature launches."
            last
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <OrgToggle
                checked={draft.auditLoggingEnabled}
                onChange={v => patch("auditLoggingEnabled", v)}
              />
              <FutureBadge />
            </div>
          </SettingsRow>
        </SettingsCard>
        <p className="hint" style={{ margin: "4px 0 0", fontSize: 12 }}>
          Audit log storage and viewing will be available in a future release. Your preference is saved and will take effect when the feature launches.
        </p>
      </SettingsSection>

      {/* ── Quick links ── */}
      <SettingsSection title="Related">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("members")}>
            <Users size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Manage Members
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("roles")}>
            <Shield size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Roles & Permissions
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </button>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

function MembersPage({ members, org, onNavigateMembers }: PageCtx) {
  const refereeCount   = members.filter(m => m.role === "referee").length;
  const educatorCount  = members.filter(m => m.role === "educator").length;
  const adminCount     = members.filter(m => m.role === "admin").length;
  const superAdminCount = members.filter(m => m.role === "super_admin").length;

  const roleCounts: { label: string; count: number; hint: string; colour: string }[] = [
    { label: "Total members", count: members.length,    hint: "All users in this organisation", colour: "var(--accent)" },
    { label: "Referees",      count: refereeCount,       hint: "Active referees",                colour: "#30d158" },
    { label: "Educators",     count: educatorCount,      hint: "Review educators",               colour: "#0a84ff" },
    { label: "Admins",        count: adminCount,         hint: "Organisation admins",             colour: "#ff9f0a" },
    { label: "Super admins",  count: superAdminCount,    hint: "Platform super admins",           colour: "#bf5af2" },
  ];

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Members"
      description="Overview of users in your organisation. Full member management is available in the Admin Dashboard."
      actions={
        <button className="primary" onClick={onNavigateMembers} style={{ fontSize: 13 }}>
          <Users size={14} /> Member Management
        </button>
      }
    >

      {/* Role breakdown */}
      <SettingsSection title="Role breakdown">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
          {roleCounts.map(({ label, count, hint, colour }) => (
            <div key={label} className="ed-summary-card">
              <div className="ed-summary-number" style={{ color: colour }}>{count}</div>
              <div className="ed-summary-label">{label}</div>
              <p className="hint" style={{ margin: "4px 0 0", fontSize: 11 }}>{hint}</p>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Member list */}
      <SettingsSection title="Members" description={`${members.length} user${members.length !== 1 ? "s" : ""} in ${org?.name ?? "this organisation"}.`}>
        {members.length === 0 ? (
          <SettingsCard description="No members found. Go to Admin Dashboard to invite users to your organisation.">{null}</SettingsCard>
        ) : (
          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            {members.map((m, i) => {
              const isLast = i === members.length - 1;
              const roleColour: Record<string, string> = {
                referee: "#30d158",
                educator: "#0a84ff",
                admin: "#ff9f0a",
                super_admin: "#bf5af2",
                viewer: "var(--muted)",
              };
              const roleLabel: Record<string, string> = {
                referee: "Referee",
                educator: "Educator",
                admin: "Admin",
                super_admin: "Super Admin",
                viewer: "Viewer",
              };
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 18px",
                    borderBottom: isLast ? "none" : "1px solid var(--border)",
                  }}
                >
                  {/* Avatar initials */}
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: `${roleColour[m.role] ?? "var(--muted)"}22`,
                      border: `1.5px solid ${roleColour[m.role] ?? "var(--muted)"}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 800,
                      color: roleColour[m.role] ?? "var(--muted)",
                    }}
                  >
                    {(m.name || m.email).slice(0, 1).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.name || "—"}
                    </p>
                    <p className="hint" style={{ margin: "2px 0 0", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.email}
                    </p>
                  </div>

                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 11, fontWeight: 800,
                      padding: "2px 9px", borderRadius: 6,
                      background: `${roleColour[m.role] ?? "var(--muted)"}1a`,
                      border: `1px solid ${roleColour[m.role] ?? "var(--muted)"}33`,
                      color: roleColour[m.role] ?? "var(--muted)",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}
                  >
                    {roleLabel[m.role] ?? m.role}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>

      {/* Quick links */}
      <SettingsSection title="Actions">
        <div className="ed-hero-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
          <button className="ed-hero-card" onClick={onNavigateMembers}>
            <span className="ed-hero-icon"><Users size={18} /></span>
            <span className="ed-hero-text">
              <span className="ed-hero-label">Member Management</span>
              <span className="ed-hero-hint">Invite users, assign roles, manage access</span>
            </span>
            <ChevronRight size={14} className="ed-hero-chevron" />
          </button>

          <div className="ed-hero-card" style={{ opacity: 0.55, cursor: "default" }}>
            <span className="ed-hero-icon"><Users size={18} /></span>
            <span className="ed-hero-text">
              <span className="ed-hero-label">Invite Members</span>
              <span className="ed-hero-hint">Send email invitations to new users</span>
            </span>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
              background: "rgba(165,106,27,.15)", border: "1px solid rgba(165,106,27,.3)",
              color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0,
            }}>
              Soon
            </span>
          </div>

          <div className="ed-hero-card" style={{ opacity: 0.55, cursor: "default" }}>
            <span className="ed-hero-icon"><Shield size={18} /></span>
            <span className="ed-hero-text">
              <span className="ed-hero-label">Permission Groups</span>
              <span className="ed-hero-hint">Fine-grained access control beyond roles</span>
            </span>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
              background: "rgba(165,106,27,.15)", border: "1px solid rgba(165,106,27,.3)",
              color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0,
            }}>
              Soon
            </span>
          </div>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

// ── Groups page ───────────────────────────────────────────────────────────────

function GroupsPage({
  session, members, groups, groupsLoading, groupsError,
  canCreateGroups, canEditGroups, canDeleteGroups,
  onCreateGroup, onUpdateGroup, onDeleteGroup, onSetGroupMembers,
  setCurrentPage,
}: PageCtx) {
  return (
    <GroupsScreen
      session={session}
      groups={groups}
      members={members}
      loading={groupsLoading}
      error={groupsError}
      canCreate={canCreateGroups}
      canEdit={canEditGroups}
      canDelete={canDeleteGroups}
      eyebrow="Organisation"
      onBack={() => setCurrentPage("dashboard")}
      onCreateGroup={onCreateGroup ?? (() => Promise.resolve())}
      onUpdateGroup={onUpdateGroup ?? (() => Promise.resolve())}
      onDeleteGroup={onDeleteGroup ?? (() => Promise.resolve())}
      onSetGroupMembers={onSetGroupMembers ?? (() => Promise.resolve())}
    />
  );
}

// ── Roles page ────────────────────────────────────────────────────────────────

const ROLE_META: {
  role: Role;
  label: string;
  color: string;
  tagline: string;
  description: string;
  capabilities: string[];
}[] = [
  {
    role: "super_admin",
    label: "Super Admin",
    color: "#c4b5fd",
    tagline: "Full platform ownership",
    description: "Unrestricted access to every feature, setting, and data point in the platform. Typically the organisation owner or technical administrator.",
    capabilities: ["All admin capabilities", "Assign and revoke any role including Admin", "Override per-user permissions", "Manage organisation billing and branding"],
  },
  {
    role: "admin",
    label: "Admin",
    color: "#ff9f0a",
    tagline: "Manages people, access, and settings",
    description: "Has full control over organisation management: invite members, assign educator and referee roles, configure settings, and access all analytics and tools.",
    capabilities: ["Invite and remove members", "Assign Referee and Educator roles", "Manage groups and assignments", "Configure organisation settings and learning defaults", "Access all reviews and analytics"],
  },
  {
    role: "educator",
    label: "Educator",
    color: "#6fb8ff",
    tagline: "Creates reviews and develops referees",
    description: "Coaches and develops referees through reviews, learning assignments, and group management. Cannot manage other users or change organisation settings.",
    capabilities: ["Create and assign video reviews", "Manage the clip library and playlists", "Create and manage referee groups", "Create and track learning assignments", "View analytics for their referees"],
  },
  {
    role: "referee",
    label: "Referee",
    color: "#30d158",
    tagline: "Views reviews and completes learning",
    description: "Access is limited to their own data. Can view reviews assigned to them and complete learning tasks set by educators.",
    capabilities: ["View their own reviews", "Complete assigned learning tasks", "Track their personal development goals"],
  },
  {
    role: "viewer",
    label: "Viewer",
    color: "#636366",
    tagline: "Read-only observer",
    description: "No active permissions by default. Viewer accounts can be granted specific access via per-user permission overrides in Team Management.",
    capabilities: ["No default access", "Can be granted specific permissions individually"],
  },
];

function RolesPage({ members, session, setCurrentPage }: PageCtx) {
  const [expandedRole, setExpandedRole] = useState<Role | null>(null);

  const countByRole: Record<Role, number> = {
    super_admin: 0, admin: 0, educator: 0, referee: 0, viewer: 0,
  };
  for (const m of members) {
    if (m.role in countByRole) countByRole[m.role]++;
  }

  const isSuperAdmin = session.activeRole === "super_admin";

  return (
    <SettingsPage eyebrow="Organisation" title="Roles & Permissions">

      {/* ── Info note ── */}
      <div style={{
        padding: "12px 16px",
        background: "rgba(10,132,255,.08)", borderRadius: 10,
        border: "1px solid rgba(10,132,255,.22)",
        fontSize: 13, color: "#6fb8ff",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <Shield size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Roles define what each user can see and do by default.
          Individual permissions can be customised further in{" "}
          <button
            style={{ all: "unset", cursor: "pointer", textDecoration: "underline", color: "#6fb8ff" }}
            onClick={() => setCurrentPage("members")}
          >
            Team Management
          </button>
          .
          {!isSuperAdmin && " Only Super Admins can assign Admin or Super Admin roles."}
        </span>
      </div>

      {/* ── Role cards ── */}
      <SettingsSection title="Role Definitions" description="Expand a role to see what it covers and who holds it.">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ROLE_META.map(({ role, label, color, tagline, description, capabilities }) => {
            const count = countByRole[role];
            const isExpanded = expandedRole === role;
            const membersWithRole = members.filter(m => m.role === role);

            return (
              <div
                key={role}
                className="panel"
                style={{ padding: 0, borderLeft: `3px solid ${color}`, overflow: "hidden" }}
              >
                {/* Header row — always visible */}
                <button
                  onClick={() => setExpandedRole(isExpanded ? null : role)}
                  style={{
                    all: "unset", cursor: "pointer", display: "flex",
                    alignItems: "center", gap: 14, width: "100%",
                    padding: "16px 20px", boxSizing: "border-box",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{label}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                        background: `${color}18`, border: `1px solid ${color}38`, color,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        {count} member{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="hint" style={{ margin: "3px 0 0", fontSize: 12 }}>{tagline}</p>
                  </div>
                  <span style={{ color: "var(--muted)", flexShrink: 0, fontSize: 18, lineHeight: 1 }}>
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)" }}>
                    <p style={{ margin: "14px 0 10px", fontSize: 13, lineHeight: 1.6, color: "var(--muted)" }}>{description}</p>

                    {/* Capabilities */}
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                        Default capabilities
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {capabilities.map(cap => (
                          <div key={cap} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
                            <span style={{ color, marginTop: 2, flexShrink: 0, fontSize: 14, lineHeight: 1 }}>✓</span>
                            <span>{cap}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Permission count from ROLE_DEFAULT_PERMISSIONS */}
                    {role !== "viewer" && (
                      <p className="hint" style={{ margin: "0 0 14px", fontSize: 12 }}>
                        {ROLE_DEFAULT_PERMISSIONS[role].length} of {Object.values(ROLE_DEFAULT_PERMISSIONS).reduce((max, perms) => Math.max(max, perms.length), 0)} permissions granted by default
                      </p>
                    )}

                    {/* Members with this role */}
                    {membersWithRole.length > 0 ? (
                      <div>
                        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                          Members ({membersWithRole.length})
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {membersWithRole.slice(0, 12).map(m => (
                            <div key={m.id} style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "5px 10px", borderRadius: 8,
                              background: "var(--panel2)", border: "1px solid var(--border)",
                              fontSize: 12, fontWeight: 600,
                            }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                                background: `${color}20`, border: `1.5px solid ${color}40`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 9, fontWeight: 900, color,
                              }}>
                                {m.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?"}
                              </div>
                              {m.name}
                            </div>
                          ))}
                          {membersWithRole.length > 12 && (
                            <div style={{
                              padding: "5px 10px", borderRadius: 8,
                              background: "var(--panel2)", border: "1px solid var(--border)",
                              fontSize: 12, color: "var(--muted)",
                            }}>
                              +{membersWithRole.length - 12} more
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="hint" style={{ margin: 0, fontSize: 12 }}>No members currently hold this role.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>

      {/* ── Permission summary table ── */}
      <SettingsSection title="Permission Matrix" description="Default permissions granted per role. Individual overrides can be set in Team Management.">
        <div className="panel" style={{ padding: "4px 0", overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", whiteSpace: "nowrap" }}>
                  Permission Area
                </th>
                {(["referee", "educator", "admin", "super_admin"] as Role[]).map(r => {
                  const meta = ROLE_META.find(m => m.role === r)!;
                  return (
                    <th key={r} style={{ textAlign: "center", padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
                        background: `${meta.color}18`, border: `1px solid ${meta.color}38`, color: meta.color,
                      }}>
                        {meta.label}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group, gi) => (
                group.permissions.map((perm, pi) => {
                  const isFirstInGroup = pi === 0;
                  return (
                    <tr key={perm.key} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 16px", fontSize: 12 }}>
                        {isFirstInGroup && (
                          <span style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 2 }}>
                            {group.label}
                          </span>
                        )}
                        {perm.label}
                      </td>
                      {(["referee", "educator", "admin", "super_admin"] as Role[]).map(r => {
                        const has = ROLE_DEFAULT_PERMISSIONS[r].includes(perm.key);
                        const meta = ROLE_META.find(m => m.role === r)!;
                        return (
                          <td key={r} style={{ textAlign: "center", padding: "8px 12px" }}>
                            {has ? (
                              <span style={{ color: meta.color, fontSize: 15, lineHeight: 1 }}>✓</span>
                            ) : (
                              <span style={{ color: "var(--border)", fontSize: 13, lineHeight: 1 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ margin: 0, fontSize: 12 }}>
          Viewer role has no default permissions. Individual overrides are managed in{" "}
          <button
            style={{ all: "unset", cursor: "pointer", textDecoration: "underline", color: "var(--muted)" }}
            onClick={() => setCurrentPage("members")}
          >
            Team Management
          </button>
          .
        </p>
      </SettingsSection>

      {/* ── Quick links ── */}
      <SettingsSection title="Actions">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("members")}>
            <Users size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Manage Members
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("security")}>
            <Shield size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Security Settings
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </button>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

function ResourcesPage({ settings, onUpdateSettings }: PageCtx) {
  const [draft, setDraft] = useState(() => {
    const { learningDocuments: _ld, ...rest } = settings.resources;
    return rest;
  });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { learningDocuments: _ld, ...savedRest } = settings.resources;
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedRest);

  const patch = useCallback(<K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  const save = useCallback(() => {
    onUpdateSettings({ resources: { ...settings.resources, ...draft } });
    setFeedback({ type: "success", message: "Resource settings saved." });
  }, [draft, settings.resources, onUpdateSettings]);

  const discard = useCallback(() => {
    const { learningDocuments: _ld2, ...rest } = settings.resources;
    setDraft(rest);
    setFeedback(null);
  }, [settings.resources]);

  const selectStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" };

  const resourceTypes: {
    label: string;
    description: string;
    available: boolean;
    icon: string;
  }[] = [
    { label: "External video links", description: "YouTube, Hudl, GloryLeague, and other video URLs", available: true, icon: "▶" },
    { label: "External article links", description: "Links to officiating guides, rules documents, and web resources", available: true, icon: "🔗" },
    { label: "PDF documents", description: "Rulebooks, officiating guides, and reference materials", available: false, icon: "📄" },
    { label: "DOCX documents", description: "Word documents and written case studies", available: false, icon: "📝" },
    { label: "PPTX presentations", description: "Slide decks and visual training materials", available: false, icon: "📊" },
    { label: "XLSX spreadsheets", description: "Statistics, schedules, and structured data", available: false, icon: "📋" },
  ];

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Resources"
      description="Learning documents and reference materials for your organisation's referees."
      actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {dirty && <button onClick={discard} style={{ fontSize: 13 }}>Discard</button>}
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

      <InfoNote>
        External video and article links are <strong>available now</strong>. Document upload (PDF, DOCX, PPTX, XLSX) is a future feature — enabling it here records your preference and will take effect when document hosting is available.
      </InfoNote>

      <SettingsSection title="Resource availability">
        <SettingsCard>
          <ToggleRow
            label="Enable learning resources"
            description="Allow resources to be attached to assignments and made available to referees."
            checked={draft.enableLearningResources}
            onChange={v => patch("enableLearningResources", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Supported resource types" description="Control which types of resources educators can attach to learning assignments.">
        <SettingsCard>
          <ToggleRow
            label="External resource links"
            description="Allow educators to link to external videos, articles, and web-based reference materials."
            checked={draft.allowExternalResourceLinks}
            onChange={v => patch("allowExternalResourceLinks", v)}
            last={true}
          />
        </SettingsCard>
        <SettingsCard>
          <ToggleRow
            label="Document resources"
            description="Allow educators to attach document files such as PDFs, DOCX, PPTX, and XLSX. Document upload infrastructure is coming in a future release."
            checked={draft.allowDocumentResources}
            onChange={v => patch("allowDocumentResources", v)}
            last
            badge={<StatusBadge status="coming-soon" />}
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Visibility defaults" description="Control who can see resources by default when they are published.">
        <SettingsCard>
          <SettingsRow
            label="Default resource visibility"
            description="Who can access resources in this organisation."
          >
            <select
              style={{ ...selectStyle, width: 220 }}
              value={draft.defaultResourceVisibility}
              onChange={e => patch("defaultResourceVisibility", e.target.value as typeof draft.defaultResourceVisibility)}
            >
              <option value="all-members">All members</option>
              <option value="assigned-only">Assigned referees only</option>
              <option value="educators-only">Educators only</option>
            </select>
          </SettingsRow>
          <ToggleRow
            label="Show resources to referees"
            description="Referees can browse available resources from their learning area."
            checked={draft.showResourcesToReferees}
            onChange={v => patch("showResourcesToReferees", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Review and approval" description="Control whether resources must be approved before they become visible to referees.">
        <SettingsCard>
          <ToggleRow
            label="Require resource review"
            description="Resources added by educators must be reviewed and approved by an admin before referees can see them."
            checked={draft.resourceReviewRequired}
            onChange={v => patch("resourceReviewRequired", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Supported formats" description="Current and upcoming resource formats available in RefCoach.">
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          {resourceTypes.map((rt, i) => {
            const isLast = i === resourceTypes.length - 1;
            return (
              <div
                key={rt.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 18px",
                  borderBottom: isLast ? "none" : "1px solid var(--border)",
                  opacity: rt.available ? 1 : 0.6,
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0, width: 28, textAlign: "center" }}>{rt.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{rt.label}</p>
                  <p className="hint" style={{ margin: "2px 0 0", fontSize: 12 }}>{rt.description}</p>
                </div>
                {rt.available ? (
                  <span
                    style={{
                      flexShrink: 0, fontSize: 11, fontWeight: 800,
                      padding: "2px 9px", borderRadius: 6,
                      background: "rgba(52,199,89,.12)", border: "1px solid rgba(52,199,89,.3)",
                      color: "#34c759", textTransform: "uppercase", letterSpacing: "0.05em",
                    }}
                  >
                    Available
                  </span>
                ) : (
                  <span
                    style={{
                      flexShrink: 0, fontSize: 11, fontWeight: 800,
                      padding: "2px 9px", borderRadius: 6,
                      background: "rgba(165,106,27,.12)", border: "1px solid rgba(165,106,27,.25)",
                      color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em",
                    }}
                  >
                    Coming soon
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>
    </SettingsPage>
  );
}

// ── Billing & Plan page ───────────────────────────────────────────────────────

function BillingPage({ org, members, reviews, assignments, session, setCurrentPage }: PageCtx) {
  const memberCount     = members.length;
  const reviewCount     = reviews.length;
  const assignmentCount = assignments.length;

  const roleBreakdown: { role: string; count: number }[] = [
    { role: "Referees",  count: members.filter(m => m.role === "referee").length },
    { role: "Educators", count: members.filter(m => m.role === "educator").length },
    { role: "Admins",    count: members.filter(m => m.role === "admin" || m.role === "super_admin").length },
  ].filter(r => r.count > 0);

  const createdAt = org?.createdAt
    ? new Date(org.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const isSuperAdmin = session.activeRole === "super_admin";
  const isAdmin      = session.activeRole === "admin" || isSuperAdmin;

  const usageItems: { label: string; value: string; sub?: string }[] = [
    { label: "Members",     value: String(memberCount),     sub: roleBreakdown.map(r => `${r.count} ${r.role}`).join(" · ") || undefined },
    { label: "Reviews",     value: String(reviewCount),     sub: "all time" },
    { label: "Assignments", value: String(assignmentCount), sub: "all time" },
  ];

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Billing & Plan"
      description="Your organisation's current plan and account usage. Billing management will be available in a future update."
    >
      {/* ── Context note ── */}
      <div style={{
        padding: "12px 16px",
        background: "rgba(10,132,255,.08)", borderRadius: 10,
        border: "1px solid rgba(10,132,255,.22)",
        fontSize: 13, color: "#6fb8ff",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <CreditCard size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Billing and subscription management is coming to RefCoach. Your account details and usage are shown below.
          To discuss your plan or request changes, contact the RefCoach team directly.
        </span>
      </div>

      {/* ── Current Plan ── */}
      <SettingsSection title="Current Plan" description="Your organisation's active plan and account standing.">
        <div style={{
          padding: "20px 24px", borderRadius: 12,
          background: "var(--panel)",
          border: "1px solid rgba(165,106,27,.3)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: "rgba(165,106,27,.15)", border: "1px solid rgba(165,106,27,.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CreditCard size={20} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>RefCoach Platform</h2>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                  background: "rgba(52,199,89,.14)", color: "#34c759",
                  border: "1px solid rgba(52,199,89,.3)", textTransform: "uppercase", letterSpacing: "0.05em",
                }}>Active</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                {org?.name ?? "Your organisation"}
                {createdAt && <span style={{ marginLeft: 8 }}>· Member since {createdAt}</span>}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                Billing enquiries
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                Contact <span style={{ color: "var(--text)" }}>support@refcoach.com.au</span>
              </p>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* ── Account Usage ── */}
      <SettingsSection title="Account Usage" description="Activity across your organisation based on your current data.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {usageItems.map(({ label, value, sub }) => (
            <div key={label} style={{
              padding: "16px 18px", borderRadius: 10,
              background: "var(--panel)", border: "1px solid var(--border)",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                {label}
              </p>
              <p style={{ margin: "0 0 2px", fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{value}</p>
              {sub && <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{sub}</p>}
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* ── Upcoming billing features ── */}
      <SettingsSection title="Coming Soon" description="These features will be available when billing management launches.">
        <SettingsCard>
          {[
            { icon: <CreditCard size={15} />, label: "Payment methods",   desc: "Add and manage credit cards or bank accounts." },
            { icon: <CheckCircle size={15} />, label: "Invoices",          desc: "View and download past invoices and receipts." },
            { icon: <Shield size={15} />,      label: "Subscription plan", desc: "Upgrade, downgrade, or cancel your plan." },
            { icon: <Users size={15} />,       label: "Seat management",   desc: "Manage member seats and plan limits." },
          ].map(({ icon, label, desc }, i, arr) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 0",
              borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : undefined,
              opacity: 0.55,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: "var(--panel2)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--muted)",
              }}>
                {icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600 }}>{label}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{desc}</p>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: "var(--panel3)", color: "var(--muted)",
                border: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.04em",
                flexShrink: 0,
              }}>
                Coming soon
              </span>
            </div>
          ))}
        </SettingsCard>
      </SettingsSection>

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("members")}>
            <Users size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Manage Members
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("profile")}>
            <Building2 size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Organisation Profile
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </button>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}
