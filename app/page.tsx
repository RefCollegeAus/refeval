"use client";

import { Header } from "@/components/Header";
import { LoginScreen } from "@/components/LoginScreen";
import { OrganisationSelector } from "@/components/OrganisationSelector";
import { MembersScreen } from "@/components/admin/MembersScreen";
import { OrgSettingsScreen } from "@/components/admin/OrgSettingsScreen";
import { UserProfileScreen } from "@/components/admin/UserProfileScreen";
import { ClipLibraryScreen } from "@/components/admin/ClipLibraryScreen";
import { SimulatorBuilderScreen } from "@/components/admin/SimulatorBuilderScreen";
import { SimulatorRunnerScreen } from "@/components/learning/SimulatorRunnerScreen";
import { useSimulatorSessions } from "@/lib/hooks/useSimulatorSessions";
import { PlaylistsScreen } from "@/components/admin/PlaylistsScreen";
import { PlaylistDetailScreen } from "@/components/admin/PlaylistDetailScreen";
import { LearningAssignmentRunner } from "@/components/learning/LearningAssignmentRunner";
import { TeamManagementScreen } from "@/components/admin/TeamManagementScreen";
import { AssignmentsScreen } from "@/components/admin/AssignmentsScreen";
import { SimulatorAssignmentModal } from "@/components/admin/SimulatorAssignmentModal";
import { SimulatorAnalyticsDashboard } from "@/components/admin/SimulatorAnalyticsDashboard";
import { QuizBuilderScreen } from "@/components/admin/QuizBuilderScreen";
import { AssignmentDetailScreen } from "@/components/admin/AssignmentDetailScreen";
import { MyLearningScreen } from "@/components/referee/MyLearningScreen";
import { usePlaylists } from "@/lib/hooks/usePlaylists";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useAssignments } from "@/lib/hooks/useAssignments";
import { usePlaylistLearningClips } from "@/lib/hooks/usePlaylistLearningClips";
import type { Assignment, AssignmentUser } from "@/lib/types/assignments";
import { PERMISSIONS } from "@/lib/types/permissions";
import { hasPermission } from "@/lib/utils/permissions";
import { RefereeReviewScreen } from "@/components/referee/RefereeReviewScreen";
import { RefereeStatsHub } from "@/components/referee/RefereeStatsHub";
import { DateRangeFilter, datePassesFilter } from "@/components/common/DateRangeFilter";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { OnboardingPanel } from "@/components/common/OnboardingPanel";
import { GlobalSearch } from "@/components/common/GlobalSearch";
import { useOnboardingDismissed } from "@/lib/hooks/useOnboardingDismissed";
import { ReviewComments } from "@/components/ReviewComments";
import { CommentInbox } from "@/components/educator/CommentInbox";
import { EducatorDashboard } from "@/components/educator/EducatorDashboard";
import { LearningHub } from "@/components/educator/LearningHub";
import { LearningProgress } from "@/components/educator/LearningProgress";
import { GroupsScreen } from "@/components/educator/GroupsScreen";
import { RefereeDevelopmentScreen } from "@/components/educator/RefereeDevelopmentScreen";
import { ReviewDevelopmentPanel } from "@/components/educator/ReviewDevelopmentPanel";
import { RefereeCommentsScreen } from "@/components/referee/RefereeCommentsScreen";
import { RefereeGoalsPanel } from "@/components/referee/RefereeGoalsPanel";
import { RefereeGoalsScreen } from "@/components/referee/RefereeGoalsScreen";
import { useGroups } from "@/lib/hooks/useGroups";
import { useDevelopmentGoals } from "@/lib/hooks/useDevelopmentGoals";
import { useDevelopmentNotes } from "@/lib/hooks/useDevelopmentNotes";
import { useReviewGoalLinks } from "@/lib/hooks/useReviewGoalLinks";
import { OrganisationScreen } from "@/components/organisation/OrganisationScreen";
import { NotificationCentre } from "@/components/NotificationCentre";
import { useOrganisationSettings } from "@/lib/hooks/useOrganisationSettings";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useNotificationPreferences } from "@/lib/hooks/useNotificationPreferences";
import { useReminderEngine } from "@/lib/hooks/useReminderEngine";
import {
  makeReviewCompletedDraft,
  makeAssignmentAssignedDraft,
  makeAssignmentCompletedDraft,
  makeGoalAssignedDraft,
  makeGoalUpdatedDraft,
  makeNoteAddedDraft,
  getVisibleUnreadCount,
} from "@/lib/services/notifications";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play, Trash2, Eye, MessageSquare } from "lucide-react";
import { AppToast } from "@/components/common/AppToast";
import { showToast } from "@/lib/toast";
import * as XLSX from "xlsx";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { useOrganisations } from "@/lib/hooks/useOrganisations";
import { useReviews } from "@/lib/hooks/useReviews";
import { useViewOnlyGames } from "@/lib/hooks/useViewOnlyGames";
import { ViewerScreen } from "@/components/viewer/ViewerScreen";
import { formatTime, makeTimestampLink } from "@/lib/utils/time";
import { makeAnalytics } from "@/lib/utils/analytics";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
import { useUnreadCounts } from "@/lib/hooks/useUnreadCounts";
import type { Screen } from "@/lib/types/auth";
import type { ReviewRecord, CodedTag, Mode, RefSlot, OfficialSummaries, OfficialSummary } from "@/lib/types/reviews";

const OUTCOMES = ["Correct Call", "Correct No Call", "Incorrect Call", "Incorrect No Call", "Review"];
const OUTCOME_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  "Correct Call":       { color: "#30d158", bg: "rgba(48,209,88,.12)",  border: "rgba(48,209,88,.35)"  },
  "Correct No Call":    { color: "#30d158", bg: "rgba(48,209,88,.12)",  border: "rgba(48,209,88,.35)"  },
  "Incorrect Call":     { color: "#ff453a", bg: "rgba(255,69,58,.12)",  border: "rgba(255,69,58,.35)"  },
  "Incorrect No Call":  { color: "#ff453a", bg: "rgba(255,69,58,.12)",  border: "rgba(255,69,58,.35)"  },
  "Review":             { color: "#ff9f0a", bg: "rgba(255,159,10,.12)", border: "rgba(255,159,10,.35)" },
};
const CATEGORY_GROUPS = ["Foul", "Violation", "Mechanics", "Game Awareness", "Game Administration"];
const SPECIFIC_TAGS: Record<string, string[]> = {
  "Foul": ["Push","Block","Charge","Hands","Hold","Illegal Screen","Impact","Disruption","Hook","Head Contact","Unsportsmanlike","Technical","Disqualifying","Other"],
  "Violation": ["Travel","Out of Bounds","Double Dribble","Carry / Palming","Backcourt","3 Seconds","5 Seconds","8 Seconds","24 Seconds","Kick Ball","Jump Ball","Free Throw","Other"],
  "Mechanics": ["Positioning","Coverage","Closed Angle","Rotation","Signals","Communication","Whistle Timing","Process","Other"],
  "Game Awareness": ["Player Management","Bench Management","Preventative Officiating","Feel for Game","State of Game","Escalation","End of Quarter","Other"],
  "Game Administration": ["Inbound Location","Game Clock","Shot Clock","Timeout","Substitution","Correctable Error","Other"],
};
const POSITIONS = ["Trail", "Lead", "Centre"];
const COVERAGE = ["Primary", "Secondary", "Extended"];
const REF_SLOTS: RefSlot[] = ["All Referees", "Referee 1", "Referee 2", "Referee 3"];

const NON_VIDEO_KEYS: Record<string, Partial<CodedTag>> = {
  "1": { outcome: "Correct Call" }, "2": { outcome: "Correct No Call" },
  "3": { outcome: "Incorrect Call" }, "4": { outcome: "Incorrect No Call" },
  f: { category: "Foul - Personal" }, u: { category: "Foul - Flagrant" },
  d: { category: "Foul - Disruptive" }, t: { category: "Violation - Travel" },
  v: { category: "Violation - Other" }, r: { outcome: "Review" },
};
const KEY_LABELS = [["1", "Correct Call"], ["2", "Correct No Call"], ["3", "Incorrect Call"], ["4", "Incorrect No Call"], ["F", "Foul"], ["U", "Flagrant"], ["D", "Disruptive"], ["T", "Travel"], ["V", "Violation"], ["R", "Review"]];

function csvEscape(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function slotName(slot: RefSlot, r?: ReviewRecord) {
  if (!r) return slot;
  if (slot === "Referee 1") return r.referee1Name || "Crew Chief";
  if (slot === "Referee 2") return r.referee2Name || "Umpire 1";
  if (slot === "Referee 3") return r.referee3Name || "Umpire 2";
  return "All Referees";
}
function slotForUser(userId: string, r?: ReviewRecord): RefSlot | null {
  if (!r) return null;
  if (userId === r.referee1Id) return "Referee 1";
  if (userId === r.referee2Id) return "Referee 2";
  if (userId === r.referee3Id) return "Referee 3";
  return null;
}
function tagAppliesToSlot(tag: CodedTag, slot: RefSlot | null) {
  if (!slot) return false;
  if (tag.refereeTarget === "All Referees") return true;
  if (tag.refereeTarget === slot) return true;
  return (tag.extraReviewOfficials || []).includes(slot);
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);

  // --- Screen state ---
  const [screen, setScreen] = useState<Screen>("login");

  // --- Hooks ---
  const {
    session, pendingSession, authChecked,
    loginName, setLoginName, loginPassword, setLoginPassword, loginError,
    login, logout: authLogout, selectOrganisation, switchOrganisation, updateSessionProfile,
  } = useAuthSession(setScreen);

  const {
    organisations, members, refreshMembers, refreshOrganisations,
    refereeMembers, adminMembers, educatorMembers, superAdminMembers,
    organisationName, activeOrg,
  } = useOrganisations(session?.activeOrganisation?.id);

  const {
    games: viewOnlyGames,
    loading: viewOnlyGamesLoading,
    error: viewOnlyGamesError,
    createGame: createViewOnlyGame,
    updateGame: updateViewOnlyGame,
    deleteGame: deleteViewOnlyGame,
    canManage: canManageViewOnlyGames,
  } = useViewOnlyGames(session);

  const {
    reviews, tags, setTags,
    activeReviewId, setActiveReviewId,
    activeReview,
    reviewGame, setReviewGame,
    reviewGameDate, setReviewGameDate,
    reviewRef1, setReviewRef1,
    reviewRef2, setReviewRef2,
    reviewRef3, setReviewRef3,
    reviewVideoLink, setReviewVideoLink,
    reviewOffset, setReviewOffset,
    openForEdit,
    startNewReview: createNewReview,
    saveReviewMeta,
    deleteReview,
    upsertClip,
    deleteClip,
    removeFromLearningLibrary,
    clearReviewClips,
    assignedReviewsForReferee,
    reloadReviews,
  } = useReviews(session, members);

  // --- Navigation wrappers ---
  async function logout() {
    setActiveReviewId("");
    await authLogout();
  }

  async function startNewReview() {
    const review = await createNewReview();
    if (review) {
      openForEdit(review, true);
      setAnalyticsTarget("All Referees");
      setActiveCommentTagId(null);
      setIsNewReview(true);
      setScreen("reviewer");
    }
  }

  function openReviewForEdit(review: ReviewRecord, alreadyCreated = false) {
    openForEdit(review, alreadyCreated);
    setAnalyticsTarget("All Referees");
    setActiveCommentTagId(null);
    setIsNewReview(false);
    setScreen("reviewer");
  }

  async function cancelReview() {
    setConfirmDiscardReview(false);
    if (isNewReview && activeReviewId) {
      await deleteReview(activeReviewId);
    }
    setIsNewReview(false);
    setScreen("educator");
  }

  async function saveCompleteLater() { setIsNewReview(false); await saveReviewMeta("In Review"); setScreen("educator"); }
  function submitReview() {
    setDraftSummaries(activeReview?.officialSummaries || {});
    setSummaryModalOpen(true);
  }
  async function confirmSubmit() {
    const reviewSnapshot = activeReview;
    setIsNewReview(false);
    await saveReviewMeta("Completed", draftSummaries);
    // Only notify if the current user is one of the assigned referees
    if (reviewSnapshot && session?.activeOrganisation?.id) {
      const orgId = session.activeOrganisation.id;
      const educatorName = session.profile.name;
      const gameName = reviewSnapshot.game || "a game";
      const refIds = [reviewSnapshot.referee1Id, reviewSnapshot.referee2Id, reviewSnapshot.referee3Id]
        .filter((id): id is string => !!id);
      if (refIds.includes(session.user.id)) {
        addNotification(makeReviewCompletedDraft(orgId, session.user.id, reviewSnapshot.id, gameName, educatorName));
      }
    }
    setSummaryModalOpen(false);
    setScreen("educator");
  }
  function updateSummaryField(userId: string, field: keyof OfficialSummary, value: string) {
    setDraftSummaries(s => {
      const existing = s[userId] || { positives: "", workOns: "", nextFocus: "" };
      return { ...s, [userId]: { ...existing, [field]: value } };
    });
  }

  // --- Unread comment counts (used for badges) ---
  const { counts, refresh: refreshUnread, totalUnread } = useUnreadCounts(session);

  // --- Notifications ---
  const {
    notifications,
    unreadCount,
    createNotification: addNotification,
    markRead,
    markAllRead,
    deleteNotification: removeNotification,
  } = useNotifications(session?.user.id ?? null, session?.activeOrganisation?.id ?? null, session?.activeRole ?? null);

  const { preferences: notifPrefs, updatePreferences: updateNotifPrefs } =
    useNotificationPreferences(session?.user.id ?? null);

  const { isDismissed: onboardingDismissed, dismiss: dismissOnboarding } =
    useOnboardingDismissed(session?.user.id ?? null);

  const [showSearch, setShowSearch] = useState(false);

  const visibleUnreadCount = useMemo(
    () => getVisibleUnreadCount(notifications, notifPrefs),
    [notifications, notifPrefs],
  );

  const {
    playlists,
    loading: playlistsLoading,
    error: playlistsError,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    archivePlaylist,
    updateItemPositions,
    removeItem: removePlaylistItem,
    updateItemNote,
  } = usePlaylists(session?.activeOrganisation?.id ?? "", session?.user.id ?? "");

  // Which playlist is open in detail view
  const [playlistDetailId, setPlaylistDetailId] = useState<string | null>(null);

  const {
    permissionMap,
    loading: permissionsLoading,
    saveUserPerms,
  } = usePermissions(session?.activeOrganisation?.id ?? "");

  // --- Permission helpers for the current user ---
  const _userPerms = permissionMap.get(session?.user.id ?? "") ?? null;
  const _activeRole = session?.activeRole ?? null;
  const canViewClipLibrary  = hasPermission(_userPerms, _activeRole, PERMISSIONS.LEARNING_CLIP_LIBRARY);
  const canCreatePlaylists  = hasPermission(_userPerms, _activeRole, PERMISSIONS.LEARNING_CREATE_PLAYLISTS);
  const canEditPlaylists    = hasPermission(_userPerms, _activeRole, PERMISSIONS.LEARNING_EDIT_PLAYLISTS);
  const canDeletePlaylists  = hasPermission(_userPerms, _activeRole, PERMISSIONS.LEARNING_DELETE_PLAYLISTS);
  const canAccessPlaylists  = canViewClipLibrary || canCreatePlaylists || canEditPlaylists || canDeletePlaylists;
  const canViewAssignments   = hasPermission(_userPerms, _activeRole, PERMISSIONS.ASSIGNMENTS_VIEW);
  const canCreateAssignments = hasPermission(_userPerms, _activeRole, PERMISSIONS.ASSIGNMENTS_CREATE);
  const canEditAssignments   = hasPermission(_userPerms, _activeRole, PERMISSIONS.ASSIGNMENTS_EDIT);
  const canDeleteAssignments = hasPermission(_userPerms, _activeRole, PERMISSIONS.ASSIGNMENTS_DELETE);
  const canViewGroups   = hasPermission(_userPerms, _activeRole, PERMISSIONS.GROUPS_VIEW);
  const canCreateGroups = hasPermission(_userPerms, _activeRole, PERMISSIONS.GROUPS_CREATE);
  const canEditGroups   = hasPermission(_userPerms, _activeRole, PERMISSIONS.GROUPS_EDIT);
  const canDeleteGroups = hasPermission(_userPerms, _activeRole, PERMISSIONS.GROUPS_DELETE);

  // --- Assignments ---
  const {
    assignments,
    myAssignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    addUsersToAssignment,
    removeUserFromAssignment,
    updateAssignmentUserStatus,
    updateWatchedClips,
    saveReflectionDraft,
    submitReflection,
    saveQuizAnswers,
    submitQuiz,
  } = useAssignments(session?.activeOrganisation?.id ?? "", session?.user.id ?? "");

  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
    createGroup,
    updateGroup,
    deleteGroup,
    setGroupMembers,
  } = useGroups(session?.activeOrganisation?.id ?? "", session?.user.id ?? "");

  const orgSettings = useOrganisationSettings(
    session?.activeOrganisation?.id,
    session?.activeOrganisation?.name ?? activeOrg?.name ?? "",
  );

  const {
    goalDefs,
    allRefereeGoalViews,
    assignGoal,
    updateGoalDef,
    updateRefereeGoal,
    completeRefereeGoal,
    archiveRefereeGoal,
    reopenRefereeGoal,
    deleteRefereeGoal,
    refereeGoalViewsForReferee,
  } = useDevelopmentGoals(session?.activeOrganisation?.id, session?.user.id);

  const {
    notesForReferee,
    createNote,
    updateNote,
    deleteNote,
  } = useDevelopmentNotes(session?.activeOrganisation?.id, session?.user.id);

  // --- Reminder engine ---
  useReminderEngine({
    userId: session?.user.id ?? null,
    orgId: session?.activeOrganisation?.id ?? null,
    myAssignments,
    allRefereeGoalViews,
    addNotification,
  });

  const {
    reviewGoalLinks,
    clipGoalLinks,
    createReviewGoalLink,
    removeReviewGoalLink,
    linksForGoal,
  } = useReviewGoalLinks(session?.activeOrganisation?.id, session?.user.id);

  const [devGoalRefereeId, setDevGoalRefereeId] = useState<string | null>(null);

  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  // Tracks which assignment+user record a referee is viewing in the playlist
  const [learningAssignmentUser, setLearningAssignmentUser] = useState<{
    assignment: Assignment;
    assignmentUser: AssignmentUser;
  } | null>(null);

  // Keep learningAssignmentUser in sync with fresh hook data after load().
  // Without this, assignmentUser fields like reflectionSubmittedAt / quizSubmittedAt
  // remain stale snapshots, preventing canComplete from updating.
  const liveLearningAssignmentUser = useMemo(() => {
    if (!learningAssignmentUser) return null;
    const freshAssignment = myAssignments.find(a => a.id === learningAssignmentUser.assignment.id);
    if (!freshAssignment) return learningAssignmentUser;
    const freshAU = freshAssignment.assignmentUsers.find(u => u.id === learningAssignmentUser.assignmentUser.id);
    return {
      assignment: freshAssignment,
      assignmentUser: freshAU ?? learningAssignmentUser.assignmentUser,
    };
  }, [learningAssignmentUser, myAssignments]);

  // Fetch playlist clips via service-role API when referee is in learning mode.
  // This bypasses review RLS so clips tagged to other referees are visible.
  const {
    reviews: learningReviews,
    tags:    learningTags,
    loading: learningClipsLoading,
    error:   learningClipsError,
  } = usePlaylistLearningClips(
    learningAssignmentUser ? learningAssignmentUser.assignment.playlistId : null,
    learningAssignmentUser ? learningAssignmentUser.assignmentUser.id     : null,
  );

  // --- Search data (role-filtered) ---
  const searchableReviews = useMemo(
    () => session?.activeRole === "referee"
      ? assignedReviewsForReferee(session.user.id)
      : reviews.filter(r => !r.isSimulator),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.activeRole, session?.user.id, reviews],
  );

  const searchableGoals = useMemo(
    () => session?.activeRole === "referee"
      ? allRefereeGoalViews.filter(gv => gv.refereeId === session.user.id)
      : allRefereeGoalViews,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.activeRole, session?.user.id, allRefereeGoalViews],
  );

  // --- UI state ---
  const [mode, setMode] = useState<Mode>("video");
  const [analyticsTarget, setAnalyticsTarget] = useState<RefSlot>("All Referees");
  const [videoCurrent, setVideoCurrent] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [youtubeCurrent, setYoutubeCurrent] = useState(0);
  const [youtubeDuration, setYoutubeDuration] = useState(0);
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const [codingOpen, setCodingOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [codingSecond, setCodingSecond] = useState(0);
  const [shouldResumeVideo, setShouldResumeVideo] = useState(false);
  const [draftRefereeTarget, setDraftRefereeTarget] = useState<RefSlot>("All Referees");
  const [draftExtraOfficials, setDraftExtraOfficials] = useState<RefSlot[]>([]);
  const [draftOutcome, setDraftOutcome] = useState("");
  const [draftCategoryGroup, setDraftCategoryGroup] = useState("");
  const [draftSpecificTag, setDraftSpecificTag] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftPosition, setDraftPosition] = useState("");
  const [draftCoverage, setDraftCoverage] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftIsLearningClip, setDraftIsLearningClip] = useState(false);
  const [codingError, setCodingError] = useState("");
  const [wizardStep, setWizardStep] = useState(1);

  // --- Final summary modal ---
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [draftSummaries, setDraftSummaries] = useState<OfficialSummaries>({});
  const [summaryActiveIdx, setSummaryActiveIdx] = useState(0);

  // --- Video frame controls (educator reviewer) ---


  // --- Referee review seek-to-clip (from Watch Clip button in comments) ---
  const [refReviewSeekTagId, setRefReviewSeekTagId] = useState<string | null>(null);

  // --- Referee home date filter ---
  const [refDateFilter, setRefDateFilter] = useState<import("@/components/common/DateRangeFilter").DateRangeValue>(
    { preset: "all", from: "", to: "" }
  );

  const [activeCommentTagId, setActiveCommentTagId] = useState<string | null>(null);
  // Setup modal — auto-opens only for brand-new reviews
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  // Tracks whether the current reviewer session is a brand-new unsaved review.
  // When true, Cancel deletes the DB record; when false, Cancel just navigates back.
  const [isNewReview, setIsNewReview] = useState(false);
  const [confirmDiscardReview, setConfirmDiscardReview] = useState(false);
  const [confirmClearTags, setConfirmClearTags] = useState(false);
  // Navigation context — tracks where learning sub-screens should return to
  const [returnToScreen, setReturnToScreen] = useState<Screen>("educator");

  // Simulator
  const {
    sessions: simulatorSessions,
    attempts: simulatorAttempts,
    loading: simulatorLoading,
    createSession: createSimulatorSession,
    updateSession: updateSimulatorSession,
    publishSimulator: publishSimulatorSession,
    deleteSession: deleteSimulatorSession,
    createAttempt: createSimulatorAttempt,
    saveResponse: saveSimulatorResponse,
    completeAttempt: completeSimulatorAttempt,
  } = useSimulatorSessions(session);
  const [simulatorRunnerSessionId, setSimulatorRunnerSessionId] = useState<string | null>(null);
  const [simulatorRunnerAssignmentUserId, setSimulatorRunnerAssignmentUserId] = useState<string | null>(null);
  const [simulatorAssignModalSessionId, setSimulatorAssignModalSessionId] = useState<string | null>(null);
  const [simulatorAnalyticsSessionId, setSimulatorAnalyticsSessionId] = useState<string | null>(null);

  // --- Auth callback error (from ?error= param set by /auth/callback on failure) ---
  const [urlAuthError, setUrlAuthError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setUrlAuthError(decodeURIComponent(err));
      // Remove the param from the URL without reloading.
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, []);

  // --- Derived values ---
  const reviewTags = useMemo(() => tags.filter(t => t.reviewId === activeReviewId).sort((a, b) => a.seconds - b.seconds), [tags, activeReviewId]);
  const analyticsTags = useMemo(() => {
    if (analyticsTarget === "All Referees") return reviewTags;
    return reviewTags.filter(t => tagAppliesToSlot(t, analyticsTarget));
  }, [reviewTags, analyticsTarget]);
  const analytics = useMemo(() => makeAnalytics(analyticsTags), [analyticsTags]);

  const recentSpecificTags = useMemo(() => {
    if (!draftCategoryGroup) return [];
    const prefix = draftCategoryGroup + " — ";
    const counts: Record<string, number> = {};
    for (const t of reviewTags) {
      if ((t.category || "").startsWith(prefix)) {
        const specific = t.category!.slice(prefix.length);
        if (specific) counts[specific] = (counts[specific] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);
  }, [draftCategoryGroup, reviewTags]);

  const activeVideoLink = reviewVideoLink || activeReview?.videoLink || "";
  const youtubeVideoId = getYouTubeId(activeVideoLink);
  const usingYouTubeVideo = mode === "video" && !!youtubeVideoId;
  const isUnsupportedVideo = mode === "video" && !!activeVideoLink && !youtubeVideoId && !isDirectVideoUrl(activeVideoLink);
  const currentSeconds = mode === "video" ? (usingYouTubeVideo ? youtubeCurrent : videoCurrent) : timerSeconds;
  const maxTagSeconds = reviewTags.reduce((max, t) => Math.max(max, t.seconds), 0);
  const scaleSeconds = mode === "video" ? (usingYouTubeVideo ? youtubeDuration || Math.max(60, maxTagSeconds) : videoDuration || Math.max(60, maxTagSeconds)) : Math.max(60, timerSeconds, maxTagSeconds);
  const progressPct = Math.min(100, (currentSeconds / scaleSeconds) * 100 || 0);

  // --- YouTube player effect ---
  useEffect(() => {
    if (!usingYouTubeVideo || screen !== "reviewer") return;
    let cancelled = false;
    function loadPlayer() {
      if (cancelled || !youtubeContainerRef.current || !window.YT?.Player) return;
      if (youtubePlayerRef.current?.destroy) youtubePlayerRef.current.destroy();
      setYoutubeReady(false);
      youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
        videoId: youtubeVideoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (event: any) => {
            setYoutubeReady(true);
            setYoutubeDuration(event.target.getDuration?.() || 0);
          },
          onStateChange: (event: any) => {
            setYoutubeCurrent(event.target.getCurrentTime?.() || 0);
            setYoutubeDuration(event.target.getDuration?.() || 0);
          }
        }
      });
    }
    if (window.YT?.Player) loadPlayer();
    else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
      window.onYouTubeIframeAPIReady = loadPlayer;
    }
    return () => { cancelled = true; if (youtubePlayerRef.current?.destroy) { try { youtubePlayerRef.current.destroy(); } catch {} youtubePlayerRef.current = null; } };
  }, [usingYouTubeVideo, youtubeVideoId, screen]);

  useEffect(() => {
    if (!usingYouTubeVideo || screen !== "reviewer") return;
    const interval = setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player?.getCurrentTime) return;
      setYoutubeCurrent(player.getCurrentTime() || 0);
      setYoutubeDuration(player.getDuration?.() || 0);
    }, 250);
    return () => clearInterval(interval);
  }, [usingYouTubeVideo, screen]);

  useEffect(() => {
    if (!timerRunning || mode !== "non-video") return;
    const interval = setInterval(() => setTimerSeconds(s => s + 0.2), 200);
    return () => clearInterval(interval);
  }, [timerRunning, mode]);


  // --- Tag / coding helpers ---
  function resetDrafts() {
    setDraftRefereeTarget("All Referees"); setDraftExtraOfficials([]); setDraftOutcome(""); setDraftCategoryGroup(""); setDraftSpecificTag(""); setDraftCategory(""); setDraftPosition(""); setDraftCoverage(""); setDraftNotes(""); setDraftIsLearningClip(false); setCodingError("");
  }

  function buildTag(baseSeconds: number, tagMode: Mode, patch: Partial<CodedTag>): CodedTag {
    const seconds = Math.max(0, baseSeconds);
    const adjustedSeconds = Math.max(0, seconds + Number(activeReview?.timestampOffset || 0));
    const primary = patch.refereeTarget || draftRefereeTarget || "All Referees";
    const extras = patch.extraReviewOfficials || draftExtraOfficials || [];
    return {
      id: patch.id || crypto.randomUUID(),
      reviewId: activeReviewId,
      organisationId: activeReview?.organisationId || session?.activeOrganisation?.id || "",
      seconds, time: formatTime(seconds), adjustedSeconds, adjustedTime: formatTime(adjustedSeconds),
      mode: tagMode, refereeTarget: primary, extraReviewOfficials: extras,
      clipOfficials: [{ slot: primary, type: "Call" }, ...extras.map(slot => ({ slot, type: "Review" as const }))],
      timestampLink: makeTimestampLink(activeReview?.videoLink || "", adjustedSeconds),
      outcome: patch.outcome, category: patch.category, position: patch.position, coverage: patch.coverage, notes: patch.notes,
      isLearningClip: patch.isLearningClip ?? draftIsLearningClip,
      createdAt: patch.createdAt || new Date().toISOString()
    };
  }

  function getCurrentCodingSeconds(): number {
    if (mode === "video" && usingYouTubeVideo && youtubePlayerRef.current?.getCurrentTime) return youtubePlayerRef.current.getCurrentTime() || 0;
    if (mode === "video") return videoRef.current?.currentTime ?? videoCurrent;
    return timerSeconds;
  }

  function playbackSeconds() {
    return getCurrentCodingSeconds();
  }

  function pauseActiveVideo() {
    if (usingYouTubeVideo && youtubePlayerRef.current?.pauseVideo) {
      const wasPlaying = youtubePlayerRef.current.getPlayerState?.() === 1;
      youtubePlayerRef.current.pauseVideo();
      setYoutubeCurrent(youtubePlayerRef.current.getCurrentTime?.() || youtubeCurrent);
      return wasPlaying;
    }
    const video = videoRef.current;
    const wasPlaying = video ? !video.paused : false;
    if (video) video.pause();
    return wasPlaying;
  }

  function playActiveVideo() {
    if (usingYouTubeVideo && youtubePlayerRef.current?.playVideo) youtubePlayerRef.current.playVideo();
    else videoRef.current?.play();
  }

  function openVideoCoding() {
    if (isUnsupportedVideo) {
      showToast("This video type cannot be tagged — RefCoach cannot read its playback time. Use a YouTube link or direct MP4/WebM URL.", "error");
      return;
    }
    saveReviewMeta();
    const current = getCurrentCodingSeconds();
    const wasPlaying = pauseActiveVideo();
    setEditingTagId(null); setShouldResumeVideo(wasPlaying); setCodingSecond(Math.max(0, current)); resetDrafts(); setWizardStep(1); setCodingOpen(true);
  }

  function openEditTag(tag: CodedTag) {
    if (tag.mode !== "video") return;
    const wasPlaying = pauseActiveVideo();
    setEditingTagId(tag.id); setShouldResumeVideo(wasPlaying); setCodingSecond(tag.seconds);
    setDraftRefereeTarget(tag.refereeTarget || "All Referees"); setDraftExtraOfficials(tag.extraReviewOfficials || []);
    setDraftOutcome(tag.outcome || ""); setDraftPosition(tag.position || ""); setDraftCoverage(tag.coverage || ""); setDraftNotes(tag.notes || ""); setDraftIsLearningClip(tag.isLearningClip ?? false);
    const catVal = tag.category || "";
    const emSep = catVal.indexOf(" — ");
    if (emSep !== -1) {
      setDraftCategoryGroup(catVal.slice(0, emSep));
      setDraftSpecificTag(catVal.slice(emSep + 3));
      setDraftCategory(catVal);
    } else {
      const dashSep = catVal.indexOf(" - ");
      const guessGroup = dashSep !== -1 ? catVal.slice(0, dashSep) : catVal;
      setDraftCategoryGroup(CATEGORY_GROUPS.includes(guessGroup) ? guessGroup : "");
      setDraftSpecificTag("");
      setDraftCategory(catVal);
    }
    setWizardStep(1); setCodingOpen(true);
  }

  async function saveVideoCode() {
    if (!draftOutcome) { setWizardStep(1); setCodingError("Please select an Outcome."); return; }
    if (!draftCoverage) { setWizardStep(2); setCodingError("Please select a Coverage area."); return; }
    if (!draftPosition) { setWizardStep(3); setCodingError("Please select a Position."); return; }
    if (!draftCategoryGroup) { setWizardStep(4); setCodingError("Please select a Category."); return; }
    if (!draftSpecificTag) { setWizardStep(5); setCodingError("Please select a Specific Tag."); return; }
    const finalCategory = `${draftCategoryGroup} — ${draftSpecificTag}`;
    setCodingError("");
    const patch = {
      id: editingTagId || undefined,
      refereeTarget: draftRefereeTarget, extraReviewOfficials: draftExtraOfficials,
      outcome: draftOutcome, category: finalCategory, position: draftPosition,
      coverage: draftCoverage, notes: draftNotes, isLearningClip: draftIsLearningClip,
      createdAt: editingTagId ? tags.find(t => t.id === editingTagId)?.createdAt : undefined,
    };
    const tag = buildTag(codingSecond, "video", patch);
    await upsertClip(tag);
    if (editingTagId) setTags(items => items.map(item => item.id === editingTagId ? tag : item));
    else setTags(items => [...items, tag]);
    setCodingOpen(false);
    setEditingTagId(null);
    if (shouldResumeVideo) playActiveVideo();
  }

  async function quickNonVideoTag(patch: Partial<CodedTag>) {
    saveReviewMeta();
    const tag = buildTag(timerSeconds - 10, "non-video", { ...patch, refereeTarget: "All Referees", extraReviewOfficials: [] });
    setTags(items => [...items, tag]);
    await upsertClip(tag);
  }

  function toggleExtra(slot: RefSlot) {
    if (slot === draftRefereeTarget) return;
    setDraftExtraOfficials(items => items.includes(slot) ? items.filter(i => i !== slot) : [...items, slot]);
  }

  function jump(seconds: number) {
    if (mode === "video") {
      if (usingYouTubeVideo && youtubePlayerRef.current?.seekTo) { youtubePlayerRef.current.seekTo(seconds, true); youtubePlayerRef.current.playVideo?.(); setYoutubeCurrent(seconds); }
      else if (videoRef.current) { videoRef.current.currentTime = seconds; videoRef.current.play(); }
    } else setTimerSeconds(seconds);
  }

  // Auto-open setup modal when a brand-new review is opened
  useEffect(() => {
    if (!activeReviewId) { setSetupModalOpen(false); return; }
    const r = reviews.find(rv => rv.id === activeReviewId);
    setSetupModalOpen(!r || !r.game || r.game === "New Review");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReviewId]);

  // Guard: non-admin roles cannot visit admin-only screens.
  // Must be declared before any early return to satisfy the Rules of Hooks.
  useEffect(() => {
    const adminOnlyScreens: Screen[] = ["database", "org-settings", "team-management", "organisation"];
    if (
      adminOnlyScreens.includes(screen) &&
      session?.activeRole !== "admin" &&
      session?.activeRole !== "super_admin"
    ) {
      setScreen(session?.activeRole === "viewer" ? "viewer" : "educator");
    }
    // Clip Library + Playlists: educator, admin, super_admin only (role gate)
    const managementRoles = ["educator", "admin", "super_admin"];
    // Educator screen: management only — referees and viewers must not land here
    if (screen === "educator" && session?.activeRole && !managementRoles.includes(session.activeRole)) {
      setScreen(session.activeRole === "viewer" ? "viewer" : "referee");
    }
    // Comment inbox: educator/admin/super_admin only
    if (screen === "comment-inbox" && session?.activeRole && !managementRoles.includes(session.activeRole)) {
      setScreen(session.activeRole === "viewer" ? "viewer" : "referee");
    }
    // clip-library and playlists list are management-only with no exceptions
    if (
      (screen === "clip-library" || screen === "learning-library" || screen === "playlists") &&
      session?.activeRole &&
      !managementRoles.includes(session.activeRole)
    ) {
      setScreen(session.activeRole === "viewer" ? "viewer" : "referee");
    }
    // playlist-detail: management roles always; referees only when in learning mode
    if (
      screen === "playlist-detail" &&
      session?.activeRole &&
      !managementRoles.includes(session.activeRole) &&
      !learningAssignmentUser
    ) {
      setScreen(session.activeRole === "viewer" ? "viewer" : "referee");
    }
    // Clip Library + Playlists: permission gate (within management roles)
    if ((screen === "clip-library" || screen === "learning-library") && session?.activeRole && managementRoles.includes(session.activeRole) && !canViewClipLibrary) {
      setScreen("educator");
    }
    if ((screen === "playlists" || screen === "playlist-detail") && session?.activeRole && managementRoles.includes(session.activeRole) && !canAccessPlaylists) {
      setScreen("educator");
    }
    // Assignments: educator, admin, super_admin only; permission gate
    if ((screen === "assignments" || screen === "assignment-detail" || screen === "quiz-builder") && session?.activeRole && !managementRoles.includes(session.activeRole)) {
      setScreen(session.activeRole === "viewer" ? "viewer" : "referee");
    }
    if ((screen === "assignments" || screen === "assignment-detail" || screen === "quiz-builder") && session?.activeRole && managementRoles.includes(session.activeRole) && !canViewAssignments) {
      setScreen("educator");
    }
    // My Learning / Learning Runner: referee/educator only (viewers cannot)
    if ((screen === "my-learning" || screen === "learning-runner") && session?.activeRole === "viewer") {
      setScreen("viewer");
    }
    // Learning Runner: requires an active assignment context
    if (screen === "learning-runner" && !learningAssignmentUser) {
      setScreen("my-learning");
    }
    // Learning Hub + Progress: educator/admin/super_admin only
    if ((screen === "learning-hub" || screen === "learning-progress") && session?.activeRole && !managementRoles.includes(session.activeRole)) {
      setScreen(session.activeRole === "viewer" ? "viewer" : "referee");
    }
    // Learning Hub: any learning permission is sufficient; redirect only if none
    if (screen === "learning-hub" && session?.activeRole && managementRoles.includes(session.activeRole) && !canViewClipLibrary && !canAccessPlaylists && !canViewAssignments && !canViewGroups) {
      setScreen("educator");
    }
    // Learning Progress: specifically requires assignment visibility
    if (screen === "learning-progress" && session?.activeRole && managementRoles.includes(session.activeRole) && !canViewAssignments) {
      setScreen("learning-hub");
    }
    // Groups: educator/admin/super_admin only; permission gate
    if (screen === "groups" && session?.activeRole && !managementRoles.includes(session.activeRole)) {
      setScreen(session.activeRole === "viewer" ? "viewer" : "referee");
    }
    if (screen === "groups" && session?.activeRole && managementRoles.includes(session.activeRole) && !canViewGroups) {
      setScreen("educator");
    }
    // Simulator builder: educator/admin/super_admin only
    if (screen === "simulator-builder" && session?.activeRole && !managementRoles.includes(session.activeRole)) {
      setScreen(session.activeRole === "viewer" ? "viewer" : "referee");
    }
    // Simulator analytics: educator/admin/super_admin only
    if (screen === "simulator-analytics" && session?.activeRole && !managementRoles.includes(session.activeRole)) {
      setScreen(session.activeRole === "viewer" ? "viewer" : "referee");
    }
    // Simulator runner: not viewers
    if (screen === "simulator-runner" && session?.activeRole === "viewer") {
      setScreen("viewer");
    }
    // referee-goals: referees and management only (not viewers)
    if (screen === "referee-goals" && session?.activeRole === "viewer") {
      setScreen("viewer");
    }
    // Viewers cannot access educator/referee/reviewer screens
    const viewerForbidden: Screen[] = ["educator", "referee", "reviewer", "refereeReview", "comment-inbox", "referee-stats", "referee-development", "referee-comments", "referee-goals", "database", "org-settings", "clip-library", "learning-library", "playlists", "playlist-detail", "team-management", "assignments", "assignment-detail", "quiz-builder", "my-learning", "learning-runner", "learning-hub", "learning-progress", "groups", "organisation", "simulator-builder", "simulator-runner", "simulator-analytics"];
    if (session?.activeRole === "viewer" && viewerForbidden.includes(screen)) {
      setScreen("viewer");
    }
  }, [screen, session?.activeRole, canViewClipLibrary, canAccessPlaylists, canViewAssignments, canViewGroups, learningAssignmentUser]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || screen !== "reviewer") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (mode === "video") {
          if (usingYouTubeVideo && youtubePlayerRef.current?.getPlayerState) {
            youtubePlayerRef.current.getPlayerState() === 1 ? youtubePlayerRef.current.pauseVideo() : youtubePlayerRef.current.playVideo();
          } else { const video = videoRef.current; if (!video) return; video.paused ? video.play() : video.pause(); }
        } else setTimerRunning(r => !r);
        return;
      }
      if (mode === "video" && e.key.toLowerCase() === "x") { e.preventDefault(); openVideoCoding(); return; }
      if (mode === "non-video") { const patch = NON_VIDEO_KEYS[e.key.toLowerCase()]; if (patch) { e.preventDefault(); quickNonVideoTag(patch); } }
    }
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  });

  // --- Export helpers ---
  function rowsForTags(sourceTags: CodedTag[]) {
    return sourceTags.map(tag => ({
      Game: activeReview?.game || "", Status: activeReview?.status || "",
      "Crew Chief": activeReview?.referee1Name || "", "Umpire 1": activeReview?.referee2Name || "", "Umpire 2": activeReview?.referee3Name || "",
      "Primary Tagged Official": slotName(tag.refereeTarget, activeReview),
      "Extra Review Officials": (tag.extraReviewOfficials || []).map(s => slotName(s, activeReview)).join(", "),
      Educator: activeReview?.educatorName || "", Mode: tag.mode, "Video Link": activeReview?.videoLink || "", "Timestamp Link": tag.timestampLink || "",
      "Review Time": tag.time, "Review Seconds": tag.seconds.toFixed(2), "Adjusted Video Time": tag.adjustedTime, "Adjusted Video Seconds": tag.adjustedSeconds.toFixed(2),
      Outcome: tag.outcome || "", Coverage: tag.coverage || "", Position: tag.position || "", Category: tag.category || "", Notes: tag.notes || ""
    }));
  }

  function analyticsRows(target: RefSlot) {
    const targetTags = target === "All Referees" ? reviewTags : reviewTags.filter(t => tagAppliesToSlot(t, target));
    const a = makeAnalytics(targetTags);
    const rows: Record<string, string | number>[] = [
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Total coded clips", Value: a.total },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Accuracy", Value: a.accuracy },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Correct Calls", Value: a.correctCalls },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Correct No Calls", Value: a.correctNoCalls },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Incorrect Calls", Value: a.incorrectCalls },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Incorrect No Calls", Value: a.incorrectNoCalls },
      { Referee: slotName(target, activeReview), Section: "Summary", Metric: "Reviews", Value: a.reviews },
    ];
    const add = (section: string, entries: [string, number][]) => entries.forEach(([name, count]) => rows.push({ Referee: slotName(target, activeReview), Section: section, Metric: name, Value: count }));
    add("Outcome", a.outcomeCounts); add("Coverage", a.coverageCounts); add("Position", a.positionCounts); add("Category", a.categoryCounts);
    return rows;
  }

  function exportCsv() {
    saveReviewMeta();
    const rows = rowsForTags(reviewTags);
    const headers = Object.keys(rows[0] || { Game: "", Status: "", "Crew Chief": "", "Umpire 1": "", "Umpire 2": "", "Primary Tagged Official": "", "Extra Review Officials": "", Educator: "", Mode: "", "Video Link": "", "Timestamp Link": "", "Review Time": "", "Review Seconds": "", "Adjusted Video Time": "", "Adjusted Video Seconds": "", Outcome: "", Coverage: "", Position: "", Category: "", Notes: "" });
    const csv = [headers, ...rows.map(row => headers.map(h => row[h as keyof typeof row]))].map(row => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "referee-coded-timestamps.csv"; a.click(); URL.revokeObjectURL(url);
  }

  function exportExcel() {
    saveReviewMeta();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsForTags(reviewTags)), "Coded Clips");
    for (const target of REF_SLOTS) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analyticsRows(target)), (target === "All Referees" ? "Analytics - All" : `Analytics - ${target}`).substring(0, 31));
    XLSX.writeFile(wb, "referee-review-analytics.xlsx");
  }

  // --- Render ---
  if (!authChecked) return null;

  // Mounted once here; renders into document.body via a portal regardless of which screen is active.
  const appToast = <AppToast />;

  const globalSearchOverlay = showSearch && session ? (
    <GlobalSearch
      session={session}
      searchableReviews={searchableReviews}
      searchableAssignments={session.activeRole === "referee" ? myAssignments : assignments}
      playlists={session.activeRole === "referee" ? [] : playlists}
      members={session.activeRole === "referee" ? [] : members}
      groups={session.activeRole === "referee" ? [] : groups}
      searchableGoals={searchableGoals}
      onNavigate={setScreen}
      onOpenReview={openReviewForEdit}
      onNavigatePlaylist={(id) => { setPlaylistDetailId(id); setScreen("playlist-detail"); }}
      onNavigateDevelopment={(rid) => { setDevGoalRefereeId(rid); setScreen("referee-development"); }}
      onClose={() => setShowSearch(false)}
    />
  ) : null;

  if (screen === "login")
    return (
      <main>
        <Header session={null} onHome={() => {}} onAdmin={() => {}} onProfile={() => {}} onLogout={logout} />
        <LoginScreen
          loginName={loginName} setLoginName={setLoginName}
          loginPassword={loginPassword} setLoginPassword={setLoginPassword}
          loginError={loginError || urlAuthError} login={login}
        />
      {globalSearchOverlay}{appToast}</main>
    );

  if (screen === "org-selector" && pendingSession)
    return (
      <main>
        <Header session={null} onHome={() => {}} onAdmin={() => {}} onProfile={() => {}} onLogout={logout} />
        <OrganisationSelector
          memberships={pendingSession.memberships}
          onSelect={selectOrganisation}
          onLogout={logout}
        />
      {globalSearchOverlay}{appToast}</main>
    );

  if (screen === "viewer" && session) {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen("viewer")}
          onAdmin={() => {}}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <ViewerScreen
          session={session}
          games={viewOnlyGames}
          loading={viewOnlyGamesLoading}
          error={viewOnlyGamesError}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "database") {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : "educator")}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <MembersScreen
          session={session!}
          onNavigateSettings={() => setScreen("org-settings")}
          onNavigateTeam={
            session?.activeRole === "admin" || session?.activeRole === "super_admin"
              ? () => setScreen("team-management")
              : undefined
          }
          onRefreshOrgMembers={refreshMembers}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "org-settings") {
    const org = activeOrg ?? organisations[0];
    if (!org) return null;
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : "educator")}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <OrgSettingsScreen
          session={session!}
          org={org}
          onSaved={() => refreshOrganisations()}
          onNavigateMembers={() => setScreen("database")}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "organisation") {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : "educator")}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <OrganisationScreen
          session={session!}
          org={activeOrg}
          members={members}
          reviews={reviews}
          assignments={assignments}
          settings={orgSettings.settings}
          onUpdateSettings={orgSettings.updateSettings}
          onBack={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : "educator")}
          onNavigateMembers={() => setScreen("database")}
          groupCount={groups.length}
          activeGoalCount={allRefereeGoalViews.filter(v => v.status === "Active").length}
          groups={groups}
          groupsLoading={groupsLoading}
          groupsError={groupsError}
          canCreateGroups={canCreateGroups}
          canEditGroups={canEditGroups}
          canDeleteGroups={canDeleteGroups}
          onCreateGroup={async input => { await createGroup(input); }}
          onUpdateGroup={async (id, input) => { await updateGroup(id, input); }}
          onDeleteGroup={async id => { await deleteGroup(id); }}
          onSetGroupMembers={async (groupId, userIds) => { await setGroupMembers(groupId, userIds); }}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "clip-library") {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : returnToScreen)}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <ClipLibraryScreen
          key="clip-library"
          session={session!}
          reviews={reviews}
          tags={tags}
          onBack={() => setScreen(returnToScreen)}
          onOpenReview={(reviewId) => {
            const r = reviews.find(x => x.id === reviewId);
            if (r) openReviewForEdit(r);
          }}
          canCreatePlaylists={canCreatePlaylists}
          onCreatePlaylist={createPlaylist}
          onViewPlaylist={(id) => { setPlaylistDetailId(id); setScreen("playlist-detail"); }}
          onRemoveFromLearningLibrary={removeFromLearningLibrary}
          onNavigateToQuizBuilder={() => setScreen("quiz-builder")}
          onNavigateToLearningLibrary={() => { setReturnToScreen("learning-hub"); setScreen("learning-library"); }}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "learning-library") {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : returnToScreen)}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <ClipLibraryScreen
          key="learning-library"
          session={session!}
          reviews={reviews}
          tags={tags}
          onBack={() => setScreen(returnToScreen)}
          onOpenReview={(reviewId) => {
            const r = reviews.find(x => x.id === reviewId);
            if (r) openReviewForEdit(r);
          }}
          canCreatePlaylists={canCreatePlaylists}
          onCreatePlaylist={createPlaylist}
          onViewPlaylist={(id) => { setPlaylistDetailId(id); setScreen("playlist-detail"); }}
          initialTab="learning"
          onRemoveFromLearningLibrary={removeFromLearningLibrary}
          onNavigateToQuizBuilder={() => setScreen("quiz-builder")}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "playlists") {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : returnToScreen)}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <PlaylistsScreen
          session={session!}
          playlists={playlists}
          loading={playlistsLoading}
          error={playlistsError}
          members={members}
          assignments={assignments}
          onViewPlaylist={(id) => { setPlaylistDetailId(id); setScreen("playlist-detail"); }}
          onDeletePlaylist={deletePlaylist}
          onArchivePlaylist={archivePlaylist}
          canDelete={canDeletePlaylists}
          onBack={() => setScreen(returnToScreen)}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "playlist-detail") {
    const activePlaylist = playlists.find(p => p.id === playlistDetailId);
    if (!activePlaylist) {
      setScreen("playlists");
      return null;
    }
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : returnToScreen)}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <PlaylistDetailScreen
          playlist={activePlaylist}
          reviews={reviews}
          tags={tags}
          onOpenReview={(reviewId) => {
            const r = reviews.find(x => x.id === reviewId);
            if (r) openReviewForEdit(r);
          }}
          canEdit={canEditPlaylists}
          canDelete={canDeletePlaylists}
          canAssign={canCreateAssignments}
          assignments={assignments.filter(a => a.playlistId === activePlaylist.id)}
          members={members}
          groups={groups}
          onCreateAssignment={async (input) => {
            const assignmentId = await createAssignment(input);
            // Only notify the current user if they are one of the assignees
            if (session?.activeOrganisation?.id && input.userIds.includes(session.user.id)) {
              addNotification(makeAssignmentAssignedDraft(
                session.activeOrganisation.id,
                session.user.id,
                assignmentId,
                input.title,
                session.profile.name,
              ));
            }
          }}
          onAddToAssignment={async (assignmentId, userIds) => {
            const result = await addUsersToAssignment(assignmentId, userIds);
            const assignment = assignments.find(a => a.id === assignmentId);
            // Only notify the current user if they are one of the newly added assignees
            if (assignment && session?.activeOrganisation?.id && userIds.includes(session.user.id)) {
              addNotification(makeAssignmentAssignedDraft(
                session.activeOrganisation.id,
                session.user.id,
                assignmentId,
                assignment.title,
                session.profile.name,
              ));
            }
            return result;
          }}
          onViewAssignment={(assignmentId) => {
            setActiveAssignmentId(assignmentId);
            setScreen("assignment-detail");
          }}
          onUpdateItemNote={canEditPlaylists ? updateItemNote : undefined}
          onUpdateMeta={updatePlaylist}
          onUpdatePositions={updateItemPositions}
          onRemoveItem={removePlaylistItem}
          onDelete={async (id) => { await deletePlaylist(id); setPlaylistDetailId(null); setScreen("playlists"); }}
          onArchive={async (id) => { await archivePlaylist(id); setPlaylistDetailId(null); setScreen("playlists"); }}
          onBack={() => setScreen("playlists")}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "assignments") {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : returnToScreen)}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <AssignmentsScreen
          session={session!}
          assignments={assignments}
          playlists={playlists}
          members={members}
          groups={groups}
          simulatorSessions={simulatorSessions.filter(s => {
            const rev = reviews.find(r => r.id === s.reviewId);
            return rev?.status === "Completed";
          }).map(s => ({ id: s.id, title: s.title }))}
          loading={assignmentsLoading}
          error={assignmentsError}
          canDelete={canDeleteAssignments}
          onView={(id) => { setActiveAssignmentId(id); setScreen("assignment-detail"); }}
          onDelete={deleteAssignment}
          onNewQuiz={() => setScreen("quiz-builder")}
          onNewSimulator={() => setSimulatorAssignModalSessionId("__pick__")}
          onBack={() => setScreen(returnToScreen)}
        />
        {simulatorAssignModalSessionId !== null && (() => {
          const publishedSimSessions = simulatorSessions
            .filter(s => { const rev = reviews.find(r => r.id === s.reviewId); return rev?.status === "Completed"; })
            .map(s => ({ id: s.id, title: s.title }));
          return (
            <SimulatorAssignmentModal
              sessions={publishedSimSessions}
              members={members}
              groups={groups}
              initialSessionId={simulatorAssignModalSessionId}
              onCreate={async (input) => { await createAssignment(input); }}
              onClose={() => setSimulatorAssignModalSessionId(null)}
            />
          );
        })()}
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "assignment-detail") {
    const activeAssignment = assignments.find(a => a.id === activeAssignmentId);
    if (!activeAssignment) { setScreen("assignments"); return null; }
    const activeAssignmentPlaylist = playlists.find(p => p.id === activeAssignment.playlistId) ?? null;
    const activeAssignmentSimulatorTitle = activeAssignment.simulatorSessionId
      ? (simulatorSessions.find(s => s.id === activeAssignment.simulatorSessionId)?.title ?? null)
      : null;
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : returnToScreen)}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <AssignmentDetailScreen
          assignment={activeAssignment}
          playlist={activeAssignmentPlaylist}
          simulatorSessionTitle={activeAssignmentSimulatorTitle}
          simulatorAttempts={simulatorAttempts}
          members={members}
          canEdit={canEditAssignments}
          canDelete={canDeleteAssignments}
          reviews={reviews}
          tags={tags}
          onBack={() => setScreen("assignments")}
          onUpdate={updateAssignment}
          onDelete={async (id) => { await deleteAssignment(id); setActiveAssignmentId(null); setScreen("assignments"); }}
          onAddUsers={async (assignmentId, userIds) => {
            const result = await addUsersToAssignment(assignmentId, userIds);
            // Only notify the current user if they were just added as an assignee
            if (session?.activeOrganisation?.id && userIds.includes(session.user.id)) {
              addNotification(makeAssignmentAssignedDraft(
                session.activeOrganisation.id,
                session.user.id,
                assignmentId,
                activeAssignment.title,
                session.profile.name,
              ));
            }
            return result;
          }}
          onRemoveUser={removeUserFromAssignment}
          onUpdateStatus={async (auId, status) => {
            await updateAssignmentUserStatus(auId, status);
            if (status === "Completed" && session?.activeOrganisation?.id && session.user.id) {
              addNotification(makeAssignmentCompletedDraft(
                session.activeOrganisation.id,
                session.user.id,
                activeAssignment.title,
              ));
            }
          }}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "quiz-builder") {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : returnToScreen)}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <QuizBuilderScreen
          session={session!}
          members={members}
          groups={groups}
          reviews={reviews}
          tags={tags}
          onCreate={async (input) => { await createAssignment(input); }}
          onBack={() => setScreen("assignments")}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "my-learning") {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : "educator")}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <MyLearningScreen
          session={session!}
          myAssignments={myAssignments}
          playlists={playlists}
          members={members}
          simulatorAttempts={simulatorAttempts}
          onOpenSimulator={(assignment, assignmentUser) => {
            if (!assignment.simulatorSessionId) return;
            if (assignmentUser.status === "Assigned") {
              updateAssignmentUserStatus(assignmentUser.id, "Started").catch(console.error);
            }
            setSimulatorRunnerSessionId(assignment.simulatorSessionId);
            setSimulatorRunnerAssignmentUserId(assignmentUser.id);
            setScreen("simulator-runner");
          }}
          onOpenPlaylist={(assignment, assignmentUser) => {
            // Navigate immediately with optimistic status; fire-and-forget the DB update
            const effectiveUser = assignmentUser.status === "Assigned"
              ? { ...assignmentUser, status: "Started" as const }
              : assignmentUser;
            setLearningAssignmentUser({ assignment, assignmentUser: effectiveUser });
            setPlaylistDetailId(assignment.playlistId);
            setScreen("learning-runner");
            if (assignmentUser.status === "Assigned") {
              updateAssignmentUserStatus(assignmentUser.id, "Started").catch(console.error);
            }
          }}
          onBack={() => setScreen("referee")}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "learning-runner") {
    // liveLearningAssignmentUser guard handled in navigation useEffect above
    if (!liveLearningAssignmentUser) return null;
    const { assignment, assignmentUser } = liveLearningAssignmentUser;
    const runnerPlaylist = playlists.find(p => p.id === assignment.playlistId) ?? null;
    const runnerAssignedByName = members.find(m => m.id === assignment.assignedBy)?.name ?? null;
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : returnToScreen)}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <LearningAssignmentRunner
          assignment={assignment}
          assignmentUser={assignmentUser}
          assignedByName={runnerAssignedByName}
          playlist={runnerPlaylist}
          reviews={reviews}
          tags={tags}
          clipsLoading={learningClipsLoading}
          clipsError={learningClipsError || ""}
          onToggleWatched={async (_itemId, nextIds) => {
            await updateWatchedClips(assignmentUser.id, nextIds);
          }}
          onSaveReflectionDraft={async (responses) => {
            await saveReflectionDraft(assignmentUser.id, responses);
          }}
          onSubmitReflection={async (responses) => {
            await submitReflection(assignmentUser.id, responses);
          }}
          onSaveQuizAnswers={async (answers) => {
            await saveQuizAnswers(assignmentUser.id, answers);
          }}
          onSubmitQuiz={async (answers, score, total) => {
            await submitQuiz(
              assignmentUser.id,
              answers,
              score,
              total,
              assignmentUser.quizAttemptCount,
            );
          }}
          onMarkComplete={async () => {
            await updateAssignmentUserStatus(assignmentUser.id, "Completed");
            if (session?.activeOrganisation?.id && session.user.id) {
              addNotification(makeAssignmentCompletedDraft(
                session.activeOrganisation.id,
                session.user.id,
                assignment.title,
              ));
            }
            setLearningAssignmentUser(null);
            setPlaylistDetailId(null);
            setScreen("my-learning");
          }}
          onOpenReview={(reviewId) => {
            const r = reviews.find(x => x.id === reviewId);
            if (r) openReviewForEdit(r);
          }}
          onBack={() => {
            setLearningAssignmentUser(null);
            setPlaylistDetailId(null);
            setScreen("my-learning");
          }}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "team-management") {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : "educator")}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <TeamManagementScreen
          session={session!}
          members={members}
          permissionMap={permissionMap}
          permissionsLoading={permissionsLoading}
          onSavePerms={saveUserPerms}
          onBack={() => setScreen("educator")}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "user-profile") {
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : "educator")}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <UserProfileScreen
          session={session!}
          onBack={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : "educator")}
          onSwitchOrg={switchOrganisation}
          onProfileNameSaved={updateSessionProfile}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "comment-inbox") {
    return (
      <main>
        <Header session={session} activeScreen={screen} onHome={() => setScreen("educator")} onAdmin={() => setScreen("database")} onOrganisation={() => setScreen("organisation")} onLearning={() => setScreen("learning-hub")} onProfile={() => setScreen("user-profile")} onNotifications={() => setScreen("notifications")} unreadNotificationCount={visibleUnreadCount} onSearch={() => setShowSearch(true)} onLogout={logout} />
        <div style={{ padding: "0 20px 40px", maxWidth: 900, margin: "0 auto" }}>
          <CommentInbox
            session={session}
            onHome={() => setScreen("educator")}
            onRead={refreshUnread}
            unreadCounts={counts}
            onOpenReview={(reviewId) => {
              const r = reviews.find(x => x.id === reviewId);
              if (r) openReviewForEdit(r);
            }}
          />
        </div>
      {globalSearchOverlay}{appToast}</main>
    );
  }

  // Learning tool screens that need return-context tracking
  const learningToolScreens: Screen[] = ["clip-library", "learning-library", "playlists", "assignments", "learning-progress", "groups", "simulator-builder", "simulator-runner", "simulator-analytics"];

  if (screen === "learning-hub" && session) {
    // Wrap setScreen so navigating to a learning tool records "learning-hub" as the return point
    const navigateFromHub = (s: Screen) => {
      if (learningToolScreens.includes(s)) setReturnToScreen("learning-hub");
      setScreen(s);
    };
    return (
      <main>
        <Header session={session} activeScreen={screen} onHome={() => setScreen("educator")} onAdmin={() => setScreen("database")} onOrganisation={() => setScreen("organisation")} onLearning={() => setScreen("learning-hub")} onProfile={() => setScreen("user-profile")} onNotifications={() => setScreen("notifications")} unreadNotificationCount={visibleUnreadCount} onSearch={() => setShowSearch(true)} onLogout={logout} />
        <LearningHub
          session={session}
          tags={tags}
          playlists={playlists}
          assignments={assignments}
          members={members}
          groupCount={groups.length}
          simulatorCount={simulatorSessions.length}
          canViewClipLibrary={canViewClipLibrary}
          canAccessPlaylists={canAccessPlaylists}
          canViewAssignments={canViewAssignments}
          canViewGroups={canViewGroups}
          canAccessSimulator={session?.activeRole !== "viewer"}
          setScreen={navigateFromHub}
          refereeMembers={refereeMembers}
          allRefereeGoalViews={allRefereeGoalViews}
          onNavigateDevelopment={refereeId => {
            setDevGoalRefereeId(refereeId);
            setScreen("referee-development");
          }}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "learning-progress" && session) {
    return (
      <main>
        <Header session={session} activeScreen={screen} onHome={() => setScreen("learning-hub")} onAdmin={() => setScreen("database")} onOrganisation={() => setScreen("organisation")} onLearning={() => setScreen("learning-hub")} onProfile={() => setScreen("user-profile")} onNotifications={() => setScreen("notifications")} unreadNotificationCount={visibleUnreadCount} onSearch={() => setShowSearch(true)} onLogout={logout} />
        <LearningProgress
          session={session}
          assignments={assignments}
          members={members}
          groups={groups}
          setScreen={setScreen}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "groups" && session) {
    return (
      <main>
        <Header session={session} activeScreen={screen} onHome={() => setScreen(returnToScreen)} onAdmin={() => setScreen("database")} onOrganisation={() => setScreen("organisation")} onLearning={() => setScreen("learning-hub")} onProfile={() => setScreen("user-profile")} onNotifications={() => setScreen("notifications")} unreadNotificationCount={visibleUnreadCount} onSearch={() => setShowSearch(true)} onLogout={logout} />
        <GroupsScreen
          session={session}
          groups={groups}
          members={members}
          loading={groupsLoading}
          error={groupsError}
          canCreate={canCreateGroups}
          canEdit={canEditGroups}
          canDelete={canDeleteGroups}
          onBack={() => setScreen(returnToScreen)}
          onCreateGroup={async input => { await createGroup(input); }}
          onUpdateGroup={async (id, input) => { await updateGroup(id, input); }}
          onDeleteGroup={async id => { await deleteGroup(id); }}
          onSetGroupMembers={async (groupId, userIds) => { await setGroupMembers(groupId, userIds); }}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "simulator-builder" && session) {
    return (
      <main>
        <Header session={session} activeScreen={screen} onHome={() => setScreen(returnToScreen)} onAdmin={() => setScreen("database")} onOrganisation={() => setScreen("organisation")} onLearning={() => setScreen("learning-hub")} onProfile={() => setScreen("user-profile")} onNotifications={() => setScreen("notifications")} unreadNotificationCount={visibleUnreadCount} onSearch={() => setShowSearch(true)} onLogout={logout} />
        <SimulatorBuilderScreen
          session={session}
          sessions={simulatorSessions}
          attempts={simulatorAttempts}
          members={members}
          loading={simulatorLoading}
          reviews={reviews}
          tags={tags}
          onCreate={async (formData) => {
            const id = await createSimulatorSession(formData);
            // Reload reviews so the newly-created linked review enters the reviews cache
            reloadReviews();
            return id;
          }}
          onUpdate={updateSimulatorSession}
          onDelete={deleteSimulatorSession}
          onPublish={async (reviewId) => { await publishSimulatorSession(reviewId); reloadReviews(); }}
          onBack={() => setScreen(returnToScreen)}
          onRunSession={(sessionId) => { setSimulatorRunnerSessionId(sessionId); setScreen("simulator-runner"); }}
          onOpenReview={(reviewId) => {
            // Try the reviews cache first; fall back to constructing from session data
            // (the cache may not contain the review yet if it was just created)
            let rev: ReviewRecord | undefined = reviews.find(r => r.id === reviewId);
            if (!rev) {
              const simSession = simulatorSessions.find(s => s.reviewId === reviewId);
              if (simSession) {
                rev = {
                  id: reviewId,
                  organisationId: session.activeOrganisation?.id ?? "",
                  game: simSession.title,
                  educatorId: session.user.id,
                  educatorName: session.profile.name,
                  referee1Id: "", referee2Id: "", referee3Id: "",
                  referee1Name: "", referee2Name: "", referee3Name: "",
                  videoLink: simSession.videoUrl,
                  timestampOffset: 0,
                  status: "In Review",
                  createdAt: new Date().toISOString(),
                  isSimulator: true,
                };
              }
            }
            if (rev) { setReturnToScreen("simulator-builder"); openReviewForEdit(rev, true); }
          }}
          onAssignSession={(sessionId) => {
            setScreen("assignments");
            setSimulatorAssignModalSessionId(sessionId);
          }}
          onAnalytics={(sessionId) => {
            setSimulatorAnalyticsSessionId(sessionId);
            setScreen("simulator-analytics");
          }}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "simulator-runner" && session) {
    const simCanManage = ["educator", "admin", "super_admin"].includes(session.activeRole ?? "");
    const runnableSimulatorSessions = simCanManage
      ? simulatorSessions
      : simulatorSessions.filter(s => {
          if (!s.reviewId) return s.events.length > 0;
          const rev = reviews.find(r => r.id === s.reviewId);
          return rev?.status === "Completed";
        });
    const publishedSessionIds = new Set(
      simulatorSessions
        .filter(s => s.reviewId && reviews.find(r => r.id === s.reviewId)?.status === "Completed")
        .map(s => s.id)
    );
    return (
      <main>
        <Header session={session} activeScreen={screen} onHome={() => setScreen(returnToScreen)} onAdmin={() => setScreen("database")} onOrganisation={() => setScreen("organisation")} onLearning={() => setScreen("learning-hub")} onProfile={() => setScreen("user-profile")} onNotifications={() => setScreen("notifications")} unreadNotificationCount={visibleUnreadCount} onSearch={() => setShowSearch(true)} onLogout={logout} />
        <SimulatorRunnerScreen
          session={session}
          sessions={runnableSimulatorSessions}
          loading={simulatorLoading}
          tags={tags}
          publishedSessionIds={publishedSessionIds}
          onBack={() => {
            setSimulatorRunnerAssignmentUserId(null);
            setScreen(returnToScreen);
          }}
          onCreateAttempt={createSimulatorAttempt}
          onSaveResponse={saveSimulatorResponse}
          onCompleteAttempt={completeSimulatorAttempt}
          onSessionComplete={simulatorRunnerAssignmentUserId ? async () => {
            await updateAssignmentUserStatus(simulatorRunnerAssignmentUserId, "Completed");
          } : undefined}
          initialSessionId={simulatorRunnerSessionId}
          onNavigateToBuilder={() => { setSimulatorRunnerAssignmentUserId(null); setReturnToScreen("learning-hub"); setScreen("simulator-builder"); }}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "simulator-analytics" && session) {
    return (
      <main>
        <Header session={session} activeScreen={screen} onHome={() => setScreen(returnToScreen)} onAdmin={() => setScreen("database")} onOrganisation={() => setScreen("organisation")} onLearning={() => setScreen("learning-hub")} onProfile={() => setScreen("user-profile")} onNotifications={() => setScreen("notifications")} unreadNotificationCount={visibleUnreadCount} onSearch={() => setShowSearch(true)} onLogout={logout} />
        <SimulatorAnalyticsDashboard
          sessions={simulatorSessions}
          attempts={simulatorAttempts}
          members={members}
          reviews={reviews}
          tags={tags}
          initialSessionId={simulatorAnalyticsSessionId}
          onBack={() => setScreen("simulator-builder")}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "educator" && session) {
    // Wrap setScreen so navigating to a learning tool records "educator" as the return point
    const navigateFromDashboard = (s: Screen) => {
      if (learningToolScreens.includes(s)) setReturnToScreen("educator");
      setScreen(s);
    };
    return (
      <main>
        <Header session={session} activeScreen={screen} onHome={() => setScreen("educator")} onAdmin={() => setScreen("database")} onOrganisation={() => setScreen("organisation")} onLearning={() => setScreen("learning-hub")} onProfile={() => setScreen("user-profile")} onNotifications={() => setScreen("notifications")} unreadNotificationCount={visibleUnreadCount} onSearch={() => setShowSearch(true)} onLogout={logout} />
        <EducatorDashboard
          session={session}
          reviews={reviews}
          tags={tags}
          playlists={playlists}
          assignments={assignments}
          refereeMembers={refereeMembers}
          allRefereeGoalViews={allRefereeGoalViews}
          totalUnread={totalUnread}
          canViewClipLibrary={canViewClipLibrary}
          canAccessPlaylists={canAccessPlaylists}
          canViewAssignments={canViewAssignments}
          startNewReview={startNewReview}
          openReviewForEdit={openReviewForEdit}
          deleteReview={deleteReview}
          setScreen={navigateFromDashboard}
          onNavigateDevelopment={refereeId => {
            setDevGoalRefereeId(refereeId);
            setScreen("referee-development");
          }}
          onboardingDismissed={onboardingDismissed}
          dismissOnboarding={dismissOnboarding}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "referee") {
    const reviewUnread = (id: string) =>
      Object.entries(counts ?? {}).filter(([k]) => k.startsWith(id + "::")).reduce((s, [, n]) => s + n, 0);
    const allMyReviews = session ? assignedReviewsForReferee(session.user.id) : [];

    const myReviews = allMyReviews.filter(r =>
      datePassesFilter(r.gameDate || r.createdAt.slice(0, 10), refDateFilter)
    );

    const allMyTags = myReviews.flatMap(review => {
      const slot = slotForUser(session?.user.id || "", review);
      return tags.filter(t => t.reviewId === review.id && tagAppliesToSlot(t, slot));
    });
    const myAnalytics = makeAnalytics(allMyTags);

    return (
      <main>
        <Header session={session} activeScreen={screen} onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : "educator")} onAdmin={() => setScreen("database")} onOrganisation={() => setScreen("organisation")} onLearning={() => setScreen("learning-hub")} onProfile={() => setScreen("user-profile")} onNotifications={() => setScreen("notifications")} unreadNotificationCount={visibleUnreadCount} onSearch={() => setShowSearch(true)} onLogout={logout} />
        <div className="layout">
          <section className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow">Referee Portal</p>
                <h1 style={{ margin: "2px 0 0" }}>Welcome, {session?.profile.name}</h1>
                <p className="hint" style={{ margin: "2px 0 0" }}>Only completed evaluations from your educator appear here.</p>
              </div>
            </div>

            {/* Onboarding */}
            {!onboardingDismissed && (
              <div style={{ marginTop: 16 }}>
                <OnboardingPanel
                  role="referee"
                  onDismiss={dismissOnboarding}
                  onNavigate={setScreen}
                  onNavigateDevelopment={session ? () => {
                    setDevGoalRefereeId(session.user.id);
                    setScreen("referee-development");
                  } : undefined}
                />
              </div>
            )}

            {/* Compact date filter */}
            <DateRangeFilter
              value={refDateFilter}
              onChange={setRefDateFilter}
              totalCount={allMyReviews.length}
              filteredCount={myReviews.length}
            />

            {myReviews.length === 0 ? (
              <p className="hint" style={{ marginTop: 16 }}>
                {allMyReviews.length === 0
                  ? "No completed evaluations yet."
                  : "No evaluations found for this date range."}
              </p>
            ) : (
              <div className="ref-reviews-table">
                <table>
                  <thead><tr><th>Game</th><th>Status</th><th>Educator</th><th>Submitted</th><th>Clips</th><th>Accuracy</th><th></th></tr></thead>
                  <tbody>
                    {myReviews.map(review => {
                      const slot = slotForUser(session?.user.id || "", review);
                      const visible = tags.filter(t => t.reviewId === review.id && tagAppliesToSlot(t, slot));
                      return (
                        <tr key={review.id}>
                          <td data-label="Game">{review.game}</td>
                          <td data-label="Status"><span className="status done">{review.status}</span></td>
                          <td data-label="Educator">{review.educatorName}</td>
                          <td data-label="Submitted">{review.submittedAt ? new Date(review.submittedAt).toLocaleDateString() : "—"}</td>
                          <td data-label="Clips">{visible.length}</td>
                          <td data-label="Accuracy">{makeAnalytics(visible).accuracy}</td>
                          <td data-label=""><div className="badge-wrap"><button className="primary" onClick={() => { setActiveReviewId(review.id); setScreen("refereeReview"); }}><Eye size={16} /> View Clips</button>{reviewUnread(review.id) > 0 && <span className="badge-count">{Math.min(reviewUnread(review.id), 99)}</span>}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="panel side-panel">
            <button className="primary" onClick={() => setScreen("referee-stats")} style={{ whiteSpace: "nowrap", width: "100%", marginBottom: 8 }}>📊 My Stats Hub</button>
            {session && refereeGoalViewsForReferee(session.user.id).filter(gv => gv.status === "Active").length > 0 && (
              <button style={{ whiteSpace: "nowrap", width: "100%", marginBottom: 8 }} onClick={() => setScreen("referee-goals")}>🎯 My Goals</button>
            )}
            {(() => {
              const totalUnreadComments = allMyReviews.reduce((s, r) =>
                s + Object.entries(counts ?? {}).filter(([k]) => k.startsWith(r.id + "::")).reduce((n, [, c]) => n + c, 0), 0);
              return (
                <div className="badge-wrap" style={{ marginBottom: 8 }}>
                  <button style={{ whiteSpace: "nowrap", width: "100%" }} onClick={() => setScreen("referee-comments")}>
                    💬 My Comments
                  </button>
                  {totalUnreadComments > 0 && (
                    <span className="badge-count" style={{ background: "#ff453a" }}>{Math.min(totalUnreadComments, 99)}</span>
                  )}
                </div>
              );
            })()}
            <div className="badge-wrap" style={{ marginBottom: 14 }}>
              <button style={{ whiteSpace: "nowrap", width: "100%" }} onClick={() => setScreen("my-learning")}>📚 My Learning</button>
              {myAssignments.filter(a => a.assignmentUsers.find(u => u.userId === session?.user.id)?.status !== "Completed").length > 0 && (
                <span className="badge-count">
                  {myAssignments.filter(a => a.assignmentUsers.find(u => u.userId === session?.user.id)?.status !== "Completed").length}
                </span>
              )}
            </div>
            {session && (() => {
              const myGoals = refereeGoalViewsForReferee(session.user.id);
              return myGoals.length > 0 ? (
                <RefereeGoalsPanel
                  goalViews={myGoals}
                  onViewAll={() => setScreen("referee-goals")}
                />
              ) : null;
            })()}
            {allMyReviews.length > 0 && (() => {
              // Sidebar summary always shows all-time totals
              const sidebarTags = allMyReviews.flatMap(r => {
                const slot = slotForUser(session?.user.id || "", r);
                return tags.filter(t => t.reviewId === r.id && tagAppliesToSlot(t, slot));
              });
              const sidebarAnalytics = makeAnalytics(sidebarTags);
              return (
              <div className="analytics-card">
                <h3>Performance Summary</h3>
                <div className="metric-grid">
                  <div className="metric-tile"><div className="number">{allMyReviews.length}</div><div className="hint">Evaluations</div></div>
                  <div className="metric-tile"><div className="number">{sidebarTags.length}</div><div className="hint">Clips</div></div>
                  {sidebarTags.length > 0 && <div className="metric-tile"><div className="number">{sidebarAnalytics.accuracy}</div><div className="hint">Accuracy</div></div>}
                </div>
              </div>
              );
            })()}
            {allMyReviews.length > 0 && (() => {
              // Sidebar breakdown also uses all-time tags
              const sidebarTags = allMyReviews.flatMap(r => {
                const slot = slotForUser(session?.user.id || "", r);
                return tags.filter(t => t.reviewId === r.id && tagAppliesToSlot(t, slot));
              });
              if (sidebarTags.length === 0) return null;
              const sidebarAnalytics = makeAnalytics(sidebarTags);
              const bars = (counts: [string, number][]) => {
                const max = Math.max(...counts.map(([, c]) => c), 1);
                return counts.map(([n, c]) => (
                  <div className="metric-row" key={n}>
                    <span>{n}</span>
                    <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${Math.round((c / max) * 100)}%` }} /></div>
                    <strong>{c}</strong>
                  </div>
                ));
              };
              return (
                <>
                  <div className="analytics-card"><h3>Outcome</h3>{bars(sidebarAnalytics.outcomeCounts)}</div>
                  <div className="analytics-card"><h3>Category</h3>{bars(sidebarAnalytics.categoryCounts)}</div>
                  <div className="analytics-card"><h3>Position</h3>{bars(sidebarAnalytics.positionCounts)}</div>
                  <div className="analytics-card"><h3>Coverage</h3>{bars(sidebarAnalytics.coverageCounts)}</div>
                </>
              );
            })()}
          </aside>
        </div>

      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "refereeReview") {
    const review = activeReview;
    const mySlot = slotForUser(session?.user.id || "", review);
    const visibleTags = reviewTags.filter(tag => tagAppliesToSlot(tag, mySlot));
    return (
      <RefereeReviewScreen
        review={review}
        visibleTags={visibleTags}
        mySlot={mySlot}
        session={session}
        unreadCounts={counts}
        onRead={refreshUnread}
        officialSummary={session?.user.id ? (review?.officialSummaries?.[session.user.id] ?? null) : null}
        initialTagId={refReviewSeekTagId}
        onHome={() => { setRefReviewSeekTagId(null); setScreen("referee"); }}
        onAdmin={() => setScreen("database")}
        onProfile={() => setScreen("user-profile")}
        onLogout={logout}
      />
    );
  }

  if (screen === "referee-development" && session) {
    const referee = members.find(m => m.id === devGoalRefereeId) ?? null;
    if (!referee) { setScreen(session.activeRole === "referee" ? "referee" : "educator"); return null; }
    const allRefereeIds = refereeMembers.map(m => m.id);
    const goalViews = refereeGoalViewsForReferee(referee.id);
    const refereeNotes = notesForReferee(referee.id);
    const refereeCompletedReviews = assignedReviewsForReferee(referee.id);
    const refereeReviewGoalLinks = reviewGoalLinks.filter(l => l.refereeId === referee.id);
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(session.activeRole === "referee" ? "referee" : "educator")}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <RefereeDevelopmentScreen
          session={session}
          referee={referee}
          refereeMembers={refereeMembers}
          goalViews={goalViews}
          notes={refereeNotes}
          completedReviews={refereeCompletedReviews}
          reviewGoalLinks={refereeReviewGoalLinks}
          allReviews={reviews}
          onAssignGoal={async (input) => {
            await assignGoal(input, allRefereeIds);
            // Only notify if the current user is the referee receiving this goal
            if (session.activeOrganisation?.id && referee.id === session.user.id) {
              addNotification(makeGoalAssignedDraft(
                session.activeOrganisation.id,
                session.user.id,
                input.title,
                session.profile.name,
              ));
            }
          }}
          onUpdateGoalDef={(id, patch) => {
            updateGoalDef(id, patch);
            // Only notify if the current user is the referee whose goal changed
            const goalTitle = patch.title ?? goalViews.find(gv => gv.goalId === id)?.title ?? "a goal";
            if (session.activeOrganisation?.id && referee.id === session.user.id) {
              addNotification(makeGoalUpdatedDraft(
                session.activeOrganisation.id,
                session.user.id,
                goalTitle,
                session.profile.name,
              ));
            }
          }}
          onUpdateRefereeGoal={(id, patch) => {
            updateRefereeGoal(id, patch);
            // Only notify if the current user is the referee whose goal changed
            const goalTitle = allRefereeGoalViews.find(gv => gv.id === id)?.title ?? "a goal";
            if (session.activeOrganisation?.id && referee.id === session.user.id) {
              addNotification(makeGoalUpdatedDraft(
                session.activeOrganisation.id,
                session.user.id,
                goalTitle,
                session.profile.name,
              ));
            }
          }}
          onCompleteGoal={completeRefereeGoal}
          onArchiveGoal={archiveRefereeGoal}
          onReopenGoal={reopenRefereeGoal}
          onDeleteGoal={deleteRefereeGoal}
          onCreateNote={async (input) => {
            await createNote(input);
            // Only notify if the current user is the referee receiving the note
            if (session.activeOrganisation?.id && referee.id === session.user.id) {
              addNotification(makeNoteAddedDraft(
                session.activeOrganisation.id,
                session.user.id,
                session.profile.name,
                input.title,
              ));
            }
          }}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onBack={() => setScreen(session.activeRole === "referee" ? "referee" : "educator")}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "referee-comments" && session) {
    const allMyReviews = assignedReviewsForReferee(session.user.id);
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen("referee")}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <RefereeCommentsScreen
          session={session}
          myReviews={allMyReviews}
          allTags={tags}
          onWatchClip={(reviewId, tagId) => {
            setRefReviewSeekTagId(tagId);
            setActiveReviewId(reviewId);
            setScreen("refereeReview");
          }}
          onBack={() => setScreen("referee")}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "referee-goals" && session) {
    const myGoalViews   = refereeGoalViewsForReferee(session.user.id);
    const myNotes       = notesForReferee(session.user.id);
    const myCompletedReviews = assignedReviewsForReferee(session.user.id);
    const myReviewGoalLinks  = reviewGoalLinks.filter(l => l.refereeId === session.user.id);
    const myClipGoalLinks    = clipGoalLinks.filter(l => l.refereeId === session.user.id);
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen("referee")}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <RefereeGoalsScreen
          session={session}
          goalViews={myGoalViews}
          goalDefs={goalDefs}
          notes={myNotes}
          completedReviews={myCompletedReviews}
          reviewGoalLinks={myReviewGoalLinks}
          clipGoalLinks={myClipGoalLinks}
          members={members}
          onCreateNote={createNote}
          onUpdateNote={(patch, id) => updateNote(id, patch)}
          onDeleteNote={deleteNote}
          onBack={() => setScreen("referee")}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "notifications" && session) {
    const homeScreen = session.activeRole === "referee" ? "referee" : session.activeRole === "viewer" ? "viewer" : "educator";
    return (
      <main>
        <Header
          session={session}
          activeScreen={screen}
          onHome={() => setScreen(homeScreen)}
          onAdmin={() => setScreen("database")}
          onOrganisation={() => setScreen("organisation")}
          onLearning={() => setScreen("learning-hub")}
          onProfile={() => setScreen("user-profile")}
          onNotifications={() => setScreen("notifications")}
          unreadNotificationCount={visibleUnreadCount}
          onSearch={() => setShowSearch(true)}
          onLogout={logout}
        />
        <NotificationCentre
          notifications={notifications}
          unreadCount={visibleUnreadCount}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onDelete={removeNotification}
          onNavigate={(route) => setScreen(route as Screen)}
          onBack={() => setScreen(homeScreen)}
          preferences={notifPrefs}
          onUpdatePreferences={updateNotifPrefs}
        />
      {globalSearchOverlay}{appToast}</main>
    );
  }

  if (screen === "referee-stats") {
    return (
      <RefereeStatsHub
        reviews={reviews}
        tags={tags}
        session={session}
        onBack={() => setScreen("referee")}
        onAdmin={() => setScreen("database")}
        onProfile={() => setScreen("user-profile")}
        onLogout={logout}
      />
    );
  }

  // Ordered list of assigned officials for the summary modal and educator summary panel
  const summarySlots: [string, string, string][] = (
    [
      [reviewRef1, activeReview?.referee1Name || "Crew Chief", "Crew Chief"],
      [reviewRef2, activeReview?.referee2Name || "Umpire 1", "Umpire 1"],
      [reviewRef3, activeReview?.referee3Name || "Umpire 2", "Umpire 2"],
    ] as [string, string, string][]
  ).filter(([id]) => !!id);

  return <main><Header session={session} activeScreen={screen} onHome={() => setScreen(session?.activeRole === "referee" ? "referee" : session?.activeRole === "viewer" ? "viewer" : "educator")} onAdmin={() => setScreen("database")} onOrganisation={() => setScreen("organisation")} onLearning={() => setScreen("learning-hub")} onProfile={() => setScreen("user-profile")} onNotifications={() => setScreen("notifications")} unreadNotificationCount={visibleUnreadCount} onSearch={() => setShowSearch(true)} onLogout={logout} /><div className="layout"><section className="panel"><div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}><p className="eyebrow">Evaluation</p><h2 style={{ marginBottom: 4 }}>{reviewGame || "Untitled Review"}</h2><p className="hint">Educator: {activeReview?.educatorName || session?.profile.name || "—"} · Status: {activeReview?.status || "In Review"}</p><div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}><span className="chip">Crew Chief: {slotName("Referee 1", activeReview)}</span><span className="chip">Umpire 1: {slotName("Referee 2", activeReview)}</span><span className="chip">Umpire 2: {slotName("Referee 3", activeReview)}</span></div></div><div className="review-setup-bar"><div className="review-setup-info"><span className="review-setup-name">{reviewGame && reviewGame !== "New Review" ? reviewGame : "Untitled Review"}</span>{reviewGameDate && <span className="hint">· {reviewGameDate}</span>}{reviewVideoLink ? <span className="hint">· 🎥 Video</span> : <span className="hint" style={{color:"rgba(253,230,138,.6)"}}>· No video</span>}</div><button style={{fontSize:12,padding:"4px 10px",whiteSpace:"nowrap"}} onClick={()=>setSetupModalOpen(true)}>✏️ Edit Game Details</button></div><div className="mode-switch"><button className={mode === "video" ? "primary" : ""} onClick={() => { setMode("video"); setTimerRunning(false); }}>Video Review</button><button className={mode === "non-video" ? "primary" : ""} onClick={() => setMode("non-video")}>Non-Video Mode</button></div>{mode === "video" ? <><div className="toolbar"><label className="file-picker">Upload Local Video<input type="file" accept="video/*" onChange={e => { const file = e.target.files?.[0]; if (file && videoRef.current) videoRef.current.src = URL.createObjectURL(file); }} /></label><button onClick={() => { if (usingYouTubeVideo && youtubePlayerRef.current?.getPlayerState) { youtubePlayerRef.current.getPlayerState() === 1 ? youtubePlayerRef.current.pauseVideo() : youtubePlayerRef.current.playVideo(); } else { videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause(); } }}><Play size={16} /> / <Pause size={16} /></button><button onClick={() => { if (usingYouTubeVideo && youtubePlayerRef.current?.seekTo) { const next = Math.max(0, playbackSeconds() - 5); youtubePlayerRef.current.seekTo(next, true); setYoutubeCurrent(next); } else if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5); }}>-5s</button><button onClick={() => { if (usingYouTubeVideo && youtubePlayerRef.current?.seekTo) { const next = playbackSeconds() + 5; youtubePlayerRef.current.seekTo(next, true); setYoutubeCurrent(next); } else if (videoRef.current) videoRef.current.currentTime += 5; }}>+5s</button><button className="primary" onClick={openVideoCoding}>Tag Moment</button></div><div className="video-placeholder" style={{margin:0,aspectRatio:"16/9",overflow:"hidden",padding:0}}>{usingYouTubeVideo ? <div ref={youtubeContainerRef} style={{width:"100%",height:"100%"}} /> : isUnsupportedVideo ? <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,padding:24,textAlign:"center"}}><p style={{margin:0,fontWeight:700,fontSize:14}}>Video is not compatible with RefCoach timestamp tagging.</p><p className="hint" style={{margin:0}}>Please use a YouTube link or direct video file (MP4, WebM, or CloudFront video URL).</p></div> : <video ref={videoRef} controls src={isDirectVideoUrl(activeVideoLink)?activeVideoLink:undefined} className="video-frame" onLoadedMetadata={e=>setVideoDuration(e.currentTarget.duration)} onTimeUpdate={e=>setVideoCurrent(e.currentTarget.currentTime)} />}</div>{usingYouTubeVideo&&<p className="hint" style={{marginTop:4,fontSize:12}}>YouTube · {formatTime(youtubeCurrent)}{youtubeReady?"":" · loading..."}</p>}</> : <div className="timer-card"><div className="timer">{formatTime(timerSeconds)}</div><div className="toolbar"><button className="primary" onClick={() => setTimerRunning(r => !r)}>{timerRunning ? "Stop Timer" : "Start Timer"}</button><button onClick={() => setTimerSeconds(0)}>Reset</button><button onClick={() => setTimerSeconds(s => Math.max(0, s - 10))}>-10s</button><button onClick={() => setTimerSeconds(s => s + 10)}>+10s</button></div><p className="hint">Non-video mode keeps running. Keyboard tags are saved at current timer minus 10 seconds.</p></div>}<div className="timeline"><div className="progress" style={{ width: `${progressPct}%` }} />{reviewTags.map(tag => <div key={tag.id} className="marker" title={`${tag.adjustedTime} — ${slotName(tag.refereeTarget, activeReview)} — ${tag.outcome || tag.category || "Tag"}`} style={{ left: `${Math.min(100, (tag.adjustedSeconds / scaleSeconds) * 100)}%` }} />)}</div></section><aside className="panel side-panel"><div className="export-row"><button style={{fontSize:12,padding:"6px 12px"}} onClick={()=>setConfirmDiscardReview(true)}>{isNewReview ? "Discard Review" : "← Back"}</button><button className="warn" style={{fontSize:12,padding:"6px 12px"}} onClick={saveCompleteLater}>Save &amp; Complete Later</button><button className="good" style={{fontSize:12,padding:"6px 12px"}} onClick={submitReview}>Submit Review</button></div><div className="export-row"><button style={{fontSize:12,padding:"5px 10px"}} onClick={exportCsv}><Download size={14} /> CSV</button><button className="primary" style={{fontSize:12,padding:"5px 10px"}} onClick={exportExcel}><Download size={14} /> Excel</button></div><div className="review-side-block"><div className="analytics-card"><h2>Performance Analytics</h2><label>Analytics view<select value={analyticsTarget} onChange={e => setAnalyticsTarget(e.target.value as RefSlot)}>{REF_SLOTS.map(s => <option key={s} value={s}>{slotName(s, activeReview)}</option>)}</select></label><div className="metric-grid" style={{ marginTop: 10 }}><div className="metric-tile"><div className="number">{analytics.total}</div><div className="hint">Total clips</div></div><div className="metric-tile"><div className="number">{analytics.accuracy}</div><div className="hint">Coded accuracy</div></div><div className="metric-tile"><div className="number">{analytics.correctCalls + analytics.correctNoCalls}</div><div className="hint">Correct decisions</div></div><div className="metric-tile"><div className="number">{analytics.incorrectCalls + analytics.incorrectNoCalls}</div><div className="hint">Incorrect decisions</div></div></div></div></div><div className="review-side-breakdowns-wrap"><div className="review-side-breakdowns"><div className="review-side-breakdowns-header"><span className="review-side-breakdowns-title">Breakdowns</span><span className="review-side-breakdowns-hint">Scroll ↓</span></div><div className="analytics-card"><h3>Outcome Breakdown</h3>{analytics.outcomeCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Category Breakdown</h3>{analytics.categoryCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Position Breakdown</h3>{analytics.positionCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div><div className="analytics-card"><h3>Coverage Breakdown</h3>{analytics.coverageCounts.map(([n, c]) => <div className="metric-row" key={n}><span>{n}</span><strong>{c}</strong></div>)}</div></div></div><div className="review-side-actions">{mode === "video" ? <div className="analytics-card"><button className="primary big-tag" onClick={openVideoCoding}>Tag Moment</button><p className="hint">Shortcut: X opens the video coding panel.</p></div> : <div className="analytics-card"><h2>Non-video hotkeys</h2><div className="hotkey-grid">{KEY_LABELS.map(([k, l]) => <div className="hotkey" key={k}><span>{l}</span><kbd>{k}</kbd></div>)}</div></div>}{summarySlots.some(([id])=>activeReview?.officialSummaries?.[id]&&Object.values(activeReview.officialSummaries[id]).some(Boolean))&&<div className="analytics-card"><h3>Final Summaries</h3>{summarySlots.map(([id,name,role])=>{const s=activeReview?.officialSummaries?.[id];return s&&(s.positives||s.workOns||s.nextFocus)?<div key={id} style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid var(--border)"}}><p style={{margin:"0 0 6px",fontWeight:800}}>{name} <span className="hint" style={{fontWeight:400}}>· {role}</span></p>{s.positives&&<><p className="hint" style={{margin:"0 0 2px",fontSize:11}}>Positives</p><p style={{margin:"0 0 6px",fontSize:13,whiteSpace:"pre-wrap"}}>{s.positives}</p></>}{s.workOns&&<><p className="hint" style={{margin:"0 0 2px",fontSize:11}}>Development Notes</p><p style={{margin:"0 0 6px",fontSize:13,whiteSpace:"pre-wrap"}}>{s.workOns}</p></>}</div>:null})}</div>}</div>{activeReview && session && (()=>{
  const slots: Array<{id:string; name:string}> = [
    {id: activeReview.referee1Id, name: activeReview.referee1Name},
    {id: activeReview.referee2Id, name: activeReview.referee2Name},
    {id: activeReview.referee3Id, name: activeReview.referee3Name},
  ].filter(s => s.id);
  const allRefereeIds = refereeMembers.map(m => m.id);
  return slots.length > 0 ? (
    <div className="review-side-block">
      <h3 style={{margin:"0 0 8px",fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",color:"var(--muted)"}}>Development Goals</h3>
      {slots.map(slot => (
        <ReviewDevelopmentPanel
          key={slot.id}
          session={session}
          review={activeReview}
          refereeId={slot.id}
          refereeName={slot.name}
          activeGoals={refereeGoalViewsForReferee(slot.id).filter(v => v.status === "Active")}
          reviewGoalLinks={reviewGoalLinks.filter(l => l.refereeId === slot.id && l.reviewId === activeReview.id)}
          onCreateGoalFromReview={async (input, reviewId) => {
            const defId = await assignGoal(input, allRefereeIds);
            if (defId) createReviewGoalLink({reviewId, goalDefId: defId, refereeId: slot.id, createdGoalFromReview: true});
          }}
          onLinkReviewToGoal={createReviewGoalLink}
          onUnlinkReviewFromGoal={removeReviewGoalLink}
        />
      ))}
    </div>
  ) : null;
})()}</aside><section className="panel table-panel"><div className="table-head"><h2>Coded clips</h2><button className="danger" onClick={() => setConfirmClearTags(true)}><Trash2 size={16} /> Clear Tags</button></div><table><thead><tr><th>Time</th><th>Referees</th><th>Mode</th><th>Outcome</th><th>Coverage</th><th>Position</th><th>Category</th><th>Comments</th><th></th></tr></thead><tbody>{reviewTags.map(tag => <tr key={tag.id}><td><button onClick={() => jump(tag.adjustedSeconds)}>{tag.adjustedTime}</button></td><td><strong>{slotName(tag.refereeTarget, activeReview)}</strong> <span className="hint">(Call)</span><br />{(tag.extraReviewOfficials || []).map(s => <span className="chip" key={s}>{slotName(s, activeReview)} Review</span>)}</td><td>{tag.mode}</td><td><span style={(tag.outcome&&OUTCOME_COLOR[tag.outcome])?{color:OUTCOME_COLOR[tag.outcome].color,fontWeight:700}:{}}>{tag.outcome}</span></td><td>{tag.coverage}</td><td>{tag.position}</td><td>{tag.category}</td><td>{tag.notes}</td><td>{tag.mode === "video" && <button className="clip-action-btn" onClick={() => openEditTag(tag)}>Edit</button>}<button className="clip-action-btn danger" onClick={() => deleteClip(tag.id)}>Delete</button><div className="badge-wrap"><button className={"clip-action-btn" + (activeCommentTagId === tag.id ? " selected" : "")} onClick={() => setActiveCommentTagId(t => t === tag.id ? null : tag.id)}>Comments</button>{(counts?.[`${activeReviewId}::${tag.id}`] ?? 0) > 0 && <span className="badge-count">{Math.min(counts![`${activeReviewId}::${tag.id}`], 99)}</span>}</div></td></tr>)}</tbody></table>{activeCommentTagId && <ReviewComments reviewId={activeReviewId} tagId={activeCommentTagId} session={session} onRead={refreshUnread} />}</section></div>{codingOpen && <div className="modal-backdrop"><div className="modal wizard-modal"><div className="modal-title"><div><p className="eyebrow">{editingTagId?"Edit clip":"Tag Moment"} · Step {wizardStep} of 8</p><h1 style={{fontSize:20,margin:0}}>{wizardStep===1?"Outcome":wizardStep===2?"Coverage":wizardStep===3?"Position":wizardStep===4?"Category":wizardStep===5?(draftCategoryGroup||"Specific Tag"):wizardStep===6?"Responsible Official":wizardStep===7?"Notes & Reference":"Review & Save"}</h1><p className="hint" style={{margin:"3px 0 0",fontSize:12}}>{formatTime(codingSecond)} · Adjusted: {formatTime(Math.max(0,codingSecond+Number(activeReview?.timestampOffset||0)))}</p></div><button onClick={()=>{setCodingOpen(false);setEditingTagId(null);if(shouldResumeVideo)playActiveVideo();}}>✕</button></div><div className="wizard-dots">{[1,2,3,4,5,6,7,8].map(s=><div key={s} className={"wizard-dot"+(s===wizardStep?" wizard-dot--active":s<wizardStep?" wizard-dot--done":"")} />)}</div>{wizardStep===1&&<><p className="wizard-prompt">What was the result of this moment?</p><div className="wizard-opts">{OUTCOMES.map(item=>{const oc=OUTCOME_COLOR[item];const sel=draftOutcome===item;return<button key={item} className={"wizard-opt"+(sel?" selected":"")} style={oc?{color:sel?oc.color:"var(--muted)",background:sel?oc.bg:"transparent",borderColor:sel?oc.border:"var(--border)"}:{}} onClick={()=>{setDraftOutcome(item);setCodingError("");setWizardStep(2);}}>{item}</button>;})}</div>{codingError&&<p className="danger-text" style={{margin:"8px 0 0"}}>{codingError}</p>}</>}{wizardStep===2&&<><p className="wizard-prompt">What was the referee's coverage area?</p><div className="wizard-opts">{COVERAGE.map(item=><button key={item} className={"wizard-opt"+(draftCoverage===item?" selected":"")} onClick={()=>{setDraftCoverage(item);setCodingError("");setWizardStep(3);}}>{item}</button>)}</div>{codingError&&<p className="danger-text" style={{margin:"8px 0 0"}}>{codingError}</p>}</>}{wizardStep===3&&<><p className="wizard-prompt">Where was the referee positioned?</p><div className="wizard-opts">{POSITIONS.map(item=><button key={item} className={"wizard-opt"+(draftPosition===item?" selected":"")} onClick={()=>{setDraftPosition(item);setCodingError("");setWizardStep(4);}}>{item}</button>)}</div>{codingError&&<p className="danger-text" style={{margin:"8px 0 0"}}>{codingError}</p>}</>}{wizardStep===4&&<><p className="wizard-prompt">What type of call is this?</p><div className="wizard-opts">{CATEGORY_GROUPS.map(item=><button key={item} className={"wizard-opt"+(draftCategoryGroup===item?" selected":"")} onClick={()=>{setDraftCategoryGroup(item);if(item!==draftCategoryGroup)setDraftSpecificTag("");setCodingError("");setWizardStep(5);}}>{item}</button>)}</div>{codingError&&<p className="danger-text" style={{margin:"8px 0 0"}}>{codingError}</p>}</>}{wizardStep===5&&(()=>{const allTags=SPECIFIC_TAGS[draftCategoryGroup]||[];const recent=recentSpecificTags.filter(t=>allTags.includes(t));const rest=allTags.filter(t=>!recent.includes(t));return(<><p className="wizard-prompt">Select the specific {draftCategoryGroup.toLowerCase()} tag.</p>{recent.length>0&&<><p style={{fontSize:11,fontWeight:700,color:"var(--muted)",margin:"0 0 6px",textTransform:"uppercase",letterSpacing:".04em"}}>Recently used</p><div className="wizard-opts wizard-opts--compact" style={{marginBottom:12}}>{recent.map(item=><button key={item} className={"wizard-opt wizard-opt--sm"+(draftSpecificTag===item?" selected":"")} onClick={()=>{setDraftSpecificTag(item);setCodingError("");setWizardStep(6);}}>{item}</button>)}</div></>}<p style={{fontSize:11,fontWeight:700,color:"var(--muted)",margin:"0 0 6px",textTransform:"uppercase",letterSpacing:".04em"}}>{recent.length>0?"All tags":"Tags"}</p><div className="wizard-opts wizard-opts--compact">{rest.map(item=><button key={item} className={"wizard-opt wizard-opt--sm"+(draftSpecificTag===item?" selected":"")} onClick={()=>{setDraftSpecificTag(item);setCodingError("");setWizardStep(6);}}>{item}</button>)}</div>{codingError&&<p className="danger-text" style={{margin:"8px 0 0"}}>{codingError}</p>}</>);})()}{wizardStep===6&&<><p className="wizard-prompt">Who was responsible for this moment?</p><div className="wizard-opts">{REF_SLOTS.map(s=><button key={s} className={"wizard-opt"+(draftRefereeTarget===s?" selected":"")} onClick={()=>{setDraftRefereeTarget(s as RefSlot);setDraftExtraOfficials(items=>items.filter(x=>x!==s));setCodingError("");setWizardStep(7);}}>{slotName(s,activeReview)}</button>)}</div>{codingError&&<p className="danger-text" style={{margin:"8px 0 0"}}>{codingError}</p>}</>}{wizardStep===7&&<><p className="wizard-prompt">Add notes and reference officials. <span className="hint">(optional)</span></p><textarea value={draftNotes} onChange={e=>setDraftNotes(e.target.value)} placeholder="Notes for this clip…" style={{width:"100%",minHeight:80,resize:"vertical",boxSizing:"border-box",marginBottom:14}} /><div><p style={{fontSize:13,fontWeight:700,margin:"0 0 4px"}}>Also show this clip to <span className="hint" style={{fontWeight:400}}>(optional)</span></p><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{REF_SLOTS.filter(s=>s!=="All Referees"&&s!==draftRefereeTarget).map(s=><button type="button" key={s} className={"wizard-opt wizard-opt--sm"+(draftExtraOfficials.includes(s)?" selected":"")} onClick={()=>toggleExtra(s)}>{slotName(s,activeReview)}</button>)}</div><p className="hint" style={{fontSize:11,marginTop:5}}>Reference officials can view this clip but are not counted as responsible for the decision.</p></div><div style={{marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,.08)"}}><label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={draftIsLearningClip} onChange={e=>setDraftIsLearningClip(e.target.checked)} style={{accentColor:"#22c55e",width:"auto",flexShrink:0}} /><span style={{fontWeight:600}}>Add to Learning Library</span></label><p className="hint" style={{fontSize:11,marginTop:4}}>Educators can filter for this clip when attaching resources to quiz questions.</p></div></>}{wizardStep===8&&<><p className="wizard-prompt">Confirm all details before saving.</p><div style={{display:"flex",flexDirection:"column",gap:6}}>{([["Outcome",draftOutcome,1,!draftOutcome],["Coverage",draftCoverage,2,!draftCoverage],["Position",draftPosition,3,!draftPosition],["Category",draftCategoryGroup,4,!draftCategoryGroup],["Specific Tag",draftSpecificTag,5,!draftSpecificTag],["Responsible Official",slotName(draftRefereeTarget,activeReview),6,false],["Reference Officials",draftExtraOfficials.length>0?draftExtraOfficials.map(s=>slotName(s,activeReview)).join(", "):"(none)",7,false],["Notes",draftNotes||"(none)",7,false]] as [string,string,number,boolean][]).map(([label,value,step,isError])=><div key={label} className={"wizard-review-row"+(isError?" wizard-review-row--error":"")}><div style={{flex:1,minWidth:0}}><span className="hint" style={{display:"block",fontSize:11,marginBottom:1}}>{label}</span><span style={{fontWeight:isError?900:700,color:isError?"#fecaca":"var(--text)"}}>{value||"⚠ Required"}</span></div><button style={{fontSize:11,padding:"2px 8px",flexShrink:0}} onClick={()=>setWizardStep(step)}>Edit</button></div>)}{codingError&&<p className="danger-text" style={{margin:"4px 0 0"}}>{codingError}</p>}</div></>}<div className="wizard-nav"><div>{wizardStep>1&&<button onClick={()=>setWizardStep(s=>s-1)}>← Back</button>}</div><div style={{display:"flex",gap:8,alignItems:"center"}}>{wizardStep<8&&draftOutcome&&draftCoverage&&draftPosition&&draftCategoryGroup&&draftSpecificTag&&wizardStep!==1&&<button style={{fontSize:12}} onClick={()=>setWizardStep(8)}>Skip to Review →</button>}{wizardStep===6&&<button className="primary" onClick={()=>setWizardStep(7)}>Next →</button>}{wizardStep===7&&<><button onClick={()=>setWizardStep(8)}>Skip</button><button className="primary" onClick={()=>setWizardStep(8)}>Next →</button></>}{wizardStep===8&&<button className="primary" onClick={saveVideoCode}>{editingTagId?"Save Changes":"Save & Resume"}</button>}</div></div></div></div>}{setupModalOpen&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget&&reviewGame&&reviewGame!=="New Review")setSetupModalOpen(false);}}><div className="modal" style={{maxWidth:660}}><div className="modal-title"><div><p className="eyebrow">{reviewGame&&reviewGame!=="New Review"?"Edit Game Details":"New Review Setup"}</p><h1 style={{fontSize:22,margin:0}}>{reviewGame&&reviewGame!=="New Review"?reviewGame:"Set up your review"}</h1></div>{reviewGame&&reviewGame!=="New Review"&&<button onClick={()=>setSetupModalOpen(false)}>✕</button>}</div><div style={{display:"flex",flexDirection:"column",gap:12,marginTop:12}}><div className="setup-grid"><label>Game / Competition name<input value={reviewGame==="New Review"?"":reviewGame} onChange={e=>setReviewGame(e.target.value)} placeholder="e.g. NBL Round 5 — Wildcats vs Kings" autoFocus /></label><label>Game Date<input type="date" value={reviewGameDate} onChange={e=>setReviewGameDate(e.target.value)} /></label></div><div className="setup-grid"><label>Crew Chief<select value={reviewRef1} onChange={e=>setReviewRef1(e.target.value)}><option value="">Select Crew Chief...</option>{refereeMembers.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label>Umpire 1<select value={reviewRef2} onChange={e=>setReviewRef2(e.target.value)}><option value="">Select Umpire 1...</option>{refereeMembers.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label>Umpire 2<select value={reviewRef3} onChange={e=>setReviewRef3(e.target.value)}><option value="">Select Umpire 2...</option>{refereeMembers.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label></div><div className="grid-2"><label>Video link<input value={reviewVideoLink} onChange={e=>setReviewVideoLink(e.target.value)} placeholder="YouTube, direct MP4/WebM, Hudl, GloryLeague..." /></label><label>Timestamp offset (seconds)<input type="number" step="1" max="0" value={reviewOffset} onChange={e=>setReviewOffset(-Math.abs(Math.trunc(Number(e.target.value)||0)))} /></label></div></div><div className="action-row" style={{marginTop:18}}>{reviewGame&&reviewGame!=="New Review"?<button onClick={()=>setSetupModalOpen(false)}>Cancel</button>:<span style={{fontSize:12,color:"var(--muted)",cursor:"pointer",padding:"6px 4px",userSelect:"none"}} onClick={()=>setSetupModalOpen(false)}>Skip for now</span>}<button className="primary" onClick={()=>{saveReviewMeta();setSetupModalOpen(false);}}>{ !reviewGame||reviewGame==="New Review"?"Save & Start Review":"Save Changes"}</button></div></div></div>}{summaryModalOpen&&<div className="modal-backdrop"><div className="modal" style={{maxWidth:600}}><div className="modal-title"><div><p className="eyebrow">Complete Review</p><h1>Final Summaries</h1><p className="hint">Add optional notes for each official before completing the review.</p></div><button onClick={()=>setSummaryModalOpen(false)}>✕</button></div>{summarySlots.length===0&&<p className="hint" style={{marginTop:14}}>No officials assigned to this review.</p>}{summarySlots.length>0&&(()=>{const idx=Math.min(summaryActiveIdx,summarySlots.length-1);const [id,name,role]=summarySlots[idx];return(<><div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>{summarySlots.map(([sid,sname],i)=><button key={sid} onClick={()=>setSummaryActiveIdx(i)} style={{fontSize:13,padding:"5px 14px",borderRadius:8,background:i===idx?"rgba(165,106,27,.12)":"transparent",color:i===idx?"var(--accent)":"var(--muted)",border:`1px solid ${i===idx?"rgba(165,106,27,.35)":"var(--border)"}`,fontWeight:i===idx?700:400}}>{sname}</button>)}</div><div style={{marginTop:18}}><h2 style={{margin:"0 0 14px"}}>{name} <span className="hint" style={{fontWeight:400,fontSize:14}}>· {role}</span></h2><div style={{display:"flex",flexDirection:"column",gap:12}}><label>Positives<textarea rows={4} value={draftSummaries[id]?.positives||""} onChange={e=>updateSummaryField(id,"positives",e.target.value)} placeholder="What did this official do well?" /></label><label>Development Notes<textarea rows={4} value={draftSummaries[id]?.workOns||""} onChange={e=>updateSummaryField(id,"workOns",e.target.value)} placeholder="Key development areas and coaching notes…" /></label></div></div></>);})()}<div className="action-row" style={{marginTop:24}}><button onClick={()=>setSummaryModalOpen(false)}>Cancel</button><button className="good" onClick={confirmSubmit}>✓ Confirm &amp; Complete Review</button></div></div></div>}{confirmDiscardReview&&<div className="modal-backdrop"><div className="modal" style={{maxWidth:420}}><div className="modal-title"><div><p className="eyebrow">{isNewReview?"Discard Review":"Leave Review"}</p><h1 style={{fontSize:20,margin:0}}>{isNewReview?"Discard this review?":"Leave without saving?"}</h1></div></div><p style={{margin:"16px 0 0",fontSize:14,color:"var(--muted)"}}>{isNewReview?"This review has not been saved. Discarding it will permanently delete it and all coded clips.":"Any unsaved game detail changes will be lost. Coded clips are already saved."}
</p><div className="action-row" style={{marginTop:20}}><button onClick={()=>setConfirmDiscardReview(false)}>Cancel</button><button className="danger" onClick={cancelReview}>{isNewReview?"Yes, Discard":"Yes, Leave"}</button></div></div></div>}{confirmClearTags&&<ConfirmModal title="Clear all tags?" message="This will permanently delete all coded clips for this review. This cannot be undone." confirmLabel="Yes, Clear All" busyLabel="Clearing…" busy={false} onCancel={()=>setConfirmClearTags(false)} onConfirm={async()=>{setConfirmClearTags(false);await clearReviewClips(activeReviewId);}} />}{globalSearchOverlay}{appToast}</main>;
}
