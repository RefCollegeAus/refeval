"use client";

import { useState, useEffect } from "react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { CodedTag, RefSlot } from "@/lib/types/reviews";
import { Modal } from "@/components/ui";
import { ClipRow } from "./ClipRow";

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

const OUTCOMES   = ["Correct Call", "Correct No Call", "Incorrect Call", "Incorrect No Call", "Review"];
const CATEGORIES = ["Foul", "Violation", "Mechanics", "Game Awareness", "Game Administration"];
const POSITIONS  = ["Trail", "Lead", "Centre"];

function FilterBar({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", flexShrink: 0, minWidth: 68 }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? "" : opt)}
            style={{
              fontSize: 11,
              padding: "2px 9px",
              borderRadius: 5,
              border: "1px solid",
              cursor: "pointer",
              transition: "background .12s, color .12s, border-color .12s",
              borderColor: value === opt ? "var(--accent)" : "var(--border)",
              background:  value === opt ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
              color:       value === opt ? "var(--accent)" : "var(--muted)",
              fontWeight:  value === opt ? 700 : 400,
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
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
  const [filterOutcome,  setFilterOutcome]  = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPosition, setFilterPosition] = useState("");

  // Reset filters whenever the modal opens (new referee selection)
  useEffect(() => {
    if (open) {
      setFilterOutcome("");
      setFilterCategory("");
      setFilterPosition("");
    }
  }, [open]);

  const hasFilter = filterOutcome || filterCategory || filterPosition;

  const visible = tags.filter(t => {
    if (filterOutcome  && t.outcome  !== filterOutcome)  return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterPosition && t.position !== filterPosition) return false;
    return true;
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${tags.length} Tagged Clip${tags.length !== 1 ? "s" : ""} — ${filterLabel}`}
      maxWidthClassName="max-w-3xl"
    >
      {/* Filter bar */}
      {tags.length > 0 && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "10px 12px",
          background: "var(--panel2)",
          borderRadius: 8,
          marginBottom: 12,
          border: "1px solid var(--border)",
        }}>
          <FilterBar label="Outcome"  options={OUTCOMES}   value={filterOutcome}  onChange={setFilterOutcome}  />
          <FilterBar label="Category" options={CATEGORIES} value={filterCategory} onChange={setFilterCategory} />
          <FilterBar label="Position" options={POSITIONS}  value={filterPosition} onChange={setFilterPosition} />
          {hasFilter && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {visible.length} of {tags.length} clip{tags.length !== 1 ? "s" : ""} shown
              </span>
              <button
                onClick={() => { setFilterOutcome(""); setFilterCategory(""); setFilterPosition(""); }}
                style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {hasFilter ? "No clips match the current filters." : "No tagged clips for this filter yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1">
          {visible.map((tag, i) => (
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
