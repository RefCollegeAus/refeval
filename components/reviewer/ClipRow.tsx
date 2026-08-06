"use client";

import type { RefEvalSession } from "@/lib/types/auth";
import type { CodedTag, RefSlot } from "@/lib/types/reviews";
import { Badge, Button } from "@/components/ui";
import { ReviewComments } from "@/components/ReviewComments";
import { cn } from "@/lib/utils/cn";

// Single tagged-clip detail row — jump/outcome/secondary info/notes plus
// edit/delete/comments actions. Extracted so the full clip list
// (TaggedClipsModal) and the single "currently selected clip" panel in the
// reviewer console can render an identical clip without duplicating the
// markup.

export interface ClipRowProps {
  tag: CodedTag;
  index?: number;
  getRefereeName: (slot: RefSlot) => string;
  isSelected: boolean;
  onJump: (seconds: number, tagId: string) => void;
  onEdit?: (tag: CodedTag) => void;
  onDelete: (tagId: string) => void;
  activeCommentTagId: string | null;
  onToggleComments: (tagId: string) => void;
  commentCount: number;
  activeReviewId: string;
  session: RefEvalSession | null;
  onCommentsRead: () => void;
  className?: string;
}

function outcomeTone(outcome?: string): "good" | "danger" | "warn" | "neutral" {
  if (!outcome) return "neutral";
  if (outcome.startsWith("Correct")) return "good";
  if (outcome.startsWith("Incorrect")) return "danger";
  return "warn";
}

export function ClipRow({
  tag,
  index,
  getRefereeName,
  isSelected,
  onJump,
  onEdit,
  onDelete,
  activeCommentTagId,
  onToggleComments,
  commentCount,
  activeReviewId,
  session,
  onCommentsRead,
  className,
}: ClipRowProps) {
  const secondaryBits = [
    tag.category,
    tag.position,
    tag.coverage,
    ...(tag.extraReviewOfficials || []).map(s => `${getRefereeName(s)} (Review)`),
  ].filter(Boolean);

  return (
    <div className={cn("border-b border-border py-2.5 last:border-b-0", isSelected && "rounded-lg border-b-transparent bg-accent/10 px-2.5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <button
            type="button"
            onClick={() => onJump(tag.adjustedSeconds, tag.id)}
            className="shrink-0 rounded-md px-1 font-mono text-sm font-semibold text-accent hover:underline"
            aria-label={index != null ? `Jump to clip ${index + 1} at ${tag.adjustedTime}` : `Jump to clip at ${tag.adjustedTime}`}
          >
            {tag.adjustedTime}
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold text-text">{getRefereeName(tag.refereeTarget)}</span>
              {tag.outcome && <Badge tone={outcomeTone(tag.outcome)}>{tag.outcome}</Badge>}
            </div>
            {secondaryBits.length > 0 && (
              <p className="mt-0.5 text-xs text-muted">{secondaryBits.join(" · ")}</p>
            )}
            {tag.notes && (
              <p className="mt-0.5 max-w-md truncate text-xs text-muted" title={tag.notes}>
                {tag.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {tag.mode === "video" && onEdit && (
            <Button variant="secondary" size="sm" onClick={() => onEdit(tag)}>
              Edit
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => onDelete(tag.id)}>
            Delete
          </Button>
          <div className="relative">
            <Button
              variant={activeCommentTagId === tag.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => onToggleComments(tag.id)}
            >
              Comments
            </Button>
            {commentCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
                {Math.min(commentCount, 99)}
              </span>
            )}
          </div>
        </div>
      </div>

      {activeCommentTagId === tag.id && (
        <div className="mt-2.5">
          <ReviewComments reviewId={activeReviewId} tagId={tag.id} session={session} onRead={onCommentsRead} />
        </div>
      )}
    </div>
  );
}
