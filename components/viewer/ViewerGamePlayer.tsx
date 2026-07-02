"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
import type { ViewOnlyGame } from "@/lib/types/viewOnlyGames";

interface Props {
  game: ViewOnlyGame;
  onBack: () => void;
}

function formatTime(s: number) {
  const total = Math.max(0, Math.floor(s));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function ViewerGamePlayer({ game, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);

  const [youtubeCurrent, setYoutubeCurrent] = useState(0);
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [videoCurrent, setVideoCurrent] = useState(0);

  const youtubeVideoId = getYouTubeId(game.videoUrl);
  const usingYouTube = !!youtubeVideoId;
  const usingDirect = !usingYouTube && isDirectVideoUrl(game.videoUrl);
  const unsupported = !!game.videoUrl && !usingYouTube && !usingDirect;

  const currentSeconds = usingYouTube ? youtubeCurrent : videoCurrent;

  // YouTube player setup
  useEffect(() => {
    if (!usingYouTube) return;
    let cancelled = false;

    function loadPlayer() {
      if (cancelled || !youtubeContainerRef.current || !window.YT?.Player) return;
      if (youtubePlayerRef.current?.destroy) {
        try { youtubePlayerRef.current.destroy(); } catch {}
        youtubePlayerRef.current = null;
      }
      setYoutubeReady(false);
      youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
        videoId: youtubeVideoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => setYoutubeReady(true),
          onStateChange: (e: any) => setYoutubeCurrent(e.target.getCurrentTime?.() || 0),
        },
      });
    }

    if (window.YT?.Player) {
      loadPlayer();
    } else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }
      window.onYouTubeIframeAPIReady = loadPlayer;
    }

    return () => {
      cancelled = true;
      if (youtubePlayerRef.current?.destroy) {
        try { youtubePlayerRef.current.destroy(); } catch {}
        youtubePlayerRef.current = null;
      }
    };
  }, [usingYouTube, youtubeVideoId]);

  // YouTube time polling
  useEffect(() => {
    if (!usingYouTube) return;
    const interval = setInterval(() => {
      if (youtubePlayerRef.current?.getCurrentTime) {
        setYoutubeCurrent(youtubePlayerRef.current.getCurrentTime() || 0);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [usingYouTube]);

  function playPause() {
    if (usingYouTube) {
      if (!youtubePlayerRef.current) return;
      const state = youtubePlayerRef.current.getPlayerState?.();
      state === 1 ? youtubePlayerRef.current.pauseVideo() : youtubePlayerRef.current.playVideo();
    } else {
      const v = videoRef.current;
      if (!v) return;
      v.paused ? v.play() : v.pause();
    }
  }

  function seek(delta: number) {
    if (usingYouTube) {
      if (!youtubePlayerRef.current?.seekTo) return;
      const next = Math.max(0, youtubeCurrent + delta);
      youtubePlayerRef.current.seekTo(next, true);
      setYoutubeCurrent(next);
    } else {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, v.currentTime + delta);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      {/* Back + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ padding: "6px 14px", fontSize: 13 }}>
          ← Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>{game.title}</h2>
          {game.gameDate && (
            <p className="hint" style={{ margin: "2px 0 0", fontSize: 12 }}>
              {new Date(game.gameDate).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Video area */}
      {usingYouTube ? (
        <>
          <div
            className="video-placeholder"
            style={{ aspectRatio: "16/9", overflow: "hidden", padding: 0 }}
          >
            <div ref={youtubeContainerRef} style={{ width: "100%", height: "100%" }} />
          </div>
          <p className="hint" style={{ marginTop: 4, fontSize: 12 }}>
            YouTube · {formatTime(youtubeCurrent)}
            {youtubeReady ? "" : " · loading…"}
          </p>
        </>
      ) : usingDirect ? (
        <video
          ref={videoRef}
          controls
          src={game.videoUrl}
          style={{ width: "100%", borderRadius: 6 }}
          onTimeUpdate={e => setVideoCurrent(e.currentTarget.currentTime)}
        />
      ) : unsupported ? (
        <div
          className="video-placeholder"
          style={{
            aspectRatio: "16/9",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
            Video is not compatible with RefCoach.
          </p>
          <p className="hint" style={{ margin: 0 }}>
            Please contact your educator to use a YouTube link or direct video file.
          </p>
        </div>
      ) : (
        <div
          className="video-placeholder"
          style={{
            aspectRatio: "16/9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p className="hint">No video URL set for this game.</p>
        </div>
      )}

      {/* Playback controls — only for YouTube and direct video */}
      {(usingYouTube || usingDirect) && (
        <div className="toolbar" style={{ marginTop: 8 }}>
          <button onClick={() => seek(-5)}>-5s</button>
          <button onClick={playPause}>
            <Play size={15} /> / <Pause size={15} />
          </button>
          <button onClick={() => seek(5)}>+5s</button>
          {usingYouTube && (
            <span className="hint" style={{ fontSize: 12, marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(currentSeconds)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
