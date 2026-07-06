"use client";

import { useState, useMemo } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import { slotName, splitCategory } from "@/components/common/ClipPreview";

interface Props {
  reviews: ReviewRecord[];
  tags: CodedTag[];
  onSelect: (reviewId: string, tagId: string) => void;
  onClose: () => void;
}

const selectStyle: React.CSSProperties = {
  fontSize: 12, padding: "4px 7px", borderRadius: 6,
  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
  color: "var(--text)", cursor: "pointer",
};

const OUTCOME_COLOR: Record<string, string> = {};
function outcomeColor(o: string) {
  const l = o.toLowerCase();
  if (l.includes("correct") && !l.includes("in")) return "#86efac";
  if (l.includes("incorrect") || l.includes("missed")) return "#fca5a5";
  return "var(--muted)";
}

export function ClipPickerModal({ reviews, tags, onSelect, onClose }: Props) {
  const [query,          setQuery]          = useState("");
  const [filterGame,     setFilterGame]     = useState("");
  const [filterReferee,  setFilterReferee]  = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterOutcome,  setFilterOutcome]  = useState("");
  const [filterHasNotes, setFilterHasNotes] = useState(false);

  const reviewMap = useMemo(() => {
    const m = new Map<string, ReviewRecord>();
    for (const r of reviews) m.set(r.id, r);
    return m;
  }, [reviews]);

  // Base set: only video-mode clips with a usable video link
  const videoTags = useMemo(
    () => tags.filter(t => {
      const r = reviewMap.get(t.reviewId);
      return r && r.videoLink && t.mode === "video";
    }),
    [tags, reviewMap],
  );

  // Filter option lists derived from the base set (don't shrink as you filter)
  const gameOptions = useMemo(() => {
    const s = new Set<string>();
    videoTags.forEach(t => { const r = reviewMap.get(t.reviewId); if (r) s.add(r.game); });
    return Array.from(s).sort();
  }, [videoTags, reviewMap]);

  const refereeOptions = useMemo(() => {
    const s = new Set<string>();
    videoTags.forEach(t => { const r = reviewMap.get(t.reviewId); if (r) s.add(slotName(t.refereeTarget, r)); });
    return Array.from(s).sort();
  }, [videoTags, reviewMap]);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    videoTags.forEach(t => { const [g] = splitCategory(t.category); if (g) s.add(g); });
    return Array.from(s).sort();
  }, [videoTags]);

  const outcomeOptions = useMemo(() => {
    const s = new Set<string>();
    videoTags.forEach(t => { if (t.outcome) s.add(t.outcome); });
    return Array.from(s).sort();
  }, [videoTags]);

  const hasActiveFilter = !!(filterGame || filterReferee || filterCategory || filterOutcome || filterHasNotes || query);

  function clearAll() {
    setQuery(""); setFilterGame(""); setFilterReferee("");
    setFilterCategory(""); setFilterOutcome(""); setFilterHasNotes(false);
  }

  const filtered = useMemo(() => {
    return videoTags.filter(t => {
      const r = reviewMap.get(t.reviewId);
      if (!r) return false;
      const refName = slotName(t.refereeTarget, r);
      const [catGroup] = splitCategory(t.category);

      if (filterGame     && r.game    !== filterGame)     return false;
      if (filterReferee  && refName   !== filterReferee)  return false;
      if (filterCategory && catGroup  !== filterCategory) return false;
      if (filterOutcome  && t.outcome !== filterOutcome)  return false;
      if (filterHasNotes && !t.notes?.trim())             return false;

      if (query) {
        const q = query.toLowerCase();
        if (
          !r.game.toLowerCase().includes(q) &&
          !refName.toLowerCase().includes(q) &&
          !(t.category ?? "").toLowerCase().includes(q) &&
          !(t.notes    ?? "").toLowerCase().includes(q) &&
          !(t.outcome  ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [videoTags, reviewMap, filterGame, filterReferee, filterCategory, filterOutcome, filterHasNotes, query]);

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
        borderRadius: 14, width: "100%", maxWidth: 660,
        maxHeight: "85vh", display: "flex", flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Choose a Clip</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Search + filters */}
        <div style={{ padding: "10px 18px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Search row */}
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search game, referee, category or notes…"
              style={{
                width: "100%", boxSizing: "border-box",
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

          {/* Filter row */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <SlidersHorizontal size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />

            {gameOptions.length > 0 && (
              <select value={filterGame} onChange={e => setFilterGame(e.target.value)} style={selectStyle}>
                <option value="">All games</option>
                {gameOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}

            {refereeOptions.length > 0 && (
              <select value={filterReferee} onChange={e => setFilterReferee(e.target.value)} style={selectStyle}>
                <option value="">All referees</option>
                {refereeOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}

            {categoryOptions.length > 0 && (
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={selectStyle}>
                <option value="">All categories</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {outcomeOptions.length > 0 && (
              <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)} style={selectStyle}>
                <option value="">All outcomes</option>
                {outcomeOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)", cursor: "pointer", whiteSpace: "nowrap" }}>
              <input
                type="checkbox"
                checked={filterHasNotes}
                onChange={e => setFilterHasNotes(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              Has notes
            </label>

            {hasActiveFilter && (
              <button
                onClick={clearAll}
                style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 999,
                  background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)",
                  color: "#fca5a5", cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
            {filtered.length} clip{filtered.length !== 1 ? "s" : ""} shown
            {hasActiveFilter && ` of ${videoTags.length} total`}
          </p>
        </div>

        {/* Clip list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "32px 18px", textAlign: "center" }}>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>No clips match the current filters.</p>
              {hasActiveFilter && (
                <button onClick={clearAll} style={{ marginTop: 10, fontSize: 12, padding: "5px 14px" }}>
                  Clear filters
                </button>
              )}
            </div>
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
                      {t.outcome && (
                        <span style={{ color: outcomeColor(t.outcome) }}>{t.outcome}</span>
                      )}
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
