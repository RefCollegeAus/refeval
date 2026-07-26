"use client";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RefEvalSession } from "@/lib/types/auth";

// key: `${reviewId}::${tagId}` — value: number of unread comments
export type UnreadCounts = Record<string, number>;

export function useUnreadCounts(session: RefEvalSession | null) {
  // undefined = initial fetch not yet complete; {} = loaded, all threads read
  const [counts, setCounts] = useState<UnreadCounts | undefined>(undefined);

  async function refresh() {
    if (!session?.user.id) { setCounts({}); return; }

    const [{ data: comments }, { data: reads }] = await Promise.all([
      getSupabaseClient()
        .from("review_comments")
        .select("review_id, tag_id, created_at, user_id")
        .not("tag_id", "is", null),
      getSupabaseClient()
        .from("review_comment_reads")
        .select("review_id, tag_id, last_read_at")
        .eq("user_id", session.user.id),
    ]);

    // Build last-read index using plain object (avoid Map iteration)
    const readMap: Record<string, string> = {};
    for (const r of reads || []) {
      readMap[`${r.review_id}::${r.tag_id}`] = r.last_read_at;
    }

    const result: UnreadCounts = {};
    for (const c of comments || []) {
      if (!c.tag_id) continue;
      if (c.user_id === session.user.id) continue; // never notify for own comments
      const key = `${c.review_id}::${c.tag_id}`;
      const lastRead = readMap[key];
      if (!lastRead || c.created_at > lastRead) {
        result[key] = (result[key] ?? 0) + 1;
      }
    }
    setCounts(result);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [session?.user.id]);

  // Immediately removes a thread's unread entry from local state so the badge
  // disappears the instant the user opens comments, without waiting for the
  // background DB refresh that markRead() triggers via onRead.
  function clearCount(reviewId: string, tagId: string) {
    const key = `${reviewId}::${tagId}`;
    setCounts(prev => {
      if (!prev || !(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }

  const totalUnread = Object.values(counts ?? {}).reduce((s, n) => s + n, 0);

  return { counts, refresh, totalUnread, clearCount };
}
