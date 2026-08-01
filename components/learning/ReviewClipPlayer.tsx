"use client";

import { ClipRangeVideoPlayer } from "@/components/common/ClipRangeVideoPlayer";

interface Props {
  videoLink: string;
  startSeconds: number;
  /** Absolute video timestamp to stop at (takes priority over durationSeconds) */
  endSeconds?: number;
  /** Legacy: duration in seconds from startSeconds. Used when endSeconds is not provided. */
  durationSeconds?: number;
}

/** Thin wrapper around the shared clip player for single, non-switching clip previews (e.g. quiz resource clips). */
export function ReviewClipPlayer({ videoLink, startSeconds, endSeconds, durationSeconds }: Props) {
  const resolvedEnd = endSeconds ?? (startSeconds + (durationSeconds ?? 10));
  return (
    <ClipRangeVideoPlayer
      videoLink={videoLink}
      clipKey={`${videoLink}|${startSeconds}|${resolvedEnd}`}
      startTime={startSeconds}
      endTime={resolvedEnd}
      style={{ borderRadius: 10 }}
    />
  );
}
