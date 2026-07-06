"use client";

import { useState } from "react";
import { CheckCircle2, ListVideo, MessageSquare } from "lucide-react";
import { ClipPreview, outcomeClass } from "@/components/common/ClipPreview";
import type { ClipRow } from "@/components/common/ClipPreview";

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
  const safeIndex   = Math.min(previewIndex, Math.max(0, clipRows.length - 1));
  const previewClip = clipRows.length > 0 ? clipRows[safeIndex] : null;

  if (clipsLoading && clipRows.length === 0) {
    return (
      <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
        <p style={{ margin: 0 }}>Loading clips…</p>
      </div>
    );
  }

  if (!clipsLoading && clipsError && clipRows.length === 0) {
    return (
      <div className="panel" style={{ padding: "24px", borderLeft: "4px solid rgba(239,68,68,.5)" }}>
        <p style={{ margin: 0, fontWeight: 700, color: "#fca5a5" }}>Could not load clips</p>
        <p className="hint" style={{ margin: "6px 0 0" }}>{clipsError}</p>
      </div>
    );
  }

  if (clipRows.length === 0) {
    return (
      <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
        <ListVideo size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ margin: 0, fontWeight: 700 }}>This playlist is empty</p>
        <p className="hint" style={{ margin: "6px 0 0" }}>
          Clips may have been removed from their source reviews, or none have been added yet.
        </p>
      </div>
    );
  }

  return (
    <div className="lh-clip-split">
      {/* Left: ordered clip list */}
      <div
        className="lh-clip-split__list"
        style={{ maxHeight: "72vh", overflowY: "auto", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)" }}
      >
        <div style={{ position: "sticky", top: 0, zIndex: 1, padding: "8px 10px", background: "var(--panel2)", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
              onClick={() => setPreviewIndex(i)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPreviewIndex(i); } }}
              style={{
                display: "flex", gap: 8, padding: "10px 8px 10px 10px",
                borderBottom: "1px solid var(--border)", cursor: "pointer",
                background: isPreviewing ? "var(--panel2)" : isWatched ? "rgba(48,209,88,.04)" : undefined,
                borderLeft: isPreviewing ? "3px solid var(--accent)" : isWatched ? "3px solid rgba(48,209,88,.4)" : "3px solid transparent",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
                  {row.tag.outcome && <span className={outcomeClass(row.tag.outcome)} style={{ fontSize: 11, padding: "1px 6px" }}>{row.tag.outcome}</span>}
                  {row.categoryGroup && <span className="chip" style={{ fontSize: 11 }}>{row.categoryGroup}</span>}
                  <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--muted)", marginLeft: "auto" }}>{row.tag.adjustedTime}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.refereeName}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.review.game || "Untitled game"}</div>
                {row.subtype && <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{row.subtype}</div>}
                {row.creatorNote && (
                  <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                    <MessageSquare size={10} /> Note
                  </div>
                )}
              </div>

              {/* Watched tick */}
              {!isCompleted && (
                <button
                  onClick={e => { e.stopPropagation(); onToggleWatched(row.itemId); }}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: "2px 4px", alignSelf: "center", color: isWatched ? "#30d158" : "var(--muted)" }}
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
      <div style={{ flex: 1, position: "sticky", top: 20 }}>
        <div className="panel">
          <ClipPreview
            clip={previewClip}
            index={safeIndex}
            total={clipRows.length}
            onPrev={() => setPreviewIndex(i => Math.max(0, i - 1))}
            onNext={() => setPreviewIndex(i => Math.min(clipRows.length - 1, i + 1))}
            onOpenReview={onOpenReview}
            learningMode
          />
          {previewClip?.creatorNote && (
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Learning Note</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text)", whiteSpace: "pre-wrap" }}>{previewClip.creatorNote}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
