"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ReviewComments } from "@/components/ReviewComments";
import { makeAnalytics, countBy } from "@/lib/utils/analytics";
import { MessageSquare } from "lucide-react";
import type { ReviewRecord, CodedTag, RefSlot, OfficialSummary } from "@/lib/types/reviews";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { OrgPage } from "@/components/organisation/OrganisationScreen";
import type { NavContext } from "@/components/shell/nav";
import { ClipRangeVideoPlayer } from "@/components/common/ClipRangeVideoPlayer";
import { resolveClipPlayback } from "@/lib/utils/clipBounds";
import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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
  navContext?: NavContext;
  onNavigate?: (screen: Screen, orgPage?: OrgPage) => void;
  orgLogoUrl?: string | null;
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

function outcomeTone(outcome?: string | null): "good" | "danger" | "warn" | "neutral" {
  if (!outcome) return "neutral";
  const o = outcome.toLowerCase();
  if (o.startsWith("correct")) return "good";
  if (o.startsWith("incorrect")) return "danger";
  return "warn";
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
  navContext,
  onNavigate,
  orgLogoUrl,
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
        <button
          key={name}
          type="button"
          onClick={() => toggleFacet(collection, name)}
          title={isActive ? "Click to clear filter" : `Filter clips: ${name}`}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition-colors",
            isActive ? "border-accent/40 bg-accent/10 text-accent" : "border-transparent text-text hover:bg-panel-2"
          )}
        >
          <span className="flex-1 truncate">{name}</span>
          <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-panel-3">
            <div className="h-full rounded-full bg-accent" style={{ width: count > 0 ? `${Math.round((count / max) * 100)}%` : "0%" }} />
          </div>
          <strong className="w-5 shrink-0 text-right">{count}</strong>
        </button>
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
    <AppShell
      session={session}
      onHome={onHome}
      onAdmin={onAdmin}
      onProfile={onProfile}
      onLogout={onLogout}
      navContext={navContext}
      onNavigate={onNavigate}
      orgLogoUrl={orgLogoUrl}
    >
      <div className="rv-layout p-0">

        {/* ── Main column ── */}
        <div className="rv-main grid gap-4">

          {/* Review context bar */}
          <Card className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">Referee Evaluation</p>
              <h2 className="text-lg font-bold text-text">{review?.game || "Review"}</h2>
              <p className="mt-1 text-sm text-muted">
                Educator: {review?.educatorName || "—"} · Status: {review?.status || "—"}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={onHome}>← All Reviews</Button>
          </Card>

          {/* Final summary card — only shown when educator has written one */}
          {officialSummary && (officialSummary.positives || officialSummary.workOns || officialSummary.nextFocus) && (
            <Card className="grid gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-accent">Your Performance Summary</p>
              {officialSummary.positives && (
                <div>
                  <span className="text-xs font-semibold text-muted">Positives</span>
                  <p className="mt-0.5 text-sm text-text">{officialSummary.positives}</p>
                </div>
              )}
              {officialSummary.workOns && (
                <div>
                  <span className="text-xs font-semibold text-muted">Areas to work on</span>
                  <p className="mt-0.5 text-sm text-text">{officialSummary.workOns}</p>
                </div>
              )}
              {officialSummary.nextFocus && (
                <div>
                  <span className="text-xs font-semibold text-muted">Focus for next game</span>
                  <p className="mt-0.5 text-sm text-text">{officialSummary.nextFocus}</p>
                </div>
              )}
            </Card>
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
              <div className="flex items-center justify-between gap-3">
                <Button variant="secondary" size="sm" onClick={() => selectClip(selectedIdx - 1)} disabled={selectedIdx === 0}>
                  ← Previous
                </Button>
                <span className="text-sm font-semibold text-muted">Clip {selectedIdx + 1} of {total}</span>
                <Button variant="secondary" size="sm" onClick={() => selectClip(selectedIdx + 1)} disabled={selectedIdx === total - 1}>
                  Next →
                </Button>
              </div>

              {selectedTag && (
                <Card className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-accent">Clip {selectedIdx + 1}</p>
                      <h3 className="text-xl font-extrabold text-text">{selectedTag.adjustedTime}</h3>
                      <p className="mt-0.5 text-sm text-muted">
                        {relationLabel(selectedTag, mySlot)} · {displayName(selectedTag.refereeTarget, review)}
                      </p>
                    </div>
                    {selectedTag.outcome && <Badge tone={outcomeTone(selectedTag.outcome)}>{selectedTag.outcome}</Badge>}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="block text-xs text-muted">Coverage</span>
                      <span className="text-sm font-semibold text-text">{selectedTag.coverage || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted">Position</span>
                      <span className="text-sm font-semibold text-text">{selectedTag.position || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted">Call Category</span>
                      <span className="text-sm font-semibold text-text">{selectedTag.category || "—"}</span>
                    </div>
                  </div>

                  {selectedTag.notes && (
                    <div className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text">
                      {selectedTag.notes}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}

          {visibleTags.length === 0 && (
            <Card className="py-8 text-center text-sm text-muted">No clips have been tagged for this review yet.</Card>
          )}
          {visibleTags.length > 0 && total === 0 && hasAnyFilter && (
            <Card className="flex flex-wrap items-center justify-center gap-2 py-8 text-center text-sm text-muted">
              No clips match the selected filters.
              <Button variant="secondary" size="sm" onClick={clearAllFacets}>Clear filters</Button>
            </Card>
          )}

          {/* ── Analytics & Filter section ── */}
          {visibleTags.length > 0 && (
            <>
              {/* Performance summary tiles */}
              <Card>
                <h3 className="mb-3 text-sm font-bold text-text">Performance Summary</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-border bg-panel-2 p-3 text-center">
                    <div className="text-xl font-extrabold text-text">{analytics.total}</div>
                    <div className="text-xs text-muted">Clips</div>
                  </div>
                  <div className="rounded-lg border border-border bg-panel-2 p-3 text-center">
                    <div className="text-xl font-extrabold text-text">{analytics.accuracy}</div>
                    <div className="text-xs text-muted">Accuracy</div>
                  </div>
                  <button
                    type="button"
                    title="Filter to correct decisions"
                    onClick={() => toggleFacet("outcome", "Correct")}
                    className={cn(
                      "rounded-lg border p-3 text-center transition-colors",
                      isFacetActive("outcome", "Correct") ? "border-good/40 bg-good/10" : "border-border bg-panel-2 hover:bg-panel-3"
                    )}
                  >
                    <div className="text-xl font-extrabold text-good">{analytics.correctCalls + analytics.correctNoCalls}</div>
                    <div className="text-xs text-muted">Correct ↗</div>
                  </button>
                  <button
                    type="button"
                    title="Filter to incorrect decisions"
                    onClick={() => toggleFacet("outcome", "Incorrect")}
                    className={cn(
                      "rounded-lg border p-3 text-center transition-colors",
                      isFacetActive("outcome", "Incorrect") ? "border-danger/40 bg-danger/10" : "border-border bg-panel-2 hover:bg-panel-3"
                    )}
                  >
                    <div className="text-xl font-extrabold text-red-300">{analytics.incorrectCalls + analytics.incorrectNoCalls}</div>
                    <div className="text-xs text-muted">Incorrect ↗</div>
                  </button>
                </div>
              </Card>

              {/* Selected Filters — compact chip row, only when at least one filter is active */}
              {hasAnyFilter && (
                <div className="flex flex-wrap items-center gap-2">
                  {activeChips.map(chip => (
                    <button
                      key={chip.collection + chip.value}
                      onClick={() => toggleFacet(chip.collection, chip.value)}
                      title={`Remove: ${chip.label}`}
                      className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent"
                    >
                      {chip.label} ×
                    </button>
                  ))}
                  <button onClick={clearAllFacets} className="text-xs font-semibold text-muted hover:text-text">Clear all ×</button>
                </div>
              )}

              {/* Statistics breakdowns — counts reflect compatible clips only (excluded-facet pattern) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <h3 className="mb-2 flex items-baseline gap-2 text-sm font-bold text-text">
                    Outcome <span className="text-xs font-normal text-muted">click to filter</span>
                  </h3>
                  <div className="grid gap-1">{bars(outcomeSectionCounts, "outcome")}</div>
                </Card>
                <Card>
                  <h3 className="mb-2 flex items-baseline gap-2 text-sm font-bold text-text">
                    Category <span className="text-xs font-normal text-muted">click to filter</span>
                  </h3>
                  <div className="grid gap-1">
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
                          <button
                            key={group}
                            type="button"
                            onClick={() => { toggleFacet("category", group); toggleCategoryExpansion(group); }}
                            title={isGroupActive && isFacetActive("category", group) ? "Click to clear filter" : `Filter clips: ${group}`}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition-colors",
                              isGroupActive ? "border-accent/40 bg-accent/10 text-accent" : "border-transparent text-text hover:bg-panel-2"
                            )}
                          >
                            <span className="flex-1 truncate">{group}</span>
                            <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-panel-3">
                              <div className="h-full rounded-full bg-accent" style={{ width: count > 0 ? `${Math.round((count / maxG) * 100)}%` : "0%" }} />
                            </div>
                            <strong className="w-5 shrink-0 text-right">{count}</strong>
                          </button>
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
                          <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                            {expandedCategoryGroup} — specific tags
                          </p>
                          {allSubs.map(([specific, fullVal, count]) => {
                            const isSubActive = isFacetActive("category", fullVal);
                            return (
                              <button
                                key={fullVal}
                                type="button"
                                onClick={() => toggleFacet("category", fullVal)}
                                title={isSubActive ? "Click to clear filter" : `Filter clips: ${fullVal}`}
                                className={cn(
                                  "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 pl-4 text-left text-[13px] transition-colors",
                                  isSubActive ? "border-accent/40 bg-accent/10 text-accent" : "border-transparent text-text hover:bg-panel-2"
                                )}
                              >
                                <span className="flex-1 truncate">↳ {specific}</span>
                                <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-panel-3">
                                  <div className="h-full rounded-full bg-accent" style={{ width: count > 0 ? `${Math.round((count / maxS) * 100)}%` : "0%" }} />
                                </div>
                                <strong className="w-5 shrink-0 text-right">{count}</strong>
                              </button>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </Card>
                <Card>
                  <h3 className="mb-2 flex items-baseline gap-2 text-sm font-bold text-text">
                    Position <span className="text-xs font-normal text-muted">click to filter</span>
                  </h3>
                  <div className="grid gap-1">{bars(positionSectionCounts, "position")}</div>
                </Card>
                <Card>
                  <h3 className="mb-2 flex items-baseline gap-2 text-sm font-bold text-text">
                    Coverage <span className="text-xs font-normal text-muted">click to filter</span>
                  </h3>
                  <div className="grid gap-1">{bars(coverageSectionCounts, "coverage")}</div>
                </Card>
              </div>
            </>
          )}

        </div>

        {/* ── Sidebar: clip list ── */}
        <aside className="rv-sidebar grid content-start gap-3">
          <p className="flex items-center gap-2 text-sm font-bold text-text">
            Clips ({total}{hasAnyFilter ? ` of ${visibleTags.length}` : ""})
            {hasAnyFilter && <button className="text-xs font-semibold text-accent" onClick={clearAllFacets}>✕ clear</button>}
          </p>
          {total === 0 ? (
            <p className="text-sm text-muted">No clips available.</p>
          ) : (
            <div className="grid gap-2">
              {filteredTags.map((tag, i) => {
                const sel = i === selectedIdx;
                const unread = unreadCounts?.[`${review?.id}::${tag.id}`] ?? 0;
                return (
                  <div
                    key={tag.id}
                    onClick={() => selectClip(i)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-3 transition-colors",
                      sel ? "border-accent/50 bg-accent/[.07]" : "border-border bg-panel hover:bg-panel-2"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative inline-flex">
                        <span className="text-xs font-bold text-muted">#{i + 1}</span>
                        {unread > 0 && (
                          <span className="absolute -right-2 -top-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white">
                            {Math.min(unread, 99)}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-text">{tag.adjustedTime}</span>
                      {tag.outcome && <Badge tone={outcomeTone(tag.outcome)} className="text-[10px]">{tag.outcome}</Badge>}
                      <span className="ml-auto text-[11px] text-muted">{relationLabel(tag, mySlot)}</span>
                    </div>
                    {tag.category && <p className="mt-1 text-xs text-muted">{tag.category}</p>}
                    {sel && (
                      <div className="mt-2 grid gap-1.5 border-t border-border pt-2">
                        {tag.coverage && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted">Coverage</span>
                            <span className="font-semibold text-text">{tag.coverage}</span>
                          </div>
                        )}
                        {tag.position && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted">Position</span>
                            <span className="font-semibold text-text">{tag.position}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-muted">Applies to</span>
                          <span className="font-semibold text-text">{displayName(tag.refereeTarget, review)}</span>
                        </div>
                        {tag.notes && (
                          <div className="rounded-lg border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-text">
                            {tag.notes}
                          </div>
                        )}
                        <div className="relative inline-flex w-fit">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-text hover:bg-panel-3"
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
                          {unread > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white">
                              {Math.min(unread, 99)}
                            </span>
                          )}
                        </div>
                        {/* Comments panel inside the expanded clip card — no scroll hunting. Its own
                            click handler stops propagation so typing/replying doesn't reselect the clip. */}
                        {showComments && review?.id && (
                          <div onClick={e => e.stopPropagation()}>
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
    </AppShell>
  );
}
