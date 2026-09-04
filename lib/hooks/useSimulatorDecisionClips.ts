"use client";

import { useState, useEffect } from "react";
import type { CodedTag } from "@/lib/types/reviews";

type Result = {
  clips: CodedTag[];
  loading: boolean;
  error: string;
};

// Fetches the coded decision clips for a review-linked Referee Simulator
// session, bypassing RLS (handled server-side by verifying the caller's
// organisation membership/role and the session's publish status).
export function useSimulatorDecisionClips(sessionId: string | null): Result {
  const [clips,   setClips]   = useState<CodedTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    // Clear immediately on every id change (including switching from one
    // valid session to another) so a stale previous session's clips are
    // never shown while the new fetch is in flight.
    setClips([]);
    setError("");

    if (!sessionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ sessionId });
    fetch(`/api/simulator/decision-clips?${params}`)
      .then(res => {
        if (!res.ok) return res.json().then(j => Promise.reject(j.error || "Failed to load decision clips."));
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        setClips(data.clips || []);
      })
      .catch(err => {
        if (cancelled) return;
        console.error("[useSimulatorDecisionClips]", err);
        setError(typeof err === "string" ? err : "Failed to load decision clips.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sessionId]);

  return { clips, loading, error };
}
