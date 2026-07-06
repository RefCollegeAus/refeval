"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import { slotName, splitCategory } from "@/components/common/ClipPreview";

interface Props {
  reviews: ReviewRecord[];
  tags: CodedTag[];
  onSelect: (reviewId: string, tagId: string) => void;
  onClose: () => void;
}

export function ClipPickerModal({ reviews, tags, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");

  const reviewMap = useMemo(() => {
    const m = new Map<string, ReviewRecord>();
    for (const r of reviews) m.set(r.id, r);
    return m;
  }, [reviews]);

  // Only tags from video reviews (need a video link to be useful)
  const videoTags = useMemo(
    () => tags.filter(t => {
      const r = reviewMap.get(t.reviewId);
      return r && r.videoLink && t.mode === "video";
    }),
    [tags, reviewMap],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return videoTags;
    return videoTags.filter(t => {
      const r = reviewMap.get(t.reviewId);
      if (!r) return false;
      const refName = slotName(t.refereeTarget, r);
      return (
        r.game.toLowerCase().includes(q) ||
        refName.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q) ||
        (t.outcome ?? "").toLowerCase().includes(q)
      );
    });
  }, [videoTags, reviewMap, query]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1100, padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--panel)", border: "1px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: 640,
        maxHeight: "80vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Choose a Clip</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by game, referee, category or notes…"
              style={{
                width: "100%", boxSizing: "border-box",
                paddingLeft: 32, paddingRight: query ? 32 : 10,
                padding: "7px 10px 7px 32px",
                background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 8, color: "var(--text)", fontSize: 13,
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2 }}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--muted)" }}>
            {filtered.length} clip{filtered.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Clip list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 && (
            <p style={{ padding: "24px 18px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              No clips match your search.
            </p>
          )}
          {filtered.map(t => {
            const r = reviewMap.get(t.reviewId)!;
            const refName = slotName(t.refereeTarget, r);
            const [catGroup, catSub] = splitCategory(t.category);
            const catLabel = catSub ? `${catGroup} — ${catSub}` : catGroup || "";
            return (
              <button
                key={t.id}
                onClick={() => { onSelect(t.reviewId, t.id); onClose(); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 18px", background: "none", border: "none",
                  borderBottom: "1px solid rgba(255,255,255,.06)",
                  cursor: "pointer", color: "var(--text)",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.game}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>{refName}</span>
                      {catLabel && <span>{catLabel}</span>}
                      {t.outcome && <span style={{ color: t.outcome.toLowerCase().includes("correct") ? "#86efac" : t.outcome.toLowerCase().includes("incorrect") ? "#fca5a5" : "var(--muted)" }}>{t.outcome}</span>}
                    </div>
                    {t.notes && (
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.notes}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    {t.adjustedTime}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
