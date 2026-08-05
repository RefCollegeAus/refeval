"use client";

import { useMemo, useState } from "react";
import { ListVideo, Search, X, CheckSquare, Square, ChevronLeft, AlertTriangle, BookOpen, Library, FileText, LayoutGrid, Users2, ArrowUpDown, Trash2 } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import { ClipPreview, ClipRow, splitCategory, slotName, outcomeClass } from "@/components/common/ClipPreview";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, EmptyState, FormField, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

type LibraryTab = "all" | "learning";

interface Props {
  session: RefEvalSession;
  reviews: ReviewRecord[];
  tags: CodedTag[];
  onBack: () => void;
  onOpenReview: (reviewId: string) => void;
  onCreatePlaylist: (title: string, description: string, clips: Array<{ reviewId: string; tagId: string }>) => Promise<string>;
  onViewPlaylist: (id: string) => void;
  canCreatePlaylists?: boolean;
  initialTab?: LibraryTab;
  onRemoveFromLearningLibrary?: (tagId: string) => Promise<void>;
  onNavigateToQuizBuilder?: () => void;
  onNavigateToLearningLibrary?: () => void;
}

// ── Remove from Learning Library button ───────────────────────────────────────

function RemoveFromLibraryButton({ tagId, onRemove }: { tagId: string; onRemove: (id: string) => Promise<void> }) {
  const [removing, setRemoving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  async function doRemove() {
    setRemoving(true);
    setConfirming(false);
    try { await onRemove(tagId); } finally { setRemoving(false); }
  }
  function handle() { setConfirming(true); }
  return (
    <>
    {confirming && (
      <ConfirmModal
        title="Remove from Learning Library?"
        message="The clip will be removed from the Learning Library. The original review clip is kept."
        confirmLabel="Remove"
        busyLabel="Removing…"
        busy={removing}
        onCancel={() => setConfirming(false)}
        onConfirm={doRemove}
      />
    )}
    <Button variant="danger" size="sm" onClick={handle} disabled={removing}>
      {removing ? "Removing…" : "Remove from Library"}
    </Button>
    </>
  );
}

// ── Create Playlist Modal ─────────────────────────────────────────────────────
// Custom shell (not the shared Modal component) — deliberately does not close
// on backdrop click, matching this modal's existing behaviour.

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
      <div className="w-full max-w-[460px] rounded-2xl border border-border bg-panel p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">New Playlist</p>
            <h1 className="text-lg font-semibold text-text">Create playlist from {clipCount} clip{clipCount !== 1 ? "s" : ""}</h1>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-panel-3 hover:text-text">✕</button>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          <FormField label="Title" required>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Foul Calls — Round 5"
              autoFocus
            />
          </FormField>
          <FormField label="Description" hint="Optional">
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this playlist about?"
              rows={3}
            />
          </FormField>
          {err && <p className="text-xs font-medium text-red-400">{err}</p>}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Creating…" : "Create Playlist"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function ClipLibraryScreen({ session, reviews, tags, onBack, onOpenReview, onCreatePlaylist, onViewPlaylist, canCreatePlaylists = true, initialTab = "all", onRemoveFromLearningLibrary, onNavigateToQuizBuilder, onNavigateToLearningLibrary }: Props) {
  const orgId = session.activeOrganisation?.id ?? "";

  // ── Tab ───────────────────────────────────────────────────────────────────────
  const [tab] = useState<LibraryTab>(initialTab);

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
  const [fHasNotes, setFHasNotes] = useState(false);

  // ── Sort ─────────────────────────────────────────────────────────────────────
  type SortBy = "newest" | "oldest" | "category" | "referee" | "game";
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  // ── Preview, selection, modal ─────────────────────────────────────────────────
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmBulkRemove, setConfirmBulkRemove] = useState(false);

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
      if (tab === "learning" && !tag.isLearningClip) continue;
      const refName = tag.refereeTarget !== "All Referees"
        ? slotName(tag.refereeTarget, review)
        : [review.referee1Name, review.referee2Name, review.referee3Name].filter(Boolean).join(", ") || "All Officials";
      const [categoryGroup, subtype] = splitCategory(tag.category);
      rows.push({ tag, review, refereeName: refName, categoryGroup, subtype });
    }
    rows.sort((a, b) => b.tag.createdAt.localeCompare(a.tag.createdAt));
    return rows;
  }, [tags, reviewMap, tab]);

  // ── Apply sort ───────────────────────────────────────────────────────────────
  const sortedRows = useMemo<ClipRow[]>(() => {
    const r = [...allRows];
    switch (sortBy) {
      case "newest": r.sort((a, b) => b.tag.createdAt.localeCompare(a.tag.createdAt)); break;
      case "oldest": r.sort((a, b) => a.tag.createdAt.localeCompare(b.tag.createdAt)); break;
      case "category": r.sort((a, b) => (a.categoryGroup || "").localeCompare(b.categoryGroup || "")); break;
      case "referee": r.sort((a, b) => (a.refereeName || "").localeCompare(b.refereeName || "")); break;
      case "game": r.sort((a, b) => (a.review.game || "").localeCompare(b.review.game || "")); break;
    }
    return r;
  }, [allRows, sortBy]);

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
    return sortedRows.filter(row => {
      if (fOutcome && row.tag.outcome !== fOutcome) return false;
      if (fCatGroup && row.categoryGroup !== fCatGroup) return false;
      if (fSubtype && row.subtype !== fSubtype) return false;
      if (fReferee && row.refereeName !== fReferee) return false;
      if (fEducator && row.review.educatorName !== fEducator) return false;
      if (fGame && row.review.game !== fGame) return false;
      if (fHasNotes && !row.tag.notes?.trim()) return false;
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
  }, [sortedRows, fOutcome, fCatGroup, fSubtype, fReferee, fEducator, fGame, fDateFrom, fDateTo, fText, fHasNotes]);

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
    setFHasNotes(false);
    setPreviewIndex(0);
  }

  async function doBulkRemoveFromLibrary() {
    if (!onRemoveFromLearningLibrary) return;
    const ids = Array.from(selected).filter(id => visibleIdSet.has(id));
    setConfirmBulkRemove(false);
    for (const id of ids) {
      await onRemoveFromLearningLibrary(id);
    }
    setSelected(new Set());
  }

  function handleBulkRemoveFromLibrary() {
    if (!onRemoveFromLearningLibrary) return;
    const ids = Array.from(selected).filter(id => visibleIdSet.has(id));
    if (ids.length === 0) return;
    setConfirmBulkRemove(true);
  }

  async function handleCreatePlaylist(title: string, description: string) {
    // Include ALL selected clips regardless of current filter state.
    // Visible+selected come first (in filtered order), then hidden+selected (in sort order).
    const visibleSelected = visibleRows
      .filter(row => selected.has(row.tag.id))
      .map(row => ({ reviewId: row.review.id, tagId: row.tag.id }));
    const visibleTagIds = new Set(visibleSelected.map(c => c.tagId));
    const hiddenSelected = sortedRows
      .filter(row => selected.has(row.tag.id) && !visibleTagIds.has(row.tag.id))
      .map(row => ({ reviewId: row.review.id, tagId: row.tag.id }));
    const clips = [...visibleSelected, ...hiddenSelected];
    const newId = await onCreatePlaylist(title, description, clips);
    setSelected(new Set());
    setCreateModalOpen(false);
    onViewPlaylist(newId);
  }

  const totalSelCount = selected.size;
  const activeFilterCount = [fOutcome, fCatGroup, fSubtype, fReferee, fEducator, fGame, fDateFrom, fDateTo, fText].filter(Boolean).length + (fHasNotes ? 1 : 0);
  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);
  const effectiveSelCount = useMemo(() => Array.from(selected).filter(id => visibleIdSet.has(id)).length, [selected, visibleIdSet]);
  const hiddenSelCount = selected.size - effectiveSelCount;

  // ── Learning stats (only computed in learning mode) ────────────────────────
  const learningStats = useMemo(() => {
    if (tab !== "learning") return null;
    const reviewCount = new Set(allRows.map(r => r.review.id)).size;
    const categoryCount = new Set(allRows.map(r => r.categoryGroup).filter(Boolean)).size;
    const withNotesCount = allRows.filter(r => r.tag.notes?.trim()).length;
    return { total: allRows.length, reviewCount, categoryCount, withNotesCount };
  }, [allRows, tab]);

  function handleAddToPlaylistFromPreview() {
    if (!previewClip) return;
    setSelected(new Set([previewClip.tag.id]));
    setCreateModalOpen(true);
  }

  return (
    <PageFrame
      className="p-0"
      eyebrow={tab === "learning" ? "Learning Hub" : "Organisation"}
      title={tab === "learning" ? "Learning Library" : "Clip Library"}
      description={
        tab === "learning"
          ? "Clips marked for learning and education"
          : `Clips from completed evaluations · ${allRows.length} total`
      }
      actions={
        <>
          {tab === "all" && onNavigateToLearningLibrary && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={onNavigateToLearningLibrary}>
              <Library size={12} /> Learning Library
            </Button>
          )}
          {canCreatePlaylists && tab === "all" && (
            <Button
              size="sm"
              variant={selected.size > 0 ? "primary" : "secondary"}
              disabled={selected.size === 0}
              onClick={() => setCreateModalOpen(true)}
              title={selected.size === 0 ? "Select clips to create a playlist" : `Create playlist from ${selected.size} clip${selected.size !== 1 ? "s" : ""}`}
              className="gap-1.5"
            >
              <ListVideo size={14} />
              Create Playlist{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
            <ChevronLeft size={15} /> Back
          </Button>
        </>
      }
    >

      {/* Learning Library stat chips */}
      {tab === "learning" && learningStats && (
        <div className="flex flex-wrap gap-1.5">
          <Badge className="gap-1.5 py-1">
            <Library size={13} /> <strong>{learningStats.total}</strong> clip{learningStats.total !== 1 ? "s" : ""}
          </Badge>
          <Badge className="gap-1.5 py-1">
            <Users2 size={13} /> <strong>{learningStats.reviewCount}</strong> review{learningStats.reviewCount !== 1 ? "s" : ""}
          </Badge>
          <Badge className="gap-1.5 py-1">
            <LayoutGrid size={13} /> <strong>{learningStats.categoryCount}</strong> categor{learningStats.categoryCount !== 1 ? "ies" : "y"}
          </Badge>
          <Badge className="gap-1.5 py-1">
            <FileText size={13} /> <strong>{learningStats.withNotesCount}</strong> with notes
          </Badge>
        </div>
      )}

      {/* Filters */}
      <Card className="grid grid-cols-1 gap-2.5">
        {/* Search + Sort row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={fText}
              onChange={e => setFText(e.target.value)}
              placeholder="Search notes, game, referee…"
              className="pl-7 text-sm"
            />
          </div>
          <label className="flex shrink-0 flex-col gap-1 text-xs">
            <span className="flex items-center gap-1 font-bold uppercase tracking-wide text-muted"><ArrowUpDown size={11} /> Sort</span>
            <Select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} className="w-auto text-xs">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="category">Category</option>
              <option value="referee">Referee</option>
              <option value="game">Game</option>
            </Select>
          </label>
        </div>
        {/* Field grid — 4 columns × 2 rows */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {/* Row 1: classification */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Outcome</span>
            <Select value={fOutcome} onChange={e => setFOutcome(e.target.value)} className="text-xs">
              <option value="">All outcomes</option>
              {outcomes.map(o => <option key={o} value={o}>{o}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Category</span>
            <Select value={fCatGroup} onChange={e => { setFCatGroup(e.target.value); setFSubtype(""); }} className="text-xs">
              <option value="">All categories</option>
              {catGroups.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Subtype</span>
            <Select value={fSubtype} onChange={e => setFSubtype(e.target.value)} className="text-xs">
              <option value="">All subtypes</option>
              {subtypes.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Game / Review</span>
            <Select value={fGame} onChange={e => setFGame(e.target.value)} className="text-xs">
              <option value="">All games</option>
              {games.map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </label>
          {/* Row 2: people + date range */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Referee</span>
            <Select value={fReferee} onChange={e => setFReferee(e.target.value)} className="text-xs">
              <option value="">All referees</option>
              {referees.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Educator</span>
            <Select value={fEducator} onChange={e => setFEducator(e.target.value)} className="text-xs">
              <option value="">All educators</option>
              {educators.map(e => <option key={e} value={e}>{e}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">From</span>
            <Input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} className="text-xs" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">To</span>
            <Input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} className="text-xs" />
          </label>
        </div>
        {/* Has Notes + Clear row */}
        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={fHasNotes} onChange={e => setFHasNotes(e.target.checked)} className="cursor-pointer accent-accent" />
            Has notes only
          </label>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="gap-1" onClick={clearFilters}>
              <X size={12} /> Clear ({activeFilterCount})
            </Button>
          )}
        </div>
      </Card>

      {/* Selection bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-sm text-muted">
        <span>
          <strong className="text-text">{visibleRows.length}</strong> clip{visibleRows.length !== 1 ? "s" : ""} shown
          {canCreatePlaylists && selected.size > 0 && (
            <span className="ml-2.5 font-semibold text-accent">
              · {selected.size} selected
            </span>
          )}
        </span>
        {canCreatePlaylists && visibleRows.length > 0 && (
          <div className="flex items-center gap-1.5">
            {selected.size > 0 && (
              <>
                {tab === "all" && (
                  <Button size="sm" className="gap-1" onClick={() => setCreateModalOpen(true)}>
                    <ListVideo size={12} /> Create Playlist ({selected.size})
                  </Button>
                )}
                {tab === "learning" && onRemoveFromLearningLibrary && (
                  <Button variant="danger" size="sm" className="gap-1" onClick={handleBulkRemoveFromLibrary}>
                    <Trash2 size={12} /> Remove ({effectiveSelCount})
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelected(new Set())} title="Clear all selected clips">
                  <X size={12} /> Clear all
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" className="gap-1" onClick={toggleSelectAll} title={allVisibleSelected ? "Deselect visible clips (hidden selections are kept)" : "Select all visible clips"}>
              {allVisibleSelected ? <><CheckSquare size={13} /> Deselect visible</> : <><Square size={13} /> Select visible</>}
            </Button>
          </div>
        )}
      </div>
      {/* Hidden-selection info — hidden clips are still included in the playlist */}
      {canCreatePlaylists && hiddenSelCount > 0 && (
        <div className="flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/5 px-2.5 py-2 text-xs text-text">
          <AlertTriangle size={13} className="shrink-0 text-accent" />
          <span>
            <strong>{hiddenSelCount}</strong> selected clip{hiddenSelCount !== 1 ? "s are" : " is"} hidden by current filters but will still be included in the playlist.{" "}
            <button className="p-0 text-accent underline" onClick={clearFilters}>
              Clear filters
            </button>{" "}to see them, or{" "}
            <button className="p-0 text-accent underline" onClick={() => setSelected(prev => { const n = new Set(prev); Array.from(prev).filter(id => !visibleIdSet.has(id)).forEach(id => n.delete(id)); return n; })}>
              deselect hidden
            </button>.
          </span>
        </div>
      )}

      {/* ── Empty states ── */}
      {allRows.length === 0 && tab === "all" && (
        <EmptyState
          icon={<ListVideo size={36} />}
          title="No clips yet"
          description="Clips appear here once evaluations are completed and tagged."
        />
      )}
      {allRows.length === 0 && tab === "learning" && (
        <EmptyState
          icon={<BookOpen size={36} />}
          title="No learning clips yet"
          description='Mark clips as "Add to Learning Library" in step 7 of the review coding wizard.'
        />
      )}
      {allRows.length > 0 && visibleRows.length === 0 && (
        <EmptyState
          title="No clips match the current filters"
          action={<Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>}
        />
      )}

      {/* ── Master–detail split ── */}
      {visibleRows.length > 0 && (
        <div className="flex items-start gap-4">

          {/* Left: scrollable clip list */}
          <div className="max-h-[72vh] flex-[0_0_38%] overflow-y-auto rounded-lg border border-border bg-panel">
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-panel-2 px-2.5 py-2 text-xs text-muted">
              {canCreatePlaylists && (
                <button
                  onClick={toggleSelectAll}
                  className="flex p-0 text-muted"
                  title={allVisibleSelected ? "Deselect all" : "Select all visible"}
                >
                  {allVisibleSelected ? <CheckSquare size={14} /> : someVisibleSelected ? <CheckSquare size={14} className="opacity-50" /> : <Square size={14} />}
                </button>
              )}
              <span className="uppercase tracking-wide">
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
                  className={cn(
                    "flex cursor-pointer gap-2 border-b border-border border-l-[3px] px-2.5 py-2.5",
                    isPreviewing ? "border-l-accent bg-panel-2" : "border-l-transparent"
                  )}
                >
                  {canCreatePlaylists && (
                    <div
                      onClick={e => { e.stopPropagation(); toggleRow(row.tag.id); }}
                      className={cn("shrink-0 pt-px", isChecked ? "text-accent" : "text-muted")}
                    >
                      {isChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                      {row.tag.outcome && <span className={outcomeClass(row.tag.outcome)}>{row.tag.outcome}</span>}
                      {row.categoryGroup && <Badge>{row.categoryGroup}</Badge>}
                      <span className="ml-auto text-[11px] tabular-nums text-muted">{row.tag.adjustedTime}</span>
                    </div>
                    <div className="truncate text-sm font-semibold text-text">{row.refereeName}</div>
                    <div className="truncate text-xs text-muted">{row.review.game || "Untitled game"}</div>
                    {row.subtype && <div className="mt-px truncate text-[11px] text-muted">{row.subtype}</div>}
                    {row.tag.notes?.trim() && (
                      <div className="mt-0.5 truncate text-[11px] italic text-muted opacity-75">
                        {row.tag.notes.trim()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: sticky preview */}
          <div className="sticky top-5 flex-1">
            <Card>
              <ClipPreview
                clip={previewClip}
                index={safePreviewIndex}
                total={visibleRows.length}
                onPrev={() => setPreviewIndex(i => Math.max(0, i - 1))}
                onNext={() => setPreviewIndex(i => Math.min(visibleRows.length - 1, i + 1))}
                onOpenReview={onOpenReview}
                extraActions={previewClip && tab === "learning" ? (
                  <div className="flex w-full flex-wrap items-center gap-2">
                    {onNavigateToQuizBuilder && (
                      <Button variant="secondary" size="sm" className="gap-1.5" onClick={onNavigateToQuizBuilder}>
                        <BookOpen size={13} /> Use in Quiz
                      </Button>
                    )}
                    {canCreatePlaylists && (
                      <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleAddToPlaylistFromPreview}>
                        <ListVideo size={13} /> Add to Playlist
                      </Button>
                    )}
                    {onRemoveFromLearningLibrary && (
                      <div className="ml-auto">
                        <RemoveFromLibraryButton tagId={previewClip.tag.id} onRemove={onRemoveFromLearningLibrary} />
                      </div>
                    )}
                  </div>
                ) : undefined}
              />
            </Card>
          </div>
        </div>
      )}

      {/* ── Create Playlist Modal ── */}
      {createModalOpen && (
        <CreatePlaylistModal
          clipCount={totalSelCount}
          onSave={handleCreatePlaylist}
          onClose={() => setCreateModalOpen(false)}
        />
      )}
      {confirmBulkRemove && (
        <ConfirmModal
          title={`Remove ${Array.from(selected).filter(id => visibleIdSet.has(id)).length} clip${Array.from(selected).filter(id => visibleIdSet.has(id)).length !== 1 ? "s" : ""} from Learning Library?`}
          message="The original review clips are kept."
          confirmLabel="Remove"
          busyLabel="Removing…"
          busy={false}
          onCancel={() => setConfirmBulkRemove(false)}
          onConfirm={doBulkRemoveFromLibrary}
        />
      )}
    </PageFrame>
  );
}
