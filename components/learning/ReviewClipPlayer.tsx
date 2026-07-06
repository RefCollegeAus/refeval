"use client";

import { useState, useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";

// Shared rewatch overlay
function RewatchOverlay({ onRewatch }: { onRewatch: () => void }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 10,
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

// ── YouTube clip player ───────────────────────────────────────────────────────

function YoutubeClipPlayer({ ytId, startSeconds, durationSeconds }: {
  ytId: string;
  startSeconds: number;
  durationSeconds: number;
}) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const playerRef     = useRef<any>(null);
  const cancelledRef  = useRef(false);
  const endedRef      = useRef(false);
  const [ended, setEnded] = useState(false);

  // Create / recreate YT player when ytId or startSeconds changes
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
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: 1 },
        events: {
          onReady: () => {
            if (cancelledRef.current) return;
            playerRef.current?.seekTo?.(startSeconds, true);
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
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        createPlayer();
      };
    }

    return () => {
      cancelledRef.current = true;
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytId, startSeconds]);

  // Poll current time every 250 ms; enforce duration limit
  useEffect(() => {
    const interval = setInterval(() => {
      if (endedRef.current || !playerRef.current) return;
      const state: number = playerRef.current.getPlayerState?.() ?? -1;
      if (state !== 1) return; // 1 = playing
      const t: number = playerRef.current.getCurrentTime?.() ?? 0;
      if (t >= startSeconds + durationSeconds) {
        playerRef.current.pauseVideo?.();
        endedRef.current = true;
        setEnded(true);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [startSeconds, durationSeconds]);

  function handleRewatch() {
    endedRef.current = false;
    setEnded(false);
    playerRef.current?.seekTo?.(startSeconds, true);
    playerRef.current?.playVideo?.();
  }

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {ended && <RewatchOverlay onRewatch={handleRewatch} />}
    </div>
  );
}

// ── Direct video clip player ──────────────────────────────────────────────────

function DirectClipPlayer({ src, startSeconds, durationSeconds }: {
  src: string;
  startSeconds: number;
  durationSeconds: number;
}) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const endedRef  = useRef(false);
  const [ended, setEnded] = useState(false);

  // Reset when src/startSeconds change (e.g. picker changes clip)
  useEffect(() => {
    endedRef.current = false;
    setEnded(false);
  }, [src, startSeconds]);

  function handleLoaded() {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startSeconds;
    videoRef.current.play().catch(() => {/* autoplay blocked — user will press play */});
  }

  function handleTimeUpdate() {
    if (endedRef.current || !videoRef.current) return;
    if (videoRef.current.currentTime >= startSeconds + durationSeconds) {
      videoRef.current.pause();
      endedRef.current = true;
      setEnded(true);
    }
  }

  function handleRewatch() {
    endedRef.current = false;
    setEnded(false);
    if (videoRef.current) {
      videoRef.current.currentTime = startSeconds;
      videoRef.current.play().catch(() => {});
    }
  }

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#000" }}>
      <video
        ref={videoRef}
        src={src}
        style={{ width: "100%", display: "block", maxHeight: 300 }}
        onLoadedMetadata={handleLoaded}
        onTimeUpdate={handleTimeUpdate}
        onError={e => { (e.currentTarget.parentElement!.style.display = "none"); }}
      />
      {ended && <RewatchOverlay onRewatch={handleRewatch} />}
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

interface Props {
  videoLink: string;
  startSeconds: number;
  durationSeconds: number;
}

export function ReviewClipPlayer({ videoLink, startSeconds, durationSeconds }: Props) {
  const ytId     = getYouTubeId(videoLink);
  const isDirect = !ytId && isDirectVideoUrl(videoLink);

  if (ytId) {
    return <YoutubeClipPlayer ytId={ytId} startSeconds={startSeconds} durationSeconds={durationSeconds} />;
  }
  if (isDirect) {
    return <DirectClipPlayer src={videoLink} startSeconds={startSeconds} durationSeconds={durationSeconds} />;
  }
  return (
    <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "var(--muted)", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)" }}>
      Video unavailable
    </div>
  );
}
