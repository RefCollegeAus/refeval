"use client";

import { useEffect, useRef, useState } from "react";
import { ListVideo, ChevronLeft, ChevronRight, ExternalLink, RotateCcw } from "lucide-react";
import type { ReviewRecord, CodedTag, RefSlot } from "@/lib/types/reviews";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
import { resolveClipBounds } from "@/lib/utils/clipBounds";

// ── Shared types and helpers ──────────────────────────────────────────────────

export type ClipRow = {
  tag: CodedTag;
  review: ReviewRecord;
  refereeName: string;
  categoryGroup: string;
  subtype: string;
};

export function splitCategory(cat?: string): [string, string] {
  if (!cat) return ["", ""];
  const idx = cat.indexOf(" — ");
  if (idx === -1) return [cat, ""];
  return [cat.slice(0, idx), cat.slice(idx + 3)];
}

export function slotName(slot: RefSlot, r: ReviewRecord): string {
  if (slot === "Referee 1") return r.referee1Name || "Crew Chief";
  if (slot === "Referee 2") return r.referee2Name || "Umpire 1";
  if (slot === "Referee 3") return r.referee3Name || "Umpire 2";
  return "All Officials";
}

export function outcomeClass(outcome?: string) {
  if (!outcome) return "";
  const o = outcome.toLowerCase();
  if (o.includes("incorrect") || o.includes("missed")) return "status incorrect";
  if (o.includes("correct")) return "status done";
  if (o.includes("review")) return "status review";
  return "";
}

// ── MetaRow ───────────────────────────────────────────────────────────────────

function MetaRow({ label, value, bold, mono }: { label: string; value?: string; bold?: boolean; mono?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ color: "var(--text)", fontWeight: bold ? 600 : 400, fontVariantNumeric: mono ? "tabular-nums" : undefined }}>{value}</span>
    </div>
  );
}

// ── Rewatch overlay ───────────────────────────────────────────────────────────

function RewatchOverlay({ onRewatch }: { onRewatch: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button
        onClick={onRewatch}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 99, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.35)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}
      >
        <RotateCcw size={16} /> Rewatch clip
      </button>
    </div>
  );
}

// ── ClipPreview ───────────────────────────────────────────────────────────────

export interface ClipPreviewProps {
  clip: ClipRow | null;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onOpenReview: (reviewId: string) => void;
  /** Extra action buttons rendered above Open Full Review */
  extraActions?: React.ReactNode;
  /** When true, hides internal evaluation fields (referee, educator, game, notes) and Open Full Review */
  learningMode?: boolean;
}

export function ClipPreview({ clip, index, total, onPrev, onNext, onOpenReview, extraActions, learningMode }: ClipPreviewProps) {
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekTargetRef = useRef<number>(0);
  const endTargetRef = useRef<number>(0);
  const prevVideoIdRef = useRef<string>("");
  const cancelledRef = useRef(false);
  const endedRef = useRef(false);
  const [ended, setEnded] = useState(false);

  const videoId = clip ? getYouTubeId(clip.review.videoLink) : "";
  const isDirect = clip ? (!videoId && isDirectVideoUrl(clip.review.videoLink)) : false;

  const { startTime, endTime } = clip
    ? resolveClipBounds(clip.tag)
    : { startTime: 0, endTime: 10 };

  // Reset ended state when clip changes
  useEffect(() => {
    endedRef.current = false;
    setEnded(false);
    endTargetRef.current = endTime;
  }, [clip?.tag.id, endTime]);

  // Direct video: seek when clip changes
  useEffect(() => {
    if (!clip || !isDirect || !videoRef.current) return;
    endedRef.current = false;
    setEnded(false);
    videoRef.current.currentTime = startTime;
  }, [clip?.tag.id, isDirect, startTime]);

  // YouTube player lifecycle
  useEffect(() => {
    cancelledRef.current = false;

    if (!clip || !videoId) {
      if (ytPlayerRef.current?.destroy) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      prevVideoIdRef.current = "";
      return;
    }

    seekTargetRef.current = startTime;
    endTargetRef.current = endTime;
    endedRef.current = false;
    setEnded(false);

    const isSameVideo = videoId === prevVideoIdRef.current;
    prevVideoIdRef.current = videoId;

    if (isSameVideo && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(startTime, true);
      return;
    }

    if (ytPlayerRef.current?.loadVideoById) {
      ytPlayerRef.current.loadVideoById({ videoId, startSeconds: Math.floor(startTime) });
      return;
    }

    function createPlayer() {
      if (cancelledRef.current || !ytContainerRef.current || !window.YT?.Player) return;
      if (ytPlayerRef.current?.destroy) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            if (!cancelledRef.current) {
              ytPlayerRef.current?.seekTo?.(seekTargetRef.current, true);
            }
          },
        },
      });
    }

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      cancelledRef.current = true;
      if (ytPlayerRef.current?.destroy) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      prevVideoIdRef.current = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Poll YouTube for end boundary
  useEffect(() => {
    if (!videoId) return;
    const interval = setInterval(() => {
      if (endedRef.current || !ytPlayerRef.current) return;
      const state: number = ytPlayerRef.current.getPlayerState?.() ?? -1;
      if (state !== 1) return;
      const t: number = ytPlayerRef.current.getCurrentTime?.() ?? 0;
      if (t >= endTargetRef.current) {
        ytPlayerRef.current.pauseVideo?.();
        endedRef.current = true;
        setEnded(true);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [videoId]);

  function handleYtRewatch() {
    endedRef.current = false;
    setEnded(false);
    ytPlayerRef.current?.seekTo?.(seekTargetRef.current, true);
    ytPlayerRef.current?.playVideo?.();
  }

  function handleDirectRewatch() {
    endedRef.current = false;
    setEnded(false);
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(() => {});
    }
  }

  if (!clip) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, color: "var(--muted)", gap: 10 }}>
        <ListVideo size={36} style={{ opacity: 0.25 }} />
        <p style={{ margin: 0, fontSize: 14 }}>Select a clip to preview</p>
      </div>
    );
  }

  const { tag, review, refereeName, categoryGroup, subtype } = clip;
  const gameDate = review.gameDate || review.createdAt.slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Video */}
      <div className="clip-video-frame" style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: 10, overflow: "hidden", border: "2px solid var(--accent)", boxSizing: "border-box" }}>
        {videoId ? (
          <>
            <div ref={ytContainerRef} style={{ width: "100%", height: "100%" }} />
            {ended && <RewatchOverlay onRewatch={handleYtRewatch} />}
          </>
        ) : isDirect ? (
          <>
            <video
              ref={videoRef}
              src={clip.review.videoLink}
              controls
              style={{ width: "100%", height: "100%", display: "block" }}
              onLoadedMetadata={() => {
                endedRef.current = false;
                setEnded(false);
                if (videoRef.current) videoRef.current.currentTime = startTime;
              }}
              onTimeUpdate={() => {
                if (endedRef.current || !videoRef.current) return;
                if (videoRef.current.currentTime >= endTargetRef.current) {
                  videoRef.current.pause();
                  endedRef.current = true;
                  setEnded(true);
                }
              }}
            />
            {ended && <RewatchOverlay onRewatch={handleDirectRewatch} />}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
            {clip.review.videoLink ? "Unsupported video type" : "No video attached"}
          </div>
        )}
      </div>

      {/* Prev / Next */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button onClick={onPrev} disabled={index === 0} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, padding: "5px 12px" }}>
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{index + 1} / {total}</span>
        <button onClick={onNext} disabled={index === total - 1} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, padding: "5px 12px" }}>
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* Metadata */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        {!learningMode && <MetaRow label="Referee" value={refereeName} bold />}
        {!learningMode && <MetaRow label="Educator" value={review.educatorName} />}
        {!learningMode && <MetaRow label="Game" value={review.game || "Untitled"} />}
        {!learningMode && <MetaRow label="Date" value={new Date(gameDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} />}
        <MetaRow label="Timestamp" value={tag.adjustedTime} mono />
        {tag.outcome && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Outcome</span>
            <span className={outcomeClass(tag.outcome)} style={{ alignSelf: "flex-start" }}>{tag.outcome}</span>
          </div>
        )}
        {categoryGroup && <MetaRow label="Category" value={categoryGroup} />}
        {subtype && <MetaRow label="Subtype" value={subtype} />}
        {!learningMode && tag.position && <MetaRow label="Position" value={tag.position} />}
        {!learningMode && tag.coverage && <MetaRow label="Coverage" value={tag.coverage} />}
        {!learningMode && tag.notes && (
          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</span>
            <span style={{ color: "var(--text)" }}>{tag.notes}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        {extraActions}
        {!learningMode && (
          <button
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}
            onClick={() => onOpenReview(review.id)}
          >
            <ExternalLink size={13} /> Open Full Review
          </button>
        )}
      </div>
    </div>
  );
}
