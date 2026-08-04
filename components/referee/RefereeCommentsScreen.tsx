"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Star, Send, Play, ChevronUp, ChevronDown } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RefEvalSession } from "@/lib/types/auth";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { CodedTag } from "@/lib/types/reviews";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, type BadgeTone, Button, Card, EmptyState, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────────────────────

type CommentThread = {
  reviewId: string;
  tagId: string | null;
  reviewGame: string;
  reviewDate: string | null;
  commentCount: number;
  lastAt: string;
  unreadCount: number;
  comments: CommentRow[];
  // clip context (only when tagId is set)
  clipTime?: string;
  clipOutcome?: string;
  clipCategory?: string;
};

type CommentRow = {
  id: string;
  userId: string;
  authorName: string;
  message: string;
  createdAt: string;
};

// ── Persistence ────────────────────────────────────────────────────────────────

function starredKey(userId: string) {
  return `refcoach_starred_comment_threads_${userId}`;
}
function dismissedKey(userId: string) {
  return `refcoach_dismissed_comment_threads_${userId}`;
}
function seenAtKey(userId: string) {
  return `refcoach_thread_seen_at_${userId}`;
}

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}
function saveSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch {}
}
function loadMap(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveMap(key: string, map: Record<string, string>) {
  try { localStorage.setItem(key, JSON.stringify(map)); } catch {}
}

function threadKey(reviewId: string, tagId: string | null) {
  return `${reviewId}::${tagId ?? ""}`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function outcomeTone(outcome?: string): BadgeTone {
  if (!outcome) return "neutral";
  const o = outcome.toLowerCase();
  if (o.startsWith("correct")) return "good";
  if (o.startsWith("incorrect")) return "danger";
  return "warn";
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RefereeCommentsScreen({
  session,
  myReviews,
  allTags,
  clearUnread,
  onRead,
  onWatchClip,
  onBack,
}: {
  session: RefEvalSession;
  myReviews: ReviewRecord[];
  allTags: CodedTag[];
  /** Instantly clears a thread's entry in the shared unread state so the Home badge updates without waiting on a refetch. */
  clearUnread?: (reviewId: string, tagId: string) => void;
  /** Re-fetches the shared unread state from the database so it stays correct after a page reload. */
  onRead?: () => void;
  onWatchClip: (reviewId: string, tagId: string) => void;
  onBack: () => void;
}) {
  const userId = session.user.id;
  const [threads, setThreads]       = useState<CommentThread[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"all" | "starred" | "unread">("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [starred, setStarred]       = useState<Set<string>>(() => loadSet(starredKey(userId)));
  const [dismissed, setDismissed]   = useState<Set<string>>(() => loadSet(dismissedKey(userId)));
  const [seenAt, setSeenAt]         = useState<Record<string, string>>(() => loadMap(seenAtKey(userId)));
  const [drafts, setDrafts]         = useState<Record<string, string>>({});
  const [sending, setSending]       = useState<string | null>(null);

  const reviewById = new Map(myReviews.map(r => [r.id, r]));
  const tagById    = new Map(allTags.map(t => [t.id, t]));

  const load = useCallback(async () => {
    if (myReviews.length === 0) { setLoading(false); return; }
    setLoading(true);

    const reviewIds = myReviews.map(r => r.id);
    const { data, error } = await getSupabaseClient()
      .from("review_comments")
      .select("id, user_id, author_name, message, created_at, review_id, tag_id")
      .in("review_id", reviewIds)
      .order("created_at", { ascending: true });

    if (error) { setLoading(false); return; }

    const map = new Map<string, CommentThread>();
    for (const c of (data ?? [])) {
      const key = threadKey(c.review_id, c.tag_id);
      if (!map.has(key)) {
        const review = reviewById.get(c.review_id);
        const tag    = c.tag_id ? tagById.get(c.tag_id) : undefined;
        map.set(key, {
          reviewId:      c.review_id,
          tagId:         c.tag_id ?? null,
          reviewGame:    review?.game || "Untitled",
          reviewDate:    review?.gameDate ?? review?.submittedAt ?? null,
          commentCount:  0,
          lastAt:        c.created_at,
          unreadCount:   0,
          comments:      [],
          clipTime:      tag?.adjustedTime,
          clipOutcome:   tag?.outcome,
          clipCategory:  tag?.category,
        });
      }
      const thread = map.get(key)!;
      thread.comments.push({
        id: c.id, userId: c.user_id,
        authorName: c.author_name || "Unknown",
        message: c.message, createdAt: c.created_at,
      });
      thread.commentCount++;
      if (c.created_at > thread.lastAt) thread.lastAt = c.created_at;
    }

    // Compute unread based on last-seen timestamp
    const seen = loadMap(seenAtKey(userId));
    const sorted = Array.from(map.values()).map(t => {
      const lastSeen = seen[threadKey(t.reviewId, t.tagId)];
      t.unreadCount = lastSeen
        ? t.comments.filter(c => c.createdAt > lastSeen && c.userId !== userId).length
        : t.comments.filter(c => c.userId !== userId).length;
      return t;
    }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));

    setThreads(sorted);
    setLoading(false);
  }, [myReviews, allTags]);

  useEffect(() => { load(); }, [load]);

  const toggleStar = useCallback((key: string) => {
    setStarred(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      saveSet(starredKey(userId), next);
      return next;
    });
  }, [userId]);

  const toggleDismiss = useCallback((key: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      saveSet(dismissedKey(userId), next);
      return next;
    });
  }, [userId]);

  const markSeen = useCallback((key: string, thread: CommentThread) => {
    const now = new Date().toISOString();
    setSeenAt(prev => {
      const next = { ...prev, [key]: now };
      saveMap(seenAtKey(userId), next);
      return next;
    });
    setThreads(prev => prev.map(t =>
      threadKey(t.reviewId, t.tagId) === key ? { ...t, unreadCount: 0 } : t
    ));

    // Persist to the same review_comment_reads table the Home page badge reads from,
    // and invalidate that shared state immediately — otherwise reading here never
    // clears the "My Comments" indicator, and reverts on refresh.
    if (thread.tagId) {
      clearUnread?.(thread.reviewId, thread.tagId);
      getSupabaseClient()
        .from("review_comment_reads")
        .upsert(
          { user_id: userId, review_id: thread.reviewId, tag_id: thread.tagId, last_read_at: now, updated_at: now },
          { onConflict: "user_id,review_id,tag_id" },
        )
        .then(() => onRead?.());
    }
  }, [userId, clearUnread, onRead]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKey(prev => {
      const next = prev === key ? null : key;
      if (next) {
        const thread = threads.find(t => threadKey(t.reviewId, t.tagId) === next);
        if (thread) markSeen(next, thread);
      }
      return next;
    });
  }, [markSeen, threads]);

  const sendReply = useCallback(async (thread: CommentThread) => {
    const key = threadKey(thread.reviewId, thread.tagId);
    const msg = (drafts[key] ?? "").trim();
    if (!msg || sending) return;
    setSending(key);
    await getSupabaseClient().from("review_comments").insert({
      review_id:   thread.reviewId,
      tag_id:      thread.tagId,
      user_id:     userId,
      author_name: session.profile.name,
      message:     msg,
    });
    setDrafts(prev => ({ ...prev, [key]: "" }));
    setSending(null);
    await load();
  }, [drafts, sending, userId, session.profile.name, load]);

  const totalUnread = threads.filter(t => !dismissed.has(threadKey(t.reviewId, t.tagId)) && t.unreadCount > 0).length;

  const visible = threads.filter(t => {
    const key = threadKey(t.reviewId, t.tagId);
    if (dismissed.has(key)) return false;
    if (filter === "starred")  return starred.has(key);
    if (filter === "unread")   return t.unreadCount > 0;
    return true;
  });

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "all",     label: `All (${threads.filter(t => !dismissed.has(threadKey(t.reviewId, t.tagId))).length})` },
    { key: "unread",  label: `Outstanding${totalUnread > 0 ? ` (${totalUnread})` : ""}` },
    { key: "starred", label: `Starred (${Array.from(starred).filter(k => threads.some(t => threadKey(t.reviewId, t.tagId) === k && !dismissed.has(k))).length})` },
  ];

  return (
    <PageFrame
      eyebrow="Referee Portal"
      title="My Comments"
      description="Comment threads from all your evaluations"
      actions={<Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>}
      className="mx-auto max-w-[900px]"
    >
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(({ key: f, label }) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "relative rounded-lg border px-3.5 py-1 text-[13px] transition-colors",
                isActive
                  ? f === "unread" ? "border-danger/40 bg-danger/10 font-bold text-red-300" : "border-accent/40 bg-accent/10 font-bold text-accent"
                  : "border-border text-muted"
              )}
            >
              {label}
              {f === "unread" && totalUnread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
                  {Math.min(totalUnread, 99)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner size={16} /> Loading comments…
        </div>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && (
        <EmptyState
          icon={<MessageSquare size={28} />}
          title={filter === "starred" ? "No starred threads" : filter === "unread" ? "No outstanding comments" : "No comment threads yet"}
          description={
            filter === "starred"
              ? "Star threads to save them for easy reference."
              : filter === "unread"
              ? "All comments have been reviewed."
              : "Comment threads appear here once your educator adds comments to evaluations."
          }
        />
      )}

      {/* Thread list */}
      {!loading && visible.length > 0 && (
        <div className="grid gap-2.5">
          {visible.map(thread => {
            const key        = threadKey(thread.reviewId, thread.tagId);
            const isStarred  = starred.has(key);
            const isExpanded = expandedKey === key;
            const hasClip    = !!thread.tagId && (thread.clipTime || thread.clipOutcome || thread.clipCategory);
            const hasUnread  = thread.unreadCount > 0;

            return (
              <Card
                key={key}
                className={cn(
                  "overflow-hidden p-0",
                  hasUnread ? "border-l-4 border-l-danger" : isStarred ? "border-l-4 border-l-accent" : undefined,
                )}
              >
                {/* Thread header */}
                <div className="flex cursor-pointer items-center gap-2.5 px-4 py-3" onClick={() => toggleExpand(key)}>
                  {/* Star toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleStar(key); }}
                    className={cn("shrink-0 border-none bg-none p-1", isStarred ? "text-accent" : "text-muted")}
                    title={isStarred ? "Unstar" : "Star thread"}
                  >
                    <Star size={16} fill={isStarred ? "currentColor" : "none"} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-sm font-bold text-text">
                      <span className="truncate">{thread.reviewGame}</span>
                      {hasUnread && <Badge tone="danger" className="shrink-0">{thread.unreadCount} new</Badge>}
                    </div>
                    {/* Clip context row */}
                    {hasClip ? (
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="flex items-center gap-1"><Play size={10} className="shrink-0" /> Clip at {thread.clipTime}</span>
                        {thread.clipOutcome && <Badge tone={outcomeTone(thread.clipOutcome)} className="text-[10px]">{thread.clipOutcome}</Badge>}
                        {thread.clipCategory && <span>{thread.clipCategory}</span>}
                        {thread.reviewDate && <span>· {fmtDate(thread.reviewDate)}</span>}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-xs text-muted">
                        Review discussion
                        {thread.reviewDate && ` · ${fmtDate(thread.reviewDate)}`}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {/* Watch Clip button for tagged threads */}
                    {thread.tagId && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="gap-1 whitespace-nowrap"
                        onClick={e => { e.stopPropagation(); onWatchClip(thread.reviewId, thread.tagId!); }}
                        title="Open review and jump to this clip"
                      >
                        <Play size={10} /> Watch Clip
                      </Button>
                    )}
                    <Badge tone="accent">{thread.commentCount} comment{thread.commentCount !== 1 ? "s" : ""}</Badge>
                    {isExpanded ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                  </div>
                </div>

                {/* Thread body */}
                {isExpanded && (
                  <div className="grid gap-3 border-t border-border px-4 py-3">

                    {/* Clip context card (expanded) */}
                    {hasClip && (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel-2 px-3 py-2">
                        <div className="flex flex-wrap gap-2.5 text-xs">
                          <span className="text-muted">Clip · {thread.clipTime}</span>
                          {thread.clipOutcome && <Badge tone={outcomeTone(thread.clipOutcome)}>{thread.clipOutcome}</Badge>}
                          {thread.clipCategory && <span className="text-muted">{thread.clipCategory}</span>}
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          className="shrink-0 gap-1.5 whitespace-nowrap"
                          onClick={() => onWatchClip(thread.reviewId, thread.tagId!)}
                        >
                          <Play size={12} /> Watch Clip
                        </Button>
                      </div>
                    )}

                    {/* Comment bubbles */}
                    <div className="grid gap-2">
                      {thread.comments.map(c => {
                        const isMe = c.userId === userId;
                        return (
                          <div key={c.id} className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
                            <div
                              className={cn(
                                "max-w-[80%] border px-3 py-2",
                                isMe
                                  ? "rounded-[12px_12px_2px_12px] border-accent/30 bg-accent/[.14]"
                                  : "rounded-[12px_12px_12px_2px] border-border bg-panel-2",
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-text">{c.message}</p>
                            </div>
                            <span className="text-[11px] text-muted">{isMe ? "You" : c.authorName} · {fmt(c.createdAt)}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply box */}
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={drafts[key] ?? ""}
                        onChange={e => setDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(thread); }}
                        placeholder="Add a reply…"
                        rows={2}
                        className="min-h-[56px] flex-1 resize-none"
                      />
                      <Button
                        variant="primary"
                        className="shrink-0 self-end"
                        disabled={sending === key || !(drafts[key] ?? "").trim()}
                        onClick={() => sendReply(thread)}
                      >
                        <Send size={14} />
                      </Button>
                    </div>

                    {/* Dismiss / restore */}
                    <div className="flex justify-end">
                      <button onClick={() => toggleDismiss(key)} className="border-none bg-none p-0.5 text-xs text-muted">
                        {dismissed.has(key) ? "Restore thread" : "Dismiss thread"}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Show dismissed count + restore link */}
      {dismissed.size > 0 && (
        <p className="text-center text-xs text-muted">
          {dismissed.size} dismissed thread{dismissed.size !== 1 ? "s" : ""} ·{" "}
          <button
            onClick={() => { setDismissed(new Set()); saveSet(dismissedKey(userId), new Set()); }}
            className="border-none bg-none p-0 text-xs text-accent"
          >
            Show all
          </button>
        </p>
      )}
    </PageFrame>
  );
}
