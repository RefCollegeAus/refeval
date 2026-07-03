"use client";

import { useState, useMemo } from "react";
import {
  Plus, MessageSquare, Film, ListChecks, BookOpen, Trash2,
  ChevronRight, Target, Users, ChevronDown, ChevronUp,
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
  const [filterStatus, setFilterStatus] = useState<"All" | "In Review" | "Completed">("All");
  const [filterReferee, setFilterReferee] = useState("");
  const [filterGame, setFilterGame] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterHasVideo, setFilterHasVideo] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState<"all" | "30" | "90">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "updated" | "referee" | "game">("newest");
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>("all");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllReferees, setShowAllReferees] = useState(false);

  const portalLabel =
    session.activeRole === "super_admin" ? "Super Admin Portal" :
    session.activeRole === "admin" ? "Organisation Admin Portal" : "Educator Portal";

  const visibleReviews = useMemo(() => {
    if (session.activeRole === "super_admin") return reviews;
    if (session.activeRole === "admin") return reviews.filter(r => r.organisationId === session.activeOrganisation?.id);
    return reviews.filter(r => r.educatorId === session.user.id && r.organisationId === session.activeOrganisation?.id);
  }, [reviews, session]);

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const inProgressCount = visibleReviews.filter(r => r.status !== "Completed").length;
  const completedCount  = visibleReviews.filter(r => r.status === "Completed").length;
  const thisWeekCount   = visibleReviews.filter(r => r.createdAt >= oneWeekAgo).length;

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

  // Continue Where You Left Off — most recent in-progress reviews
  const inProgressReviews = useMemo(() =>
    visibleReviews
      .filter(r => r.status !== "Completed")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3),
    [visibleReviews]
  );

  // Coaching Queue items
  type QueueItem = { id: string; priority: number; label: string; detail: string; action: () => void; color: string };
  const coachingQueue = useMemo<QueueItem[]>(() => {
    const items: QueueItem[] = [];
    if (totalUnread > 0) {
      items.push({
        id: "comments",
        priority: 0,
        label: `${totalUnread} comment${totalUnread !== 1 ? "s" : ""} awaiting reply`,
        detail: "Referee feedback needs your response",
        action: () => setScreen("comment-inbox"),
        color: "#8b5cf6",
      });
    }
    inProgressReviews.forEach(r => {
      items.push({
        id: r.id,
        priority: 1,
        label: `Continue: ${r.game || "Untitled"}`,
        detail: `${tags.filter(t => t.reviewId === r.id).length} clips tagged · started ${fmtRel(r.createdAt)}`,
        action: () => openReviewForEdit(r),
        color: "#f59e0b",
      });
    });
    const highPriGoals = allRefereeGoalViews
      .filter(v => v.status === "Active" && v.priority === "High")
      .slice(0, 3);
    highPriGoals.forEach(g => {
      const ref = refereeMembers.find(m => m.id === g.refereeId);
      if (ref) {
        items.push({
          id: `goal-${g.id ?? g.refereeId}`,
          priority: 2,
          label: `${ref.name}: ${g.title || g.category || "Development goal"}`,
          detail: "High priority development goal",
          action: () => onNavigateDevelopment(g.refereeId),
          color: "#0a84ff",
        });
      }
    });
    const nowIso = new Date().toISOString().slice(0, 10);
    const soonCutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    assignments
      .filter(a => a.dueDate && a.dueDate >= nowIso && a.dueDate <= soonCutoff)
      .slice(0, 2)
      .forEach(a => {
        items.push({
          id: `assign-${a.id}`,
          priority: 3,
          label: `Assignment due ${a.dueDate}`,
          detail: a.title ?? "Learning assignment",
          action: () => setScreen("assignments"),
          color: "#22c55e",
        });
      });
    return items.sort((a, b) => a.priority - b.priority).slice(0, 8);
  }, [totalUnread, inProgressReviews, allRefereeGoalViews, refereeMembers, assignments, tags, setScreen, openReviewForEdit, onNavigateDevelopment]);

  // Recent activity
  type ActivityItem = { label: string; detail: string; ts: string; type: "created" | "completed" };
  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    visibleReviews.forEach(r => {
      items.push({ label: "Review created", detail: r.game, ts: r.createdAt, type: "created" });
      if (r.submittedAt) items.push({ label: "Review completed", detail: r.game, ts: r.submittedAt, type: "completed" });
    });
    return items.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 10);
  }, [visibleReviews]);

  const dotColor = (type: ActivityItem["type"]) =>
    type === "completed" ? "#22c55e" : "#3b82f6";

  // Referee cards for My Referees section
  const refereeCards = useMemo(() =>
    refereeMembers.map(m => {
      const mGoals = allRefereeGoalViews.filter(v => v.refereeId === m.id);
      const active = mGoals.filter(v => v.status === "Active").length;
      const highPri = mGoals.filter(v => v.status === "Active" && v.priority === "High").length;
      const completed = visibleReviews.filter(r =>
        r.status === "Completed" && [r.referee1Id, r.referee2Id, r.referee3Id].includes(m.id)
      ).length;
      return { member: m, active, highPri, completed };
    }),
    [refereeMembers, allRefereeGoalViews, visibleReviews]
  );
  const visibleRefereeCards = showAllReferees ? refereeCards : refereeCards.slice(0, 4);

  // Quick actions for sidebar
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

        {/* Continue Where You Left Off */}
        {inProgressReviews.length > 0 && (
          <div className="panel">
            <h2 className="ed-section-title" style={{ marginBottom: 12 }}>Continue Where You Left Off</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {inProgressReviews.map(r => {
                const clipCount = tags.filter(t => t.reviewId === r.id).length;
                const refs = [r.referee1Name, r.referee2Name, r.referee3Name].filter(Boolean);
                return (
                  <button
                    key={r.id}
                    onClick={() => openReviewForEdit(r)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: "var(--panel2)", border: "1px solid var(--border)",
                      borderRadius: 10, padding: "10px 14px", textAlign: "left", cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.game || "Untitled"}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                        {refs.join(", ") || "No referees"} · {clipCount} clip{clipCount !== 1 ? "s" : ""} · {fmtRel(r.createdAt)}
                      </p>
                    </div>
                    <span className="status review" style={{ flexShrink: 0, fontSize: 11 }}>In Review</span>
                    <ChevronRight size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Coaching Queue */}
        {coachingQueue.length > 0 && (
          <div className="panel ed-tasks-panel">
            <h2 className="ed-section-title">Coaching Queue</h2>
            <div className="ed-tasks-list">
              {coachingQueue.map(item => (
                <button key={item.id} className="ed-task-item" onClick={item.action}>
                  <span className="ed-task-dot" style={{ background: item.color }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="ed-task-label">{item.label}</span>
                    <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--muted)" }}>{item.detail}</p>
                  </div>
                  <span className="ed-task-action"><ChevronRight size={13} /></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* My Referees */}
        {refereeCards.length > 0 && (
          <div className="panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 className="ed-section-title" style={{ marginBottom: 0 }}>My Referees</h2>
              <span className="hint" style={{ fontSize: 12 }}>{refereeCards.length} referee{refereeCards.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {visibleRefereeCards.map(({ member: m, active, highPri, completed }) => (
                <button
                  key={m.id}
                  onClick={() => onNavigateDevelopment(m.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                    background: "var(--panel2)", border: "1px solid var(--border)",
                    borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: active > 0 ? "#0a84ff" : "var(--border)",
                    }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", paddingLeft: 16 }}>
                    {active > 0 && (
                      <span style={{ fontSize: 11, color: "#0a84ff" }}>
                        <Target size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                        {active} goal{active !== 1 ? "s" : ""}
                        {highPri > 0 && <span style={{ color: "#f59e0b" }}> · {highPri} high</span>}
                      </span>
                    )}
                    {active === 0 && (
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>No active goals</span>
                    )}
                    {completed > 0 && (
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{completed} review{completed !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {refereeCards.length > 4 && (
              <button
                onClick={() => setShowAllReferees(p => !p)}
                style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                {showAllReferees
                  ? <><ChevronUp size={13} /> Show fewer</>
                  : <><ChevronDown size={13} /> Show all {refereeCards.length} referees</>}
              </button>
            )}
          </div>
        )}

        {/* All Reviews (collapsible) */}
        <div className="panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showAllReviews ? 14 : 0 }}>
            <button
              onClick={() => setShowAllReviews(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <h2 className="ed-section-title" style={{ marginBottom: 0 }}>All Reviews</h2>
              {showAllReviews ? <ChevronUp size={16} style={{ color: "var(--muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--muted)" }} />}
            </button>
            <span className="hint" style={{ fontSize: 12 }}>{visibleReviews.length} total</span>
          </div>

          {showAllReviews && (
            <>
              {/* Search bar */}
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

              {/* KPI quick-filter strip */}
              <div className="ed-kpi-grid" style={{ marginTop: 10 }}>
                <button
                  className={"ed-kpi-card" + (kpiFilter === "all" && filterStatus === "All" && filterDateRange === "all" ? " ed-kpi-card--active" : "")}
                  onClick={clearFilters}
                >
                  <div className="ed-kpi-number">{visibleReviews.length}</div>
                  <div className="ed-kpi-label">Total</div>
                </button>
                <button
                  className={"ed-kpi-card ed-kpi-card--warn" + (kpiFilter === "in-review" ? " ed-kpi-card--active" : "")}
                  onClick={() => toggleKpi("in-review")}
                >
                  <div className="ed-kpi-number">{inProgressCount}</div>
                  <div className="ed-kpi-label">In Review</div>
                </button>
                <button
                  className={"ed-kpi-card ed-kpi-card--good" + (kpiFilter === "completed" ? " ed-kpi-card--active" : "")}
                  onClick={() => toggleKpi("completed")}
                >
                  <div className="ed-kpi-number">{completedCount}</div>
                  <div className="ed-kpi-label">Completed</div>
                </button>
                <button
                  className={"ed-kpi-card ed-kpi-card--accent" + (kpiFilter === "this-week" ? " ed-kpi-card--active" : "")}
                  onClick={() => toggleKpi("this-week")}
                >
                  <div className="ed-kpi-number">{thisWeekCount}</div>
                  <div className="ed-kpi-label">This Week</div>
                </button>
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
            </>
          )}

          {!showAllReviews && (
            <button
              onClick={() => setShowAllReviews(true)}
              style={{ marginTop: 2, fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              <ChevronDown size={13} /> Browse {visibleReviews.length} review{visibleReviews.length !== 1 ? "s" : ""}
            </button>
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
                  borderRadius: 8, padding: "8px 12px", cursor: "pointer", textAlign: "left",
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
                  }}>{action.badge}</span>
                )}
                <span style={{ color: action.primary ? "var(--bg)" : "var(--muted)", flexShrink: 0 }}>{action.icon}</span>
                <span style={{ color: action.primary ? "var(--bg)" : "var(--text)" }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
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

      </aside>
    </div>
  );
}
