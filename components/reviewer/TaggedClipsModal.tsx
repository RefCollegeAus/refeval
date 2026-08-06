"use client";

import type { RefEvalSession } from "@/lib/types/auth";
import type { CodedTag, RefSlot } from "@/lib/types/reviews";
import { Modal } from "@/components/ui";
import { ClipRow } from "./ClipRow";

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
          {tags.map((tag, i) => (
            <ClipRow
              key={tag.id}
              tag={tag}
              index={i}
              getRefereeName={getRefereeName}
              isSelected={selectedTagId === tag.id}
              onJump={onJump}
              onEdit={onEdit}
              onDelete={onDelete}
              activeCommentTagId={activeCommentTagId}
              onToggleComments={onToggleComments}
              commentCount={commentCounts?.[`${activeReviewId}::${tag.id}`] ?? 0}
              activeReviewId={activeReviewId}
              session={session}
              onCommentsRead={onCommentsRead}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
