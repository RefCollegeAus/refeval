"use client";

import { useState, useMemo } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Users, Play, AlertCircle, Inbox,
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
import { PageFrame } from "@/components/shell/PageFrame";
import { cn } from "@/lib/utils/cn";
import {
  Badge, type BadgeTone,
  Button,
  Card,
  EmptyState,
  Select,
  Input,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from "@/components/ui";

interface Props {
  session: RefEvalSession;
  reviews: ReviewRecord[];
  tags: CodedTag[];
  playlists: Playlist[];
  assignments: Assignment[];
  refereeMembers: MemberRecord[];
  allRefereeGoalViews: RefereeGoalView[];
  totalUnread: number;
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
// Referee College Design System — Phase 3. These map RefEval's own existing
// severity/priority concepts onto the shared Badge's 5-tone system rather
// than inventing new colours — see the Phase 3 deliverables report for the
// exact mapping and why the small number of non-semantic colours (e.g. the
// old violet "needs reply" comment badge) were folded into `accent` instead
// of kept as one-off hex values.

function toneBorderClass(tone: BadgeTone): string {
  switch (tone) {
    case "danger": return "border-l-danger";
    case "warn": return "border-l-warn";
    case "good": return "border-l-good";
    case "accent": return "border-l-accent";
    default: return "border-l-border";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EducatorDashboard({
  session, reviews, tags, playlists: _playlists, assignments, refereeMembers, allRefereeGoalViews, totalUnread,
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
    tone: BadgeTone;
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
        tone: "accent",
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
          tone: isStale ? "danger" : "warn",
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
          tone: "good",
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

  const activityDotClass = (type: ActivityItem["type"]) =>
    type === "completed" ? "bg-good" : "bg-info";

  // ── Quick Actions ─────────────────────────────────────────────────────────────
  // "New Review" is intentionally omitted here — PageFrame's own primary
  // action (below) already carries it. Comment Inbox / Clip Library /
  // Playlists / Assignments / Organisation were removed from this bar once
  // the main Sidebar (components/shell/nav.ts) made all five directly
  // reachable from every screen — keeping both would duplicate the same
  // destinations in two places. Development Hub stays: it has no single
  // sidebar destination (it always needs a specific referee first), so it
  // remains a genuinely contextual action.

  const quickActions = [
    ...(refereeMembers.length > 0 ? [{ icon: <Users size={14} />, label: "Development Hub",
      onClick: () => onNavigateDevelopment(refereeMembers[0].id), badge: undefined as string | undefined }] : []),
  ];

  // ── Priority helpers ──────────────────────────────────────────────────────────

  function followUpTone(priority: FollowUpPriority): BadgeTone {
    if (priority === "High") return "danger";
    if (priority === "Medium") return "warn";
    return "neutral";
  }

  function reviewRefereeLine(r: ReviewRecord) {
    return [r.referee1Name, r.referee2Name, r.referee3Name].filter(Boolean).join(", ") || "No referees assigned";
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
    <PageFrame
      className="p-0"
      eyebrow={portalLabel}
      title={`Welcome, ${session.profile.name}`}
      description={`${visibleReviews.length} total review${visibleReviews.length !== 1 ? "s" : ""}`}
      actions={
        <Button onClick={startNewReview} className="gap-1.5">
          <Plus size={14} /> New Review
        </Button>
      }
    >
      {/* ── Quick Actions — compact wrapping bar, not a Card, matching RefOps ── */}
      {quickActions.length > 0 && (
        <nav
          aria-label="Quick actions"
          className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-panel/60 p-2 sm:flex sm:flex-wrap"
        >
          {quickActions.map((action, i) => (
            <Button
              key={i}
              variant="secondary"
              size="sm"
              onClick={action.onClick}
              className="relative w-full justify-center gap-1.5 sm:w-auto sm:justify-start"
            >
              {action.badge && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white shadow-[0_0_0_2px_var(--bg)]"
                >
                  {action.badge}
                </span>
              )}
              {action.icon}
              {action.label}
            </Button>
          ))}
        </nav>
      )}

      {/* ── Onboarding ── */}
      {!onboardingDismissed && (
        <OnboardingPanel
          role={session.activeRole ?? "educator"}
          onDismiss={dismissOnboarding}
          onNavigate={setScreen}
        />
      )}

      {/* ── Continue Review — the one primary contextual item ── */}
      {continueReview && (
        <Card className="border-l-[3px] border-l-accent">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Play size={13} className="shrink-0 text-accent" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-accent">
                  Continue Review
                </span>
              </div>
              <p className="mb-0.5 truncate text-[15px] font-bold text-text">
                {continueReview.game || "Untitled Review"}
              </p>
              <p className="text-xs text-muted">
                {reviewRefereeLine(continueReview)}
                {" · "}
                {tags.filter(t => t.reviewId === continueReview.id).length} clip{tags.filter(t => t.reviewId === continueReview.id).length !== 1 ? "s" : ""} tagged
                {" · "}
                Updated {fmtRel(continueReview.submittedAt || continueReview.createdAt)}
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => openReviewForEdit(continueReview)} className="shrink-0">
              Continue
            </Button>
          </div>
        </Card>
      )}

      {/* ── Reviews Requiring Attention ── */}
      {attentionReviews.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-danger" />
            <h2 className="ed-section-title mb-0">Reviews Requiring Attention</h2>
            <Badge tone="danger">{attentionReviews.length} stale</Badge>
          </div>
          <div className="flex flex-col gap-2">
            {attentionReviews.map(r => {
              const clipCount = tags.filter(t => t.reviewId === r.id).length;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-[10px] border border-l-[3px] border-border border-l-danger bg-panel-2 py-2.5 pl-3 pr-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-text">
                        {r.game || "Untitled Review"}
                      </span>
                      <Badge tone="danger">Stale draft</Badge>
                    </div>
                    <p className="text-xs text-muted">
                      {reviewRefereeLine(r)} · {clipCount} clip{clipCount !== 1 ? "s" : ""} · Started {fmtRel(r.createdAt)}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => openReviewForEdit(r)} className="shrink-0">
                    Continue
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── All Reviews — filters/toolbar live outside any Card; the list
          itself is the one bordered surface, matching how RefOps keeps a
          filter bar plain and lets the table/list carry its own frame. ── */}
      <div>
        <button
          onClick={() => setShowAllReviews(p => !p)}
          className="flex items-center gap-2 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <h2 className="text-sm font-bold text-text">All Reviews</h2>
          <span className="text-xs text-muted">{visibleReviews.length} total</span>
          {showAllReviews
            ? <ChevronUp size={15} className="text-muted" />
            : <ChevronDown size={15} className="text-muted" />}
        </button>
      </div>

      {showAllReviews && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-[180px] flex-1"
              placeholder="Search by game or competition…"
              value={filterGame}
              onChange={e => { setFilterGame(e.target.value); setKpiFilter("all"); }}
            />
            {activeFilters > 0 && (
              <Button variant="secondary" size="sm" onClick={clearFilters} className="whitespace-nowrap">
                Clear ({activeFilters})
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="w-auto"
                value={kpiFilter !== "all" ? "" : filterStatus}
                disabled={kpiFilter !== "all"}
                onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
              >
                <option value="All">All statuses</option>
                <option value="In Review">In Review</option>
                <option value="Completed">Completed</option>
              </Select>
              <Select className="w-auto" value={filterReferee} onChange={e => setFilterReferee(e.target.value)}>
                <option value="">All referees</option>
                {allReferees.map(n => <option key={n} value={n}>{n}</option>)}
              </Select>
              <label className="flex items-center gap-1.5 whitespace-nowrap text-xs font-extrabold text-muted">
                Game date
                <Input
                  type="date"
                  className="w-auto text-xs"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                <input
                  type="checkbox"
                  checked={filterHasVideo}
                  onChange={e => setFilterHasVideo(e.target.checked)}
                  className="w-auto cursor-pointer accent-accent"
                />
                Has video
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {(["all", "30", "90"] as const).map(range => (
                  <Button
                    key={range}
                    variant={kpiFilter === "all" && filterDateRange === range ? "primary" : "secondary"}
                    size="sm"
                    disabled={kpiFilter !== "all"}
                    onClick={() => setFilterDateRange(range)}
                  >
                    {range === "all" ? "All time" : range === "30" ? "30 days" : "90 days"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="hint text-xs">Sort:</span>
                <Select className="w-auto" value={sortOrder} onChange={e => setSortOrder(e.target.value as typeof sortOrder)}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="updated">Last updated</option>
                  <option value="referee">Referee name</option>
                  <option value="game">Competition</option>
                </Select>
              </div>
              <span className="hint text-xs">
                {filteredReviews.length} of {visibleReviews.length} reviews
              </span>
            </div>
          </div>

          {/* Compact KPI strip — an unboxed stat strip, not per-metric Cards,
              matching RefOps's dashboard summary treatment. */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-panel/60 p-4 sm:grid-cols-4">
            <button className="text-left" onClick={clearFilters} style={{ fontWeight: kpiFilter === "all" && filterStatus === "All" && filterDateRange === "all" ? 800 : undefined }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total</p>
              <p className="text-xl font-bold text-text">{visibleReviews.length}</p>
            </button>
            <button className="text-left" onClick={() => toggleKpi("in-review")}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">In Review</p>
              <p className={cn("text-xl font-bold", inProgressCount > 0 ? "text-warn" : "text-text")}>{inProgressCount}</p>
            </button>
            <button className="text-left" onClick={() => toggleKpi("completed")}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Completed</p>
              <p className={cn("text-xl font-bold", completedCount > 0 ? "text-good" : "text-text")}>{completedCount}</p>
            </button>
            <button className="text-left" onClick={() => toggleKpi("this-week")}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">This Week</p>
              <p className="text-xl font-bold text-text">{thisWeekCount}</p>
            </button>
          </div>

          {filteredReviews.length === 0 && (
            <EmptyState
              icon={<Inbox size={28} />}
              title={visibleReviews.length === 0 ? "No reviews yet" : "No reviews match the current filters"}
              description={
                visibleReviews.length === 0
                  ? "Use New Review above to create your first review."
                  : "Try widening your filters or clearing them to see more results."
              }
              action={
                visibleReviews.length === 0 ? (
                  <Button size="sm" onClick={startNewReview} className="gap-1.5"><Plus size={14} /> New Review</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>
                )
              }
            />
          )}
        </>
      )}

      {showAllReviews && filteredReviews.length > 0 && (
        <Card className="!p-0">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Game</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Educator</TableHeaderCell>
                <TableHeaderCell>Referees</TableHeaderCell>
                <TableHeaderCell>Clips</TableHeaderCell>
                <TableHeaderCell className="w-11" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredReviews.map(review => (
                <TableRow
                  key={review.id}
                  className="cursor-pointer transition-colors hover:bg-panel-3/60"
                  onClick={() => openReviewForEdit(review)}
                >
                  <TableCell data-label="Game" className="font-semibold">{review.game || "Untitled"}</TableCell>
                  <TableCell data-label="Date" className="whitespace-nowrap">{review.gameDate || review.createdAt.slice(0, 10)}</TableCell>
                  <TableCell data-label="Status">
                    <Badge tone={review.status === "Completed" ? "good" : "warn"}>{review.status}</Badge>
                  </TableCell>
                  <TableCell data-label="Educator">{review.educatorName}</TableCell>
                  <TableCell data-label="Referees">
                    <div className="grid gap-0.5 text-sm leading-tight">
                      {review.referee1Name && <span>Crew Chief: {review.referee1Name}</span>}
                      {review.referee2Name && <span>Umpire 1: {review.referee2Name}</span>}
                      {review.referee3Name && <span>Umpire 2: {review.referee3Name}</span>}
                      {!review.referee1Name && !review.referee2Name && !review.referee3Name && "—"}
                    </div>
                  </TableCell>
                  <TableCell data-label="Clips">{tags.filter(t => t.reviewId === review.id).length}</TableCell>
                  <TableCell data-label="" onClick={e => e.stopPropagation()}>
                    <button
                      className="rounded-lg p-1.5 text-danger hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      title="Delete review"
                      aria-label={`Delete review: ${review.game || "Untitled"}`}
                      onClick={() => setConfirmDeleteReviewId(review.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── Secondary content — Recent Activity, Coaching Queue, Smart
          Follow-ups. Placed last and, where collapsible, collapsed by
          default: RefEval-specific coaching aids that RefOps has no
          equivalent of, kept but visually de-prioritised behind the
          review list above. ── */}
      <Card>
        <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <EmptyState title="No activity yet" description="Completed reviews and updates will appear here." />
        ) : (
          <div className="flex flex-col">
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className={cn("flex gap-2.5 py-2", i !== recentActivity.length - 1 && "border-b border-border")}
              >
                <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", activityDotClass(item.type))} />
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-xs font-extrabold text-text">{item.label}</p>
                  <p className="mb-0.5 truncate text-xs text-muted">{item.detail}</p>
                  <p className="text-[11px] text-muted opacity-70">{fmtRel(item.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <button
          onClick={() => setShowCoachingQueue(p => !p)}
          className={cn(
            "flex w-full items-center justify-between border-none bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            showCoachingQueue ? "mb-3.5" : "mb-0"
          )}
        >
          <div className="flex items-center gap-2">
            <h2 className="ed-section-title mb-0">Coaching Queue</h2>
            {coachingQueue.length > 0 && !showCoachingQueue && (
              <Badge tone="warn">{coachingQueue.length}</Badge>
            )}
          </div>
          {showCoachingQueue ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
        </button>
        {showCoachingQueue && (
          coachingQueue.length === 0 ? (
            <EmptyState title="Your coaching queue is clear" description="No immediate actions needed. Keep up the great work." />
          ) : (
            <div className="flex flex-col gap-2">
              {coachingQueue.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] border border-l-[3px] border-border bg-panel-2 py-2.5 pl-3 pr-3.5",
                    toneBorderClass(item.tone)
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-text">
                        {item.title}
                      </span>
                      <Badge tone={item.tone}>{item.badgeLabel}</Badge>
                    </div>
                    {item.referees && (
                      <p className="mb-0.5 truncate text-xs font-medium text-text">
                        {item.referees}
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      {item.detail}{item.dateLabel ? ` · ${item.dateLabel}` : ""}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={item.action} className="shrink-0">
                    {item.actionLabel}
                  </Button>
                </div>
              ))}
            </div>
          )
        )}
      </Card>

      <Card>
        <button
          onClick={() => setShowSmartFollowUps(p => !p)}
          className={cn(
            "flex w-full items-center justify-between border-none bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            showSmartFollowUps ? "mb-3.5" : "mb-0"
          )}
        >
          <div className="flex items-center gap-2">
            <h2 className="ed-section-title mb-0">Smart Follow-ups</h2>
            {smartFollowUps.length > 0 && !showSmartFollowUps && (
              <Badge tone="neutral">{smartFollowUps.length}</Badge>
            )}
          </div>
          {showSmartFollowUps ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
        </button>
        {showSmartFollowUps && (
          smartFollowUps.length === 0 ? (
            <EmptyState title="Everything looks up to date" description="No referee development reminders right now." />
          ) : (
            <div className="flex flex-col gap-2">
              {smartFollowUps.map(f => {
                const tone = followUpTone(f.priority);
                const followUpBorderClass =
                  tone === "danger" ? "border-danger/30" : tone === "warn" ? "border-warn/25" : "border-border";
                return (
                  <div key={f.id} className={cn("rounded-[10px] border bg-panel-2 p-3", followUpBorderClass)}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-bold text-text">{f.refereeName}</span>
                          <Badge tone={tone}>{f.priority.toUpperCase()}</Badge>
                        </div>
                        <p className="mb-0.5 text-[13px] font-semibold text-text">{f.title}</p>
                        <p className="text-xs text-muted">{f.explanation}</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={f.action} className="shrink-0">
                        {f.actionLabel}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </Card>
    </PageFrame>

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
