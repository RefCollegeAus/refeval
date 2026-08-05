"use client";

import type { RefEvalSession } from "@/lib/types/auth";
import type { CodedTag, RefSlot } from "@/lib/types/reviews";
import { Badge, Button, Modal } from "@/components/ui";
import { ReviewComments } from "@/components/ReviewComments";
import { cn } from "@/lib/utils/cn";

// On-demand replacement for the old permanently-visible coded-clips table.
// Presentation only — every prop below is an existing piece of state/handler
// from app/page.tsx's reviewer screen, passed straight through unchanged.
// This component owns no business logic of its own: `tags` is expected to
// already be filtered by the caller's referee-selector state (the same
// `analyticsTags` array the stats row uses), so the list and the stats stay
// in sync by construction.

interface TaggedClipsModalProps {
  open: boolean;
  onClose: () => void;
  tags: CodedTag[];
  filterLabel: string;
  getRefereeName: (slot: RefSlot) => string;
  selectedTagId: string | null;
  onJump: (seconds: number, tagId: string) => void;
  onEdit: (tag: CodedTag) => void;
  onDelete: (tagId: string) => void;
  activeCommentTagId: string | null;
  onToggleComments: (tagId: string) => void;
  commentCounts?: Record<string, number>;
  activeReviewId: string;
  session: RefEvalSession | null;
  onCommentsRead: () => void;
}

function outcomeTone(outcome?: string): "good" | "danger" | "warn" | "neutral" {
  if (!outcome) return "neutral";
  if (outcome.startsWith("Correct")) return "good";
  if (outcome.startsWith("Incorrect")) return "danger";
  return "warn";
}

export function TaggedClipsModal({
  open,
  onClose,
  tags,
  filterLabel,
  getRefereeName,
  selectedTagId,
  onJump,
  onEdit,
  onDelete,
  activeCommentTagId,
  onToggleComments,
  commentCounts,
  activeReviewId,
  session,
  onCommentsRead,
}: TaggedClipsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${tags.length} Tagged Clip${tags.length !== 1 ? "s" : ""} — ${filterLabel}`}
      maxWidthClassName="max-w-3xl"
    >
      {tags.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No tagged clips for this filter yet.</p>
      ) : (
        <div className="grid grid-cols-1">
          {tags.map((tag, i) => {
            const isSelected = selectedTagId === tag.id;
            const commentCount = commentCounts?.[`${activeReviewId}::${tag.id}`] ?? 0;
            const secondaryBits = [
              tag.category,
              tag.position,
              tag.coverage,
              ...(tag.extraReviewOfficials || []).map(s => `${getRefereeName(s)} (Review)`),
            ].filter(Boolean);

            return (
              <div
                key={tag.id}
                className={cn(
                  "border-b border-border py-2.5 last:border-b-0",
                  isSelected && "rounded-lg border-b-transparent bg-accent/10 px-2.5"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => onJump(tag.adjustedSeconds, tag.id)}
                      className="shrink-0 rounded-md px-1 font-mono text-sm font-semibold text-accent hover:underline"
                      aria-label={`Jump to clip ${i + 1} at ${tag.adjustedTime}`}
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
                    {tag.mode === "video" && (
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
          })}
        </div>
      )}
    </Modal>
  );
}
