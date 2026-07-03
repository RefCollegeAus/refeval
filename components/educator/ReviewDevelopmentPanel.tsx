"use client";

import { useState, useCallback } from "react";
import type { RefereeGoalView, AssignGoalInput, GoalCategory, GoalPriority } from "@/lib/types/developmentGoals";
import type { ReviewGoalLink, CreateReviewGoalLinkInput } from "@/lib/types/reviewGoalLinks";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { RefEvalSession } from "@/lib/types/auth";
import { GOAL_CATEGORIES, GOAL_PRIORITIES } from "@/lib/types/developmentGoals";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ReviewDevelopmentPanelProps {
  session: RefEvalSession;
  review: ReviewRecord;
  refereeId: string;
  refereeName: string;
  activeGoals: RefereeGoalView[];                       // Active goals for this referee
  reviewGoalLinks: ReviewGoalLink[];                    // All links for this org
  onCreateGoalFromReview: (input: AssignGoalInput, reviewId: string) => void;
  onLinkReviewToGoal: (input: CreateReviewGoalLinkInput) => void;
  onUnlinkReviewFromGoal: (linkId: string) => void;
}

// ── Quick goal creation form ──────────────────────────────────────────────────

interface QuickGoalFormProps {
  refereeId: string;
  reviewId: string;
  refereeName: string;
  onSubmit: (input: AssignGoalInput, reviewId: string) => void;
  onCancel: () => void;
}

function QuickGoalForm({ refereeId, reviewId, refereeName, onSubmit, onCancel }: QuickGoalFormProps) {
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [category, setCategory]   = useState<GoalCategory>("Other");
  const [priority, setPriority]   = useState<GoalPriority>("Medium");

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;
    onSubmit(
      {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        assignmentType: "Individual",
        assignedRefereeIds: [refereeId],
        targetReviewDate: null,
      },
      reviewId,
    );
  }, [title, description, category, priority, refereeId, reviewId, onSubmit]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--panel3)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "6px 8px",
    color: "var(--text)",
    fontSize: 13,
    boxSizing: "border-box",
  };

  const rowStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--muted)", fontWeight: 600 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 0" }}>
      <div style={rowStyle}>
        <span style={labelStyle}>GOAL TITLE *</span>
        <input
          style={inputStyle}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={`e.g. Improve positioning for ${refereeName}`}
        />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>DESCRIPTION</span>
        <textarea
          style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
          value={description}
          onChange={e => setDesc(e.target.value)}
          placeholder="Optional detail about this development area..."
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={rowStyle}>
          <span style={labelStyle}>CATEGORY</span>
          <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value as GoalCategory)}>
            {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>PRIORITY</span>
          <select style={inputStyle} value={priority} onChange={e => setPriority(e.target.value as GoalPriority)}>
            {GOAL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            background: "none", border: "1px solid var(--border)", borderRadius: 6,
            padding: "5px 14px", color: "var(--muted)", cursor: "pointer", fontSize: 13,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          style={{
            background: title.trim() ? "var(--accent)" : "var(--border)",
            border: "none", borderRadius: 6, padding: "5px 14px",
            color: title.trim() ? "#fff" : "var(--muted)",
            cursor: title.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600,
          }}
        >
          Create Goal
        </button>
      </div>
    </div>
  );
}

// ── Priority badge colour ─────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  Low: "#636366", Medium: "#ff9f0a", High: "#ff453a",
};

// ── Main panel ────────────────────────────────────────────────────────────────

export function ReviewDevelopmentPanel({
  session,
  review,
  refereeId,
  refereeName,
  activeGoals,
  reviewGoalLinks,
  onCreateGoalFromReview,
  onLinkReviewToGoal,
  onUnlinkReviewFromGoal,
}: ReviewDevelopmentPanelProps) {
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [expanded, setExpanded]           = useState(true);

  // Links for this specific review + referee
  const linksForThisReview = reviewGoalLinks.filter(
    l => l.reviewId === review.id && l.refereeId === refereeId,
  );
  const linkedGoalDefIds = new Set(linksForThisReview.map(l => l.goalDefId));

  const handleCreateGoal = useCallback(
    (input: AssignGoalInput, reviewId: string) => {
      onCreateGoalFromReview(input, reviewId);
      setShowQuickForm(false);
    },
    [onCreateGoalFromReview],
  );

  const toggleLink = useCallback(
    (goal: RefereeGoalView) => {
      if (linkedGoalDefIds.has(goal.goalId)) {
        const link = linksForThisReview.find(l => l.goalDefId === goal.goalId);
        if (link) onUnlinkReviewFromGoal(link.id);
      } else {
        onLinkReviewToGoal({ reviewId: review.id, goalDefId: goal.goalId, refereeId });
      }
    },
    [linkedGoalDefIds, linksForThisReview, review.id, refereeId, onLinkReviewToGoal, onUnlinkReviewFromGoal],
  );

  const panelStyle: React.CSSProperties = {
    background: "var(--panel2)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 8,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    cursor: "pointer",
    userSelect: "none",
  };

  return (
    <div style={panelStyle}>
      {/* Collapsible header */}
      <div style={headerStyle} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            Development Goals
          </span>
          <span style={{
            fontSize: 11, background: "var(--panel3)", borderRadius: 10,
            padding: "1px 8px", color: "var(--muted)",
          }}>
            {refereeName}
          </span>
          {linksForThisReview.length > 0 && (
            <span style={{
              fontSize: 11, background: "var(--accent)", borderRadius: 10,
              padding: "1px 8px", color: "#fff",
            }}>
              {linksForThisReview.length} linked
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 14px" }}>
          {/* Active goals list */}
          {activeGoals.length === 0 && !showQuickForm ? (
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 10px" }}>
              No active development goals for {refereeName}.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {activeGoals.map(goal => {
                const linked = linkedGoalDefIds.has(goal.goalId);
                return (
                  <div
                    key={goal.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: linked ? "rgba(165,106,27,0.12)" : "var(--panel3)",
                      border: `1px solid ${linked ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 7,
                      padding: "7px 10px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {goal.title}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{goal.category}</span>
                        <span style={{ fontSize: 11, color: PRIORITY_COLOR[goal.priority] }}>● {goal.priority}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLink(goal)}
                      style={{
                        marginLeft: 10,
                        flexShrink: 0,
                        background: linked ? "var(--accent)" : "var(--panel)",
                        border: `1px solid ${linked ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: 6,
                        padding: "4px 10px",
                        color: linked ? "#fff" : "var(--muted)",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {linked ? "Linked ✓" : "Link"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick goal creation form */}
          {showQuickForm ? (
            <QuickGoalForm
              refereeId={refereeId}
              reviewId={review.id}
              refereeName={refereeName}
              onSubmit={handleCreateGoal}
              onCancel={() => setShowQuickForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowQuickForm(true)}
              style={{
                background: "none",
                border: "1px dashed var(--border)",
                borderRadius: 7,
                padding: "7px 12px",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 13,
                width: "100%",
                textAlign: "center",
              }}
            >
              + Create Goal from this Review
            </button>
          )}
        </div>
      )}
    </div>
  );
}
