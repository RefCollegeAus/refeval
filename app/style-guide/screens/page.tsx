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
// thread list. The Reviewer Workspace section's "Comments" toggle opens the
// same real ReviewComments component, which will similarly try (and fail) to
// fetch from a non-existent review — its own loading/empty state is what you
// see, which is enough to check its position within the clip row.

import { useRef, useState } from "react";
import { Inbox, Eye, BarChart3, Target, MessageSquare, BookOpen, Play, Pause, Tag as TagIcon, Download, Trash2, ClipboardList, ChevronDown, ChevronUp, X } from "lucide-react";
import { EducatorDashboard } from "@/components/educator/EducatorDashboard";
import { OrganisationScreen } from "@/components/organisation/OrganisationScreen";
import { RefereeDevelopmentScreen } from "@/components/educator/RefereeDevelopmentScreen";
import { ReviewDevelopmentPanel } from "@/components/educator/ReviewDevelopmentPanel";
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
import { TaggedClipsModal } from "@/components/reviewer/TaggedClipsModal";
import { ClipRow } from "@/components/reviewer/ClipRow";
import { Badge, Button, Card, EmptyState, Modal, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { makeAnalytics } from "@/lib/utils/analytics";
import { makeDefaultSettings } from "@/lib/types/organisationSettings";
import type { RefEvalSession } from "@/lib/types/auth";
import type { ReviewRecord, CodedTag, RefSlot } from "@/lib/types/reviews";
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

// ── Reviewer Workspace fixture (duplicated JSX — see file header note) ──────
// Three officials assigned so the header/participants text and per-official
// Development Goals panels are all exercised. Tags cover every outcome tone,
// mixed note lengths (short/long/none), and one with an extra review official
// so the condensed clip row and the referee-filter both have something to
// show.
const REVIEWER_REVIEW: ReviewRecord = {
  id: "rev-reviewer-fixture", organisationId: ORG_ID, game: "Kings vs Breakers", educatorId: "user-jamie", educatorName: "Jamie Smith",
  referee1Id: "user-alex", referee2Id: "user-sam", referee3Id: "user-morgan", referee1Name: "Alex Referee", referee2Name: "Sam Official", referee3Name: "Morgan Alexander Fitzgerald-Whitfield",
  videoLink: "", timestampOffset: -10, status: "In Review", gameDate: daysAgo(2).slice(0, 10), createdAt: daysAgo(2),
  // Exercises the console's Game Summary + Final Recommendations sections —
  // one official with all three fields, one with only positives/workOns
  // (no nextFocus), one with none (excluded from both sections).
  officialSummaries: {
    "user-alex": { positives: "Strong hustle and communication throughout.", workOns: "Trail distance on fast breaks.", nextFocus: "Stay wide through transition." },
    "user-sam": { positives: "Confident travel calls under pressure.", workOns: "", nextFocus: "" },
  },
};

// Multiple goals across officials, distinct priorities, one with notes, one
// without — exercises the Development tabs' per-official goal rows and the
// read-only goal.notes preview.
const REVIEWER_GOALS: RefereeGoalView[] = [
  {
    id: "rvgoal-1", goalId: "rvdef-1", refereeId: "user-alex", organisationId: ORG_ID, status: "Active",
    notes: "Two clips this game where trail spacing tightened up nicely under pressure.",
    targetReviewDate: daysAgo(-5).slice(0, 10), createdAt: daysAgo(18), updatedAt: daysAgo(2), completedAt: null, archivedAt: null,
    title: "Improve trail positioning", description: "Focus on staying wide on transition.", category: "Positioning", priority: "High",
  },
  {
    id: "rvgoal-2", goalId: "rvdef-2", refereeId: "user-sam", organisationId: ORG_ID, status: "Active",
    notes: "",
    targetReviewDate: daysAgo(-10).slice(0, 10), createdAt: daysAgo(9), updatedAt: daysAgo(9), completedAt: null, archivedAt: null,
    title: "Tighten travel calls on baseline drives", description: "Watch pivot foot on baseline penetration.", category: "Rules", priority: "Medium",
  },
  {
    id: "rvgoal-3", goalId: "rvdef-3", refereeId: "user-sam", organisationId: ORG_ID, status: "Active",
    notes: "Communicate primary/secondary coverage earlier in transition.",
    targetReviewDate: null, createdAt: daysAgo(3), updatedAt: daysAgo(3), completedAt: null, archivedAt: null,
    title: "Faster transition communication", description: "", category: "Communication", priority: "Low",
  },
];

const REVIEWER_TAGS: CodedTag[] = [
  { id: "rtag-1", reviewId: REVIEWER_REVIEW.id, organisationId: ORG_ID, time: "01:20", seconds: 80, adjustedSeconds: 70, adjustedTime: "01:10", mode: "video", refereeTarget: "Referee 1", extraReviewOfficials: [], clipOfficials: [], outcome: "Correct Call", category: "Foul - Personal", position: "Trail", coverage: "Primary", notes: "Strong trail positioning, clean read on contact.", createdAt: daysAgo(2) },
  { id: "rtag-2", reviewId: REVIEWER_REVIEW.id, organisationId: ORG_ID, time: "04:02", seconds: 242, adjustedSeconds: 232, adjustedTime: "03:52", mode: "video", refereeTarget: "Referee 2", extraReviewOfficials: ["Referee 1"], clipOfficials: [], outcome: "Incorrect No Call", category: "Violation - Travel", position: "Lead", coverage: "Secondary", notes: "Missed the pivot foot lift from the baseline angle — worth a group discussion since Referee 1 also had a look from trail.", createdAt: daysAgo(2) },
  { id: "rtag-3", reviewId: REVIEWER_REVIEW.id, organisationId: ORG_ID, time: "07:41", seconds: 461, adjustedSeconds: 451, adjustedTime: "07:31", mode: "video", refereeTarget: "Referee 3", extraReviewOfficials: [], clipOfficials: [], outcome: "Correct No Call", category: "Foul - Disruptive", position: "Centre", coverage: "Extended", createdAt: daysAgo(2) },
  { id: "rtag-4", reviewId: REVIEWER_REVIEW.id, organisationId: ORG_ID, time: "11:05", seconds: 665, adjustedSeconds: 655, adjustedTime: "10:55", mode: "video", refereeTarget: "Referee 1", extraReviewOfficials: [], clipOfficials: [], outcome: "Incorrect Call", category: "Foul - Flagrant", position: "Trail", coverage: "Primary", notes: "Called flagrant on incidental contact.", createdAt: daysAgo(2) },
  { id: "rtag-5", reviewId: REVIEWER_REVIEW.id, organisationId: ORG_ID, time: "14:30", seconds: 870, adjustedSeconds: 860, adjustedTime: "14:20", mode: "video", refereeTarget: "Referee 2", extraReviewOfficials: [], clipOfficials: [], outcome: "Review", category: "Game Administration", position: "Lead", coverage: "Primary", createdAt: daysAgo(2) },
];

const REVIEWER_COMMENT_COUNTS: Record<string, number> = {
  [`${REVIEWER_REVIEW.id}::rtag-2`]: 3,
};

const REVIEWER_GOAL_LINKS: ReviewGoalLink[] = [
  { id: "rvrgl-1", organisationId: ORG_ID, reviewId: REVIEWER_REVIEW.id, goalDefId: "rvdef-1", refereeId: "user-alex", linkedAt: daysAgo(2), linkedBy: "user-jamie", createdGoalFromReview: false },
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

  // ── Reviewer Workspace fixture (duplicated JSX — see file header note) ────
  const [rvAnalyticsTarget, setRvAnalyticsTarget] = useState<RefSlot>("All Referees");
  const [rvSelectedTagId, setRvSelectedTagId] = useState<string | null>(null);
  const [rvActiveCommentTagId, setRvActiveCommentTagId] = useState<string | null>(null);
  const [rvClipsModalOpen, setRvClipsModalOpen] = useState(false);
  const [rvSummaryViewOfficialId, setRvSummaryViewOfficialId] = useState<string | null>(null);
  const [rvGameDetailsExpanded, setRvGameDetailsExpanded] = useState(true);
  const rvVideoColumnRef = useRef<HTMLDivElement | null>(null);

  function rvScrollToVideo() {
    // Deferred: see scrollToVideo in app/page.tsx — must run after the
    // clips modal's scroll-lock cleanup restores document.body.style.overflow.
    setTimeout(() => rvVideoColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function rvSlotName(slot: RefSlot, r?: ReviewRecord) {
    if (!r) return slot;
    if (slot === "Referee 1") return r.referee1Name || "Crew Chief";
    if (slot === "Referee 2") return r.referee2Name || "Umpire 1";
    if (slot === "Referee 3") return r.referee3Name || "Umpire 2";
    return "All Referees";
  }
  function rvTagAppliesToSlot(tag: CodedTag, slot: RefSlot) {
    if (tag.refereeTarget === "All Referees" || slot === "All Referees") return slot === "All Referees" || tag.refereeTarget === "All Referees";
    if (tag.refereeTarget === slot) return true;
    return (tag.extraReviewOfficials || []).includes(slot);
  }
  const RV_REF_SLOTS: RefSlot[] = ["All Referees", "Referee 1", "Referee 2", "Referee 3"];
  const rvSummarySlots: [string, string, string][] = (
    [
      [REVIEWER_REVIEW.referee1Id, REVIEWER_REVIEW.referee1Name || "Crew Chief", "Crew Chief"],
      [REVIEWER_REVIEW.referee2Id, REVIEWER_REVIEW.referee2Name || "Umpire 1", "Umpire 1"],
      [REVIEWER_REVIEW.referee3Id, REVIEWER_REVIEW.referee3Name || "Umpire 2", "Umpire 2"],
    ] as [string, string, string][]
  ).filter(([id]) => !!id);
  const rvAnalyticsTags = rvAnalyticsTarget === "All Referees" ? REVIEWER_TAGS : REVIEWER_TAGS.filter(t => rvTagAppliesToSlot(t, rvAnalyticsTarget));
  const rvAnalytics = makeAnalytics(rvAnalyticsTags);
  const rvTimelineMarkers = REVIEWER_TAGS.map(t => ({
    id: t.id,
    seconds: t.adjustedSeconds,
    left: Math.min(100, (t.adjustedSeconds / 900) * 100),
    color: t.outcome?.startsWith("Correct") ? "var(--good)" : t.outcome?.startsWith("Incorrect") ? "var(--danger)" : "var(--warn)",
    label: `${t.adjustedTime} · ${rvSlotName(t.refereeTarget, REVIEWER_REVIEW)} · ${t.outcome ?? ""}`,
  }));

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

                  <Section title="Reviewer Workspace (Educator)" description='screen === "reviewer" (inline in app/page.tsx) — fixture duplicate, see file header. v3.1: every review control now lives in the right Coaching Console; the left workspace is video + timeline only. Video area is a labelled placeholder box (no real playback simulated); every other control, including the Development tabs (real ReviewDevelopmentPanel in compact mode), is the real markup.'>
        <div className="rounded-2xl border border-border p-3 lg:p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-4">

            {/* LEFT — video + timeline only, stretches to match the console's height on desktop */}
            <div ref={rvVideoColumnRef} className="flex min-w-0 flex-col lg:h-[calc(100vh-136px)]">
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-panel">
                <div className="aspect-video min-h-0 lg:flex-1">
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
                    Video preview area (fixture — playback not simulated)
                  </div>
                </div>
                <div className="shrink-0 border-t border-border px-3 py-2">
                  <div className="playback-group" style={{ display: "flex", width: "100%" }}>
                    <button className="playback-btn" style={{ flex: 1 }}>← 5s</button>
                    <button className="playback-btn play-pause-btn" style={{ flex: 1 }}><Play size={15} /><Pause size={15} /></button>
                    <button className="playback-btn" style={{ flex: 1 }}>5s →</button>
                  </div>
                  <div className="timeline" style={{ margin: "8px 0" }}>
                    <div className="progress" style={{ width: "62%" }} />
                    {rvTimelineMarkers.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className={"marker-hit" + (rvSelectedTagId === m.id ? " marker-hit--active" : "")}
                        title={m.label}
                        aria-label={m.label}
                        style={{ left: `${m.left}%` }}
                        onClick={() => setRvSelectedTagId(m.id)}
                      >
                        <span className="marker-bar" style={{ background: m.color }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — coaching console */}
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:sticky lg:top-[120px] lg:h-[calc(100vh-136px)] lg:gap-3 lg:overflow-y-auto lg:pr-1">

              <div className="rounded-2xl border border-border p-4">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Review Actions</p>
                  <Badge tone={REVIEWER_REVIEW.status === "Completed" ? "good" : "warn"}>{REVIEWER_REVIEW.status}</Badge>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="secondary" size="sm" className="flex-1 justify-center">← Back</Button>
                  <Button variant="secondary" size="sm" className="flex-1 justify-center text-yellow-300">Save</Button>
                  <Button variant="good" size="sm" className="flex-1 justify-center">Submit</Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border p-4">
                <div className={rvGameDetailsExpanded ? "mb-2.5 flex items-center justify-between gap-2" : "flex items-center justify-between gap-2"}>
                  <div className="flex min-w-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setRvGameDetailsExpanded(v => !v)}
                      aria-expanded={rvGameDetailsExpanded}
                      aria-label={rvGameDetailsExpanded ? "Collapse Game Details" : "Expand Game Details"}
                      className="rounded p-0.5 text-muted/50 hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {rvGameDetailsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">Game Details</p>
                  </div>
                  <Button variant="secondary" size="sm">✏️ Edit</Button>
                </div>
                {rvGameDetailsExpanded && (
                <div className="grid gap-1 text-xs leading-snug">
                  <div className="min-w-0"><span className="font-semibold text-text">Game</span>{" "}<span className="text-muted">{REVIEWER_REVIEW.game}</span></div>
                  <div><span className="font-semibold text-text">Date</span>{" "}<span className="text-muted">{REVIEWER_REVIEW.gameDate}</span></div>
                  <div><span className="font-semibold text-text">Educator</span>{" "}<span className="text-muted">{REVIEWER_REVIEW.educatorName}</span></div>
                  {rvSummarySlots.length > 0 && (
                    <div>
                      <span className="font-semibold text-text">Officials</span>
                      <div className="mt-0.5 grid gap-px">
                        {rvSummarySlots.map(([id, name, role]) => {
                          const s = REVIEWER_REVIEW.officialSummaries?.[id];
                          const hasSummary = !!(s && (s.positives || s.workOns || s.nextFocus));
                          const hasActiveGoals = REVIEWER_GOALS.some(g => g.refereeId === id && g.status === "Active");
                          const hasContent = hasSummary || hasActiveGoals;
                          return (
                            <div key={id} className="flex items-center justify-between gap-2 text-muted">
                              <span className="truncate">{name} <span className="text-muted/70">— {role}</span></span>
                              {hasContent && (
                                <button
                                  type="button"
                                  onClick={() => setRvSummaryViewOfficialId(id)}
                                  aria-label={`View summary and development for ${name}`}
                                  className="shrink-0 rounded-md p-1 text-accent hover:bg-panel-3 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                >
                                  <ClipboardList size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>

              <Button variant="primary" className="w-full justify-center gap-1.5"><TagIcon size={14} /> Tag Moment (X)</Button>

              <div className="rounded-2xl border border-border p-4">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Clips</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="secondary" size="sm" className="gap-1.5"><Download size={14} /> CSV</Button>
                    <Button variant="primary" size="sm" className="gap-1.5"><Download size={14} /> Excel</Button>
                  </div>
                </div>
                <label className="mb-2.5 flex items-center gap-2 text-xs text-muted">
                  Referee
                  <Select className="h-8 w-auto min-w-0 flex-1 py-0 text-sm" value={rvAnalyticsTarget} onChange={e => setRvAnalyticsTarget(e.target.value as RefSlot)}>
                    {RV_REF_SLOTS.map(s => <option key={s} value={s}>{rvSlotName(s, REVIEWER_REVIEW)}</option>)}
                  </Select>
                </label>
                <button
                  type="button"
                  onClick={() => setRvClipsModalOpen(true)}
                  aria-label={`View ${rvAnalytics.total} tagged clips for ${rvSlotName(rvAnalyticsTarget, REVIEWER_REVIEW)}`}
                  className="mb-2.5 block w-full rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="text-lg font-extrabold text-text hover:text-accent">{rvAnalytics.total}</span> <span className="text-xs text-muted">Total clips</span>
                </button>
                <div className="grid grid-cols-3 gap-2 border-t border-border pt-2.5 text-xs">
                  <div><div className="text-sm font-extrabold text-accent">{rvAnalytics.accuracy}</div><div className="text-muted">Accuracy</div></div>
                  <div><div className="text-sm font-extrabold text-good">{rvAnalytics.correctCalls + rvAnalytics.correctNoCalls}</div><div className="text-muted">Correct</div></div>
                  <div><div className="text-sm font-extrabold text-red-300">{rvAnalytics.incorrectCalls + rvAnalytics.incorrectNoCalls}</div><div className="text-muted">Incorrect</div></div>
                </div>
                {(() => {
                  const selectedTag = REVIEWER_TAGS.find(t => t.id === rvSelectedTagId);
                  if (!selectedTag) return null;
                  return (
                    <div className="mt-2.5 border-t border-border pt-2.5">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Selected Clip</p>
                        <button
                          type="button"
                          onClick={() => setRvSelectedTagId(null)}
                          aria-label="Clear selected clip"
                          className="rounded p-0.5 text-muted/60 hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <ClipRow
                        tag={selectedTag}
                        getRefereeName={s => rvSlotName(s, REVIEWER_REVIEW)}
                        isSelected={false}
                        onJump={(_seconds, tagId) => setRvSelectedTagId(tagId)}
                        onDelete={() => {}}
                        activeCommentTagId={rvActiveCommentTagId}
                        onToggleComments={tagId => setRvActiveCommentTagId(t => t === tagId ? null : tagId)}
                        commentCount={REVIEWER_COMMENT_COUNTS[`${REVIEWER_REVIEW.id}::${selectedTag.id}`] ?? 0}
                        activeReviewId={REVIEWER_REVIEW.id}
                        session={SESSION_EDUCATOR}
                        onCommentsRead={() => {}}
                        className="border-b-0 py-0"
                      />
                    </div>
                  );
                })()}
                <Button variant="danger" size="sm" className="mt-2.5 w-full justify-center gap-1.5"><Trash2 size={14} /> Clear Tags</Button>
              </div>

              <div className="rounded-2xl border border-border p-4">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-muted">Statistics</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Outcome</h3>
                    <div className="grid gap-0.5">{rvAnalytics.outcomeCounts.map(([n, c]) => <div className="flex items-center justify-between text-xs text-text" key={n}><span className="text-muted">{n}</span><strong>{c}</strong></div>)}</div>
                  </div>
                  <div>
                    <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Category</h3>
                    <div className="grid gap-0.5">{rvAnalytics.categoryCounts.map(([n, c]) => <div className="flex items-center justify-between text-xs text-text" key={n}><span className="text-muted">{n}</span><strong>{c}</strong></div>)}</div>
                  </div>
                  <div>
                    <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Position</h3>
                    <div className="grid gap-0.5">{rvAnalytics.positionCounts.map(([n, c]) => <div className="flex items-center justify-between text-xs text-text" key={n}><span className="text-muted">{n}</span><strong>{c}</strong></div>)}</div>
                  </div>
                  <div>
                    <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Coverage</h3>
                    <div className="grid gap-0.5">{rvAnalytics.coverageCounts.map(([n, c]) => <div className="flex items-center justify-between text-xs text-text" key={n}><span className="text-muted">{n}</span><strong>{c}</strong></div>)}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <TaggedClipsModal
            open={rvClipsModalOpen}
            onClose={() => setRvClipsModalOpen(false)}
            tags={rvAnalyticsTags}
            filterLabel={rvSlotName(rvAnalyticsTarget, REVIEWER_REVIEW)}
            getRefereeName={s => rvSlotName(s, REVIEWER_REVIEW)}
            selectedTagId={rvSelectedTagId}
            onJump={(_seconds, tagId) => { setRvSelectedTagId(tagId); setRvClipsModalOpen(false); rvScrollToVideo(); }}
            onEdit={() => {}}
            onDelete={() => {}}
            activeCommentTagId={rvActiveCommentTagId}
            onToggleComments={tagId => { setRvSelectedTagId(tagId); setRvActiveCommentTagId(t => t === tagId ? null : tagId); }}
            commentCounts={REVIEWER_COMMENT_COUNTS}
            activeReviewId={REVIEWER_REVIEW.id}
            session={SESSION_EDUCATOR}
            onCommentsRead={() => {}}
          />

          {(() => {
            if (!rvSummaryViewOfficialId) return null;
            const slot = rvSummarySlots.find(([id]) => id === rvSummaryViewOfficialId);
            if (!slot) return null;
            const [id, name, role] = slot;
            const s = REVIEWER_REVIEW.officialSummaries?.[id];
            const hasSummaryText = !!(s && (s.positives || s.workOns || s.nextFocus));
            return (
              <Modal open onClose={() => setRvSummaryViewOfficialId(null)} title={`Summary — ${name}`} description={role}>
                <div className="grid gap-4">
                  {hasSummaryText && (
                    <div className="grid gap-3">
                      {s?.positives && <div><p className="mb-0.5 text-[11px] text-muted">Positives</p><p className="whitespace-pre-wrap text-sm text-text">{s.positives}</p></div>}
                      {s?.workOns && <div><p className="mb-0.5 text-[11px] text-muted">Development Notes</p><p className="whitespace-pre-wrap text-sm text-text">{s.workOns}</p></div>}
                      {s?.nextFocus && <div><p className="mb-0.5 text-[11px] text-muted">Focus for next game</p><p className="whitespace-pre-wrap text-sm text-text">{s.nextFocus}</p></div>}
                    </div>
                  )}
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Development Goals</p>
                    <ReviewDevelopmentPanel
                      compact
                      session={SESSION_EDUCATOR}
                      review={REVIEWER_REVIEW}
                      refereeId={id}
                      refereeName={name}
                      activeGoals={REVIEWER_GOALS.filter(g => g.refereeId === id && g.status === "Active")}
                      reviewGoalLinks={REVIEWER_GOAL_LINKS}
                      onCreateGoalFromReview={() => {}}
                      onLinkReviewToGoal={() => {}}
                      onUnlinkReviewFromGoal={() => {}}
                    />
                  </div>
                </div>
              </Modal>
            );
          })()}
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
