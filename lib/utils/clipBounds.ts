import type { CodedTag } from "@/lib/types/reviews";

// ── Canonical timing constants ────────────────────────────────────────────────
//
// New clips (start_time_seconds IS NOT NULL):
//   adjusted_seconds   = incident timestamp in video coordinates
//   start_time_seconds = max(incident - PRE_ROLL, 0)  — saved explicitly
//   end_time_seconds   = educator-selected end, or null → defaults to incident + POST_ROLL
//
// Default clip: incident=40, start=35, end=45, duration=10 s
//
// Legacy clips (start_time_seconds IS NULL) — two forms existed:
//   mode="video":     adjusted_seconds = incident time, historical viewers applied -5
//   mode="non-video": adjusted_seconds = incident - 10 (baked in), viewers applied -5
//                     making the effective start incident - 15. We instead treat
//                     adjusted_seconds as the clip start directly (no further pre-roll).
//
// The canonical pre-roll constant only applies to new clips.
export const CLIP_PRE_ROLL = 5;
export const CLIP_DEFAULT_POST_ROLL = 5;

// ── resolveClipBounds ─────────────────────────────────────────────────────────

export type ClipBounds = {
  startTime: number;
  /** The stored incident timestamp (= adjusted_seconds). Useful for timeline display. */
  incidentTime: number;
  endTime: number;
};

/**
 * Resolves playback start and end for a clip.
 *
 * Legacy compatibility (startTimeSeconds is null):
 *   video-mode   → startTime = max(adjusted_seconds − 5, 0)   (historical 5 s pre-roll)
 *   non-video    → startTime = max(adjusted_seconds, 0)        (−10 was baked in at save time)
 *
 * Canonical (startTimeSeconds is not null):
 *   startTime = startTimeSeconds  (always use the explicit saved value)
 */
export function resolveClipBounds(
  tag: Pick<CodedTag, "adjustedSeconds" | "startTimeSeconds" | "endTimeSeconds" | "mode">,
  videoDuration?: number,
): ClipBounds {
  let startTime: number;
  let incidentTime: number;

  if (tag.startTimeSeconds != null) {
    // ── Canonical form ──────────────────────────────────────────────────────
    // adjusted_seconds = incident timestamp; start_time_seconds = incident − 10
    startTime = Math.max(0, tag.startTimeSeconds);
    incidentTime = tag.adjustedSeconds;
  } else if (tag.mode === "non-video") {
    // ── Legacy non-video ────────────────────────────────────────────────────
    // adjusted_seconds = incident − 10 (baked in at coding time)
    // → start  = adjusted_seconds
    // → incident = adjusted_seconds + 10
    startTime = Math.max(0, tag.adjustedSeconds);
    incidentTime = tag.adjustedSeconds + 10;
  } else {
    // ── Legacy video ────────────────────────────────────────────────────────
    // adjusted_seconds = incident timestamp; historical viewer applied −5
    incidentTime = tag.adjustedSeconds;
    startTime = Math.max(0, incidentTime - 5);
  }

  // Default end derived from the resolved incident time, not from adjusted_seconds
  const rawEnd = tag.endTimeSeconds ?? incidentTime + CLIP_DEFAULT_POST_ROLL;
  const endTime = videoDuration != null
    ? Math.min(rawEnd, videoDuration)
    : rawEnd;

  return { startTime, incidentTime, endTime: Math.max(endTime, startTime + 0.5) };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Formats seconds as M:SS.d for display in the clip timeline UI */
export function formatClipTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}
