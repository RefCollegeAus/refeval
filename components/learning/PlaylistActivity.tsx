"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ListVideo, MessageSquare } from "lucide-react";
import { ClipPreview, outcomeClass } from "@/components/common/ClipPreview";
import type { ClipRow } from "@/components/common/ClipPreview";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

export type PlaylistClipRow = ClipRow & { itemId: string; creatorNote: string | null };

interface Props {
  clipRows: PlaylistClipRow[];
  watchedItemIds: Set<string>;
  isCompleted: boolean;
  clipsLoading: boolean;
  clipsError: string;
  onToggleWatched: (itemId: string) => void;
  onOpenReview: (reviewId: string) => void;
}

export function PlaylistActivity({
  clipRows,
  watchedItemIds,
  isCompleted,
  clipsLoading,
  clipsError,
  onToggleWatched,
  onOpenReview,
}: Props) {
  const [previewIndex, setPreviewIndex] = useState(0);
  // Bumped on every row click (even re-clicking the already-previewed clip) so the
  // player restarts from the beginning instead of no-opping when the index is unchanged.
  const [selectionToken, setSelectionToken] = useState(0);
  const safeIndex   = Math.min(previewIndex, Math.max(0, clipRows.length - 1));
  const previewClip = clipRows.length > 0 ? clipRows[safeIndex] : null;
  const videoBoxRef = useRef<HTMLDivElement>(null);

  function selectPreview(i: number) {
    setPreviewIndex(i);
    setSelectionToken(n => n + 1);
    videoBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (clipsLoading && clipRows.length === 0) {
    return (
      <Card className="px-6 py-12 text-center text-muted">
        <p className="m-0">Loading clips…</p>
      </Card>
    );
  }

  if (!clipsLoading && clipsError && clipRows.length === 0) {
    return (
      <Card className="border-l-4 border-l-danger/50">
        <p className="m-0 font-bold text-red-300">Could not load clips</p>
        <p className="mt-1.5 text-[13px] text-muted">{clipsError}</p>
      </Card>
    );
  }

  if (clipRows.length === 0) {
    return (
      <Card className="px-6 py-12 text-center text-muted">
        <ListVideo size={36} className="mb-3 opacity-30" />
        <p className="m-0 font-bold">This playlist is empty</p>
        <p className="mt-1.5 text-[13px] text-muted">
          Clips may have been removed from their source reviews, or none have been added yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="lh-clip-split">
      {/* Left: ordered clip list */}
      <div
        className="lh-clip-split__list max-h-[72vh] overflow-y-auto rounded-lg border border-border bg-panel"
      >
        <div className="sticky top-0 z-[1] border-b border-border bg-panel-2 px-2.5 py-2 text-xs uppercase tracking-wide text-muted">
          {clipRows.length} clip{clipRows.length !== 1 ? "s" : ""}
        </div>

        {clipRows.map((row, i) => {
          const isPreviewing = i === safeIndex;
          const isWatched    = watchedItemIds.has(row.itemId);
          return (
            <div
              key={row.itemId}
              role="button"
              tabIndex={0}
              aria-pressed={isPreviewing}
              aria-label={`Clip ${i + 1}: ${row.categoryGroup}${row.subtype ? ` – ${row.subtype}` : ""}`}
              onClick={() => selectPreview(i)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectPreview(i); } }}
              className={cn(
                "flex cursor-pointer gap-2 border-b border-border py-2.5 pl-2.5 pr-2",
                isPreviewing ? "border-l-4 border-l-accent bg-panel-2" : "border-l-4",
              )}
              // isWatched's #30d158 tint (an iOS-style green distinct from the --good
              // token, matching the checkmark button below) has no exact design-system
              // token, so it stays a literal here rather than shifting the hue.
              style={
                isPreviewing
                  ? undefined
                  : isWatched
                  ? { background: "rgba(48,209,88,.04)", borderLeftColor: "rgba(48,209,88,.4)" }
                  : { borderLeftColor: "transparent" }
              }
            >
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  {row.tag.outcome && <span className={outcomeClass(row.tag.outcome)} style={{ fontSize: 11, padding: "1px 6px" }}>{row.tag.outcome}</span>}
                  {row.categoryGroup && <span className="chip text-xs">{row.categoryGroup}</span>}
                  <span className="ml-auto text-xs tabular-nums text-muted">{row.tag.adjustedTime}</span>
                </div>
                <div className="truncate text-[13px] font-semibold">{row.refereeName}</div>
                <div className="truncate text-xs text-muted">{row.review.game || "Untitled game"}</div>
                {row.subtype && <div className="mt-px truncate text-xs text-muted">{row.subtype}</div>}
                {row.creatorNote && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-accent">
                    <MessageSquare size={10} /> Note
                  </div>
                )}
              </div>

              {/* Watched tick */}
              {!isCompleted && (
                <button
                  onClick={e => { e.stopPropagation(); onToggleWatched(row.itemId); }}
                  className={cn(
                    "shrink-0 self-center border-none bg-none px-1 py-0.5",
                    isWatched ? "text-[#30d158]" : "text-muted",
                  )}
                  title={isWatched ? "Mark as unwatched" : "Mark as watched"}
                >
                  <CheckCircle2 size={16} fill={isWatched ? "currentColor" : "none"} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: sticky preview */}
      <div className="sticky top-5 flex-1">
        {/* Card isn't a forwardRef component, and this element needs a DOM ref for
            scrollIntoView on selection — so its classes are reproduced directly here
            instead of using <Card>. */}
        <div ref={videoBoxRef} className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <ClipPreview
            clip={previewClip}
            index={safeIndex}
            total={clipRows.length}
            onPrev={() => setPreviewIndex(i => Math.max(0, i - 1))}
            onNext={() => setPreviewIndex(i => Math.min(clipRows.length - 1, i + 1))}
            onOpenReview={onOpenReview}
            learningMode
            selectionToken={selectionToken}
          />
          {previewClip?.creatorNote && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Learning Note</p>
              <p className="m-0 whitespace-pre-wrap text-[13px] text-text">{previewClip.creatorNote}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
