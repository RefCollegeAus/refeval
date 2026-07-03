"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Plus, CheckCircle, Archive, RotateCcw, Pencil, Trash2,
  ChevronLeft, Users, User, UserCheck, FileText, Lock, Eye,
  Clock, BarChart2, Zap,
} from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { MemberRecord } from "@/lib/types/members";
import type {
  DevGoalDef, RefereeGoal, RefereeGoalView,
  GoalStatus, AssignGoalInput, GoalAssignmentType,
} from "@/lib/types/developmentGoals";
import { GOAL_CATEGORIES, GOAL_PRIORITIES } from "@/lib/types/developmentGoals";
import type { DevelopmentNote, CreateNoteInput, NoteType, NoteVisibility } from "@/lib/types/developmentNotes";
import { NOTE_TYPES, NOTE_VISIBILITIES } from "@/lib/types/developmentNotes";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { ReviewGoalLink } from "@/lib/types/reviewGoalLinks";
import {
  buildTimeline, filterTimeline,
  type TimelineFilter, type TimelineEvent, type TimelineEventKind,
} from "@/lib/utils/developmentTimeline";

// ── Colour tokens ─────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  Low:    "#636366",
  Medium: "#ff9f0a",
  High:   "#ff453a",
};

const PRIORITY_BG: Record<string, string> = {
  Low:    "rgba(99,99,102,.15)",
  Medium: "rgba(255,159,10,.12)",
  High:   "rgba(255,69,58,.12)",
};

const STATUS_COLOR: Record<GoalStatus, string> = {
  Active:    "#0a84ff",
  Completed: "#30d158",
  Archived:  "#636366",
};

const STATUS_BG: Record<GoalStatus, string> = {
  Active:    "rgba(10,132,255,.1)",
  Completed: "rgba(48,209,88,.1)",
  Archived:  "rgba(99,99,102,.12)",
};

const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

// ── Shared display helpers ────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
      background: PRIORITY_BG[priority] ?? "rgba(99,99,102,.15)",
      color: PRIORITY_COLOR[priority] ?? "var(--muted)",
      border: `1px solid ${(PRIORITY_COLOR[priority] ?? "#636366")}44`,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: GoalStatus }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
      background: STATUS_BG[status],
      color: STATUS_COLOR[status],
      border: `1px solid ${STATUS_COLOR[status]}44`,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {status}
    </span>
  );
}

function CategoryChip({ category }: { category: string }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 9px", borderRadius: 999,
      background: "rgba(165,106,27,.1)", color: "var(--accent)",
      border: "1px solid rgba(165,106,27,.25)", fontWeight: 600,
    }}>
      {category}
    </span>
  );
}

function NoteTypeBadge({ type }: { type: NoteType }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
      background: "rgba(99,99,102,.12)", color: "var(--muted)",
      border: "1px solid rgba(99,99,102,.2)",
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {type}
    </span>
  );
}

function VisibilityBadge({ visibility }: { visibility: NoteVisibility }) {
  const isPrivate = visibility === "Educator Only";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
      display: "inline-flex", alignItems: "center", gap: 4,
      background: isPrivate ? "rgba(255,159,10,.1)" : "rgba(48,209,88,.1)",
      color: isPrivate ? "#ff9f0a" : "#30d158",
      border: `1px solid ${isPrivate ? "rgba(255,159,10,.3)" : "rgba(48,209,88,.3)"}`,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {isPrivate ? <Lock size={9} /> : <Eye size={9} />}
      {visibility}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ── Page-level tab switcher ───────────────────────────────────────────────────

type DevPage = "overview" | "goals" | "notes" | "timeline";

function PageTabs({
  active,
  goalCount,
  noteCount,
  timelineCount,
  onChange,
}: {
  active: DevPage;
  goalCount: number;
  noteCount: number;
  timelineCount: number;
  onChange: (p: DevPage) => void;
}) {
  const tabs: { key: DevPage; label: string }[] = [
    { key: "overview",  label: "Overview" },
    { key: "goals",     label: `Goals${goalCount > 0 ? ` (${goalCount})` : ""}` },
    { key: "notes",     label: `Notes${noteCount > 0 ? ` (${noteCount})` : ""}` },
    { key: "timeline",  label: `Timeline${timelineCount > 0 ? ` (${timelineCount})` : ""}` },
  ];
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
      {tabs.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              fontSize: 14, fontWeight: isActive ? 700 : 400,
              padding: "10px 20px", borderRadius: 0, background: "transparent",
              color: isActive ? "var(--text)" : "var(--muted)",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Timeline components ───────────────────────────────────────────────────────

const KIND_LABEL: Record<TimelineEventKind, string> = {
  goal_assigned:        "Goal Assigned",
  goal_completed:       "Goal Completed",
  goal_archived:        "Goal Archived",
  goal_reopened:        "Goal Reopened",
  note_added:           "Note Added",
  review_completed:     "Review Completed",
  review_linked_to_goal:"Review Linked",
};

const KIND_ICON: Record<TimelineEventKind, string> = {
  goal_assigned:        "🎯",
  goal_completed:       "✅",
  goal_archived:        "📦",
  goal_reopened:        "🔄",
  note_added:           "📝",
  review_completed:     "🎬",
  review_linked_to_goal:"🔗",
};

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 3 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: "var(--panel2)",
          border: "2px solid var(--border)", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 13,
        }}>
          {KIND_ICON[event.kind]}
        </div>
      </div>
      <div className="panel" style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{event.title}</p>
          </div>
          {event.badge && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
              background: `${event.badgeColor ?? "#636366"}18`,
              color: event.badgeColor ?? "#636366",
              border: `1px solid ${event.badgeColor ?? "#636366"}44`,
              textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0,
            }}>
              {event.badge}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {KIND_LABEL[event.kind]}
          </span>
          <span className="hint" style={{ fontSize: 12 }}>·</span>
          <span className="hint" style={{ fontSize: 12 }}>{fmtDate(event.date)}</span>
        </div>
        {event.description && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}

const TIMELINE_FILTERS: { key: TimelineFilter; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "goals",   label: "Goals" },
  { key: "notes",   label: "Notes" },
  { key: "reviews", label: "Reviews" },
];

function TimelineTab({ events, hasReviews }: { events: TimelineEvent[]; hasReviews: boolean }) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const visible = filterTimeline(events, filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TIMELINE_FILTERS.map(f => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontSize: 13, padding: "5px 14px", borderRadius: 8,
                  background: isActive ? "rgba(165,106,27,.1)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--muted)",
                  border: `1px solid ${isActive ? "rgba(165,106,27,.35)" : "var(--border)"}`,
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <span className="hint" style={{ fontSize: 12 }}>{visible.length} event{visible.length !== 1 ? "s" : ""}</span>
      </div>

      {filter === "reviews" && !hasReviews && (
        <div className="panel" style={{ padding: "20px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14 }}>No completed reviews</p>
          <p className="hint" style={{ margin: 0, fontSize: 13 }}>Completed video reviews featuring this referee will appear here automatically.</p>
        </div>
      )}

      {events.length === 0 && (
        <div className="panel" style={{ padding: "36px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 40 }}>📋</span>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>No activity yet</p>
          <p className="hint" style={{ margin: 0, maxWidth: 440, fontSize: 13, lineHeight: 1.6 }}>
            As you assign goals, add coaching notes, and complete video reviews for this referee,
            their full development history will appear here in one chronological view.
          </p>
        </div>
      )}

      {events.length > 0 && visible.length === 0 && (
        <div className="panel" style={{ padding: "28px 24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14 }}>No {filter} events</p>
          <p className="hint" style={{ margin: 0, fontSize: 13 }}>Switch to "All" to see everything.</p>
        </div>
      )}

      {visible.length > 0 && (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            position: "absolute", left: 13, top: 28, bottom: 14,
            width: 2, background: "var(--border)", borderRadius: 1,
          }} />
          {visible.map(ev => <TimelineEventCard key={ev.id} event={ev} />)}
        </div>
      )}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewSectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{title}</h2>
      {action && (
        <button
          onClick={action.onClick}
          style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600, flexShrink: 0 }}
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}

function OverviewTab({
  goalViews,
  notes,
  timelineEvents,
  completedReviews,
  canEdit,
  onAssignGoal,
  onAddNote,
  onViewGoals,
  onViewNotes,
  onViewTimeline,
}: {
  goalViews: RefereeGoalView[];
  notes: DevelopmentNote[];
  timelineEvents: TimelineEvent[];
  completedReviews: ReviewRecord[];
  canEdit: boolean;
  onAssignGoal: () => void;
  onAddNote: () => void;
  onViewGoals: () => void;
  onViewNotes: () => void;
  onViewTimeline: () => void;
}) {
  // Current Focus: active goals sorted High → Medium → Low, then newest first
  const focusGoals = useMemo(
    () =>
      goalViews
        .filter(v => v.status === "Active")
        .sort((a, b) => {
          const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          return pr !== 0 ? pr : b.createdAt.localeCompare(a.createdAt);
        })
        .slice(0, 3),
    [goalViews],
  );

  const activeCount    = goalViews.filter(v => v.status === "Active").length;
  const completedCount = goalViews.filter(v => v.status === "Completed").length;
  const recentEvents   = timelineEvents.slice(0, 5);

  const latestReview = completedReviews.length > 0
    ? completedReviews.reduce((best, r) => {
        const d = r.submittedAt ?? r.createdAt;
        return d > (best.submittedAt ?? best.createdAt) ? r : best;
      })
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Current Focus ─────────────────────────────────────── */}
      <section>
        <OverviewSectionHeader
          title="Current Focus"
          action={activeCount > 3 ? { label: `View all ${activeCount} goals`, onClick: onViewGoals } : undefined}
        />
        {focusGoals.length === 0 ? (
          <div className="panel" style={{ padding: "28px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 34 }}>🎯</span>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>No active development goals</p>
            <p className="hint" style={{ margin: 0, maxWidth: 380, fontSize: 13 }}>
              {canEdit
                ? "Assign a goal to give this referee a clear focus area for their next games."
                : "No active goals have been set for this referee yet."}
            </p>
            {canEdit && (
              <button className="primary" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }} onClick={onAssignGoal}>
                <Plus size={13} /> Assign Goal
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {focusGoals.map((v, i) => (
              <div
                key={v.id}
                className="panel"
                style={{
                  padding: "14px 18px",
                  display: "flex", gap: 14, alignItems: "flex-start",
                  borderLeft: `3px solid ${PRIORITY_COLOR[v.priority] ?? "var(--border)"}`,
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: `${PRIORITY_COLOR[v.priority] ?? "#636366"}18`,
                  color: PRIORITY_COLOR[v.priority] ?? "var(--muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, marginTop: 1,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{v.title}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <CategoryChip category={v.category} />
                    <PriorityBadge priority={v.priority} />
                    {v.targetReviewDate && (
                      <span className="hint" style={{ fontSize: 11 }}>Target {fmtDate(v.targetReviewDate)}</span>
                    )}
                  </div>
                  {v.description && (
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                      {v.description.length > 140 ? v.description.slice(0, 137) + "…" : v.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent Activity ────────────────────────────────────── */}
      <section>
        <OverviewSectionHeader
          title="Recent Activity"
          action={timelineEvents.length > 5 ? { label: "View full timeline", onClick: onViewTimeline } : undefined}
        />
        {recentEvents.length === 0 ? (
          <div className="panel" style={{ padding: "28px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 34 }}>📋</span>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>No activity yet</p>
            <p className="hint" style={{ margin: 0, maxWidth: 380, fontSize: 13 }}>
              Goals assigned, notes added and completed reviews will build up a history here.
            </p>
          </div>
        ) : (
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              position: "absolute", left: 13, top: 28, bottom: 14,
              width: 2, background: "var(--border)", borderRadius: 1,
            }} />
            {recentEvents.map(ev => <TimelineEventCard key={ev.id} event={ev} />)}
            {timelineEvents.length > 5 && (
              <button
                onClick={onViewTimeline}
                style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: "4px 0", textAlign: "left", marginLeft: 42 }}
              >
                View all {timelineEvents.length} events →
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Development Summary ────────────────────────────────── */}
      <section>
        <OverviewSectionHeader title="Development Summary" />
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {[
              { label: "Active Goals",      value: activeCount,               colour: STATUS_COLOR.Active,    onClick: onViewGoals },
              { label: "Completed Goals",   value: completedCount,            colour: STATUS_COLOR.Completed, onClick: onViewGoals },
              { label: "Coaching Notes",    value: notes.length,              colour: "#bf5af2",              onClick: onViewNotes },
              { label: "Reviews Completed", value: completedReviews.length,   colour: "#30d158",              onClick: onViewTimeline },
            ].map(({ label, value, colour, onClick }, idx) => (
              <button
                key={label}
                onClick={onClick}
                style={{
                  padding: "16px 18px", textAlign: "left", background: "none",
                  borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: colour, lineHeight: 1 }}>{value}</p>
                <p className="hint" style={{ margin: 0, fontSize: 12 }}>{label}</p>
              </button>
            ))}
          </div>
          {latestReview && (
            <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)" }}>
              <span className="hint" style={{ fontSize: 12 }}>
                Latest review: <strong style={{ color: "var(--text)", fontWeight: 600 }}>{latestReview.game || "Untitled"}</strong>
                {" · "}{fmtDate(latestReview.submittedAt ?? latestReview.createdAt)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Quick Actions ──────────────────────────────────────── */}
      {canEdit && (
        <section>
          <OverviewSectionHeader title="Quick Actions" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="primary"
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
              onClick={onAssignGoal}
            >
              <Plus size={13} /> Assign Development Goal
            </button>
            <button
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
              onClick={onAddNote}
            >
              <FileText size={13} /> Add Coaching Note
            </button>
            <button
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
              onClick={onViewTimeline}
            >
              <Clock size={13} /> View Full Timeline
            </button>
          </div>
        </section>
      )}

      {/* ── Coming Soon ────────────────────────────────────────── */}
      <section>
        <OverviewSectionHeader title="Coming Soon" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {[
            { icon: "🏅", label: "Competencies",        hint: "Track assessed competency areas over time." },
            { icon: "📚", label: "Learning Progress",    hint: "Link completed learning modules to development goals." },
            { icon: "⬆️",  label: "Promotion Readiness", hint: "Summarise readiness for the next referee grade." },
          ].map(({ icon, label, hint }) => (
            <div
              key={label}
              className="panel"
              style={{ padding: "16px 18px", opacity: 0.5, display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4,
                  background: "rgba(99,99,102,.15)", color: "var(--muted)",
                  border: "1px solid rgba(99,99,102,.2)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Coming Soon
                </span>
              </div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{label}</p>
              <p className="hint" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{hint}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

// ── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  view,
  canEdit,
  supportingReviews,
  onEdit,
  onComplete,
  onArchive,
  onReopen,
  onDelete,
}: {
  view: RefereeGoalView;
  canEdit: boolean;
  supportingReviews: ReviewRecord[];
  onEdit: (view: RefereeGoalView) => void;
  onComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="panel" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{view.title}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
          <StatusBadge status={view.status} />
          <PriorityBadge priority={view.priority} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <CategoryChip category={view.category} />
        <span className="hint" style={{ fontSize: 12 }}>Created {fmtDate(view.createdAt)}</span>
        {view.targetReviewDate && (
          <span className="hint" style={{ fontSize: 12 }}>· Target review {fmtDate(view.targetReviewDate)}</span>
        )}
        {view.completedAt && (
          <span style={{ fontSize: 12, color: STATUS_COLOR.Completed }}>· Completed {fmtDate(view.completedAt)}</span>
        )}
      </div>

      {view.description && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {view.description}
        </p>
      )}

      {view.notes && (
        <div style={{ background: "rgba(165,106,27,.07)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(165,106,27,.2)" }}>
          <p className="hint" style={{ margin: "0 0 2px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{view.notes}</p>
        </div>
      )}

      {supportingReviews.length > 0 && (
        <div style={{ background: "rgba(191,90,242,.06)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(191,90,242,.2)" }}>
          <p className="hint" style={{ margin: "0 0 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Supporting Reviews ({supportingReviews.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {supportingReviews.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ fontSize: 11 }}>🎬</span>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{r.game || "Untitled"}</span>
                <span className="hint">{fmtDate(r.submittedAt ?? r.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {canEdit && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 2 }}>
          <button style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }} onClick={() => onEdit(view)}>
            <Pencil size={12} /> Edit
          </button>
          {view.status === "Active" && (
            <>
              <button
                style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: STATUS_COLOR.Completed }}
                onClick={() => onComplete(view.id)}
              >
                <CheckCircle size={12} /> Complete
              </button>
              <button
                style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: "var(--muted)" }}
                onClick={() => onArchive(view.id)}
              >
                <Archive size={12} /> Archive
              </button>
            </>
          )}
          {(view.status === "Completed" || view.status === "Archived") && (
            <button
              style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: STATUS_COLOR.Active }}
              onClick={() => onReopen(view.id)}
            >
              <RotateCcw size={12} /> Reopen
            </button>
          )}
          {view.status === "Active" && (
            <button
              style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: "#ff453a", marginLeft: "auto" }}
              onClick={() => {
                if (window.confirm(`Delete goal "${view.title}"? This removes only this referee's copy.`)) {
                  onDelete(view.id);
                }
              }}
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Note Card ─────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  linkedGoalTitle,
  canEdit,
  onEdit,
  onDelete,
}: {
  note: DevelopmentNote;
  linkedGoalTitle: string | null;
  canEdit: boolean;
  onEdit: (note: DevelopmentNote) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="panel" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{note.title}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
          <VisibilityBadge visibility={note.visibility} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <NoteTypeBadge type={note.noteType} />
        <span className="hint" style={{ fontSize: 12 }}>{fmtDate(note.createdAt)}</span>
        {note.updatedAt !== note.createdAt && (
          <span className="hint" style={{ fontSize: 12 }}>· edited {fmtDate(note.updatedAt)}</span>
        )}
      </div>

      {linkedGoalTitle && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Linked goal</span>
          <span style={{ fontWeight: 600, color: "var(--accent)" }}>{linkedGoalTitle}</span>
        </div>
      )}

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--text)" }}>
        {note.body}
      </p>

      {canEdit && (
        <div style={{ display: "flex", gap: 6, paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 2 }}>
          <button
            style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
            onClick={() => onEdit(note)}
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, color: "#ff453a", marginLeft: "auto" }}
            onClick={() => {
              if (window.confirm(`Delete note "${note.title}"? This cannot be undone.`)) {
                onDelete(note.id);
              }
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function GoalEmptyState({ status, canEdit, onCreateGoal }: { status: GoalStatus; canEdit: boolean; onCreateGoal?: () => void }) {
  const messages: Record<GoalStatus, { icon: string; heading: string; body: string }> = {
    Active:    { icon: "🎯", heading: "No active development goals",
      body: canEdit ? "Create this referee's first development goal to start building their long-term coaching record." : "No active development goals have been set yet." },
    Completed: { icon: "✅", heading: "No completed goals yet",  body: "Completed goals will appear here once a referee achieves them." },
    Archived:  { icon: "📦", heading: "No archived goals",       body: "Goals that are no longer active but not yet completed are archived here." },
  };
  const m = messages[status];
  return (
    <div className="panel" style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 36 }}>{m.icon}</span>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{m.heading}</p>
      <p className="hint" style={{ margin: 0, maxWidth: 420, fontSize: 13 }}>{m.body}</p>
      {status === "Active" && canEdit && onCreateGoal && (
        <button className="primary" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }} onClick={onCreateGoal}>
          <Plus size={14} /> Assign Goal
        </button>
      )}
    </div>
  );
}

function NoteEmptyState({ canEdit, onCreateNote }: { canEdit: boolean; onCreateNote?: () => void }) {
  return (
    <div className="panel" style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 36 }}>📝</span>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>No development notes yet</p>
      <p className="hint" style={{ margin: 0, maxWidth: 440, fontSize: 13 }}>
        {canEdit
          ? "Record coaching conversations, sideline observations and check-in notes here. Notes stay private unless you share them with the referee."
          : "No development notes have been recorded for this referee yet."}
      </p>
      {canEdit && onCreateNote && (
        <button className="primary" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }} onClick={onCreateNote}>
          <Plus size={14} /> Add Note
        </button>
      )}
    </div>
  );
}

// ── Goal filter tabs ──────────────────────────────────────────────────────────

function GoalFilterTabs({ active, counts, onChange }: { active: GoalStatus; counts: Record<GoalStatus, number>; onChange: (s: GoalStatus) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {(["Active", "Completed", "Archived"] as GoalStatus[]).map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          style={{
            fontSize: 13, padding: "5px 14px", borderRadius: 8,
            background: active === s ? STATUS_BG[s] : "transparent",
            color: active === s ? STATUS_COLOR[s] : "var(--muted)",
            border: `1px solid ${active === s ? STATUS_COLOR[s] + "55" : "var(--border)"}`,
            fontWeight: active === s ? 700 : 400,
          }}
        >
          {s} {counts[s] > 0 ? <span style={{ opacity: 0.7 }}>({counts[s]})</span> : null}
        </button>
      ))}
    </div>
  );
}

// ── Goal form modal ───────────────────────────────────────────────────────────

type GoalFormMode =
  | { type: "create"; defaultRefereeId: string }
  | { type: "edit"; view: RefereeGoalView };

const ASSIGN_TYPE_OPTIONS: { value: GoalAssignmentType; label: string; icon: React.ReactNode }[] = [
  { value: "Individual",       label: "Individual",        icon: <User size={14} /> },
  { value: "SelectedReferees", label: "Selected Referees", icon: <UserCheck size={14} /> },
  { value: "Everyone",         label: "Everyone",          icon: <Users size={14} /> },
];

function GoalFormModal({
  mode,
  refereeMembers,
  totalRefereeCount,
  onSave,
  onClose,
}: {
  mode: GoalFormMode;
  refereeMembers: MemberRecord[];
  totalRefereeCount: number;
  onSave: (
    defPatch: Pick<DevGoalDef, "title" | "description" | "category" | "priority">,
    rgPatch: Pick<RefereeGoal, "targetReviewDate" | "notes">,
    assignInput?: AssignGoalInput,
  ) => void;
  onClose: () => void;
}) {
  const existing = mode.type === "edit" ? mode.view : null;
  const [title, setTitle]             = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory]       = useState<string>(existing?.category ?? GOAL_CATEGORIES[0]);
  const [priority, setPriority]       = useState<string>(existing?.priority ?? "Medium");
  const [targetDate, setTargetDate]   = useState(existing?.targetReviewDate ?? "");
  const [notes, setNotes]             = useState(existing?.notes ?? "");
  const [assignType, setAssignType]   = useState<GoalAssignmentType>("Individual");
  const [selectedOne, setSelectedOne] = useState(mode.type === "create" ? mode.defaultRefereeId : "");
  const [selectedMany, setSelectedMany] = useState<Set<string>>(
    mode.type === "create" ? new Set([mode.defaultRefereeId]) : new Set(),
  );
  const [error, setError] = useState("");
  const isCreate = mode.type === "create";

  function toggleMany(id: string) {
    setSelectedMany(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (isCreate) {
      if (assignType === "Individual" && !selectedOne) { setError("Please select a referee."); return; }
      if (assignType === "SelectedReferees" && selectedMany.size === 0) { setError("Please select at least one referee."); return; }
    }
    setError("");
    const defPatch = { title: title.trim(), description: description.trim(), category: category as DevGoalDef["category"], priority: priority as DevGoalDef["priority"] };
    const rgPatch  = { targetReviewDate: targetDate || null, notes: notes.trim() };
    if (isCreate) {
      const assignedRefereeIds = assignType === "Individual" ? [selectedOne] : assignType === "SelectedReferees" ? Array.from(selectedMany) : [];
      onSave(defPatch, rgPatch, { ...defPatch, assignmentType: assignType, assignedRefereeIds, targetReviewDate: targetDate || null });
    } else {
      onSave(defPatch, rgPatch);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">Development Goal</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>{isCreate ? "Assign Goal" : "Edit Goal"}</h1>
          </div>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          {isCreate && (
            <div>
              <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13 }}>Assign to</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {ASSIGN_TYPE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => { setAssignType(opt.value); setError(""); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 14px", borderRadius: 8,
                      background: assignType === opt.value ? "rgba(10,132,255,.12)" : "transparent",
                      color: assignType === opt.value ? "#0a84ff" : "var(--muted)",
                      border: `1px solid ${assignType === opt.value ? "#0a84ff55" : "var(--border)"}`,
                      fontWeight: assignType === opt.value ? 700 : 400,
                    }}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
              {assignType === "Individual" && (
                <select value={selectedOne} onChange={e => setSelectedOne(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
                  <option value="">Select referee…</option>
                  {refereeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              {assignType === "SelectedReferees" && (
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, maxHeight: 180, overflowY: "auto", padding: "4px 0" }}>
                  {refereeMembers.length === 0 && <p className="hint" style={{ padding: "8px 14px", margin: 0, fontSize: 13 }}>No referees in this organisation.</p>}
                  {refereeMembers.map(m => (
                    <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", background: selectedMany.has(m.id) ? "rgba(10,132,255,.06)" : "transparent" }}>
                      <input type="checkbox" checked={selectedMany.has(m.id)} onChange={() => toggleMany(m.id)} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13 }}>{m.name}</span>
                      <span className="hint" style={{ fontSize: 12, marginLeft: "auto" }}>{m.email}</span>
                    </label>
                  ))}
                </div>
              )}
              {assignType === "Everyone" && (
                <p className="hint" style={{ fontSize: 13, margin: 0 }}>
                  This goal will be assigned to all {totalRefereeCount} referee{totalRefereeCount !== 1 ? "s" : ""} in your organisation.
                </p>
              )}
            </div>
          )}
          {!isCreate && (
            <p className="hint" style={{ fontSize: 12, margin: 0, padding: "6px 12px", background: "rgba(165,106,27,.07)", borderRadius: 8, border: "1px solid rgba(165,106,27,.2)" }}>
              Changes to title, description, category and priority apply to all referees assigned this goal.
            </p>
          )}
          <label>Title <span style={{ color: "#ff453a" }}>*</span>
            <input value={title} onChange={e => { setTitle(e.target.value); setError(""); }} placeholder="e.g. Improve lead-foot positioning in the paint" autoFocus={!isCreate} />
          </label>
          <label>Description
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Additional context, coaching notes, or specific behaviours to target…" style={{ resize: "vertical", minHeight: 80 }} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <label>Priority<select value={priority} onChange={e => setPriority(e.target.value)}>{GOAL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
          </div>
          <label>Target review date <span className="hint" style={{ fontSize: 12 }}>(optional)</span>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </label>
          {!isCreate && (
            <label>Coaching notes <span className="hint" style={{ fontSize: 12 }}>(visible to educators only)</span>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Private notes about this referee's progress…" style={{ resize: "vertical" }} />
            </label>
          )}
          {error && <p style={{ margin: 0, color: "#ff453a", fontSize: 13 }}>{error}</p>}
        </div>
        <div className="action-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit}>{isCreate ? "Assign Goal" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Note form modal ───────────────────────────────────────────────────────────

type NoteFormMode =
  | { type: "create"; refereeId: string }
  | { type: "edit"; note: DevelopmentNote };

function NoteFormModal({
  mode,
  refereeGoalViews,
  onSave,
  onClose,
}: {
  mode: NoteFormMode;
  refereeGoalViews: RefereeGoalView[];
  onSave: (data: CreateNoteInput | Partial<DevelopmentNote>, id?: string) => void;
  onClose: () => void;
}) {
  const existing = mode.type === "edit" ? mode.note : null;
  const [title, setTitle]           = useState(existing?.title ?? "");
  const [body, setBody]             = useState(existing?.body ?? "");
  const [noteType, setNoteType]     = useState<NoteType>(existing?.noteType ?? "General");
  const [visibility, setVisibility] = useState<NoteVisibility>(existing?.visibility ?? "Educator Only");
  const [linkedGoalId, setLinkedGoalId] = useState<string>(existing?.linkedGoalId ?? "");
  const [error, setError]           = useState("");

  const isCreate = mode.type === "create";
  const refereeId = isCreate ? mode.refereeId : existing!.refereeId;
  const linkableGoals = refereeGoalViews.filter(v => v.refereeId === refereeId && v.status === "Active");

  function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!body.trim())  { setError("Body is required.");  return; }
    setError("");
    if (isCreate) {
      onSave({ refereeId, title: title.trim(), body: body.trim(), noteType, visibility, linkedGoalId: linkedGoalId || null } satisfies CreateNoteInput);
    } else {
      onSave({ title: title.trim(), body: body.trim(), noteType, visibility, linkedGoalId: linkedGoalId || null }, existing!.id);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">Development Note</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>{isCreate ? "Add Note" : "Edit Note"}</h1>
          </div>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          <label>
            Title <span style={{ color: "#ff453a" }}>*</span>
            <input value={title} onChange={e => { setTitle(e.target.value); setError(""); }} placeholder="e.g. Post-game debrief — Round 7" autoFocus />
          </label>
          <label>
            Note <span style={{ color: "#ff453a" }}>*</span>
            <textarea value={body} onChange={e => { setBody(e.target.value); setError(""); }} rows={5} placeholder="Record observations, coaching points, or conversation highlights…" style={{ resize: "vertical", minHeight: 110 }} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>Note type<select value={noteType} onChange={e => setNoteType(e.target.value as NoteType)}>{NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
            <label>Visibility<select value={visibility} onChange={e => setVisibility(e.target.value as NoteVisibility)}>{NOTE_VISIBILITIES.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
          </div>
          <label>
            Linked goal <span className="hint" style={{ fontSize: 12 }}>(optional)</span>
            <select value={linkedGoalId} onChange={e => setLinkedGoalId(e.target.value)}>
              <option value="">No linked goal</option>
              {linkableGoals.map(v => <option key={v.goalId} value={v.goalId}>{v.title}</option>)}
            </select>
          </label>
          {error && <p style={{ margin: 0, color: "#ff453a", fontSize: 13 }}>{error}</p>}
        </div>
        <div className="action-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit}>{isCreate ? "Add Note" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Props and main screen ─────────────────────────────────────────────────────

export interface RefereeDevelopmentScreenProps {
  session: RefEvalSession;
  referee: MemberRecord;
  refereeMembers: MemberRecord[];
  goalViews: RefereeGoalView[];
  notes: DevelopmentNote[];
  completedReviews: ReviewRecord[];
  reviewGoalLinks: ReviewGoalLink[];
  allReviews: ReviewRecord[];
  onAssignGoal: (input: AssignGoalInput) => void;
  onUpdateGoalDef: (goalId: string, patch: Partial<Pick<DevGoalDef, "title" | "description" | "category" | "priority">>) => void;
  onUpdateRefereeGoal: (id: string, patch: Partial<Pick<RefereeGoal, "targetReviewDate" | "notes">>) => void;
  onCompleteGoal: (id: string) => void;
  onArchiveGoal: (id: string) => void;
  onReopenGoal: (id: string) => void;
  onDeleteGoal: (id: string) => void;
  onCreateNote: (input: CreateNoteInput) => void;
  onUpdateNote: (id: string, patch: Partial<DevelopmentNote>) => void;
  onDeleteNote: (id: string) => void;
  onBack: () => void;
}

export function RefereeDevelopmentScreen({
  session, referee, refereeMembers, goalViews, notes, completedReviews,
  reviewGoalLinks, allReviews,
  onAssignGoal, onUpdateGoalDef, onUpdateRefereeGoal,
  onCompleteGoal, onArchiveGoal, onReopenGoal, onDeleteGoal,
  onCreateNote, onUpdateNote, onDeleteNote,
  onBack,
}: RefereeDevelopmentScreenProps) {
  const [devPage, setDevPage]           = useState<DevPage>("overview");
  const [goalFilter, setGoalFilter]     = useState<GoalStatus>("Active");
  const [goalFormMode, setGoalFormMode] = useState<GoalFormMode | null>(null);
  const [noteFormMode, setNoteFormMode] = useState<NoteFormMode | null>(null);

  const canEdit =
    session.activeRole === "educator" ||
    session.activeRole === "admin" ||
    session.activeRole === "super_admin";

  // ── Derived data ──────────────────────────────────────────────────────────
  const goalCounts: Record<GoalStatus, number> = useMemo(() => ({
    Active:    goalViews.filter(v => v.status === "Active").length,
    Completed: goalViews.filter(v => v.status === "Completed").length,
    Archived:  goalViews.filter(v => v.status === "Archived").length,
  }), [goalViews]);

  const visibleGoals = useMemo(
    () => goalViews.filter(v => v.status === goalFilter),
    [goalViews, goalFilter],
  );

  const timelineEvents = useMemo(
    () => buildTimeline(goalViews, notes, completedReviews, reviewGoalLinks),
    [goalViews, notes, completedReviews, reviewGoalLinks],
  );

  // Supporting reviews per goal — find all reviews linked to each goalDef for this referee
  const allReviewsById = useMemo(() => new Map(allReviews.map(r => [r.id, r])), [allReviews]);
  const supportingReviewsForGoal = useCallback(
    (goalId: string) => {
      const linkedReviewIds = reviewGoalLinks
        .filter(l => l.goalDefId === goalId && l.refereeId === referee.id)
        .map(l => l.reviewId);
      return linkedReviewIds.flatMap(id => { const r = allReviewsById.get(id); return r ? [r] : []; });
    },
    [reviewGoalLinks, allReviewsById, referee.id],
  );

  const goalTitleById = useMemo(
    () => new Map(goalViews.map(v => [v.goalId, v.title])),
    [goalViews],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleGoalSave = useCallback(
    (
      defPatch: Pick<DevGoalDef, "title" | "description" | "category" | "priority">,
      rgPatch:  Pick<RefereeGoal, "targetReviewDate" | "notes">,
      assignInput?: AssignGoalInput,
    ) => {
      if (assignInput) {
        onAssignGoal(assignInput);
      } else if (goalFormMode?.type === "edit") {
        onUpdateGoalDef(goalFormMode.view.goalId, defPatch);
        onUpdateRefereeGoal(goalFormMode.view.id, rgPatch);
      }
      setGoalFormMode(null);
    },
    [goalFormMode, onAssignGoal, onUpdateGoalDef, onUpdateRefereeGoal],
  );

  const handleNoteSave = useCallback(
    (data: CreateNoteInput | Partial<DevelopmentNote>, id?: string) => {
      if (id) {
        onUpdateNote(id, data as Partial<DevelopmentNote>);
      } else {
        onCreateNote(data as CreateNoteInput);
      }
      setNoteFormMode(null);
    },
    [onCreateNote, onUpdateNote],
  );

  // Shortcuts used by OverviewTab callbacks
  const openGoalForm  = useCallback(() => setGoalFormMode({ type: "create", defaultRefereeId: referee.id }), [referee.id]);
  const openNoteForm  = useCallback(() => setNoteFormMode({ type: "create", refereeId: referee.id }), [referee.id]);
  const navGoals      = useCallback(() => setDevPage("goals"), []);
  const navNotes      = useCallback(() => setDevPage("notes"), []);
  const navTimeline   = useCallback(() => setDevPage("timeline"), []);

  const initials = referee.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const totalGoalCount = goalCounts.Active + goalCounts.Completed + goalCounts.Archived;

  return (
    <div className="layout one-col" style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>

      {/* Back nav */}
      <button
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", marginBottom: 20, background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          background: "rgba(10,132,255,.12)", border: "2px solid rgba(10,132,255,.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: "#0a84ff",
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Referee Development</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 24 }}>{referee.name}</h1>
          <p className="hint" style={{ margin: "2px 0 0", fontSize: 13 }}>{referee.email}</p>
        </div>
        {canEdit && (devPage === "overview" || devPage === "goals") && (
          <button className="primary" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={openGoalForm}>
            <Plus size={14} /> Assign Goal
          </button>
        )}
        {canEdit && devPage === "notes" && (
          <button className="primary" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={openNoteForm}>
            <FileText size={14} /> Add Note
          </button>
        )}
      </div>

      {/* Persistent stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Active Goals",      value: goalCounts.Active,        colour: STATUS_COLOR.Active,    onClick: () => { navGoals(); setGoalFilter("Active"); } },
          { label: "Completed Goals",   value: goalCounts.Completed,     colour: STATUS_COLOR.Completed, onClick: () => { navGoals(); setGoalFilter("Completed"); } },
          { label: "Coaching Notes",    value: notes.length,             colour: "#bf5af2",              onClick: navNotes },
          { label: "Reviews",           value: completedReviews.length,  colour: "#30d158",              onClick: navTimeline },
          { label: "Timeline Events",   value: timelineEvents.length,    colour: "var(--accent)",        onClick: navTimeline },
        ].map(({ label, value, colour, onClick }) => (
          <button
            key={label}
            className="ed-summary-card"
            onClick={onClick}
            style={{ cursor: "pointer", textAlign: "left", width: "100%", background: "var(--panel)", border: "1px solid var(--border)" }}
          >
            <div className="ed-summary-number" style={{ color: colour }}>{value}</div>
            <div className="ed-summary-label">{label}</div>
          </button>
        ))}
      </div>

      {/* Tab bar */}
      <PageTabs
        active={devPage}
        goalCount={totalGoalCount}
        noteCount={notes.length}
        timelineCount={timelineEvents.length}
        onChange={setDevPage}
      />

      {/* ── Overview tab ── */}
      {devPage === "overview" && (
        <OverviewTab
          goalViews={goalViews}
          notes={notes}
          timelineEvents={timelineEvents}
          completedReviews={completedReviews}
          canEdit={canEdit}
          onAssignGoal={openGoalForm}
          onAddNote={openNoteForm}
          onViewGoals={navGoals}
          onViewNotes={navNotes}
          onViewTimeline={navTimeline}
        />
      )}

      {/* ── Goals tab ── */}
      {devPage === "goals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <GoalFilterTabs active={goalFilter} counts={goalCounts} onChange={setGoalFilter} />
            <span className="hint" style={{ fontSize: 12 }}>{visibleGoals.length} goal{visibleGoals.length !== 1 ? "s" : ""}</span>
          </div>
          {visibleGoals.length === 0 ? (
            <GoalEmptyState status={goalFilter} canEdit={canEdit} onCreateGoal={openGoalForm} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visibleGoals.map(view => (
                <GoalCard
                  key={view.id}
                  view={view}
                  canEdit={canEdit}
                  supportingReviews={supportingReviewsForGoal(view.goalId)}
                  onEdit={v => setGoalFormMode({ type: "edit", view: v })}
                  onComplete={onCompleteGoal}
                  onArchive={onArchiveGoal}
                  onReopen={onReopenGoal}
                  onDelete={onDeleteGoal}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Notes tab ── */}
      {devPage === "notes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notes.length === 0 ? (
            <NoteEmptyState canEdit={canEdit} onCreateNote={openNoteForm} />
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span className="hint" style={{ fontSize: 12 }}>{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
              </div>
              {notes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  linkedGoalTitle={note.linkedGoalId ? (goalTitleById.get(note.linkedGoalId) ?? null) : null}
                  canEdit={canEdit}
                  onEdit={n => setNoteFormMode({ type: "edit", note: n })}
                  onDelete={onDeleteNote}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Timeline tab ── */}
      {devPage === "timeline" && (
        <TimelineTab events={timelineEvents} hasReviews={completedReviews.length > 0} />
      )}

      {/* Modals */}
      {goalFormMode && (
        <GoalFormModal
          mode={goalFormMode}
          refereeMembers={refereeMembers}
          totalRefereeCount={refereeMembers.length}
          onSave={handleGoalSave}
          onClose={() => setGoalFormMode(null)}
        />
      )}
      {noteFormMode && (
        <NoteFormModal
          mode={noteFormMode}
          refereeGoalViews={goalViews}
          onSave={handleNoteSave}
          onClose={() => setNoteFormMode(null)}
        />
      )}
    </div>
  );
}
