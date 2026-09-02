"use client";

// Internal, unlinked diagnostic page — Learning & Content Administration
// modernisation verification. Renders the real, unmodified production
// screen components (LearningHub, LearningProgress, ClipLibraryScreen ×2
// tabs, PlaylistsScreen, PlaylistDetailScreen, QuizBuilderScreen,
// SimulatorBuilderScreen, SimulatorAnalyticsDashboard) against deterministic
// local fixtures, each wrapped in the real AppShell exactly as app/page.tsx
// renders them — no live Supabase role credentials are available in this
// environment, so this is the verification surface for that migration.
// Not linked from any navigation; safe to delete once verification is done.

import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { LearningHub } from "@/components/educator/LearningHub";
import { LearningProgress } from "@/components/educator/LearningProgress";
import { ClipLibraryScreen } from "@/components/admin/ClipLibraryScreen";
import { PlaylistsScreen } from "@/components/admin/PlaylistsScreen";
import { PlaylistDetailScreen } from "@/components/admin/PlaylistDetailScreen";
import { QuizBuilderScreen } from "@/components/admin/QuizBuilderScreen";
import { SimulatorBuilderScreen } from "@/components/admin/SimulatorBuilderScreen";
import { SimulatorAnalyticsDashboard } from "@/components/admin/SimulatorAnalyticsDashboard";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { NavContext } from "@/components/shell/nav";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import type { Playlist } from "@/lib/types/playlists";
import type { Assignment } from "@/lib/types/assignments";
import type { MemberRecord } from "@/lib/types/members";
import type { Group } from "@/lib/types/groups";
import type { RefereeGoalView } from "@/lib/types/developmentGoals";
import type { SimulatorSessionWithEvents, SimulatorAttempt } from "@/lib/types/simulator";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

const ORG_ID = "org-demo";

const SESSION: RefEvalSession = {
  user: { id: "user-jamie", email: "jamie@refereecollegeofaustralia.com.au" },
  profile: { id: "user-jamie", email: "jamie@refereecollegeofaustralia.com.au", name: "Jamie Smith", mustChangePassword: false },
  memberships: [{ organisationId: ORG_ID, organisationName: "Demo Basketball Association", role: "educator" }],
  activeOrganisation: { id: ORG_ID, name: "Demo Basketball Association" },
  activeRole: "educator",
};

const NAV_CONTEXT: NavContext = {
  role: "educator",
  homeScreen: "educator",
  isManagement: true,
  isAdmin: false,
  isReferee: false,
  canViewClipLibrary: true,
  canAccessPlaylists: true,
  canViewAssignments: true,
  canViewGroups: true,
  unreadComments: 0,
};

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
    videoLink: "", timestampOffset: -10, status: "Completed", gameDate: daysAgo(2).slice(0, 10), createdAt: daysAgo(2), submittedAt: daysAgo(2),
  },
];

const TAGS: CodedTag[] = [
  { id: "tag-1", reviewId: "rev-2", organisationId: ORG_ID, time: "01:20", seconds: 80, adjustedSeconds: 70, adjustedTime: "01:10", mode: "video", refereeTarget: "Referee 1", extraReviewOfficials: [], clipOfficials: [], outcome: "Correct Call", category: "Foul / Push", position: "Trail", coverage: "Primary", notes: "Good trail position, clean read on the push.", isLearningClip: true, createdAt: daysAgo(5) },
  { id: "tag-2", reviewId: "rev-2", organisationId: ORG_ID, time: "04:02", seconds: 242, adjustedSeconds: 232, adjustedTime: "03:52", mode: "video", refereeTarget: "Referee 1", extraReviewOfficials: [], clipOfficials: [], outcome: "Incorrect No Call", category: "Violation / Travel", position: "Lead", coverage: "Secondary", isLearningClip: true, createdAt: daysAgo(5) },
  { id: "tag-3", reviewId: "rev-3", organisationId: ORG_ID, time: "07:45", seconds: 465, adjustedSeconds: 455, adjustedTime: "07:35", mode: "video", refereeTarget: "Referee 1", extraReviewOfficials: [], clipOfficials: [], outcome: "Correct Call", category: "Mechanics / Positioning", createdAt: daysAgo(2) },
];

const PLAYLISTS: Playlist[] = [
  {
    id: "pl-1", organisationId: ORG_ID, title: "Positioning fundamentals", description: "Trail and lead positioning on transition plays.",
    createdBy: "user-jamie", createdAt: daysAgo(10), updatedAt: daysAgo(10), archivedAt: null,
    items: [
      { id: "pi-1", playlistId: "pl-1", reviewId: "rev-2", tagId: "tag-1", position: 0, createdAt: daysAgo(10), creatorNote: "Note the trail official's angle here." },
      { id: "pi-2", playlistId: "pl-1", reviewId: "rev-2", tagId: "tag-2", position: 1, createdAt: daysAgo(10), creatorNote: null },
      { id: "pi-3", playlistId: "pl-1", reviewId: "rev-3", tagId: "tag-3", position: 2, createdAt: daysAgo(10), creatorNote: null },
    ],
  },
  {
    id: "pl-2", organisationId: ORG_ID, title: "Foul recognition basics", description: null,
    createdBy: "user-jamie", createdAt: daysAgo(30), updatedAt: daysAgo(30), archivedAt: null,
    items: [],
  },
];

const ASSIGNMENTS: Assignment[] = [
  {
    id: "assign-1", organisationId: ORG_ID, playlistId: "pl-1", simulatorSessionId: null, assignedBy: "user-jamie",
    title: "Positioning fundamentals", instructions: "Review the clips below and note where your trail position could be tighter.", dueDate: daysAgo(-3).slice(0, 10), required: true, quizAllowRetakes: true,
    createdAt: daysAgo(10), questions: [{ id: "q-1", text: "What would you do differently?", required: true, displayOrder: 0 }], quizQuestions: [],
    assignmentUsers: [
      { id: "au-1", assignmentId: "assign-1", userId: "user-alex", status: "Started", assignedAt: daysAgo(10), startedAt: daysAgo(3), completedAt: null, watchedClipIds: ["tag-1"], reflectionResponses: null, reflectionSubmittedAt: null, quizAnswers: null, quizScore: null, quizTotal: null, quizSubmittedAt: null, quizAttemptCount: 0 },
      { id: "au-1b", assignmentId: "assign-1", userId: "user-sam", status: "Completed", assignedAt: daysAgo(10), startedAt: daysAgo(9), completedAt: daysAgo(8), watchedClipIds: ["tag-1", "tag-2", "tag-3"], reflectionResponses: null, reflectionSubmittedAt: daysAgo(8), quizAnswers: null, quizScore: null, quizTotal: null, quizSubmittedAt: null, quizAttemptCount: 0 },
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
];

const GROUPS: Group[] = [
  { id: "grp-1", organisationId: ORG_ID, name: "Junior Development", description: "First-year referees", colour: "#3b82f6", createdAt: daysAgo(30), updatedAt: daysAgo(30), members: [{ id: "gm-1", groupId: "grp-1", userId: "user-alex", createdAt: daysAgo(30) }] },
];

const GOALS: RefereeGoalView[] = [
  {
    id: "goal-1", goalId: "def-1", refereeId: "user-alex", organisationId: ORG_ID, status: "Active", notes: "",
    targetReviewDate: daysAgo(-2).slice(0, 10), createdAt: daysAgo(15), updatedAt: daysAgo(15), completedAt: null, archivedAt: null,
    title: "Improve trail positioning", description: "Focus on staying wide on transition.", category: "Positioning", priority: "High",
  },
];

const SIM_SESSIONS: SimulatorSessionWithEvents[] = [
  {
    id: "sim-1", organisationId: ORG_ID, title: "NBL Round 5 — Foul Decisions", description: "Foul-recognition scenarios from a real game.",
    videoUrl: "https://example.com/video.mp4", reviewId: "rev-2", createdBy: "user-jamie", createdAt: daysAgo(12), updatedAt: daysAgo(12),
    events: [],
  },
  {
    id: "sim-2", organisationId: ORG_ID, title: "Travel & Backcourt Draft", description: "In-progress draft, not yet published.",
    videoUrl: "https://example.com/draft.mp4", reviewId: "rev-1", createdBy: "user-jamie", createdAt: daysAgo(1), updatedAt: daysAgo(1),
    events: [],
  },
];

const SIM_ATTEMPTS: SimulatorAttempt[] = [
  { id: "att-1", sessionId: "sim-1", userId: "user-alex", startedAt: daysAgo(8), completedAt: daysAgo(8), score: 6, total: 8, level: "intermediate" },
  { id: "att-2", sessionId: "sim-1", userId: "user-alex", startedAt: daysAgo(3), completedAt: daysAgo(3), score: 7, total: 8, level: "intermediate" },
  { id: "att-3", sessionId: "sim-1", userId: "user-sam", startedAt: daysAgo(6), completedAt: daysAgo(6), score: 8, total: 8, level: "intermediate" },
];

function noop() {}
async function asyncNoop() {}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-10 first:border-t-0 first:pt-0">
      <div className="mx-auto mb-4 max-w-5xl px-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// Every Section below wraps its screen in the real AppShell — same
// Header/Sidebar/padding every production render gets — so this fixture
// verifies the actual chrome, not an approximation of it.
function Shell({ activeScreen, children }: { activeScreen: Screen; children: React.ReactNode }) {
  return (
    <AppShell
      session={SESSION}
      activeScreen={activeScreen}
      navContext={NAV_CONTEXT}
      onHome={noop}
      onAdmin={noop}
      onProfile={noop}
      onLogout={noop}
    >
      {children}
    </AppShell>
  );
}

export default function LearningContentFixturesPage() {
  const [playlistDetail] = useState<Playlist>(PLAYLISTS[0]);

  return (
    <main className="grid grid-cols-1 gap-10 overflow-x-hidden pb-16">
      <header className="mx-auto max-w-5xl px-4 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          RefEval Evolution — Learning &amp; Content Administration
        </p>
        <h1 className="text-2xl font-bold text-text">Modernisation — fixture verification</h1>
        <p className="mt-1 text-sm text-muted">
          Every screen below is the real, unmodified production component wrapped in the real
          AppShell, fed by deterministic local fixtures — no live Supabase credentials required.
        </p>
      </header>

      <Section title="Learning Hub" description='screen === "learning-hub" → components/educator/LearningHub.tsx'>
        <Shell activeScreen="learning-hub">
          <LearningHub
            session={SESSION}
            tags={TAGS}
            playlists={PLAYLISTS}
            assignments={ASSIGNMENTS}
            members={MEMBERS}
            groupCount={GROUPS.length}
            simulatorCount={SIM_SESSIONS.length}
            canViewClipLibrary
            canAccessPlaylists
            canViewAssignments
            canViewGroups
            canAccessSimulator
            setScreen={noop}
            refereeMembers={MEMBERS.filter(m => m.role === "referee")}
            allRefereeGoalViews={GOALS}
            onNavigateDevelopment={noop}
          />
        </Shell>
      </Section>

      <Section title="Learning Progress" description='screen === "learning-progress" → components/educator/LearningProgress.tsx'>
        <Shell activeScreen="learning-progress">
          <LearningProgress
            session={SESSION}
            assignments={ASSIGNMENTS}
            members={MEMBERS}
            groups={GROUPS}
            setScreen={noop}
          />
        </Shell>
      </Section>

      <Section title="Clip Library" description='screen === "clip-library" → components/admin/ClipLibraryScreen.tsx (initialTab="all")'>
        <Shell activeScreen="clip-library">
          <ClipLibraryScreen
            session={SESSION}
            reviews={REVIEWS}
            tags={TAGS}
            onBack={noop}
            onOpenReview={noop}
            onCreatePlaylist={async () => "pl-new"}
            onViewPlaylist={noop}
            canCreatePlaylists
            initialTab="all"
            onRemoveFromLearningLibrary={asyncNoop}
            onNavigateToQuizBuilder={noop}
            onNavigateToLearningLibrary={noop}
          />
        </Shell>
      </Section>

      <Section title="Learning Library" description='screen === "learning-library" → components/admin/ClipLibraryScreen.tsx (initialTab="learning")'>
        <Shell activeScreen="learning-library">
          <ClipLibraryScreen
            session={SESSION}
            reviews={REVIEWS}
            tags={TAGS}
            onBack={noop}
            onOpenReview={noop}
            onCreatePlaylist={async () => "pl-new"}
            onViewPlaylist={noop}
            canCreatePlaylists
            initialTab="learning"
            onRemoveFromLearningLibrary={asyncNoop}
            onNavigateToQuizBuilder={noop}
          />
        </Shell>
      </Section>

      <Section title="Playlists" description='screen === "playlists" → components/admin/PlaylistsScreen.tsx'>
        <Shell activeScreen="playlists">
          <PlaylistsScreen
            session={SESSION}
            playlists={PLAYLISTS}
            loading={false}
            error=""
            members={MEMBERS}
            assignments={ASSIGNMENTS}
            onViewPlaylist={noop}
            onDeletePlaylist={asyncNoop}
            onArchivePlaylist={asyncNoop}
            onBack={noop}
            canDelete
          />
        </Shell>
      </Section>

      <Section title="Playlist Detail" description='screen === "playlist-detail" → components/admin/PlaylistDetailScreen.tsx'>
        <Shell activeScreen="playlist-detail">
          <PlaylistDetailScreen
            playlist={playlistDetail}
            reviews={REVIEWS}
            tags={TAGS}
            onBack={noop}
            onOpenReview={noop}
            onUpdateMeta={asyncNoop}
            onUpdatePositions={asyncNoop}
            onRemoveItem={asyncNoop}
            onDelete={asyncNoop}
            onArchive={asyncNoop}
            canEdit
            canDelete
            members={MEMBERS}
            groups={GROUPS}
            canAssign
            onCreateAssignment={asyncNoop}
            onAddToAssignment={async () => ({ added: 0, skipped: 0 })}
            assignments={ASSIGNMENTS.filter(a => a.playlistId === playlistDetail.id)}
            onViewAssignment={noop}
            onUpdateItemNote={asyncNoop}
          />
        </Shell>
      </Section>

      <Section title="Quiz Builder" description='screen === "quiz-builder" → components/admin/QuizBuilderScreen.tsx'>
        <Shell activeScreen="quiz-builder">
          <QuizBuilderScreen
            session={SESSION}
            members={MEMBERS}
            groups={GROUPS}
            reviews={REVIEWS}
            tags={TAGS}
            onCreate={asyncNoop}
            onBack={noop}
          />
        </Shell>
      </Section>

      <Section title="Simulator Builder" description='screen === "simulator-builder" → components/admin/SimulatorBuilderScreen.tsx'>
        <Shell activeScreen="simulator-builder">
          <SimulatorBuilderScreen
            session={SESSION}
            sessions={SIM_SESSIONS}
            attempts={SIM_ATTEMPTS}
            members={MEMBERS}
            loading={false}
            reviews={REVIEWS}
            tags={TAGS}
            onCreate={async () => "sim-new"}
            onUpdate={asyncNoop}
            onDelete={asyncNoop}
            onPublish={asyncNoop}
            onBack={noop}
            onRunSession={noop}
            onOpenReview={noop}
            onAssignSession={noop}
            onAnalytics={noop}
          />
        </Shell>
      </Section>

      <Section title="Simulator Analytics" description='screen === "simulator-analytics" → components/admin/SimulatorAnalyticsDashboard.tsx'>
        <Shell activeScreen="simulator-analytics">
          <SimulatorAnalyticsDashboard
            sessions={SIM_SESSIONS}
            attempts={SIM_ATTEMPTS}
            members={MEMBERS}
            reviews={REVIEWS}
            tags={TAGS}
            initialSessionId="sim-1"
            onBack={noop}
          />
        </Shell>
      </Section>
    </main>
  );
}
