"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import { slotName, splitCategory } from "@/components/common/ClipPreview";
import { Badge, Button, Input, Select } from "@/components/ui";

interface Props {
  reviews: ReviewRecord[];
  tags: CodedTag[];
  onSelect: (reviewId: string, tagId: string) => void;
  onClose: () => void;
}

function outcomeColorClass(o: string) {
  const l = o.toLowerCase();
  if (l.includes("correct") && !l.includes("in")) return "text-green-300";
  if (l.includes("incorrect") || l.includes("missed")) return "text-red-300";
  return "text-muted";
}

export function ClipPickerModal({ reviews, tags, onSelect, onClose }: Props) {
  const [query,           setQuery]           = useState("");
  const [filterGame,      setFilterGame]      = useState("");
  const [filterReferee,   setFilterReferee]   = useState("");
  const [filterCategory,  setFilterCategory]  = useState("");
  const [filterOutcome,   setFilterOutcome]   = useState("");
  const [filterHasNotes,  setFilterHasNotes]  = useState(false);
  const [filterLearning,  setFilterLearning]  = useState(false);

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

  const hasActiveFilter = !!(filterGame || filterReferee || filterCategory || filterOutcome || filterHasNotes || filterLearning || query);

  function clearAll() {
    setQuery(""); setFilterGame(""); setFilterReferee("");
    setFilterCategory(""); setFilterOutcome(""); setFilterHasNotes(false); setFilterLearning(false);
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
      if (filterLearning && !t.isLearningClip)            return false;

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
  }, [videoTags, reviewMap, filterGame, filterReferee, filterCategory, filterOutcome, filterHasNotes, filterLearning, query]);

  return (
    <div
      className="fixed inset-0 z-[1100] grid place-items-center bg-black/80 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[85vh] w-full max-w-[660px] flex-col rounded-2xl border border-border bg-panel shadow-xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
          <span className="text-[15px] font-bold">Choose a Clip</span>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="px-1.5">
            <X size={16} />
          </Button>
        </div>

        {/* Search + filters */}
        <div className="flex shrink-0 flex-col gap-2.5 border-b border-border px-4 pt-3 pb-2.5">

          {/* Search row */}
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search game, referee, category or notes…"
              className="pl-8 pr-8"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter grid: 2-column */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">Game</span>
              <Select value={filterGame} onChange={e => setFilterGame(e.target.value)} className="text-[13px]">
                <option value="">All games</option>
                {gameOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">Referee</span>
              <Select value={filterReferee} onChange={e => setFilterReferee(e.target.value)} className="text-[13px]">
                <option value="">All referees</option>
                {refereeOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">Category</span>
              <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="text-[13px]">
                <option value="">All categories</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">Outcome</span>
              <Select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)} className="text-[13px]">
                <option value="">All outcomes</option>
                {outcomeOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </div>
          </div>

          {/* Checkbox row */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={filterHasNotes}
                onChange={e => setFilterHasNotes(e.target.checked)}
                className="h-auto w-auto"
                style={{ accentColor: "var(--accent)" }}
              />
              Has notes
            </label>
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-green-300">
              <input
                type="checkbox"
                checked={filterLearning}
                onChange={e => setFilterLearning(e.target.checked)}
                className="h-auto w-auto"
                style={{ accentColor: "var(--good)" }}
              />
              Learning Library only
            </label>
            {hasActiveFilter && (
              <button
                onClick={clearAll}
                className="ml-auto whitespace-nowrap rounded-full border border-danger/25 bg-danger/10 px-2.5 py-1 text-[11px] text-red-300"
              >
                Clear filters
              </button>
            )}
          </div>

          <p className="m-0 text-[11px] text-muted">
            {filtered.length} clip{filtered.length !== 1 ? "s" : ""} shown
            {hasActiveFilter && ` of ${videoTags.length} total`}
          </p>
        </div>

        {/* Clip list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="m-0 text-[13px] text-muted">No clips match the current filters.</p>
              {hasActiveFilter && (
                <button onClick={clearAll} className="mt-2.5 text-xs">
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
                className="block w-full border-none border-b border-white/[.06] bg-none px-4 py-2.5 text-left text-text hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
                      <span className="truncate">{r.game}</span>
                      {t.isLearningClip && (
                        <Badge tone="good" className="shrink-0 whitespace-nowrap text-[10px]">
                          Learning
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-2.5 text-xs text-muted">
                      <span>{refName}</span>
                      {catLabel && <span>{catLabel}</span>}
                      {t.outcome && (
                        <span className={outcomeColorClass(t.outcome)}>{t.outcome}</span>
                      )}
                    </div>
                    {t.notes && (
                      <div className="mt-0.5 truncate text-xs text-muted">
                        {t.notes}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 tabular-nums text-xs text-muted">
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
