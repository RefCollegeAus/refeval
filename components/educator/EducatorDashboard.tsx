"use client";

import { useState, useMemo } from "react";
import {
  Plus, MessageSquare, Film, ListChecks, BookOpen, Trash2,
  ChevronDown, ChevronUp, Users, Building2, Play, AlertCircle,
} from "lucide-react";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Screen } from "@/lib/types/auth";
import type { Playlist } from "@/lib/types/playlists";
import type { Assignment } from "@/lib/types/assignments";
import type { MemberRecord } from "@/lib/types/members";
import type { RefereeGoalView } from "@/lib/types/developmentGoals";
import { fmtRel } from "@/lib/utils/time";
import { OnboardingPanel } from "@/components/common/OnboardingPanel";
import { ConfirmModal } from "@/components/common/ConfirmModal";

interface Props {
  session: RefEvalSession;
  reviews: ReviewRecord[];
  tags: CodedTag[];
  playlists: Playlist[];
  assignments: Assignment[];
  refereeMembers: MemberRecord[];
  allRefereeGoalViews: RefereeGoalView[];
  totalUnread: number;
  canViewClipLibrary: boolean;
  canAccessPlaylists: boolean;
  canViewAssignments: boolean;
  startNewReview: () => void;
  openReviewForEdit: (review: ReviewRecord) => void;
  deleteReview: (id: string) => void;
  setScreen: (screen: Screen) => void;
  onNavigateDevelopment: (refereeId: string) => void;
  onboardingDismissed: boolean;
  dismissOnboarding: () => void;
}

type KpiFilter = "all" | "in-review" | "completed" | "this-week";

// ── Shared helpers ────────────────────────────────────────────────────────────

function SectionEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "22px 0", gap: 6, textAlign: "center",
    }}>
      <div style={{ fontSize: 22, lineHeight: 1, color: "var(--muted)" }}>✓</div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{title}</p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{subtitle}</p>
    </div>
  );
}

function Badge({
  label, color, bg, border, uppercase,
}: {
  label: string;
  color: string;
  bg: string;
  border?: string;
  uppercase?: boolean;
}) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: "2px 7px", borderRadius: 999,
      background: bg, color,
      border: border ? `1px solid ${border}` : undefined,
      whiteSpace: "nowrap",
      textTransform: uppercase ? "uppercase" : undefined,
      letterSpacing: uppercase ? ".04em" : undefined,
    }}>
      {label}
    </span>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, alignSelf: "center",
        fontSize: 12, fontWeight: 600,
        padding: "6px 14px", borderRadius: 7,
        background: "var(--panel3)", border: "1px solid var(--border)",
        color: "var(--text)", cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EducatorDashboard({
  session, reviews, tags, playlists: _playlists, assignments, refereeMembers, allRefereeGoalViews, totalUnread,
  canViewClipLibrary, canAccessPlaylists, canViewAssignments,
  startNewReview, openReviewForEdit, deleteReview, setScreen, onNavigateDevelopment,
  onboardingDismissed, dismissOnboarding,
}: Props) {
  const [filterStatus, setFilterStatus] = useState<"All" | "In Review" | "Completed">("All");
  const [filterReferee, setFilterReferee] = useState("");
  const [filterGame, setFilterGame] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterHasVideo, setFilterHasVideo] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState<"all" | "30" | "90">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "updated" | "referee" | "game">("newest");
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>("all");
  const [showAllReviews, setShowAllReviews] = useState(true);
  const [showCoachingQueue, setShowCoachingQueue] = useState(false);
  const [showSmartFollowUps, setShowSmartFollowUps] = useState(false);
  const [confirmDeleteReviewId, setConfirmDeleteReviewId] = useState<string | null>(null);
  const [deletingReview, setDeletingReview] = useState(false);

  const portalLabel =
    session.activeRole === "super_admin" ? "Super Admin Portal" :
    session.activeRole === "admin" ? "Organisation Admin Portal" : "Educator Portal";

  const visibleReviews = useMemo(() => {
    const nonSim = reviews.filter(r => !r.isSimulator);
    if (session.activeRole === "super_admin") return nonSim;
    if (session.activeRole === "admin") return nonSim.filter(r => r.organisationId === session.activeOrganisation?.id);
    return nonSim.filter(r => r.educatorId === session.user.id && r.organisationId === session.activeOrganisation?.id);
  }, [reviews, session]);

  // Memoized so useMemo deps below aren't invalidated on every render by the millisecond-precision ISO string.
  const oneWeekAgo = useMemo(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), []);
  const staleDate  = useMemo(() => new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), []);
  const inProgressCount = visibleReviews.filter(r => r.status !== "Completed").length;
  const completedCount  = visibleReviews.filter(r => r.status === "Completed").length;
  const thisWeekCount   = visibleReviews.filter(r => r.createdAt >= oneWeekAgo).length;

  // Most recently updated in-progress review
  const continueReview = useMemo(() =>
    visibleReviews
      .filter(r => r.status !== "Completed")
      .sort((a, b) => (b.submittedAt || b.createdAt).localeCompare(a.submittedAt || a.createdAt))[0] ?? null,
  [visibleReviews]);

  // In-progress reviews stale >14 days, excluding continueReview to avoid duplication
  const attentionReviews = useMemo(() =>
    visibleReviews
      .filter(r => r.status !== "Completed" && r.createdAt < staleDate && r.id !== continueReview?.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, 5),
  [visibleReviews, staleDate, continueReview]);

  const allReferees = useMemo(() =>
    Array.from(new Set(
      visibleReviews.flatMap(r => [r.referee1Name, r.referee2Name, r.referee3Name].filter(Boolean))
    )).sort(), [visibleReviews]
  );

  const filteredReviews = useMemo(() => {
    let out = visibleReviews.filter(r => {
      if (kpiFilter === "in-review" && r.status === "Completed") return false;
      if (kpiFilter === "completed" && r.status !== "Completed") return false;
      if (kpiFilter === "this-week" && r.createdAt < oneWeekAgo) return false;
      if (kpiFilter === "all") {
        if (filterStatus !== "All" && r.status !== filterStatus) return false;
        if (filterDateRange !== "all") {
          const days = filterDateRange === "30" ? 30 : 90;
          const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          const dateStr = r.gameDate || r.createdAt.slice(0, 10);
          if (dateStr < cutoff) return false;
        }
      }
      if (filterReferee && ![r.referee1Name, r.referee2Name, r.referee3Name].includes(filterReferee)) return false;
      if (filterGame && !r.game.toLowerCase().includes(filterGame.toLowerCase())) return false;
      if (filterDate) {
        const dateStr = r.gameDate || r.createdAt.slice(0, 10);
        if (dateStr !== filterDate) return false;
      }
      if (filterHasVideo && !r.videoLink) return false;
      return true;
    });

    out = [...out].sort((a, b) => {
      switch (sortOrder) {
        case "oldest": return a.createdAt.localeCompare(b.createdAt);
        case "updated": return (b.submittedAt || b.createdAt).localeCompare(a.submittedAt || a.createdAt);
        case "referee": return (a.referee1Name || "").localeCompare(b.referee1Name || "");
        case "game": return a.game.localeCompare(b.game);
        default: return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return out;
  }, [visibleReviews, kpiFilter, filterStatus, filterReferee, filterGame, filterDate, filterHasVideo, filterDateRange, sortOrder, oneWeekAgo]);

  const activeFilters = kpiFilter !== "all"
    ? 1
    : [filterStatus !== "All", !!filterReferee, !!filterGame, !!filterDate, filterHasVideo, filterDateRange !== "all"].filter(Boolean).length;

  function clearFilters() {
    setKpiFilter("all");
    setFilterStatus("All"); setFilterReferee(""); setFilterGame("");
    setFilterDate(""); setFilterHasVideo(false); setFilterDateRange("all");
  }

  function toggleKpi(f: KpiFilter) {
    setKpiFilter(prev => prev === f ? "all" : f);
  }

  // ── Coaching Queue ────────────────────────────────────────────────────────────

  type QueueKind = "comments" | "in_progress" | "stale_draft" | "assignment_due";

  type QueueItem = {
    id: string;
    kind: QueueKind;
    sortOrder: number;
    title: string;
    referees: string;
    detail: string;
    dateLabel: string;
    badgeLabel: string;
    badgeColor: string;
    badgeBg: string;
    accentColor: string;
    action: () => void;
    actionLabel: string;
  };

  const coachingQueue = useMemo<QueueItem[]>(() => {
    const items: QueueItem[] = [];
    const nowIso = new Date().toISOString().slice(0, 10);
    const soonCutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const staleDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // 1 — Unread comments
    if (totalUnread > 0) {
      items.push({
        id: "queue::comments",
        kind: "comments",
        sortOrder: 0,
        title: `${totalUnread} unread comment${totalUnread !== 1 ? "s" : ""}`,
        referees: "",
        detail: "Referee feedback is waiting for your reply",
        dateLabel: "",
        badgeLabel: "Needs reply",
        badgeColor: "#d8b4fe",
        badgeBg: "rgba(139,92,246,.15)",
        accentColor: "#8b5cf6",
        action: () => setScreen("comment-inbox"),
        actionLabel: "Open Inbox",
      });
    }

    // 2 — In-progress reviews
    visibleReviews
      .filter(r => r.status !== "Completed")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .forEach(r => {
        const clipCount = tags.filter(t => t.reviewId === r.id).length;
        const refs = [r.referee1Name, r.referee2Name, r.referee3Name].filter(Boolean);
        const isStale = r.createdAt < staleDate;
        items.push({
          id: `queue::review::${r.id}`,
          kind: isStale ? "stale_draft" : "in_progress",
          sortOrder: isStale ? 2 : 1,
          title: r.game || "Untitled Review",
          referees: refs.join(", "),
          detail: `${clipCount} clip${clipCount !== 1 ? "s" : ""} tagged`,
          dateLabel: `Started ${fmtRel(r.createdAt)}`,
          badgeLabel: isStale ? "Stale draft" : "In progress",
          badgeColor: isStale ? "#fca5a5" : "#fde68a",
          badgeBg: isStale ? "rgba(239,68,68,.13)" : "rgba(245,158,11,.13)",
          accentColor: isStale ? "#ef4444" : "#f59e0b",
          action: () => openReviewForEdit(r),
          actionLabel: "Continue",
        });
      });

    // 3 — Assignments due within 7 days
    assignments
      .filter(a => a.dueDate && a.dueDate >= nowIso && a.dueDate <= soonCutoff)
      .slice(0, 3)
      .forEach(a => {
        const pending = a.assignmentUsers.filter(u => u.status !== "Completed").length;
        items.push({
          id: `queue::assign::${a.id}`,
          kind: "assignment_due",
          sortOrder: 3,
          title: a.title,
          referees: "",
          detail: `${pending} referee${pending !== 1 ? "s" : ""} yet to complete`,
          dateLabel: `Due ${a.dueDate}`,
          badgeLabel: "Due soon",
          badgeColor: "#bbf7d0",
          badgeBg: "rgba(34,197,94,.12)",
          accentColor: "#22c55e",
          action: () => setScreen("assignments"),
          actionLabel: "View",
        });
      });

    return items.sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 10);
  }, [totalUnread, visibleReviews, assignments, tags, setScreen, openReviewForEdit]);

  // ── Smart Follow-ups ──────────────────────────────────────────────────────────

  type FollowUpPriority = "High" | "Medium" | "Low";
  type FollowUpKind =
    | "high_priority_goal_active"
    | "no_review_since_goal_assigned"
    | "overdue_target_review_date"
    | "completed_learning_no_review"
    | "multiple_reviews_no_goals";

  type FollowUp = {
    id: string;
    refereeId: string;
    refereeName: string;
    kind: FollowUpKind;
    title: string;
    explanation: string;
    priority: FollowUpPriority;
    action: () => void;
    actionLabel: string;
  };

  const FOLLOWUP_PRIORITY_ORDER: Record<FollowUpPriority, number> = { High: 0, Medium: 1, Low: 2 };

  const smartFollowUps = useMemo<FollowUp[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const results: FollowUp[] = [];

    refereeMembers.forEach(m => {
      const mGoals = allRefereeGoalViews.filter(v => v.refereeId === m.id);
      const activeGoals = mGoals.filter(g => g.status === "Active");
      const highPriActive = activeGoals.filter(g => g.priority === "High");

      const completedReviews = visibleReviews.filter(
        r => r.status === "Completed" && [r.referee1Id, r.referee2Id, r.referee3Id].includes(m.id)
      );
      const latestCompletedReview = completedReviews
        .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))[0] ?? null;

      const completedAssignment = assignments.some(a =>
        a.assignmentUsers.some(u => u.userId === m.id && u.status === "Completed")
      );

      // Rule 1 — High: active goal with targetReviewDate in the past
      const overdueGoal = activeGoals.find(g => g.targetReviewDate && g.targetReviewDate < today);
      if (overdueGoal) {
        results.push({
          id: `${m.id}::overdue_target`,
          refereeId: m.id, refereeName: m.name,
          kind: "overdue_target_review_date",
          title: "Target review date has passed",
          explanation: `"${overdueGoal.title}" was due for review by ${overdueGoal.targetReviewDate}.`,
          priority: "High",
          action: () => onNavigateDevelopment(m.id),
          actionLabel: "Open Development",
        });
      }

      // Rule 2 — High: active high-priority goal, no completed review ever
      if (highPriActive.length > 0 && completedReviews.length === 0) {
        const goal = highPriActive[0];
        results.push({
          id: `${m.id}::highpri_no_review`,
          refereeId: m.id, refereeName: m.name,
          kind: "high_priority_goal_active",
          title: "High-priority goal — never reviewed",
          explanation: `"${goal.title}" is High priority but ${m.name} has no completed review on record.`,
          priority: "High",
          action: () => onNavigateDevelopment(m.id),
          actionLabel: "Open Development",
        });
      }

      // Rule 3 — High: active goal, no completed review since goal was assigned
      if (activeGoals.length > 0) {
        const oldestGoalDate = activeGoals.map(g => g.createdAt).sort()[0];
        const reviewedSinceGoal = latestCompletedReview &&
          (latestCompletedReview.submittedAt ?? latestCompletedReview.createdAt) >= oldestGoalDate;
        if (!reviewedSinceGoal) {
          results.push({
            id: `${m.id}::no_review_since_goal`,
            refereeId: m.id, refereeName: m.name,
            kind: "no_review_since_goal_assigned",
            title: "No review since goal was assigned",
            explanation: `${m.name} has ${activeGoals.length} active goal${activeGoals.length !== 1 ? "s" : ""} but no completed review since the goal was assigned.`,
            priority: "High",
            action: () => onNavigateDevelopment(m.id),
            actionLabel: "Open Development",
          });
        }
      }

      // Rule 4 — Medium: completed learning, no review yet
      if (completedAssignment && completedReviews.length === 0) {
        results.push({
          id: `${m.id}::learning_no_review`,
          refereeId: m.id, refereeName: m.name,
          kind: "completed_learning_no_review",
          title: "Completed learning — not yet reviewed",
          explanation: `${m.name} has completed a learning assignment but has not been reviewed yet.`,
          priority: "Medium",
          action: startNewReview,
          actionLabel: "Start Review",
        });
      }

      // Rule 5 — Low: multiple reviews, no active goals
      if (completedReviews.length >= 2 && activeGoals.length === 0) {
        results.push({
          id: `${m.id}::no_goals`,
          refereeId: m.id, refereeName: m.name,
          kind: "multiple_reviews_no_goals",
          title: "No active development goals",
          explanation: `${m.name} has ${completedReviews.length} completed reviews but no active development goals set.`,
          priority: "Low",
          action: () => onNavigateDevelopment(m.id),
          actionLabel: "Open Development",
        });
      }
    });

    // One reminder per referee — highest priority wins
    const seen = new Map<string, FollowUp>();
    for (const f of results) {
      const existing = seen.get(f.refereeId);
      if (!existing || FOLLOWUP_PRIORITY_ORDER[f.priority] < FOLLOWUP_PRIORITY_ORDER[existing.priority]) {
        seen.set(f.refereeId, f);
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => FOLLOWUP_PRIORITY_ORDER[a.priority] - FOLLOWUP_PRIORITY_ORDER[b.priority])
      .slice(0, 12);
  }, [refereeMembers, allRefereeGoalViews, visibleReviews, assignments, onNavigateDevelopment, startNewReview]);

  // ── Recent activity ───────────────────────────────────────────────────────────

  type ActivityItem = { label: string; detail: string; ts: string; type: "created" | "completed" };

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    visibleReviews.forEach(r => {
      items.push({ label: "Review created", detail: r.game, ts: r.createdAt, type: "created" });
      if (r.submittedAt) items.push({ label: "Review completed", detail: r.game, ts: r.submittedAt, type: "completed" });
    });
    return items.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 10);
  }, [visibleReviews]);

  const activityDotColor = (type: ActivityItem["type"]) =>
    type === "completed" ? "#22c55e" : "#3b82f6";

  // ── Quick Actions ─────────────────────────────────────────────────────────────

  const quickActions = [
    { icon: <Plus size={16} />, label: "New Review", onClick: startNewReview, primary: true,
      badge: undefined as string | undefined },
    { icon: <MessageSquare size={16} />, label: "Comment Inbox", onClick: () => setScreen("comment-inbox"),
      badge: totalUnread > 0 ? (totalUnread > 99 ? "99+" : String(totalUnread)) : undefined },
    ...(canViewClipLibrary ? [{ icon: <Film size={16} />, label: "Clip Library",
      onClick: () => setScreen("clip-library"), badge: undefined as string | undefined }] : []),
    ...(canAccessPlaylists ? [{ icon: <ListChecks size={16} />, label: "Playlists",
      onClick: () => setScreen("playlists"), badge: undefined as string | undefined }] : []),
    ...(canViewAssignments ? [{ icon: <BookOpen size={16} />, label: "Assignments",
      onClick: () => setScreen("assignments"), badge: undefined as string | undefined }] : []),
    ...(refereeMembers.length > 0 ? [{ icon: <Users size={16} />, label: "Development Hub",
      onClick: () => onNavigateDevelopment(refereeMembers[0].id), badge: undefined as string | undefined }] : []),
    ...(session.activeRole === "admin" || session.activeRole === "super_admin" ? [{
      icon: <Building2 size={16} />, label: "Organisation",
      onClick: () => setScreen("organisation"), badge: undefined as string | undefined,
    }] : []),
  ];

  // ── Priority badge helpers ────────────────────────────────────────────────────

  function followUpBadgeProps(priority: FollowUpPriority) {
    if (priority === "High")   return { color: "#fca5a5", bg: "rgba(239,68,68,.14)",   border: "rgba(239,68,68,.3)" };
    if (priority === "Medium") return { color: "#fde68a", bg: "rgba(245,158,11,.14)", border: "rgba(245,158,11,.3)" };
    return                            { color: "var(--muted)", bg: "rgba(142,142,147,.1)", border: "rgba(142,142,147,.2)" };
  }

  function followUpBorderColor(priority: FollowUpPriority) {
    if (priority === "High")   return "rgba(239,68,68,.3)";
    if (priority === "Medium") return "rgba(245,158,11,.25)";
    return "var(--border)";
  }

  function reviewRefereeLine(r: ReviewRecord) {
    return [r.referee1Name, r.referee2Name, r.referee3Name].filter(Boolean).join(", ") || "No referees assigned";
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="ed-layout">

      {/* ── Main column ── */}
      <div className="ed-main">

        {/* Header */}
        <div className="ed-dash-header panel">
          <div>
            <p className="eyebrow">{portalLabel}</p>
            <h1 style={{ marginBottom: 0 }}>Welcome, {session.profile.name}</h1>
          </div>
          <div className="ed-dash-header-right">
            <span className="hint" style={{ fontSize: 13 }}>
              {visibleReviews.length} total review{visibleReviews.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ── Onboarding ── */}
        {!onboardingDismissed && (
          <OnboardingPanel
            role={session.activeRole ?? "educator"}
            onDismiss={dismissOnboarding}
            onNavigate={setScreen}
          />
        )}

        {/* ── Continue Review ── */}
        {continueReview && (
          <div className="panel" style={{ borderLeft: "3px solid var(--accent)", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Play size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                    Continue Review
                  </span>
                </div>
                <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {continueReview.game || "Untitled Review"}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                  {reviewRefereeLine(continueReview)}
                  {" · "}
                  {tags.filter(t => t.reviewId === continueReview.id).length} clip{tags.filter(t => t.reviewId === continueReview.id).length !== 1 ? "s" : ""} tagged
                  {" · "}
                  Updated {fmtRel(continueReview.submittedAt || continueReview.createdAt)}
                </p>
              </div>
              <button
                onClick={() => openReviewForEdit(continueReview)}
                style={{
                  flexShrink: 0, fontSize: 13, fontWeight: 700,
                  padding: "8px 18px", borderRadius: 8,
                  background: "var(--accent)", border: "none",
                  color: "var(--bg)", cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Reviews Requiring Attention ── */}
        {attentionReviews.length > 0 && (
          <div className="panel">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <AlertCircle size={14} style={{ color: "#ef4444", flexShrink: 0 }} />
              <h2 className="ed-section-title" style={{ marginBottom: 0 }}>Reviews Requiring Attention</h2>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "rgba(239,68,68,.13)", color: "#fca5a5" }}>
                {attentionReviews.length} stale
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {attentionReviews.map(r => {
                const clipCount = tags.filter(t => t.reviewId === r.id).length;
                return (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "var(--panel2)", border: "1px solid var(--border)",
                    borderLeft: "3px solid #ef4444", borderRadius: 10,
                    padding: "11px 14px 11px 12px",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.game || "Untitled Review"}
                        </span>
                        <Badge label="Stale draft" color="#fca5a5" bg="rgba(239,68,68,.13)" />
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                        {reviewRefereeLine(r)} · {clipCount} clip{clipCount !== 1 ? "s" : ""} · Started {fmtRel(r.createdAt)}
                      </p>
                    </div>
                    <ActionButton label="Continue" onClick={() => openReviewForEdit(r)} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── All Reviews (collapsible, expanded by default) ── */}
        <div className="panel">
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: showAllReviews ? 14 : 4,
          }}>
            <button
              onClick={() => setShowAllReviews(p => !p)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
            >
              <h2 className="ed-section-title" style={{ marginBottom: 0 }}>All Reviews</h2>
              {showAllReviews
                ? <ChevronUp size={15} style={{ color: "var(--muted)" }} />
                : <ChevronDown size={15} style={{ color: "var(--muted)" }} />}
            </button>
            <span className="hint" style={{ fontSize: 12 }}>{visibleReviews.length} total</span>
          </div>

          {!showAllReviews && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              Search and filter your complete review history.
            </p>
          )}

          {showAllReviews && (
            <>
              <div style={{ marginBottom: 10 }}>
                <button
                  onClick={startNewReview}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontSize: 13, fontWeight: 700,
                    padding: "7px 16px", borderRadius: 8,
                    background: "var(--accent)", border: "none",
                    color: "var(--bg)", cursor: "pointer",
                  }}
                >
                  <Plus size={14} /> New Review
                </button>
              </div>
              <div className="ed-search-row">
                <input
                  className="ed-search-input"
                  placeholder="Search by game or competition…"
                  value={filterGame}
                  onChange={e => { setFilterGame(e.target.value); setKpiFilter("all"); }}
                />
                {activeFilters > 0 && (
                  <button onClick={clearFilters} style={{ whiteSpace: "nowrap" }}>
                    Clear ({activeFilters})
                  </button>
                )}
              </div>

              <div className="ed-filter-bar" style={{ marginTop: 10 }}>
                <div className="ed-filter-row">
                  <select
                    value={kpiFilter !== "all" ? "" : filterStatus}
                    disabled={kpiFilter !== "all"}
                    onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                  >
                    <option value="All">All statuses</option>
                    <option value="In Review">In Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <select value={filterReferee} onChange={e => setFilterReferee(e.target.value)}>
                    <option value="">All referees</option>
                    {allReferees.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <label className="ed-date-filter-label">
                    Game date
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                  </label>
                  <label className="ed-video-toggle">
                    <input type="checkbox" checked={filterHasVideo} onChange={e => setFilterHasVideo(e.target.checked)} />
                    Has video
                  </label>
                  <div className="date-preset-row">
                    {(["all", "30", "90"] as const).map(range => (
                      <button
                        key={range}
                        className={"date-preset-btn" + (kpiFilter === "all" && filterDateRange === range ? " active" : "")}
                        disabled={kpiFilter !== "all"}
                        onClick={() => setFilterDateRange(range)}
                      >
                        {range === "all" ? "All time" : range === "30" ? "30 days" : "90 days"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ed-filter-row" style={{ justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="hint" style={{ fontSize: 12 }}>Sort:</span>
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value as typeof sortOrder)}>
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                      <option value="updated">Last updated</option>
                      <option value="referee">Referee name</option>
                      <option value="game">Competition</option>
                    </select>
                  </div>
                  <span className="hint" style={{ fontSize: 12 }}>
                    {filteredReviews.length} of {visibleReviews.length} reviews
                  </span>
                </div>
              </div>

              {/* Compact KPI strip */}
              <div className="lh-compact-stats" style={{ marginTop: 10 }}>
                <button className="lh-compact-stat" onClick={clearFilters} style={{ cursor: "pointer", background: "none", border: "none", textAlign: "left", fontWeight: kpiFilter === "all" && filterStatus === "All" && filterDateRange === "all" ? 800 : undefined }}>
                  <strong>{visibleReviews.length}</strong>&nbsp;Total
                </button>
                <button className="lh-compact-stat" onClick={() => toggleKpi("in-review")} style={{ cursor: "pointer", background: kpiFilter === "in-review" ? "rgba(245,158,11,.08)" : "none", border: "none", textAlign: "left" }}>
                  <strong style={{ color: inProgressCount > 0 ? "#fde68a" : undefined }}>{inProgressCount}</strong>&nbsp;In Review
                </button>
                <button className="lh-compact-stat" onClick={() => toggleKpi("completed")} style={{ cursor: "pointer", background: kpiFilter === "completed" ? "rgba(34,197,94,.08)" : "none", border: "none", textAlign: "left" }}>
                  <strong style={{ color: completedCount > 0 ? "#22c55e" : undefined }}>{completedCount}</strong>&nbsp;Completed
                </button>
                <button className="lh-compact-stat" onClick={() => toggleKpi("this-week")} style={{ cursor: "pointer", background: kpiFilter === "this-week" ? "rgba(99,102,241,.08)" : "none", border: "none", textAlign: "left" }}>
                  <strong>{thisWeekCount}</strong>&nbsp;This Week
                </button>
              </div>

              {filteredReviews.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 16 }}>
                  {visibleReviews.length === 0
                    ? "No reviews yet. Use New Review in the sidebar to get started."
                    : "No reviews match the current filters."}
                </div>
              ) : (
                <div className="ref-reviews-table" style={{ marginTop: 12 }}>
                  <table className="ed-reviews-table">
                    <thead>
                      <tr>
                        <th>Game</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Educator</th>
                        <th>Referees</th>
                        <th>Clips</th>
                        <th style={{ width: 44 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReviews.map(review => (
                        <tr
                          key={review.id}
                          className="ed-review-row"
                          onClick={() => openReviewForEdit(review)}
                        >
                          <td data-label="Game" className="ed-review-game">{review.game || "Untitled"}</td>
                          <td data-label="Date" className="ed-tbl-date">{review.gameDate || review.createdAt.slice(0, 10)}</td>
                          <td data-label="Status">
                            <span className={`status ${review.status === "Completed" ? "done" : "review"}`}>
                              {review.status}
                            </span>
                          </td>
                          <td data-label="Educator">{review.educatorName}</td>
                          <td data-label="Referees">
                            <div className="ed-ref-stack">
                              {review.referee1Name && <span>Crew Chief: {review.referee1Name}</span>}
                              {review.referee2Name && <span>Umpire 1: {review.referee2Name}</span>}
                              {review.referee3Name && <span>Umpire 2: {review.referee3Name}</span>}
                              {!review.referee1Name && !review.referee2Name && !review.referee3Name && "—"}
                            </div>
                          </td>
                          <td data-label="Clips">{tags.filter(t => t.reviewId === review.id).length}</td>
                          <td data-label="" onClick={e => e.stopPropagation()}>
                            <button
                              className="ed-icon-btn danger"
                              title="Delete review"
                              onClick={() => setConfirmDeleteReviewId(review.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        {/* ── Coaching Queue (secondary / collapsible) ── */}
        <div className="panel">
          <button
            onClick={() => setShowCoachingQueue(p => !p)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
              marginBottom: showCoachingQueue ? 14 : 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 className="ed-section-title" style={{ marginBottom: 0 }}>Coaching Queue</h2>
              {coachingQueue.length > 0 && !showCoachingQueue && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "rgba(245,158,11,.15)", color: "#fde68a" }}>
                  {coachingQueue.length}
                </span>
              )}
            </div>
            {showCoachingQueue ? <ChevronUp size={15} style={{ color: "var(--muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--muted)" }} />}
          </button>
          {showCoachingQueue && (
            coachingQueue.length === 0 ? (
              <SectionEmptyState title="Your coaching queue is clear." subtitle="No immediate actions needed. Keep up the great work." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {coachingQueue.map(item => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "var(--panel2)", border: "1px solid var(--border)",
                    borderLeft: `3px solid ${item.accentColor}`, borderRadius: 10,
                    padding: "11px 14px 11px 12px",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.title}
                        </span>
                        <Badge label={item.badgeLabel} color={item.badgeColor} bg={item.badgeBg} />
                      </div>
                      {item.referees && (
                        <p style={{ margin: "0 0 1px", fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                          {item.referees}
                        </p>
                      )}
                      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                        {item.detail}{item.dateLabel ? ` · ${item.dateLabel}` : ""}
                      </p>
                    </div>
                    <ActionButton label={item.actionLabel} onClick={item.action} />
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* ── Smart Follow-ups (secondary / collapsible) ── */}
        <div className="panel">
          <button
            onClick={() => setShowSmartFollowUps(p => !p)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0,
              marginBottom: showSmartFollowUps ? 14 : 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 className="ed-section-title" style={{ marginBottom: 0 }}>Smart Follow-ups</h2>
              {smartFollowUps.length > 0 && !showSmartFollowUps && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "rgba(142,142,147,.15)", color: "var(--muted)" }}>
                  {smartFollowUps.length}
                </span>
              )}
            </div>
            {showSmartFollowUps ? <ChevronUp size={15} style={{ color: "var(--muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--muted)" }} />}
          </button>
          {showSmartFollowUps && (
            smartFollowUps.length === 0 ? (
              <SectionEmptyState title="Everything looks up to date." subtitle="No referee development reminders right now." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {smartFollowUps.map(f => {
                  const bp = followUpBadgeProps(f.priority);
                  const borderColor = followUpBorderColor(f.priority);
                  return (
                    <div key={f.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: "var(--panel2)", border: `1px solid ${borderColor}`,
                      borderRadius: 10, padding: "11px 14px",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{f.refereeName}</span>
                          <Badge label={f.priority} color={bp.color} bg={bp.bg} border={bp.border} uppercase />
                        </div>
                        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.title}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{f.explanation}</p>
                      </div>
                      <ActionButton label={f.actionLabel} onClick={f.action} />
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

      </div>

      {/* ── Sidebar ── */}
      <aside className="ed-sidebar">

        {/* Quick Actions */}
        <div className="panel" style={{ padding: "14px 16px" }}>
          <h3 className="ed-section-title" style={{ marginBottom: 10 }}>Quick Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                style={{
                  position: "relative",
                  display: "flex", alignItems: "center", gap: 10,
                  background: action.primary ? "var(--accent)" : "var(--panel2)",
                  border: `1px solid ${action.primary ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8, padding: "8px 12px",
                  cursor: "pointer", textAlign: "left",
                  color: "var(--text)", fontSize: 13, fontWeight: action.primary ? 700 : 500,
                }}
              >
                {action.badge && (
                  <span style={{
                    position: "absolute", top: -5, right: -5,
                    background: "#ff453a", color: "#fff",
                    fontSize: 9, fontWeight: 800,
                    minWidth: 16, height: 16, borderRadius: 999,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px", lineHeight: 1, pointerEvents: "none",
                    boxShadow: "0 0 0 2px var(--bg)",
                  }}>
                    {action.badge}
                  </span>
                )}
                <span style={{ color: action.primary ? "var(--bg)" : "var(--muted)", flexShrink: 0 }}>
                  {action.icon}
                </span>
                <span style={{ color: action.primary ? "var(--bg)" : "var(--text)" }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="panel">
          <h3 className="ed-section-title" style={{ marginBottom: 10 }}>Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <SectionEmptyState
              title="No activity yet."
              subtitle="Completed reviews and updates will appear here."
            />
          ) : (
            <div className="ed-activity-list">
              {recentActivity.map((item, i) => (
                <div key={i} className="ed-activity-item">
                  <div className="ed-activity-dot" style={{ background: activityDotColor(item.type) }} />
                  <div className="ed-activity-body">
                    <p className="ed-activity-label">{item.label}</p>
                    <p className="ed-activity-detail">{item.detail}</p>
                    <p className="ed-activity-time">{fmtRel(item.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </aside>
    </div>

    {confirmDeleteReviewId && (
      <ConfirmModal
        title="Delete review?"
        message="This will permanently delete the review and all its coded clips. This cannot be undone."
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={deletingReview}
        onCancel={() => setConfirmDeleteReviewId(null)}
        onConfirm={async () => {
          setDeletingReview(true);
          await deleteReview(confirmDeleteReviewId);
          setConfirmDeleteReviewId(null);
          setDeletingReview(false);
        }}
      />
    )}
    </>
  );
}
