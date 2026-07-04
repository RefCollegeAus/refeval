"use client";

import { useState, useEffect } from "react";
import { Send, ChevronDown, ChevronUp, Play } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { embedUrl } from "@/lib/utils/video";
import type { RefEvalSession } from "@/lib/types/auth";
import type { UnreadCounts } from "@/lib/hooks/useUnreadCounts";

type CommentRow = {
  id: string;
  reviewId: string;
  tagId: string;
  userId: string;
  authorName: string;
  message: string;
  createdAt: string;
};

type ClipRow = {
  id: string;
  reviewId: string;
  adjustedTime: string;
  adjustedSeconds: number;
  outcome: string | null;
  category: string | null;
  refereeTarget: string | null;
};

type ReviewRow = {
  id: string;
  game: string;
  gameDate: string | null;
  referee1Name: string | null;
  referee2Name: string | null;
  referee3Name: string | null;
  videoLink: string | null;
};

type ClipThread = {
  clip: ClipRow;
  comments: CommentRow[];
};

type ReviewGroup = {
  review: ReviewRow;
  clips: ClipThread[];
  latestAt: string;
};

function outcomeClass(outcome?: string | null): string {
  if (!outcome) return "review";
  const o = outcome.toLowerCase();
  if (o.startsWith("correct")) return "done";
  if (o.startsWith("incorrect")) return "incorrect";
  return "review";
}

function formatTs(ts: string): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function refNames(r: ReviewRow): string {
  return [r.referee1Name, r.referee2Name, r.referee3Name].filter(Boolean).join(", ") || "—";
}

async function upsertRead(userId: string, reviewId: string, tagId: string) {
  const now = new Date().toISOString();
  await getSupabaseClient()
    .from("review_comment_reads")
    .upsert(
      { user_id: userId, review_id: reviewId, tag_id: tagId, last_read_at: now, updated_at: now },
      { onConflict: "user_id,review_id,tag_id" }
    );
}

export function CommentInbox({
  session,
  onHome,
  onRead,
  onOpenReview,
  unreadCounts,
}: {
  session: RefEvalSession | null;
  onHome: () => void;
  onRead?: () => void;
  onOpenReview?: (reviewId: string) => void;
  unreadCounts?: UnreadCounts;
}) {
  const [groups, setGroups] = useState<ReviewGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openVideoKey, setOpenVideoKey] = useState<string | null>(null);

  // Active reply state: one compose box at a time
  const [replyKey, setReplyKey] = useState<string | null>(null); // `${reviewId}::${tagId}`
  const [replyDraft, setReplyDraft] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");

    const { data: rawComments, error: ce } = await getSupabaseClient()
      .from("review_comments")
      .select("id, review_id, tag_id, user_id, author_name, message, created_at")
      .not("tag_id", "is", null)
      .order("created_at", { ascending: true });

    if (ce || !rawComments) { setError(ce?.message || "Failed to load"); setLoading(false); return; }

    const comments: CommentRow[] = rawComments.map((c: any) => ({
      id: c.id,
      reviewId: c.review_id,
      tagId: c.tag_id,
      userId: c.user_id,
      authorName: c.author_name || "Unknown",
      message: c.message,
      createdAt: c.created_at,
    }));

    const reviewIds = Array.from(new Set(comments.map(c => c.reviewId)));
    const tagIds   = Array.from(new Set(comments.map(c => c.tagId)));

    if (reviewIds.length === 0) { setGroups([]); setLoading(false); return; }

    const [{ data: rawReviews }, { data: rawClips }] = await Promise.all([
      getSupabaseClient()
        .from("reviews")
        .select("id, game, game_date, referee1_name, referee2_name, referee3_name, video_link")
        .in("id", reviewIds),
      getSupabaseClient()
        .from("clips")
        .select("id, review_id, adjusted_time, adjusted_seconds, outcome, category, referee_target")
        .in("id", tagIds),
    ]);

    const reviewMap: Record<string, ReviewRow> = {};
    for (const r of rawReviews || []) {
      reviewMap[r.id] = {
        id: r.id,
        game: r.game || "Untitled Review",
        gameDate: r.game_date || null,
        referee1Name: r.referee1_name || null,
        referee2Name: r.referee2_name || null,
        referee3Name: r.referee3_name || null,
        videoLink: r.video_link || null,
      };
    }

    const clipMap: Record<string, ClipRow> = {};
    for (const c of rawClips || []) {
      clipMap[c.id] = {
        id: c.id,
        reviewId: c.review_id,
        adjustedTime: c.adjusted_time || "?",
        adjustedSeconds: Number(c.adjusted_seconds ?? 0),
        outcome: c.outcome || null,
        category: c.category || null,
        refereeTarget: c.referee_target || null,
      };
    }

    // Group comments by review → clip using plain objects
    const reviewGroups: Record<string, Record<string, CommentRow[]>> = {};
    for (const comment of comments) {
      if (!reviewGroups[comment.reviewId]) reviewGroups[comment.reviewId] = {};
      if (!reviewGroups[comment.reviewId][comment.tagId]) reviewGroups[comment.reviewId][comment.tagId] = [];
      reviewGroups[comment.reviewId][comment.tagId].push(comment);
    }

    const result: ReviewGroup[] = [];
    for (const reviewId of Object.keys(reviewGroups)) {
      const review = reviewMap[reviewId];
      if (!review) continue;

      const clipGroups = reviewGroups[reviewId];
      const clips: ClipThread[] = [];
      for (const tagId of Object.keys(clipGroups)) {
        const clip = clipMap[tagId] ?? { id: tagId, reviewId, adjustedTime: "?", adjustedSeconds: 0, outcome: null, category: null, refereeTarget: null };
        clips.push({ clip, comments: clipGroups[tagId] });
      }
      clips.sort((a, b) => {
        const aLast = a.comments[a.comments.length - 1]?.createdAt ?? "";
        const bLast = b.comments[b.comments.length - 1]?.createdAt ?? "";
        return bLast.localeCompare(aLast);
      });
      const latestAt = clips[0]?.comments.slice(-1)[0]?.createdAt ?? "";
      result.push({ review, clips, latestAt });
    }

    result.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
    setGroups(result);
    setLoading(false);
  }

  function toggleCollapse(reviewId: string) {
    setCollapsed(prev => {
      const s = new Set(prev);
      if (s.has(reviewId)) s.delete(reviewId); else s.add(reviewId);
      return s;
    });
  }

  function openReply(reviewId: string, tagId: string) {
    const key = `${reviewId}::${tagId}`;
    setReplyKey(k => k === key ? null : key);
    setReplyDraft("");
    setReplyError("");
    // Don't auto-clear — thread only leaves inbox on explicit reply or Clear
  }

  async function clearThread(reviewId: string, tagId: string) {
    if (!session?.user.id) return;
    await upsertRead(session.user.id, reviewId, tagId);
    onRead?.();
  }

  async function sendReply(reviewId: string, tagId: string) {
    const msg = replyDraft.trim();
    if (!msg || !session || replySending) return;
    setReplySending(true);
    setReplyError("");
    const { error: insertErr } = await getSupabaseClient()
      .from("review_comments")
      .insert({ review_id: reviewId, tag_id: tagId, user_id: session.user.id, author_name: session.profile.name, message: msg });
    if (insertErr) { setReplyError(insertErr.message); setReplySending(false); return; }
    // Mark thread as cleared — triggers refreshUnread in parent, thread leaves inbox
    await upsertRead(session.user.id, reviewId, tagId);
    setReplyKey(null);
    setReplyDraft("");
    setReplySending(false);
    onRead?.();
    // No load() — thread is leaving the inbox; no need to reload the full list
  }

  function videoEmbed(review: ReviewRow, clip: ClipRow) {
    if (!review.videoLink) return null;
    const url = embedUrl(review.videoLink, clip.adjustedSeconds, true);
    const isIframe = url.includes("youtube.com/embed");
    const isDirectVideo = /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
    if (isIframe) return <iframe className="inbox-video-frame" src={url} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
    if (isDirectVideo) return <video key={clip.adjustedSeconds} className="inbox-video-frame" controls src={`${url}#t=${Math.floor(clip.adjustedSeconds)}`} />;
    // Non-embeddable — offer to open in review
    return (
      <p className="hint" style={{ margin: 0 }}>
        Video cannot be embedded here.{" "}
        {onOpenReview && <button className="clip-action-btn" onClick={() => onOpenReview(review.id)}>Open in review ↗</button>}
      </p>
    );
  }

  // Task-list view: only threads where another person has commented and educator hasn't cleared.
  // unreadCounts === undefined means the initial fetch hasn't finished — fall back to showing all.
  // unreadCounts === {} means loaded and all threads cleared — show "inbox clear" state.
  const actionableGroups = groups
    .map(({ review, clips, latestAt }) => ({
      review,
      latestAt,
      clips: clips.filter(({ clip }) => (unreadCounts?.[`${review.id}::${clip.id}`] ?? 0) > 0),
    }))
    .filter(({ clips }) => clips.length > 0);

  const displayGroups = unreadCounts === undefined ? groups : actionableGroups;

  return (
    <div className="inbox-root" style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
      <div className="inbox-page-header panel">
        <div>
          <p className="eyebrow">Educator</p>
          <h1 style={{ marginBottom: 2 }}>Comment Inbox</h1>
          <p className="hint" style={{ margin: 0 }}>
            Threads where referees are waiting for your response
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load}>Refresh</button>
          <button onClick={onHome}>← Back</button>
        </div>
      </div>

      {loading && <div className="loading-state"><span className="loading-spinner" />Loading…</div>}
      {error && <p className="danger-text" style={{ padding: "20px 0" }}>{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <div className="empty-state">No clip comments yet. Comments will appear here when referees add feedback to clips.</div>
      )}
      {!loading && !error && groups.length > 0 && unreadCounts !== undefined && displayGroups.length === 0 && (
        <div className="empty-state inbox-clear-state">
          <strong>Inbox clear.</strong> All threads are up to date — no replies needed.
        </div>
      )}

      {displayGroups.map(({ review, clips }) => {
        const isCollapsed = collapsed.has(review.id);
        return (
          <div key={review.id} className="inbox-review-group">
            <button className="inbox-review-header" onClick={() => toggleCollapse(review.id)}>
              <div className="inbox-review-header-info">
                <span className="inbox-review-name">{review.game}</span>
                {review.gameDate && (
                  <span className="hint inbox-review-date">
                    {new Date(review.gameDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                )}
                <span className="hint inbox-review-refs">{refNames(review)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="chip">{clips.length} clip{clips.length !== 1 ? "s" : ""}</span>
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </div>
            </button>

            {!isCollapsed && (
              <div className="inbox-clip-list">
                {clips.map(({ clip, comments }) => {
                  const key = `${review.id}::${clip.id}`;
                  const isReplying = replyKey === key;
                  const isVideoOpen = openVideoKey === key;
                  const embed = review.videoLink ? videoEmbed(review, clip) : null;
                  return (
                    <div key={clip.id} className="inbox-clip-thread">
                      <div className="inbox-clip-meta">
                        <span className="inbox-clip-time">{clip.adjustedTime}</span>
                        {clip.outcome && (
                          <span className={`status ${outcomeClass(clip.outcome)}`} style={{ fontSize: 11, padding: "2px 7px" }}>
                            {clip.outcome}
                          </span>
                        )}
                        {clip.category && <span className="hint">{clip.category}</span>}
                        {clip.refereeTarget && <span className="hint">· {clip.refereeTarget}</span>}
                        {embed && (
                          <button className="clip-action-btn" onClick={() => setOpenVideoKey(k => k === key ? null : key)}>
                            <Play size={11} /> {isVideoOpen ? "Hide video" : "Watch clip"}
                          </button>
                        )}
                      </div>

                      {isVideoOpen && embed && (
                        <div className="inbox-video-preview">{embed}</div>
                      )}

                      <div className="inbox-thread">
                        {comments.map(c => (
                          <div key={c.id} className={"disc-message" + (c.userId === session?.user.id ? " disc-mine" : "")}>
                            <div className="disc-meta">
                              <span className="disc-author">{c.authorName}</span>
                              <span className="disc-time">{formatTs(c.createdAt)}</span>
                            </div>
                            <div className="disc-bubble"><p className="disc-text">{c.message}</p></div>
                          </div>
                        ))}
                      </div>

                      {isReplying ? (
                        <div className="inbox-reply-compose">
                          <div className="disc-compose">
                            <textarea
                              className="disc-textarea"
                              placeholder="Write a reply…"
                              value={replyDraft}
                              autoFocus
                              onChange={e => setReplyDraft(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(review.id, clip.id); }}
                              rows={3}
                              disabled={replySending}
                            />
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <button className="primary disc-send" onClick={() => sendReply(review.id, clip.id)} disabled={!replyDraft.trim() || replySending}>
                                <Send size={15} />{replySending ? "Sending…" : "Send"}
                              </button>
                              <button onClick={() => { setReplyKey(null); setReplyDraft(""); }}>Cancel</button>
                            </div>
                          </div>
                          {replyError && <p className="danger-text" style={{ marginTop: 6 }}>{replyError}</p>}
                          <p className="hint" style={{ marginTop: 4, fontSize: 11 }}>Ctrl+Enter / ⌘+Enter to send</p>
                        </div>
                      ) : (
                        <div className="inbox-thread-actions">
                          <button className="clip-action-btn" onClick={() => openReply(review.id, clip.id)}>Reply</button>
                          <button className="clip-action-btn" onClick={() => clearThread(review.id, clip.id)}>No reply required</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
