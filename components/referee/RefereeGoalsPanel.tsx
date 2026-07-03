"use client";

import type { RefereeGoalView } from "@/lib/types/developmentGoals";

const PRIORITY_COLOR: Record<string, string> = {
  Low: "#636366", Medium: "#ff9f0a", High: "#ff453a",
};
const STATUS_COLOR: Record<string, string> = {
  Active: "#0a84ff", Completed: "#30d158", Archived: "#636366",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function RefereeGoalsPanel({ goalViews }: { goalViews: RefereeGoalView[] }) {
  const active    = goalViews.filter(v => v.status === "Active");
  const completed = goalViews.filter(v => v.status === "Completed");

  if (goalViews.length === 0) return null;

  return (
    <div className="analytics-card">
      <h3 style={{ margin: "0 0 10px" }}>My Development Goals</h3>

      {active.length === 0 && (
        <p className="hint" style={{ margin: 0, fontSize: 13 }}>No active goals right now.</p>
      )}

      {active.map(v => (
        <div
          key={v.id}
          style={{
            padding: "8px 10px",
            marginBottom: 6,
            background: "var(--panel3)",
            border: "1px solid var(--border)",
            borderLeft: `3px solid ${PRIORITY_COLOR[v.priority] ?? "var(--border)"}`,
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{v.title}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{v.category}</span>
            <span style={{ fontSize: 11, color: PRIORITY_COLOR[v.priority] }}>● {v.priority}</span>
            {v.targetReviewDate && (
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Target {fmtDate(v.targetReviewDate)}</span>
            )}
          </div>
          {v.description && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              {v.description.length > 100 ? v.description.slice(0, 97) + "…" : v.description}
            </p>
          )}
        </div>
      ))}

      {completed.length > 0 && (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: STATUS_COLOR.Completed }}>
          ✓ {completed.length} goal{completed.length !== 1 ? "s" : ""} completed
        </p>
      )}
    </div>
  );
}
