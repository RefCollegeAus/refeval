"use client";

import { useState, useMemo } from "react";
import { ListVideo, Trash2, Eye, Search, ArrowUpDown, ChevronLeft, X } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import type { Assignment } from "@/lib/types/assignments";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { PageFrame } from "@/components/shell/PageFrame";
import {
  Badge, Button, EmptyState, Input, Spinner,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";

interface Props {
  session: RefEvalSession;
  playlists: Playlist[];
  loading: boolean;
  error: string;
  members: MemberRecord[];
  assignments?: Assignment[];
  onViewPlaylist: (id: string) => void;
  onDeletePlaylist: (id: string) => Promise<void>;
  onArchivePlaylist: (id: string) => Promise<void>;
  onBack: () => void;
  canDelete?: boolean;
}

type SortKey = "title" | "creator" | "clips" | "assignments" | "created";

function creatorName(userId: string | null, members: MemberRecord[]): string {
  if (!userId) return "—";
  const m = members.find(m => m.id === userId);
  return m?.name || m?.email || "Unknown";
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function PlaylistsScreen({
  session, playlists, loading, error, members, assignments = [],
  onViewPlaylist, onDeletePlaylist, onArchivePlaylist, onBack, canDelete = true,
}: Props) {
  const [deleting, setDeleting]               = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [query, setQuery]                     = useState("");
  const [sort, setSort]                       = useState<SortKey>("created");
  const [sortAsc, setSortAsc]                 = useState(false);

  async function handleDelete(id: string) {
    setPendingDeleteId(null);
    setDeleting(id);
    const aCount = assignmentCounts.get(id) ?? 0;
    try {
      if (aCount > 0) {
        await onArchivePlaylist(id);
      } else {
        await onDeletePlaylist(id);
      }
    } finally { setDeleting(null); }
  }

  // Assignment count per playlist
  const assignmentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      if (a.playlistId) map.set(a.playlistId, (map.get(a.playlistId) ?? 0) + 1);
    }
    return map;
  }, [assignments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q
      ? playlists.filter(pl =>
          pl.title.toLowerCase().includes(q) ||
          (pl.description ?? "").toLowerCase().includes(q) ||
          creatorName(pl.createdBy, members).toLowerCase().includes(q)
        )
      : [...playlists];

    out.sort((a, b) => {
      let cmp = 0;
      if      (sort === "title")       cmp = a.title.localeCompare(b.title);
      else if (sort === "creator")     cmp = creatorName(a.createdBy, members).localeCompare(creatorName(b.createdBy, members));
      else if (sort === "clips")       cmp = a.items.length - b.items.length;
      else if (sort === "assignments") cmp = (assignmentCounts.get(a.id) ?? 0) - (assignmentCounts.get(b.id) ?? 0);
      else if (sort === "created")     cmp = a.createdAt.localeCompare(b.createdAt);
      return sortAsc ? cmp : -cmp;
    });
    return out;
  }, [playlists, query, members, sort, sortAsc, assignmentCounts]);

  function handleSort(key: SortKey) {
    if (sort === key) { setSortAsc(v => !v); return; }
    setSort(key);
    setSortAsc(key === "title" || key === "creator");
  }

  function SortTh({ col, label, center }: { col: SortKey; label: string; center?: boolean }) {
    const active = sort === col;
    return (
      <TableHeaderCell
        className={cn("cursor-pointer select-none whitespace-nowrap", center && "text-center")}
        onClick={() => handleSort(col)}
      >
        <span className={cn("inline-flex items-center gap-1", center && "justify-center")}>
          {label}
          <ArrowUpDown size={11} className={active ? "text-accent" : "opacity-30"} />
        </span>
      </TableHeaderCell>
    );
  }

  return (
    <PageFrame
      className="p-0"
      eyebrow="Organisation"
      title="Playlists"
      description={`Curated clip playlists for ${session.activeOrganisation?.name}`}
      actions={
        <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
          <ChevronLeft size={15} /> Back
        </Button>
      }
    >
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Loading playlists…
        </div>
      )}
      {error && <p className="text-sm font-medium text-red-400">{error}</p>}

      {/* Empty state — no playlists at all */}
      {!loading && playlists.length === 0 && (
        <EmptyState
          icon={<ListVideo size={32} />}
          title="No playlists yet"
          description="Select clips in the Clip Library and create your first playlist."
        />
      )}

      {/* Search bar */}
      {!loading && playlists.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-[380px] flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by title, description or creator…"
              className="pl-7 text-sm"
            />
          </div>
          {query && (
            <Button variant="ghost" size="sm" className="px-1.5" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={13} />
            </Button>
          )}
          <span className="ml-auto whitespace-nowrap text-xs text-muted">
            {filtered.length} of {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Empty state — search returns nothing */}
      {!loading && playlists.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={<Search size={28} />}
          title="No playlists match your search"
          action={<Button variant="secondary" size="sm" onClick={() => setQuery("")}>Clear search</Button>}
        />
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <SortTh col="title"       label="Title" />
              <TableHeaderCell>Description</TableHeaderCell>
              <SortTh col="clips"       label="Clips"       center />
              <SortTh col="assignments" label="Assignments" center />
              <SortTh col="creator"     label="Created by" />
              <SortTh col="created"     label="Created" />
              <TableHeaderCell aria-hidden="true" />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(pl => {
              const aCount = assignmentCounts.get(pl.id) ?? 0;
              return (
                <TableRow key={pl.id}>
                  <TableCell data-label="Title" className="max-w-[220px]">
                    <button
                      onClick={() => onViewPlaylist(pl.id)}
                      className="text-left text-sm font-semibold text-accent hover:underline"
                    >
                      {pl.title}
                    </button>
                  </TableCell>
                  <TableCell data-label="Description" className="max-w-[240px] text-muted">
                    {pl.description ? (
                      <span className="block truncate" title={pl.description}>{pl.description}</span>
                    ) : <span className="text-muted">—</span>}
                  </TableCell>
                  <TableCell data-label="Clips" className="text-center">
                    <Badge>{pl.items.length}</Badge>
                  </TableCell>
                  <TableCell data-label="Assignments" className="text-center">
                    {aCount > 0 ? <Badge>{aCount}</Badge> : <span className="text-muted">—</span>}
                  </TableCell>
                  <TableCell data-label="Created by" className="whitespace-nowrap text-muted">
                    {creatorName(pl.createdBy, members)}
                  </TableCell>
                  <TableCell data-label="Created" className="whitespace-nowrap text-muted">
                    {fmt(pl.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="secondary" size="sm" className="gap-1" onClick={() => onViewPlaylist(pl.id)}>
                        <Eye size={12} /> View
                      </Button>
                      {canDelete && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="gap-1"
                          onClick={() => setPendingDeleteId(pl.id)}
                          disabled={deleting === pl.id}
                        >
                          <Trash2 size={12} /> {deleting === pl.id ? "…" : "Delete"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {pendingDeleteId && (() => {
        const pl = playlists.find(p => p.id === pendingDeleteId);
        const aCount = assignmentCounts.get(pendingDeleteId) ?? 0;
        const hasAssignments = aCount > 0;
        return (
          <ConfirmModal
            title={hasAssignments ? "Archive Playlist" : "Delete Playlist"}
            message={
              hasAssignments
                ? `"${pl?.title ?? "This playlist"}" has ${aCount} active assignment${aCount !== 1 ? "s" : ""}. Deleting it would destroy all referee progress.\n\nArchiving hides it from new assignments while preserving all existing referee progress. This can be reversed by support if needed.`
                : `Permanently delete "${pl?.title ?? "this playlist"}" and all its clips? This cannot be undone.`
            }
            confirmLabel={hasAssignments ? "Archive Playlist" : "Yes, Delete"}
            busy={deleting === pendingDeleteId}
            onConfirm={() => handleDelete(pendingDeleteId)}
            onCancel={() => setPendingDeleteId(null)}
          />
        );
      })()}
    </PageFrame>
  );
}
