"use client";

import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RefEvalSession } from "@/lib/types/auth";

type Comment = {
  id: string;
  userId: string;
  authorName: string;
  message: string;
  createdAt: string;
};

function formatTs(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ReviewComments({
  reviewId,
  tagId,
  session,
  onRead,
}: {
  reviewId: string;
  tagId?: string;
  session: RefEvalSession | null;
  onRead?: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reviewId) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, tagId]);

  async function markRead() {
    if (!session?.user.id || !tagId) return;
    const now = new Date().toISOString();
    await getSupabaseClient()
      .from("review_comment_reads")
      .upsert(
        { user_id: session.user.id, review_id: reviewId, tag_id: tagId, last_read_at: now, updated_at: now },
        { onConflict: "user_id,review_id,tag_id" }
      );
    onRead?.();
  }

  async function load() {
    setLoading(true);
    let q = getSupabaseClient()
      .from("review_comments")
      .select("id, user_id, author_name, message, created_at")
      .eq("review_id", reviewId);
    if (tagId) {
      q = q.eq("tag_id", tagId);
    } else {
      q = q.is("tag_id", null);
    }
    const { data, error: fetchErr } = await q.order("created_at", { ascending: true });
    if (!fetchErr) {
      setComments(
        (data || []).map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          authorName: c.author_name || "Unknown",
          message: c.message,
          createdAt: c.created_at,
        }))
      );
    }
    setLoading(false);
    // Mark thread as read whenever comments are loaded/viewed
    await markRead();
  }

  async function send() {
    const msg = draft.trim();
    if (!msg || !session || sending) return;
    setSending(true);
    setError("");
    const { error: insertErr } = await getSupabaseClient()
      .from("review_comments")
      .insert({
        review_id: reviewId,
        tag_id: tagId ?? null,
        user_id: session.user.id,
        author_name: session.profile.name,
        message: msg,
      });
    if (insertErr) {
      setError(insertErr.message);
      setSending(false);
      return;
    }
    setDraft("");
    setSending(false);
    await load();
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }

  const label = tagId ? "Comments on this clip" : "Discussion";

  return (
    <section className="panel disc-panel">
      <div className="disc-header">
        <h2 style={{ margin: 0 }}>
          💬 {label}
        </h2>
        {!loading && (
          <span className="disc-count">{comments.length} {comments.length === 1 ? "comment" : "comments"}</span>
        )}
      </div>

      {loading ? (
        <p className="hint" style={{ padding: "12px 0" }}>Loading…</p>
      ) : (
        <div className="disc-list" ref={listRef}>
          {comments.length === 0 ? (
            <p className="hint disc-empty">No comments yet. Be the first to add feedback.</p>
          ) : (
            comments.map(c => {
              const isMe = c.userId === session?.user.id;
              return (
                <div key={c.id} className={"disc-message" + (isMe ? " disc-mine" : "")}>
                  <div className="disc-meta">
                    <span className="disc-author">{c.authorName}</span>
                    <span className="disc-time">{formatTs(c.createdAt)}</span>
                  </div>
                  <div className="disc-bubble">
                    <p className="disc-text">{c.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="disc-reply-area">
        {error && <p className="danger-text" style={{ margin: "0 0 4px" }}>{error}</p>}
        <div className="disc-compose">
          <textarea
            className="disc-textarea"
            placeholder="Write a comment…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            rows={3}
            disabled={sending}
          />
          <button
            className="primary disc-send"
            onClick={send}
            disabled={!draft.trim() || sending}
          >
            <Send size={15} />
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        <p className="hint" style={{ fontSize: 11 }}>
          Ctrl+Enter / ⌘+Enter to send
        </p>
      </div>
    </section>
  );
}
