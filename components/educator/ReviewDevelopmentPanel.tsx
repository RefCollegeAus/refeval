"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Plus, Target } from "lucide-react";
import type { RefereeGoalView, AssignGoalInput, GoalCategory, GoalPriority } from "@/lib/types/developmentGoals";
import type { ReviewGoalLink, CreateReviewGoalLinkInput } from "@/lib/types/reviewGoalLinks";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { RefEvalSession } from "@/lib/types/auth";
import { GOAL_CATEGORIES, GOAL_PRIORITIES } from "@/lib/types/developmentGoals";
import { Badge, type BadgeTone, Button, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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
  /** When true, renders just the body (goals list + quick-add form) with no
   *  collapsible header or outer bordered wrapper — for embedding inside an
   *  already-labelled container such as a per-official Tabs panel, where the
   *  tab itself is the "which official" affordance this panel's own header
   *  would otherwise duplicate. */
  compact?: boolean;
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

  return (
    <div className="grid gap-2.5 py-2">
      <label className="grid gap-1 text-[11px] font-semibold text-muted">
        Goal title *
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={`e.g. Improve positioning for ${refereeName}`} />
      </label>
      <label className="grid gap-1 text-[11px] font-semibold text-muted">
        Description
        <Textarea value={description} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Optional detail about this development area…" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[11px] font-semibold text-muted">
          Category
          <Select value={category} onChange={e => setCategory(e.target.value as GoalCategory)}>
            {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-muted">
          Priority
          <Select value={priority} onChange={e => setPriority(e.target.value as GoalPriority)}>
            {GOAL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!title.trim()}>Create Goal</Button>
      </div>
    </div>
  );
}

// ── Priority badge tone ────────────────────────────────────────────────────────

const PRIORITY_TONE: Record<string, BadgeTone> = { Low: "neutral", Medium: "warn", High: "danger" };

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
  compact = false,
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

  const body = (
    <>
      {/* Active goals list */}
      {activeGoals.length === 0 && !showQuickForm ? (
        <p className="mb-2.5 text-[13px] text-muted">No active development goals for {refereeName}.</p>
      ) : (
        <div className="mb-2.5 grid gap-1.5">
          {activeGoals.map(goal => {
            const linked = linkedGoalDefIds.has(goal.goalId);
            return (
              <div
                key={goal.id}
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-lg border px-2.5 py-2",
                  linked ? "border-accent/50 bg-accent/[.1]" : "border-border bg-panel",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-text">{goal.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-[11px] text-muted">{goal.category}</span>
                    <Badge tone={PRIORITY_TONE[goal.priority] ?? "neutral"} className="text-[10px]">{goal.priority}</Badge>
                  </div>
                  {goal.notes && <p className="mt-1 truncate text-[11px] text-muted" title={goal.notes}>{goal.notes}</p>}
                </div>
                <Button
                  variant={linked ? "primary" : "secondary"}
                  size="sm"
                  className="shrink-0"
                  onClick={() => toggleLink(goal)}
                >
                  {linked ? "Linked ✓" : "Link"}
                </Button>
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
          type="button"
          onClick={() => setShowQuickForm(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[13px] text-muted hover:border-accent/40 hover:text-text"
        >
          <Plus size={13} /> Create Goal from this Review
        </button>
      )}
    </>
  );

  if (compact) {
    return <div>{body}</div>;
  }

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border bg-panel-2">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex w-full select-none items-center justify-between px-3.5 py-2.5 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Target size={13} className="text-muted" />
          <span className="text-[13px] font-bold text-text">Development Goals</span>
          <Badge tone="neutral">{refereeName}</Badge>
          {linksForThisReview.length > 0 && <Badge tone="accent">{linksForThisReview.length} linked</Badge>}
        </div>
        {expanded ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>

      {expanded && <div className="px-3.5 pb-3.5">{body}</div>}
    </div>
  );
}
