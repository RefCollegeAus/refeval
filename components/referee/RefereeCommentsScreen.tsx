"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, MessageSquare, Star, Send, Play } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RefEvalSession } from "@/lib/types/auth";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { CodedTag } from "@/lib/types/reviews";

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

function outcomeColor(outcome?: string): string {
  if (!outcome) return "var(--muted)";
  const o = outcome.toLowerCase();
  if (o.startsWith("correct")) return "#30d158";
  if (o.startsWith("incorrect")) return "#ff453a";
  return "#ff9f0a";
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RefereeCommentsScreen({
  session,
  myReviews,
  allTags,
  onWatchClip,
  onBack,
}: {
  session: RefEvalSession;
  myReviews: ReviewRecord[];
  allTags: CodedTag[];
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

  const markSeen = useCallback((key: string) => {
    const now = new Date().toISOString();
    setSeenAt(prev => {
      const next = { ...prev, [key]: now };
      saveMap(seenAtKey(userId), next);
      return next;
    });
    setThreads(prev => prev.map(t =>
      threadKey(t.reviewId, t.tagId) === key ? { ...t, unreadCount: 0 } : t
    ));
  }, [userId]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKey(prev => {
      const next = prev === key ? null : key;
      if (next) markSeen(next);
      return next;
    });
  }, [markSeen]);

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

  return (
    <div style={{ padding: "20px 20px 60px", maxWidth: 860, margin: "0 auto", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MessageSquare size={22} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Referee Portal</p>
            <h1 style={{ margin: 0, fontSize: 22 }}>My Comments</h1>
            <p className="hint" style={{ margin: "2px 0 0" }}>Comment threads from all your evaluations</p>
          </div>
        </div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <ChevronLeft size={15} /> Back
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {([
          ["all",     `All (${threads.filter(t => !dismissed.has(threadKey(t.reviewId, t.tagId))).length})`],
          ["unread",  `Outstanding${totalUnread > 0 ? ` (${totalUnread})` : ""}`],
          ["starred", `Starred (${Array.from(starred).filter(k => threads.some(t => threadKey(t.reviewId, t.tagId) === k && !dismissed.has(k))).length})`],
        ] as const).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: 13, padding: "5px 14px", borderRadius: 8,
              background: filter === f ? (f === "unread" ? "rgba(255,69,58,.12)" : "rgba(165,106,27,.12)") : "transparent",
              color:      filter === f ? (f === "unread" ? "#ff453a"             : "var(--accent)")       : "var(--muted)",
              border:     `1px solid ${filter === f ? (f === "unread" ? "rgba(255,69,58,.35)" : "rgba(165,106,27,.35)") : "var(--border)"}`,
              fontWeight: filter === f ? 700 : 400,
              position: "relative",
            }}
          >
            {label}
            {f === "unread" && totalUnread > 0 && (
              <span style={{ position: "absolute", top: -6, right: -6, background: "#ff453a", color: "#fff", fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                {Math.min(totalUnread, 99)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <p className="hint">Loading comments…</p>}

      {/* Empty state */}
      {!loading && visible.length === 0 && (
        <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
          <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>
            {filter === "starred" ? "No starred threads" : filter === "unread" ? "No outstanding comments" : "No comment threads yet"}
          </p>
          <p className="hint" style={{ margin: "6px 0 0" }}>
            {filter === "starred"
              ? "Star threads to save them for easy reference."
              : filter === "unread"
              ? "All comments have been reviewed."
              : "Comment threads appear here once your educator adds comments to evaluations."}
          </p>
        </div>
      )}

      {/* Thread list */}
      {!loading && visible.map(thread => {
        const key        = threadKey(thread.reviewId, thread.tagId);
        const isStarred  = starred.has(key);
        const isExpanded = expandedKey === key;
        const hasClip    = !!thread.tagId && (thread.clipTime || thread.clipOutcome || thread.clipCategory);
        const hasUnread  = thread.unreadCount > 0;

        return (
          <div
            key={key}
            className="panel"
            style={{
              marginBottom: 10,
              padding: 0,
              overflow: "hidden",
              borderLeft: hasUnread ? "3px solid #ff453a" : isStarred ? "3px solid var(--accent)" : undefined,
            }}
          >
            {/* Thread header */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer" }}
              onClick={() => toggleExpand(key)}
            >
              {/* Star toggle */}
              <button
                onClick={e => { e.stopPropagation(); toggleStar(key); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: isStarred ? "var(--accent)" : "var(--muted)", fontSize: 16, padding: "0 4px", flexShrink: 0 }}
                title={isStarred ? "Unstar" : "Star thread"}
              >
                <Star size={16} fill={isStarred ? "currentColor" : "none"} />
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {thread.reviewGame}
                  {hasUnread && (
                    <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: "rgba(255,69,58,.15)", color: "#ff453a", border: "1px solid rgba(255,69,58,.3)" }}>
                      {thread.unreadCount} new
                    </span>
                  )}
                </div>
                {/* Clip context row */}
                {hasClip ? (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Play size={10} style={{ flexShrink: 0 }} />
                      Clip at {thread.clipTime}
                    </span>
                    {thread.clipOutcome && (
                      <span style={{ color: outcomeColor(thread.clipOutcome), fontWeight: 600 }}>{thread.clipOutcome}</span>
                    )}
                    {thread.clipCategory && <span>{thread.clipCategory}</span>}
                    {thread.reviewDate && <span>· {fmtDate(thread.reviewDate)}</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    Review discussion
                    {thread.reviewDate && ` · ${fmtDate(thread.reviewDate)}`}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {/* Watch Clip button for tagged threads */}
                {thread.tagId && (
                  <button
                    onClick={e => { e.stopPropagation(); onWatchClip(thread.reviewId, thread.tagId!); }}
                    className="primary"
                    style={{ fontSize: 11, padding: "3px 10px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
                    title="Open review and jump to this clip"
                  >
                    <Play size={10} /> Watch Clip
                  </button>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(139,92,246,.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,.25)" }}>
                  {thread.commentCount} comment{thread.commentCount !== 1 ? "s" : ""}
                </span>
                <span className="hint" style={{ fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Thread body */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Clip context card (expanded) */}
                {hasClip && (
                  <div style={{ padding: "8px 12px", background: "var(--panel3)", borderRadius: 8, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ color: "var(--muted)" }}>Clip · {thread.clipTime}</span>
                      {thread.clipOutcome && <span style={{ color: outcomeColor(thread.clipOutcome), fontWeight: 700 }}>{thread.clipOutcome}</span>}
                      {thread.clipCategory && <span style={{ color: "var(--muted)" }}>{thread.clipCategory}</span>}
                    </div>
                    <button
                      onClick={() => onWatchClip(thread.reviewId, thread.tagId!)}
                      className="primary"
                      style={{ fontSize: 12, padding: "4px 12px", display: "flex", alignItems: "center", gap: 5, flexShrink: 0, whiteSpace: "nowrap" }}
                    >
                      <Play size={12} /> Watch Clip
                    </button>
                  </div>
                )}

                {/* Comment bubbles */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {thread.comments.map(c => {
                    const isMe = c.userId === userId;
                    return (
                      <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 2 }}>
                        <div style={{
                          maxWidth: "80%",
                          background: isMe ? "rgba(165,106,27,.14)" : "var(--panel3)",
                          border: `1px solid ${isMe ? "rgba(165,106,27,.3)" : "var(--border)"}`,
                          borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                          padding: "8px 12px",
                        }}>
                          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {c.message}
                          </p>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          {isMe ? "You" : c.authorName} · {fmt(c.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Reply box */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <textarea
                    value={drafts[key] ?? ""}
                    onChange={e => setDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(thread); }}
                    placeholder="Add a reply…"
                    rows={2}
                    style={{ flex: 1, resize: "none", minHeight: 56, fontSize: 13 }}
                  />
                  <button
                    className="primary"
                    style={{ padding: "8px 14px", flexShrink: 0, alignSelf: "flex-end" }}
                    disabled={sending === key || !(drafts[key] ?? "").trim()}
                    onClick={() => sendReply(thread)}
                  >
                    <Send size={14} />
                  </button>
                </div>

                {/* Dismiss / restore */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => toggleDismiss(key)}
                    style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                  >
                    {dismissed.has(key) ? "Restore thread" : "Dismiss thread"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Show dismissed count + restore link */}
      {dismissed.size > 0 && (
        <p style={{ marginTop: 16, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
          {dismissed.size} dismissed thread{dismissed.size !== 1 ? "s" : ""} ·{" "}
          <button
            onClick={() => { setDismissed(new Set()); saveSet(dismissedKey(userId), new Set()); }}
            style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Show all
          </button>
        </p>
      )}
    </div>
  );
}
