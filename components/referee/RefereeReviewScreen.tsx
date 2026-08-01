"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "@/components/Header";
import { ReviewComments } from "@/components/ReviewComments";
import { makeAnalytics, countBy } from "@/lib/utils/analytics";
import { MessageSquare } from "lucide-react";
import type { ReviewRecord, CodedTag, RefSlot, OfficialSummary } from "@/lib/types/reviews";
import type { RefEvalSession } from "@/lib/types/auth";
import { ClipRangeVideoPlayer } from "@/components/common/ClipRangeVideoPlayer";
import { resolveClipPlayback } from "@/lib/utils/clipBounds";

import type { UnreadCounts } from "@/lib/hooks/useUnreadCounts";

type Props = {
  review: ReviewRecord | undefined;
  visibleTags: CodedTag[];
  mySlot: RefSlot | null;
  session: RefEvalSession | null;
  unreadCounts?: UnreadCounts;
  onRead?: () => void;
  clearUnread?: (reviewId: string, tagId: string) => void;
  officialSummary?: OfficialSummary | null;
  initialTagId?: string | null;
  onHome: () => void;
  onAdmin: () => void;
  onProfile: () => void;
  onLogout: () => void;
};

function displayName(slot: RefSlot, review?: ReviewRecord): string {
  if (!review) return slot;
  if (slot === "Referee 1") return review.referee1Name || "Crew Chief";
  if (slot === "Referee 2") return review.referee2Name || "Umpire 1";
  if (slot === "Referee 3") return review.referee3Name || "Umpire 2";
  return "All Referees";
}

function relationLabel(tag: CodedTag, mySlot: RefSlot | null): string {
  if (tag.refereeTarget === mySlot) return "Your Call";
  if (tag.refereeTarget === "All Referees") return "Crew";
  return "Review Only";
}

function outcomeClass(outcome?: string | null): string {
  if (!outcome) return "review";
  const o = outcome.toLowerCase();
  if (o.startsWith("correct")) return "done";
  if (o.startsWith("incorrect")) return "incorrect";
  return "review";
}

type FacetFilters = {
  outcome: string | null;
  category: string | null;
  position: string | null;
  coverage: string | null;
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim();
}

// "Uncoded" is the display label used by countBy() for empty-string fields.
// Matching must map it back to "" so clips with no value are correctly found.
function normForMatch(s: string | null | undefined): string {
  const v = norm(s);
  return v === "Uncoded" ? "" : v;
}

function clipMatchesOutcome(tag: CodedTag, filterValue: string): boolean {
  const tagVal = norm(tag.outcome).toLowerCase();
  const fVal = normForMatch(filterValue).toLowerCase();
  if (fVal === "") return tagVal === "";           // "Uncoded" filter → empty outcome
  if (fVal === "correct") return tagVal.startsWith("correct");
  if (fVal === "incorrect") return tagVal.startsWith("incorrect");
  return tagVal === fVal;
}

function clipMatchesCategory(tag: CodedTag, filterValue: string): boolean {
  const tagVal = norm(tag.category);
  const fVal = normForMatch(filterValue);
  if (fVal === "") return tagVal === "";           // "Uncoded" filter → empty category
  if (fVal.includes(" — ")) return tagVal === fVal;   // specific: exact match
  return tagVal.startsWith(fVal + " — ") || tagVal === fVal; // group or bare name
}

function clipMatchesPosition(tag: CodedTag, filterValue: string): boolean {
  const tagVal = norm(tag.position);
  const fVal = normForMatch(filterValue);
  if (fVal === "") return tagVal === "";           // "Uncoded" filter → empty position
  return tagVal === fVal;
}

function clipMatchesCoverage(tag: CodedTag, filterValue: string): boolean {
  const tagVal = norm(tag.coverage);
  const fVal = normForMatch(filterValue);
  if (fVal === "") return tagVal === "";           // "Uncoded" filter → empty coverage
  return tagVal === fVal;
}

function clipMatchesFacets(tag: CodedTag, filters: FacetFilters, excludedFacet?: keyof FacetFilters): boolean {
  const outcomeMatches = excludedFacet === "outcome" || filters.outcome === null || clipMatchesOutcome(tag, filters.outcome);
  const categoryMatches = excludedFacet === "category" || filters.category === null || clipMatchesCategory(tag, filters.category);
  const positionMatches = excludedFacet === "position" || filters.position === null || clipMatchesPosition(tag, filters.position);
  const coverageMatches = excludedFacet === "coverage" || filters.coverage === null || clipMatchesCoverage(tag, filters.coverage);
  return outcomeMatches && categoryMatches && positionMatches && coverageMatches;
}

const EMPTY_FACETS: FacetFilters = { outcome: null, category: null, position: null, coverage: null };

export function RefereeReviewScreen({
  review,
  visibleTags,
  mySlot,
  session,
  unreadCounts,
  onRead,
  clearUnread,
  officialSummary,
  initialTagId,
  onHome,
  onAdmin,
  onProfile,
  onLogout,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(() => {
    if (!initialTagId) return 0;
    const idx = visibleTags.findIndex(t => t.id === initialTagId);
    return idx >= 0 ? idx : 0;
  });
  const [seekAutoplay, setSeekAutoplay] = useState(!!initialTagId);
  const [showComments, setShowComments] = useState(false);
  const [facetFilters, setFacetFilters] = useState<FacetFilters>(EMPTY_FACETS);
  const [expandedCategoryGroup, setExpandedCategoryGroup] = useState<string | null>(null);
  // When true the player is bounded to the selected clip's timestamp range instead of playing the full video.
  const [clipViewMode, setClipViewMode] = useState(!!initialTagId);
  // Bumped on every clip selection (even re-selecting the current clip) so ClipRangeVideoPlayer
  // always restarts from the beginning instead of no-opping when the clip id hasn't changed.
  const [selectionNonce, setSelectionNonce] = useState(0);
  const videoBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setShowComments(false); }, [selectedIdx]);
  useEffect(() => { setSelectedIdx(0); setShowComments(false); }, [facetFilters]);

  const hasAnyFilter =
    facetFilters.outcome !== null ||
    facetFilters.category !== null ||
    facetFilters.position !== null ||
    facetFilters.coverage !== null;

  // Analytics always computed from full tag list so summary tiles remain stable
  const analytics = makeAnalytics(visibleTags);

  // Per-section compatible clip pools: each excludes its own facet so it shows
  // what would still match if that facet's filter were removed.
  const outcomeCompatibleClips = useMemo(
    () => visibleTags.filter(t => clipMatchesFacets(t, facetFilters, "outcome")),
    [visibleTags, facetFilters],
  );
  const categoryCompatibleClips = useMemo(
    () => visibleTags.filter(t => clipMatchesFacets(t, facetFilters, "category")),
    [visibleTags, facetFilters],
  );
  const positionCompatibleClips = useMemo(
    () => visibleTags.filter(t => clipMatchesFacets(t, facetFilters, "position")),
    [visibleTags, facetFilters],
  );
  const coverageCompatibleClips = useMemo(
    () => visibleTags.filter(t => clipMatchesFacets(t, facetFilters, "coverage")),
    [visibleTags, facetFilters],
  );

  const outcomeSectionCounts = useMemo(() => countBy(outcomeCompatibleClips, "outcome"), [outcomeCompatibleClips]);
  const positionSectionCounts = useMemo(() => countBy(positionCompatibleClips, "position"), [positionCompatibleClips]);
  const coverageSectionCounts = useMemo(() => countBy(coverageCompatibleClips, "coverage"), [coverageCompatibleClips]);

  // Group "Foul — Push" → "Foul" for category group bars
  const groupedCategoryCounts: [string, number][] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tag of categoryCompatibleClips) {
      const cat = tag.category || "";
      const sep = cat.indexOf(" — ");
      const group = sep !== -1 ? cat.slice(0, sep) : (cat || "Uncoded");
      counts[group] = (counts[group] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [categoryCompatibleClips]);

  // Full sub-counts map: group → [(specificLabel, fullCategoryValue, count)]
  const allCategorySubCounts = useMemo(() => {
    const result: Record<string, [string, string, number][]> = {};
    for (const tag of categoryCompatibleClips) {
      const cat = tag.category || "";
      const sep = cat.indexOf(" — ");
      if (sep !== -1) {
        const group = cat.slice(0, sep);
        const specific = cat.slice(sep + 3);
        if (!result[group]) result[group] = [];
        const existing = result[group].find(([s]) => s === specific);
        if (existing) existing[2]++;
        else result[group].push([specific, cat, 1]);
      }
    }
    for (const entries of Object.values(result)) entries.sort((a, b) => b[2] - a[2]);
    return result;
  }, [categoryCompatibleClips]);

  function isFacetActive(collection: keyof FacetFilters, value: string) {
    return facetFilters[collection] === value;
  }

  function toggleFacet(collection: keyof FacetFilters, value: string) {
    setFacetFilters(prev => ({
      ...prev,
      [collection]: prev[collection] === value ? null : value,
    }));
  }

  function clearFacet(collection: keyof FacetFilters) {
    setFacetFilters(prev => ({ ...prev, [collection]: null }));
  }

  function clearAllFacets() {
    setFacetFilters({ ...EMPTY_FACETS });
  }

  function toggleCategoryExpansion(group: string) {
    setExpandedCategoryGroup(prev => prev === group ? null : group);
  }

  function tagMatchesFacets(tag: CodedTag): boolean {
    return clipMatchesFacets(tag, facetFilters);
  }

  const filteredTags = hasAnyFilter ? visibleTags.filter(tagMatchesFacets) : visibleTags;

  const total = filteredTags.length;
  const selectedTag = total > 0 ? filteredTags[selectedIdx] ?? null : null;

  function selectClip(idx: number) {
    const tag = filteredTags[idx];
    if (!tag) return;
    setSelectedIdx(idx);
    setSeekAutoplay(true);
    setClipViewMode(true);
    // Re-selecting the currently active clip doesn't change selectedIdx, so bump this
    // separately to force the player to restart from the beginning.
    setSelectionNonce(n => n + 1);
    videoBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Stats bars: shows compatible counts; selected zero-count values stay visible and removable
  function bars(counts: [string, number][], collection: keyof FacetFilters) {
    const selectedValue = facetFilters[collection];
    const allEntries: [string, number][] =
      selectedValue !== null && !counts.some(([v]) => v === selectedValue)
        ? [...counts, [selectedValue, 0]]
        : counts;
    const max = Math.max(...allEntries.map(([, c]) => c), 1);
    return allEntries.map(([name, count]) => {
      const isActive = isFacetActive(collection, name);
      return (
        <div
          key={name}
          className={"metric-row clickable" + (isActive ? " analytics-active" : "")}
          role="button"
          tabIndex={0}
          onClick={() => toggleFacet(collection, name)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFacet(collection, name); } }}
          title={isActive ? "Click to clear filter" : `Filter clips: ${name}`}
        >
          <span>{name}</span>
          <div className="mini-bar">
            <div className="mini-bar-fill" style={{ width: count > 0 ? `${Math.round((count / max) * 100)}%` : "0%" }} />
          </div>
          <strong>{count}</strong>
        </div>
      );
    });
  }

  // Build the chips list for the active-filters summary banner
  const activeChips: { collection: keyof FacetFilters; value: string; label: string }[] = [];
  const COLLECTION_LABELS: Record<keyof FacetFilters, string> = { outcome: "Outcome", category: "Category", position: "Position", coverage: "Coverage" };
  for (const collection of Object.keys(facetFilters) as (keyof FacetFilters)[]) {
    const value = facetFilters[collection];
    if (value !== null) {
      const label = `${COLLECTION_LABELS[collection]}: ${value.includes(" — ") ? value.split(" — ")[1] : value}`;
      activeChips.push({ collection, value, label });
    }
  }

  return (
    <main>
      <Header
        session={session}
        onHome={onHome}
        onAdmin={onAdmin}
        onProfile={onProfile}
        onLogout={onLogout}
      />
      <div className="rv-layout">

        {/* ── Main column ── */}
        <div className="rv-main">

          {/* Review context bar */}
          <div className="panel rv-context">
            <div>
              <p className="eyebrow">Referee Evaluation</p>
              <h2 style={{ marginBottom: 4 }}>{review?.game || "Review"}</h2>
              <p className="hint" style={{ margin: 0 }}>
                Educator: {review?.educatorName || "—"} · Status: {review?.status || "—"}
              </p>
            </div>
            <button onClick={onHome}>← All Reviews</button>
          </div>

          {/* Final summary card — only shown when educator has written one */}
          {officialSummary && (officialSummary.positives || officialSummary.workOns || officialSummary.nextFocus) && (
            <div className="panel rv-summary-card">
              <p className="eyebrow" style={{ marginBottom: 6 }}>Your Performance Summary</p>
              {officialSummary.positives && (
                <div className="rv-summary-field">
                  <span className="rv-summary-label">Positives</span>
                  <p className="rv-summary-value">{officialSummary.positives}</p>
                </div>
              )}
              {officialSummary.workOns && (
                <div className="rv-summary-field">
                  <span className="rv-summary-label">Areas to work on</span>
                  <p className="rv-summary-value">{officialSummary.workOns}</p>
                </div>
              )}
              {officialSummary.nextFocus && (
                <div className="rv-summary-field">
                  <span className="rv-summary-label">Focus for next game</span>
                  <p className="rv-summary-value">{officialSummary.nextFocus}</p>
                </div>
              )}
            </div>
          )}

          {/* Video player — always full size; bounded to the selected clip's timestamp range once one is chosen */}
          <div ref={videoBoxRef} className="video-placeholder" style={{ margin: 0, aspectRatio: "16 / 9", overflow: "hidden", padding: 0 }}>
            {clipViewMode && selectedTag ? (() => {
              const { startTime, endTime } = resolveClipPlayback(selectedTag);
              return (
                <ClipRangeVideoPlayer
                  videoLink={review?.videoLink || ""}
                  clipKey={`${selectedTag.id}:${selectionNonce}`}
                  startTime={startTime}
                  endTime={endTime}
                  autoPlay={seekAutoplay}
                />
              );
            })() : (
              <ClipRangeVideoPlayer
                videoLink={review?.videoLink || ""}
                clipKey="full-video"
                startTime={0}
                endTime={null}
                autoPlay={false}
              />
            )}
          </div>

          {/* Clip navigation + selected clip detail */}
          {total > 0 && (
            <>
              <div className="rv-nav">
                <button onClick={() => selectClip(selectedIdx - 1)} disabled={selectedIdx === 0}>
                  ← Previous
                </button>
                <span className="rv-nav-count">Clip {selectedIdx + 1} of {total}</span>
                <button onClick={() => selectClip(selectedIdx + 1)} disabled={selectedIdx === total - 1}>
                  Next →
                </button>
              </div>

              {selectedTag && (
                <div className="rv-detail-panel panel">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <p className="eyebrow" style={{ marginBottom: 2 }}>Clip {selectedIdx + 1}</p>
                      <h3 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900 }}>
                        {selectedTag.adjustedTime}
                      </h3>
                      <p className="hint" style={{ margin: 0 }}>
                        {relationLabel(selectedTag, mySlot)} · {displayName(selectedTag.refereeTarget, review)}
                      </p>
                    </div>
                    {selectedTag.outcome && (
                      <span className={`status ${outcomeClass(selectedTag.outcome)}`}>
                        {selectedTag.outcome}
                      </span>
                    )}
                  </div>

                  <div className="rv-detail-grid">
                    <div className="rv-clip-field">
                      <span className="rv-clip-field-label">Coverage</span>
                      <span className="rv-clip-field-value">{selectedTag.coverage || "—"}</span>
                    </div>
                    <div className="rv-clip-field">
                      <span className="rv-clip-field-label">Position</span>
                      <span className="rv-clip-field-value">{selectedTag.position || "—"}</span>
                    </div>
                    <div className="rv-clip-field">
                      <span className="rv-clip-field-label">Call Category</span>
                      <span className="rv-clip-field-value">{selectedTag.category || "—"}</span>
                    </div>
                  </div>

                  {selectedTag.notes && (
                    <div className="rv-clip-notes" style={{ marginTop: 12 }}>
                      {selectedTag.notes}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {visibleTags.length === 0 && (
            <div className="empty-state">No clips have been tagged for this review yet.</div>
          )}
          {visibleTags.length > 0 && total === 0 && hasAnyFilter && (
            <div className="empty-state">
              No clips match the selected filters.{" "}
              <button style={{ fontSize: 13 }} onClick={clearAllFacets}>Clear filters</button>
            </div>
          )}

          {/* ── Analytics & Filter section ── */}
          {visibleTags.length > 0 && (
            <>
              {/* Performance summary tiles */}
              <div className="analytics-card">
                <h3>Performance Summary</h3>
                <div className="metric-grid" style={{ marginTop: 8 }}>
                  <div className="metric-tile">
                    <div className="number">{analytics.total}</div>
                    <div className="hint">Clips</div>
                  </div>
                  <div className="metric-tile">
                    <div className="number">{analytics.accuracy}</div>
                    <div className="hint">Accuracy</div>
                  </div>
                  <div
                    className={"metric-tile clickable" + (isFacetActive("outcome", "Correct") ? " analytics-active" : "")}
                    role="button"
                    tabIndex={0}
                    title="Filter to correct decisions"
                    onClick={() => toggleFacet("outcome", "Correct")}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFacet("outcome", "Correct"); } }}
                  >
                    <div className="number">{analytics.correctCalls + analytics.correctNoCalls}</div>
                    <div className="hint">Correct ↗</div>
                  </div>
                  <div
                    className={"metric-tile clickable" + (isFacetActive("outcome", "Incorrect") ? " analytics-active" : "")}
                    role="button"
                    tabIndex={0}
                    title="Filter to incorrect decisions"
                    onClick={() => toggleFacet("outcome", "Incorrect")}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFacet("outcome", "Incorrect"); } }}
                  >
                    <div className="number">{analytics.incorrectCalls + analytics.incorrectNoCalls}</div>
                    <div className="hint">Incorrect ↗</div>
                  </div>
                </div>
              </div>

              {/* Selected Filters — compact chip row, only when at least one filter is active */}
              {hasAnyFilter && (
                <div className="selected-filters">
                  <div className="facet-active-chips">
                    {activeChips.map(chip => (
                      <button
                        key={chip.collection + chip.value}
                        className="filter-chip"
                        onClick={() => toggleFacet(chip.collection, chip.value)}
                        title={`Remove: ${chip.label}`}
                      >
                        {chip.label} ×
                      </button>
                    ))}
                    <button className="facet-clear-all" onClick={clearAllFacets}>Clear all ×</button>
                  </div>
                </div>
              )}

              {/* Statistics breakdowns — counts reflect compatible clips only (excluded-facet pattern) */}
              <div className="rv-stats-breakdowns">
                <div className="analytics-card">
                  <h3>Outcome <span className="hint" style={{ fontWeight: 400, fontSize: 11 }}>click to filter</span></h3>
                  {bars(outcomeSectionCounts, "outcome")}
                </div>
                <div className="analytics-card">
                  <h3>Category <span className="hint" style={{ fontWeight: 400, fontSize: 11 }}>click to filter</span></h3>
                  {(() => {
                    // If selected group/specific has count 0 in compatible pool, still show it
                    const selectedCat = facetFilters.category;
                    const selectedGroup = selectedCat
                      ? (selectedCat.includes(" — ") ? selectedCat.split(" — ")[0] : selectedCat)
                      : null;
                    const displayGroups: [string, number][] =
                      selectedGroup && !groupedCategoryCounts.some(([g]) => g === selectedGroup)
                        ? [...groupedCategoryCounts, [selectedGroup, 0]]
                        : groupedCategoryCounts;
                    const maxG = Math.max(...displayGroups.map(([, c]) => c), 1);
                    return displayGroups.map(([group, count]) => {
                      const isGroupActive =
                        facetFilters.category !== null && (
                          facetFilters.category === group ||
                          facetFilters.category.startsWith(group + " — ")
                        );
                      return (
                        <div key={group} className={"metric-row clickable" + (isGroupActive ? " analytics-active" : "")}
                          role="button" tabIndex={0}
                          onClick={() => { toggleFacet("category", group); setExpandedCategoryGroup(group); }}
                          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFacet("category", group); setExpandedCategoryGroup(group); } }}
                          title={isGroupActive && isFacetActive("category", group) ? "Click to clear filter" : `Filter clips: ${group}`}
                        >
                          <span>{group}</span>
                          <div className="mini-bar"><div className="mini-bar-fill" style={{ width: count > 0 ? `${Math.round((count / maxG) * 100)}%` : "0%" }} /></div>
                          <strong>{count}</strong>
                        </div>
                      );
                    });
                  })()}
                  {/* Sub-count drill-down: shown when a category group is expanded */}
                  {expandedCategoryGroup !== null && (() => {
                    const subs = allCategorySubCounts[expandedCategoryGroup] ?? [];
                    // If a specific sub is selected and has count 0, still show it
                    const selectedCat = facetFilters.category;
                    const isSpecificSelected =
                      selectedCat?.includes(" — ") &&
                      selectedCat.startsWith(expandedCategoryGroup + " — ");
                    const allSubs: [string, string, number][] =
                      isSpecificSelected && !subs.some(([, fv]) => fv === selectedCat)
                        ? [...subs, [selectedCat!.split(" — ")[1], selectedCat!, 0]]
                        : subs;
                    if (allSubs.length === 0) return null;
                    const maxS = Math.max(...allSubs.map(([,, c]) => c), 1);
                    return (
                      <>
                        <div style={{ marginTop: 10 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".04em" }}>
                            {expandedCategoryGroup} — specific tags
                          </p>
                        </div>
                        {allSubs.map(([specific, fullVal, count]) => {
                          const isSubActive = isFacetActive("category", fullVal);
                          return (
                            <div key={fullVal} className={"metric-row clickable" + (isSubActive ? " analytics-active" : "")}
                              role="button" tabIndex={0}
                              onClick={() => toggleFacet("category", fullVal)}
                              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFacet("category", fullVal); } }}
                              title={isSubActive ? "Click to clear filter" : `Filter clips: ${fullVal}`}
                            >
                              <span style={{ paddingLeft: 8, fontSize: 13 }}>↳ {specific}</span>
                              <div className="mini-bar"><div className="mini-bar-fill" style={{ width: count > 0 ? `${Math.round((count / maxS) * 100)}%` : "0%" }} /></div>
                              <strong>{count}</strong>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
                <div className="analytics-card">
                  <h3>Position <span className="hint" style={{ fontWeight: 400, fontSize: 11 }}>click to filter</span></h3>
                  {bars(positionSectionCounts, "position")}
                </div>
                <div className="analytics-card">
                  <h3>Coverage <span className="hint" style={{ fontWeight: 400, fontSize: 11 }}>click to filter</span></h3>
                  {bars(coverageSectionCounts, "coverage")}
                </div>
              </div>
            </>
          )}

        </div>

        {/* ── Sidebar: clip list ── */}
        <aside className="rv-sidebar">
          <p className="rv-sidebar-heading">
            Clips ({total}{hasAnyFilter ? ` of ${visibleTags.length}` : ""})
            {hasAnyFilter && <button style={{ fontSize: 11, marginLeft: 6, padding: "1px 6px" }} onClick={clearAllFacets}>✕ clear</button>}
          </p>
          {total === 0 ? (
            <p className="hint">No clips available.</p>
          ) : (
            <div className="rv-clip-list">
              {filteredTags.map((tag, i) => {
                const sel = i === selectedIdx;
                return (
                  <div
                    key={tag.id}
                    className={"rv-clip-card" + (sel ? " rv-selected" : "")}
                    onClick={() => selectClip(i)}
                  >
                    <div className="rv-clip-header">
                      <div className="badge-wrap">
                        <span className="rv-clip-num">#{i + 1}</span>
                        {(unreadCounts?.[`${review?.id}::${tag.id}`] ?? 0) > 0 && (
                          <span className="badge-count">{Math.min(unreadCounts![`${review!.id}::${tag.id}`], 99)}</span>
                        )}
                      </div>
                      <span className="rv-clip-time">{tag.adjustedTime}</span>
                      {tag.outcome && (
                        <span
                          className={`status ${outcomeClass(tag.outcome)}`}
                          style={{ fontSize: 11, padding: "2px 7px" }}
                        >
                          {tag.outcome}
                        </span>
                      )}
                      <span className="hint" style={{ fontSize: 11, marginLeft: "auto" }}>
                        {relationLabel(tag, mySlot)}
                      </span>
                    </div>
                    {tag.category && (
                      <p className="hint" style={{ margin: "4px 0 0", fontSize: 12 }}>
                        {tag.category}
                      </p>
                    )}
                    {sel && (
                      <div className="rv-clip-expand">
                        {tag.coverage && (
                          <div className="rv-clip-field">
                            <span className="rv-clip-field-label">Coverage</span>
                            <span className="rv-clip-field-value">{tag.coverage}</span>
                          </div>
                        )}
                        {tag.position && (
                          <div className="rv-clip-field">
                            <span className="rv-clip-field-label">Position</span>
                            <span className="rv-clip-field-value">{tag.position}</span>
                          </div>
                        )}
                        <div className="rv-clip-field">
                          <span className="rv-clip-field-label">Applies to</span>
                          <span className="rv-clip-field-value">{displayName(tag.refereeTarget, review)}</span>
                        </div>
                        {tag.notes && (
                          <div className="rv-clip-notes" style={{ gridColumn: "1/-1" }}>
                            {tag.notes}
                          </div>
                        )}
                        <div style={{ gridColumn: "1/-1", marginTop: 4 }}>
                          <div className="badge-wrap" style={{ display: "inline-flex" }}>
                            <button
                              className="clip-action-btn"
                              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                              onClick={e => {
                                e.stopPropagation();
                                const willOpen = !showComments;
                                setShowComments(v => !v);
                                if (willOpen && review?.id) clearUnread?.(review.id, tag.id);
                              }}
                            >
                              <MessageSquare size={11} />
                              {showComments ? "Hide comments" : "View comments"}
                            </button>
                            {(unreadCounts?.[`${review?.id}::${tag.id}`] ?? 0) > 0 && (
                              <span className="badge-count">
                                {Math.min(unreadCounts![`${review!.id}::${tag.id}`], 99)}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Comments panel inside the expanded clip card — no scroll hunting. Its own
                            click handler stops propagation so typing/replying doesn't reselect the clip. */}
                        {showComments && review?.id && (
                          <div style={{ gridColumn: "1/-1", marginTop: 8 }} onClick={e => e.stopPropagation()}>
                            <ReviewComments
                              reviewId={review.id}
                              tagId={tag.id}
                              session={session}
                              onRead={onRead}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </aside>
      </div>
    </main>
  );
}
