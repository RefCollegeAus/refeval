"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, MessageSquare, Star, Send } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RefEvalSession } from "@/lib/types/auth";
import type { ReviewRecord } from "@/lib/types/reviews";

// ── Types ──────────────────────────────────────────────────────────────────────

type CommentThread = {
  reviewId: string;
  tagId: string | null;
  reviewGame: string;
  reviewDate: string | null;
  commentCount: number;
  lastAt: string;
  comments: CommentRow[];
};

type CommentRow = {
  id: string;
  userId: string;
  authorName: string;
  message: string;
  createdAt: string;
};

// ── Persistence — starred threads ──────────────────────────────────────────────

function starredKey(userId: string) {
  return `refcoach_starred_comment_threads_${userId}`;
}

function loadStarred(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(starredKey(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveStarred(userId: string, set: Set<string>) {
  try {
    localStorage.setItem(starredKey(userId), JSON.stringify(Array.from(set)));
  } catch {}
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

// ── Main component ─────────────────────────────────────────────────────────────

export function RefereeCommentsScreen({
  session,
  myReviews,
  onBack,
}: {
  session: RefEvalSession;
  myReviews: ReviewRecord[];
  onBack: () => void;
}) {
  const userId = session.user.id;
  const [threads, setThreads]   = useState<CommentThread[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "starred">("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [starred, setStarred]   = useState<Set<string>>(() => loadStarred(userId));
  const [drafts, setDrafts]     = useState<Record<string, string>>({});
  const [sending, setSending]   = useState<string | null>(null);

  const reviewById = new Map(myReviews.map(r => [r.id, r]));

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

    // Group by reviewId + tagId
    const map = new Map<string, CommentThread>();
    for (const c of (data ?? [])) {
      const key = threadKey(c.review_id, c.tag_id);
      if (!map.has(key)) {
        const review = reviewById.get(c.review_id);
        map.set(key, {
          reviewId: c.review_id,
          tagId: c.tag_id ?? null,
          reviewGame: review?.game || "Untitled",
          reviewDate: review?.gameDate ?? review?.submittedAt ?? null,
          commentCount: 0,
          lastAt: c.created_at,
          comments: [],
        });
      }
      const thread = map.get(key)!;
      thread.comments.push({
        id: c.id,
        userId: c.user_id,
        authorName: c.author_name || "Unknown",
        message: c.message,
        createdAt: c.created_at,
      });
      thread.commentCount++;
      if (c.created_at > thread.lastAt) thread.lastAt = c.created_at;
    }

    const sorted = Array.from(map.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    setThreads(sorted);
    setLoading(false);
  }, [myReviews]);

  useEffect(() => { load(); }, [load]);

  const toggleStar = useCallback((key: string) => {
    setStarred(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      saveStarred(userId, next);
      return next;
    });
  }, [userId]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKey(prev => prev === key ? null : key);
  }, []);

  const sendReply = useCallback(async (thread: CommentThread) => {
    const key = threadKey(thread.reviewId, thread.tagId);
    const msg = (drafts[key] ?? "").trim();
    if (!msg || sending) return;
    setSending(key);
    await getSupabaseClient().from("review_comments").insert({
      review_id: thread.reviewId,
      tag_id: thread.tagId,
      user_id: userId,
      author_name: session.profile.name,
      message: msg,
    });
    setDrafts(prev => ({ ...prev, [key]: "" }));
    setSending(null);
    await load();
  }, [drafts, sending, userId, session.profile.name, load]);

  const visible = filter === "starred"
    ? threads.filter(t => starred.has(threadKey(t.reviewId, t.tagId)))
    : threads;

  return (
    <div style={{ padding: "20px 20px 60px", maxWidth: 860, margin: "0 auto", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MessageSquare size={22} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Referee Portal</p>
            <h1 style={{ margin: 0, fontSize: 22 }}>My Comments</h1>
            <p className="hint" style={{ margin: "2px 0 0" }}>Comment threads from all your evaluations in one place</p>
          </div>
        </div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <ChevronLeft size={15} /> Back
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["all", "starred"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: 13, padding: "5px 14px", borderRadius: 8,
              background: filter === f ? "rgba(165,106,27,.12)" : "transparent",
              color: filter === f ? "var(--accent)" : "var(--muted)",
              border: `1px solid ${filter === f ? "rgba(165,106,27,.35)" : "var(--border)"}`,
              fontWeight: filter === f ? 700 : 400,
            }}
          >
            {f === "all" ? `All Threads (${threads.length})` : `Starred (${Array.from(starred).filter(k => threads.some(t => threadKey(t.reviewId, t.tagId) === k)).length})`}
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
            {filter === "starred" ? "No starred threads" : "No comment threads yet"}
          </p>
          <p className="hint" style={{ margin: "6px 0 0" }}>
            {filter === "starred"
              ? "Star threads by clicking the ★ icon to save them for easy reference."
              : "Comment threads appear here once you or your educator adds comments to evaluations."}
          </p>
        </div>
      )}

      {/* Thread list */}
      {!loading && visible.map(thread => {
        const key = threadKey(thread.reviewId, thread.tagId);
        const isStarred  = starred.has(key);
        const isExpanded = expandedKey === key;

        return (
          <div
            key={key}
            className="panel"
            style={{
              marginBottom: 10,
              padding: 0,
              overflow: "hidden",
              borderLeft: isStarred ? "3px solid var(--accent)" : undefined,
            }}
          >
            {/* Thread header row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                cursor: "pointer",
              }}
              onClick={() => toggleExpand(key)}
            >
              {/* Star toggle */}
              <button
                onClick={e => { e.stopPropagation(); toggleStar(key); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: isStarred ? "var(--accent)" : "var(--muted)",
                  fontSize: 16, padding: "0 4px", flexShrink: 0,
                }}
                title={isStarred ? "Unstar thread" : "Star thread"}
              >
                <Star size={16} fill={isStarred ? "currentColor" : "none"} />
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {thread.reviewGame}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {thread.tagId ? "Clip comment" : "Review discussion"}
                  {thread.reviewDate && ` · ${fmtDate(thread.reviewDate)}`}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                  background: "rgba(139,92,246,.1)", color: "#a78bfa",
                  border: "1px solid rgba(139,92,246,.25)",
                }}>
                  {thread.commentCount} comment{thread.commentCount !== 1 ? "s" : ""}
                </span>
                <span className="hint" style={{ fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Thread body */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Comments */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {thread.comments.map(c => {
                    const isMe = c.userId === userId;
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMe ? "flex-end" : "flex-start",
                          gap: 2,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "80%",
                            background: isMe ? "rgba(165,106,27,.14)" : "var(--panel3)",
                            border: `1px solid ${isMe ? "rgba(165,106,27,.3)" : "var(--border)"}`,
                            borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                            padding: "8px 12px",
                          }}
                        >
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
