"use client";

import { ListVideo, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { ReviewRecord, CodedTag, RefSlot } from "@/lib/types/reviews";
import { resolveClipPlayback } from "@/lib/utils/clipBounds";
import { ClipRangeVideoPlayer } from "@/components/common/ClipRangeVideoPlayer";

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
  /** Bump this on every selection (even re-selecting the current clip) to force the player to restart from the beginning. */
  selectionToken?: number;
}

export function ClipPreview({ clip, index, total, onPrev, onNext, onOpenReview, extraActions, learningMode, selectionToken }: ClipPreviewProps) {
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
  const { startTime, endTime } = resolveClipPlayback(tag);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Video — clipKey (tag id + selection token) drives reseeking, even for same-source clips or re-selecting the current clip */}
      <ClipRangeVideoPlayer
        videoLink={review.videoLink}
        clipKey={selectionToken != null ? `${tag.id}:${selectionToken}` : tag.id}
        startTime={startTime}
        endTime={endTime}
        autoPlay={false}
        className="clip-video-frame"
        style={{ borderRadius: 10, border: "2px solid var(--accent)", boxSizing: "border-box" }}
      />

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
