"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Zap, ChevronLeft, ArrowUpDown, TrendingUp, TrendingDown, Minus, BarChart2,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { SimulatorSessionWithEvents, SimulatorAttempt, SimulatorResponse } from "@/lib/types/simulator";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import type { MemberRecord } from "@/lib/types/members";
import { learningPctColor } from "@/lib/types/assignments";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function pctColor(pct: number) {
  if (pct >= 80) return "#22c55e";
  if (pct >= 60) return "#3b82f6";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
}

function median(arr: number[]): number | null {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

function mapResponse(r: any): SimulatorResponse {
  return {
    id: r.id,
    attemptId: r.attempt_id,
    eventId: r.event_id ?? undefined,
    clipId: r.clip_id ?? undefined,
    responseOutcome: r.response_outcome || "",
    responseCall: r.response_call || "",
    responseTimeSeconds: r.response_time_seconds ?? null,
    isCorrect: r.is_correct ?? false,
    createdAt: r.created_at,
  };
}

// ── StatChip ──────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string | number | null; color?: string }) {
  return (
    <div style={{
      flex: "1 1 120px",
      background: "var(--panel2)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "12px 14px",
      textAlign: "center",
      minWidth: 100,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? "var(--text)" }}>
        {value === null ? "—" : value}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── HBar (horizontal progress bar) ───────────────────────────────────────────

function HBar({ pct, color, label, count }: { pct: number; color: string; label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <div style={{ width: 130, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 10, background: "var(--panel3, var(--border))", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 5, transition: "width .3s" }} />
      </div>
      <div style={{ width: 42, textAlign: "right", fontWeight: 700, color, flexShrink: 0 }}>{pct}%</div>
      <div style={{ width: 50, textAlign: "right", color: "var(--muted)", fontSize: 12, flexShrink: 0 }}>{count} resp</div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  sessions: SimulatorSessionWithEvents[];
  attempts: SimulatorAttempt[];
  members: MemberRecord[];
  reviews: ReviewRecord[];
  tags: CodedTag[];
  initialSessionId?: string | null;
  onBack: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export function SimulatorAnalyticsDashboard({
  sessions, attempts, members, reviews, tags, initialSessionId, onBack,
}: Props) {
  // Only show published sessions
  const publishedSessions = useMemo(() =>
    sessions.filter(s => {
      const rev = reviews.find(r => r.id === s.reviewId);
      return rev?.status === "Completed";
    }),
    [sessions, reviews],
  );

  const [selectedId, setSelectedId] = useState<string>(
    () => initialSessionId && publishedSessions.some(s => s.id === initialSessionId)
      ? initialSessionId
      : (publishedSessions[0]?.id ?? ""),
  );
  const [responses, setResponses] = useState<SimulatorResponse[]>([]);
  const [loadingResp, setLoadingResp] = useState(false);

  // Sort keys for referee table
  type RefSort = "name" | "attempts" | "latest" | "best" | "avg" | "last";
  const [refSort, setRefSort] = useState<RefSort>("avg");
  const [refSortAsc, setRefSortAsc] = useState(false);

  // Sort keys for decision table
  type DecSort = "label" | "pct" | "total" | "time";
  const [decSort, setDecSort] = useState<DecSort>("pct");
  const [decSortAsc, setDecSortAsc] = useState(true);

  const selectedSession = useMemo(
    () => sessions.find(s => s.id === selectedId) ?? null,
    [sessions, selectedId],
  );

  // Load responses for the selected session's attempts on demand
  useEffect(() => {
    const attemptIds = attempts.filter(a => a.sessionId === selectedId).map(a => a.id);
    if (!attemptIds.length) { setResponses([]); return; }
    setLoadingResp(true);
    getSupabaseClient()
      .from("simulator_responses")
      .select("*")
      .in("attempt_id", attemptIds)
      .then(({ data, error }: { data: any[] | null; error: any }) => {
        if (!error) setResponses((data || []).map(mapResponse));
        setLoadingResp(false);
      });
  }, [selectedId, attempts]);

  // ── Filtered data ──────────────────────────────────────────────────────────

  const sessionAttempts = useMemo(
    () => attempts.filter(a => a.sessionId === selectedId),
    [attempts, selectedId],
  );

  const scoredAttempts = useMemo(
    () => sessionAttempts.filter(a => a.score !== null && a.total && a.total > 0),
    [sessionAttempts],
  );

  const pcts = useMemo(
    () => scoredAttempts.map(a => Math.round((a.score! / a.total!) * 100)),
    [scoredAttempts],
  );

  // ── Overview stats ─────────────────────────────────────────────────────────

  const overview = useMemo(() => {
    const totalAttempts  = sessionAttempts.length;
    const uniqueRefs     = new Set(sessionAttempts.map(a => a.userId)).size;
    const avgPct         = pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : null;
    const medPct         = median(pcts);
    const highPct        = pcts.length ? Math.max(...pcts) : null;
    const lowPct         = pcts.length ? Math.min(...pcts) : null;
    return { totalAttempts, uniqueRefs, avgPct, medPct, highPct, lowPct };
  }, [sessionAttempts, pcts]);

  // ── Referee breakdown ──────────────────────────────────────────────────────

  const refereeRows = useMemo(() => {
    const userIds = Array.from(new Set(sessionAttempts.map(a => a.userId)));
    return userIds.map(uid => {
      // attempts already sorted desc by completed_at from hook
      const mine = sessionAttempts.filter(a => a.userId === uid);
      const scored = mine.filter(a => a.score !== null && a.total && a.total > 0);
      const userPcts = scored.map(a => Math.round((a.score! / a.total!) * 100));
      const latest = userPcts[0] ?? null;
      const best   = userPcts.length ? Math.max(...userPcts) : null;
      const avg    = userPcts.length ? Math.round(userPcts.reduce((s, p) => s + p, 0) / userPcts.length) : null;

      let trend: "improving" | "declining" | "stable" | null = null;
      if (scored.length >= 2) {
        const p1 = (scored[0].score! / scored[0].total!) * 100;
        const p2 = (scored[1].score! / scored[1].total!) * 100;
        const diff = p1 - p2;
        trend = diff > 5 ? "improving" : diff < -5 ? "declining" : "stable";
      }

      return {
        userId: uid,
        member: members.find(m => m.id === uid),
        attemptCount: mine.length,
        latest,
        best,
        avg,
        lastCompleted: mine[0]?.completedAt ?? null,
        trend,
      };
    });
  }, [sessionAttempts, members]);

  const sortedRefereeRows = useMemo(() => {
    return [...refereeRows].sort((a, b) => {
      let cmp = 0;
      if      (refSort === "name")     cmp = (a.member?.name ?? "").localeCompare(b.member?.name ?? "");
      else if (refSort === "attempts") cmp = a.attemptCount - b.attemptCount;
      else if (refSort === "latest")   cmp = (a.latest ?? -1) - (b.latest ?? -1);
      else if (refSort === "best")     cmp = (a.best ?? -1) - (b.best ?? -1);
      else if (refSort === "avg")      cmp = (a.avg ?? -1) - (b.avg ?? -1);
      else if (refSort === "last")     cmp = (a.lastCompleted ?? "").localeCompare(b.lastCompleted ?? "");
      return refSortAsc ? cmp : -cmp;
    });
  }, [refereeRows, refSort, refSortAsc]);

  // ── Category performance ───────────────────────────────────────────────────

  const categoryStats = useMemo(() => {
    if (!responses.length) return [];

    // Build lookup maps
    const eventCategoryMap = new Map<string, string>();
    selectedSession?.events.forEach(e => eventCategoryMap.set(e.id, e.category || "Other"));

    const clipCategoryMap = new Map<string, string>();
    tags.filter(t => t.reviewId === selectedSession?.reviewId)
      .forEach(t => clipCategoryMap.set(t.id, t.category || "Other"));

    const catMap = new Map<string, { correct: number; total: number }>();
    for (const resp of responses) {
      const cat = resp.eventId
        ? (eventCategoryMap.get(resp.eventId) || "Other")
        : resp.clipId
          ? (clipCategoryMap.get(resp.clipId) || "Other")
          : "Other";
      const existing = catMap.get(cat) ?? { correct: 0, total: 0 };
      existing.total++;
      if (resp.isCorrect) existing.correct++;
      catMap.set(cat, existing);
    }

    return Array.from(catMap.entries())
      .map(([category, { correct, total }]) => ({
        category,
        correct,
        total,
        pct: total > 0 ? Math.round((correct / total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total); // most-attempted first
  }, [responses, selectedSession, tags]);

  // ── Decision-level analysis ────────────────────────────────────────────────

  type DecisionRow = {
    key: string;
    label: string;
    category: string;
    correct: number;
    total: number;
    pct: number;
    avgTime: number | null;
    topIncorrect: string | null;
  };

  const decisionStats = useMemo((): DecisionRow[] => {
    if (!responses.length || !selectedSession) return [];

    const eventMap = new Map(selectedSession.events.map(e => [e.id, e]));
    const clipMap  = new Map(
      tags.filter(t => t.reviewId === selectedSession.reviewId).map(t => [t.id, t])
    );

    type Acc = { correct: number; total: number; times: number[]; badCalls: Map<string, number> };
    const decMap = new Map<string, Acc>();

    for (const resp of responses) {
      const key = resp.eventId || resp.clipId || "unknown";
      const acc = decMap.get(key) ?? { correct: 0, total: 0, times: [] as number[], badCalls: new Map<string, number>() };
      acc.total++;
      if (resp.isCorrect) {
        acc.correct++;
      } else {
        const call = resp.responseCall || resp.responseOutcome || "Unknown";
        acc.badCalls.set(call, (acc.badCalls.get(call) ?? 0) + 1);
      }
      if (resp.responseTimeSeconds !== null) acc.times.push(resp.responseTimeSeconds as number);
      decMap.set(key, acc);
    }

    return Array.from(decMap.entries()).map(([key, acc]) => {
      const avgTime = acc.times.length
        ? Math.round(acc.times.reduce((s: number, t: number) => s + t, 0) / acc.times.length * 10) / 10
        : null;
      const topIncorrect = Array.from(acc.badCalls.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      // Derive label + category
      const ev  = eventMap.get(key);
      const tag = clipMap.get(key);
      let label    = key.slice(0, 8) + "…";
      let category = "Unknown";
      if (ev) {
        const mm = Math.floor(ev.timestampSeconds / 60);
        const ss = String(Math.floor(ev.timestampSeconds % 60)).padStart(2, "0");
        label    = `${ev.category || "Event"} @ ${mm}:${ss}`;
        category = ev.category || "Other";
      } else if (tag) {
        label    = tag.category || "Clip";
        category = tag.category || "Other";
      }

      return {
        key,
        label,
        category,
        correct: acc.correct,
        total: acc.total,
        pct: acc.total > 0 ? Math.round((acc.correct / acc.total) * 100) : 0,
        avgTime,
        topIncorrect,
      };
    });
  }, [responses, selectedSession, tags]);

  const sortedDecisionRows = useMemo(() => {
    return [...decisionStats].sort((a, b) => {
      let cmp = 0;
      if      (decSort === "label") cmp = a.label.localeCompare(b.label);
      else if (decSort === "pct")   cmp = a.pct - b.pct;
      else if (decSort === "total") cmp = a.total - b.total;
      else if (decSort === "time")  cmp = (a.avgTime ?? -1) - (b.avgTime ?? -1);
      return decSortAsc ? cmp : -cmp;
    });
  }, [decisionStats, decSort, decSortAsc]);

  // ── Sort helpers ───────────────────────────────────────────────────────────

  function handleRefSort(key: RefSort) {
    if (refSort === key) { setRefSortAsc(a => !a); return; }
    setRefSort(key);
    setRefSortAsc(key === "name");
  }

  function handleDecSort(key: DecSort) {
    if (decSort === key) { setDecSortAsc(a => !a); return; }
    setDecSort(key);
    setDecSortAsc(key === "label");
  }

  function SortTh({ col, label, right, refTable }: { col: string; label: string; right?: boolean; refTable?: boolean }) {
    const active = refTable ? (refSort === col) : (decSort === col);
    return (
      <th
        style={{ textAlign: right ? "right" : "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", padding: "8px 10px", fontWeight: 600 }}
        onClick={() => refTable ? handleRefSort(col as RefSort) : handleDecSort(col as DecSort)}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <ArrowUpDown size={10} style={{ opacity: active ? 1 : 0.3, color: active ? "var(--accent)" : undefined }} />
        </span>
      </th>
    );
  }

  // ── Trend badge ────────────────────────────────────────────────────────────

  function TrendBadge({ trend }: { trend: "improving" | "declining" | "stable" | null }) {
    if (!trend) return <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>;
    if (trend === "improving") return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "#22c55e", fontWeight: 700 }}>
        <TrendingUp size={13} /> Improving
      </span>
    );
    if (trend === "declining") return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "#ef4444", fontWeight: 700 }}>
        <TrendingDown size={13} /> Declining
      </span>
    );
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "var(--muted)" }}>
        <Minus size={13} /> Stable
      </span>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!publishedSessions.length) {
    return (
      <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="table-head">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BarChart2 size={20} style={{ color: "#fbbf24", flexShrink: 0 }} />
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Simulator</p>
                <h1 style={{ margin: 0, fontSize: 22 }}>Analytics</h1>
              </div>
            </div>
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronLeft size={15} /> Back
            </button>
          </div>
        </div>
        <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
          <BarChart2 size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>No published simulators</p>
          <p className="hint" style={{ margin: "6px 0 0" }}>Publish a simulator session to see analytics.</p>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="table-head" style={{ flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart2 size={20} style={{ color: "#fbbf24", flexShrink: 0 }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Simulator</p>
              <h1 style={{ margin: 0, fontSize: 22 }}>Analytics</h1>
              <p className="hint" style={{ margin: "2px 0 0" }}>Referee performance and decision-making insights</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Session selector */}
            {publishedSessions.length > 1 && (
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                style={{ fontSize: 13, padding: "5px 10px", maxWidth: 240 }}
              >
                {publishedSessions.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            )}
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronLeft size={15} /> Back
            </button>
          </div>
        </div>
        {publishedSessions.length === 1 && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--panel2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={13} style={{ color: "#fde68a", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{selectedSession?.title}</span>
            {selectedSession?.description && (
              <span className="hint" style={{ fontSize: 13 }}>— {selectedSession.description}</span>
            )}
          </div>
        )}
      </div>

      {/* No attempts yet */}
      {!sessionAttempts.length && (
        <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
          <Zap size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>No attempts yet</p>
          <p className="hint" style={{ margin: "6px 0 0" }}>Assign this simulator to referees to start collecting data.</p>
        </div>
      )}

      {!!sessionAttempts.length && (
        <>
          {/* ── 1. Overview ─────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <h2 className="ed-section-title">Overview</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <StatChip label="Total Attempts"   value={overview.totalAttempts} />
              <StatChip label="Unique Referees"  value={overview.uniqueRefs} />
              <StatChip
                label="Average Score"
                value={overview.avgPct !== null ? `${overview.avgPct}%` : null}
                color={overview.avgPct !== null ? pctColor(overview.avgPct) : undefined}
              />
              <StatChip
                label="Median Score"
                value={overview.medPct !== null ? `${overview.medPct}%` : null}
                color={overview.medPct !== null ? pctColor(overview.medPct) : undefined}
              />
              <StatChip
                label="Highest Score"
                value={overview.highPct !== null ? `${overview.highPct}%` : null}
                color="#22c55e"
              />
              <StatChip
                label="Lowest Score"
                value={overview.lowPct !== null ? `${overview.lowPct}%` : null}
                color={overview.lowPct !== null ? pctColor(overview.lowPct) : undefined}
              />
            </div>
          </div>

          {/* ── 2. Referee Breakdown ────────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <h2 className="ed-section-title">Referee Breakdown</h2>
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)" }}>
                      <SortTh col="name"     label="Referee"       refTable />
                      <SortTh col="attempts" label="Attempts"      refTable right />
                      <SortTh col="latest"   label="Latest Score"  refTable right />
                      <SortTh col="best"     label="Best Score"    refTable right />
                      <SortTh col="avg"      label="Avg Score"     refTable right />
                      <SortTh col="last"     label="Last Attempt"  refTable right />
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRefereeRows.map(row => (
                      <tr key={row.userId} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 10px" }}>
                          <div style={{ fontWeight: 600 }}>{row.member?.name || "Unknown"}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{row.member?.email || "—"}</div>
                        </td>
                        <td style={{ padding: "10px 10px", textAlign: "right" }}>
                          <strong>{row.attemptCount}</strong>
                        </td>
                        <td style={{ padding: "10px 10px", textAlign: "right" }}>
                          {row.latest !== null
                            ? <span style={{ fontWeight: 700, color: pctColor(row.latest) }}>{row.latest}%</span>
                            : <span className="hint">—</span>}
                        </td>
                        <td style={{ padding: "10px 10px", textAlign: "right" }}>
                          {row.best !== null
                            ? <span style={{ fontWeight: 700, color: "#22c55e" }}>{row.best}%</span>
                            : <span className="hint">—</span>}
                        </td>
                        <td style={{ padding: "10px 10px", textAlign: "right" }}>
                          {row.avg !== null
                            ? <span style={{ fontWeight: 700, color: pctColor(row.avg) }}>{row.avg}%</span>
                            : <span className="hint">—</span>}
                        </td>
                        <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {fmt(row.lastCompleted)}
                        </td>
                        <td style={{ padding: "10px 10px" }}>
                          <TrendBadge trend={row.trend} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── 3. Category Performance ─────────────────────────────────────── */}
          {loadingResp && (
            <div className="panel" style={{ padding: 20, textAlign: "center", color: "var(--muted)", marginBottom: 20 }}>
              Loading decision data…
            </div>
          )}

          {!loadingResp && categoryStats.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h2 className="ed-section-title">Category Performance</h2>
              <div className="panel" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Sort by accuracy to show worst → best */}
                {[...categoryStats].sort((a, b) => a.pct - b.pct).map(cat => (
                  <HBar
                    key={cat.category}
                    label={cat.category || "Other"}
                    pct={cat.pct}
                    color={pctColor(cat.pct)}
                    count={cat.total}
                  />
                ))}
              </div>
              {/* Summary callouts */}
              {categoryStats.length > 1 && (() => {
                const sorted = [...categoryStats].sort((a, b) => a.pct - b.pct);
                const worst  = sorted[0];
                const best   = sorted[sorted.length - 1];
                return (
                  <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200, padding: "10px 14px", background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, fontSize: 13 }}>
                      <div style={{ fontSize: 11, color: "#fca5a5", fontWeight: 700, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Weakest Area</div>
                      <strong>{worst.category}</strong>
                      <span style={{ color: "var(--muted)", marginLeft: 8 }}>{worst.pct}% correct ({worst.total} responses)</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 200, padding: "10px 14px", background: "rgba(34,197,94,.07)", border: "1px solid rgba(34,197,94,.25)", borderRadius: 8, fontSize: 13 }}>
                      <div style={{ fontSize: 11, color: "#86efac", fontWeight: 700, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Strongest Area</div>
                      <strong>{best.category}</strong>
                      <span style={{ color: "var(--muted)", marginLeft: 8 }}>{best.pct}% correct ({best.total} responses)</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── 4. Decision Analysis ────────────────────────────────────────── */}
          {!loadingResp && decisionStats.length > 0 && (
            <div>
              <h2 className="ed-section-title">Decision Analysis</h2>
              <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border)" }}>
                        <SortTh col="label" label="Decision" />
                        <th style={{ padding: "8px 10px", fontWeight: 600 }}>Category</th>
                        <SortTh col="pct"   label="Correct %"      right />
                        <SortTh col="total" label="Responses"      right />
                        <SortTh col="time"  label="Avg Time (s)"   right />
                        <th style={{ padding: "8px 10px", fontWeight: 600 }}>Top Wrong Answer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDecisionRows.map(row => (
                        <tr key={row.key} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 10px", maxWidth: 220 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row.label}
                            </div>
                          </td>
                          <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                            {row.category}
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                              <div style={{ width: 50, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${row.pct}%`, height: "100%", background: pctColor(row.pct), borderRadius: 3 }} />
                              </div>
                              <span style={{ fontWeight: 700, color: pctColor(row.pct), minWidth: 36, textAlign: "right" }}>{row.pct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "right" }}>
                            <span>{row.correct}</span>
                            <span style={{ color: "var(--muted)" }}>/{row.total}</span>
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--muted)" }}>
                            {row.avgTime !== null ? `${row.avgTime}s` : "—"}
                          </td>
                          <td style={{ padding: "10px 10px", color: row.topIncorrect ? "#fca5a5" : "var(--muted)" }}>
                            {row.topIncorrect ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* No response data yet */}
          {!loadingResp && !categoryStats.length && (
            <div className="panel" style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              Detailed decision data will appear once referees complete attempts.
            </div>
          )}
        </>
      )}
    </div>
  );
}
