"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";

// Shared full-size clip player used by both Individual Review and My Learning.
//
// A "clip" here is identified by `clipKey` (typically the coded tag id) — this is
// the signal that drives seeking, independent of whether the underlying video
// source changed. Two clips can share the same videoLink but have different
// start/end times; switching between them must reseek even though the <video>/
// YouTube source itself does not change.

function RewatchOverlay({ onRewatch }: { onRewatch: () => void }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <button
        onClick={onRewatch}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 22px", borderRadius: 99,
          background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.35)",
          color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
          backdropFilter: "blur(4px)",
        }}
      >
        <RotateCcw size={16} /> Rewatch clip
      </button>
    </div>
  );
}

export interface ClipRangeVideoPlayerProps {
  videoLink: string;
  /** Stable identity of the selected clip (e.g. tag id). Drives reseek even when videoLink is unchanged. */
  clipKey: string;
  startTime: number;
  /** Absolute stop time. null/undefined = play through with no enforced stop. */
  endTime?: number | null;
  /** Whether playback should start automatically once seeked. Defaults to true. */
  autoPlay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const BASE_CONTAINER_STYLE: React.CSSProperties = {
  position: "relative", width: "100%", aspectRatio: "16/9",
  background: "#000", overflow: "hidden",
};

export function ClipRangeVideoPlayer({
  videoLink, clipKey, startTime, endTime = null, autoPlay = true, className, style,
}: ClipRangeVideoPlayerProps) {
  const ytId = getYouTubeId(videoLink);
  const isDirect = !ytId && isDirectVideoUrl(videoLink);
  const containerStyle: React.CSSProperties = { ...BASE_CONTAINER_STYLE, ...style };

  if (ytId) {
    return (
      <YoutubeRangePlayer
        ytId={ytId} clipKey={clipKey} startTime={startTime} endTime={endTime} autoPlay={autoPlay}
        containerStyle={containerStyle} className={className}
      />
    );
  }
  if (isDirect) {
    return (
      <DirectRangePlayer
        src={videoLink} clipKey={clipKey} startTime={startTime} endTime={endTime} autoPlay={autoPlay}
        containerStyle={containerStyle} className={className}
      />
    );
  }
  return (
    <div className={className} style={{ ...containerStyle, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.45)", fontSize: 13 }}>
      {videoLink ? "Unsupported video type" : "No video attached"}
    </div>
  );
}

// ── Direct (MP4/WebM) ─────────────────────────────────────────────────────────

function DirectRangePlayer({
  src, clipKey, startTime, endTime, autoPlay, containerStyle, className,
}: {
  src: string; clipKey: string; startTime: number; endTime: number | null; autoPlay: boolean;
  containerStyle: React.CSSProperties; className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const endedRef = useRef(false);
  const [ended, setEnded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Read by the loadedmetadata handler, which is registered once per `src` mount
  // and must not close over a stale clip when only the timestamps change.
  const boundsRef = useRef({ startTime, endTime, autoPlay });
  useEffect(() => { boundsRef.current = { startTime, endTime, autoPlay }; }, [startTime, endTime, autoPlay]);

  // Explicit reseek when the selected clip changes but the video source doesn't —
  // onLoadedMetadata won't refire in that case since the element isn't remounting.
  useEffect(() => {
    endedRef.current = false;
    setEnded(false);
    const el = videoRef.current;
    if (!el || el.readyState < 1) return; // metadata not ready yet — onLoadedMetadata will seek instead
    el.currentTime = startTime;
    if (autoPlay) el.play().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipKey, startTime]);

  function handleLoadedMetadata() {
    endedRef.current = false;
    setEnded(false);
    setLoadError(false);
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = boundsRef.current.startTime;
    if (boundsRef.current.autoPlay) el.play().catch(() => {});
  }

  function handleTimeUpdate() {
    if (endedRef.current) return;
    const el = videoRef.current;
    const end = boundsRef.current.endTime;
    if (!el || end == null) return;
    if (el.currentTime >= end) {
      el.pause();
      endedRef.current = true;
      setEnded(true);
    }
  }

  function rewatch() {
    endedRef.current = false;
    setEnded(false);
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = startTime;
    el.play().catch(() => {});
  }

  return (
    <div className={className} style={containerStyle}>
      {loadError ? (
        <div style={{ padding: 16, color: "var(--muted)", fontSize: 13, display: "flex", flexDirection: "column", gap: 8, height: "100%", boxSizing: "border-box", justifyContent: "center" }}>
          <span>Video could not be loaded.</span>
          <a href={src} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>Open source video ↗</a>
        </div>
      ) : (
        <>
          {/* Remounts on source change so a fresh loadedmetadata always fires for the new video. */}
          <video
            key={src}
            ref={videoRef}
            src={src}
            controls
            style={{ width: "100%", height: "100%", display: "block" }}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onError={() => setLoadError(true)}
          />
          {ended && <RewatchOverlay onRewatch={rewatch} />}
        </>
      )}
    </div>
  );
}

// ── YouTube ────────────────────────────────────────────────────────────────────

function YoutubeRangePlayer({
  ytId, clipKey, startTime, endTime, autoPlay, containerStyle, className,
}: {
  ytId: string; clipKey: string; startTime: number; endTime: number | null; autoPlay: boolean;
  containerStyle: React.CSSProperties; className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const cancelledRef = useRef(false);
  const endedRef = useRef(false);
  const [ended, setEnded] = useState(false);

  const boundsRef = useRef({ startTime, endTime, autoPlay });
  useEffect(() => { boundsRef.current = { startTime, endTime, autoPlay }; }, [startTime, endTime, autoPlay]);

  // Create / recreate the YT player only when the underlying video actually changes.
  useEffect(() => {
    cancelledRef.current = false;
    endedRef.current = false;
    setEnded(false);

    function createPlayer() {
      if (cancelledRef.current || !containerRef.current || !window.YT?.Player) return;
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: ytId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            if (cancelledRef.current) return;
            playerRef.current?.seekTo?.(boundsRef.current.startTime, true);
            if (boundsRef.current.autoPlay) playerRef.current?.playVideo?.();
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
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); createPlayer(); };
    }

    return () => {
      cancelledRef.current = true;
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytId]);

  // Reselecting a different clip on the SAME video: seek without recreating the player.
  useEffect(() => {
    endedRef.current = false;
    setEnded(false);
    if (!playerRef.current?.seekTo) return; // player not ready yet — onReady above uses latest bounds
    playerRef.current.seekTo(startTime, true);
    if (autoPlay) playerRef.current.playVideo?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipKey]);

  // Poll for the clip's end boundary (only enforced when endTime is set).
  useEffect(() => {
    const interval = setInterval(() => {
      if (endedRef.current || !playerRef.current) return;
      const end = boundsRef.current.endTime;
      if (end == null) return;
      const state: number = playerRef.current.getPlayerState?.() ?? -1;
      if (state !== 1) return; // 1 = playing
      const t: number = playerRef.current.getCurrentTime?.() ?? 0;
      if (t >= end) {
        playerRef.current.pauseVideo?.();
        endedRef.current = true;
        setEnded(true);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  function rewatch() {
    endedRef.current = false;
    setEnded(false);
    playerRef.current?.seekTo?.(startTime, true);
    playerRef.current?.playVideo?.();
  }

  return (
    <div className={className} style={containerStyle}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {ended && <RewatchOverlay onRewatch={rewatch} />}
    </div>
  );
}
