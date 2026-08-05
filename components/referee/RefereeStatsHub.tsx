"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { makeAnalytics, percent, countBy } from "@/lib/utils/analytics";
import { embedUrl, isDirectVideoUrl } from "@/lib/utils/video";
import { normaliseClipTaxonomy } from "@/lib/utils/taxonomyCompatibility";
import { DateRangeFilter, datePassesFilter, DATE_RANGE_DEFAULT } from "@/components/common/DateRangeFilter";
import type { DateRangeValue } from "@/components/common/DateRangeFilter";
import type { ReviewRecord, CodedTag, RefSlot } from "@/lib/types/reviews";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { OrgPage } from "@/components/organisation/OrganisationScreen";
import type { NavContext } from "@/components/shell/nav";

type Props = {
  reviews: ReviewRecord[];
  tags: CodedTag[];
  session: RefEvalSession | null;
  onBack: () => void;
  onAdmin: () => void;
  onProfile: () => void;
  onLogout: () => void;
  navContext?: NavContext;
  onNavigate?: (screen: Screen, orgPage?: OrgPage) => void;
  orgLogoUrl?: string | null;
};

type StatsTag = CodedTag & {
  reviewGame: string;
  reviewGameDate: string;
  reviewVideoLink: string;
  reviewEducatorName: string;
};

type AnalyticsFilter = { field: string; value: string; label: string };
/** @deprecated use DateRangeValue */
type DateRange = "all" | "30" | "90";

type FacetFilters = {
  outcome: string | null;
  category: string | null;
  position: string | null;
  coverage: string | null;
};
const EMPTY_FACETS: FacetFilters = { outcome: null, category: null, position: null, coverage: null };

function norm(s: string | null | undefined): string { return (s ?? "").trim(); }
function normForMatch(s: string | null | undefined): string { const v = norm(s); return v === "Uncoded" ? "" : v; }

function shMatchesOutcome(tag: StatsTag, filterValue: string): boolean {
  const tagVal = norm(tag.outcome).toLowerCase();
  const fVal = normForMatch(filterValue).toLowerCase();
  if (fVal === "") return tagVal === "";
  if (fVal === "correct") return tagVal.startsWith("correct");
  if (fVal === "incorrect") return tagVal.startsWith("incorrect");
  return tagVal === fVal;
}
function shMatchesCategory(tag: StatsTag, filterValue: string): boolean {
  const tagVal = norm((tag as any)._displayCategoryFull as string || tag.category);
  const fVal = normForMatch(filterValue);
  if (fVal === "") return tagVal === "";
  if (fVal.includes(" — ")) return tagVal === fVal;
  return tagVal.startsWith(fVal + " — ") || tagVal === fVal;
}
function shMatchesPosition(tag: StatsTag, filterValue: string): boolean {
  const tagVal = norm(tag.position);
  const fVal = normForMatch(filterValue);
  if (fVal === "") return tagVal === "";
  return tagVal === fVal;
}
function shMatchesCoverage(tag: StatsTag, filterValue: string): boolean {
  const tagVal = norm(tag.coverage);
  const fVal = normForMatch(filterValue);
  if (fVal === "") return tagVal === "";
  return tagVal === fVal;
}
function shMatchesFacets(tag: StatsTag, filters: FacetFilters, excludedFacet?: keyof FacetFilters): boolean {
  const outcomeMatches = excludedFacet === "outcome" || filters.outcome === null || shMatchesOutcome(tag, filters.outcome);
  const categoryMatches = excludedFacet === "category" || filters.category === null || shMatchesCategory(tag, filters.category);
  const positionMatches = excludedFacet === "position" || filters.position === null || shMatchesPosition(tag, filters.position);
  const coverageMatches = excludedFacet === "coverage" || filters.coverage === null || shMatchesCoverage(tag, filters.coverage);
  return outcomeMatches && categoryMatches && positionMatches && coverageMatches;
}

function slotForUser(userId: string, review?: ReviewRecord): RefSlot {
  if (!review) return "All Referees";
  if (userId === review.referee1Id) return "Referee 1";
  if (userId === review.referee2Id) return "Referee 2";
  if (userId === review.referee3Id) return "Referee 3";
  return "All Referees";
}

function tagAppliesToSlot(tag: CodedTag, slot: RefSlot): boolean {
  if (slot === "All Referees") return true;
  if (tag.refereeTarget === "All Referees") return true;
  if (tag.refereeTarget === slot) return true;
  if ((tag.extraReviewOfficials || []).includes(slot)) return true;
  return false;
}

function outcomeClass(outcome?: string | null): string {
  const o = (outcome || "").toLowerCase();
  if (o.startsWith("correct")) return "done";
  if (o.startsWith("incorrect")) return "incorrect";
  return "review";
}

// ── Donut chart ──────────────────────────────────────────────────────────────
type DonutSlice = { label: string; count: number; color: string; field: string; value: string };

function DonutChart({
  slices,
  innerLabel,
  activeFilter,
  onToggle,
}: {
  slices: DonutSlice[];
  innerLabel?: string;
  activeFilter: AnalyticsFilter | null;
  onToggle: (field: string, value: string, label: string) => void;
}) {
  const total = slices.reduce((s, x) => s + x.count, 0);
  if (!total) return null;
  const r = 42, sw = 17, size = 118, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  return (
    <div className="sh-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--panel3)" strokeWidth={sw} />
        {slices.filter(s => s.count > 0).map(s => {
          const frac = s.count / total;
          const start = cum;
          cum += frac;
          const isActive = activeFilter?.field === s.field && activeFilter.value === s.value;
          return (
            <circle key={s.label} cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth={isActive ? sw + 4 : sw}
              strokeDasharray={`${frac * circ} ${circ}`}
              strokeDashoffset={-(start * circ)}
              style={{ cursor: "pointer", transition: "stroke-width .15s", opacity: isActive ? 1 : 0.85 }}
              onClick={() => onToggle(s.field, s.value, s.label)}
            >
              <title>{s.label}: {s.count}</title>
            </circle>
          );
        })}
      </svg>
      {innerLabel && (
        <div className="sh-donut-inner">{innerLabel}</div>
      )}
    </div>
  );
}

// ── Accuracy trend (mini bar chart per review, sorted by date) ───────────────
function AccuracyTrend({
  reviews,
  tagsByReviewId,
  userId,
}: {
  reviews: ReviewRecord[];
  tagsByReviewId: Map<string, StatsTag[]>;
  userId: string;
}) {
  const points = useMemo(() => {
    return reviews
      .filter(r => tagsByReviewId.has(r.id))
      .sort((a, b) => (a.gameDate || a.createdAt).localeCompare(b.gameDate || b.createdAt))
      .map(r => {
        const t = tagsByReviewId.get(r.id) || [];
        const a = makeAnalytics(t);
        const denom = a.correctCalls + a.correctNoCalls + a.incorrectCalls + a.incorrectNoCalls;
        const acc = denom ? Math.round(((a.correctCalls + a.correctNoCalls) / denom) * 100) : null;
        return { label: r.game.length > 18 ? r.game.slice(0, 16) + "…" : r.game, acc, date: r.gameDate || r.createdAt.slice(0, 10) };
      });
  }, [reviews, tagsByReviewId]);

  if (points.length < 2) return null;
  const validPoints = points.filter(p => p.acc !== null) as { label: string; acc: number; date: string }[];
  if (validPoints.length < 2) return null;

  const maxAcc = 100;
  const barW = Math.max(18, Math.min(40, Math.floor(240 / validPoints.length)));
  const chartH = 70;

  return (
    <div className="analytics-card">
      <h3 style={{ marginBottom: 10 }}>Accuracy Trend</h3>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", overflowX: "auto", paddingBottom: 6 }}>
        {validPoints.map((p, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, width: barW }}>
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>{p.acc}%</span>
            <div style={{
              width: "100%", height: Math.round((p.acc / maxAcc) * chartH),
              background: p.acc >= 70 ? "#22c55e" : p.acc >= 50 ? "#f59e0b" : "#ef4444",
              borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height .2s"
            }} />
            <span style={{ fontSize: 9, color: "var(--muted)", textAlign: "center", wordBreak: "break-all", lineHeight: 1.2 }}>{p.date.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function RefereeStatsHub({ reviews, tags, session, onBack, onAdmin, onProfile, onLogout, navContext, onNavigate, orgLogoUrl }: Props) {
  const [dateFilter, setDateFilter] = useState<DateRangeValue>(DATE_RANGE_DEFAULT);
  const [facetFilters, setFacetFilters] = useState<FacetFilters>(EMPTY_FACETS);
  const [expandedCategoryGroup, setExpandedCategoryGroup] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [seekSeconds, setSeekSeconds] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  // Draggable split: percentage of total width given to the filter/clip column
  const SPLIT_LS_KEY = "sh-split-pct";
  const [splitPct, setSplitPct] = useState<number>(() => {
    if (typeof window === "undefined") return 40;
    const saved = Number(localStorage.getItem(SPLIT_LS_KEY));
    return saved >= 20 && saved <= 75 ? saved : 40;
  });
  const isDragging = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      const raw = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(raw, 20), 75);
      setSplitPct(Math.round(clamped));
    };
    const onUp = () => {
      isDragging.current = false;
      setSplitPct(prev => { localStorage.setItem(SPLIT_LS_KEY, String(prev)); return prev; });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const userId = session?.user.id || "";

  const myReviews = useMemo(() =>
    reviews.filter(r => r.status === "Completed" && [r.referee1Id, r.referee2Id, r.referee3Id].includes(userId)),
    [reviews, userId]
  );

  const dateFilteredReviews = useMemo(() =>
    myReviews.filter(r => datePassesFilter(r.gameDate || r.createdAt.slice(0, 10), dateFilter)),
    [myReviews, dateFilter]
  );

  const allMyTags = useMemo((): StatsTag[] =>
    dateFilteredReviews.flatMap(review => {
      const slot = slotForUser(userId, review);
      return tags.filter(t => t.reviewId === review.id && tagAppliesToSlot(t, slot))
        .map(t => normaliseClipTaxonomy({
          ...t,
          reviewGame: review.game,
          reviewGameDate: review.gameDate || "",
          reviewVideoLink: review.videoLink,
          reviewEducatorName: review.educatorName,
        }));
    }),
    [dateFilteredReviews, tags, userId]
  );

  const tagsByReviewId = useMemo(() => {
    const m = new Map<string, StatsTag[]>();
    for (const t of allMyTags) {
      if (!m.has(t.reviewId)) m.set(t.reviewId, []);
      m.get(t.reviewId)!.push(t);
    }
    return m;
  }, [allMyTags]);

  const hasAnyFacetFilter =
    facetFilters.outcome !== null ||
    facetFilters.category !== null ||
    facetFilters.position !== null ||
    facetFilters.coverage !== null;

  // Per-facet compatible pools: each excludes its own facet so dynamic options narrow correctly
  const outcomeCompatibleClips = useMemo(
    () => allMyTags.filter(t => shMatchesFacets(t, facetFilters, "outcome")),
    [allMyTags, facetFilters],
  );
  const categoryCompatibleClips = useMemo(
    () => allMyTags.filter(t => shMatchesFacets(t, facetFilters, "category")),
    [allMyTags, facetFilters],
  );
  const positionCompatibleClips = useMemo(
    () => allMyTags.filter(t => shMatchesFacets(t, facetFilters, "position")),
    [allMyTags, facetFilters],
  );
  const coverageCompatibleClips = useMemo(
    () => allMyTags.filter(t => shMatchesFacets(t, facetFilters, "coverage")),
    [allMyTags, facetFilters],
  );

  // filteredTags: the canonical dataset — all four facets active
  const filteredTags = useMemo(
    (): StatsTag[] => allMyTags.filter(t => shMatchesFacets(t, facetFilters)),
    [allMyTags, facetFilters],
  );

  // Analytics derives from the filtered dataset so all summary tiles reflect active facets
  const analytics = useMemo(() => makeAnalytics(filteredTags), [filteredTags]);

  // Outcome section counts come from compatible pool (excludes own facet)
  const outcomeCompatibleAnalytics = useMemo(() => makeAnalytics(outcomeCompatibleClips), [outcomeCompatibleClips]);

  // Category group counts from compatible pool
  const groupedCategoryCounts = useMemo((): [string, number][] => {
    const counts: Record<string, number> = {};
    for (const t of categoryCompatibleClips) {
      const group = (t as any)._displayCategory || "Uncoded";
      counts[group] = (counts[group] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [categoryCompatibleClips]);

  // Expansion of category sub-tags is independent of the category filter
  const activeGroupForSub: string | null = expandedCategoryGroup;

  const categorySubCounts = useMemo((): [string, string, number][] => {
    if (!activeGroupForSub) return [];
    const counts: Record<string, number> = {};
    for (const t of categoryCompatibleClips) {
      const cat = (t as any)._displayCategory as string | null;
      const spec = (t as any)._displaySpecificTag as string | null;
      if (cat === activeGroupForSub && spec) {
        counts[spec] = (counts[spec] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s, c]) => [s, `${activeGroupForSub} — ${s}`, c]);
  }, [activeGroupForSub, categoryCompatibleClips]);

  // Position and coverage section counts from their compatible pools
  const positionSectionCounts = useMemo(() => countBy(positionCompatibleClips, "position"), [positionCompatibleClips]);
  const coverageSectionCounts = useMemo(() => countBy(coverageCompatibleClips, "coverage"), [coverageCompatibleClips]);

  const selectedClip = filteredTags.find(t => t.id === selectedClipId) ?? allMyTags.find(t => t.id === selectedClipId) ?? null;

  function selectClip(tag: StatsTag) { setSelectedClipId(tag.id); setSeekSeconds(tag.adjustedSeconds); setVideoError(false); setVideoLoading(true); }

  function isFacetActive(collection: keyof FacetFilters, value: string) { return facetFilters[collection] === value; }
  function toggleFacet(collection: keyof FacetFilters, value: string) {
    setFacetFilters(prev => ({ ...prev, [collection]: prev[collection] === value ? null : value }));
    setSelectedClipId(null);
  }
  function clearFacet(collection: keyof FacetFilters) {
    setFacetFilters(prev => ({ ...prev, [collection]: null }));
    setSelectedClipId(null);
  }
  function clearAllFacets() {
    setFacetFilters({ ...EMPTY_FACETS });
    setSelectedClipId(null);
  }
  function toggleCategoryExpansion(group: string) {
    setExpandedCategoryGroup(prev => prev === group ? null : group);
  }

  const COLLECTION_LABELS: Record<keyof FacetFilters, string> = { outcome: "Outcome", category: "Category", position: "Position", coverage: "Coverage" };
  const activeChips: { collection: keyof FacetFilters; value: string; label: string }[] = [];
  for (const collection of Object.keys(facetFilters) as (keyof FacetFilters)[]) {
    const value = facetFilters[collection];
    if (value !== null) {
      const label = `${COLLECTION_LABELS[collection]}: ${value.includes(" — ") ? value.split(" — ")[1] : value}`;
      activeChips.push({ collection, value, label });
    }
  }



  // Summary tiles derive from filteredTags (the fully-faceted dataset)
  const denom = analytics.correctCalls + analytics.correctNoCalls + analytics.incorrectCalls + analytics.incorrectNoCalls;
  const accuracyPct = denom ? Math.round(((analytics.correctCalls + analytics.correctNoCalls) / denom) * 100) : null;

  // Outcome section bars use the outcome-compatible pool (excludes own facet), so clicking other
  // facets narrows these options without erasing the current Outcome selection
  const outcomeSlices: DonutSlice[] = [
    { label: "Correct", count: outcomeCompatibleAnalytics.correctCalls + outcomeCompatibleAnalytics.correctNoCalls, color: "#22c55e", field: "outcome-group", value: "Correct" },
    { label: "Incorrect", count: outcomeCompatibleAnalytics.incorrectCalls + outcomeCompatibleAnalytics.incorrectNoCalls, color: "#ef4444", field: "outcome-group", value: "Incorrect" },
    { label: "Review", count: outcomeCompatibleAnalytics.reviews, color: "#f59e0b", field: "outcome", value: "Review" },
  ];

  const currentEmbed = selectedClip?.reviewVideoLink
    ? embedUrl(selectedClip.reviewVideoLink, seekSeconds, true)
    : "";
  const isIframe = currentEmbed.includes("youtube.com/embed");
  const isDirectVideo = selectedClip?.reviewVideoLink ? isDirectVideoUrl(selectedClip.reviewVideoLink) : false;

  // Prev/next navigation within filteredTags
  const selectedIdx = filteredTags.findIndex(t => t.id === selectedClipId);
  const hasPrev = selectedIdx > 0;
  const hasNext = selectedIdx < filteredTags.length - 1;
  function goPrev() { if (hasPrev) selectClip(filteredTags[selectedIdx - 1]); }
  function goNext() { if (hasNext) selectClip(filteredTags[selectedIdx + 1]); }

  return (
    <AppShell session={session} onHome={onBack} onAdmin={onAdmin} onProfile={onProfile} onLogout={onLogout} navContext={navContext} onNavigate={onNavigate} orgLogoUrl={orgLogoUrl}>
      {/* This hub is a dense, full-bleed split-pane layout (see .sh-body's
          `height: calc(100vh - 200px)`) that predates AppShell — cancel
          AppShell's page gutter with matching negative margins rather than
          rework the layout to accommodate it. */}
      <div className="-m-4 sm:-m-6 lg:-m-8">

      {/* ── Slim toolbar: title + back ── */}
      <div className="sh-toolbar">
        <div className="sh-toolbar__title">
          <button onClick={onBack} className="sh-toolbar__back">← Back</button>
          <span className="sh-toolbar__heading">My Stats Hub</span>
        </div>
      </div>

      {/* ── Date filter (shared component, matches referee home style) ── */}
      <div style={{ padding: "0 16px" }}>
        <DateRangeFilter
          value={dateFilter}
          onChange={v => { setDateFilter(v); setFacetFilters({ ...EMPTY_FACETS }); setExpandedCategoryGroup(null); }}
          totalCount={myReviews.length}
          filteredCount={dateFilteredReviews.length}
        />
      </div>

      {/* ── Performance Snapshot ── */}
      <div className="sh-snapshot">
        <div className="sh-snap-card sh-snap-card--accent">
          <div className="sh-snap-num">{accuracyPct !== null ? `${accuracyPct}%` : "—"}</div>
          <div className="sh-snap-lbl">Accuracy</div>
        </div>
        <div className="sh-snap-card">
          <div className="sh-snap-num">{dateFilteredReviews.length}</div>
          <div className="sh-snap-lbl">Reviews</div>
        </div>
        <div className="sh-snap-card">
          <div className="sh-snap-num">{filteredTags.length}{hasAnyFacetFilter ? <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)" }}> /{allMyTags.length}</span> : null}</div>
          <div className="sh-snap-lbl">Clips</div>
        </div>
        <div className="sh-snap-card sh-snap-card--good">
          <div className="sh-snap-num">{analytics.correctCalls + analytics.correctNoCalls}</div>
          <div className="sh-snap-lbl">Correct</div>
        </div>
        <div className="sh-snap-card sh-snap-card--bad">
          <div className="sh-snap-num">{analytics.incorrectCalls + analytics.incorrectNoCalls}</div>
          <div className="sh-snap-lbl">Incorrect</div>
        </div>
      </div>

      {allMyTags.length === 0 ? (
        <div className="empty-state" style={{ margin: "24px 16px" }}>No clips found for this time period.</div>
      ) : (
        <div
          className="sh-body"
          ref={bodyRef}
          style={{ gridTemplateColumns: `${splitPct}fr 6px ${100 - splitPct}fr` }}
        >

          {/* ── Left: filter panel + clip list ── */}
          <div className="sh-filter-col">

            {/* Selected Filters — compact chip row, only when at least one filter is active */}
            {hasAnyFacetFilter ? (
              <div className="selected-filters" style={{ marginBottom: 8 }}>
                <div className="facet-active-chips">
                  {activeChips.map(chip => (
                    <button key={chip.collection + chip.value} className="filter-chip"
                      onClick={() => clearFacet(chip.collection)} title={`Remove: ${chip.label}`}>
                      {chip.label} ×
                    </button>
                  ))}
                  <button className="facet-clear-all" onClick={clearAllFacets}>Clear all ×</button>
                </div>
              </div>
            ) : (
              <p className="hint" style={{ fontSize: 11, margin: "0 0 4px" }}>Click any bar below to filter clips.</p>
            )}

            {/* Outcome bars — counts from compatible pool (excludes own facet) */}
            <div className="sh-filter-group">
              <p className="sh-filter-group-hdr">Outcome</p>
              {(() => {
                const displaySlices = outcomeSlices.filter(s => s.count > 0 || isFacetActive("outcome", s.value));
                const maxVal = Math.max(...displaySlices.map(s => s.count), 1);
                return displaySlices.map(s => {
                  const isActive = isFacetActive("outcome", s.value);
                  return (
                    <div key={s.label} className={"sh-bar-row" + (isActive ? " sh-bar-row--active" : "")}
                      role="button" tabIndex={0}
                      onClick={() => toggleFacet("outcome", s.value)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFacet("outcome", s.value); } }}>
                      <div className="sh-bar-header">
                        <span className="sh-bar-label">
                          <span className="sh-bar-dot" style={{ background: s.color }} />{s.label}
                        </span>
                        <span className="sh-bar-count">{s.count}</span>
                      </div>
                      <div className="sh-bar-track">
                        <div className="sh-bar-fill" style={{ width: s.count > 0 ? `${Math.round((s.count / maxVal) * 100)}%` : "0%", background: s.color }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Category bars — counts from compatible pool (excludes own facet) */}
            {(() => {
              const selectedCat = facetFilters.category;
              const selectedGroup = selectedCat
                ? (selectedCat.includes(" — ") ? selectedCat.split(" — ")[0] : selectedCat)
                : null;
              const displayGroups: [string, number][] =
                selectedGroup && !groupedCategoryCounts.some(([g]) => g === selectedGroup)
                  ? [...groupedCategoryCounts, [selectedGroup, 0]]
                  : groupedCategoryCounts;
              if (displayGroups.length === 0) return null;
              const maxVal = Math.max(...displayGroups.map(([, c]) => c), 1);
              return (
                <div className="sh-filter-group">
                  <p className="sh-filter-group-hdr">Category</p>
                  {displayGroups.map(([group, count]) => {
                    const isGroupActive =
                      facetFilters.category !== null && (
                        facetFilters.category === group ||
                        facetFilters.category.startsWith(group + " — ")
                      );
                    const hasSubCounts = categoryCompatibleClips.some(
                      t => (t as any)._displayCategory === group && (t as any)._displaySpecificTag
                    );
                    return (
                      <div key={group} className={"sh-bar-row" + (isGroupActive ? " sh-bar-row--active" : "")}
                        role="button" tabIndex={0}
                        onClick={() => { toggleFacet("category", group); setExpandedCategoryGroup(group); }}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFacet("category", group); setExpandedCategoryGroup(group); } }}>
                        <div className="sh-bar-header">
                          <span className="sh-bar-label">
                            {group}
                            {hasSubCounts && (
                              <button
                                className="sh-expand-toggle"
                                onClick={e => { e.stopPropagation(); toggleCategoryExpansion(group); }}
                                title={expandedCategoryGroup === group ? `Collapse ${group}` : `Expand ${group}`}
                                aria-label={expandedCategoryGroup === group ? `Collapse ${group}` : `Expand ${group}`}
                              >
                                {expandedCategoryGroup === group ? " ▾" : " ▸"}
                              </button>
                            )}
                          </span>
                          <span className="sh-bar-count">{count}</span>
                        </div>
                        <div className="sh-bar-track">
                          <div className="sh-bar-fill" style={{ width: count > 0 ? `${Math.round((count / maxVal) * 100)}%` : "0%" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Specific tags — shown when a group is expanded (expansion independent from filter) */}
            {activeGroupForSub !== null && (() => {
              const isSpecificSelected =
                facetFilters.category?.includes(" — ") &&
                facetFilters.category.startsWith(activeGroupForSub + " — ");
              const allSubs: [string, string, number][] =
                isSpecificSelected && !categorySubCounts.some(([, fv]) => fv === facetFilters.category)
                  ? [...categorySubCounts, [facetFilters.category!.split(" — ")[1], facetFilters.category!, 0]]
                  : categorySubCounts;
              if (allSubs.length === 0) return null;
              return (
                <div className="sh-filter-group sh-filter-group--sub">
                  <p className="sh-filter-group-hdr">
                    Specific Tags&nbsp;<span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— {activeGroupForSub}</span>
                  </p>
                  <div className="sh-subtag-chips">
                    {allSubs.map(([specific, fullVal, count]) => {
                      const isActive = isFacetActive("category", fullVal);
                      return (
                        <button key={fullVal}
                          className={"sh-filter-chip sh-filter-chip--sub" + (isActive ? " sh-filter-chip--active" : "")}
                          onClick={() => toggleFacet("category", fullVal)}>
                          {specific} <strong>{count}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Position bars — counts from compatible pool */}
            {(() => {
              const selectedPos = facetFilters.position;
              const displayCounts: [string, number][] =
                selectedPos && !positionSectionCounts.some(([v]) => v === selectedPos)
                  ? [...positionSectionCounts, [selectedPos, 0]]
                  : positionSectionCounts;
              if (displayCounts.length === 0) return null;
              const maxVal = Math.max(...displayCounts.map(([, c]) => c), 1);
              return (
                <div className="sh-filter-group">
                  <p className="sh-filter-group-hdr">Position</p>
                  {displayCounts.map(([name, count]) => {
                    const isActive = isFacetActive("position", name);
                    return (
                      <div key={name} className={"sh-bar-row" + (isActive ? " sh-bar-row--active" : "")}
                        role="button" tabIndex={0}
                        onClick={() => toggleFacet("position", name)}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFacet("position", name); } }}>
                        <div className="sh-bar-header">
                          <span className="sh-bar-label">{name}</span>
                          <span className="sh-bar-count">{count}</span>
                        </div>
                        <div className="sh-bar-track">
                          <div className="sh-bar-fill" style={{ width: count > 0 ? `${Math.round((count / maxVal) * 100)}%` : "0%" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Coverage bars — counts from compatible pool */}
            {(() => {
              const selectedCov = facetFilters.coverage;
              const displayCounts: [string, number][] =
                selectedCov && !coverageSectionCounts.some(([v]) => v === selectedCov)
                  ? [...coverageSectionCounts, [selectedCov, 0]]
                  : coverageSectionCounts;
              if (displayCounts.length === 0) return null;
              const maxVal = Math.max(...displayCounts.map(([, c]) => c), 1);
              return (
                <div className="sh-filter-group">
                  <p className="sh-filter-group-hdr">Coverage</p>
                  {displayCounts.map(([name, count]) => {
                    const isActive = isFacetActive("coverage", name);
                    return (
                      <div key={name} className={"sh-bar-row" + (isActive ? " sh-bar-row--active" : "")}
                        role="button" tabIndex={0}
                        onClick={() => toggleFacet("coverage", name)}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFacet("coverage", name); } }}>
                        <div className="sh-bar-header">
                          <span className="sh-bar-label">{name}</span>
                          <span className="sh-bar-count">{count}</span>
                        </div>
                        <div className="sh-bar-track">
                          <div className="sh-bar-fill" style={{ width: count > 0 ? `${Math.round((count / maxVal) * 100)}%` : "0%" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Clip list */}
            <div style={{ flex: 1 }}>
              <p className="rv-sidebar-heading" style={{ margin: "8px 0 6px" }}>
                Clips ({filteredTags.length}{hasAnyFacetFilter ? ` of ${allMyTags.length}` : ""})
              </p>
              {filteredTags.length === 0 ? (
                <div className="empty-state" style={{ margin: 0, padding: "16px 0" }}>No clips match this filter.</div>
              ) : (
                <div className="sh-clip-list">
                  {filteredTags.map((tag, i) => {
                    const sel = tag.id === selectedClipId;
                    const displayCat = (tag as any)._displayCategoryFull as string | null;
                    return (
                      <div key={tag.id} className={"sh-clip-row" + (sel ? " sh-clip-row--selected" : "")}
                        onClick={() => selectClip(tag)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontWeight: 900, fontSize: 13 }}>{tag.adjustedTime}</span>
                          {tag.outcome && (
                            <span className={`status ${outcomeClass(tag.outcome)}`} style={{ fontSize: 10, padding: "1px 6px" }}>{tag.outcome}</span>
                          )}
                          <span className="hint" style={{ fontSize: 10, marginLeft: "auto" }}>#{i + 1}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tag.reviewGame}
                        </p>
                        <p className="hint" style={{ margin: "1px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {[tag.reviewGameDate, displayCat].filter(Boolean).join(" · ")}
                        </p>
                        {tag.notes && (
                          <p className="hint" style={{ margin: "1px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {tag.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Draggable divider ── */}
          <div className="sh-divider" onMouseDown={startDrag} title="Drag to resize" />

          {/* ── Right: video + clip detail ── */}
          <div className="sh-video-col">

            <div className="sh-video-frame" style={{ position: "relative" }}>
              {/* Loading overlay */}
              {videoLoading && selectedClip && !videoError && (
                <div className="sh-video-loading">
                  <span className="sh-video-spinner" />
                  <span>Loading clip…</span>
                </div>
              )}
              {selectedClip && currentEmbed ? (
                isIframe ? (
                  <iframe key={`${selectedClip.id}-${seekSeconds}`}
                    src={currentEmbed}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                    onLoad={() => setVideoLoading(false)}
                  />
                ) : isDirectVideo ? (
                  videoError ? (
                    <div className="sh-empty-video" style={{ flexDirection: "column", gap: 8 }}>
                      <span>Video could not be loaded.</span>
                      <a href={selectedClip.reviewVideoLink} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: 12 }}>Open source video ↗</a>
                    </div>
                  ) : (
                    <video key={`${selectedClip.id}-${seekSeconds}`} controls autoPlay
                      src={selectedClip.reviewVideoLink + `#t=${Math.floor(seekSeconds)}`}
                      style={{ width: "100%", height: "100%", display: "block", background: "#000" }}
                      onCanPlay={() => setVideoLoading(false)}
                      onError={() => { setVideoError(true); setVideoLoading(false); }}
                    />
                  )
                ) : (
                  <div className="sh-empty-video">This video cannot be embedded directly.</div>
                )
              ) : (
                <div className="sh-empty-video">
                  {selectedClip ? "No video attached." : "Select a clip from the list to watch."}
                </div>
              )}
            </div>

            <div className="sh-nav-row">
              <button onClick={goPrev} disabled={!hasPrev}>← Prev</button>
              <span className="hint" style={{ fontSize: 12 }}>
                {selectedIdx >= 0 ? `${selectedIdx + 1} / ${filteredTags.length}` : `${filteredTags.length} clips`}
              </span>
              <button onClick={goNext} disabled={!hasNext}>Next →</button>
            </div>

            {selectedClip && (
              <div className="sh-clip-detail">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="eyebrow" style={{ marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedClip.reviewGame}</p>
                    <p style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 900 }}>{selectedClip.adjustedTime}</p>
                    <p className="hint" style={{ margin: 0, fontSize: 12 }}>{selectedClip.reviewGameDate || "No date"} · {selectedClip.reviewEducatorName}</p>
                  </div>
                  {selectedClip.outcome && <span className={`status ${outcomeClass(selectedClip.outcome)}`}>{selectedClip.outcome}</span>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {selectedClip.coverage && <span className="chip">{selectedClip.coverage}</span>}
                  {selectedClip.position && <span className="chip">{selectedClip.position}</span>}
                  {(selectedClip as any)._displayCategoryFull && (
                    <span className="chip" style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {(selectedClip as any)._displayCategoryFull}
                    </span>
                  )}
                </div>
                {selectedClip.notes && <div className="rv-clip-notes" style={{ marginTop: 8 }}>{selectedClip.notes}</div>}
              </div>
            )}
          </div>

        </div>
      )}
      </div>
    </AppShell>
  );
}

