"use client";

import { useState, useCallback, useId } from "react";
import type { ReactNode } from "react";
import {
  Building2, User, Palette, SlidersHorizontal, Film, BookOpen,
  Bell, Shield, Users, FolderOpen, Globe, Clock,
  CheckCircle, AlertCircle, CreditCard, Key, Layers, Search,
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
import { PageFrame } from "@/components/shell/PageFrame";
import {
  Badge, Button, buttonClasses, Card, EmptyState, FormField, Input, Select, Table, TableBody,
  TableCell, TableHead, TableHeaderCell, TableRow, Tabs, Textarea,
  type TabItem, type BadgeTone,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { ROLE_TONE } from "@/lib/utils/roleTone";

// ── Sub-page routing ──────────────────────────────────────────────────────────

export type OrgPage =
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

// ── Helpers ───────────────────────────────────────────────────────────────────


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
  currentPage: OrgPage;
  setCurrentPage: (page: OrgPage) => void;
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

// ── Settings tab bar ─────────────────────────────────────────────────────────
// The sidebar's "Settings" item (see components/shell/nav.ts) covers these 8
// orgPage values; only when currentPage is one of them does the Organisation
// screen show this tab bar instead of a single page.

const SETTINGS_PAGE_IDS = new Set<OrgPage>([
  "profile", "branding", "preferences", "roles", "security", "notifications", "reviews", "learning",
]);

function buildSettingsTabs(ctx: PageCtx): TabItem[] {
  return [
    { id: "profile", label: "Profile", icon: <User size={14} />, content: <ProfilePage {...ctx} /> },
    { id: "branding", label: "Branding", icon: <Palette size={14} />, content: <BrandingPage {...ctx} /> },
    { id: "preferences", label: "Preferences", icon: <SlidersHorizontal size={14} />, content: <PreferencesPage {...ctx} /> },
    { id: "roles", label: "Roles", icon: <Key size={14} />, content: <RolesPage {...ctx} /> },
    { id: "security", label: "Security", icon: <Shield size={14} />, content: <SecurityPage {...ctx} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={14} />, content: <NotificationsPage {...ctx} /> },
    { id: "reviews", label: "Reviews Defaults", icon: <Film size={14} />, content: <ReviewsPage {...ctx} /> },
    { id: "learning", label: "Learning Defaults", icon: <BookOpen size={14} />, content: <LearningPage {...ctx} /> },
  ];
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function OrganisationScreen({
  session, org, members, reviews, assignments,
  settings, onUpdateSettings, currentPage, setCurrentPage, onNavigateMembers,
  groupCount = 0, activeGoalCount = 0,
  groups = [], groupsLoading = false, groupsError = "",
  canCreateGroups = false, canEditGroups = false, canDeleteGroups = false,
  onCreateGroup, onUpdateGroup, onDeleteGroup, onSetGroupMembers,
}: Props) {
  const ctx: PageCtx = {
    session, org, members, reviews, assignments,
    settings, onUpdateSettings, setCurrentPage, onNavigateMembers,
    groupCount, activeGoalCount,
    groups, groupsLoading, groupsError,
    canCreateGroups, canEditGroups, canDeleteGroups,
    onCreateGroup, onUpdateGroup, onDeleteGroup, onSetGroupMembers,
  };

  // The main app Sidebar (see components/shell/nav.ts) links to Organisation
  // as 6 flat items: Overview, Settings, Members, Groups, Billing & Plan,
  // Resources. Settings is the only one with further sub-pages, which live
  // behind this tab bar rather than a sidebar submenu.
  if (SETTINGS_PAGE_IDS.has(currentPage)) {
    return (
      <Tabs
        tabs={buildSettingsTabs(ctx)}
        ariaLabel="Organisation settings"
        activeId={currentPage}
        onChange={(id) => setCurrentPage(id as OrgPage)}
      />
    );
  }

  switch (currentPage) {
    case "members":
      return <MembersPage {...ctx} />;
    case "groups":
      return <GroupsPage {...ctx} />;
    case "billing":
      return <BillingPage {...ctx} />;
    case "resources":
      return <ResourcesPage {...ctx} />;
    case "dashboard":
    default:
      return <DashboardPage {...ctx} />;
  }
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

// ── Dashboard page ────────────────────────────────────────────────────────────

// Referee College Design System — Phase 3. Role colours are kept distinct
// (referee/educator/admin are a genuinely meaningful distinction, not
// decorative) but mapped onto the shared token palette instead of four
// unrelated hex values, per "do not flatten meaningful semantic
// differences" while still satisfying "restrained colour usage." Extracted
// to lib/utils/roleTone.ts in Phase 6 so other screens (Members, Team
// Management, user profile) share the same mapping.

function RolePill({ role, label, count }: { role: string; label: string; count: number }) {
  const tone = ROLE_TONE[role] ?? ROLE_TONE.viewer;
  return (
    <div className={cn("flex items-center justify-between rounded-[10px] border px-3.5 py-2.5", tone.bg, tone.border)}>
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
        <span className="text-[13px] font-semibold text-text">{label}</span>
      </div>
      <span className={cn("text-base font-extrabold", tone.text)}>{count}</span>
    </div>
  );
}

function DashboardSectionCard({
  title, description, action, children,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; primary?: boolean };
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <p className="text-[15px] font-extrabold tracking-tight text-text">{title}</p>
          {description && <p className="hint mt-0.5 text-xs">{description}</p>}
        </div>
        {action && (
          <Button variant={action.primary ? "primary" : "secondary"} size="sm" onClick={action.onClick} className="shrink-0">
            {action.label}
          </Button>
        )}
      </div>
      {children}
    </Card>
  );
}

function DashboardPage({ org, members, reviews, assignments, settings, setCurrentPage, onNavigateMembers, groupCount, activeGoalCount, groups, canCreateGroups }: PageCtx) {
  // ── Member breakdowns ─────────────────────────────────────────────
  const refereeCount  = members.filter(m => m.role === "referee").length;
  const educatorCount = members.filter(m => m.role === "educator").length;
  const adminCount    = members.filter(m => m.role === "admin" || m.role === "super_admin").length;

  // ── Review stats ──────────────────────────────────────────────────
  const completedReviews  = reviews.filter(r => r.status === "Completed").length;
  const inProgressReviews = reviews.length - completedReviews;
  const reviewPct = reviews.length > 0 ? Math.round((completedReviews / reviews.length) * 100) : 0;

  // ── Assignment stats ──────────────────────────────────────────────
  const activeAssignments    = assignments.filter(a => a.assignmentUsers.some(u => u.status !== "Completed")).length;
  const completedAssignments = assignments.filter(a => a.assignmentUsers.length > 0 && a.assignmentUsers.every(u => u.status === "Completed")).length;

  // ── Group coverage ────────────────────────────────────────────────
  const inGroupIds   = new Set(groups.flatMap(g => g.members.map(gm => gm.userId)));
  const inGroupCount = members.filter(m => inGroupIds.has(m.id)).length;
  const ungrouped    = members.length - inGroupCount;
  const coveragePct  = members.length > 0 ? Math.round((inGroupCount / members.length) * 100) : 0;

  // ── Setup health ──────────────────────────────────────────────────
  type SetupItem = { label: string; done: boolean; page: OrgPage | null; actionLabel: string };
  const setupItems: SetupItem[] = [
    { label: "Contact email",            done: !!settings.profile.contactEmail.trim(),    page: "profile",       actionLabel: "Add email" },
    { label: "Website",                  done: !!settings.profile.website.trim(),         page: "profile",       actionLabel: "Add website" },
    { label: "Branding configured",      done: !!(settings.branding.logoUrl || settings.branding.logoText.trim()), page: "branding", actionLabel: "Configure" },
    { label: "Members invited",          done: members.length > 0,                        page: null,            actionLabel: "Invite members" },
    { label: "Groups created",           done: groups.length > 0,                         page: "groups",        actionLabel: "Create group" },
    { label: "Notifications configured", done: settings.notifications.notifyReviewAssigned || settings.notifications.notifyAssignmentAssigned, page: "notifications", actionLabel: "Configure" },
  ];
  const setupDone = setupItems.filter(s => s.done).length;
  const setupPct  = Math.round((setupDone / setupItems.length) * 100);

  return (
    <PageFrame eyebrow="Organisation" title={org?.name ?? "Organisation"} className="p-0">

      {/* ── Org identity header ── */}
      <Card className="flex flex-wrap items-center gap-[18px]">
        <OrgLogoMark name={org?.name ?? ""} branding={settings.branding} size={60} fontSize={22} borderRadius={16} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 className="text-xl font-extrabold text-text">{org?.name ?? "—"}</h2>
            {settings.profile.shortName && (
              <span className="hint text-[13px] font-semibold">{settings.profile.shortName}</span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1">
            <span className="hint flex items-center gap-1.5 text-xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              {settings.profile.sport}
            </span>
            <span className="hint flex items-center gap-1.5 text-xs">
              <Clock size={11} />{settings.preferences.timezone}
            </span>
            <span className="hint flex items-center gap-1.5 text-xs">
              <Globe size={11} />{settings.preferences.locale} · {settings.preferences.country}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCurrentPage("profile")}>Edit Profile</Button>
          <Button variant="secondary" size="sm" onClick={() => setCurrentPage("branding")}>Branding</Button>
        </div>
      </Card>

      {/* ── Summary metrics ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Members",      value: members.length,   onClick: () => setCurrentPage("members") },
          { label: "Referees",     value: refereeCount,     onClick: () => setCurrentPage("members") },
          { label: "Educators",    value: educatorCount,    onClick: () => setCurrentPage("members") },
          { label: "Groups",       value: groupCount,       onClick: () => setCurrentPage("groups") },
          { label: "Reviews",      value: reviews.length,   onClick: undefined },
          { label: "Active Goals", value: activeGoalCount,  onClick: undefined },
        ].map(({ label, value, onClick }) => (
          <SummaryTile key={label} label={label} value={value} onClick={onClick} />
        ))}
      </div>

      {/* ── Activity Overview ── */}
      <div>
        <p className="ed-section-title mb-0.5">Activity Overview</p>
        <p className="hint mb-3 text-xs">Review completions, learning progress, and group coverage across your organisation.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

          {/* Reviews */}
          <DashboardSectionCard title="Reviews" description={reviews.length === 0 ? "No reviews yet" : `${reviews.length} total`}>
            {reviews.length === 0 ? (
              <p className="hint text-xs">Reviews created by educators will appear here.</p>
            ) : (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Completed</span>
                  <span className="text-[13px] font-bold text-good">{completedReviews}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">In Review</span>
                  <span className="text-[13px] font-bold text-yellow-300">{inProgressReviews}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-panel-3">
                  <div className={cn("h-full rounded-full transition-[width] duration-300", reviewPct === 100 ? "bg-good" : "bg-accent")} style={{ width: `${reviewPct}%` }} />
                </div>
                <span className="text-[11px] text-muted">{reviewPct}% complete</span>
              </div>
            )}
          </DashboardSectionCard>

          {/* Assignments */}
          <DashboardSectionCard title="Assignments" description={assignments.length === 0 ? "No assignments yet" : `${assignments.length} total`}>
            {assignments.length === 0 ? (
              <p className="hint text-xs">Learning assignments created by educators will appear here.</p>
            ) : (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Active</span>
                  <span className="text-[13px] font-bold text-blue-300">{activeAssignments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Completed</span>
                  <span className="text-[13px] font-bold text-good">{completedAssignments}</span>
                </div>
                {activeGoalCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Active goals</span>
                    <span className="text-[13px] font-bold text-yellow-300">{activeGoalCount}</span>
                  </div>
                )}
              </div>
            )}
          </DashboardSectionCard>

          {/* Group coverage */}
          <DashboardSectionCard
            title="Group Coverage"
            description={members.length === 0 ? "No members yet" : `${coveragePct}% of members in a group`}
            action={groups.length > 0 && ungrouped > 0 ? { label: "Manage Groups", onClick: () => setCurrentPage("groups") } : undefined}
          >
            {members.length === 0 ? (
              <p className="hint text-xs">Invite members to start tracking group coverage.</p>
            ) : groups.length === 0 ? (
              <p className="hint text-xs">
                No groups created yet.{" "}
                {canCreateGroups && (
                  <button className="text-accent underline" onClick={() => setCurrentPage("groups")}>
                    Create a group →
                  </button>
                )}
              </p>
            ) : (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">In a group</span>
                  <span className="text-[13px] font-bold text-accent">{inGroupCount}</span>
                </div>
                {ungrouped > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Ungrouped</span>
                    <span className="text-[13px] font-bold text-muted">{ungrouped}</span>
                  </div>
                )}
                <div className="h-1 overflow-hidden rounded-full bg-panel-3">
                  <div className={cn("h-full rounded-full transition-[width] duration-300", coveragePct === 100 ? "bg-good" : "bg-accent")} style={{ width: `${coveragePct}%` }} />
                </div>
                <span className={cn("text-[11px]", coveragePct === 100 ? "text-good" : "text-muted")}>
                  {coveragePct === 100 ? "All members are in a group" : `${ungrouped} member${ungrouped !== 1 ? "s" : ""} not in any group`}
                </span>
              </div>
            )}
          </DashboardSectionCard>

        </div>
      </div>

      {/* ── Organisation Setup ── */}
      <div>
        <p className="ed-section-title mb-0.5">Organisation Setup</p>
        <p className="hint mb-3 text-xs">
          {setupDone === setupItems.length
            ? "All setup tasks are complete — your organisation is fully configured."
            : `${setupDone} of ${setupItems.length} setup tasks complete. Complete the remaining items to get the most out of RefCoach.`}
        </p>
        <Card>
          {/* Progress bar */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-3">
              <div className={cn("h-full rounded-full transition-[width] duration-300", setupPct === 100 ? "bg-good" : "bg-accent")} style={{ width: `${setupPct}%` }} />
            </div>
            <span className={cn("whitespace-nowrap text-xs font-bold", setupPct === 100 ? "text-good" : "text-text")}>
              {setupPct}%
            </span>
          </div>

          {/* Checklist grid */}
          <div className="grid gap-2 sm:grid-cols-2">
            {setupItems.map(({ label, done, page, actionLabel }) => (
              <div
                key={label}
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-[9px] border px-3 py-2.5",
                  done ? "border-good/20 bg-good/[.06]" : "border-border bg-panel-2"
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border text-[10px] font-black",
                      done ? "border-good/40 bg-good/15 text-good" : "border-border bg-panel-3 text-muted"
                    )}
                  >
                    {done ? "✓" : "·"}
                  </span>
                  <span className={cn("truncate text-xs font-semibold", done ? "text-text" : "text-muted")}>
                    {label}
                  </span>
                </div>
                {!done && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0 px-2 py-0.5 text-[11px]"
                    onClick={page ? () => setCurrentPage(page) : onNavigateMembers}
                  >
                    {actionLabel} →
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Members ── */}
      <div>
        <p className="ed-section-title mb-3">Members</p>
        <DashboardSectionCard
          title="Member Overview"
          description={`${members.length} user${members.length !== 1 ? "s" : ""} across all roles`}
          action={{ label: "Manage Members", onClick: onNavigateMembers, primary: true }}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <RolePill role="referee" label="Referees" count={refereeCount} />
            <RolePill role="educator" label="Educators" count={educatorCount} />
            <RolePill role="admin" label="Admins" count={adminCount} />
          </div>
          {members.length === 0 ? (
            <EmptyState
              className="mt-2"
              title="No members yet"
              description="Send your first invitation via Member Management to get your organisation up and running."
            />
          ) : (
            <div className="mt-2 flex flex-col overflow-hidden rounded-[10px] border border-border">
              {members.slice(0, 5).map((m, i) => {
                const tone = ROLE_TONE[m.role] ?? ROLE_TONE.viewer;
                const roleLabel: Record<string, string> = { referee: "Referee", educator: "Educator", admin: "Administrator", super_admin: "Super Admin", viewer: "Viewer" };
                const isLast = i === Math.min(members.length, 5) - 1;
                return (
                  <div key={m.id} className={cn("flex items-center gap-3 bg-panel-2 px-3.5 py-2.5", !isLast && "border-b border-border")}>
                    <div className={cn("grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border text-xs font-extrabold", tone.bg, tone.border, tone.text)}>
                      {(m.name || m.email).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-text">{m.name || "—"}</p>
                      <p className="hint truncate text-[11px]">{m.email}</p>
                    </div>
                    <Badge tone="neutral" className={cn(tone.text)}>{roleLabel[m.role] ?? m.role}</Badge>
                  </div>
                );
              })}
              {members.length > 5 && (
                <div className="border-t border-border bg-panel-2 px-3.5 py-2.5">
                  <button className="text-xs font-semibold text-accent" onClick={onNavigateMembers}>
                    View all {members.length} members →
                  </button>
                </div>
              )}
            </div>
          )}
        </DashboardSectionCard>
      </div>

      {/* ── Groups ── */}
      <div>
        <p className="ed-section-title mb-0.5">Groups</p>
        <p className="hint mb-3 text-xs">Organise referees into cohorts for targeted learning and coaching.</p>
        <Card>
          {groups.length === 0 ? (
            <EmptyState
              icon={<Layers size={24} />}
              title="No groups yet"
              description="Create referee groups to target learning by cohort and track development progress."
              action={canCreateGroups ? <Button size="sm" onClick={() => setCurrentPage("groups")}>Create Group</Button> : undefined}
            />
          ) : (
            <>
              <div className="flex flex-col">
                {groups.slice(0, 5).map((g, i) => (
                  <div key={g.id} className={cn("flex items-center gap-3 py-2.5", i < Math.min(groups.length, 5) - 1 && "border-b border-border")}>
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.colour }} />
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-bold text-text">{g.name}</span>
                      {g.description && (
                        <span className="hint ml-2 truncate text-xs">
                          {g.description}
                        </span>
                      )}
                    </div>
                    <span className="hint shrink-0 text-xs">
                      {g.members.length} member{g.members.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
              {groups.length > 5 && (
                <p className="hint mt-2 text-xs">
                  +{groups.length - 5} more group{groups.length - 5 !== 1 ? "s" : ""}
                </p>
              )}
              <div className="mt-3.5 flex gap-2 border-t border-border pt-3.5">
                <Button variant="secondary" size="sm" onClick={() => setCurrentPage("groups")} className="gap-1.5">
                  <Layers size={12} /> Manage Groups
                </Button>
                {canCreateGroups && (
                  <Button variant="secondary" size="sm" onClick={() => setCurrentPage("groups")}>
                    + New Group
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

    </PageFrame>
  );
}

// ── Shared status badge ───────────────────────────────────────────────────────

type SettingStatus = "active" | "saved-default" | "not-enforced" | "coming-soon";

const SETTING_STATUS_TONE: Record<SettingStatus, { label: string; tone: BadgeTone }> = {
  "active":        { label: "Active",           tone: "good" },
  "saved-default": { label: "Saved default",    tone: "accent" },
  "not-enforced":  { label: "Not enforced yet", tone: "warn" },
  "coming-soon":   { label: "Coming soon",      tone: "neutral" },
};

function StatusBadge({ status }: { status: SettingStatus }) {
  const s = SETTING_STATUS_TONE[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

// ── Shared info note ──────────────────────────────────────────────────────────

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-info/20 bg-info/[.06] p-2.5 px-4 text-[13px] leading-relaxed text-muted">
      {children}
    </div>
  );
}

// ── Shared context banner (blue info box used at the top of most sub-pages) ────

function InfoBanner({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[10px] border border-info/[.22] bg-info/[.08] p-3 px-4 text-[13px] text-blue-300">
      {icon && <span className="mt-px shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}

// ── Shared summary/stat tile (repeated pattern across Dashboard/Members/Preferences/etc) ─

function SummaryTile({
  label, value, colourClassName, onClick,
}: {
  label: string;
  value: ReactNode;
  colourClassName?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className={cn("mb-1 text-[28px] font-black leading-none tracking-tight text-text", colourClassName)}>
        {value}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
    </>
  );
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full cursor-pointer rounded-[14px] border border-border bg-panel p-3.5 text-left shadow-sm transition-colors hover:border-accent"
      >
        {content}
      </button>
    );
  }
  return <div className="rounded-[14px] border border-border bg-panel p-3.5 shadow-sm">{content}</div>;
}

// ── Shared form feedback banner ───────────────────────────────────────────────

function FeedbackBanner({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[10px] border p-2.5 px-4 text-[13px] font-semibold",
        type === "success" ? "border-good/30 bg-good/[.12] text-good" : "border-danger/30 bg-danger/[.12] text-red-400"
      )}
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

  // Completeness: count filled contact fields
  const contactFields = [draft.contactEmail, draft.phone, draft.website, draft.address];
  const filledCount = contactFields.filter(v => v && v.trim()).length;

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Organisation Profile"
      description="Identity and contact details for your organisation — used in reports, reviews, and platform-wide references."
      actions={
        <div className="flex items-center gap-2">
          {dirty && <Button variant="ghost" size="sm" onClick={discard}>Discard</Button>}
          <Button variant="primary" size="sm" onClick={save} disabled={!dirty}>Save changes</Button>
        </div>
      }
    >
      {feedback && <FeedbackBanner {...feedback} />}

      <InfoBanner icon={<User size={15} />}>
        Organisation name and contact details appear in reviews, reports, and member-facing screens.
        Changes take effect immediately after saving.
      </InfoBanner>

      {/* ── Live identity preview ── */}
      <SettingsSection title="Preview" description="Updates live as you edit. Reflects how this organisation appears across the platform.">
        <Card className="p-4.5">
          <div className="flex flex-wrap items-center gap-4">
            <OrgLogoMark
              name={draft.name}
              branding={settings.branding}
              size={56}
              fontSize={20}
              borderRadius={14}
            />
            <div className="min-w-40 flex-1">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="text-lg font-extrabold text-text">{draft.name || <span className="text-muted">Organisation name</span>}</span>
                {draft.shortName && (
                  <span className="text-[13px] font-semibold text-muted">{draft.shortName}</span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1">
                <Badge tone="accent">{draft.sport}</Badge>
                {draft.contactEmail && (
                  <span className="text-xs text-muted">{draft.contactEmail}</span>
                )}
                {draft.website && (
                  <span className="text-xs text-muted">{draft.website}</span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setCurrentPage("branding")}>
              Customise Branding →
            </Button>
          </div>
          {/* Contact completeness bar */}
          <div className="mt-3.5 flex items-center gap-3 border-t border-border pt-3.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-panel-3">
              <div
                className={cn("h-full rounded-full transition-[width]", filledCount === contactFields.length ? "bg-good" : "bg-accent")}
                style={{ width: `${Math.round((filledCount / contactFields.length) * 100)}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-xs text-muted">
              {filledCount}/{contactFields.length} contact fields filled
            </span>
          </div>
        </Card>
      </SettingsSection>

      {/* ── Organisation identity ── */}
      <SettingsSection title="Organisation Identity" description="The name and short name appear in reviews, reports, and member-facing screens.">
        <SettingsCard>
          <div className="grid grid-cols-1 gap-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <FormField label="Organisation name" required>
                <Input
                  value={draft.name}
                  onChange={e => patch("name", e.target.value)}
                  placeholder="e.g. Basketball Australia"
                />
              </FormField>
              <FormField label="Short name">
                <Input
                  value={draft.shortName}
                  onChange={e => patch("shortName", e.target.value)}
                  placeholder="e.g. BA"
                />
              </FormField>
            </div>
            <FormField label="Sport">
              <Input value="Basketball" disabled />
            </FormField>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* ── Contact details ── */}
      <SettingsSection title="Contact Details" description="Used in referee-facing communications and organisation reports.">
        <SettingsCard>
          <div className="grid grid-cols-1 gap-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <FormField label="Contact email">
                <Input
                  type="email"
                  value={draft.contactEmail}
                  onChange={e => patch("contactEmail", e.target.value)}
                  placeholder="admin@example.com"
                />
              </FormField>
              <FormField label="Phone">
                <Input
                  type="tel"
                  value={draft.phone}
                  onChange={e => patch("phone", e.target.value)}
                  placeholder="+61 2 0000 0000"
                />
              </FormField>
            </div>
            <FormField label="Website">
              <Input
                type="url"
                value={draft.website}
                onChange={e => patch("website", e.target.value)}
                placeholder="https://example.com"
              />
            </FormField>
            <FormField label="Address">
              <Textarea
                value={draft.address}
                onChange={e => patch("address", e.target.value)}
                rows={2}
                placeholder="123 Main Street, Sydney NSW 2000"
              />
            </FormField>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setCurrentPage("branding")}>
            <Palette size={13} /> Branding & Colours
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setCurrentPage("preferences")}>
            <SlidersHorizontal size={13} /> Regional Preferences
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </Button>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
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
  orgName, shortName, sport, branding,
}: {
  orgName: string;
  shortName: string;
  sport: string;
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
            {sport}
          </span>
        </div>
      </div>

      {/* Sample buttons — reuse the real Button/Badge shape metrics (buttonClasses helper)
          so this preview can't silently drift out of sync with the actual components;
          only the brand colours are dynamic, so those are still applied inline. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={buttonClasses("primary", "sm", "cursor-default border-transparent shadow-none hover:brightness-100")}
          style={{ background: pc, color: "#fff" }}
        >
          Primary action
        </button>
        <button
          className={buttonClasses("secondary", "sm", "cursor-default shadow-none hover:border-transparent")}
          style={{ background: `${sc}33`, color: sc, borderColor: `${sc}55` }}
        >
          Secondary
        </button>
        <Badge style={{ background: `${ac}22`, color: ac, borderColor: `${ac}44` }}>
          Accent badge
        </Badge>
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
        <div className="flex items-center gap-2">
          {dirty && <Button variant="ghost" size="sm" onClick={discard}>Discard</Button>}
          <Button variant="primary" size="sm" onClick={save} disabled={!dirty}>Save changes</Button>
        </div>
      }
    >
      {feedback && <FeedbackBanner {...feedback} />}

      <InfoBanner icon={<Palette size={15} />}>
          Branding is applied across the platform for your organisation — logo mark, colour palette, and badge styling.
          Changes take effect immediately after saving.
      </InfoBanner>

      {/* ── Live preview (top) ── */}
      <SettingsSection title="Preview" description="Updates live as you make changes.">
        <BrandingPreview
          orgName={settings.profile.name}
          shortName={settings.profile.shortName}
          sport={settings.profile.sport}
          branding={draft}
        />
      </SettingsSection>

      {/* ── Colour palette summary ── */}
      <SettingsSection title="Current Palette" description="Your three brand colours at a glance. Edit them in the Colours section below.">
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Primary",   color: draft.primaryColour,   valid: pcValid, usage: "Buttons, logo mark, key accents" },
            { label: "Secondary", color: draft.secondaryColour, valid: scValid, usage: "Secondary buttons, surface treatments" },
            { label: "Accent",    color: draft.accentColour,    valid: acValid, usage: "Badges, labels, tertiary highlights" },
          ].map(({ label, color, valid, usage }) => (
            <Card key={label} className="min-w-40 flex-1 p-3.5">
              <div className="mb-2 flex items-center gap-2.5">
                <div
                  className="h-8 w-8 shrink-0 rounded-lg border-[1.5px]"
                  style={{ background: valid ? color : "var(--panel-3)", borderColor: valid ? `${color}66` : "var(--border)" }}
                />
                <div>
                  <p className="text-[13px] font-bold text-text">{label}</p>
                  <code className={cn("font-mono text-[11px]", valid ? "text-text" : "text-red-400")}>
                    {color || "—"}
                  </code>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">{usage}</p>
            </Card>
          ))}
        </div>
      </SettingsSection>

      {/* ── Logo ── */}
      <SettingsSection title="Logo" description="Provide a publicly accessible logo URL, or set a short text fallback. The logo mark is shown in headers, dashboards, and reports.">
        <SettingsCard>
          <div className="grid grid-cols-1 gap-3.5">
            <div className="flex items-start gap-4">
              <OrgLogoMark
                name={settings.profile.name}
                branding={draft}
                size={56}
                fontSize={20}
                borderRadius={14}
              />
              <FormField label="Logo URL" hint="Must be a publicly accessible image URL (PNG, SVG, or WebP recommended)." className="flex-1">
                <Input
                  type="url"
                  value={draft.logoUrl ?? ""}
                  onChange={e => patch("logoUrl", e.target.value || null)}
                  placeholder="https://example.com/logo.png"
                />
              </FormField>
            </div>
            <FormField label="Placeholder text" hint="Shown when no logo URL is set. Defaults to your organisation's initials (up to 3 characters).">
              <Input
                className="max-w-[120px]"
                value={draft.logoText}
                onChange={e => patch("logoText", e.target.value)}
                placeholder="e.g. RCA"
                maxLength={3}
              />
            </FormField>
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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setCurrentPage("profile")}>
            <User size={13} /> Organisation Profile
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </Button>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

// ── Toggle component ─────────────────────────────────────────────────────────

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

      <InfoBanner icon={<Film size={15} />}>
          These are <strong className="text-blue-200">saved defaults</strong> — they pre-fill settings when a new review is created, but can be overridden per review.
          Tagging field requirements are enforced in the review coding tool.
          Auto-publish and notification preferences are saved and will take effect when the notification service is connected.
      </InfoBanner>

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

      <InfoBanner icon={<BookOpen size={15} />}>
          These are <strong className="text-blue-200">saved defaults</strong> — they pre-fill settings when an educator assigns learning, but can be overridden per assignment.
          {draft.enableCertificates && " Certificate generation is not yet active; your preference is saved and will take effect when the feature launches."}
      </InfoBanner>

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
            <Layers size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
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

      <InfoBanner icon={<Bell size={15} />}>
          Preferences are saved now and will take effect when the notification delivery service is connected.
          No emails or in-app alerts are currently sent, but your configuration will be ready.
      </InfoBanner>

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

      <InfoBanner icon={<Shield size={15} />}>
          Only{" "}
          <button className="cursor-pointer underline" onClick={() => setCurrentPage("roles")}>Admins and Super Admins</button>
          {" "}can change security settings.{" "}
          {adminCount > 0
            ? `${adminCount} admin${adminCount !== 1 ? "s" : ""} in your organisation.`
            : "No admins are currently assigned."}
          {!isSuperAdmin && " Some role assignments require a Super Admin."}
      </InfoBanner>

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
                {chip.future && <StatusBadge status="coming-soon" />}
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
              <StatusBadge status="coming-soon" />
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
              <StatusBadge status="coming-soon" />
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
              <StatusBadge status="coming-soon" />
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

const ROLE_LABEL: Record<string, string> = {
  referee: "Referee", educator: "Educator",
  admin: "Administrator", super_admin: "Super Admin", viewer: "Viewer",
};

// Role badge tone derived from the single shared ROLE_TONE map (lib/utils/roleTone.ts)
// so a member's role renders with the same colour on every settings tab.
function roleBadgeTone(role: string): BadgeTone {
  const tone = ROLE_TONE[role] ?? ROLE_TONE.viewer;
  if (tone === ROLE_TONE.referee) return "good";
  if (tone === ROLE_TONE.educator) return "accent";
  if (tone === ROLE_TONE.admin) return "accent";
  return "neutral";
}

function MembersPage({ members, org, onNavigateMembers, setCurrentPage }: PageCtx) {
  const [query, setQuery] = useState("");

  const refereeCount    = members.filter(m => m.role === "referee").length;
  const educatorCount   = members.filter(m => m.role === "educator").length;
  const adminCount      = members.filter(m => m.role === "admin").length;
  const superAdminCount = members.filter(m => m.role === "super_admin").length;

  const roleCounts = [
    { label: "Total",        count: members.length },
    { label: "Referees",     count: refereeCount },
    { label: "Educators",    count: educatorCount },
    { label: "Admins",       count: adminCount },
    { label: "Super Admins", count: superAdminCount },
  ];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? members.filter(m =>
        (m.name || "").toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (ROLE_LABEL[m.role] || "").toLowerCase().includes(q)
      )
    : members;

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Members"
      description="Overview of users in your organisation. Full member management is available in the Admin Dashboard."
      actions={
        <Button variant="primary" size="sm" className="gap-1.5" onClick={onNavigateMembers}>
          <Users size={14} /> Member Management
        </Button>
      }
    >

      {/* ── Role Breakdown ── */}
      <SettingsSection title="Role Breakdown">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {roleCounts.map(({ label, count }) => (
            <SummaryTile key={label} label={label} value={count} />
          ))}
        </div>
      </SettingsSection>

      {/* ── Member List ── */}
      <SettingsSection
        title="Member List"
        description={`${members.length} member${members.length !== 1 ? "s" : ""} in ${org?.name ?? "this organisation"}`}
      >
        {members.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="No members yet"
            description="Use Member Management to send invitations and manage user roles."
          />
        ) : (
          <>
            {/* Search */}
            <div className="mb-2.5 flex items-center gap-3">
              <div className="relative max-w-[360px] flex-1">
                <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, email, or role…"
                  className="pl-7 text-sm"
                />
              </div>
              <span className="whitespace-nowrap text-xs text-muted">
                {q ? `${filtered.length} of ${members.length}` : `${members.length} member${members.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted">No members match your search.</p>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(m => {
                    const tone = ROLE_TONE[m.role] ?? ROLE_TONE.viewer;
                    return (
                      <TableRow key={m.id}>
                        <TableCell data-label="Name">
                          <div className="flex items-center gap-2">
                            <div className={cn("flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full border text-[10px] font-extrabold", tone.bg, tone.border, tone.text)}>
                              {(m.name || m.email).slice(0, 1).toUpperCase()}
                            </div>
                            <span className="max-w-[200px] truncate font-semibold">{m.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell data-label="Email" className="max-w-[240px] truncate text-muted">{m.email}</TableCell>
                        <TableCell data-label="Role">
                          <Badge tone={roleBadgeTone(m.role)}>{ROLE_LABEL[m.role] ?? m.role}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </SettingsSection>

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={onNavigateMembers}>
            <Users size={13} /> Member Management
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setCurrentPage("roles")}>
            <Key size={13} /> Roles & Permissions
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setCurrentPage("security")}>
            <Shield size={13} /> Security
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </Button>
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
  tagline: string;
  description: string;
  capabilities: string[];
}[] = [
  {
    role: "super_admin",
    label: "Super Admin",
    tagline: "Full platform ownership",
    description: "Unrestricted access to every feature, setting, and data point in the platform. Typically the organisation owner or technical administrator.",
    capabilities: ["All admin capabilities", "Assign and revoke any role including Admin", "Override per-user permissions", "Manage organisation billing and branding"],
  },
  {
    role: "admin",
    label: "Administrator",
    tagline: "Manages people, access, and settings",
    description: "Has full control over organisation management: invite members, assign educator and referee roles, configure settings, and access all analytics and tools.",
    capabilities: ["Invite and remove members", "Assign Referee and Educator roles", "Manage groups and assignments", "Configure organisation settings and learning defaults", "Access all reviews and analytics"],
  },
  {
    role: "educator",
    label: "Educator",
    tagline: "Creates reviews and develops referees",
    description: "Coaches and develops referees through reviews, learning assignments, and group management. Cannot manage other users or change organisation settings.",
    capabilities: ["Create and assign video reviews", "Manage the clip library and playlists", "Create and manage referee groups", "Create and track learning assignments", "View analytics for their referees"],
  },
  {
    role: "referee",
    label: "Referee",
    tagline: "Views reviews and completes learning",
    description: "Access is limited to their own data. Can view reviews assigned to them and complete learning tasks set by educators.",
    capabilities: ["View their own reviews", "Complete assigned learning tasks", "Track their personal development goals"],
  },
  {
    role: "viewer",
    label: "Viewer",
    tagline: "Read-only observer",
    description: "No active permissions by default. Viewer accounts can be granted specific access via per-user permission overrides in Members.",
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
  const accordionBaseId = useId();

  return (
    <SettingsPage eyebrow="Organisation" title="Roles & Permissions" description="Understand what each role can see and do, and how many members hold each role in your organisation.">

      <InfoBanner icon={<Shield size={15} />}>
        Roles define what each user can see and do by default.
        Individual permissions can be customised further in{" "}
        <button className="cursor-pointer underline" onClick={() => setCurrentPage("members")}>
          Members
        </button>
        .
        {!isSuperAdmin && " Only Super Admins can assign Admin or Super Admin roles."}
      </InfoBanner>

      {/* ── Role cards ── */}
      <SettingsSection title="Role Definitions" description="Expand a role to see what it covers and who holds it.">
        <div className="grid grid-cols-1 gap-2.5">
          {ROLE_META.map(({ role, label, tagline, description, capabilities }) => {
            const tone = ROLE_TONE[role] ?? ROLE_TONE.viewer;
            const count = countByRole[role];
            const isExpanded = expandedRole === role;
            const membersWithRole = members.filter(m => m.role === role);
            const panelId = `${accordionBaseId}-${role}`;

            return (
              <Card key={role} className={cn("overflow-hidden border-l-[3px] p-0", tone.border)}>
                {/* Header row — always visible */}
                <button
                  onClick={() => setExpandedRole(isExpanded ? null : role)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-3.5 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-[15px] font-extrabold text-text">{label}</span>
                      <Badge tone={roleBadgeTone(role)}>{count} member{count !== 1 ? "s" : ""}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">{tagline}</p>
                  </div>
                  <span aria-hidden="true" className="shrink-0 text-lg leading-none text-muted">
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div id={panelId} className="border-t border-border px-5 pb-5">
                    <p className="mb-2.5 mt-3.5 text-[13px] leading-relaxed text-muted">{description}</p>

                    {/* Capabilities */}
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                        Default capabilities
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {capabilities.map(cap => (
                          <div key={cap} className="flex items-start gap-2 text-[13px]">
                            <span className={cn("mt-0.5 shrink-0 text-sm leading-none", tone.text)}>✓</span>
                            <span>{cap}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Permission count from ROLE_DEFAULT_PERMISSIONS */}
                    {role !== "viewer" && (
                      <p className="mb-3.5 text-xs text-muted">
                        {ROLE_DEFAULT_PERMISSIONS[role].length} of {Object.values(ROLE_DEFAULT_PERMISSIONS).reduce((max, perms) => Math.max(max, perms.length), 0)} permissions granted by default
                      </p>
                    )}

                    {/* Members with this role */}
                    {membersWithRole.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                          Members ({membersWithRole.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {membersWithRole.slice(0, 12).map(m => (
                            <div key={m.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-panel-2 px-2.5 py-1.5 text-xs font-semibold">
                              <div className={cn("flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border text-[9px] font-black", tone.bg, tone.border, tone.text)}>
                                {m.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?"}
                              </div>
                              {m.name}
                            </div>
                          ))}
                          {membersWithRole.length > 12 && (
                            <div className="rounded-lg border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-muted">
                              +{membersWithRole.length - 12} more
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted">No members currently hold this role.</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </SettingsSection>

      {/* ── Permission summary table ── */}
      <SettingsSection title="Permission Matrix" description="Default permissions granted per role. Individual overrides can be set in Members.">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Permission Area</TableHeaderCell>
              {(["referee", "educator", "admin", "super_admin"] as Role[]).map(r => {
                const meta = ROLE_META.find(m => m.role === r)!;
                return (
                  <TableHeaderCell key={r} className="text-center">
                    <Badge tone={roleBadgeTone(r)}>{meta.label}</Badge>
                  </TableHeaderCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {PERMISSION_GROUPS.map(group => (
              group.permissions.map((perm, pi) => {
                const isFirstInGroup = pi === 0;
                return (
                  <TableRow key={perm.key}>
                    <TableCell data-label="Permission Area">
                      {isFirstInGroup && (
                        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-muted">
                          {group.label}
                        </span>
                      )}
                      {perm.label}
                    </TableCell>
                    {(["referee", "educator", "admin", "super_admin"] as Role[]).map(r => {
                      const has = ROLE_DEFAULT_PERMISSIONS[r].includes(perm.key);
                      const tone = ROLE_TONE[r] ?? ROLE_TONE.viewer;
                      return (
                        <TableCell key={r} data-label={ROLE_META.find(m => m.role === r)!.label} className="text-center">
                          {has ? (
                            <span className={cn("text-base leading-none", tone.text)}>✓</span>
                          ) : (
                            <span className="text-sm leading-none text-border">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ))}
          </TableBody>
        </Table>
        <p className="mt-2.5 text-xs text-muted">
          Viewer role has no default permissions. Individual overrides are managed in{" "}
          <button className="cursor-pointer underline" onClick={() => setCurrentPage("members")}>
            Members
          </button>
          .
        </p>
      </SettingsSection>

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setCurrentPage("members")}>
            <Users size={13} /> Manage Members
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setCurrentPage("security")}>
            <Shield size={13} /> Security Settings
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage("dashboard")}>
            ← Dashboard
          </Button>
        </div>
      </SettingsSection>

    </SettingsPage>
  );
}

function ResourcesPage({ settings, onUpdateSettings, setCurrentPage }: PageCtx) {
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

  const visibilityLabel: Record<string, string> = {
    "all-members":    "All members",
    "assigned-only":  "Assigned referees",
    "educators-only": "Educators only",
  };

  // ── Live summary chips ────────────────────────────────────────────────────────
  const summaryItems: { label: string; value: string; active?: boolean }[] = [
    { label: "Resources",       value: draft.enableLearningResources ? "Enabled" : "Disabled",              active: draft.enableLearningResources },
    { label: "External links",  value: draft.allowExternalResourceLinks ? "Allowed" : "Blocked",             active: draft.allowExternalResourceLinks },
    { label: "Document upload", value: draft.allowDocumentResources ? "Allowed" : "Blocked",                 active: draft.allowDocumentResources },
    { label: "Visibility",      value: visibilityLabel[draft.defaultResourceVisibility] ?? draft.defaultResourceVisibility, active: true },
    { label: "Referee access",  value: draft.showResourcesToReferees ? "Can browse" : "Hidden",              active: draft.showResourcesToReferees },
    { label: "Approval",        value: draft.resourceReviewRequired ? "Required" : "Not required",           active: draft.resourceReviewRequired },
  ];

  const resourceFormats: {
    label: string;
    description: string;
    available: boolean;
    icon: ReactNode;
  }[] = [
    { label: "External video links",  description: "YouTube, Hudl, GloryLeague, and other video URLs",                  available: true,  icon: <Film size={15} /> },
    { label: "External article links",description: "Links to officiating guides, rules documents, and web resources",   available: true,  icon: <Globe size={15} /> },
    { label: "PDF documents",         description: "Rulebooks, officiating guides, and reference materials",             available: false, icon: <FolderOpen size={15} /> },
    { label: "DOCX documents",        description: "Word documents and written case studies",                            available: false, icon: <FolderOpen size={15} /> },
    { label: "PPTX presentations",    description: "Slide decks and visual training materials",                          available: false, icon: <FolderOpen size={15} /> },
    { label: "XLSX spreadsheets",     description: "Statistics, schedules, and structured data",                         available: false, icon: <FolderOpen size={15} /> },
  ];

  return (
    <SettingsPage
      eyebrow="Organisation"
      title="Resources"
      description="Control how learning resources are shared with referees across your organisation."
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

      <InfoBanner icon={<FolderOpen size={15} />}>
          External video and article links are <strong className="text-blue-200">available now</strong>.
          Document upload (PDF, DOCX, PPTX, XLSX) is coming — enabling it here saves your preference and will take effect when document hosting launches.
      </InfoBanner>

      {/* ── Current Configuration ── */}
      <SettingsSection title="Current Configuration" description="A live snapshot of your saved resource settings.">
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

      {/* ── Resource Availability ── */}
      <SettingsSection title="Resource Availability" description="Master switch for resource functionality across the organisation.">
        <SettingsCard>
          <ToggleRow
            label="Enable learning resources"
            description="Allow educators to attach resources to assignments and make them available to referees."
            checked={draft.enableLearningResources}
            onChange={v => patch("enableLearningResources", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Allowed Resource Types ── */}
      <SettingsSection title="Allowed Resource Types" description="Control which resource types educators can attach to learning assignments.">
        <SettingsCard>
          <ToggleRow
            label="External resource links"
            description="Educators can link to external videos (YouTube, Hudl), articles, and web-based reference materials."
            checked={draft.allowExternalResourceLinks}
            onChange={v => patch("allowExternalResourceLinks", v)}
          />
          <ToggleRow
            label="Document uploads"
            description="Educators can attach document files (PDF, DOCX, PPTX, XLSX). Requires document hosting — your preference is saved for when it launches."
            checked={draft.allowDocumentResources}
            onChange={v => patch("allowDocumentResources", v)}
            last
            badge={<StatusBadge status="coming-soon" />}
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Visibility & Access ── */}
      <SettingsSection title="Visibility & Access" description="Control who can see resources and whether referees can browse them independently.">
        <SettingsCard>
          <SettingsRow
            label="Default resource visibility"
            description="Who can access resources in this organisation. Educators can override this per resource."
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
            description="Referees can browse available resources from their learning area, not just from assigned assignments."
            checked={draft.showResourcesToReferees}
            onChange={v => patch("showResourcesToReferees", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Review & Approval ── */}
      <SettingsSection title="Review & Approval" description="Control whether new resources need admin approval before referees can access them.">
        <SettingsCard>
          <ToggleRow
            label="Require resource approval"
            description="Resources added by educators must be reviewed and approved by an admin before referees can see them."
            checked={draft.resourceReviewRequired}
            onChange={v => patch("resourceReviewRequired", v)}
            last
          />
        </SettingsCard>
      </SettingsSection>

      {/* ── Supported Formats ── */}
      <SettingsSection title="Supported Formats" description="Resource formats currently available and coming soon in RefCoach.">
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          {resourceFormats.map((rf, i) => {
            const isLast = i === resourceFormats.length - 1;
            return (
              <div key={rf.label} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "13px 18px",
                borderBottom: isLast ? "none" : "1px solid var(--border)",
                opacity: rf.available ? 1 : 0.55,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: rf.available ? "rgba(10,132,255,.1)" : "var(--panel2)",
                  border: `1px solid ${rf.available ? "rgba(10,132,255,.25)" : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: rf.available ? "#6fb8ff" : "var(--muted)",
                }}>
                  {rf.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{rf.label}</p>
                  <p className="hint" style={{ margin: "2px 0 0", fontSize: 12 }}>{rf.description}</p>
                </div>
                {rf.available ? (
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 700,
                    padding: "2px 9px", borderRadius: 20,
                    background: "rgba(52,199,89,.12)", border: "1px solid rgba(52,199,89,.3)",
                    color: "#34c759", textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    Available
                  </span>
                ) : (
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 700,
                    padding: "2px 9px", borderRadius: 20,
                    background: "var(--panel3)", border: "1px solid var(--border)",
                    color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    Coming soon
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>

      {/* ── Related ── */}
      <SettingsSection title="Related">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("learning")}>
            <BookOpen size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
            Learning Defaults
          </button>
          <button style={{ fontSize: 12 }} onClick={() => setCurrentPage("groups")}>
            <Layers size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
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
      <InfoBanner icon={<CreditCard size={15} />}>
          Billing and subscription management is coming to RefCoach. Your account details and usage are shown below.
          To discuss your plan or request changes, contact the RefCoach team directly.
      </InfoBanner>

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
