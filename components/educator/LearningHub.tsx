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
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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

  type NavCard = {
    icon: React.ReactNode;
    label: string;
    hint: string;
    screen: Screen;
    show: boolean;
    description?: string;
  };

  const navCards: NavCard[] = [
    {
      icon: <Film size={20} />,
      label: "Clip Library",
      hint: `${tags.length} clip${tags.length !== 1 ? "s" : ""} from completed reviews`,
      description: "Browse and filter all coded review clips",
      screen: "clip-library",
      show: canViewClipLibrary,
    },
    {
      icon: <Library size={20} />,
      label: "Learning Library",
      hint: (() => { const n = tags.filter(t => t.isLearningClip).length; return n > 0 ? `${n} clip${n !== 1 ? "s" : ""} marked for learning` : "No clips marked yet"; })(),
      description: "Curated clips for education and quiz resources",
      screen: "learning-library",
      show: canViewClipLibrary,
    },
    {
      icon: <ListChecks size={20} />,
      label: "Playlists",
      hint: playlists.length > 0
        ? `${playlists.length} playlist${playlists.length !== 1 ? "s" : ""}`
        : "No playlists yet",
      description: "Curated clip collections for assignment",
      screen: "playlists",
      show: canAccessPlaylists,
    },
    {
      icon: <BookOpen size={20} />,
      label: "Assignments",
      hint: assignments.length > 0
        ? `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`
        : "No assignments yet",
      description: "Assign playlists and quizzes to referees",
      screen: "assignments",
      show: canViewAssignments,
    },
    {
      icon: <BarChart2 size={20} />,
      label: "Learning Progress",
      hint: totalUsers > 0 ? `${completionPct}% completion rate` : "Track referee progress",
      description: "Completion rates and assignment status",
      screen: "learning-progress",
      show: canViewAssignments,
    },
    {
      icon: <Users size={20} />,
      label: "Groups",
      hint: groupCount > 0
        ? `${groupCount} group${groupCount !== 1 ? "s" : ""}`
        : "Organise referees into cohorts",
      description: "Manage referee cohorts for bulk assignment",
      screen: "groups",
      show: canViewGroups,
    },
    {
      icon: <Zap size={20} />,
      label: "Referee Simulator",
      hint: simulatorCount > 0
        ? `${simulatorCount} simulation${simulatorCount !== 1 ? "s" : ""} available`
        : "No simulations yet",
      description: "Decision-making simulations from real game video",
      screen: "simulator-builder",
      show: canAccessSimulator,
    },
  ];

  const visibleCards = navCards.filter(c => c.show);
  const learningClipCount = tags.filter(t => t.isLearningClip).length;

  return (
    <PageFrame
      className="p-0"
      eyebrow="Learning Hub"
      title={session.activeOrganisation?.name ?? "Referee Learning"}
    >
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">

        {/* ── Main column ── */}
        <div className="grid grid-cols-1 gap-3.5">

          {/* Attention: overdue assignments */}
          {canViewAssignments && snapshot.overdueAssignments > 0 && (
            <button
              onClick={() => setScreen("learning-progress")}
              className="flex w-full items-center gap-2 rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-left text-sm text-red-300 transition-colors hover:bg-danger/10"
            >
              <AlertCircle size={14} className="shrink-0 text-red-400" />
              <span>
                <strong>{snapshot.overdueAssignments}</strong> overdue assignment{snapshot.overdueAssignments !== 1 ? "s" : ""} — some referees are behind on required work
              </span>
              <ChevronRight size={13} className="ml-auto shrink-0 opacity-50" />
            </button>
          )}

          {/* PRIMARY: Learning tools nav */}
          {visibleCards.length > 0 && (
            <div>
              <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Learning Tools</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visibleCards.map(card => (
                  <button
                    key={card.screen}
                    onClick={() => setScreen(card.screen)}
                    className="flex items-center gap-3.5 rounded-2xl border border-border bg-panel p-4 text-left shadow-sm transition-colors hover:border-accent"
                  >
                    <div className="shrink-0 text-accent">{card.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-text">{card.label}</div>
                      {card.description && <div className="mt-0.5 text-[11px] text-muted">{card.description}</div>}
                      <div className="mt-0.5 truncate text-xs text-muted">{card.hint}</div>
                    </div>
                    <ChevronRight size={15} className="shrink-0 text-muted opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state if no tools available */}
          {visibleCards.length === 0 && (
            <EmptyState
              icon={<GraduationCap size={32} />}
              title="No learning tools are enabled for your account."
              description="Contact your administrator to enable Clip Library, Playlists or Assignments."
            />
          )}

          {/* SECONDARY: Compact stats strip */}
          {visibleCards.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {canViewClipLibrary && (
                <Badge className="gap-1.5 py-1">
                  <Film size={12} /> <strong>{tags.length}</strong> Clips
                </Badge>
              )}
              {canViewClipLibrary && (
                <Badge className="gap-1.5 py-1">
                  <Library size={12} /> <strong>{learningClipCount}</strong> Learning clips
                </Badge>
              )}
              {canAccessPlaylists && (
                <Badge className="gap-1.5 py-1">
                  <ListChecks size={12} /> <strong>{playlists.length}</strong> Playlist{playlists.length !== 1 ? "s" : ""}
                </Badge>
              )}
              {canViewAssignments && (
                <Badge className="gap-1.5 py-1">
                  <BookOpen size={12} /> <strong>{assignments.length}</strong> Assignment{assignments.length !== 1 ? "s" : ""}
                </Badge>
              )}
              {canViewAssignments && totalUsers > 0 && (
                <Badge tone="good" className="gap-1.5 py-1">
                  <CheckCircle2 size={12} /> <strong>{completionPct}%</strong> Completion
                </Badge>
              )}
              {canViewAssignments && overdueCount > 0 && (
                <Badge tone="danger" className="gap-1.5 py-1">
                  <AlertCircle size={12} /> <strong>{overdueCount}</strong> Overdue
                </Badge>
              )}
              {canAccessSimulator && (
                <Badge className="gap-1.5 py-1">
                  <Zap size={12} /> <strong>{simulatorCount}</strong> Simulator{simulatorCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}

          {/* Referee Development */}
          {refereeMembers.length > 0 && onNavigateDevelopment && (
            <div>
              <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Referee Development</h2>
              <Card className="divide-y divide-border p-0">
                {refereeMembers.map(m => {
                  const mGoals = allRefereeGoalViews.filter(v => v.refereeId === m.id);
                  const active  = mGoals.filter(v => v.status === "Active").length;
                  const highPri = mGoals.filter(v => v.status === "Active" && v.priority === "High").length;
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                      <button
                        onClick={() => onNavigateDevelopment(m.id)}
                        className="flex min-w-0 items-center gap-2.5 text-left"
                        title={`View ${m.name}'s development`}
                      >
                        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border border-border bg-panel-3 text-xs font-bold text-muted">
                          {(m.name || "?")[0].toUpperCase()}
                        </span>
                        <span className="truncate text-sm font-semibold text-text hover:underline">
                          {m.name || m.email}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-2.5">
                        {active > 0
                          ? <span className="flex items-center gap-1 text-xs text-muted">
                              <Target size={11} />
                              {active} active goal{active !== 1 ? "s" : ""}
                              {highPri > 0 && <span className="ml-0.5 text-yellow-400">· {highPri} high</span>}
                            </span>
                          : <span className="text-xs text-muted">No active goals</span>
                        }
                        <Button variant="ghost" size="sm" className="px-2.5" onClick={() => onNavigateDevelopment(m.id)}>
                          View →
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

        </div>

        {/* ── Sidebar ── */}
        <aside className="grid grid-cols-1 gap-3.5">

          {/* Learning Snapshot widget */}
          {canViewAssignments && (
            <Card>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">Learning Snapshot</h3>
              <div className="grid divide-y divide-border">

                <button
                  className="flex items-center gap-2.5 py-2.5 text-left text-sm text-text transition-colors first:pt-0 last:pb-0 hover:text-accent"
                  onClick={() => setScreen("assignments")}
                >
                  <span className="flex-1 text-xs text-muted">Active assignments</span>
                  <strong className="min-w-[24px] text-right text-text">{snapshot.activeAssignments}</strong>
                  <ChevronRight size={13} className="shrink-0 opacity-40" />
                </button>

                <button
                  className={cn(
                    "flex items-center gap-2.5 py-2.5 text-left text-sm transition-colors first:pt-0 last:pb-0 hover:text-accent",
                    snapshot.overdueAssignments > 0 ? "text-red-300" : "text-text"
                  )}
                  onClick={() => setScreen("learning-progress")}
                >
                  <span className="flex-1 text-xs text-muted">Overdue assignments</span>
                  <strong className={cn("min-w-[24px] text-right", snapshot.overdueAssignments > 0 ? "text-red-400" : "text-text")}>
                    {snapshot.overdueAssignments}
                  </strong>
                  <ChevronRight size={13} className="shrink-0 opacity-40" />
                </button>

                <button
                  className="flex items-center gap-2.5 py-2.5 text-left text-sm text-text transition-colors first:pt-0 last:pb-0 hover:text-accent"
                  onClick={() => setScreen("learning-progress")}
                >
                  <span className="flex-1 text-xs text-muted">Referees learning now</span>
                  <strong className="min-w-[24px] text-right text-text">{snapshot.learningNow}</strong>
                  <ChevronRight size={13} className="shrink-0 opacity-40" />
                </button>

                <button
                  className="flex items-center gap-2.5 py-2.5 text-left text-sm text-text transition-colors first:pt-0 last:pb-0 hover:text-accent"
                  onClick={() => setScreen("learning-progress")}
                >
                  <span className="flex-1 text-xs text-muted">Completed this week</span>
                  <strong className="min-w-[24px] text-right text-text">{snapshot.completedThisWeek}</strong>
                  <ChevronRight size={13} className="shrink-0 opacity-40" />
                </button>

              </div>
            </Card>
          )}

          {/* Recent activity */}
          <Card>
            <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <EmptyState
                className="px-3 py-5"
                title="No learning activity yet."
                description={canAccessPlaylists ? "Create a playlist to get started." : undefined}
              />
            ) : (
              <div className="grid divide-y divide-border">
                {recentActivity.map(item => (
                  <div key={`${item.icon}::${item.ts}::${item.detail}`} className="flex gap-2.5 py-2 first:pt-0 last:pb-0">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="mb-px text-xs font-semibold text-text">{item.label}</p>
                      <p className="mb-px truncate text-xs text-muted">{item.detail}</p>
                      <p className="text-[11px] text-muted opacity-70">{fmtRel(item.ts)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </aside>
      </div>
    </PageFrame>
  );
}
