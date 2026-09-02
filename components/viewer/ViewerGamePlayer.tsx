"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
import type { ViewOnlyGame } from "@/lib/types/viewOnlyGames";
import { Button } from "@/components/ui";

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
    <div className="mx-auto max-w-[900px] px-4 py-6">
      {/* Back + title */}
      <div className="mb-4 flex items-center gap-3">
        <Button onClick={onBack} variant="secondary" size="sm">
          ← Back
        </Button>
        <div>
          <h2 className="m-0 text-lg">{game.title}</h2>
          {game.gameDate && (
            <p className="hint mt-0.5 text-xs">
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
          <div className="video-placeholder aspect-video overflow-hidden p-0">
            <div ref={youtubeContainerRef} style={{ width: "100%", height: "100%" }} />
          </div>
          <p className="hint mt-1 text-xs">
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
        <div className="video-placeholder flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="m-0 text-sm font-bold">
            Video is not compatible with RefCoach.
          </p>
          <p className="hint m-0">
            Please contact your educator to use a YouTube link or direct video file.
          </p>
        </div>
      ) : (
        <div className="video-placeholder flex aspect-video items-center justify-center">
          <p className="hint">No video URL set for this game.</p>
        </div>
      )}

      {/* Playback controls — only for YouTube and direct video */}
      {(usingYouTube || usingDirect) && (
        <div className="mt-2 flex items-center gap-2">
          <Button onClick={() => seek(-5)} variant="secondary" size="sm">-5s</Button>
          <Button onClick={playPause} variant="secondary" size="sm">
            <Play size={15} /> / <Pause size={15} />
          </Button>
          <Button onClick={() => seek(5)} variant="secondary" size="sm">+5s</Button>
          {usingYouTube && (
            <span className="hint ml-2 text-xs tabular-nums">
              {formatTime(currentSeconds)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
