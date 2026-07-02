"use client";

import { useState, useEffect } from "react";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";

type Result = {
  reviews: ReviewRecord[];
  tags: CodedTag[];
  loading: boolean;
  error: string;
};

// Fetches reviews + clips for a playlist the current user is assigned to,
// bypassing normal RLS (handled server-side by verifying the assignment row).
export function usePlaylistLearningClips(
  playlistId: string | null,
  assignmentUserId: string | null,
): Result {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [tags,    setTags]    = useState<CodedTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!playlistId || !assignmentUserId) {
      setReviews([]);
      setTags([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ playlistId, assignmentUserId });
    fetch(`/api/playlist/learning-clips?${params}`)
      .then(res => {
        if (!res.ok) return res.json().then(j => Promise.reject(j.error || "Failed to load clips."));
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        setReviews(data.reviews || []);
        setTags(data.tags || []);
      })
      .catch(err => {
        if (cancelled) return;
        console.error("[usePlaylistLearningClips]", err);
        setError(typeof err === "string" ? err : "Failed to load playlist clips.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [playlistId, assignmentUserId]);

  return { reviews, tags, loading, error };
}
