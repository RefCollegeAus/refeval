"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { ReviewComments } from "@/components/ReviewComments";
import { makeAnalytics } from "@/lib/utils/analytics";
import { embedUrl, isDirectVideoUrl } from "@/lib/utils/video";
import { MessageSquare } from "lucide-react";
import type { ReviewRecord, CodedTag, RefSlot, OfficialSummary } from "@/lib/types/reviews";
import type { RefEvalSession } from "@/lib/types/auth";

import type { UnreadCounts } from "@/lib/hooks/useUnreadCounts";

type Props = {
  review: ReviewRecord | undefined;
  visibleTags: CodedTag[];
  mySlot: RefSlot | null;
  session: RefEvalSession | null;
  unreadCounts?: UnreadCounts;
  onRead?: () => void;
  officialSummary?: OfficialSummary | null;
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

export function RefereeReviewScreen({
  review,
  visibleTags,
  mySlot,
  session,
  unreadCounts,
  onRead,
  officialSummary,
  onHome,
  onAdmin,
  onProfile,
  onLogout,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [seekSeconds, setSeekSeconds] = useState(0);
  const [seekAutoplay, setSeekAutoplay] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Analytics filter: clicking a breakdown row filters the visible clip list
  type AnalyticsFilter = { field: string; value: string; label: string };
  const [analyticsFilter, setAnalyticsFilter] = useState<AnalyticsFilter | null>(null);
  const [videoError, setVideoError] = useState(false);

  // Reset comments when clip changes or filter changes
  useEffect(() => { setShowComments(false); }, [selectedIdx]);
  useEffect(() => { setSelectedIdx(0); setShowComments(false); }, [analyticsFilter]);

  // Analytics always computed from full tag list so all breakdown options remain visible
  const analytics = makeAnalytics(visibleTags);

  // Group "Foul — Push" → "Foul" for referee-facing category display
  const groupedCategoryCounts: [string, number][] = (() => {
    const counts: Record<string, number> = {};
    for (const tag of visibleTags) {
      const cat = tag.category || "";
      const sep = cat.indexOf(" — ");
      const group = sep !== -1 ? cat.slice(0, sep) : (cat || "Uncoded");
      counts[group] = (counts[group] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  })();

  // Derive the active category group for sub-filter (works for both category-group and category-specific filters)
  const activeGroupForSub: string | null =
    analyticsFilter?.field === "category-group" ? analyticsFilter.value :
    analyticsFilter?.field === "category-specific" ? analyticsFilter.value.split(" — ")[0] : null;

  // Specific tags present in visibleTags for the active group — drives the drill-down row
  const categorySubCounts: [string, string, number][] = (() => {
    if (!activeGroupForSub) return [];
    const counts: Record<string, number> = {};
    for (const tag of visibleTags) {
      const cat = tag.category || "";
      if (cat.startsWith(activeGroupForSub + " — ")) {
        const specific = cat.slice(activeGroupForSub.length + 3);
        if (specific) counts[specific] = (counts[specific] || 0) + 1;
      }
    }
    // [label, fullCategoryValue, count]
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s, c]) => [s, `${activeGroupForSub} — ${s}`, c]);
  })();

  // Clip list filtered by active analytics selection
  const filteredTags = analyticsFilter
    ? visibleTags.filter(tag => {
        const { field, value } = analyticsFilter;
        if (field === "outcome-group") return (tag.outcome || "").startsWith(value);
        if (field === "outcome") return tag.outcome === value;
        if (field === "category") return tag.category === value;
        if (field === "category-group") return (tag.category || "").startsWith(value + " — ");
        if (field === "category-specific") return tag.category === value;
        if (field === "position") return tag.position === value;
        if (field === "coverage") return tag.coverage === value;
        return true;
      })
    : visibleTags;

  const total = filteredTags.length;
  const selectedTag = total > 0 ? filteredTags[selectedIdx] ?? null : null;

  const currentEmbed = review?.videoLink
    ? embedUrl(review.videoLink, seekSeconds, seekAutoplay)
    : "";
  const isIframe = currentEmbed.includes("youtube.com/embed");
  const isDirectVideo = review?.videoLink ? isDirectVideoUrl(review.videoLink) : false;

  function selectClip(idx: number) {
    const tag = filteredTags[idx];
    if (!tag) return;
    setSelectedIdx(idx);
    setSeekSeconds(tag.adjustedSeconds);
    setSeekAutoplay(true);
    setVideoError(false);
  }

  function toggleFilter(field: string, value: string, label: string) {
    setAnalyticsFilter(f => f?.field === field && f.value === value ? null : { field, value, label });
  }

  function bars(counts: [string, number][], field: string) {
    const max = Math.max(...counts.map(([, c]) => c), 1);
    return counts.map(([name, count]) => {
      const isActive = analyticsFilter?.field === field && analyticsFilter.value === name;
      return (
        <div
          key={name}
          className={"metric-row clickable" + (isActive ? " analytics-active" : "")}
          role="button"
          tabIndex={0}
          onClick={() => toggleFilter(field, name, name)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFilter(field, name, name); } }}
          title={isActive ? "Click to clear filter" : `Filter clips: ${name}`}
        >
          <span>{name}</span>
          <div className="mini-bar">
            <div className="mini-bar-fill" style={{ width: `${Math.round((count / max) * 100)}%` }} />
          </div>
          <strong>{count}</strong>
        </div>
      );
    });
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

          {/* Video player */}
          <div className="video-placeholder" style={{ margin: 0, aspectRatio: "16 / 9", overflow: "hidden", padding: 0 }}>
            {currentEmbed ? (
              isIframe ? (
                <iframe
                  className="video-frame"
                  src={currentEmbed}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : isDirectVideo ? (
                videoError ? (
                  <div style={{ padding: 16, color: "var(--muted)", fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                    <span>Video could not be loaded.</span>
                    <a href={review!.videoLink} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>Open source video ↗</a>
                  </div>
                ) : (
                  <video
                    key={seekSeconds}
                    controls
                    src={review!.videoLink + `#t=${Math.floor(seekSeconds)}`}
                    className="video-frame"
                    onError={() => setVideoError(true)}
                  />
                )
              ) : (
                <p className="hint" style={{ padding: 4 }}>
                  This video link cannot be embedded. Ask your educator to attach a YouTube or direct video link.
                </p>
              )
            ) : (
              <p className="hint" style={{ padding: 4 }}>
                No video attached to this review.
              </p>
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
          {visibleTags.length > 0 && total === 0 && analyticsFilter && (
            <div className="empty-state">No clips match this filter. <button style={{ fontSize: 13 }} onClick={() => setAnalyticsFilter(null)}>Clear</button></div>
          )}

          {/* Performance summary */}
          {visibleTags.length > 0 && (
            <>
              {analyticsFilter ? (
                <div className="analytics-filter-banner">
                  <span>Showing: <strong>{analyticsFilter.label}</strong> · {total} of {visibleTags.length} clips</span>
                  <button style={{ marginLeft: "auto", fontSize: 12, padding: "2px 8px" }} onClick={() => setAnalyticsFilter(null)}>
                    Clear filter ×
                  </button>
                </div>
              ) : (
                <p className="hint" style={{ fontSize: 12, margin: 0 }}>
                  💡 Click any statistic or bar below to filter clips.
                </p>
              )}
              <div className="analytics-card">
                <h3>Performance Summary {analyticsFilter ? <span className="hint" style={{ fontWeight: 400, fontSize: 12 }}>(full review)</span> : null}</h3>
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
                    className={"metric-tile clickable" + (analyticsFilter?.field === "outcome-group" && analyticsFilter.value === "Correct" ? " analytics-active" : "")}
                    role="button"
                    tabIndex={0}
                    title="Filter to correct decisions"
                    onClick={() => toggleFilter("outcome-group", "Correct", "Correct decisions")}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFilter("outcome-group", "Correct", "Correct decisions"); } }}
                  >
                    <div className="number">{analytics.correctCalls + analytics.correctNoCalls}</div>
                    <div className="hint">Correct ↗</div>
                  </div>
                  <div
                    className={"metric-tile clickable" + (analyticsFilter?.field === "outcome-group" && analyticsFilter.value === "Incorrect" ? " analytics-active" : "")}
                    role="button"
                    tabIndex={0}
                    title="Filter to incorrect decisions"
                    onClick={() => toggleFilter("outcome-group", "Incorrect", "Incorrect decisions")}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFilter("outcome-group", "Incorrect", "Incorrect decisions"); } }}
                  >
                    <div className="number">{analytics.incorrectCalls + analytics.incorrectNoCalls}</div>
                    <div className="hint">Incorrect ↗</div>
                  </div>
                </div>
              </div>
              <div className="rv-stats-breakdowns">
                <div className="analytics-card"><h3>Outcome <span className="hint" style={{ fontWeight: 400, fontSize: 11 }}>click to filter</span></h3>{bars(analytics.outcomeCounts, "outcome")}</div>
                <div className="analytics-card">
                  <h3>Category <span className="hint" style={{ fontWeight: 400, fontSize: 11 }}>click to filter</span></h3>
                  {(() => {
                    const maxG = Math.max(...groupedCategoryCounts.map(([, c]) => c), 1);
                    return groupedCategoryCounts.map(([group, count]) => {
                      const isGroupActive =
                        (analyticsFilter?.field === "category-group" && analyticsFilter.value === group) ||
                        (analyticsFilter?.field === "category-specific" && analyticsFilter.value.startsWith(group + " — "));
                      return (
                        <div key={group} className={"metric-row clickable" + (isGroupActive ? " analytics-active" : "")}
                          role="button" tabIndex={0}
                          onClick={() => toggleFilter("category-group", group, `${group} clips`)}
                          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFilter("category-group", group, `${group} clips`); } }}
                          title={isGroupActive && analyticsFilter?.field === "category-group" ? "Click to clear filter" : `Filter clips: ${group}`}
                        >
                          <span>{group}</span>
                          <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${Math.round((count / maxG) * 100)}%` }} /></div>
                          <strong>{count}</strong>
                        </div>
                      );
                    });
                  })()}
                  {categorySubCounts.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".04em" }}>
                        {activeGroupForSub} — specific tags
                      </p>
                      {(() => {
                        const maxS = Math.max(...categorySubCounts.map(([,, c]) => c), 1);
                        return categorySubCounts.map(([specific, fullVal, count]) => {
                          const isSubActive = analyticsFilter?.field === "category-specific" && analyticsFilter.value === fullVal;
                          return (
                            <div key={fullVal} className={"metric-row clickable" + (isSubActive ? " analytics-active" : "")}
                              role="button" tabIndex={0}
                              onClick={() => toggleFilter("category-specific", fullVal, `${activeGroupForSub} → ${specific}`)}
                              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFilter("category-specific", fullVal, `${activeGroupForSub} → ${specific}`); } }}
                              title={isSubActive ? "Click to clear filter" : `Filter clips: ${fullVal}`}
                            >
                              <span style={{ paddingLeft: 8, fontSize: 13 }}>↳ {specific}</span>
                              <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${Math.round((count / maxS) * 100)}%` }} /></div>
                              <strong>{count}</strong>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
                <div className="analytics-card"><h3>Position <span className="hint" style={{ fontWeight: 400, fontSize: 11 }}>click to filter</span></h3>{bars(analytics.positionCounts, "position")}</div>
                <div className="analytics-card"><h3>Coverage <span className="hint" style={{ fontWeight: 400, fontSize: 11 }}>click to filter</span></h3>{bars(analytics.coverageCounts, "coverage")}</div>
              </div>
            </>
          )}

        </div>

        {/* ── Sidebar: clip list ── */}
        <aside className="rv-sidebar">
          <p className="rv-sidebar-heading">
            Clips ({total}{analyticsFilter ? ` of ${visibleTags.length}` : ""})
            {analyticsFilter && <button style={{ fontSize: 11, marginLeft: 6, padding: "1px 6px" }} onClick={() => setAnalyticsFilter(null)}>✕ clear</button>}
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
                      /* stopPropagation prevents the card's onClick from seeking the video when clicking expand content */
                      <div className="rv-clip-expand" onClick={e => e.stopPropagation()}>
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
                              onClick={() => setShowComments(v => !v)}
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
                        {/* Comments panel inside the expanded clip card — no scroll hunting */}
                        {showComments && review?.id && (
                          <div style={{ gridColumn: "1/-1", marginTop: 8 }}>
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
