"use client";

import { useState, useMemo } from "react";
import {
  Plus, MessageSquare, Film, ListChecks, BookOpen, Trash2,
  ChevronRight,
} from "lucide-react";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Screen } from "@/lib/types/auth";
import type { Playlist } from "@/lib/types/playlists";
import type { Assignment } from "@/lib/types/assignments";
import type { MemberRecord } from "@/lib/types/members";
import type { RefereeGoalView } from "@/lib/types/developmentGoals";
import { fmtRel } from "@/lib/utils/time";

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
}

type KpiFilter = "all" | "in-review" | "completed" | "this-week";


export function EducatorDashboard({
  session, reviews, tags, playlists, assignments, refereeMembers, allRefereeGoalViews, totalUnread,
  canViewClipLibrary, canAccessPlaylists, canViewAssignments,
  startNewReview, openReviewForEdit, deleteReview, setScreen, onNavigateDevelopment,
}: Props) {
  // --- Filter state (local to dashboard) ---
  const [filterStatus, setFilterStatus] = useState<"All" | "In Review" | "Completed">("All");
  const [filterReferee, setFilterReferee] = useState("");
  const [filterGame, setFilterGame] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterHasVideo, setFilterHasVideo] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState<"all" | "30" | "90">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "updated" | "referee" | "game">("newest");
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>("all");

  const portalLabel =
    session.activeRole === "super_admin" ? "Super Admin Portal" :
    session.activeRole === "admin" ? "Organisation Admin Portal" : "Educator Portal";

  // --- Scope reviews by role ---
  const visibleReviews = useMemo(() => {
    if (session.activeRole === "super_admin") return reviews;
    if (session.activeRole === "admin") return reviews.filter(r => r.organisationId === session.activeOrganisation?.id);
    return reviews.filter(r => r.educatorId === session.user.id && r.organisationId === session.activeOrganisation?.id);
  }, [reviews, session]);

  // --- KPI counts ---
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const inProgressCount = visibleReviews.filter(r => r.status !== "Completed").length;
  const completedCount  = visibleReviews.filter(r => r.status === "Completed").length;
  const thisWeekCount   = visibleReviews.filter(r => r.createdAt >= oneWeekAgo).length;

  // --- All referees for dropdown ---
  const allReferees = useMemo(() =>
    Array.from(new Set(
      visibleReviews.flatMap(r => [r.referee1Name, r.referee2Name, r.referee3Name].filter(Boolean))
    )).sort(), [visibleReviews]
  );

  // --- Filtering ---
  const filteredReviews = useMemo(() => {
    let out = visibleReviews.filter(r => {
      // KPI filter overrides status filter
      if (kpiFilter === "in-review" && r.status === "Completed") return false;
      if (kpiFilter === "completed" && r.status !== "Completed") return false;
      if (kpiFilter === "this-week" && r.createdAt < oneWeekAgo) return false;
      // Normal filters (only apply when KPI is "all")
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

  // --- My Tasks ---
  const pendingReviews = visibleReviews.filter(r => r.status !== "Completed").length;
  const pendingAssignments = assignments.length;

  // --- Recent activity (colored by type) ---
  type ActivityItem = { label: string; detail: string; ts: string; type: "created" | "completed" };
  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    visibleReviews.forEach(r => {
      items.push({ label: "Review created", detail: r.game, ts: r.createdAt, type: "created" });
      if (r.submittedAt) items.push({ label: "Review completed", detail: r.game, ts: r.submittedAt, type: "completed" });
    });
    return items.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 14);
  }, [visibleReviews]);

  const dotColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "completed": return "#22c55e";
      case "created": return "#3b82f6";
    }
  };

  // --- KPI toggle ---
  function toggleKpi(f: KpiFilter) {
    setKpiFilter(prev => prev === f ? "all" : f);
  }

  // --- Hero actions ---
  const heroActions = [
    {
      icon: <Plus size={28} />, label: "New Review", hint: "Start evaluation",
      onClick: startNewReview, primary: true,
    },
    {
      icon: <MessageSquare size={28} />, label: "Comment Inbox", hint: totalUnread > 0 ? `${totalUnread} unread` : "All caught up",
      badge: totalUnread > 0 ? (totalUnread > 99 ? "99+" : String(totalUnread)) : undefined,
      onClick: () => setScreen("comment-inbox"),
    },
    ...(canViewClipLibrary ? [{
      icon: <Film size={28} />, label: "Clip Library", hint: "Browse tagged clips",
      onClick: () => setScreen("clip-library"),
    }] : []),
    ...(canAccessPlaylists ? [{
      icon: <ListChecks size={28} />, label: "Playlists", hint: playlists.length > 0 ? `${playlists.length} playlists` : "Manage playlists",
      onClick: () => setScreen("playlists"),
    }] : []),
    ...(canViewAssignments ? [{
      icon: <BookOpen size={28} />, label: "Assignments", hint: pendingAssignments > 0 ? `${pendingAssignments} active` : "Learning assignments",
      onClick: () => setScreen("assignments"),
    }] : []),
  ];

  return (
    <div className="ed-layout">

      {/* ── Main column ── */}
      <div className="ed-main">

        {/* Page header */}
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

        {/* Hero action cards */}
        <div className="ed-hero-grid">
          {heroActions.map((action, i) => (
            <button
              key={i}
              className={"ed-hero-card" + (action.primary ? " ed-hero-card--primary" : "")}
              onClick={action.onClick}
            >
              <div className="ed-hero-icon">{action.icon}</div>
              <div className="ed-hero-text">
                <div className="ed-hero-label">
                  {action.label}
                  {action.badge && <span className="ed-hero-badge">{action.badge}</span>}
                </div>
                <div className="ed-hero-hint">{action.hint}</div>
              </div>
              <ChevronRight size={16} className="ed-hero-chevron" />
            </button>
          ))}
        </div>

        {/* My Tasks */}
        {(pendingReviews > 0 || totalUnread > 0) && (
          <div className="panel ed-tasks-panel">
            <h2 className="ed-section-title">My Tasks</h2>
            <div className="ed-tasks-list">
              {pendingReviews > 0 && (
                <button className="ed-task-item" onClick={() => toggleKpi("in-review")}>
                  <span className="ed-task-dot" style={{ background: "#f59e0b" }} />
                  <span className="ed-task-label">{pendingReviews} review{pendingReviews !== 1 ? "s" : ""} in progress</span>
                  <span className="ed-task-action">Filter list <ChevronRight size={13} /></span>
                </button>
              )}
              {totalUnread > 0 && (
                <button className="ed-task-item" onClick={() => setScreen("comment-inbox")}>
                  <span className="ed-task-dot" style={{ background: "#8b5cf6" }} />
                  <span className="ed-task-label">{totalUnread} comment{totalUnread !== 1 ? "s" : ""} awaiting reply</span>
                  <span className="ed-task-action">Open inbox <ChevronRight size={13} /></span>
                </button>
              )}
              {/* Learning assignments are managed via Assignments hub, not as personal tasks */}
            </div>
          </div>
        )}

        {/* Search + Filters */}
        <div className="panel">
          {/* Prominent search bar */}
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

          {/* Filter row */}
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

          {/* Review table */}
          {filteredReviews.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 16 }}>No reviews match the current filters.</div>
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
                          {review.referee2Name && <span>Referee 1: {review.referee2Name}</span>}
                          {review.referee3Name && <span>Referee 2: {review.referee3Name}</span>}
                          {!review.referee1Name && !review.referee2Name && !review.referee3Name && "—"}
                        </div>
                      </td>
                      <td data-label="Clips">{tags.filter(t => t.reviewId === review.id).length}</td>
                      <td data-label="" onClick={e => e.stopPropagation()}>
                        <button
                          className="ed-icon-btn danger"
                          title="Delete review"
                          onClick={() => deleteReview(review.id)}
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
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside className="ed-sidebar">

        {/* KPI cards */}
        <div className="panel" style={{ padding: "14px 16px" }}>
          <h3 className="ed-section-title" style={{ marginBottom: 12 }}>Overview</h3>
          <div className="ed-kpi-grid">
            <button
              className={"ed-kpi-card" + (kpiFilter === "all" && filterStatus === "All" && filterDateRange === "all" ? " ed-kpi-card--active" : "")}
              onClick={clearFilters}
              title="Show all reviews"
            >
              <div className="ed-kpi-number">{visibleReviews.length}</div>
              <div className="ed-kpi-label">Total</div>
            </button>
            <button
              className={"ed-kpi-card ed-kpi-card--warn" + (kpiFilter === "in-review" ? " ed-kpi-card--active" : "")}
              onClick={() => toggleKpi("in-review")}
              title="Filter to in-progress reviews"
            >
              <div className="ed-kpi-number">{inProgressCount}</div>
              <div className="ed-kpi-label">In Review</div>
            </button>
            <button
              className={"ed-kpi-card ed-kpi-card--good" + (kpiFilter === "completed" ? " ed-kpi-card--active" : "")}
              onClick={() => toggleKpi("completed")}
              title="Filter to completed reviews"
            >
              <div className="ed-kpi-number">{completedCount}</div>
              <div className="ed-kpi-label">Completed</div>
            </button>
            <button
              className={"ed-kpi-card ed-kpi-card--accent" + (kpiFilter === "this-week" ? " ed-kpi-card--active" : "")}
              onClick={() => toggleKpi("this-week")}
              title="Filter to this week's reviews"
            >
              <div className="ed-kpi-number">{thisWeekCount}</div>
              <div className="ed-kpi-label">This Week</div>
            </button>
          </div>
        </div>

        {/* Recent activity */}
        <div className="panel">
          <h3 className="ed-section-title" style={{ marginBottom: 10 }}>Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="hint">No activity yet.</p>
          ) : (
            <div className="ed-activity-list">
              {recentActivity.map((item, i) => (
                <div key={i} className="ed-activity-item">
                  <div className="ed-activity-dot" style={{ background: dotColor(item.type) }} />
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

        {/* Referee Development */}
        {refereeMembers.length > 0 && (
          <div className="panel">
            <h3 className="ed-section-title" style={{ marginBottom: 10 }}>Referee Development</h3>
            <div className="ed-activity-list">
              {refereeMembers.slice(0, 8).map(m => {
                const mGoals = allRefereeGoalViews.filter(v => v.refereeId === m.id);
                const active    = mGoals.filter(v => v.status === "Active").length;
                const highPri   = mGoals.filter(v => v.status === "Active" && v.priority === "High").length;
                return (
                  <button
                    key={m.id}
                    className="ed-task-item"
                    onClick={() => onNavigateDevelopment(m.id)}
                    style={{ textAlign: "left" }}
                  >
                    <span className="ed-activity-dot" style={{ background: active > 0 ? "#0a84ff" : "var(--border)", marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="ed-activity-label" style={{ margin: 0 }}>{m.name}</p>
                      <p className="ed-activity-detail" style={{ margin: "1px 0 0" }}>
                        {active > 0 ? `${active} active goal${active !== 1 ? "s" : ""}${highPri > 0 ? ` · ${highPri} high priority` : ""}` : "No active goals"}
                      </p>
                    </div>
                    <ChevronRight size={13} style={{ flexShrink: 0, color: "var(--muted)" }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </aside>
    </div>
  );
}
