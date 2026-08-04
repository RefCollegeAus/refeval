"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RefEvalSession } from "@/lib/types/auth";
import { Badge, Button, Card, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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
    <Card className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text">
          <MessageSquare size={15} className="text-muted" />
          {label}
        </h2>
        {!loading && <Badge tone="accent">{comments.length} {comments.length === 1 ? "comment" : "comments"}</Badge>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner size={16} /> Loading comments…
        </div>
      ) : (
        <div ref={listRef} className="grid max-h-72 gap-2.5 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-xs text-muted">No comments yet. Be the first to add feedback.</p>
          ) : (
            comments.map(c => {
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
                        : "rounded-[12px_12px_12px_2px] border-border bg-panel-2",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-text">{c.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="grid gap-1.5 border-t border-border pt-3">
        {error && <p className="text-xs text-red-300">{error}</p>}
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Write a comment…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            rows={3}
            disabled={sending}
            className="flex-1 resize-none"
          />
          <Button variant="primary" className="shrink-0 gap-1.5 self-end" onClick={send} disabled={!draft.trim() || sending}>
            <Send size={15} />
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
        <p className="text-[11px] text-muted">Ctrl+Enter / ⌘+Enter to send</p>
      </div>
    </Card>
  );
}
