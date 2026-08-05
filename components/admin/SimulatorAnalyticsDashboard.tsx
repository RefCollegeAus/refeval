"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Zap, ChevronLeft, ArrowUpDown, TrendingUp, TrendingDown, Minus, BarChart2,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { SimulatorSessionWithEvents, SimulatorAttempt, SimulatorResponse } from "@/lib/types/simulator";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import type { MemberRecord } from "@/lib/types/members";
import { PageFrame } from "@/components/shell/PageFrame";
import {
  Button, Card, EmptyState, Select,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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
    <div className="min-w-[100px] flex-1 basis-[120px] rounded-lg border border-border bg-panel-2 p-3 text-center">
      <div className="text-xl font-extrabold" style={{ color: color ?? "var(--text)" }}>
        {value === null ? "—" : value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

// ── HBar (horizontal progress bar) ───────────────────────────────────────────

function HBar({ pct, color, label, count }: { pct: number; color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-[130px] shrink-0 truncate text-text">{label}</div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-panel-3">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-[42px] shrink-0 text-right font-semibold" style={{ color }}>{pct}%</div>
      <div className="w-[50px] shrink-0 text-right text-xs text-muted">{count} resp</div>
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
      <TableHeaderCell
        className={cn("cursor-pointer select-none whitespace-nowrap", right && "text-right")}
        onClick={() => refTable ? handleRefSort(col as RefSort) : handleDecSort(col as DecSort)}
      >
        <span className={cn("inline-flex items-center gap-1", right && "justify-end")}>
          {label}
          <ArrowUpDown size={10} className={active ? "text-accent" : "opacity-30"} />
        </span>
      </TableHeaderCell>
    );
  }

  // ── Trend badge ────────────────────────────────────────────────────────────

  function TrendBadge({ trend }: { trend: "improving" | "declining" | "stable" | null }) {
    if (!trend) return <span className="text-xs text-muted">—</span>;
    if (trend === "improving") return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-good">
        <TrendingUp size={13} /> Improving
      </span>
    );
    if (trend === "declining") return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
        <TrendingDown size={13} /> Declining
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted">
        <Minus size={13} /> Stable
      </span>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!publishedSessions.length) {
    return (
      <PageFrame
        className="p-0"
        eyebrow="Simulator"
        title="Analytics"
        actions={
          <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
            <ChevronLeft size={15} /> Back
          </Button>
        }
      >
        <EmptyState
          icon={<BarChart2 size={36} />}
          title="No published simulators"
          description="Publish a simulator session to see analytics."
        />
      </PageFrame>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <PageFrame
      className="p-0 mx-auto max-w-[1100px]"
      eyebrow="Simulator"
      title="Analytics"
      description="Referee performance and decision-making insights"
      actions={
        <>
          {publishedSessions.length > 1 && (
            <Select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-auto max-w-[240px] text-sm"
            >
              {publishedSessions.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </Select>
          )}
          <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
            <ChevronLeft size={15} /> Back
          </Button>
        </>
      }
    >
      {publishedSessions.length === 1 && (
        <div className="-mt-2 flex items-center gap-2 rounded-lg bg-panel-2 px-3 py-2">
          <Zap size={13} className="shrink-0 text-yellow-300" />
          <span className="text-sm font-semibold text-text">{selectedSession?.title}</span>
          {selectedSession?.description && (
            <span className="text-sm text-muted">— {selectedSession.description}</span>
          )}
        </div>
      )}

      {/* No attempts yet */}
      {!sessionAttempts.length && (
        <EmptyState
          icon={<Zap size={36} />}
          title="No attempts yet"
          description="Assign this simulator to referees to start collecting data."
        />
      )}

      {!!sessionAttempts.length && (
        <>
          {/* ── 1. Overview ─────────────────────────────────────────────────── */}
          <div>
            <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Overview</h2>
            <div className="flex flex-wrap gap-2.5">
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
          <div>
            <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Referee Breakdown</h2>
            <Table>
              <TableHead>
                <TableRow>
                  <SortTh col="name"     label="Referee"       refTable />
                  <SortTh col="attempts" label="Attempts"      refTable right />
                  <SortTh col="latest"   label="Latest Score"  refTable right />
                  <SortTh col="best"     label="Best Score"    refTable right />
                  <SortTh col="avg"      label="Avg Score"     refTable right />
                  <SortTh col="last"     label="Last Attempt"  refTable right />
                  <TableHeaderCell>Trend</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRefereeRows.map(row => (
                  <TableRow key={row.userId}>
                    <TableCell data-label="Referee">
                      <div className="font-semibold text-text">{row.member?.name || "Unknown"}</div>
                      <div className="text-[11px] text-muted">{row.member?.email || "—"}</div>
                    </TableCell>
                    <TableCell data-label="Attempts" className="text-right">
                      <strong>{row.attemptCount}</strong>
                    </TableCell>
                    <TableCell data-label="Latest Score" className="text-right">
                      {row.latest !== null
                        ? <span className="font-semibold" style={{ color: pctColor(row.latest) }}>{row.latest}%</span>
                        : <span className="text-muted">—</span>}
                    </TableCell>
                    <TableCell data-label="Best Score" className="text-right">
                      {row.best !== null
                        ? <span className="font-semibold text-good">{row.best}%</span>
                        : <span className="text-muted">—</span>}
                    </TableCell>
                    <TableCell data-label="Avg Score" className="text-right">
                      {row.avg !== null
                        ? <span className="font-semibold" style={{ color: pctColor(row.avg) }}>{row.avg}%</span>
                        : <span className="text-muted">—</span>}
                    </TableCell>
                    <TableCell data-label="Last Attempt" className="whitespace-nowrap text-right text-muted">
                      {fmt(row.lastCompleted)}
                    </TableCell>
                    <TableCell data-label="Trend">
                      <TrendBadge trend={row.trend} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ── 3. Category Performance ─────────────────────────────────────── */}
          {loadingResp && (
            <Card className="py-5 text-center text-sm text-muted">Loading decision data…</Card>
          )}

          {!loadingResp && categoryStats.length > 0 && (
            <div>
              <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Category Performance</h2>
              <Card className="grid grid-cols-1 gap-2.5">
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
              </Card>
              {/* Summary callouts */}
              {categoryStats.length > 1 && (() => {
                const sorted = [...categoryStats].sort((a, b) => a.pct - b.pct);
                const worst  = sorted[0];
                const best   = sorted[sorted.length - 1];
                return (
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    <div className="min-w-[200px] flex-1 rounded-lg border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-sm">
                      <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-red-300">Weakest Area</div>
                      <strong>{worst.category}</strong>
                      <span className="ml-2 text-muted">{worst.pct}% correct ({worst.total} responses)</span>
                    </div>
                    <div className="min-w-[200px] flex-1 rounded-lg border border-good/25 bg-good/5 px-3.5 py-2.5 text-sm">
                      <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-green-300">Strongest Area</div>
                      <strong>{best.category}</strong>
                      <span className="ml-2 text-muted">{best.pct}% correct ({best.total} responses)</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── 4. Decision Analysis ────────────────────────────────────────── */}
          {!loadingResp && decisionStats.length > 0 && (
            <div>
              <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Decision Analysis</h2>
              <Table>
                <TableHead>
                  <TableRow>
                    <SortTh col="label" label="Decision" />
                    <TableHeaderCell>Category</TableHeaderCell>
                    <SortTh col="pct"   label="Correct %"      right />
                    <SortTh col="total" label="Responses"      right />
                    <SortTh col="time"  label="Avg Time (s)"   right />
                    <TableHeaderCell>Top Wrong Answer</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedDecisionRows.map(row => (
                    <TableRow key={row.key}>
                      <TableCell data-label="Decision" className="max-w-[220px]">
                        <div className="truncate">{row.label}</div>
                      </TableCell>
                      <TableCell data-label="Category" className="whitespace-nowrap text-muted">
                        {row.category}
                      </TableCell>
                      <TableCell data-label="Correct %" className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="h-1.5 w-[50px] overflow-hidden rounded-full bg-border">
                            <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: pctColor(row.pct) }} />
                          </div>
                          <span className="min-w-[36px] text-right font-semibold" style={{ color: pctColor(row.pct) }}>{row.pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell data-label="Responses" className="text-right">
                        <span>{row.correct}</span>
                        <span className="text-muted">/{row.total}</span>
                      </TableCell>
                      <TableCell data-label="Avg Time (s)" className="text-right text-muted">
                        {row.avgTime !== null ? `${row.avgTime}s` : "—"}
                      </TableCell>
                      <TableCell data-label="Top Wrong Answer" className={row.topIncorrect ? "text-red-300" : "text-muted"}>
                        {row.topIncorrect ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* No response data yet */}
          {!loadingResp && !categoryStats.length && (
            <Card className="py-5 text-center text-sm text-muted">
              Detailed decision data will appear once referees complete attempts.
            </Card>
          )}
        </>
      )}
    </PageFrame>
  );
}
