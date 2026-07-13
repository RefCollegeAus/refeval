"use client";

import { useMemo } from "react";
import {
  Film, ListChecks, BookOpen, BarChart2, GraduationCap,
  ChevronRight, CheckCircle2, AlertCircle, Users, Target, Library, Zap,
} from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { CodedTag } from "@/lib/types/reviews";
import type { Playlist } from "@/lib/types/playlists";
import type { Assignment } from "@/lib/types/assignments";
import type { MemberRecord } from "@/lib/types/members";
import type { RefereeGoalView } from "@/lib/types/developmentGoals";
import { fmtRel } from "@/lib/utils/time";

interface Props {
  session: RefEvalSession;
  tags: CodedTag[];
  playlists: Playlist[];
  assignments: Assignment[];
  members: MemberRecord[];
  groupCount: number;
  simulatorCount?: number;
  canViewClipLibrary: boolean;
  canAccessPlaylists: boolean;
  canViewAssignments: boolean;
  canViewGroups: boolean;
  canAccessSimulator?: boolean;
  setScreen: (screen: Screen) => void;
  refereeMembers?: MemberRecord[];
  allRefereeGoalViews?: RefereeGoalView[];
  onNavigateDevelopment?: (refereeId: string) => void;
}

export function LearningHub({
  session, tags, playlists, assignments, members, groupCount,
  simulatorCount = 0,
  canViewClipLibrary, canAccessPlaylists, canViewAssignments, canViewGroups,
  canAccessSimulator = false,
  setScreen, refereeMembers = [], allRefereeGoalViews = [], onNavigateDevelopment,
}: Props) {

  const now = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const allUsers = useMemo(
    () => assignments.flatMap(a => a.assignmentUsers),
    [assignments],
  );

  const { totalUsers, completedCount, completionPct, overdueCount } = useMemo(() => {
    const total     = allUsers.length;
    const completed = allUsers.filter(u => u.status === "Completed").length;
    const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
    const overdue   = allUsers.filter(u => {
      if (u.status === "Completed") return false;
      const a = assignments.find(x => x.id === u.assignmentId);
      return !!a?.dueDate && a.dueDate < now;
    }).length;
    return { totalUsers: total, completedCount: completed, completionPct: pct, overdueCount: overdue };
  }, [allUsers, assignments, now]);

  const snapshot = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const activeAssignments = assignments.filter(a =>
      a.assignmentUsers.some(u => u.status !== "Completed"),
    ).length;
    const overdueAssignments = assignments.filter(a =>
      !!a.dueDate && a.dueDate < now && a.assignmentUsers.some(u => u.status !== "Completed"),
    ).length;
    const learningNow = new Set(
      allUsers.filter(u => u.status === "Started").map(u => u.userId),
    ).size;
    const completedThisWeek = allUsers.filter(
      u => u.status === "Completed" && !!u.completedAt && u.completedAt >= weekAgo,
    ).length;
    return { activeAssignments, overdueAssignments, learningNow, completedThisWeek };
  }, [assignments, allUsers, now]);

  type ActivityItem = {
    icon: "assignment" | "completed" | "playlist" | "overdue";
    label: string;
    detail: string;
    ts: string;
  };

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    assignments.forEach(a => {
      items.push({ icon: "assignment", label: "Assignment created", detail: a.title, ts: a.createdAt });
      a.assignmentUsers.forEach(u => {
        if (u.completedAt) {
          items.push({ icon: "completed", label: "Learning completed", detail: a.title, ts: u.completedAt });
        }
      });
    });
    playlists.forEach(p => {
      items.push({ icon: "playlist", label: "Playlist created", detail: p.title, ts: p.createdAt });
    });
    return items.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 16);
  }, [assignments, playlists]);

  const activityColor = (type: ActivityItem["icon"]) => {
    switch (type) {
      case "completed":  return "#22c55e";
      case "assignment": return "#3b82f6";
      case "playlist":   return "#8b5cf6";
      case "overdue":    return "#ef4444";
    }
  };

  type NavCard = {
    icon: React.ReactNode;
    label: string;
    hint: string;
    screen: Screen;
    show: boolean;
    accent?: boolean;
    green?: boolean;
    description?: string;
  };

  const navCards: NavCard[] = [
    {
      icon: <Film size={22} />,
      label: "Clip Library",
      hint: `${tags.length} clip${tags.length !== 1 ? "s" : ""} from completed reviews`,
      description: "Browse and filter all coded review clips",
      screen: "clip-library",
      show: canViewClipLibrary,
    },
    {
      icon: <Library size={22} />,
      label: "Learning Library",
      hint: (() => { const n = tags.filter(t => t.isLearningClip).length; return n > 0 ? `${n} clip${n !== 1 ? "s" : ""} marked for learning` : "No clips marked yet"; })(),
      description: "Curated clips for education and quiz resources",
      screen: "learning-library",
      show: canViewClipLibrary,
      green: true,
    },
    {
      icon: <ListChecks size={22} />,
      label: "Playlists",
      hint: playlists.length > 0
        ? `${playlists.length} playlist${playlists.length !== 1 ? "s" : ""}`
        : "No playlists yet",
      description: "Curated clip collections for assignment",
      screen: "playlists",
      show: canAccessPlaylists,
    },
    {
      icon: <BookOpen size={22} />,
      label: "Assignments",
      hint: assignments.length > 0
        ? `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`
        : "No assignments yet",
      description: "Assign playlists and quizzes to referees",
      screen: "assignments",
      show: canViewAssignments,
    },
    {
      icon: <BarChart2 size={22} />,
      label: "Learning Progress",
      hint: totalUsers > 0 ? `${completionPct}% completion rate` : "Track referee progress",
      description: "Completion rates and assignment status",
      screen: "learning-progress",
      show: canViewAssignments,
      accent: true,
    },
    {
      icon: <Users size={22} />,
      label: "Groups",
      hint: groupCount > 0
        ? `${groupCount} group${groupCount !== 1 ? "s" : ""}`
        : "Organise referees into cohorts",
      description: "Manage referee cohorts for bulk assignment",
      screen: "groups",
      show: canViewGroups,
    },
    {
      icon: <Zap size={22} />,
      label: "Referee Simulator",
      hint: simulatorCount > 0
        ? `${simulatorCount} simulation${simulatorCount !== 1 ? "s" : ""} available`
        : "No simulations yet",
      description: "Decision-making simulations from real game video",
      screen: "simulator-builder",
      show: canAccessSimulator,
      accent: true,
    },
  ];

  const visibleCards = navCards.filter(c => c.show);
  const learningClipCount = tags.filter(t => t.isLearningClip).length;

  return (
    <div className="lh-layout">

      {/* ── Main column ── */}
      <div className="lh-main">

        {/* Compact page header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(165,106,27,.12)", border: "1px solid rgba(165,106,27,.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent)", flexShrink: 0,
          }}>
            <GraduationCap size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Learning Hub</p>
            <h1 style={{ margin: 0, fontSize: 20 }}>
              {session.activeOrganisation?.name ?? "Referee Learning"}
            </h1>
          </div>
        </div>

        {/* Attention: overdue assignments */}
        {canViewAssignments && snapshot.overdueAssignments > 0 && (
          <button className="lh-attention-row" onClick={() => setScreen("learning-progress")}>
            <AlertCircle size={14} style={{ color: "#ef4444", flexShrink: 0 }} />
            <span>
              <strong>{snapshot.overdueAssignments}</strong> overdue assignment{snapshot.overdueAssignments !== 1 ? "s" : ""} — some referees are behind on required work
            </span>
            <ChevronRight size={13} style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.5 }} />
          </button>
        )}

        {/* PRIMARY: Learning tools nav */}
        {visibleCards.length > 0 && (
          <div>
            <h2 className="lh-section-title">Learning Tools</h2>
            <div className="lh-nav-grid">
              {visibleCards.map(card => (
                <button
                  key={card.screen}
                  className={"lh-nav-card" + (card.accent ? " lh-nav-card--accent" : "") + (card.green ? " lh-nav-card--green" : "")}
                  onClick={() => setScreen(card.screen)}
                >
                  <div className="lh-nav-card-icon">{card.icon}</div>
                  <div className="lh-nav-card-body">
                    <div className="lh-nav-card-label">{card.label}</div>
                    {card.description && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{card.description}</div>}
                    <div className="lh-nav-card-hint" style={{ marginTop: card.description ? 3 : undefined }}>{card.hint}</div>
                  </div>
                  <ChevronRight size={15} className="lh-nav-chevron" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state if no tools available */}
        {visibleCards.length === 0 && (
          <div className="empty-state">
            <GraduationCap size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p>No learning tools are enabled for your account.</p>
            <p className="hint" style={{ fontSize: 13 }}>
              Contact your administrator to enable Clip Library, Playlists or Assignments.
            </p>
          </div>
        )}

        {/* SECONDARY: Compact stats strip */}
        {visibleCards.length > 0 && (
          <div className="lh-compact-stats">
            {canViewClipLibrary && (
              <span className="lh-compact-stat">
                <Film size={12} /> <strong>{tags.length}</strong> Clips
              </span>
            )}
            {canViewClipLibrary && (
              <span className="lh-compact-stat lh-compact-stat--green">
                <Library size={12} /> <strong>{learningClipCount}</strong> Learning clips
              </span>
            )}
            {canAccessPlaylists && (
              <span className="lh-compact-stat">
                <ListChecks size={12} /> <strong>{playlists.length}</strong> Playlist{playlists.length !== 1 ? "s" : ""}
              </span>
            )}
            {canViewAssignments && (
              <span className="lh-compact-stat">
                <BookOpen size={12} /> <strong>{assignments.length}</strong> Assignment{assignments.length !== 1 ? "s" : ""}
              </span>
            )}
            {canViewAssignments && totalUsers > 0 && (
              <span className="lh-compact-stat lh-compact-stat--good">
                <CheckCircle2 size={12} /> <strong>{completionPct}%</strong> Completion
              </span>
            )}
            {canViewAssignments && overdueCount > 0 && (
              <span className="lh-compact-stat lh-compact-stat--danger">
                <AlertCircle size={12} /> <strong>{overdueCount}</strong> Overdue
              </span>
            )}
            {canAccessSimulator && (
              <span className="lh-compact-stat">
                <Zap size={12} /> <strong>{simulatorCount}</strong> Simulator{simulatorCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Referee Development */}
        {refereeMembers.length > 0 && onNavigateDevelopment && (
          <div>
            <h2 className="lh-section-title">Referee Development</h2>
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              {refereeMembers.map((m, idx) => {
                const mGoals = allRefereeGoalViews.filter(v => v.refereeId === m.id);
                const active  = mGoals.filter(v => v.status === "Active").length;
                const highPri = mGoals.filter(v => v.status === "Active" && v.priority === "High").length;
                const isLast  = idx === refereeMembers.length - 1;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom: isLast ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <button
                      onClick={() => onNavigateDevelopment(m.id)}
                      style={{
                        background: "none", border: "none", boxShadow: "none",
                        padding: 0, cursor: "pointer", textAlign: "left",
                        display: "flex", alignItems: "center", gap: 10, minWidth: 0,
                      }}
                      title={`View ${m.name}'s development`}
                    >
                      <span style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: "var(--panel3)", border: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, fontSize: 12, fontWeight: 700, color: "var(--muted)",
                      }}>
                        {(m.name || "?")[0].toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: 600, color: "var(--text)",
                        textDecoration: "underline", textDecorationColor: "transparent",
                        textUnderlineOffset: 2, transition: "text-decoration-color 0.15s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.textDecorationColor = "var(--muted)")}
                        onMouseLeave={e => (e.currentTarget.style.textDecorationColor = "transparent")}
                      >
                        {m.name || m.email}
                      </span>
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {active > 0
                        ? <span className="hint" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                            <Target size={11} />
                            {active} active goal{active !== 1 ? "s" : ""}
                            {highPri > 0 && <span style={{ color: "#f59e0b", marginLeft: 2 }}>· {highPri} high</span>}
                          </span>
                        : <span className="hint" style={{ fontSize: 12 }}>No active goals</span>
                      }
                      <button
                        onClick={() => onNavigateDevelopment(m.id)}
                        style={{ fontSize: 11, padding: "3px 10px", flexShrink: 0 }}
                      >
                        View →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── Sidebar ── */}
      <aside className="lh-sidebar">

        {/* Learning Snapshot widget */}
        {canViewAssignments && (
          <div className="panel">
            <h3 className="ed-section-title" style={{ marginBottom: 12 }}>Learning Snapshot</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

              <button className="lh-snapshot-row" onClick={() => setScreen("assignments")}>
                <span className="lh-snapshot-dot" style={{ background: "#3b82f6" }} />
                <span className="lh-snapshot-label">Active assignments</span>
                <strong className="lh-snapshot-value">{snapshot.activeAssignments}</strong>
                <ChevronRight size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
              </button>

              <button
                className="lh-snapshot-row"
                onClick={() => setScreen("learning-progress")}
                style={snapshot.overdueAssignments > 0 ? { color: "#fca5a5" } : undefined}
              >
                <span className="lh-snapshot-dot" style={{ background: snapshot.overdueAssignments > 0 ? "#ef4444" : "var(--border)" }} />
                <span className="lh-snapshot-label">Overdue assignments</span>
                <strong className="lh-snapshot-value" style={snapshot.overdueAssignments > 0 ? { color: "#ef4444" } : undefined}>
                  {snapshot.overdueAssignments}
                </strong>
                <ChevronRight size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
              </button>

              <button className="lh-snapshot-row" onClick={() => setScreen("learning-progress")}>
                <span className="lh-snapshot-dot" style={{ background: "#22c55e" }} />
                <span className="lh-snapshot-label">Referees learning now</span>
                <strong className="lh-snapshot-value">{snapshot.learningNow}</strong>
                <ChevronRight size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
              </button>

              <button className="lh-snapshot-row lh-snapshot-row--last" onClick={() => setScreen("learning-progress")}>
                <span className="lh-snapshot-dot" style={{ background: "#8b5cf6" }} />
                <span className="lh-snapshot-label">Completed this week</span>
                <strong className="lh-snapshot-value">{snapshot.completedThisWeek}</strong>
                <ChevronRight size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
              </button>

            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="panel">
          <h3 className="ed-section-title" style={{ marginBottom: 10 }}>Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <div className="empty-state" style={{ padding: "20px 12px" }}>
              <p className="hint" style={{ fontSize: 13, margin: 0 }}>No learning activity yet.</p>
              <p className="hint" style={{ fontSize: 12, margin: "4px 0 0" }}>
                {canAccessPlaylists ? "Create a playlist to get started." : ""}
              </p>
            </div>
          ) : (
            <div className="ed-activity-list">
              {recentActivity.map(item => (
                <div key={`${item.icon}::${item.ts}::${item.detail}`} className="ed-activity-item">
                  <div className="ed-activity-dot" style={{ background: activityColor(item.icon) }} />
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
