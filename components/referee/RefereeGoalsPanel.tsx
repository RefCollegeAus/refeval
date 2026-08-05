"use client";

import type { RefereeGoalView } from "@/lib/types/developmentGoals";
import { Badge, Button, Card, CardTitle } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";

const PRIORITY_TONE: Record<string, BadgeTone> = {
  Low: "neutral", Medium: "warn", High: "danger",
};
const PRIORITY_BORDER: Record<string, string> = {
  Low: "border-l-border", Medium: "border-l-warn", High: "border-l-danger",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function RefereeGoalsPanel({
  goalViews,
  onViewAll,
}: {
  goalViews: RefereeGoalView[];
  onViewAll?: () => void;
}) {
  const active    = goalViews.filter(v => v.status === "Active");
  const completed = goalViews.filter(v => v.status === "Completed");

  return (
    <Card>
      <div className="mb-2.5 flex items-center justify-between">
        <CardTitle>My Development Goals</CardTitle>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>View all</Button>
        )}
      </div>

      {active.length === 0 && (
        <p className="text-sm text-muted">No active goals right now.</p>
      )}

      <div className="grid grid-cols-1 gap-1.5">
        {active.map(v => (
          <div
            key={v.id}
            className={`rounded-lg border border-border border-l-[3px] bg-panel-2 p-2.5 ${PRIORITY_BORDER[v.priority] ?? "border-l-border"}`}
          >
            <div className="mb-0.5 text-[13px] font-bold text-text">{v.title}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted">{v.category}</span>
              <Badge tone={PRIORITY_TONE[v.priority] ?? "neutral"}>{v.priority}</Badge>
              {v.targetReviewDate && (
                <span className="text-[11px] text-muted">Target {fmtDate(v.targetReviewDate)}</span>
              )}
            </div>
            {v.description && (
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {v.description.length > 100 ? v.description.slice(0, 97) + "…" : v.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {completed.length > 0 && (
        <p className="mt-2 text-xs font-medium text-good">
          ✓ {completed.length} goal{completed.length !== 1 ? "s" : ""} completed
        </p>
      )}
    </Card>
  );
}
