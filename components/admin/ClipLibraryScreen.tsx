"use client";

import { useMemo, useState } from "react";
import { ListVideo, Search, X, CheckSquare, Square, ChevronLeft, AlertTriangle } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import { ClipPreview, ClipRow, splitCategory, slotName, outcomeClass } from "@/components/common/ClipPreview";

interface Props {
  session: RefEvalSession;
  reviews: ReviewRecord[];
  tags: CodedTag[];
  onBack: () => void;
  onOpenReview: (reviewId: string) => void;
  onCreatePlaylist: (title: string, description: string, clips: Array<{ reviewId: string; tagId: string }>) => Promise<string>;
  onViewPlaylist: (id: string) => void;
  canCreatePlaylists?: boolean;
}

// ── Create Playlist Modal ─────────────────────────────────────────────────────

interface CreateModalProps {
  clipCount: number;
  onSave: (title: string, description: string) => Promise<void>;
  onClose: () => void;
}

function CreatePlaylistModal({ clipCount, onSave, onClose }: CreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave() {
    if (!title.trim()) { setErr("Playlist title is required."); return; }
    setSaving(true);
    setErr("");
    try {
      await onSave(title.trim(), description.trim());
    } catch (e: any) {
      setErr(e?.message || "Failed to create playlist.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">New Playlist</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>Create playlist from {clipCount} clip{clipCount !== 1 ? "s" : ""}</h1>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          <label>
            Title *
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Foul Calls — Round 5"
              autoFocus
            />
          </label>
          <label>
            Description <span className="hint">(optional)</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this playlist about?"
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
          </label>
          {err && <p className="danger-text">{err}</p>}
        </div>

        <div className="action-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Creating…" : "Create Playlist"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function ClipLibraryScreen({ session, reviews, tags, onBack, onOpenReview, onCreatePlaylist, onViewPlaylist, canCreatePlaylists = true }: Props) {
  const orgId = session.activeOrganisation?.id ?? "";

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [fOutcome, setFOutcome] = useState("");
  const [fCatGroup, setFCatGroup] = useState("");
  const [fSubtype, setFSubtype] = useState("");
  const [fReferee, setFReferee] = useState("");
  const [fEducator, setFEducator] = useState("");
  const [fGame, setFGame] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [fText, setFText] = useState("");

  // ── Preview, selection, modal ─────────────────────────────────────────────────
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // ── Build enriched rows ───────────────────────────────────────────────────────
  const reviewMap = useMemo(() => {
    const m = new Map<string, ReviewRecord>();
    for (const r of reviews) {
      if (r.organisationId === orgId) m.set(r.id, r);
    }
    return m;
  }, [reviews, orgId]);

  const allRows = useMemo<ClipRow[]>(() => {
    const rows: ClipRow[] = [];
    for (const tag of tags) {
      const review = reviewMap.get(tag.reviewId);
      if (!review) continue;
      if (review.status !== "Completed") continue;
      const refName = tag.refereeTarget !== "All Referees"
        ? slotName(tag.refereeTarget, review)
        : [review.referee1Name, review.referee2Name, review.referee3Name].filter(Boolean).join(", ") || "All Officials";
      const [categoryGroup, subtype] = splitCategory(tag.category);
      rows.push({ tag, review, refereeName: refName, categoryGroup, subtype });
    }
    rows.sort((a, b) => b.tag.createdAt.localeCompare(a.tag.createdAt));
    return rows;
  }, [tags, reviewMap]);

  // ── Option lists ──────────────────────────────────────────────────────────────
  const outcomes = useMemo(() => Array.from(new Set(allRows.map(r => r.tag.outcome).filter(Boolean) as string[])).sort(), [allRows]);
  const catGroups = useMemo(() => Array.from(new Set(allRows.map(r => r.categoryGroup).filter(Boolean))).sort(), [allRows]);
  const subtypes = useMemo(() => {
    const base = fCatGroup ? allRows.filter(r => r.categoryGroup === fCatGroup).map(r => r.subtype) : allRows.map(r => r.subtype);
    return Array.from(new Set(base.filter(Boolean))).sort();
  }, [allRows, fCatGroup]);
  const referees = useMemo(() => Array.from(new Set(allRows.map(r => r.refereeName).filter(Boolean))).sort(), [allRows]);
  const educators = useMemo(() => Array.from(new Set(allRows.map(r => r.review.educatorName).filter(Boolean))).sort(), [allRows]);
  const games = useMemo(() => Array.from(new Set(allRows.map(r => r.review.game).filter(Boolean))).sort(), [allRows]);

  // ── Apply filters ─────────────────────────────────────────────────────────────
  const visibleRows = useMemo(() => {
    const q = fText.toLowerCase().trim();
    return allRows.filter(row => {
      if (fOutcome && row.tag.outcome !== fOutcome) return false;
      if (fCatGroup && row.categoryGroup !== fCatGroup) return false;
      if (fSubtype && row.subtype !== fSubtype) return false;
      if (fReferee && row.refereeName !== fReferee) return false;
      if (fEducator && row.review.educatorName !== fEducator) return false;
      if (fGame && row.review.game !== fGame) return false;
      if (fDateFrom) {
        const d = row.review.gameDate || row.review.createdAt.slice(0, 10);
        if (d < fDateFrom) return false;
      }
      if (fDateTo) {
        const d = row.review.gameDate || row.review.createdAt.slice(0, 10);
        if (d > fDateTo) return false;
      }
      if (q) {
        const haystack = [
          row.review.game, row.refereeName, row.review.educatorName,
          row.tag.notes, row.tag.outcome, row.categoryGroup, row.subtype,
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, fOutcome, fCatGroup, fSubtype, fReferee, fEducator, fGame, fDateFrom, fDateTo, fText]);

  const safePreviewIndex = Math.min(previewIndex, Math.max(0, visibleRows.length - 1));
  const previewClip = visibleRows.length > 0 ? visibleRows[safePreviewIndex] : null;

  // ── Selection helpers ─────────────────────────────────────────────────────────
  const visibleIds = visibleRows.map(r => r.tag.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));
  const someVisibleSelected = visibleIds.some(id => selected.has(id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelected(prev => { const n = new Set(prev); visibleIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => new Set(Array.from(prev).concat(visibleIds)));
    }
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function clearFilters() {
    setFOutcome(""); setFCatGroup(""); setFSubtype(""); setFReferee("");
    setFEducator(""); setFGame(""); setFDateFrom(""); setFDateTo(""); setFText("");
    setPreviewIndex(0);
  }

  async function handleCreatePlaylist(title: string, description: string) {
    // Build clips in the order they appear in visibleRows
    const clips = visibleRows
      .filter(row => selected.has(row.tag.id))
      .map(row => ({ reviewId: row.review.id, tagId: row.tag.id }));
    const newId = await onCreatePlaylist(title, description, clips);
    setSelected(new Set());
    setCreateModalOpen(false);
    onViewPlaylist(newId);
  }

  const activeFilterCount = [fOutcome, fCatGroup, fSubtype, fReferee, fEducator, fGame, fDateFrom, fDateTo, fText].filter(Boolean).length;
  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);
  const effectiveSelCount = useMemo(() => Array.from(selected).filter(id => visibleIdSet.has(id)).length, [selected, visibleIdSet]);
  const hiddenSelCount = selected.size - effectiveSelCount;

  return (
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>

      {/* ── Header & filters ── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="table-head" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ListVideo size={20} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Organisation</p>
              <h1 style={{ margin: 0, fontSize: 22 }}>Clip Library</h1>
              <p className="hint" style={{ margin: "2px 0 0" }}>
                Clips from completed evaluations · {allRows.length} total
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {canCreatePlaylists && (
              <button
                className={effectiveSelCount > 0 ? "primary" : ""}
                disabled={effectiveSelCount === 0}
                onClick={() => setCreateModalOpen(true)}
                title={effectiveSelCount === 0 ? "Select clips to create a playlist" : `Create playlist from ${effectiveSelCount} clip${effectiveSelCount !== 1 ? "s" : ""}`}
                style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
              >
                <ListVideo size={14} />
                Create Playlist{effectiveSelCount > 0 ? ` (${effectiveSelCount})` : ""}
              </button>
            )}
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronLeft size={15} /> Back
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="cl-filter-bar">
          {/* Row 1: search */}
          <div className="cl-filter-row">
            <div className="cl-filter-search" style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
              <input
                value={fText}
                onChange={e => setFText(e.target.value)}
                placeholder="Search notes, game, referee…"
              />
            </div>
          </div>
          {/* Row 2: outcome / category / subtype */}
          <div className="cl-filter-row">
            <span className="cl-filter-group-label">Outcome</span>
            <select value={fOutcome} onChange={e => setFOutcome(e.target.value)}>
              <option value="">All</option>
              {outcomes.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <span className="cl-filter-group-label" style={{ marginLeft: 6 }}>Category</span>
            <select value={fCatGroup} onChange={e => { setFCatGroup(e.target.value); setFSubtype(""); }}>
              <option value="">All</option>
              {catGroups.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="cl-filter-group-label" style={{ marginLeft: 6 }}>Subtype</span>
            <select value={fSubtype} onChange={e => setFSubtype(e.target.value)}>
              <option value="">All</option>
              {subtypes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Row 3: people + date range + clear */}
          <div className="cl-filter-row">
            <span className="cl-filter-group-label">Referee</span>
            <select value={fReferee} onChange={e => setFReferee(e.target.value)}>
              <option value="">All</option>
              {referees.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="cl-filter-group-label" style={{ marginLeft: 6 }}>Educator</span>
            <select value={fEducator} onChange={e => setFEducator(e.target.value)}>
              <option value="">All</option>
              {educators.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <span className="cl-filter-group-label" style={{ marginLeft: 6 }}>Game</span>
            <select value={fGame} onChange={e => setFGame(e.target.value)}>
              <option value="">All</option>
              {games.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <label className="cl-date-label" style={{ marginLeft: 6 }}>
              From <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} />
            </label>
            <label className="cl-date-label">
              To <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} />
            </label>
            {activeFilterCount > 0 && (
              <button style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }} onClick={clearFilters}>
                <X size={12} /> Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Selection bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
          <span>
            <strong style={{ color: "var(--text)" }}>{visibleRows.length}</strong> clip{visibleRows.length !== 1 ? "s" : ""} shown
            {canCreatePlaylists && effectiveSelCount > 0 && <span style={{ marginLeft: 10, color: "var(--accent)", fontWeight: 700 }}>· {effectiveSelCount} selected</span>}
          </span>
          {canCreatePlaylists && visibleRows.length > 0 && (
            <button style={{ fontSize: 12, padding: "3px 10px", display: "flex", alignItems: "center", gap: 5 }} onClick={toggleSelectAll}>
              {allVisibleSelected ? <><CheckSquare size={13} /> Deselect all</> : <><Square size={13} /> Select all visible</>}
            </button>
          )}
        </div>
        {/* Hidden-selection warning */}
        {canCreatePlaylists && hiddenSelCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "7px 10px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 6, fontSize: 12, color: "var(--text)" }}>
            <AlertTriangle size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />
            <span>
              <strong>{hiddenSelCount}</strong> selected clip{hiddenSelCount !== 1 ? "s are" : " is"} hidden by filters and won&apos;t be included in the playlist.{" "}
              <button style={{ padding: 0, background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }} onClick={clearFilters}>
                Clear filters
              </button>{" "}to include them, or{" "}
              <button style={{ padding: 0, background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }} onClick={() => setSelected(prev => { const n = new Set(prev); Array.from(prev).filter(id => !visibleIdSet.has(id)).forEach(id => n.delete(id)); return n; })}>
                deselect hidden
              </button>.
            </span>
          </div>
        )}
      </div>

      {/* ── Empty states ── */}
      {allRows.length === 0 && (
        <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
          <ListVideo size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>No clips yet</p>
          <p className="hint" style={{ margin: "6px 0 0" }}>Clips appear here once evaluations are completed and tagged.</p>
        </div>
      )}
      {allRows.length > 0 && visibleRows.length === 0 && (
        <div className="panel" style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>No clips match the current filters</p>
          <button style={{ marginTop: 10, fontSize: 13 }} onClick={clearFilters}>Clear filters</button>
        </div>
      )}

      {/* ── Master–detail split ── */}
      {visibleRows.length > 0 && (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

          {/* Left: scrollable clip list */}
          <div style={{ flex: "0 0 38%", maxHeight: "72vh", overflowY: "auto", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--panel2)", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--muted)" }}>
              {canCreatePlaylists && (
                <button
                  onClick={toggleSelectAll}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--muted)" }}
                  title={allVisibleSelected ? "Deselect all" : "Select all visible"}
                >
                  {allVisibleSelected ? <CheckSquare size={14} /> : someVisibleSelected ? <CheckSquare size={14} style={{ opacity: 0.5 }} /> : <Square size={14} />}
                </button>
              )}
              <span style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {visibleRows.length} clip{visibleRows.length !== 1 ? "s" : ""}
              </span>
            </div>

            {visibleRows.map((row, i) => {
              const isChecked = selected.has(row.tag.id);
              const isPreviewing = i === safePreviewIndex;
              return (
                <div
                  key={row.tag.id}
                  onClick={() => setPreviewIndex(i)}
                  style={{ display: "flex", gap: 8, padding: "10px 10px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: isPreviewing ? "var(--panel2)" : undefined, borderLeft: isPreviewing ? "3px solid var(--accent)" : "3px solid transparent" }}
                >
                  {canCreatePlaylists && (
                    <div
                      onClick={e => { e.stopPropagation(); toggleRow(row.tag.id); }}
                      style={{ flexShrink: 0, paddingTop: 1, cursor: "pointer", color: isChecked ? "var(--accent)" : "var(--muted)" }}
                    >
                      {isChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
                      {row.tag.outcome && <span className={outcomeClass(row.tag.outcome)} style={{ fontSize: 11, padding: "1px 6px" }}>{row.tag.outcome}</span>}
                      {row.categoryGroup && <span className="chip" style={{ fontSize: 11 }}>{row.categoryGroup}</span>}
                      <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--muted)", marginLeft: "auto" }}>{row.tag.adjustedTime}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.refereeName}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.review.game || "Untitled game"}</div>
                    {row.subtype && <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{row.subtype}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: sticky preview */}
          <div style={{ flex: 1, position: "sticky", top: 20 }}>
            <div className="panel">
              <ClipPreview
                clip={previewClip}
                index={safePreviewIndex}
                total={visibleRows.length}
                onPrev={() => setPreviewIndex(i => Math.max(0, i - 1))}
                onNext={() => setPreviewIndex(i => Math.min(visibleRows.length - 1, i + 1))}
                onOpenReview={onOpenReview}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Create Playlist Modal ── */}
      {createModalOpen && (
        <CreatePlaylistModal
          clipCount={effectiveSelCount}
          onSave={handleCreatePlaylist}
          onClose={() => setCreateModalOpen(false)}
        />
      )}
    </div>
  );
}
