"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { ReviewComments } from "@/components/ReviewComments";
import { makeAnalytics } from "@/lib/utils/analytics";
import { embedUrl } from "@/lib/utils/video";
import { MessageSquare } from "lucide-react";
import type { ReviewRecord, CodedTag, RefSlot } from "@/lib/types/reviews";
import type { RefEvalSession } from "@/lib/types/auth";

import type { UnreadCounts } from "@/lib/hooks/useUnreadCounts";

type Props = {
  review: ReviewRecord | undefined;
  visibleTags: CodedTag[];
  mySlot: RefSlot | null;
  session: RefEvalSession | null;
  unreadCounts?: UnreadCounts;
  onRead?: () => void;
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
  onHome,
  onAdmin,
  onProfile,
  onLogout,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [seekSeconds, setSeekSeconds] = useState(0);
  const [seekAutoplay, setSeekAutoplay] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const analytics = makeAnalytics(visibleTags);
  const total = visibleTags.length;
  const selectedTag = total > 0 ? visibleTags[selectedIdx] ?? null : null;

  const currentEmbed = review?.videoLink
    ? embedUrl(review.videoLink, seekSeconds, seekAutoplay)
    : "";
  const isIframe = currentEmbed.includes("youtube.com/embed");
  const isDirectVideo = /\.(mp4|webm|ogg)(\?|#|$)/i.test(currentEmbed);

  function selectClip(idx: number) {
    const tag = visibleTags[idx];
    if (!tag) return;
    setSelectedIdx(idx);
    setSeekSeconds(tag.adjustedSeconds);
    setSeekAutoplay(true);
  }

  function bars(counts: [string, number][]) {
    const max = Math.max(...counts.map(([, c]) => c), 1);
    return counts.map(([name, count]) => (
      <div className="metric-row" key={name}>
        <span>{name}</span>
        <div className="mini-bar">
          <div className="mini-bar-fill" style={{ width: `${Math.round((count / max) * 100)}%` }} />
        </div>
        <strong>{count}</strong>
      </div>
    ));
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

          {/* Video player */}
          <div className="video-placeholder" style={{ margin: 0 }}>
            {currentEmbed ? (
              isIframe ? (
                <iframe
                  className="video-frame"
                  src={currentEmbed}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : isDirectVideo ? (
                <video
                  key={seekSeconds}
                  controls
                  src={currentEmbed + `#t=${Math.floor(seekSeconds)}`}
                  className="video-frame"
                />
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

          {total === 0 && (
            <div className="empty-state">No clips have been tagged for this review yet.</div>
          )}

          {/* Performance summary */}
          {total > 0 && (
            <>
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
                  <div className="metric-tile">
                    <div className="number">{analytics.correctCalls + analytics.correctNoCalls}</div>
                    <div className="hint">Correct</div>
                  </div>
                  <div className="metric-tile">
                    <div className="number">{analytics.incorrectCalls + analytics.incorrectNoCalls}</div>
                    <div className="hint">Incorrect</div>
                  </div>
                </div>
              </div>
              <div className="rv-stats-breakdowns">
                <div className="analytics-card"><h3>Outcome</h3>{bars(analytics.outcomeCounts)}</div>
                <div className="analytics-card"><h3>Category</h3>{bars(analytics.categoryCounts)}</div>
                <div className="analytics-card"><h3>Position</h3>{bars(analytics.positionCounts)}</div>
                <div className="analytics-card"><h3>Coverage</h3>{bars(analytics.coverageCounts)}</div>
              </div>
            </>
          )}

        </div>

        {/* ── Sidebar: clip list ── */}
        <aside className="rv-sidebar">
          <p className="rv-sidebar-heading">Clips ({total})</p>
          {total === 0 ? (
            <p className="hint">No clips available.</p>
          ) : (
            <div className="rv-clip-list">
              {visibleTags.map((tag, i) => {
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Comments panel — rendered once below the clip list for the selected clip */}
          {showComments && selectedTag && review?.id && (
            <div style={{ marginTop: 8 }}>
              <ReviewComments
                reviewId={review.id}
                tagId={selectedTag.id}
                session={session}
                onRead={onRead}
              />
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
