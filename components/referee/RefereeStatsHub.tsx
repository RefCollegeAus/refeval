"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { makeAnalytics, percent } from "@/lib/utils/analytics";
import { embedUrl, isDirectVideoUrl } from "@/lib/utils/video";
import type { ReviewRecord, CodedTag, RefSlot } from "@/lib/types/reviews";
import type { RefEvalSession } from "@/lib/types/auth";

type Props = {
  reviews: ReviewRecord[];
  tags: CodedTag[];
  session: RefEvalSession | null;
  onBack: () => void;
  onAdmin: () => void;
  onProfile: () => void;
  onLogout: () => void;
};

type StatsTag = CodedTag & {
  reviewGame: string;
  reviewGameDate: string;
  reviewVideoLink: string;
  reviewEducatorName: string;
};

type AnalyticsFilter = { field: string; value: string; label: string };
type DateRange = "all" | "30" | "90";

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
export function RefereeStatsHub({ reviews, tags, session, onBack, onAdmin, onProfile, onLogout }: Props) {
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [analyticsFilter, setAnalyticsFilter] = useState<AnalyticsFilter | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [seekSeconds, setSeekSeconds] = useState(0);
  const [videoError, setVideoError] = useState(false);

  const userId = session?.user.id || "";

  const myReviews = useMemo(() =>
    reviews.filter(r => r.status === "Completed" && [r.referee1Id, r.referee2Id, r.referee3Id].includes(userId)),
    [reviews, userId]
  );

  const dateCutoff = useMemo((): string | null => {
    if (dateRange === "30") return new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    if (dateRange === "90") return new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
    return null;
  }, [dateRange]);

  const dateFilteredReviews = useMemo(() => {
    if (!dateCutoff && !customFrom) return myReviews;
    return myReviews.filter(r => {
      const d = r.gameDate || r.createdAt.slice(0, 10);
      if (customFrom && d < customFrom) return false;
      if (customTo && d > customTo) return false;
      if (dateCutoff && d < dateCutoff) return false;
      return true;
    });
  }, [myReviews, dateCutoff, customFrom, customTo]);

  const allMyTags = useMemo((): StatsTag[] =>
    dateFilteredReviews.flatMap(review => {
      const slot = slotForUser(userId, review);
      return tags.filter(t => t.reviewId === review.id && tagAppliesToSlot(t, slot))
        .map(t => ({ ...t, reviewGame: review.game, reviewGameDate: review.gameDate || "", reviewVideoLink: review.videoLink, reviewEducatorName: review.educatorName }));
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

  const analytics = useMemo(() => makeAnalytics(allMyTags), [allMyTags]);

  const groupedCategoryCounts = useMemo((): [string, number][] => {
    const counts: Record<string, number> = {};
    for (const t of allMyTags) {
      const cat = t.category || "";
      const sep = cat.indexOf(" — ");
      const group = sep !== -1 ? cat.slice(0, sep) : (cat || "Uncoded");
      counts[group] = (counts[group] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allMyTags]);

  const activeGroupForSub: string | null =
    analyticsFilter?.field === "category-group" ? analyticsFilter.value :
    analyticsFilter?.field === "category-specific" ? analyticsFilter.value.split(" — ")[0] : null;

  const categorySubCounts = useMemo((): [string, string, number][] => {
    if (!activeGroupForSub) return [];
    const counts: Record<string, number> = {};
    for (const t of allMyTags) {
      const cat = t.category || "";
      if (cat.startsWith(activeGroupForSub + " — ")) {
        const s = cat.slice(activeGroupForSub.length + 3);
        if (s) counts[s] = (counts[s] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s, c]) => [s, `${activeGroupForSub} — ${s}`, c]);
  }, [activeGroupForSub, allMyTags]);

  const filteredTags = useMemo((): StatsTag[] => {
    if (!analyticsFilter) return allMyTags;
    const { field, value } = analyticsFilter;
    return allMyTags.filter(t => {
      if (field === "outcome-group") return (t.outcome || "").startsWith(value);
      if (field === "outcome") return t.outcome === value;
      if (field === "category-group") return (t.category || "").startsWith(value + " — ");
      if (field === "category-specific") return t.category === value;
      if (field === "position") return t.position === value;
      if (field === "coverage") return t.coverage === value;
      return true;
    });
  }, [analyticsFilter, allMyTags]);

  const selectedClip = filteredTags.find(t => t.id === selectedClipId) ?? allMyTags.find(t => t.id === selectedClipId) ?? null;

  function selectClip(tag: StatsTag) { setSelectedClipId(tag.id); setSeekSeconds(tag.adjustedSeconds); setVideoError(false); }
  function toggleFilter(field: string, value: string, label: string) {
    setAnalyticsFilter(f => f?.field === field && f.value === value ? null : { field, value, label });
    setSelectedClipId(null);
  }

  function clickableBars(counts: [string, number][], field: string) {
    const max = Math.max(...counts.map(([, c]) => c), 1);
    return counts.map(([name, count]) => {
      const isActive = analyticsFilter?.field === field && analyticsFilter.value === name;
      return (
        <div key={name} className={"metric-row clickable" + (isActive ? " analytics-active" : "")}
          role="button" tabIndex={0}
          onClick={() => toggleFilter(field, name, name)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFilter(field, name, name); } }}
          title={isActive ? "Clear filter" : `Filter: ${name}`}
        >
          <span>{name}</span>
          <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${Math.round((count / max) * 100)}%` }} /></div>
          <strong>{count}</strong>
        </div>
      );
    });
  }

  const denom = analytics.correctCalls + analytics.correctNoCalls + analytics.incorrectCalls + analytics.incorrectNoCalls;
  const accuracyPct = denom ? Math.round(((analytics.correctCalls + analytics.correctNoCalls) / denom) * 100) : null;

  const outcomeSlices: DonutSlice[] = [
    { label: "Correct", count: analytics.correctCalls + analytics.correctNoCalls, color: "#22c55e", field: "outcome-group", value: "Correct" },
    { label: "Incorrect", count: analytics.incorrectCalls + analytics.incorrectNoCalls, color: "#ef4444", field: "outcome-group", value: "Incorrect" },
    { label: "Review", count: analytics.reviews, color: "#f59e0b", field: "outcome", value: "Review" },
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
    <main style={{ overflow: "hidden" }}>
      <Header session={session} onHome={onBack} onAdmin={onAdmin} onProfile={onProfile} onLogout={onLogout} />

      {/* ── Top bar: title + date filters + compact summary ── */}
      <div className="sh-topbar panel">
        <div>
          <p className="eyebrow">Referee Portal</p>
          <h1 style={{ margin: "2px 0 0", fontSize: 20 }}>My Stats Hub</h1>
        </div>
        <div className="sh-datefilter">
          <button onClick={onBack} style={{ fontSize: 12, padding: "5px 12px" }}>← Back</button>
          {(["all", "30", "90"] as DateRange[]).map(r => (
            <button key={r} className={"date-preset-btn" + (dateRange === r && !customFrom ? " active" : "")}
              onClick={() => { setDateRange(r); setCustomFrom(""); setCustomTo(""); setAnalyticsFilter(null); }}>
              {r === "all" ? "All time" : `Last ${r}d`}
            </button>
          ))}
          <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setDateRange("all"); }}
            style={{ fontSize: 12, padding: "4px 6px" }} title="From date" />
          <span className="hint" style={{ fontSize: 12 }}>–</span>
          <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setDateRange("all"); }}
            style={{ fontSize: 12, padding: "4px 6px" }} title="To date" />
        </div>
      </div>

      {/* ── Compact stats + filter strip ── */}
      {allMyTags.length > 0 && (
        <div className="sh-stats-strip">
          {/* Summary tiles */}
          <div className="sh-stat-tile">
            <span className="sh-stat-num">{dateFilteredReviews.length}</span>
            <span className="sh-stat-lbl">Reviews</span>
          </div>
          <div className="sh-stat-tile">
            <span className="sh-stat-num">{allMyTags.length}</span>
            <span className="sh-stat-lbl">Clips</span>
          </div>
          {accuracyPct !== null && (
            <div className="sh-stat-tile">
              <span className="sh-stat-num">{accuracyPct}%</span>
              <span className="sh-stat-lbl">Accuracy</span>
            </div>
          )}
          <div className="sh-stats-divider" />
          {/* Outcome filter chips */}
          {outcomeSlices.filter(s => s.count > 0).map(s => {
            const isActive = analyticsFilter?.field === s.field && analyticsFilter.value === s.value;
            return (
              <button key={s.label} className={"sh-filter-chip" + (isActive ? " sh-filter-chip--active" : "")}
                style={{ "--chip-color": s.color } as React.CSSProperties}
                onClick={() => toggleFilter(s.field, s.value, s.label)}>
                <span className="sh-chip-dot" style={{ background: s.color }} />
                {s.label} <strong>{s.count}</strong>
              </button>
            );
          })}
          <div className="sh-stats-divider" />
          {/* Category filter chips */}
          {groupedCategoryCounts.map(([group, count]) => {
            const isActive =
              (analyticsFilter?.field === "category-group" && analyticsFilter.value === group) ||
              (analyticsFilter?.field === "category-specific" && analyticsFilter.value.startsWith(group + " — "));
            return (
              <button key={group} className={"sh-filter-chip" + (isActive ? " sh-filter-chip--active" : "")}
                onClick={() => toggleFilter("category-group", group, `${group} clips`)}>
                {group} <strong>{count}</strong>
              </button>
            );
          })}
          {/* Coverage chips */}
          {analytics.coverageCounts.map(([name, count]) => {
            const isActive = analyticsFilter?.field === "coverage" && analyticsFilter.value === name;
            return (
              <button key={name} className={"sh-filter-chip" + (isActive ? " sh-filter-chip--active" : "")}
                onClick={() => toggleFilter("coverage", name, name)}>
                {name} <strong>{count}</strong>
              </button>
            );
          })}
          {analyticsFilter && (
            <button className="sh-filter-chip sh-filter-chip--clear" onClick={() => setAnalyticsFilter(null)}>
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* ── Specific-tag drill-down row (only when a category group is active and has sub-tags) ── */}
      {categorySubCounts.length > 0 && (
        <div className="sh-subtag-row">
          <span className="sh-subtag-label">Specific tags</span>
          {categorySubCounts.map(([specific, fullVal, count]) => {
            const isActive = analyticsFilter?.field === "category-specific" && analyticsFilter.value === fullVal;
            return (
              <button key={fullVal}
                className={"sh-filter-chip sh-filter-chip--sub" + (isActive ? " sh-filter-chip--active" : "")}
                onClick={() => toggleFilter("category-specific", fullVal, `${activeGroupForSub} → ${specific}`)}>
                {specific} <strong>{count}</strong>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active filter banner ── */}
      {analyticsFilter && (
        <div className="analytics-filter-banner" style={{ margin: "0 16px 8px" }}>
          <span>Showing: <strong>{analyticsFilter.label}</strong> · {filteredTags.length} of {allMyTags.length} clips</span>
          <button style={{ marginLeft: "auto", fontSize: 12, padding: "2px 8px" }} onClick={() => setAnalyticsFilter(null)}>Clear ×</button>
        </div>
      )}

      {allMyTags.length === 0 ? (
        <div className="empty-state" style={{ margin: "24px 16px" }}>No clips found for this time period.</div>
      ) : (
        <div className="sh-body">

          {/* ── Left: scrollable clip list ── */}
          <div className="sh-list-col">
            <p className="rv-sidebar-heading" style={{ margin: "0 0 8px" }}>
              Clips ({filteredTags.length}{analyticsFilter ? ` of ${allMyTags.length}` : ""})
            </p>
            {filteredTags.length === 0 ? (
              <div className="empty-state" style={{ margin: 0, padding: "20px 0" }}>No clips match this filter.</div>
            ) : (
              <div className="sh-clip-list">
                {filteredTags.map((tag, i) => {
                  const sel = tag.id === selectedClipId;
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
                        {[tag.reviewGameDate, tag.category].filter(Boolean).join(" · ")}
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

          {/* ── Right: video + clip detail ── */}
          <div className="sh-video-col">

            {/* Video */}
            <div className="sh-video-frame">
              {selectedClip && currentEmbed ? (
                isIframe ? (
                  <iframe key={`${selectedClip.id}-${seekSeconds}`}
                    src={currentEmbed}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen style={{ width: "100%", height: "100%", border: "none", display: "block" }}
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
                      onError={() => setVideoError(true)}
                    />
                  )
                ) : (
                  <div className="sh-empty-video">This video cannot be embedded directly.</div>
                )
              ) : (
                <div className="sh-empty-video">
                  {selectedClip ? "No video attached." : "Select a clip to watch."}
                </div>
              )}
            </div>

            {/* Prev / Next */}
            <div className="sh-nav-row">
              <button onClick={goPrev} disabled={!hasPrev} style={{ fontSize: 13 }}>← Prev</button>
              <span className="hint" style={{ fontSize: 12 }}>
                {selectedIdx >= 0 ? `${selectedIdx + 1} / ${filteredTags.length}` : `${filteredTags.length} clips`}
              </span>
              <button onClick={goNext} disabled={!hasNext} style={{ fontSize: 13 }}>Next →</button>
            </div>

            {/* Selected clip detail */}
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
                  {selectedClip.category && <span className="chip" style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedClip.category}</span>}
                </div>
                {selectedClip.notes && <div className="rv-clip-notes" style={{ marginTop: 8 }}>{selectedClip.notes}</div>}
              </div>
            )}
          </div>

        </div>
      )}
    </main>
  );
}

