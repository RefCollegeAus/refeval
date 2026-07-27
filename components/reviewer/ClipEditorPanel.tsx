"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
import { formatClipTime } from "@/lib/utils/clipBounds";

// ── Constants ─────────────────────────────────────────────────────────────────
export const DEFAULT_TIMELINE_WINDOW_SECONDS = 120;
export const TIMELINE_EXTENSION_SECONDS = 60;

// ── Viewport helpers ──────────────────────────────────────────────────────────

/** Compute the initial focused viewport centred on the incident. */
export function computeInitialViewport(
  incidentSec: number,
  startSec: number,
  endSec: number,
  durationSec: number,
): { start: number; end: number } {
  const WIN = DEFAULT_TIMELINE_WINDOW_SECONDS;
  const halfWin = WIN / 2;

  // Start by centering on the incident
  let wStart = Math.max(0, incidentSec - halfWin);
  let wEnd = wStart + WIN;

  // Clamp right edge to duration when known
  if (durationSec > 0 && wEnd > durationSec) {
    wEnd = durationSec;
    wStart = Math.max(0, wEnd - WIN);
  }

  // Ensure clip bounds are visible even if wider than the default window
  wStart = Math.min(wStart, startSec);
  wEnd = Math.max(wEnd, endSec);

  // Re-clamp to [0, duration]
  if (durationSec > 0) wEnd = Math.min(wEnd, durationSec);
  wStart = Math.max(0, wStart);

  return { start: wStart, end: wEnd };
}

/** Expand viewport by TIMELINE_EXTENSION_SECONDS (half each side, redistribute at boundaries). */
export function extendViewport(
  current: { start: number; end: number },
  durationSec: number,
): { start: number; end: number } {
  const half = TIMELINE_EXTENSION_SECONDS / 2;
  let newStart = current.start - half;
  let newEnd = current.end + half;

  if (newStart < 0) {
    newEnd += -newStart;
    newStart = 0;
  }
  if (durationSec > 0 && newEnd > durationSec) {
    newStart -= newEnd - durationSec;
    newEnd = durationSec;
    newStart = Math.max(0, newStart);
  }

  return { start: newStart, end: newEnd };
}

/** True when the full available range is already visible. */
export function isViewportFull(
  vp: { start: number; end: number },
  durationSec: number,
): boolean {
  if (durationSec <= 0) return false;
  return vp.start <= 0 && vp.end >= durationSec;
}

// ── Percentage helper ─────────────────────────────────────────────────────────

function pct(value: number, vpStart: number, vpEnd: number): number {
  if (vpEnd <= vpStart) return 0;
  return Math.min(100, Math.max(0, ((value - vpStart) / (vpEnd - vpStart)) * 100));
}

// ── Inner: HTML <video> editor ────────────────────────────────────────────────

interface HtmlEditorProps {
  src: string;
  draftStart: number;
  incidentSec: number;
  draftEnd: number;
  vpStart: number;
  vpEnd: number;
  onVpChange: (vp: { start: number; end: number }) => void;
  onDurationKnown: (d: number) => void;
  onStartChange: (s: number) => void;
  onEndChange: (e: number) => void;
  onClearError: () => void;
  codingError: string;
  durationSec: number;
}

function HtmlClipEditor({
  src, draftStart, incidentSec, draftEnd,
  vpStart, vpEnd, onVpChange, onDurationKnown,
  onStartChange, onEndChange, onClearError, codingError, durationSec,
}: HtmlEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(draftStart);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewRAF = useRef<number | null>(null);
  const isPreviewingRef = useRef(false);

  // Sync currentTime display from video events
  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
  }, []);

  const onPlay = useCallback(() => setIsPlaying(true), []);
  const onPause = useCallback(() => setIsPlaying(false), []);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    onDurationKnown(v.duration);
    v.currentTime = draftStart;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStart]);

  // Cleanup preview loop on unmount
  useEffect(() => {
    return () => {
      if (previewRAF.current) cancelAnimationFrame(previewRAF.current);
      isPreviewingRef.current = false;
      videoRef.current?.pause();
    };
  }, []);

  function cancelPreview() {
    isPreviewingRef.current = false;
    if (previewRAF.current) { cancelAnimationFrame(previewRAF.current); previewRAF.current = null; }
    setIsPreviewing(false);
  }

  function seek(t: number) {
    cancelPreview();
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, durationSec > 0 ? Math.min(t, durationSec) : t);
    v.currentTime = clamped;
    setCurrentTime(clamped);
  }

  function togglePlay() {
    cancelPreview();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function startPreview() {
    cancelPreview();
    const v = videoRef.current;
    if (!v) return;
    isPreviewingRef.current = true;
    setIsPreviewing(true);
    v.currentTime = draftStart;

    const loop = () => {
      if (!isPreviewingRef.current) return;
      const vid = videoRef.current;
      if (!vid) { isPreviewingRef.current = false; setIsPreviewing(false); return; }
      if (vid.paused && isPreviewingRef.current) {
        // Still waiting for play or ended
        previewRAF.current = requestAnimationFrame(loop);
        return;
      }
      if (vid.currentTime >= draftEnd) {
        vid.pause();
        vid.currentTime = draftEnd;
        setCurrentTime(draftEnd);
        isPreviewingRef.current = false;
        setIsPreviewing(false);
        return;
      }
      previewRAF.current = requestAnimationFrame(loop);
    };

    const tryPlay = () => {
      const vid = videoRef.current;
      if (!vid || !isPreviewingRef.current) return;
      vid.play().catch(() => { isPreviewingRef.current = false; setIsPreviewing(false); });
      previewRAF.current = requestAnimationFrame(loop);
    };

    // Wait for seeked event before playing
    const onSeeked = () => { v.removeEventListener("seeked", onSeeked); tryPlay(); };
    v.addEventListener("seeked", onSeeked);
    // If already at the right position, seeked may not fire
    if (Math.abs(v.currentTime - draftStart) < 0.05) { v.removeEventListener("seeked", onSeeked); tryPlay(); }
  }

  function rewatchClip() {
    cancelPreview();
    seek(draftStart);
    const v = videoRef.current;
    if (v) v.play().catch(() => {});
  }

  function handleStartDrag(e: React.ChangeEvent<HTMLInputElement>) {
    cancelPreview();
    const val = Math.min(Number(e.target.value), incidentSec - 0.1);
    onStartChange(val);
    seek(val);
    onClearError();
  }

  function handleEndDrag(e: React.ChangeEvent<HTMLInputElement>) {
    cancelPreview();
    const val = Math.max(Number(e.target.value), incidentSec + 0.1);
    onEndChange(val);
    seek(val);
    onClearError();
  }

  function adjustStart(delta: number) {
    cancelPreview();
    const next = Math.max(0, Math.min(draftStart + delta, incidentSec - 0.1));
    onStartChange(next);
    seek(next);
    onClearError();
    maybeExpandViewport(next);
  }

  function adjustEnd(delta: number) {
    cancelPreview();
    const maxEnd = durationSec > 0 ? durationSec : draftEnd + 120;
    const next = Math.max(incidentSec + 0.1, Math.min(draftEnd + delta, maxEnd));
    onEndChange(next);
    seek(next);
    onClearError();
    maybeExpandViewport(next);
  }

  function setStartToCurrent() {
    cancelPreview();
    const t = videoRef.current?.currentTime ?? currentTime;
    if (t >= incidentSec) return; // must be before incident
    const val = Math.max(0, t);
    onStartChange(val);
    onClearError();
    maybeExpandViewport(val);
  }

  function setEndToCurrent() {
    cancelPreview();
    const t = videoRef.current?.currentTime ?? currentTime;
    if (t <= incidentSec) return; // must be after incident
    const maxEnd = durationSec > 0 ? durationSec : t + 120;
    const val = Math.min(t, maxEnd);
    onEndChange(val);
    onClearError();
    maybeExpandViewport(val);
  }

  function maybeExpandViewport(t: number) {
    if (t >= vpStart && t <= vpEnd) return;
    // Expand viewport just enough to include t plus some margin
    const margin = 5;
    const newStart = t < vpStart ? Math.max(0, t - margin) : vpStart;
    const newEnd = t > vpEnd ? (durationSec > 0 ? Math.min(t + margin, durationSec) : t + margin) : vpEnd;
    onVpChange({ start: newStart, end: newEnd });
  }

  function seekFromTimeline(e: React.ChangeEvent<HTMLInputElement>) {
    cancelPreview();
    seek(Number(e.target.value));
  }

  const startPct = pct(draftStart, vpStart, vpEnd);
  const incidentPct = pct(incidentSec, vpStart, vpEnd);
  const endPct = pct(draftEnd, vpStart, vpEnd);
  const playheadPct = pct(currentTime, vpStart, vpEnd);
  const clipDuration = Math.max(0, draftEnd - draftStart).toFixed(1);
  const currentPct = pct(currentTime, vpStart, vpEnd);

  return (
    <div>
      {/* ── Embedded video ── */}
      <div style={{ position: "relative", background: "#000", borderRadius: 10, overflow: "hidden", aspectRatio: "16/9", marginBottom: 8 }}>
        <video
          ref={videoRef}
          src={src}
          style={{ width: "100%", height: "100%", display: "block" }}
          onTimeUpdate={onTimeUpdate}
          onPlay={onPlay}
          onPause={onPause}
          onLoadedMetadata={onLoadedMetadata}
          onError={() => {}}
          playsInline
        />
        {isPreviewing && (
          <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,.65)", color: "#fff", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700, pointerEvents: "none" }}>
            Previewing clip…
          </div>
        )}
      </div>

      {/* ── Current time / duration ── */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
        <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text)", fontWeight: 700 }}>{formatClipTime(currentTime)}</span>
        <span>{durationSec > 0 ? formatClipTime(durationSec) : "—"}</span>
      </div>

      {/* ── Timeline ── */}
      <div style={{ position: "relative", height: 36, marginBottom: 4, userSelect: "none" }}>
        {/* Search track */}
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 6, transform: "translateY(-50%)", background: "rgba(255,255,255,.1)", borderRadius: 3 }} />
        {/* Selected clip highlight */}
        <div style={{ position: "absolute", top: "50%", left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%`, height: 6, transform: "translateY(-50%)", background: "var(--accent)", opacity: 0.6, borderRadius: 3, pointerEvents: "none" }} />

        {/* Playhead */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${currentPct}%`, width: 2, background: "rgba(255,255,255,.7)", transform: "translateX(-50%)", pointerEvents: "none", borderRadius: 1 }} />

        {/* Start handle drag input (invisible range) */}
        <input
          type="range" aria-label="Clip start"
          min={vpStart} max={incidentSec} step={0.1}
          value={draftStart}
          onChange={handleStartDrag}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "col-resize", zIndex: 2 }}
        />
        {/* End handle drag input — sits above start input only for the right portion */}
        <input
          type="range" aria-label="Clip end"
          min={incidentSec} max={vpEnd} step={0.1}
          value={draftEnd}
          onChange={handleEndDrag}
          style={{ position: "absolute", top: 0, left: `${incidentPct}%`, width: `${100 - incidentPct}%`, height: "100%", opacity: 0, cursor: "col-resize", zIndex: 3 }}
        />
        {/* Seekable playhead input */}
        <input
          type="range" aria-label="Seek"
          min={vpStart} max={vpEnd} step={0.1}
          value={currentTime}
          onChange={seekFromTimeline}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 1 }}
        />

        {/* Start dot */}
        <div style={{ position: "absolute", top: "50%", left: `${startPct}%`, width: 12, height: 12, transform: "translate(-50%,-50%)", background: "#fff", border: "2px solid rgba(255,255,255,.5)", borderRadius: "50%", pointerEvents: "none", zIndex: 4 }} title="Clip start" />
        {/* Incident diamond */}
        <div style={{ position: "absolute", top: "50%", left: `${incidentPct}%`, width: 10, height: 10, transform: "translate(-50%,-50%) rotate(45deg)", background: "var(--accent)", border: "2px solid rgba(255,255,255,.5)", pointerEvents: "none", zIndex: 4 }} title="Tagged incident" />
        {/* End diamond */}
        <div style={{ position: "absolute", top: "50%", left: `${endPct}%`, width: 10, height: 10, transform: "translate(-50%,-50%) rotate(45deg)", background: "rgba(255,255,255,.85)", border: "2px solid rgba(255,255,255,.5)", pointerEvents: "none", zIndex: 4 }} title="Clip end" />
      </div>

      {/* ── Marker labels ── */}
      <div style={{ display: "flex", fontSize: 10, color: "var(--muted)", marginBottom: 8, userSelect: "none", position: "relative", height: 28 }}>
        <span style={{ position: "absolute", left: `${startPct}%`, transform: "translateX(-50%)", textAlign: "center", lineHeight: 1.3, whiteSpace: "nowrap" }}>
          ● Start<br />{formatClipTime(draftStart)}
        </span>
        <span style={{ position: "absolute", left: `${incidentPct}%`, transform: "translateX(-50%)", textAlign: "center", lineHeight: 1.3, whiteSpace: "nowrap", color: "var(--accent)", fontWeight: 700 }}>
          ◆<br />{formatClipTime(incidentSec)}
        </span>
        <span style={{ position: "absolute", left: `${endPct}%`, transform: "translateX(-50%)", textAlign: "center", lineHeight: 1.3, whiteSpace: "nowrap" }}>
          ◇ End<br />{formatClipTime(draftEnd)}
        </span>
      </div>

      {/* ── Search range hint ── */}
      <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 8px" }}>
        Search range: {formatClipTime(vpStart)}–{formatClipTime(vpEnd)} &nbsp;·&nbsp; Clip duration: {clipDuration}s
      </p>

      {/* ── Playback controls ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
        <button type="button" onClick={() => seek(currentTime - 5)} style={{ fontSize: 12, padding: "5px 10px" }} aria-label="Rewind 5 seconds">−5s</button>
        <button type="button" onClick={() => seek(currentTime - 1)} style={{ fontSize: 12, padding: "5px 10px" }} aria-label="Rewind 1 second">−1s</button>
        <button type="button" onClick={togglePlay} style={{ padding: "6px 14px", fontWeight: 700 }} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button type="button" onClick={() => seek(currentTime + 1)} style={{ fontSize: 12, padding: "5px 10px" }} aria-label="Forward 1 second">+1s</button>
        <button type="button" onClick={() => seek(currentTime + 5)} style={{ fontSize: 12, padding: "5px 10px" }} aria-label="Forward 5 seconds">+5s</button>
      </div>

      {/* ── Set boundary to current ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8, justifyContent: "center" }}>
        <button type="button" onClick={setStartToCurrent} style={{ fontSize: 11, padding: "4px 10px" }} aria-label="Set clip start to current time">Set Start to Current Time</button>
        <button type="button" onClick={setEndToCurrent} style={{ fontSize: 11, padding: "4px 10px" }} aria-label="Set clip end to current time">Set End to Current Time</button>
      </div>

      {/* ── Fine adjustments ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 34 }}>Start:</span>
          {[[-1, "−1s"], [-0.1, "−0.1s"], [0.1, "+0.1s"], [1, "+1s"]].map(([d, label]) => (
            <button key={label as string} type="button" onClick={() => adjustStart(d as number)} style={{ fontSize: 11, padding: "3px 7px" }} aria-label={`Move start ${label}`}>{label as string}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 34 }}>End:</span>
          {[[-1, "−1s"], [-0.1, "−0.1s"], [0.1, "+0.1s"], [1, "+1s"]].map(([d, label]) => (
            <button key={label as string} type="button" onClick={() => adjustEnd(d as number)} style={{ fontSize: 11, padding: "3px 7px" }} aria-label={`Move end ${label}`}>{label as string}</button>
          ))}
        </div>
      </div>

      {/* ── Preview / Rewatch / Extend ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={startPreview} disabled={isPreviewing} style={{ fontSize: 12, padding: "5px 12px" }} aria-label="Preview clip">
          {isPreviewing ? "Previewing…" : "Preview Clip"}
        </button>
        <button type="button" onClick={rewatchClip} style={{ fontSize: 12, padding: "5px 12px" }} aria-label="Rewatch clip from start">
          <RotateCcw size={12} style={{ marginRight: 4 }} />Rewatch
        </button>
        {/* Extend viewport */}
        <ExtendButton vpStart={vpStart} vpEnd={vpEnd} durationSec={durationSec} onExtend={onVpChange} />
      </div>

      {/* ── Validation error ── */}
      {codingError && <p className="danger-text" style={{ margin: "4px 0 0", fontSize: 12 }}>{codingError}</p>}
    </div>
  );
}

// ── Extend button ─────────────────────────────────────────────────────────────

function ExtendButton({
  vpStart, vpEnd, durationSec, onExtend,
}: { vpStart: number; vpEnd: number; durationSec: number; onExtend: (vp: { start: number; end: number }) => void }) {
  const isFull = isViewportFull({ start: vpStart, end: vpEnd }, durationSec);
  if (isFull) return null;
  return (
    <button
      type="button"
      onClick={() => onExtend(extendViewport({ start: vpStart, end: vpEnd }, durationSec))}
      style={{ fontSize: 12, padding: "5px 12px" }}
      aria-label="Extend search window by 1 minute"
    >
      +1 min
    </button>
  );
}

// ── Inner: YouTube editor ─────────────────────────────────────────────────────

interface YtEditorProps extends Omit<HtmlEditorProps, "src"> {
  ytId: string;
}

function YtClipEditor({
  ytId, draftStart, incidentSec, draftEnd,
  vpStart, vpEnd, onVpChange, onDurationKnown,
  onStartChange, onEndChange, onClearError, codingError, durationSec,
}: YtEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const cancelledRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(draftStart);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const isPreviewingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create YT player on mount
  useEffect(() => {
    cancelledRef.current = false;

    function createPlayer() {
      if (cancelledRef.current || !containerRef.current || !window.YT?.Player) return;
      if (playerRef.current?.destroy) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: ytId,
        width: "100%", height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: 0 },
        events: {
          onReady: () => {
            if (cancelledRef.current) return;
            const dur = playerRef.current?.getDuration?.() || 0;
            if (dur > 0) onDurationKnown(dur);
            playerRef.current?.seekTo?.(draftStart, true);
          },
          onStateChange: (ev: any) => {
            if (cancelledRef.current) return;
            setIsPlaying(ev.data === 1);
            if (ev.data === 0) { setIsPlaying(false); }
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
      (window as any).onYouTubeIframeAPIReady = () => { if (prev) prev(); createPlayer(); };
    }

    return () => {
      cancelledRef.current = true;
      cancelPreviewInternal();
      if (pollRef.current) clearInterval(pollRef.current);
      if (playerRef.current?.pauseVideo) { try { playerRef.current.pauseVideo(); } catch {} }
      if (playerRef.current?.destroy) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytId]);

  // Poll current time every 200ms
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (!playerRef.current) return;
      const t = playerRef.current.getCurrentTime?.() ?? 0;
      setCurrentTime(t);
      const dur = playerRef.current.getDuration?.() || 0;
      if (dur > 0) onDurationKnown(dur);
    }, 200);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancelPreviewInternal() {
    isPreviewingRef.current = false;
    if (previewPollRef.current) { clearInterval(previewPollRef.current); previewPollRef.current = null; }
    setIsPreviewing(false);
  }

  function seek(t: number) {
    cancelPreviewInternal();
    const clamped = Math.max(0, durationSec > 0 ? Math.min(t, durationSec) : t);
    playerRef.current?.seekTo?.(clamped, true);
    setCurrentTime(clamped);
  }

  function togglePlay() {
    cancelPreviewInternal();
    const state = playerRef.current?.getPlayerState?.() ?? -1;
    if (state === 1) playerRef.current?.pauseVideo?.();
    else playerRef.current?.playVideo?.();
  }

  function startPreview() {
    cancelPreviewInternal();
    isPreviewingRef.current = true;
    setIsPreviewing(true);
    playerRef.current?.seekTo?.(draftStart, true);

    // Small delay for seek to complete
    setTimeout(() => {
      if (!isPreviewingRef.current) return;
      playerRef.current?.playVideo?.();
      previewPollRef.current = setInterval(() => {
        if (!isPreviewingRef.current) return;
        const t = playerRef.current?.getCurrentTime?.() ?? 0;
        setCurrentTime(t);
        if (t >= draftEnd) {
          playerRef.current?.pauseVideo?.();
          playerRef.current?.seekTo?.(draftEnd, true);
          setCurrentTime(draftEnd);
          cancelPreviewInternal();
        }
      }, 100);
    }, 300);
  }

  function rewatchClip() {
    cancelPreviewInternal();
    seek(draftStart);
    setTimeout(() => playerRef.current?.playVideo?.(), 200);
  }

  function handleStartDrag(e: React.ChangeEvent<HTMLInputElement>) {
    cancelPreviewInternal();
    const val = Math.min(Number(e.target.value), incidentSec - 0.1);
    onStartChange(val);
    seek(val);
    onClearError();
  }

  function handleEndDrag(e: React.ChangeEvent<HTMLInputElement>) {
    cancelPreviewInternal();
    const val = Math.max(Number(e.target.value), incidentSec + 0.1);
    onEndChange(val);
    seek(val);
    onClearError();
  }

  function adjustStart(delta: number) {
    cancelPreviewInternal();
    const next = Math.max(0, Math.min(draftStart + delta, incidentSec - 0.1));
    onStartChange(next);
    seek(next);
    onClearError();
    maybeExpandViewport(next);
  }

  function adjustEnd(delta: number) {
    cancelPreviewInternal();
    const maxEnd = durationSec > 0 ? durationSec : draftEnd + 120;
    const next = Math.max(incidentSec + 0.1, Math.min(draftEnd + delta, maxEnd));
    onEndChange(next);
    seek(next);
    onClearError();
    maybeExpandViewport(next);
  }

  function setStartToCurrent() {
    cancelPreviewInternal();
    const t = playerRef.current?.getCurrentTime?.() ?? currentTime;
    if (t >= incidentSec) return;
    const val = Math.max(0, t);
    onStartChange(val);
    onClearError();
    maybeExpandViewport(val);
  }

  function setEndToCurrent() {
    cancelPreviewInternal();
    const t = playerRef.current?.getCurrentTime?.() ?? currentTime;
    if (t <= incidentSec) return;
    const maxEnd = durationSec > 0 ? durationSec : t + 120;
    const val = Math.min(t, maxEnd);
    onEndChange(val);
    onClearError();
    maybeExpandViewport(val);
  }

  function maybeExpandViewport(t: number) {
    if (t >= vpStart && t <= vpEnd) return;
    const margin = 5;
    const newStart = t < vpStart ? Math.max(0, t - margin) : vpStart;
    const newEnd = t > vpEnd ? (durationSec > 0 ? Math.min(t + margin, durationSec) : t + margin) : vpEnd;
    onVpChange({ start: newStart, end: newEnd });
  }

  function seekFromTimeline(e: React.ChangeEvent<HTMLInputElement>) {
    cancelPreviewInternal();
    seek(Number(e.target.value));
  }

  const startPct = pct(draftStart, vpStart, vpEnd);
  const incidentPct = pct(incidentSec, vpStart, vpEnd);
  const endPct = pct(draftEnd, vpStart, vpEnd);
  const currentPct = pct(currentTime, vpStart, vpEnd);
  const clipDuration = Math.max(0, draftEnd - draftStart).toFixed(1);

  return (
    <div>
      {/* ── Embedded YT player ── */}
      <div style={{ position: "relative", background: "#000", borderRadius: 10, overflow: "hidden", aspectRatio: "16/9", marginBottom: 8 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        {isPreviewing && (
          <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,.65)", color: "#fff", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700, pointerEvents: "none" }}>
            Previewing clip…
          </div>
        )}
      </div>

      {/* ── Current time / duration ── */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
        <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text)", fontWeight: 700 }}>{formatClipTime(currentTime)}</span>
        <span>{durationSec > 0 ? formatClipTime(durationSec) : "—"}</span>
      </div>

      {/* ── Timeline ── */}
      <div style={{ position: "relative", height: 36, marginBottom: 4, userSelect: "none" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 6, transform: "translateY(-50%)", background: "rgba(255,255,255,.1)", borderRadius: 3 }} />
        <div style={{ position: "absolute", top: "50%", left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%`, height: 6, transform: "translateY(-50%)", background: "var(--accent)", opacity: 0.6, borderRadius: 3, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${currentPct}%`, width: 2, background: "rgba(255,255,255,.7)", transform: "translateX(-50%)", pointerEvents: "none", borderRadius: 1 }} />
        <input type="range" aria-label="Clip start" min={vpStart} max={incidentSec} step={0.1} value={draftStart} onChange={handleStartDrag} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "col-resize", zIndex: 2 }} />
        <input type="range" aria-label="Clip end" min={incidentSec} max={vpEnd} step={0.1} value={draftEnd} onChange={handleEndDrag} style={{ position: "absolute", top: 0, left: `${incidentPct}%`, width: `${100 - incidentPct}%`, height: "100%", opacity: 0, cursor: "col-resize", zIndex: 3 }} />
        <input type="range" aria-label="Seek" min={vpStart} max={vpEnd} step={0.1} value={currentTime} onChange={seekFromTimeline} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 1 }} />
        <div style={{ position: "absolute", top: "50%", left: `${startPct}%`, width: 12, height: 12, transform: "translate(-50%,-50%)", background: "#fff", border: "2px solid rgba(255,255,255,.5)", borderRadius: "50%", pointerEvents: "none", zIndex: 4 }} title="Clip start" />
        <div style={{ position: "absolute", top: "50%", left: `${incidentPct}%`, width: 10, height: 10, transform: "translate(-50%,-50%) rotate(45deg)", background: "var(--accent)", border: "2px solid rgba(255,255,255,.5)", pointerEvents: "none", zIndex: 4 }} title="Tagged incident" />
        <div style={{ position: "absolute", top: "50%", left: `${endPct}%`, width: 10, height: 10, transform: "translate(-50%,-50%) rotate(45deg)", background: "rgba(255,255,255,.85)", border: "2px solid rgba(255,255,255,.5)", pointerEvents: "none", zIndex: 4 }} title="Clip end" />
      </div>

      {/* ── Marker labels ── */}
      <div style={{ position: "relative", height: 28, fontSize: 10, color: "var(--muted)", marginBottom: 8, userSelect: "none" }}>
        <span style={{ position: "absolute", left: `${startPct}%`, transform: "translateX(-50%)", textAlign: "center", lineHeight: 1.3, whiteSpace: "nowrap" }}>● Start<br />{formatClipTime(draftStart)}</span>
        <span style={{ position: "absolute", left: `${incidentPct}%`, transform: "translateX(-50%)", textAlign: "center", lineHeight: 1.3, whiteSpace: "nowrap", color: "var(--accent)", fontWeight: 700 }}>◆<br />{formatClipTime(incidentSec)}</span>
        <span style={{ position: "absolute", left: `${endPct}%`, transform: "translateX(-50%)", textAlign: "center", lineHeight: 1.3, whiteSpace: "nowrap" }}>◇ End<br />{formatClipTime(draftEnd)}</span>
      </div>

      <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 8px" }}>
        Search range: {formatClipTime(vpStart)}–{formatClipTime(vpEnd)} &nbsp;·&nbsp; Clip duration: {clipDuration}s
      </p>

      {/* ── Playback controls ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
        <button type="button" onClick={() => seek(currentTime - 5)} style={{ fontSize: 12, padding: "5px 10px" }} aria-label="Rewind 5 seconds">−5s</button>
        <button type="button" onClick={() => seek(currentTime - 1)} style={{ fontSize: 12, padding: "5px 10px" }} aria-label="Rewind 1 second">−1s</button>
        <button type="button" onClick={togglePlay} style={{ padding: "6px 14px", fontWeight: 700 }} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button type="button" onClick={() => seek(currentTime + 1)} style={{ fontSize: 12, padding: "5px 10px" }} aria-label="Forward 1 second">+1s</button>
        <button type="button" onClick={() => seek(currentTime + 5)} style={{ fontSize: 12, padding: "5px 10px" }} aria-label="Forward 5 seconds">+5s</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8, justifyContent: "center" }}>
        <button type="button" onClick={setStartToCurrent} style={{ fontSize: 11, padding: "4px 10px" }}>Set Start to Current Time</button>
        <button type="button" onClick={setEndToCurrent} style={{ fontSize: 11, padding: "4px 10px" }}>Set End to Current Time</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 34 }}>Start:</span>
          {[[-1, "−1s"], [-0.1, "−0.1s"], [0.1, "+0.1s"], [1, "+1s"]].map(([d, label]) => (
            <button key={label as string} type="button" onClick={() => adjustStart(d as number)} style={{ fontSize: 11, padding: "3px 7px" }}>{label as string}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 34 }}>End:</span>
          {[[-1, "−1s"], [-0.1, "−0.1s"], [0.1, "+0.1s"], [1, "+1s"]].map(([d, label]) => (
            <button key={label as string} type="button" onClick={() => adjustEnd(d as number)} style={{ fontSize: 11, padding: "3px 7px" }}>{label as string}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={startPreview} disabled={isPreviewing} style={{ fontSize: 12, padding: "5px 12px" }}>
          {isPreviewing ? "Previewing…" : "Preview Clip"}
        </button>
        <button type="button" onClick={rewatchClip} style={{ fontSize: 12, padding: "5px 12px" }}>
          <RotateCcw size={12} style={{ marginRight: 4 }} />Rewatch
        </button>
        <ExtendButton vpStart={vpStart} vpEnd={vpEnd} durationSec={durationSec} onExtend={onVpChange} />
      </div>

      {codingError && <p className="danger-text" style={{ margin: "4px 0 0", fontSize: 12 }}>{codingError}</p>}
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export interface ClipEditorPanelProps {
  videoLink: string;
  incidentSeconds: number;
  draftStartSeconds: number;
  setDraftStartSeconds: (s: number) => void;
  /** null → uses incidentSeconds + CLIP_DEFAULT_POST_ROLL at display time */
  draftEndSeconds: number | null;
  setDraftEndSeconds: (s: number | null) => void;
  /** Resolved end (never null) */
  resolvedEndSeconds: number;
  viewportStart: number;
  viewportEnd: number;
  onViewportChange: (vp: { start: number; end: number }) => void;
  codingError: string;
  onClearError: () => void;
}

export function ClipEditorPanel({
  videoLink, incidentSeconds,
  draftStartSeconds, setDraftStartSeconds,
  draftEndSeconds, setDraftEndSeconds,
  resolvedEndSeconds,
  viewportStart, viewportEnd, onViewportChange,
  codingError, onClearError,
}: ClipEditorPanelProps) {
  const [durationSec, setDurationSec] = useState(0);

  const handleDurationKnown = useCallback((d: number) => {
    setDurationSec(prev => (d > 0 && d !== prev ? d : prev));
  }, []);

  const ytId = getYouTubeId(videoLink);
  const isDirect = !ytId && isDirectVideoUrl(videoLink);

  const sharedProps = {
    draftStart: draftStartSeconds,
    incidentSec: incidentSeconds,
    draftEnd: resolvedEndSeconds,
    vpStart: viewportStart,
    vpEnd: viewportEnd,
    onVpChange: onViewportChange,
    onDurationKnown: handleDurationKnown,
    onStartChange: setDraftStartSeconds,
    onEndChange: (s: number) => setDraftEndSeconds(s),
    onClearError,
    codingError,
    durationSec,
  };

  if (ytId) {
    return <YtClipEditor ytId={ytId} {...sharedProps} />;
  }
  if (isDirect) {
    return <HtmlClipEditor src={videoLink} {...sharedProps} />;
  }
  return (
    <div style={{ padding: 16, textAlign: "center", fontSize: 13, color: "var(--muted)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, marginBottom: 8 }}>
      Video preview unavailable for this source type.
      <br /><span style={{ fontSize: 11, opacity: 0.7 }}>Use the controls below to set boundaries manually.</span>
    </div>
  );
}
