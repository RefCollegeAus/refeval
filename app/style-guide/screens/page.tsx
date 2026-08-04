"use client";

// Internal, unlinked diagnostic page — Phase 3 (High-Traffic Screen
// Modernisation) and Phase 4 (Referee Development Experience) verification.
// Renders the migrated screens against deterministic local fixtures, since
// no live Supabase role credentials were available for either phase (see
// the Phase 3/4 deliverables reports). EducatorDashboard, OrganisationScreen,
// MyLearningScreen, RefereeReviewScreen, RefereeGoalsScreen,
// RefereeDevelopmentScreen and RefereeCommentsScreen are all rendered as the
// real, unmodified production components. The Referee Home screen is NOT a
// standalone component — it's inline JSX inside app/page.tsx's "referee"
// screen branch — so its markup is intentionally duplicated below,
// fed by fixtures, for visual verification only. Any real change to that
// screen must still be made in app/page.tsx; this fixture is not a second
// source of truth for its logic.
//
// RefereeCommentsScreen fetches its own comment threads from Supabase (no
// prop injection for thread data), so its fixture below only verifies the
// header/filter chrome and empty state deterministically — not a populated
// thread list.

import { useState } from "react";
import { Inbox, Eye, BarChart3, Target, MessageSquare, BookOpen } from "lucide-react";
import { EducatorDashboard } from "@/components/educator/EducatorDashboard";
import { OrganisationScreen } from "@/components/organisation/OrganisationScreen";
import { RefereeDevelopmentScreen } from "@/components/educator/RefereeDevelopmentScreen";
import { MyLearningScreen } from "@/components/referee/MyLearningScreen";
import { RefereeReviewScreen } from "@/components/referee/RefereeReviewScreen";
import { RefereeGoalsScreen } from "@/components/referee/RefereeGoalsScreen";
import { RefereeCommentsScreen } from "@/components/referee/RefereeCommentsScreen";
import { GroupsScreen } from "@/components/educator/GroupsScreen";
import { NotificationCentre } from "@/components/NotificationCentre";
import { MembersScreen } from "@/components/admin/MembersScreen";
import { AssignmentsScreen } from "@/components/admin/AssignmentsScreen";
import { AssignmentDetailScreen } from "@/components/admin/AssignmentDetailScreen";
import { CommentInbox } from "@/components/educator/CommentInbox";
import { TeamManagementScreen } from "@/components/admin/TeamManagementScreen";
import { UserProfileScreen } from "@/components/admin/UserProfileScreen";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { makeAnalytics } from "@/lib/utils/analytics";
import { makeDefaultSettings } from "@/lib/types/organisationSettings";
import type { RefEvalSession } from "@/lib/types/auth";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import type { Assignment } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import type { RefereeGoalView, DevGoalDef } from "@/lib/types/developmentGoals";
import type { DevelopmentNote } from "@/lib/types/developmentNotes";
import type { ReviewGoalLink, ClipGoalLink } from "@/lib/types/reviewGoalLinks";
import type { Group } from "@/lib/types/groups";
import type { OrganisationRecord } from "@/lib/types/organisations";
import type { Notification, NotificationPreferences } from "@/lib/types/notifications";
import { PERMISSION_GROUPS } from "@/lib/types/permissions";
import { defaultPermsForRole } from "@/lib/utils/permissions";

const ORG_ID = "org-demo";

const SESSION_EDUCATOR: RefEvalSession = {
  user: { id: "user-jamie", email: "jamie@refereecollegeofaustralia.com.au" },
  profile: { id: "user-jamie", email: "jamie@refereecollegeofaustralia.com.au", name: "Jamie Smith" },
  memberships: [{ organisationId: ORG_ID, organisationName: "Demo Basketball Association", role: "educator" }],
  activeOrganisation: { id: ORG_ID, name: "Demo Basketball Association" },
  activeRole: "educator",
};

const SESSION_ADMIN: RefEvalSession = {
  ...SESSION_EDUCATOR,
  activeRole: "admin",
};

const SESSION_REFEREE: RefEvalSession = {
  user: { id: "user-alex", email: "alex@refereecollegeofaustralia.com.au" },
  profile: { id: "user-alex", email: "alex@refereecollegeofaustralia.com.au", name: "Alex Referee" },
  memberships: [{ organisationId: ORG_ID, organisationName: "Demo Basketball Association", role: "referee" }],
  activeOrganisation: { id: ORG_ID, name: "Demo Basketball Association" },
  activeRole: "referee",
};

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

const REVIEWS: ReviewRecord[] = [
  {
    id: "rev-1", organisationId: ORG_ID, game: "Tigers vs Hawks", educatorId: "user-jamie", educatorName: "Jamie Smith",
    referee1Id: "user-alex", referee2Id: "", referee3Id: "", referee1Name: "Alex Referee", referee2Name: "", referee3Name: "",
    videoLink: "", timestampOffset: -10, status: "In Review", gameDate: daysAgo(20).slice(0, 10), createdAt: daysAgo(20),
  },
  {
    id: "rev-2", organisationId: ORG_ID, game: "Eagles vs Wolves", educatorId: "user-jamie", educatorName: "Jamie Smith",
    referee1Id: "user-alex", referee2Id: "", referee3Id: "", referee1Name: "Alex Referee", referee2Name: "", referee3Name: "",
    videoLink: "", timestampOffset: -10, status: "Completed", gameDate: daysAgo(5).slice(0, 10), createdAt: daysAgo(6), submittedAt: daysAgo(5),
  },
  {
    id: "rev-3", organisationId: ORG_ID, game: "Storm vs Bolts", educatorId: "user-jamie", educatorName: "Jamie Smith",
    referee1Id: "user-sam", referee2Id: "", referee3Id: "", referee1Name: "Sam Official", referee2Name: "", referee3Name: "",
    videoLink: "", timestampOffset: -10, status: "In Review", gameDate: daysAgo(1).slice(0, 10), createdAt: daysAgo(1),
  },
];

const TAGS: CodedTag[] = [
  { id: "tag-1", reviewId: "rev-2", organisationId: ORG_ID, time: "01:20", seconds: 80, adjustedSeconds: 70, adjustedTime: "01:10", mode: "video", refereeTarget: "Referee 1", extraReviewOfficials: [], clipOfficials: [], outcome: "Correct Call", category: "Foul", position: "Trail", coverage: "Primary", createdAt: daysAgo(5) },
  { id: "tag-2", reviewId: "rev-2", organisationId: ORG_ID, time: "04:02", seconds: 242, adjustedSeconds: 232, adjustedTime: "03:52", mode: "video", refereeTarget: "Referee 1", extraReviewOfficials: [], clipOfficials: [], outcome: "Incorrect No Call", category: "Travel", position: "Lead", coverage: "Secondary", createdAt: daysAgo(5) },
];

const PLAYLISTS: Playlist[] = [
  {
    id: "pl-1", organisationId: ORG_ID, title: "Positioning fundamentals", description: null,
    createdBy: "user-jamie", createdAt: daysAgo(10), updatedAt: daysAgo(10), archivedAt: null,
    items: [
      { id: "pi-1", playlistId: "pl-1", reviewId: "rev-2", tagId: "tag-1", position: 0, createdAt: daysAgo(10), creatorNote: null },
      { id: "pi-2", playlistId: "pl-1", reviewId: "rev-2", tagId: "tag-2", position: 1, createdAt: daysAgo(10), creatorNote: null },
    ],
  },
];

const ASSIGNMENTS: Assignment[] = [
  {
    id: "assign-1", organisationId: ORG_ID, playlistId: "pl-1", simulatorSessionId: null, assignedBy: "user-jamie",
    title: "Positioning fundamentals", instructions: "Review the two clips below and note where your trail position could be tighter.", dueDate: daysAgo(-3).slice(0, 10), required: true, quizAllowRetakes: true,
    createdAt: daysAgo(10), questions: [{ id: "q-1", text: "What would you do differently?", required: true, displayOrder: 0 }], quizQuestions: [],
    assignmentUsers: [
      { id: "au-1", assignmentId: "assign-1", userId: "user-alex", status: "Started", assignedAt: daysAgo(10), startedAt: daysAgo(3), completedAt: null, watchedClipIds: ["tag-1"], reflectionResponses: null, reflectionSubmittedAt: null, quizAnswers: null, quizScore: null, quizTotal: null, quizSubmittedAt: null, quizAttemptCount: 0 },
    ],
  },
  {
    id: "assign-2", organisationId: ORG_ID, playlistId: null, simulatorSessionId: null, assignedBy: "user-jamie",
    title: "Rules refresher quiz", instructions: null, dueDate: daysAgo(20).slice(0, 10), required: false, quizAllowRetakes: true,
    createdAt: daysAgo(25), questions: [], quizQuestions: [{ id: "qq-1", prompt: "A defender maintains legal guarding position when they:", answers: ["Are moving laterally", "Have both feet planted before contact", "Are outside the restricted area", "Have their arms raised"], correctAnswerIndex: 1, required: true, displayOrder: 0 }],
    assignmentUsers: [
      { id: "au-2", assignmentId: "assign-2", userId: "user-alex", status: "Completed", assignedAt: daysAgo(25), startedAt: daysAgo(22), completedAt: daysAgo(21), watchedClipIds: [], reflectionResponses: null, reflectionSubmittedAt: null, quizAnswers: [{ questionId: "qq-1", selectedAnswerIndex: 1 }], quizScore: 8, quizTotal: 10, quizSubmittedAt: daysAgo(21), quizAttemptCount: 1 },
    ],
  },
];

const MEMBERS: MemberRecord[] = [
  { id: "user-alex", name: "Alex Referee", email: "alex@refereecollegeofaustralia.com.au", role: "referee", organisationId: ORG_ID },
  { id: "user-sam", name: "Sam Official", email: "sam@refereecollegeofaustralia.com.au", role: "referee", organisationId: ORG_ID },
  { id: "user-jamie", name: "Jamie Smith", email: "jamie@refereecollegeofaustralia.com.au", role: "educator", organisationId: ORG_ID },
  { id: "user-admin", name: "Morgan Admin", email: "morgan@refereecollegeofaustralia.com.au", role: "admin", organisationId: ORG_ID },
];

const GOALS: RefereeGoalView[] = [
  {
    id: "goal-1", goalId: "def-1", refereeId: "user-alex", organisationId: ORG_ID, status: "Active", notes: "",
    targetReviewDate: daysAgo(-2).slice(0, 10), createdAt: daysAgo(15), updatedAt: daysAgo(15), completedAt: null, archivedAt: null,
    title: "Improve trail positioning", description: "Focus on staying wide on transition.", category: "Positioning", priority: "High",
  },
];

const GROUPS: Group[] = [
  { id: "grp-1", organisationId: ORG_ID, name: "Junior Development", description: "First-year referees", colour: "#3b82f6", createdAt: daysAgo(30), updatedAt: daysAgo(30), members: [{ id: "gm-1", groupId: "grp-1", userId: "user-alex", createdAt: daysAgo(30) }] },
];

const DEV_GOAL_DEFS: DevGoalDef[] = [
  {
    id: "def-1", organisationId: ORG_ID, title: "Improve trail positioning", description: "Focus on staying wide on transition.",
    category: "Positioning", priority: "High", createdBy: "user-jamie", createdAt: daysAgo(15), updatedAt: daysAgo(15),
  },
];

const DEV_NOTES: DevelopmentNote[] = [
  {
    id: "note-1", refereeId: "user-alex", organisationId: ORG_ID, title: "Great trail work last game",
    body: "Noticed much tighter trail positioning in the second half — keep it up.", noteType: "Sideline Feedback",
    visibility: "Visible to Referee", createdBy: "user-jamie", createdAt: daysAgo(4), updatedAt: daysAgo(4), linkedGoalId: "def-1",
  },
  {
    id: "note-2", refereeId: "user-alex", organisationId: ORG_ID, title: "Self-reflection — Round 7",
    body: "I felt rushed on the transition call in the third quarter, want to work on anticipation.", noteType: "General",
    visibility: "Visible to Referee", createdBy: "user-alex", createdAt: daysAgo(2), updatedAt: daysAgo(2), linkedGoalId: null,
  },
];

const REVIEW_GOAL_LINKS: ReviewGoalLink[] = [
  { id: "rgl-1", organisationId: ORG_ID, reviewId: "rev-2", goalDefId: "def-1", refereeId: "user-alex", linkedAt: daysAgo(5), linkedBy: "user-jamie", createdGoalFromReview: false },
];

const CLIP_GOAL_LINKS: ClipGoalLink[] = [
  { id: "cgl-1", organisationId: ORG_ID, clipId: "tag-1", reviewId: "rev-2", goalDefId: "def-1", refereeId: "user-alex" },
];

const ORG: OrganisationRecord = { id: ORG_ID, name: "Demo Basketball Association", createdAt: daysAgo(200), timezone: "Australia/Sydney", brandColour: "#a56a1b", logoUrl: null };

const ORG_SETTINGS = makeDefaultSettings("Demo Basketball Association");

const NOTIFICATIONS: Notification[] = [
  {
    id: "ntf-1", organisationId: ORG_ID, userId: "user-jamie", type: "review_completed",
    title: "Review completed", message: "Eagles vs Wolves has been submitted with 2 clips tagged.",
    relatedEntityType: "review", relatedEntityId: "rev-2", createdAt: daysAgo(1), createdBy: "user-alex",
    isRead: false, readAt: null, priority: "normal", actionLabel: "View review", actionRoute: "referee", metadata: null,
  },
  {
    id: "ntf-2", organisationId: ORG_ID, userId: "user-jamie", type: "assignment_overdue",
    title: "Assignment overdue", message: "Alex Referee's \"Foul Recognition\" module is 3 days overdue.",
    relatedEntityType: "assignment", relatedEntityId: "asg-1", createdAt: daysAgo(3), createdBy: null,
    isRead: false, readAt: null, priority: "high", actionLabel: "View assignment", actionRoute: "assignments", metadata: null,
  },
  {
    id: "ntf-3", organisationId: ORG_ID, userId: "user-jamie", type: "goal_updated",
    title: "Goal completed", message: "Alex Referee marked \"Improve trail positioning\" as complete.",
    relatedEntityType: "development_goal", relatedEntityId: "def-1", createdAt: daysAgo(6), createdBy: "user-alex",
    isRead: true, readAt: daysAgo(5), priority: "normal", actionLabel: null, actionRoute: null, metadata: null,
  },
];

const NOTIFICATION_PREFS: NotificationPreferences = {
  userId: "user-jamie", inAppEnabled: true, reviewNotifications: true, assignmentNotifications: true,
  learningNotifications: true, developmentGoalNotifications: true, organisationNotifications: true, systemNotifications: false,
};

const PERMISSION_MAP = new Map<string, Set<string>>([
  ["user-jamie", new Set(Array.from(defaultPermsForRole("educator")).filter(k => k !== "groups.delete"))],
]);

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-10">
      <div className="mx-auto mb-4 max-w-5xl px-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function ScreenFixturesPage() {
  const [onboardingDismissed] = useState(true);

  // ── Referee Home fixture (duplicated JSX — see file header note) ──────────
  const session = SESSION_REFEREE;
  const allMyReviews = REVIEWS.filter(r => r.referee1Id === session.user.id || r.referee2Id === session.user.id || r.referee3Id === session.user.id).filter(r => r.status === "Completed");
  const myReviews = allMyReviews;
  const sidebarTags = TAGS.filter(t => allMyReviews.some(r => r.id === t.reviewId));
  const sidebarAnalytics = makeAnalytics(sidebarTags);
  const totalUnreadComments = 2;
  const pendingLearningCount = 1;
  const myGoals = GOALS;
  const barGroup = (label: string, counts: [string, number][]) => {
    if (counts.length === 0) return null;
    const max = Math.max(...counts.map(([, c]) => c), 1);
    return (
      <Card key={label} className="p-3.5">
        <h3 className="ed-section-title mb-2">{label}</h3>
        <div className="grid gap-1.5">
          {counts.map(([n, c]) => (
            <div key={n} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 truncate text-text">{n}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-panel-3">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((c / max) * 100)}%` }} />
              </div>
              <strong className="w-6 shrink-0 text-right text-text">{c}</strong>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <main className="grid grid-cols-1 gap-10 overflow-x-hidden pb-16">
      <header className="mx-auto max-w-5xl px-4 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Referee College Design System — Phase 3
        </p>
        <h1 className="text-2xl font-bold text-text">Core dashboards — fixture verification</h1>
        <p className="mt-1 text-sm text-muted">
          Educator Dashboard and Organisation Dashboard render the real, unmodified production
          components against local fixtures. The Referee Home section below duplicates the JSX from
          app/page.tsx's &quot;referee&quot; screen branch for visual verification only (see file header).
        </p>
      </header>

      <Section title="Educator Dashboard" description='screen === "educator" → components/educator/EducatorDashboard.tsx'>
        <div className="rounded-2xl border border-border p-4 sm:p-6 lg:p-8">
          <EducatorDashboard
            session={SESSION_EDUCATOR}
            reviews={REVIEWS}
            tags={TAGS}
            playlists={[]}
            assignments={ASSIGNMENTS}
            refereeMembers={MEMBERS.filter(m => m.role === "referee")}
            allRefereeGoalViews={GOALS}
            totalUnread={2}
            startNewReview={() => {}}
            openReviewForEdit={() => {}}
            deleteReview={() => {}}
            setScreen={() => {}}
            onNavigateDevelopment={() => {}}
            onboardingDismissed={onboardingDismissed}
            dismissOnboarding={() => {}}
          />
        </div>
      </Section>

      <Section title="Educator Dashboard — empty state" description="Zero reviews, zero follow-ups, zero activity.">
        <div className="rounded-2xl border border-border p-4 sm:p-6 lg:p-8">
          <EducatorDashboard
            session={SESSION_ADMIN}
            reviews={[]}
            tags={[]}
            playlists={[]}
            assignments={[]}
            refereeMembers={[]}
            allRefereeGoalViews={[]}
            totalUnread={0}
            startNewReview={() => {}}
            openReviewForEdit={() => {}}
            deleteReview={() => {}}
            setScreen={() => {}}
            onNavigateDevelopment={() => {}}
            onboardingDismissed
            dismissOnboarding={() => {}}
          />
        </div>
      </Section>

      <Section title="Organisation Dashboard / Overview" description='screen === "organisation" → OrganisationScreen.tsx, DashboardPage sub-page (default)'>
        <div className="rounded-2xl border border-border">
          <OrganisationScreen
            session={SESSION_ADMIN}
            org={ORG}
            members={MEMBERS}
            reviews={REVIEWS}
            assignments={ASSIGNMENTS}
            settings={ORG_SETTINGS}
            onUpdateSettings={() => {}}
            onBack={() => {}}
            currentPage="dashboard"
            setCurrentPage={() => {}}
            onNavigateMembers={() => {}}
            groupCount={GROUPS.length}
            activeGoalCount={GOALS.filter(g => g.status === "Active").length}
            groups={GROUPS}
            canCreateGroups
            canEditGroups
            canDeleteGroups
          />
        </div>
      </Section>

      <Section title="Referee Home / My Learning landing" description='screen === "referee" (inline in app/page.tsx) — fixture duplicate, see file header'>
        <div className="mx-auto max-w-5xl px-4">
          <div className="layout">
            <div className="grid gap-4">
              <PageFrame
                className="p-0"
                eyebrow="Referee Portal"
                title={`Welcome, ${session.profile.name}`}
                description="Only completed evaluations from your educator appear here."
              />
              {myReviews.length === 0 ? (
                <EmptyState
                  icon={<Inbox size={28} />}
                  title="No completed evaluations yet"
                  description="Completed evaluations from your educator will appear here."
                />
              ) : (
                <Card className="!p-0">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Game</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Educator</TableHeaderCell>
                        <TableHeaderCell>Submitted</TableHeaderCell>
                        <TableHeaderCell>Clips</TableHeaderCell>
                        <TableHeaderCell>Accuracy</TableHeaderCell>
                        <TableHeaderCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {myReviews.map(review => {
                        const visible = TAGS.filter(t => t.reviewId === review.id);
                        return (
                          <TableRow key={review.id}>
                            <TableCell data-label="Game" className="font-semibold">{review.game}</TableCell>
                            <TableCell data-label="Status"><Badge tone="good">{review.status}</Badge></TableCell>
                            <TableCell data-label="Educator">{review.educatorName}</TableCell>
                            <TableCell data-label="Submitted">{review.submittedAt ? new Date(review.submittedAt).toLocaleDateString() : "—"}</TableCell>
                            <TableCell data-label="Clips">{visible.length}</TableCell>
                            <TableCell data-label="Accuracy">{makeAnalytics(visible).accuracy}</TableCell>
                            <TableCell data-label="">
                              <Button variant="primary" size="sm" className="gap-1.5"><Eye size={14} /> View Clips</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
            <aside className="panel side-panel border-0 bg-transparent p-0 shadow-none">
              <div className="grid gap-2">
                <Button variant="primary" className="w-full justify-start gap-2.5"><BarChart3 size={16} /> My Stats Hub</Button>
                <Button variant="secondary" className="w-full justify-start gap-2.5"><Target size={16} /> My Goals</Button>
                <div className="relative">
                  <Button variant="secondary" className="w-full justify-start gap-2.5"><MessageSquare size={16} /> My Comments</Button>
                  {totalUnreadComments > 0 && (
                    <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_0_2px_var(--bg)]">
                      {totalUnreadComments}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Button variant="secondary" className="w-full justify-start gap-2.5"><BookOpen size={16} /> My Learning</Button>
                  {pendingLearningCount > 0 && (
                    <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_0_2px_var(--bg)]">
                      {pendingLearningCount}
                    </span>
                  )}
                </div>
              </div>
              {myGoals.length > 0 && (
                <Card className="mt-3.5 p-3.5">
                  <h3 className="ed-section-title mb-2">Development Goals</h3>
                  <p className="text-xs text-muted">{myGoals[0].title}</p>
                </Card>
              )}
              <Card className="mt-3.5 p-3.5">
                <h3 className="ed-section-title mb-2">Performance Summary</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border bg-panel2 p-2 text-center">
                    <div className="text-xl font-black tracking-tight text-text">{allMyReviews.length}</div>
                    <div className="text-[11px] text-muted">Evaluations</div>
                  </div>
                  <div className="rounded-lg border border-border bg-panel2 p-2 text-center">
                    <div className="text-xl font-black tracking-tight text-text">{sidebarTags.length}</div>
                    <div className="text-[11px] text-muted">Clips</div>
                  </div>
                  <div className="rounded-lg border border-border bg-panel2 p-2 text-center">
                    <div className="text-xl font-black tracking-tight text-text">{sidebarAnalytics.accuracy}</div>
                    <div className="text-[11px] text-muted">Accuracy</div>
                  </div>
                </div>
              </Card>
              <div className="mt-3.5 grid gap-3.5">
                {barGroup("Outcome", sidebarAnalytics.outcomeCounts)}
                {barGroup("Category", sidebarAnalytics.categoryCounts)}
              </div>
            </aside>
          </div>
        </div>
      </Section>

      <Section title="My Learning" description='screen === "my-learning" → components/referee/MyLearningScreen.tsx'>
        <div className="rounded-2xl border border-border">
          <MyLearningScreen
            session={SESSION_REFEREE}
            myAssignments={ASSIGNMENTS}
            playlists={PLAYLISTS}
            members={MEMBERS}
            simulatorAttempts={[]}
            onOpenPlaylist={() => {}}
            onOpenSimulator={() => {}}
            onBack={() => {}}
          />
        </div>
      </Section>

      <Section title="My Learning — empty state" description="Zero assignments.">
        <div className="rounded-2xl border border-border">
          <MyLearningScreen
            session={SESSION_REFEREE}
            myAssignments={[]}
            playlists={[]}
            members={MEMBERS}
            simulatorAttempts={[]}
            onOpenPlaylist={() => {}}
            onOpenSimulator={() => {}}
            onBack={() => {}}
          />
        </div>
      </Section>

      <Section title="Individual review landing / summary" description='screen === "refereeReview" → components/referee/RefereeReviewScreen.tsx (video player + clip selection untouched)'>
        {/* This screen self-renders the real <Header>, which owns a `position: fixed` Sidebar —
            correct in production (exactly one screen mounts at a time), but this fixture gallery
            stacks many screens in one scrollable page, so `contain: layout` scopes the fixed
            Sidebar to this box instead of letting it escape over earlier sections. */}
        <div className="rounded-2xl border border-border" style={{ contain: "layout" }}>
          <RefereeReviewScreen
            review={REVIEWS[1]}
            visibleTags={TAGS}
            mySlot="Referee 1"
            session={SESSION_REFEREE}
            unreadCounts={{ "rev-2::tag-1": 2 }}
            onRead={() => {}}
            clearUnread={() => {}}
            officialSummary={{ positives: "Strong hustle and communication throughout.", workOns: "Trail distance on fast breaks.", nextFocus: "Stay wide through transition." }}
            initialTagId={null}
            onHome={() => {}}
            onAdmin={() => {}}
            onProfile={() => {}}
            onLogout={() => {}}
          />
        </div>
      </Section>

      <Section title="Development Goals — My Goals" description='screen === "referee-goals" → components/referee/RefereeGoalsScreen.tsx'>
        <div className="rounded-2xl border border-border">
          <RefereeGoalsScreen
            session={SESSION_REFEREE}
            goalViews={GOALS}
            goalDefs={DEV_GOAL_DEFS}
            notes={DEV_NOTES}
            completedReviews={[REVIEWS[1]]}
            reviewGoalLinks={REVIEW_GOAL_LINKS}
            clipGoalLinks={CLIP_GOAL_LINKS}
            members={MEMBERS}
            onCreateNote={() => {}}
            onUpdateNote={() => {}}
            onDeleteNote={() => {}}
            onBack={() => {}}
            initialGoalId={null}
          />
        </div>
      </Section>

      <Section title="Development Goals — empty state" description="Zero goals, zero notes.">
        <div className="rounded-2xl border border-border">
          <RefereeGoalsScreen
            session={SESSION_REFEREE}
            goalViews={[]}
            goalDefs={[]}
            notes={[]}
            completedReviews={[]}
            reviewGoalLinks={[]}
            clipGoalLinks={[]}
            members={MEMBERS}
            onCreateNote={() => {}}
            onUpdateNote={() => {}}
            onDeleteNote={() => {}}
            onBack={() => {}}
            initialGoalId={null}
          />
        </div>
      </Section>

      <Section title="Development Timeline" description='screen === "referee-development" → components/educator/RefereeDevelopmentScreen.tsx (shared with educator; canEdit=false for a referee viewing their own record)'>
        <div className="rounded-2xl border border-border">
          <RefereeDevelopmentScreen
            session={SESSION_REFEREE}
            referee={MEMBERS[0]}
            refereeMembers={MEMBERS.filter(m => m.role === "referee")}
            goalViews={GOALS}
            notes={DEV_NOTES}
            completedReviews={[REVIEWS[1]]}
            reviewGoalLinks={REVIEW_GOAL_LINKS}
            allReviews={REVIEWS}
            onAssignGoal={() => {}}
            onUpdateGoalDef={() => {}}
            onUpdateRefereeGoal={() => {}}
            onCompleteGoal={() => {}}
            onArchiveGoal={() => {}}
            onReopenGoal={() => {}}
            onDeleteGoal={() => {}}
            onCreateNote={() => {}}
            onUpdateNote={() => {}}
            onDeleteNote={() => {}}
            onBack={() => {}}
          />
        </div>
      </Section>

      <Section title="My Comments / feedback" description='screen === "referee-comments" → components/referee/RefereeCommentsScreen.tsx (comment threads fetched live from Supabase — see file header)'>
        <div className="rounded-2xl border border-border">
          <RefereeCommentsScreen
            session={SESSION_REFEREE}
            myReviews={REVIEWS}
            allTags={TAGS}
            clearUnread={() => {}}
            onRead={() => {}}
            onWatchClip={() => {}}
            onBack={() => {}}
          />
        </div>
      </Section>

      {/* ── Phase 6 — Educator and admin experience ─────────────────────────── */}

      <Section title="Groups" description='screen === "groups" → components/educator/GroupsScreen.tsx'>
        <div className="rounded-2xl border border-border p-4 sm:p-6 lg:p-8">
          <GroupsScreen
            session={SESSION_EDUCATOR}
            groups={GROUPS}
            members={MEMBERS}
            loading={false}
            error=""
            canCreate
            canEdit
            canDelete
            onBack={() => {}}
            onCreateGroup={async () => {}}
            onUpdateGroup={async () => {}}
            onDeleteGroup={async () => {}}
            onSetGroupMembers={async () => {}}
            eyebrow="Learning Hub"
          />
        </div>
      </Section>

      <Section title="Groups — empty state" description="Zero groups.">
        <div className="rounded-2xl border border-border p-4 sm:p-6 lg:p-8">
          <GroupsScreen
            session={SESSION_EDUCATOR}
            groups={[]}
            members={MEMBERS}
            loading={false}
            error=""
            canCreate
            canEdit
            canDelete
            onBack={() => {}}
            onCreateGroup={async () => {}}
            onUpdateGroup={async () => {}}
            onDeleteGroup={async () => {}}
            onSetGroupMembers={async () => {}}
          />
        </div>
      </Section>

      <Section title="Notifications" description='screen === "notifications" → components/NotificationCentre.tsx'>
        <div className="rounded-2xl border border-border p-4 sm:p-6 lg:p-8">
          <NotificationCentre
            notifications={NOTIFICATIONS}
            unreadCount={NOTIFICATIONS.filter(n => !n.isRead).length}
            onMarkRead={() => {}}
            onMarkAllRead={() => {}}
            onDelete={() => {}}
            onNavigate={() => {}}
            onBack={() => {}}
            preferences={NOTIFICATION_PREFS}
            onUpdatePreferences={() => {}}
          />
        </div>
      </Section>

      <Section title="Notifications — empty state" description="Zero notifications.">
        <div className="rounded-2xl border border-border p-4 sm:p-6 lg:p-8">
          <NotificationCentre
            notifications={[]}
            unreadCount={0}
            onMarkRead={() => {}}
            onMarkAllRead={() => {}}
            onDelete={() => {}}
            onNavigate={() => {}}
            onBack={() => {}}
            preferences={NOTIFICATION_PREFS}
            onUpdatePreferences={() => {}}
          />
        </div>
      </Section>

      <Section title="Member Management" description='screen === "database" → components/admin/MembersScreen.tsx (fetches its own member list live from Supabase — renders its empty state deterministically, same limitation as My Comments above)'>
        <div className="rounded-2xl border border-border p-4 sm:p-6 lg:p-8">
          <MembersScreen
            session={SESSION_ADMIN}
            onNavigateSettings={() => {}}
            onNavigateTeam={() => {}}
            onRefreshOrgMembers={() => {}}
          />
        </div>
      </Section>

      {/* ── Phase 6B — Educator operations ──────────────────────────────────── */}

      <Section title="Assignments — list" description='screen === "assignments" → components/admin/AssignmentsScreen.tsx'>
        <div className="rounded-2xl border border-border p-4 sm:p-6 lg:p-8">
          <AssignmentsScreen
            session={SESSION_ADMIN}
            assignments={ASSIGNMENTS}
            playlists={PLAYLISTS}
            members={MEMBERS}
            groups={GROUPS}
            loading={false}
            error=""
            canDelete
            onView={() => {}}
            onDelete={async () => {}}
            onNewQuiz={() => {}}
            onNewSimulator={() => {}}
            onBack={() => {}}
          />
        </div>
      </Section>

      <Section title="Assignments — empty state" description="Zero assignments.">
        <div className="rounded-2xl border border-border p-4 sm:p-6 lg:p-8">
          <AssignmentsScreen
            session={SESSION_ADMIN}
            assignments={[]}
            playlists={[]}
            members={MEMBERS}
            groups={GROUPS}
            loading={false}
            error=""
            canDelete
            onView={() => {}}
            onDelete={async () => {}}
            onNewQuiz={() => {}}
            onNewSimulator={() => {}}
            onBack={() => {}}
          />
        </div>
      </Section>

      <Section title="Assignment detail — playlist assignment, in progress" description='screen === "assignment-detail" → components/admin/AssignmentDetailScreen.tsx (reflection question, single member "Started")'>
        <div className="rounded-2xl border border-border">
          <AssignmentDetailScreen
            assignment={ASSIGNMENTS[0]}
            playlist={PLAYLISTS[0]}
            members={MEMBERS}
            canEdit
            canDelete
            reviews={REVIEWS}
            tags={TAGS}
            onBack={() => {}}
            onUpdate={async () => {}}
            onDelete={async () => {}}
            onAddUsers={async () => ({ added: 0, skipped: 0 })}
            onRemoveUser={async () => {}}
            onUpdateStatus={async () => {}}
          />
        </div>
      </Section>

      <Section title="Assignment detail — quiz assignment, completed" description="Quiz-only assignment (no playlist), one member Completed with a scored quiz — verifies the quiz review expandable row.">
        <div className="rounded-2xl border border-border">
          <AssignmentDetailScreen
            assignment={ASSIGNMENTS[1]}
            playlist={null}
            members={MEMBERS}
            canEdit
            canDelete
            reviews={REVIEWS}
            tags={TAGS}
            onBack={() => {}}
            onUpdate={async () => {}}
            onDelete={async () => {}}
            onAddUsers={async () => ({ added: 0, skipped: 0 })}
            onRemoveUser={async () => {}}
            onUpdateStatus={async () => {}}
          />
        </div>
      </Section>

      <Section title="Comment Inbox" description='screen === "comment-inbox" → components/educator/CommentInbox.tsx (fetches its own review/comment threads live from Supabase — renders its empty state deterministically, same limitation as My Comments and Member Management above)'>
        <div className="rounded-2xl border border-border">
          <CommentInbox
            session={SESSION_EDUCATOR}
            onHome={() => {}}
            onRead={() => {}}
            onOpenReview={() => {}}
            unreadCounts={{}}
          />
        </div>
      </Section>

      <Section title="Team Management — permissions" description='screen === "team-management" → components/admin/TeamManagementScreen.tsx (one member with role-default permissions, one with a custom set)'>
        <div className="rounded-2xl border border-border">
          <TeamManagementScreen
            session={SESSION_ADMIN}
            members={MEMBERS}
            permissionMap={PERMISSION_MAP}
            permissionsLoading={false}
            onSavePerms={async () => {}}
            onBack={() => {}}
          />
        </div>
      </Section>

      <Section title="Team Management — empty state" description="Zero members.">
        <div className="rounded-2xl border border-border">
          <TeamManagementScreen
            session={SESSION_ADMIN}
            members={[]}
            permissionMap={new Map()}
            permissionsLoading={false}
            onSavePerms={async () => {}}
            onBack={() => {}}
          />
        </div>
      </Section>

      <Section title="Your Profile" description='screen === "profile" → components/admin/UserProfileScreen.tsx'>
        <div className="rounded-2xl border border-border p-4 sm:p-6 lg:p-8">
          <UserProfileScreen
            session={SESSION_ADMIN}
            onBack={() => {}}
            onSwitchOrg={() => {}}
            onProfileNameSaved={() => {}}
          />
        </div>
      </Section>
    </main>
  );
}
