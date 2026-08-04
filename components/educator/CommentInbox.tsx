"use client";

import { useState, useEffect } from "react";
import { Send, ChevronDown, ChevronUp, Play, MessageSquare } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { embedUrl } from "@/lib/utils/video";
import type { RefEvalSession } from "@/lib/types/auth";
import type { UnreadCounts } from "@/lib/hooks/useUnreadCounts";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, EmptyState, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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

function outcomeTone(outcome?: string | null): "good" | "danger" | "warn" {
  if (!outcome) return "warn";
  const o = outcome.toLowerCase();
  if (o.startsWith("correct")) return "good";
  if (o.startsWith("incorrect")) return "danger";
  return "warn";
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
      <p className="text-sm text-muted">
        Video cannot be embedded here.{" "}
        {onOpenReview && <Button variant="secondary" size="sm" onClick={() => onOpenReview(review.id)}>Open in review ↗</Button>}
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
    <PageFrame
      className="mx-auto max-w-[900px] p-0"
      eyebrow="Educator"
      title="Comment Inbox"
      description="Threads where referees are waiting for your response"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}>Refresh</Button>
          <Button variant="secondary" size="sm" onClick={onHome}>← Back</Button>
        </div>
      }
    >
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Spinner size={16} /> Loading…
        </div>
      )}
      {error && <p className="text-[13px] text-red-300">{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <EmptyState icon={<MessageSquare size={28} />} title="No clip comments yet" description="Comments will appear here when referees add feedback to clips." />
      )}
      {!loading && !error && groups.length > 0 && unreadCounts !== undefined && displayGroups.length === 0 && (
        <EmptyState icon={<MessageSquare size={28} />} title="Inbox clear" description="All threads are up to date — no replies needed." />
      )}

      {displayGroups.map(({ review, clips }) => {
        const isCollapsed = collapsed.has(review.id);
        return (
          <Card key={review.id} className="!p-0 overflow-hidden">
            <button className="flex w-full items-center justify-between gap-3 p-4 text-left" onClick={() => toggleCollapse(review.id)}>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-bold text-text">{review.game}</span>
                {review.gameDate && (
                  <span className="text-xs text-muted">
                    {new Date(review.gameDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                )}
                <span className="text-xs text-muted">{refNames(review)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="chip">{clips.length} clip{clips.length !== 1 ? "s" : ""}</span>
                {isCollapsed ? <ChevronDown size={16} className="text-muted" /> : <ChevronUp size={16} className="text-muted" />}
              </div>
            </button>

            {!isCollapsed && (
              <div className="grid gap-3 border-t border-border p-4">
                {clips.map(({ clip, comments }) => {
                  const key = `${review.id}::${clip.id}`;
                  const isReplying = replyKey === key;
                  const isVideoOpen = openVideoKey === key;
                  const embed = review.videoLink ? videoEmbed(review, clip) : null;
                  return (
                    <div key={clip.id} className="grid gap-2.5 rounded-xl border border-border bg-panel-2 p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-text">{clip.adjustedTime}</span>
                        {clip.outcome && <Badge tone={outcomeTone(clip.outcome)}>{clip.outcome}</Badge>}
                        {clip.category && <span className="text-xs text-muted">{clip.category}</span>}
                        {clip.refereeTarget && <span className="text-xs text-muted">· {clip.refereeTarget}</span>}
                        {embed && (
                          <Button variant="secondary" size="sm" className="gap-1" onClick={() => setOpenVideoKey(k => k === key ? null : key)}>
                            <Play size={11} /> {isVideoOpen ? "Hide video" : "Watch clip"}
                          </Button>
                        )}
                      </div>

                      {isVideoOpen && embed && (
                        <div className="inbox-video-preview">{embed}</div>
                      )}

                      <div className="grid gap-2">
                        {comments.map(c => {
                          const isMe = c.userId === session?.user.id;
                          return (
                            <div key={c.id} className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
                              <div className="flex items-center gap-2 text-[11px] text-muted">
                                <span className="font-semibold text-text">{c.authorName}</span>
                                <span>{formatTs(c.createdAt)}</span>
                              </div>
                              <div
                                className={cn(
                                  "max-w-[85%] border px-3 py-2",
                                  isMe
                                    ? "rounded-[12px_12px_2px_12px] border-accent/30 bg-accent/[.14]"
                                    : "rounded-[12px_12px_12px_2px] border-border bg-panel"
                                )}
                              >
                                <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-text">{c.message}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {isReplying ? (
                        <div className="grid gap-1.5">
                          <div className="flex items-end gap-2">
                            <Textarea
                              placeholder="Write a reply…"
                              value={replyDraft}
                              autoFocus
                              onChange={e => setReplyDraft(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(review.id, clip.id); }}
                              rows={3}
                              disabled={replySending}
                              className="flex-1 resize-none"
                            />
                            <div className="grid shrink-0 gap-1.5">
                              <Button variant="primary" className="gap-1.5" onClick={() => sendReply(review.id, clip.id)} disabled={!replyDraft.trim() || replySending}>
                                <Send size={15} />{replySending ? "Sending…" : "Send"}
                              </Button>
                              <Button variant="secondary" onClick={() => { setReplyKey(null); setReplyDraft(""); }}>Cancel</Button>
                            </div>
                          </div>
                          {replyError && <p className="text-[13px] text-red-300">{replyError}</p>}
                          <p className="text-[11px] text-muted">Ctrl+Enter / ⌘+Enter to send</p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openReply(review.id, clip.id)}>Reply</Button>
                          <Button variant="secondary" size="sm" onClick={() => clearThread(review.id, clip.id)}>No reply required</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </PageFrame>
  );
}
